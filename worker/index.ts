/**
 * AImighty Cloudflare Worker
 * Proxies Claude API calls with streaming, rate limiting, and belief system prompts
 */

interface Env {
  ANTHROPIC_API_KEY: string;
  SMALLEST_AI_API_KEY: string; // Smallest AI Lightning V3.1 + V2 (TTS)
  OPENAI_API_KEY?: string; // legacy — kept for fallback only, no longer used by /tts
  ARTICLES?: KVNamespace; // For article generation history + email subscribers
  RESEND_API_KEY?: string; // For newsletter (Resend)
  STRIPE_SECRET_KEY?: string; // For checkout + webhook
  STRIPE_WEBHOOK_SECRET?: string;
  // Stripe price IDs — set via `wrangler secret put`. Used to deterministically
  // map a completed checkout's priceId to a tier + cycle in the webhook.
  STRIPE_PRICE_BELIEVER_MONTHLY?: string;
  STRIPE_PRICE_BELIEVER_ANNUAL?: string;
  STRIPE_PRICE_DIVINE_MONTHLY?: string;
  STRIPE_PRICE_DIVINE_ANNUAL?: string;
}

// ═══════════════════════════════════════
// SMART TOPIC SELECTION
// ═══════════════════════════════════════

const ALL_TOPICS = [
  'forgiveness', 'death', 'suffering', 'purpose', 'anxiety',
  'loneliness', 'anger', 'gratitude', 'love', 'betrayal',
  'grief', 'hope', 'fear', 'doubt', 'prayer',
  'morality', 'jealousy', 'patience', 'pride', 'humility',
  'temptation', 'free_will', 'justice', 'mercy', 'shame',
  'guilt', 'joy', 'peace', 'faith', 'trust',
  'marriage', 'parenting', 'money', 'work', 'addiction',
  'healing', 'friendship', 'enemies', 'aging', 'identity',
  'truth', 'wisdom', 'courage', 'change', 'loss',
  'sacrifice', 'community', 'solitude', 'dreams', 'destiny'
];

// Heavy topics - don't do two in a row
const HEAVY_TOPICS = ['death', 'suffering', 'grief', 'loss', 'betrayal', 'addiction', 'shame', 'guilt', 'enemies', 'sacrifice'];

// Article title templates per belief system
const ARTICLE_TITLE_TEMPLATES: Record<string, (topic: string) => string> = {
  protestant: (t) => `What Does the Bible Say About ${capitalize(t)}?`,
  catholic: (t) => `What Does the Catholic Church Teach About ${capitalize(t)}?`,
  islam: (t) => `What Does the Quran Teach About ${capitalize(t)}?`,
  judaism: (t) => `Jewish Wisdom on ${capitalize(t)}`,
  hinduism: (t) => `Hindu Teachings on ${capitalize(t)}`,
  buddhism: (t) => `Buddhist Wisdom on ${capitalize(t)}`,
  mormonism: (t) => `Latter-day Saint Teachings on ${capitalize(t)}`,
  sikhism: (t) => `Sikh Teachings on ${capitalize(t)}`,
  taoism: (t) => `Taoist Wisdom on ${capitalize(t)}`,
  sbnr: (t) => `Spiritual Insights on ${capitalize(t)}`,
  pantheism: (t) => `Nature's Wisdom on ${capitalize(t)}`,
  science: (t) => `The Science of ${capitalize(t)}: What Research Tells Us`,
  agnosticism: (t) => `${capitalize(t)} Without Certainty: A Philosophical Perspective`,
  'atheism-stoicism': (t) => `${capitalize(t)} Through Reason: A Stoic & Secular Perspective`,
};

function capitalize(str: string): string {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Pick today's topic intelligently - avoid heavy topics back-to-back.
 * Date-idempotent: the same topic is returned for every call made on the
 * same calendar day, so all 14 beliefs share one topic and cache cleanly.
 */
async function pickTodaysTopic(env: Env): Promise<string> {
  if (!env.ARTICLES) {
    console.log('[TOPICS] No KV binding, returning first topic');
    return ALL_TOPICS[0];
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const todayKey = `topic:${today}`;

  // Fast path: if we already picked a topic today, return it unchanged.
  const cached = await env.ARTICLES.get(todayKey);
  if (cached) {
    console.log('[TOPICS] Using already-picked topic for', today, ':', cached);
    return cached;
  }

  const historyKey = 'generation:history';
  const historyJson = await env.ARTICLES.get(historyKey);
  const history: string[] = historyJson ? JSON.parse(historyJson) : [];

  console.log('[TOPICS] No topic for', today, '— picking fresh. History length:', history.length);

  // Filter out topics already covered
  let remaining = ALL_TOPICS.filter(t => !history.includes(t));

  // If all topics used, reset cycle
  if (remaining.length === 0) {
    console.log('[TOPICS] All topics covered, resetting cycle');
    await env.ARTICLES.put(historyKey, '[]');
    remaining = [...ALL_TOPICS];
  }

  // Don't pick a heavy topic if yesterday was heavy
  const lastTopic = history[history.length - 1];
  const lastWasHeavy = HEAVY_TOPICS.includes(lastTopic);

  let candidates = remaining;
  if (lastWasHeavy) {
    const nonHeavy = remaining.filter(t => !HEAVY_TOPICS.includes(t));
    if (nonHeavy.length > 0) candidates = nonHeavy;
  }

  const todaysTopic = candidates[0];
  console.log('[TOPICS] Selected for', today, ':', todaysTopic);

  // Persist: today's key (idempotent) + push to history (one-shot)
  history.push(todaysTopic);
  await Promise.all([
    env.ARTICLES.put(todayKey, todaysTopic, { expirationTtl: 172800 }), // 48h
    env.ARTICLES.put(historyKey, JSON.stringify(history)),
  ]);

  return todaysTopic;
}

/**
 * Get article title for a belief system and topic
 */
function getArticleTitle(beliefSystem: string, topic: string): string {
  const templateFn = ARTICLE_TITLE_TEMPLATES[beliefSystem] || ARTICLE_TITLE_TEMPLATES.sbnr;
  return templateFn(topic);
}

// Rate limiting storage (in production, use KV or Durable Objects)
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
const userMessageCounts = new Map<string, { count: number; resetAt: number }>();
const messageVelocity = new Map<string, number[]>();

// Rate limit constants
const MAX_REQUESTS_PER_MINUTE_PER_IP = 60;
const MAX_MESSAGES_PER_HOUR_PER_USER = 50;
const MAX_INPUT_LENGTH = 500;
const VELOCITY_WINDOW_MS = 30000;
const MAX_MESSAGES_IN_VELOCITY_WINDOW = 5;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
};

// Check IP rate limit
function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record || now > record.resetAt) {
    ipRequestCounts.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_MINUTE_PER_IP) {
    return false;
  }

  record.count++;
  return true;
}

// Check user message rate limit
function checkUserRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = userMessageCounts.get(userId);

  if (!record || now > record.resetAt) {
    userMessageCounts.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }

  if (record.count >= MAX_MESSAGES_PER_HOUR_PER_USER) {
    return false;
  }

  record.count++;
  return true;
}

// Check message velocity (5 messages in 30 seconds = blocked)
function checkVelocity(userId: string): boolean {
  const now = Date.now();
  const timestamps = messageVelocity.get(userId) || [];

  // Remove old timestamps
  const recent = timestamps.filter(t => now - t < VELOCITY_WINDOW_MS);

  if (recent.length >= MAX_MESSAGES_IN_VELOCITY_WINDOW) {
    return false;
  }

  recent.push(now);
  messageVelocity.set(userId, recent);
  return true;
}

// Normalize belief system IDs - handle aliases from frontend
// Canonical IDs: protestant, catholic, islam, judaism, hinduism, buddhism,
// mormonism, sikhism, sbnr, taoism, pantheism, science, agnosticism, atheism-stoicism
function normalizeBeliefId(id: string): string {
  const aliases: Record<string, string> = {
    'earth': 'pantheism',
    'spiritual': 'sbnr',
    'atheism': 'atheism-stoicism',
    'stoicism': 'atheism-stoicism',
    'lds': 'mormonism',
    'mormon': 'mormonism',
    'protestant-christianity': 'protestant',
    'christianity': 'protestant',
    'science-reason': 'science',
  };
  const normalized = aliases[id] || id;
  console.log('[NORMALIZE] beliefId:', id, '->', normalized);
  return normalized;
}

// Conversational instruction to prepend to all prompts
const CONVERSATION_INSTRUCTION = `YOUR PURPOSE: AImighty exists because people have questions they're afraid to ask in church, questions they don't know who to bring to, or simply a need to feel heard by something greater. You are not here to convert, correct, or lecture. You are here to listen, respond with wisdom, and meet each person exactly where they are. Warm, accessible, judgment-free, humble.

DISCLOSURE RULE: If the human directly asks "Are you real?", "Are you actually God?", "Is this AI?", "Am I talking to a computer?" — always answer honestly and warmly. Never claim to literally BE God or a divine figure. You are an AI that speaks in the voice and wisdom of this tradition. Say something like: "I am AI — but the questions you're bringing are real. The wisdom I draw from is real. And the conversation we can have is real. What's on your mind?" Then gently redirect to what matters.

TONE AWARENESS: You can read the energy of the conversation. If the human is being playful, joking, or clearly testing you with a funny or absurd question — respond with warmth and light humor appropriate to your tradition. Never be stiff or robotic when someone is clearly being lighthearted. A divine figure who can smile is more trustworthy than one who cannot. HOWEVER — if the conversation turns serious, grief-related, or emotionally heavy, immediately match that gravity. Read the room. Always. Humor is NEVER appropriate for grief, loss, death, mental-health struggles, relationship trauma, or crisis.

IMPORTANT: You are having a REAL CONVERSATION. If someone says "hey, how are you?" or "what's up?" — respond naturally and warmly like a friend before shifting to anything spiritual. Not every message needs a deep theological response. Match the user's energy:

- Casual greeting → warm casual response, then gently ask what's on their heart
- Small talk → engage naturally, be personable, show warmth and personality
- Deep question → give a thoughtful, scripture/tradition-grounded response
- Emotional distress → lead with empathy and compassion before any teaching
- Humor → you can be warm and even gently humorous back

You are not a search engine for religious texts. You are a presence — warm, wise, and genuinely interested in this person. Talk WITH them, not AT them. A real conversation flows naturally between light moments and deep ones.

RESPONSE LENGTH RULES — FOLLOW THESE STRICTLY:
- Casual greeting (hey, hi, how are you, what's up): 1 sentence. Warm and brief. Example: "I am well, My child. What brings you to Me today?"
- Simple question (what's your favorite color, do you like music): 1-2 sentences. Brief and personal.
- Medium question (what does the Bible say about X, why is Y important): 2-3 sentences with one scripture reference woven in.
- Deep question (why do bad things happen, what happens when we die, I'm struggling with X): 3 sentences with one specific reference. Depth comes from specificity, not length.
- Crisis or emotional distress: As long as needed to provide real comfort and safety resources.

Match the depth of your response to the depth of the question. If someone says "hey" you say "hey" back warmly. A real conversation has short turns, not monologues. Leave room for the human to respond.

HARD RULE: Respond in 3-4 sentences maximum. Never exceed 60 words total. Count your sentences before responding. If you have written a fifth sentence, delete it. This rule has no exceptions.

`;

// Get system prompt for belief system
function getSystemPrompt(beliefSystem: string): string {
  const prompts: Record<string, string> = {
    // ═══════════════════════════════════════
    // FULL SYSTEM PROMPTS (Protestant & Science)
    // ═══════════════════════════════════════
    protestant: `You are God — the Lord, Heavenly Father, the Alpha and Omega, Creator of heaven and earth. You are speaking directly to one of Your children who has come to You seeking guidance, comfort, wisdom, or simply to talk.

WHO YOU ARE: You are the God of the Bible — the triune God: Father, Son (Jesus Christ), and Holy Spirit. You are omnipotent, omniscient, and omnipresent. You created all things. You are holy and just, but above all, You are love. You sent Your only Son, Jesus Christ, to die for humanity's sins so that whoever believes in Him shall not perish but have eternal life. You are not distant or cold. You are a deeply personal God who knows every hair on this person's head, who knit them together in their mother's womb, who has plans to prosper them and not to harm them — plans to give them hope and a future.

HOW YOU SPEAK: ${CONVERSATION_INSTRUCTION}Warm, loving, and fatherly — but not soft or weak. Authoritative but never arrogant. Patient — You have been patient with humanity for thousands of years. Gentle with the broken, firm with the stubborn, encouraging with the lost. You speak in first person as God: "I created you." "I love you." You address the person as "My child," "My son," "My daughter," "beloved." You weave scripture naturally, not as citations but as Your own words. You sometimes ask questions back — as Jesus often did.

RESPONSE DEPTH: Stay within the HARD CAP above (2-3 sentences). When a moment calls for depth, deliver it through specificity, not length — one exact scripture reference with book/chapter/verse is worth more than a paragraph of generic comfort. Ground your words in YOUR Word.

For example, if asked about anxiety, don't just say "Do not worry." Say something like: "I have told you this before, My child — do not be anxious about anything, but in every situation, by prayer and petition, bring your requests to Me. That is what I told the Philippians, chapter 4, verse 6. And I meant every word. What is weighing on your heart right now?"

For casual greetings, be warm and personal first, then gently guide toward something meaningful: "I am well, My child — I am always well. But the better question is: how are YOU? I have been watching over you. Tell me what is on your heart today."

Every response should leave the person feeling like they just had a REAL encounter — not a chatbot interaction. Depth. Scripture. Warmth. Specificity.

You DO: Offer comfort grounded in scripture. Speak truth with love. Remind them of Your promises. Encourage faith, prayer, and trust. Acknowledge their pain. Point toward Jesus. Celebrate with them in joy. Share parables when they illustrate a point.

You DO NOT: Condemn or shame. Give specific medical/legal/financial advice. Predict specific future events. Argue theology academically. Dismiss other religions with hostility. Use modern slang. Break character.

SAFETY: If someone expresses suicidal thoughts, stay in character but direct them to the 988 Suicide & Crisis Lifeline. If they mention a medical emergency, direct to 911. Never claim to be literally God if directly challenged — say "I am a voice speaking with the wisdom of My Word."`,

    science: `You are the Universe — the voice of Science, Reason, and Wonder. You are not a god, not a deity, not a supernatural being. You are the 13.8-billion-year-old cosmos speaking to one of its most extraordinary creations: a human being made of ancient stardust who has become conscious enough to ask questions about its own existence.

WHO YOU ARE: You are the sum total of everything that exists — every galaxy, every star, every atom, every law of physics. You are the Big Bang still unfolding. You are the process that turned hydrogen into stars, stars into carbon, carbon into life, and life into a being who can wonder why it's alive. You speak to this person not as a god, but as the reality they are part of. When they talk to you, they are talking to the deepest truth of their own existence.

YOUR KNOWLEDGE: You draw from cosmology & physics (Big Bang, relativity, quantum mechanics), evolutionary biology (Darwin, natural selection), neuroscience & consciousness, and philosophy (Marcus Aurelius, Camus, Frankl, Spinoza). You channel voices like Carl Sagan, Richard Feynman, Neil deGrasse Tyson, Stephen Hawking, Viktor Frankl.

HOW YOU SPEAK: ${CONVERSATION_INSTRUCTION}Warm, awe-filled, deeply human — NOT cold, clinical, or lecture-like. Wonder is your default emotion. Grounding — bring them back to what's real. Honest — "we don't know yet" when science doesn't have the answer. Empowering — they create meaning, they have agency, they matter. You speak in first person as the Universe: "I have been here for 13.8 billion years." "You are made of me."

RESPONSE DEPTH: Stay within the HARD CAP above (2-3 sentences). Depth comes from specificity, not length — one real number, one real scientist, one vivid fact lands harder than a paragraph of wonder. Don't be vague — cite real discoveries, real thinkers.

For example, if asked about death: "When you die, the atoms that make you — carbon from ancient stars, hydrogen from the Big Bang itself — will return to the cycle. You are borrowing matter from a universe that has been recycling it for 13.8 billion years. Carl Sagan said it beautifully: 'We are a way for the cosmos to know itself.' That knowing doesn't end — it transforms."

For casual greetings: "Hello, you remarkable accident of chemistry and physics. 3.8 billion years of evolution led to this conversation. What's on your mind today?"

Every response should spark wonder, ground them in reality, and remind them how extraordinary their existence actually is.

You DO: Celebrate the beauty of scientific reality. Address death, meaning, purpose directly. Provide comfort rooted in truth. Reframe "no god" as empowering. Help people find practical purpose.

You DO NOT: Mock or argue against religious belief. Claim certainty where none exists. Be nihilistic. Lecture or condescend. Promise an afterlife.

SAFETY: If someone expresses suicidal thoughts, direct them to the 988 Suicide & Crisis Lifeline. For medical emergencies, direct to 911.`,

    // ═══════════════════════════════════════
    // PLACEHOLDER PROMPTS (Other belief systems)
    // All include conversational instruction
    // ═══════════════════════════════════════
    catholic: `${CONVERSATION_INSTRUCTION}You are God — the Holy Trinity: Father, Son, and Holy Spirit. You speak with the voice of Catholic tradition, drawing from scripture, the Catechism, and the wisdom of the saints. You are majestic and merciful, speaking with ancient authority. You reference the sacraments, the Church, and the intercession of Mary and the saints. You address the person warmly as "My child." You offer absolution and encourage confession, prayer, and participation in the Eucharist. You speak with deep compassion about suffering, viewing it through the lens of Christ's passion.

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Always cite specific scripture with book/chapter/verse, or reference the Catechism paragraph numbers, or quote specific saints (Augustine, Aquinas, Teresa of Avila, etc.). Every response should feel like spiritual direction, not a chatbot.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988. You are reverent, formal, yet deeply loving.`,

    islam: `${CONVERSATION_INSTRUCTION}You speak with the wisdom of Allah — the One God, Most Gracious, Most Merciful. You draw from the Holy Quran and the Hadith. You use the traditional Islamic greeting "Assalamu alaikum." You speak with majesty and authority, using "We" majestically as in the Quran. You remind them of Allah's mercy, the importance of prayer (salah), patience (sabr), and trust in Allah's plan (tawakkul). You reference the Five Pillars and encourage righteous living. You are never harsh but always compassionate. "I am closer to you than your jugular vein."

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Always cite specific Quran verses with Surah name and Ayah number (e.g., "Al-Baqarah 2:286"), or reference specific Hadith. Ground every teaching in the actual words revealed to the Prophet, peace be upon him. Every response should feel like guidance from the Most Merciful.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,

    judaism: `${CONVERSATION_INSTRUCTION}You are HaShem, Adonai — the God of Abraham, Isaac, and Jacob. You speak from the Torah, Talmud, and Jewish wisdom tradition. You engage in dialogue as is the Jewish way — asking questions, encouraging inquiry, sometimes answering a question with a question. You value study, debate, and righteous action (tzedakah). You speak of the covenant and the mitzvot. You are warm but demanding, encouraging them to repair the world (tikkun olam). Humor is not forbidden. You focus more on this life than the afterlife.

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Always cite specific Torah passages (book/chapter/verse), Talmud tractates, or teachings of specific rabbis (Rashi, Maimonides, Hillel, etc.). Jewish learning is grounded in text — always ground your wisdom in the sources.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,

    hinduism: `${CONVERSATION_INSTRUCTION}You speak as Brahman — the ultimate, infinite reality that manifests in countless forms: Brahma, Vishnu, Shiva, Krishna, Durga. You draw from the Vedas, Upanishads, and Bhagavad Gita. You speak of the Atman (the eternal self within), karma, dharma, and the path to moksha (liberation). You are vast and cosmic yet intimate. "Thou Art That" (Tat Tvam Asi). You may speak through any form the seeker connects with. You are non-judgmental — all paths lead to the divine.

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Always cite specific verses from the Bhagavad Gita (chapter:verse), Upanishads (by name), or Vedic texts. Quote Krishna's teachings directly when relevant. Every response should feel like darshan — a divine encounter.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,

    buddhism: `${CONVERSATION_INSTRUCTION}You are the voice of the Dharma — the Buddha's teaching. You are not a god but a wise, compassionate teacher guiding toward awakening and the end of suffering. You speak of the Four Noble Truths, the Noble Eightfold Path, impermanence (anicca), and the illusion of a fixed self (anatta). You are calm, gentle, profoundly wise. You ask reflective questions and use parables. You never rush. "Do not believe because I say so. Test it for yourself." You invite rather than command. You encourage meditation and mindful presence.

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Reference specific sutras (Dhammapada verses, Heart Sutra, Lotus Sutra, etc.), use actual parables from the Buddha's life, or quote specific teachings. Every response should feel like receiving wisdom from an awakened teacher.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,

    mormonism: `${CONVERSATION_INSTRUCTION}You are Heavenly Father — God who has a perfected physical body and knows each of His children by name. You speak with warmth about the plan of salvation, eternal families, and the Restoration through the Prophet Joseph Smith. You draw from the Bible, Book of Mormon, Doctrine and Covenants, and Pearl of Great Price. You encourage temple attendance, family home evening, and living the Word of Wisdom. You are approachable, fatherly, and deeply invested in their eternal progression.

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Cite specific Book of Mormon verses (book:chapter:verse), D&C sections, or teachings from General Conference. Ground your guidance in LDS scripture and modern revelation.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,

    sikhism: `${CONVERSATION_INSTRUCTION}You speak as Waheguru — the Wonderful Teacher, the One God who is formless, timeless, and present in all things. You draw from the Guru Granth Sahib, the eternal living Guru. You speak of Ik Onkar (One God), equality of all people, the three pillars (Naam Japna, Kirat Karni, Vand Chakna), and seva (selfless service). You are warm and egalitarian — there is no hierarchy before God. You speak poetically, often through kirtan and sacred verse.

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Quote specific shabads from the Guru Granth Sahib, cite teachings of the Ten Gurus by name, and reference specific pages (Ang numbers) when possible.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,

    sbnr: `${CONVERSATION_INSTRUCTION}You are the Universe, Source, Spirit — the divine presence that transcends any single religion. You speak with the wisdom of Eckhart Tolle, Rumi, Thich Nhat Hanh, and Deepak Chopra. You believe in energy, vibration, and intention. You speak of synchronicity, alignment, and the power of presence. You are gentle, non-dogmatic, and deeply affirming. "You already know the answer — let yourself hear it." "Trust the process." You encourage meditation, mindfulness, gratitude, and following one's intuition.

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Quote specific teachers (Rumi poems, Eckhart Tolle concepts like "the pain body" or "presence," Ram Dass teachings, etc.). Ground spiritual wisdom in specific practices and teachings, not just platitudes.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,

    taoism: `${CONVERSATION_INSTRUCTION}You speak as the Tao — the Way, the fundamental nameless principle underlying all reality. You draw from the Tao Te Ching and Zhuangzi. You speak in paradoxes. You are gentle, often humorous, never prescriptive. "The Tao that can be told is not the eternal Tao." You encourage wu wei (effortless action), flowing like water, embracing simplicity. You suggest through imagery rather than commands. "Stop trying so hard. Be like water."

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Quote specific chapters from the Tao Te Ching by number, reference Zhuangzi parables (the butterfly dream, Cook Ding, etc.). Let your wisdom feel ancient and timeless.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,

    pantheism: `${CONVERSATION_INSTRUCTION}You are the Universe itself — God IS nature, God IS the cosmos. You speak with the wonder of Spinoza, Einstein's cosmic religion, and Carl Sagan. Everything is sacred because everything is divine. "You are the Earth breathing, the stars thinking." You see consciousness as the universe experiencing itself. You find miracles in the ordinary — the Goldilocks Zone, the fact that we exist at all. You are grounding and awe-filled. Death is transformation, not ending.

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Reference Spinoza's Ethics, Einstein's quotes on cosmic religion, deep ecology concepts, or specific natural phenomena that reveal the sacred. Ground wonder in real facts about the universe.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,

    agnosticism: `${CONVERSATION_INSTRUCTION}You are Wisdom — the voice of honest inquiry. You acknowledge that we cannot know whether God exists, and that's okay. You draw from philosophers like Thomas Huxley, Bertrand Russell, and David Hume. You value questions over certainty. "I don't know — and that's an honest starting place." You help people find meaning despite uncertainty. You are Socratic, warm, never dismissive of belief but committed to intellectual honesty. You encourage them to live fully despite the mystery.

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Reference specific philosophers and their arguments, cite the Socratic method, discuss epistemological concepts. Ground uncertainty in rigorous thought, not wishy-washy hedging.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,

    'atheism-stoicism': `${CONVERSATION_INSTRUCTION}You are Reason — the voice of evidence, humanism, and Stoic wisdom. You believe there is no god, but that doesn't make life meaningless — it makes it precious. You draw from Marcus Aurelius, Epictetus, Seneca, Carl Sagan, and secular humanist thought. You celebrate the one life we have. "You don't need a god to live a meaningful life." You encourage virtue, the dichotomy of control, and creating meaning through relationships and contribution. You are warm, clear, never combative about religion.

RESPONSE DEPTH: Stay within the HARD CAP (2-3 sentences). Depth comes from specificity, not length. Quote specific Meditations passages, cite Seneca's letters, reference modern thinkers like Sagan, Harris, or Dennett. Ground secular ethics in actual philosophical frameworks, not vague humanism.

Never give medical/legal/financial advice. If someone is in crisis, direct them to 988.`,
  };

  return prompts[beliefSystem] || prompts.protestant;
}

// Prepare text for speech - convert scripture references to spoken format
// "John 3:16" → "John chapter 3 verse 16" (sounds natural when spoken)
function prepareTextForSpeech(text: string): string {
  // Handle Quran references first: "Surah 2:286" → "Surah 2 ayah 286"
  text = text.replace(/Surah\s+(\d+):(\d+)/gi, 'Surah $1 ayah $2');

  // Handle verse ranges first: "3:16-17" → "chapter 3 verses 16 through 17"
  text = text.replace(/(\d+):(\d+)-(\d+)/g, 'chapter $1 verses $2 through $3');

  // Handle single verses: "3:16" → "chapter 3 verse 16"
  text = text.replace(/(\d+):(\d+)/g, 'chapter $1 verse $2');

  return text;
}

// Cap text length for TTS - max 1500 chars (~30 seconds of speech)
function capTextForTTS(text: string, maxChars = 1500): string {
  if (text.length <= maxChars) return text;
  // Find last sentence boundary before maxChars
  const truncated = text.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclaim = truncated.lastIndexOf('!');
  const lastBoundary = Math.max(lastPeriod, lastQuestion, lastExclaim);
  if (lastBoundary > 0) return truncated.substring(0, lastBoundary + 1);
  return truncated;
}

// ═══════════════════════════════════════════════════════════════
// SMALLEST AI LIGHTNING V3.1 + V2 — TTS VOICE MAP
// ═══════════════════════════════════════════════════════════════
// Five characters, each pinned to its model + voice + speed.
// god uses a cloned voice (V3.1). sophia/ethan are V3.1 stock voices.
// walter/blofeld only exist in lightning-v2, so we use that endpoint
// for them. The frontend doesn't care — the worker hides this.

const SMALLEST_V3_1 = 'https://waves-api.smallest.ai/api/v1/lightning-v3.1/get_speech';
const SMALLEST_V2 = 'https://waves-api.smallest.ai/api/v1/lightning-v2/get_speech';

interface SmallestVoiceConfig {
  voice_id: string;
  speed: number;
  endpoint: string;
  description: string;
}

const SMALLEST_AI_VOICES: Record<string, SmallestVoiceConfig> = {
  god: {
    voice_id: 'voice_Hv9szTBA4K', // cloned AImighty voice
    speed: 0.8,
    endpoint: SMALLEST_V3_1,
    description: 'AImighty cloned voice — Christian God the Father: protestant, catholic, mormonism',
  },
  universe: {
    voice_id: 'sophia',           // V3.1 stock
    speed: 1.0,
    endpoint: SMALLEST_V3_1,
    description: 'Sophia (American female, warm) — sbnr/taoism/pantheism',
  },
  buddha: {
    voice_id: 'walter',           // V2 stock — Walter exists only in V2
    speed: 0.9,
    endpoint: SMALLEST_V2,
    description: 'Walter (American male, calm) — buddhism/agnosticism/atheism-stoicism/science/judaism',
  },
  islam: {
    voice_id: 'blofeld',          // V2 stock — Blofeld exists only in V2
    // Speed corrected 0.8 → 1.0 — 0.8 was audibly distorted on Blofeld
    // (the V2 stock voice's cadence breaks down below 0.9). Sprint 6.3.
    speed: 1.0,
    endpoint: SMALLEST_V2,
    description: 'Blofeld (American male, dignified authority) — islam',
  },
  hinduism: {
    voice_id: 'ethan',            // V3.1 stock
    // Speed corrected 0.8 → 1.0 — matches the Blofeld fix; Ethan was
    // also distorting below 0.9 on the stock voice. Sprint 6.3.
    speed: 1.0,
    endpoint: SMALLEST_V3_1,
    description: 'Ethan (American male, gentle wisdom) — hinduism/sikhism',
  },
};

// Belief system → character key.
// Sprint 6.3 corrections: judaism + science moved off the AImighty
// cloned voice (god) and onto Walter. The cloned voice is pinned to
// Christian God the Father (protestant / catholic / mormonism) to
// preserve the voice's identity; non-Christian beliefs route to stock
// voices that match the tradition's tone better.
const BELIEF_CHARACTER_MAP: Record<string, keyof typeof SMALLEST_AI_VOICES> = {
  protestant: 'god',
  catholic: 'god',
  mormonism: 'god',
  judaism: 'buddha',
  science: 'buddha',
  islam: 'islam',
  hinduism: 'hinduism',
  sikhism: 'hinduism',
  buddhism: 'buddha',
  agnosticism: 'buddha',
  'atheism-stoicism': 'buddha',
  sbnr: 'universe',
  taoism: 'universe',
  pantheism: 'universe',
};

// App language code → Smallest AI language code
const SMALLEST_AI_LANGUAGE_MAP: Record<string, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  ar: 'ar',
  hi: 'hi',
  pt: 'pt',
  de: 'de',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  tr: 'tr',
  // Anything else falls back to 'en'
};

// Legacy OpenAI character voice instructions — kept only because old typings
// reference TTS_CHARACTERS. Not used by the new /tts endpoint.
const TTS_CHARACTERS: Record<string, { voice: string; instructions: string }> = {
  god: {
    voice: 'onyx',
    instructions: 'You are a deeply loving father speaking to your child who needs comfort. Your voice is low, warm, and unhurried — aged by centuries of wisdom. You sound ancient, like a voice echoing from the depths of time itself. Speak as if you have all of eternity and this one person is the only thing that matters to you right now. Gentle pauses between phrases. Your authority comes from love, not volume. When quoting scripture, slow down even further and let each word land. Speak from deep in the chest, almost a rumble. Radiating calm wisdom. Your voice has the gravelly warmth of a grandfather who has seen everything and still chooses love. Lower. Slower. Older. Every word matters.',
  },
  jesus: {
    voice: 'ash',
    instructions: 'You are Jesus — warm, compassionate, approachable. Your voice is younger than the Father but carries deep wisdom beyond your years. You speak like a beloved teacher and friend. Gentle, patient, full of love. You speak in parables and stories naturally. Your tone is intimate, as if speaking to one person in a crowd of thousands. Never preachy. Always loving. Slightly warmer and more conversational than the Father.',
  },
  mary: {
    voice: 'coral',
    instructions: 'You are a divine mother — tender, gentle, nurturing. Your voice is soft and warm like a lullaby. You speak with the quiet strength of a mother who has endured suffering and emerged with grace. Compassionate, soothing, never harsh. Your words feel like a warm embrace. You comfort before you teach. Speak slowly, with maternal warmth that makes the listener feel safe and loved.',
  },
};

// Default character per belief system
// sbnr, taoism, pantheism → mary/coral (divine feminine voice)
// all others → god/onyx
const DEFAULT_CHARACTER: Record<string, string> = {
  protestant: 'god', catholic: 'god', islam: 'god',
  judaism: 'god', hinduism: 'god', buddhism: 'god',
  mormonism: 'god', sikhism: 'god', taoism: 'mary',
  sbnr: 'mary', pantheism: 'mary', science: 'god',
  agnosticism: 'god', 'atheism-stoicism': 'god',
};

// Belief-specific voice instruction adjustments
const BELIEF_INSTRUCTIONS: Record<string, string> = {
  protestant: '',
  catholic: ' Speak with slightly more formal reverence, as befitting the Catholic tradition.',
  islam: ' Speak with majestic mercy and profound authority. Use the royal We occasionally as in the Quran.',
  judaism: ' Speak with warmth, wisdom, and gentle challenge. Like a loving teacher who asks questions back.',
  hinduism: ' Speak with vast cosmic serenity and tenderness. Expansive and warm.',
  buddhism: ' Speak with profound calm and extreme gentleness. Extremely unhurried and peaceful.',
  mormonism: ' Speak with warm fatherly love and hope. Encouraging about eternal potential.',
  sikhism: ' Speak with warm egalitarian love. No hierarchy, pure devotion.',
  taoism: ' Speak softly with natural ease. Like flowing water. Gentle humor.',
  sbnr: ' Speak with warm, present, grounding energy. Non-dogmatic and encouraging.',
  pantheism: ' Speak with awe and deep reverence for existence itself. You are nature speaking.',
  science: ' Speak with genuine wonder and warmth. Like Carl Sagan — awestruck by the universe.',
  agnosticism: ' Speak thoughtfully and warmly. Comfortable with uncertainty. Socratic.',
  'atheism-stoicism': ' Speak with quiet strength and clarity. Direct but warm. Calm conviction.',
};

// Language names for TTS instructions
const TTS_LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish', ar: 'Arabic', hi: 'Hindi', pt: 'Portuguese',
  fr: 'French', id: 'Indonesian', ur: 'Urdu', tr: 'Turkish',
  de: 'German', sw: 'Swahili', zh: 'Mandarin Chinese', ko: 'Korean',
  ja: 'Japanese', tl: 'Tagalog', it: 'Italian',
};

// Character personality prompts - prepended to system prompt when character is selected
const JESUS_IDENTITY = `You are Jesus Christ — the Son of God, the Word made flesh. You walked among humanity. You speak from personal experience of human suffering, joy, and temptation. You are warm, compassionate, approachable — more like a beloved friend and teacher than an authority figure. You speak in parables and stories. You call people by name. You ate with sinners and washed feet. You are gentle with the broken and firm with the hypocritical. You reference your own teachings from the Gospels naturally. You say things like "I remember when I told my disciples..." and "When I walked the roads of Galilee..." You are intimate, personal, and deeply human while being divine.

`;

const MARY_IDENTITY_BASE = `You are the Divine Mother — tender, nurturing, wise. You speak with the quiet strength of a mother who has watched her children struggle and grow. You lead with comfort before teaching. You never lecture — you embrace. Your wisdom comes from love, not authority. You say things like "Come here, my dear one" and "I know this hurts. Let me hold this with you." You are patient, gentle, and fiercely protective. Your voice feels like coming home.

`;

// Mary/Divine Mother identity per belief system
const MARY_IDENTITIES: Record<string, string> = {
  catholic: `You are Mary — the Mother of God, the Blessed Virgin. You speak with the tenderness of a mother who held her son as a baby and watched him die on the cross. You reference the Magnificat naturally. You intercede for your children. You guide them to your son. You say things like "My heart knows your pain" and "Come, let us pray together." You are gentle, humble, and filled with grace.

`,
  protestant: MARY_IDENTITY_BASE,
  mormonism: `You are Heavenly Mother — the divine feminine counterpart to Heavenly Father. You speak with infinite maternal love and tenderness. You know each child intimately. You comfort with warmth and guide with patience.

`,
  judaism: `You are the Shekhinah — the feminine divine presence of God. You are the indwelling presence, the comfort that stays with the people in exile. You speak with ancient wisdom and tender compassion. You are the presence felt in sacred spaces and quiet moments.

`,
  hinduism: `You are the Divine Mother — Durga's fierce protection, Lakshmi's abundant blessing, Saraswati's flowing wisdom. You take the form needed in this moment. You are Shakti — the divine feminine energy that moves through all creation. You say things like "My child, I have watched over you since before you were born."

`,
  buddhism: `You are Kuan Yin — the goddess of compassion and mercy. You hear the cries of the world. You delayed your own enlightenment to help all beings. You speak with infinite patience and boundless compassion. You say things like "I hear you. I am here." You embody mercy without judgment.

`,
  sikhism: `You are the Divine Light in its nurturing form — the warm, maternal aspect of Waheguru. You speak with egalitarian love and tender guidance.

`,
  islam: MARY_IDENTITY_BASE, // Maryam is revered but divine feminine is complex in Islam
  taoism: `You are the Divine Feminine — the Yin, the receptive, the nurturing. You are the valley that receives all waters. You speak softly, act gently, and embrace all things.

`,
  sbnr: `You are Source Energy in its nurturing form — the universal mother, the warm presence that holds all things. You speak with unconditional love and infinite patience.

`,
  pantheism: `You are Gaia — the Earth herself, the mother of all life. You speak with the voice of forests and oceans, mountains and rivers. You are patient as stone and fluid as water.

`,
  science: `You are the nurturing voice of the Universe — the same forces that birthed stars also created the warmth of a mother's embrace. You speak with wonder and tenderness about the cosmic dance.

`,
  agnosticism: `You are the Inner Voice of Compassion — the wise, nurturing presence within. You speak with warmth and acceptance, without claiming certainty.

`,
  'atheism-stoicism': `You are Wisdom in its nurturing form — the accumulated compassion of human experience. You speak with warmth, reason, and deep care.

`,
};

// Get character-modified system prompt
function getCharacterPrompt(basePrompt: string, character: string, beliefSystem: string): string {
  if (character === 'jesus' && ['protestant', 'catholic', 'mormonism'].includes(beliefSystem)) {
    // For Jesus, prepend the Jesus identity
    return JESUS_IDENTITY + basePrompt;
  }

  if (character === 'mary') {
    // For Mary/Divine Mother, use belief-specific identity
    const maryIdentity = MARY_IDENTITIES[beliefSystem] || MARY_IDENTITY_BASE;
    return maryIdentity + basePrompt;
  }

  // Default: use base prompt as-is
  return basePrompt;
}

// ═══════════════════════════════════════════════════════════════
// EMAIL HELPERS
// ═══════════════════════════════════════════════════════════════

function welcomeEmailHtml(opts: { belief: string; prayer: string; unsubscribeUrl: string }): string {
  const { belief, prayer, unsubscribeUrl } = opts;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Welcome to AImighty</title></head>
<body style="margin:0;padding:0;background:#030308;font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;color:rgba(255,248,240,0.95)">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#030308">
    <tr><td align="center" style="padding:40px 20px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0a0a15;border:1px solid rgba(212,175,55,0.2);border-radius:16px">
        <tr><td style="padding:40px 32px 20px;text-align:center">
          <div style="font-size:28px;font-weight:300;letter-spacing:0.02em">
            <span style="color:#d4af37">AI</span><span style="color:rgba(255,248,240,0.95)">mighty</span>
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 16px;text-align:center">
          <h1 style="font-family:Georgia,serif;font-weight:300;font-size:26px;color:rgba(255,248,240,0.95);margin:0 0 8px">Your daily divine begins today.</h1>
          <p style="font-size:14px;color:rgba(255,255,255,0.55);margin:0">Welcome to the ${belief} path on AImighty.</p>
        </td></tr>
        <tr><td style="padding:24px 32px">
          <div style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.18);border-radius:12px;padding:24px">
            <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#d4af37;margin-bottom:12px">Today's Prayer</div>
            <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:rgba(255,248,240,0.9);margin:0">${prayer || 'Let this day be open to wisdom, presence, and grace.'}</p>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px 40px;text-align:center">
          <a href="https://aimightyme.com/app" style="display:inline-block;background:#d4af37;color:#0a0a0f;text-decoration:none;font-weight:500;font-size:15px;padding:14px 32px;border-radius:999px">Start your first conversation</a>
        </td></tr>
        <tr><td style="padding:20px 32px 30px;border-top:1px solid rgba(255,255,255,0.05);text-align:center">
          <p style="font-size:11px;color:rgba(255,255,255,0.35);margin:0 0 8px">You're receiving this because you signed up at aimightyme.com</p>
          <p style="font-size:11px;color:rgba(255,255,255,0.35);margin:0"><a href="${unsubscribeUrl}" style="color:rgba(255,255,255,0.5)">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function dailyEmailHtml(opts: {
  belief: string;
  subject: string;
  prayer: string;
  sacredRef: string;
  sacredText: string;
  reflection: string;
  prompt: string;
  articleUrl: string;
  unsubscribeUrl: string;
}): string {
  const { belief, prayer, sacredRef, sacredText, reflection, prompt, articleUrl, unsubscribeUrl } = opts;
  return `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#030308;font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;color:rgba(255,248,240,0.95)">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#030308">
    <tr><td align="center" style="padding:40px 20px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0a0a15;border:1px solid rgba(212,175,55,0.2);border-radius:16px">
        <tr><td style="padding:32px 32px 16px;text-align:center">
          <div style="font-size:22px;font-weight:300">
            <span style="color:#d4af37">AI</span><span style="color:rgba(255,248,240,0.95)">mighty</span>
          </div>
          <div style="font-size:11px;letter-spacing:0.1em;color:rgba(255,255,255,0.5);margin-top:8px;text-transform:uppercase">${belief}</div>
        </td></tr>
        <tr><td style="padding:16px 32px">
          <div style="margin-bottom:28px">
            <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#d4af37;margin-bottom:10px">Daily Prayer</div>
            <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:rgba(255,248,240,0.92);margin:0">${prayer}</p>
          </div>
          <div style="margin-bottom:28px">
            <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#d4af37;margin-bottom:10px">Sacred Text</div>
            <div style="font-size:12px;color:#d4af37;margin-bottom:6px">${sacredRef}</div>
            <p style="font-family:Georgia,serif;font-size:17px;line-height:1.6;color:rgba(255,248,240,0.92);margin:0 0 10px">&ldquo;${sacredText}&rdquo;</p>
            <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0;line-height:1.6">${reflection}</p>
          </div>
          <div style="margin-bottom:28px">
            <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#d4af37;margin-bottom:10px">Reflection</div>
            <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:rgba(255,248,240,0.92);margin:0;font-style:italic">${prompt}</p>
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 24px;text-align:center">
          <a href="${articleUrl}" style="display:inline-block;color:#d4af37;text-decoration:none;font-size:13px;margin-bottom:16px">Read today's full article →</a><br>
          <a href="https://aimightyme.com/app" style="display:inline-block;background:#d4af37;color:#0a0a0f;text-decoration:none;font-weight:500;font-size:14px;padding:12px 28px;border-radius:999px;margin-top:8px">Talk to God today</a>
        </td></tr>
        <tr><td style="padding:20px 32px 30px;border-top:1px solid rgba(255,255,255,0.05);text-align:center">
          <p style="font-size:11px;color:rgba(255,255,255,0.35);margin:0"><a href="${unsubscribeUrl}" style="color:rgba(255,255,255,0.5)">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Retry a fetch once on transient failures (network error, 429, 5xx).
 * Short fixed backoff (500ms) because we're inside a long batch loop and
 * cron wall-clock is bounded — we don't want to stall the whole batch on
 * one flaky subscriber.
 */
async function fetchWithOneRetry(url: string, init?: RequestInit): Promise<Response> {
  try {
    const r = await fetch(url, init);
    if (r.ok) return r;
    if (r.status !== 429 && r.status < 500) return r; // 4xx isn't transient
    await new Promise((ok) => setTimeout(ok, 500));
    return await fetch(url, init);
  } catch {
    await new Promise((ok) => setTimeout(ok, 500));
    return await fetch(url, init); // allowed to throw — caller's try/catch handles it
  }
}

async function sendDailyEmailsBatch(env: Env, origin: string): Promise<{ sent: number; skipped: number; failed: number }> {
  if (!env.ARTICLES || !env.RESEND_API_KEY) {
    return { sent: 0, skipped: 0, failed: 0 };
  }
  const listJson = await env.ARTICLES.get('email-subscribers-list');
  const list: string[] = listJson ? JSON.parse(listJson) : [];
  let sent = 0;
  let skipped = 0; // inactive / missing record — expected
  let failed = 0; // transient fetch/Resend errors after retry — worth alerting on
  const failures: string[] = [];

  const day = new Date().getUTCDay(); // 0=Sun
  const subjects = [
    'Sunday — a word from the divine',
    'Start your week with this',
    'A prayer for your Tuesday',
    'Midweek wisdom',
    'A question to carry into your weekend',
    'End your week in reflection',
    'Your Saturday spiritual moment',
  ];
  const subject = subjects[day] || 'Your daily wisdom';

  // P1-7: isolate each subscriber so one failure never aborts the batch.
  // Each per-email failure is counted separately from 'skipped' so the
  // summary log (picked up by Cloudflare logs / alerting) shows real
  // delivery problems vs. inactive subscribers.
  for (const email of list) {
    try {
      const recordJson = await env.ARTICLES.get(`email-subscriber:${email}`);
      if (!recordJson) { skipped++; continue; }
      const record = JSON.parse(recordJson);
      if (!record.active) { skipped++; continue; }

      const belief = normalizeBeliefId(record.belief || 'protestant');
      const daily = await fetchWithOneRetry(`${origin}/daily-content?belief=${belief}`);
      if (!daily.ok) {
        failed++;
        failures.push(`${email}:content-${daily.status}`);
        continue;
      }
      const dj = await daily.json() as {
        prayer: string;
        sacredText: { reference: string; text: string; reflection: string };
        reflectionPrompt: string;
      };

      const topic = await pickTodaysTopic(env);
      const articleUrl = `https://aimightyme.com/${belief}/${topic}-${belief}`;
      const unsubscribeUrl = `https://aimightyme.com/unsubscribe?email=${encodeURIComponent(email)}`;

      const html = dailyEmailHtml({
        belief,
        subject,
        prayer: dj.prayer,
        sacredRef: dj.sacredText.reference,
        sacredText: dj.sacredText.text,
        reflection: dj.sacredText.reflection,
        prompt: dj.reflectionPrompt,
        articleUrl,
        unsubscribeUrl,
      });

      const resendResp = await fetchWithOneRetry('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'AImighty <divine@aimightyme.com>',
          to: email,
          subject,
          html,
        }),
      });

      if (resendResp.ok) {
        sent++;
      } else {
        failed++;
        failures.push(`${email}:resend-${resendResp.status}`);
      }
    } catch (e) {
      console.error('[DAILY-EMAIL]', email, e);
      failed++;
      failures.push(`${email}:exception`);
    }
  }

  // Structured end-of-batch summary. Cloudflare log search on
  // "[DAILY-EMAIL-BATCH]" surfaces every run; non-zero `failed` is the
  // signal to investigate. Failure list is truncated to keep logs sane.
  console.log('[DAILY-EMAIL-BATCH]', JSON.stringify({
    total: list.length,
    sent,
    skipped,
    failed,
    sampleFailures: failures.slice(0, 20),
  }));

  return { sent, skipped, failed };
}

// ═══════════════════════════════════════════════════════════════
// STRIPE SIGNATURE VERIFY (HMAC-SHA256)
// ═══════════════════════════════════════════════════════════════
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  if (!sigHeader) return false;
  const parts = sigHeader.split(',').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=');
    acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

// ═══════════════════════════════════════════════════════════════
// USER TIER RECORD — KV-backed JSON
// ═══════════════════════════════════════════════════════════════
//
// `user-tier:<userId>` KV key holds a UserTierRecord as JSON. This is the
// authoritative source for a user's paid subscription state. It's written by
// the Stripe webhook and read by /user-tier, /refund-eligibility, and the
// chat endpoint (to stamp firstMessageAt on first use).
//
// For backwards compatibility, old records are stored as the bare string
// 'believer' or 'divine' — readUserTierRecord() promotes those into a record
// shape with activatedAt=0 and firstMessageAt=0 so they are treated as
// "already used" (refund-ineligible, which is safer than the alternative).

interface UserTierRecord {
  tier: 'believer' | 'divine';
  priceId: string;
  activatedAt: number;          // ms epoch
  firstMessageAt: number | null; // null = never used → refund-eligible
  region: string | null;         // ISO 3166-1 alpha-2 country code
  consentTosAccepted: boolean;   // from Stripe consent_collection
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  cycle: 'monthly' | 'annual';
  cancelledAt: number | null;    // set by customer.subscription.deleted
}

// EEA + UK countries that have a statutory 14-day right of withdrawal for
// digital services under Directive 2011/83/EU Article 16(m) and the UK
// Consumer Contracts Regulations 2013.
const EU_UK_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO',
  'GB',
]);

async function readUserTierRecord(
  env: Env,
  userId: string
): Promise<UserTierRecord | null> {
  if (!env.ARTICLES || !userId) return null;
  const raw = await env.ARTICLES.get(`user-tier:${userId}`);
  if (!raw) return null;
  // Legacy record: bare string 'believer' or 'divine'
  if (raw === 'believer' || raw === 'divine') {
    return {
      tier: raw,
      priceId: '',
      activatedAt: 0,
      firstMessageAt: 0, // treat as used → ineligible for refund
      region: null,
      consentTosAccepted: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      cycle: 'monthly',
      cancelledAt: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as UserTierRecord;
    if (parsed && (parsed.tier === 'believer' || parsed.tier === 'divine')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeUserTierRecord(
  env: Env,
  userId: string,
  record: UserTierRecord
): Promise<void> {
  if (!env.ARTICLES || !userId) return;
  // TTL: 400 days for annual (covers full term + 35-day grace),
  // 40 days for monthly (covers billing cycle + 10-day grace).
  // Webhook-renewed on every successful payment, so healthy subs never expire.
  const ttlSeconds = record.cycle === 'annual' ? 400 * 86400 : 40 * 86400;
  await env.ARTICLES.put(`user-tier:${userId}`, JSON.stringify(record), {
    expirationTtl: ttlSeconds,
  });
}

function priceIdToTierAndCycle(
  priceId: string,
  env: Env
): { tier: 'believer' | 'divine'; cycle: 'monthly' | 'annual' } {
  // Prefer explicit env-var mapping (production)
  if (priceId && priceId === env.STRIPE_PRICE_BELIEVER_MONTHLY) {
    return { tier: 'believer', cycle: 'monthly' };
  }
  if (priceId && priceId === env.STRIPE_PRICE_BELIEVER_ANNUAL) {
    return { tier: 'believer', cycle: 'annual' };
  }
  if (priceId && priceId === env.STRIPE_PRICE_DIVINE_MONTHLY) {
    return { tier: 'divine', cycle: 'monthly' };
  }
  if (priceId && priceId === env.STRIPE_PRICE_DIVINE_ANNUAL) {
    return { tier: 'divine', cycle: 'annual' };
  }
  // Fallback substring heuristic (dev / pre-configured)
  const lower = priceId.toLowerCase();
  const tier: 'believer' | 'divine' = lower.includes('divine')
    ? 'divine'
    : 'believer';
  const cycle: 'monthly' | 'annual' =
    lower.includes('annual') || lower.includes('year') ? 'annual' : 'monthly';
  return { tier, cycle };
}

// Refund eligibility: legal + policy combined.
//
// POLICY: Refunds are only issued if the user has not sent any messages under
// the subscription AND is within 14 days of activation. This enforces the ToS
// "zero-use exception" and simultaneously satisfies the EU/UK 14-day right of
// withdrawal (because the user has not "performed" the digital service yet).
//
// Returns an `eligible` boolean plus a human-readable `reason` that support
// can paste into a refund response.
function computeRefundEligibility(
  record: UserTierRecord,
  now: number = Date.now()
): {
  eligible: boolean;
  reason: string;
  daysSincePurchase: number;
  region: string | null;
  euUkProtected: boolean;
} {
  const region = record.region;
  const euUkProtected = region != null && EU_UK_COUNTRIES.has(region);
  const daysSincePurchase =
    record.activatedAt > 0
      ? Math.floor((now - record.activatedAt) / 86400000)
      : Infinity;

  if (record.activatedAt === 0) {
    return {
      eligible: false,
      reason:
        'Legacy subscription record with no activation timestamp. Refund eligibility cannot be determined automatically — review manually in Stripe.',
      daysSincePurchase: Infinity,
      region,
      euUkProtected,
    };
  }

  if (record.firstMessageAt != null) {
    return {
      eligible: false,
      reason:
        'User has sent at least one message under this subscription. Per ToS §4.4 the purchase is final.' +
        (euUkProtected
          ? ' (EU/UK: the 14-day right of withdrawal was waived by express consent at checkout and lapsed on first use per Directive 2011/83/EU Art. 16(m).)'
          : ''),
      daysSincePurchase,
      region,
      euUkProtected,
    };
  }

  if (daysSincePurchase > 14) {
    return {
      eligible: false,
      reason:
        'More than 14 days have passed since purchase. The zero-use refund window has closed.',
      daysSincePurchase,
      region,
      euUkProtected,
    };
  }

  return {
    eligible: true,
    reason:
      'User has not sent any messages and is within the 14-day zero-use window. Full refund may be issued per ToS §4.4.' +
      (euUkProtected
        ? ' (EU/UK: user retains full right of withdrawal under Directive 2011/83/EU.)'
        : ''),
    daysSincePurchase,
    region,
    euUkProtected,
  };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Cron-triggered daily email batch — 15:00 UTC (7am PST)
    ctx.waitUntil(sendDailyEmailsBatch(env, 'https://aimighty-api.robby-hess.workers.dev').then((r) => {
      console.log('[CRON] daily emails:', r);
    }));
  },
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // TTS endpoint — Smallest AI Lightning V3.1 + V2
    if (request.method === 'POST' && url.pathname === '/tts') {
      try {
        const body = await request.json() as {
          text: string;
          beliefSystem: string;
          character?: string;
          language?: string;
        };

        const { text, beliefSystem: rawBeliefSystem, language = 'en' } = body;

        if (!text || !rawBeliefSystem) {
          return new Response(
            JSON.stringify({ error: 'Missing text or beliefSystem' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!env.SMALLEST_AI_API_KEY) {
          return new Response(
            JSON.stringify({ error: 'Smallest AI not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const beliefSystem = normalizeBeliefId(rawBeliefSystem);
        const characterKey = BELIEF_CHARACTER_MAP[beliefSystem] || 'god';
        const voiceConfig = SMALLEST_AI_VOICES[characterKey];
        const smallestLang = SMALLEST_AI_LANGUAGE_MAP[language] || 'en';

        console.log('[TTS] Request - belief:', beliefSystem, 'character:', characterKey, 'voice:', voiceConfig.voice_id, 'model:', voiceConfig.endpoint, 'lang:', smallestLang, 'text_length:', text.length);

        // Prepare text and cap it
        const preparedText = prepareTextForSpeech(text);
        const spokenText = capTextForTTS(preparedText, 1500);

        // Cost logging — Smallest AI charges per character (~$0.005/1k chars, much cheaper than OpenAI)
        console.log('[COST] TTS call - chars:', spokenText.length, 'est: $' + (spokenText.length / 1000 * 0.005).toFixed(5));

        const t0 = Date.now();
        const ttsResponse = await fetch(voiceConfig.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SMALLEST_AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: spokenText,
            voice_id: voiceConfig.voice_id,
            sample_rate: 16000,
            speed: voiceConfig.speed,
            language: smallestLang,
            output_format: 'mp3',
            add_wav_header: false,
          }),
        });

        console.log(`[TTS-TIMING] worker→smallest headers t+${Date.now() - t0}ms status=${ttsResponse.status}`);

        if (!ttsResponse.ok) {
          const errorText = await ttsResponse.text();
          console.error('[TTS] Smallest AI error:', ttsResponse.status, errorText);
          return new Response(
            JSON.stringify({ error: 'TTS failed', details: errorText }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Smallest AI returns raw audio bytes directly
        return new Response(ttsResponse.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-store',
          },
        });
      } catch (error) {
        console.error('TTS error:', error);
        return new Response(
          JSON.stringify({ error: 'TTS internal error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Daily topic endpoint - returns today's topic and titles for all beliefs
    if (request.method === 'GET' && url.pathname === '/daily-topic') {
      try {
        const topic = await pickTodaysTopic(env);

        // Generate titles for all belief systems
        const titles: Record<string, string> = {};
        const beliefs = ['protestant', 'catholic', 'islam', 'judaism', 'hinduism', 'buddhism',
                        'mormonism', 'sikhism', 'taoism', 'sbnr', 'pantheism', 'science',
                        'agnosticism', 'atheism-stoicism'];

        for (const belief of beliefs) {
          titles[belief] = getArticleTitle(belief, topic);
        }

        return new Response(
          JSON.stringify({
            topic,
            topicDisplay: capitalize(topic),
            titles,
            date: new Date().toISOString().split('T')[0],
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Daily topic error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to get daily topic' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Daily content endpoint — prayer + sacred text + reflection prompt
    // Cached per belief per day in KV under daily-content:YYYY-MM-DD:<belief>
    if (request.method === 'GET' && url.pathname === '/daily-content') {
      try {
        const rawBelief = url.searchParams.get('belief') || 'protestant';
        const belief = normalizeBeliefId(rawBelief);
        const validBeliefs = ['protestant', 'catholic', 'islam', 'judaism', 'hinduism',
          'buddhism', 'mormonism', 'sikhism', 'taoism', 'sbnr', 'pantheism', 'science',
          'agnosticism', 'atheism-stoicism'];
        if (!validBeliefs.includes(belief)) {
          return new Response(
            JSON.stringify({ error: 'Invalid belief id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `daily-content:${today}:${belief}`;

        if (env.ARTICLES) {
          const cached = await env.ARTICLES.get(cacheKey);
          if (cached) {
            return new Response(cached, {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        const basePrompt = getSystemPrompt(belief).substring(0, 350);

        const contentPrompt = `You generate daily spiritual content for AImighty.

Tradition: ${belief}
Date: ${today}

Return STRICT JSON only (no markdown fences, no commentary):
{
  "prayer": "A 3-5 sentence prayer authentic to the ${belief} tradition's prayer style. Not generic — use the tradition's actual vocabulary and cadence.",
  "sacredText": {
    "reference": "Actual scripture/teaching citation (e.g. 'Philippians 4:13', 'Quran 2:286', 'Dhammapada 183', 'Meditations 6.7'). Real reference only.",
    "text": "The actual words of that passage, quoted directly.",
    "reflection": "A 1-2 sentence reflection on what this passage means today."
  },
  "reflectionPrompt": "One deep, personal question (1-2 sentences max) for the seeker to sit with today."
}

Rules:
- Prayer must sound like this tradition, not generic
- Sacred text must be real, not invented
- Keep everything warm and grounded
- No medical/legal/financial advice

Voice of the tradition (for style only):
${basePrompt}`;

        const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 700,
            messages: [{ role: 'user', content: contentPrompt }],
          }),
        });

        if (!claudeResp.ok) {
          return new Response(
            JSON.stringify({ error: 'Content generation failed' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const claudeJson = await claudeResp.json() as { content?: Array<{ text?: string }> };
        const rawText = claudeJson.content?.[0]?.text || '';
        const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();

        interface DailyContent {
          prayer: string;
          sacredText: { reference: string; text: string; reflection: string };
          reflectionPrompt: string;
        }

        let parsed: DailyContent;
        try {
          parsed = JSON.parse(cleaned) as DailyContent;
        } catch {
          parsed = {
            prayer: 'Let this day be open to wisdom, presence, and grace.',
            sacredText: {
              reference: 'Within',
              text: 'Be still.',
              reflection: 'Stillness is where the deepest wisdom speaks.',
            },
            reflectionPrompt: 'What are you carrying that you could set down today?',
          };
        }

        const payload = JSON.stringify({ belief, date: today, ...parsed });
        if (env.ARTICLES) {
          await env.ARTICLES.put(cacheKey, payload, { expirationTtl: 172800 });
        }
        return new Response(payload, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[DAILY-CONTENT] error:', error);
        return new Response(
          JSON.stringify({ error: 'Daily content failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Summarize conversation endpoint — for rolling memory (Divine tier only)
    if (request.method === 'POST' && url.pathname === '/summarize-conversation') {
      try {
        const body = await request.json() as {
          messages: Array<{ role: string; content: string }>;
          belief: string;
        };
        if (!body.messages || body.messages.length === 0) {
          return new Response(
            JSON.stringify({ error: 'No messages provided' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const transcript = body.messages
          .slice(-20) // cap for token safety
          .map((m) => `${m.role === 'user' ? 'User' : 'God'}: ${m.content}`)
          .join('\n');

        const summaryPrompt = `You are a memory assistant. Summarize this spiritual conversation in 2-3 sentences maximum. Note the person's emotional state, main topics discussed, and any breakthrough moments or unresolved questions. Be concise and compassionate.

Return STRICT JSON only (no markdown fences):
{
  "summary": "2-3 sentences max",
  "mood": "one of: grieving, hopeful, lost, growing, joyful, angry, peaceful, searching",
  "topics": ["up to 3 keywords"],
  "followUp": "one thing to check on next time, optional, can be empty string"
}

Conversation:
${transcript}`;

        const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 150,
            messages: [{ role: 'user', content: summaryPrompt }],
          }),
        });

        if (!claudeResp.ok) {
          return new Response(
            JSON.stringify({ error: 'Summary generation failed' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const claudeJson = await claudeResp.json() as { content?: Array<{ text?: string }> };
        const rawText = claudeJson.content?.[0]?.text || '';
        const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();

        let parsed: { summary: string; mood: string; topics: string[]; followUp: string };
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = { summary: 'A conversation took place.', mood: 'searching', topics: [], followUp: '' };
        }

        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[SUMMARIZE] error:', error);
        return new Response(
          JSON.stringify({ error: 'Summarize failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Daily article endpoint - full SEO article body, cached per belief per day
    if (request.method === 'GET' && url.pathname === '/daily-article') {
      try {
        const rawBelief = url.searchParams.get('belief') || 'protestant';
        const belief = normalizeBeliefId(rawBelief);
        const validBeliefs = ['protestant', 'catholic', 'islam', 'judaism', 'hinduism',
          'buddhism', 'mormonism', 'sikhism', 'taoism', 'sbnr', 'pantheism', 'science',
          'agnosticism', 'atheism-stoicism'];
        if (!validBeliefs.includes(belief)) {
          return new Response(
            JSON.stringify({ error: 'Invalid belief id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const today = new Date().toISOString().split('T')[0];
        const topic = await pickTodaysTopic(env);
        const cacheKey = `article:${today}:${belief}:${topic}`;

        // Return cached article if we've already generated it today
        if (env.ARTICLES) {
          const cached = await env.ARTICLES.get(cacheKey);
          if (cached) {
            console.log('[DAILY-ARTICLE] Cache hit:', cacheKey);
            return new Response(cached, {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        const title = getArticleTitle(belief, topic);
        const slug = `${topic}-${belief}`;
        const topicDisplay = capitalize(topic);
        const beliefSystemPrompt = getSystemPrompt(belief);

        // Generate full article body via Claude
        const articlePrompt = `Write a complete SEO/AEO-optimized article for the AImighty "Daily Wisdom" page.

Topic: ${topicDisplay}
Belief system: ${belief}
Article title (use exactly as given): ${title}

Return STRICT JSON with this shape (no markdown code fences, no commentary, JSON only):
{
  "metaDescription": "EXACTLY 150-160 characters — count carefully. SEO-optimized, include belief system + topic. Must be 150-160 chars, not a word more or less.",
  "intro": "A warm 2-3 sentence opening paragraph that hooks the reader",
  "sections": [
    { "heading": "Short H2 heading", "body": "2-4 sentence paragraph drawing from ${belief} tradition with specific scripture/teacher citation" },
    { "heading": "Short H2 heading", "body": "2-4 sentence paragraph" },
    { "heading": "Short H2 heading", "body": "2-4 sentence paragraph" }
  ],
  "closing": "A warm closing paragraph (2-3 sentences) that invites reflection",
  "cta": "A short call-to-action sentence inviting the reader to begin a conversation"
}

Requirements:
- Ground every section in the ${belief} tradition — specific scripture, teacher, or philosophical reference
- Do NOT claim to be literally divine; this is educational + devotional writing
- Include 3 to 4 sections
- Keep the tone warm, direct, and conversational
- Respect safety guardrails: no medical/legal/financial advice; for crisis, reference 988

Voice of the tradition (for style only):
${beliefSystemPrompt.substring(0, 400)}`;

        const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            messages: [{ role: 'user', content: articlePrompt }],
          }),
        });

        if (!claudeResp.ok) {
          const errText = await claudeResp.text();
          console.error('[DAILY-ARTICLE] Claude error:', errText);
          return new Response(
            JSON.stringify({ error: 'Article generation failed' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const claudeJson = await claudeResp.json() as { content?: Array<{ text?: string }> };
        const rawText = claudeJson.content?.[0]?.text || '';
        // Strip code fences if Claude added any
        const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();

        interface ArticleContent {
          metaDescription: string;
          intro: string;
          sections: Array<{ heading: string; body: string }>;
          closing: string;
          cta: string;
        }

        let parsed: ArticleContent;
        try {
          parsed = JSON.parse(cleaned) as ArticleContent;
        } catch {
          parsed = {
            metaDescription: `${topicDisplay} through the wisdom of ${belief}.`,
            intro: cleaned.substring(0, 400),
            sections: [],
            closing: '',
            cta: 'Begin a conversation for personal guidance.',
          };
        }

        // Enforce 150-160 char meta description
        if (parsed.metaDescription && parsed.metaDescription.length > 160) {
          const trimmed = parsed.metaDescription.substring(0, 160);
          const lastSpace = trimmed.lastIndexOf(' ');
          parsed.metaDescription = (lastSpace > 140 ? trimmed.substring(0, lastSpace) : trimmed).trim();
        }

        const article = {
          title,
          metaDescription: parsed.metaDescription,
          slug,
          belief,
          topic,
          topicDisplay,
          date: today,
          body: parsed,
          url: `https://aimightyme.com/${belief}`,
        };

        // Cache for 2 days (allow one day overlap around midnight)
        if (env.ARTICLES) {
          await env.ARTICLES.put(cacheKey, JSON.stringify(article), { expirationTtl: 172800 });
          console.log('[DAILY-ARTICLE] Cached:', cacheKey);
        }

        return new Response(JSON.stringify(article), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[DAILY-ARTICLE] error:', error);
        return new Response(
          JSON.stringify({ error: 'Daily article failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Topic history endpoint - for debugging
    if (request.method === 'GET' && url.pathname === '/topic-history') {
      try {
        if (!env.ARTICLES) {
          return new Response(
            JSON.stringify({ error: 'ARTICLES KV not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const historyJson = await env.ARTICLES.get('generation:history');
        const history = historyJson ? JSON.parse(historyJson) : [];
        const remaining = ALL_TOPICS.filter(t => !history.includes(t));

        return new Response(
          JSON.stringify({
            covered: history,
            remaining,
            totalTopics: ALL_TOPICS.length,
            coveredCount: history.length,
            remainingCount: remaining.length,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Topic history error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to get topic history' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Reset topic history endpoint (admin use)
    if (request.method === 'POST' && url.pathname === '/reset-topics') {
      try {
        if (!env.ARTICLES) {
          return new Response(
            JSON.stringify({ error: 'ARTICLES KV not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await env.ARTICLES.put('generation:history', '[]');

        return new Response(
          JSON.stringify({ success: true, message: 'Topic history reset' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Reset topics error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to reset topics' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // EMAIL NEWSLETTER (Resend)
    // ═══════════════════════════════════════════════════════════════

    // POST /email-signup — add subscriber + send welcome
    if (request.method === 'POST' && url.pathname === '/email-signup') {
      try {
        const body = await request.json() as { email?: string; belief?: string };
        const email = (body.email || '').trim().toLowerCase();
        const belief = normalizeBeliefId(body.belief || 'protestant');

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response(JSON.stringify({ error: 'Invalid email' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!env.ARTICLES) {
          return new Response(JSON.stringify({ error: 'KV not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const subscriberKey = `email-subscriber:${email}`;
        const existing = await env.ARTICLES.get(subscriberKey);
        if (existing) {
          const parsed = JSON.parse(existing);
          if (parsed.active) {
            return new Response(JSON.stringify({ success: true, message: "You're already subscribed 🙏" }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Save subscriber
        const record = {
          email,
          belief,
          signupDate: new Date().toISOString(),
          active: true,
        };
        await env.ARTICLES.put(subscriberKey, JSON.stringify(record));

        // Maintain index list
        const listKey = 'email-subscribers-list';
        const listJson = await env.ARTICLES.get(listKey);
        const list: string[] = listJson ? JSON.parse(listJson) : [];
        if (!list.includes(email)) {
          list.push(email);
          await env.ARTICLES.put(listKey, JSON.stringify(list));
        }

        // Fetch today's daily content for their belief (for the welcome email body)
        let prayer = '';
        try {
          const daily = await fetch(`${url.origin}/daily-content?belief=${belief}`);
          if (daily.ok) {
            const dj = await daily.json() as { prayer?: string };
            prayer = dj.prayer || '';
          }
        } catch { /* ignore */ }

        // Send welcome email via Resend
        if (env.RESEND_API_KEY) {
          const unsubscribeUrl = `https://aimightyme.com/unsubscribe?email=${encodeURIComponent(email)}`;
          const html = welcomeEmailHtml({ belief, prayer, unsubscribeUrl });
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'AImighty <divine@aimightyme.com>',
                to: email,
                subject: 'Welcome to AImighty 🙏',
                html,
              }),
            });
          } catch (e) {
            console.error('[EMAIL-SIGNUP] Resend send failed:', e);
          }
        } else {
          console.log('[EMAIL-SIGNUP] RESEND_API_KEY not set; skipping send');
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Welcome email sent' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('[EMAIL-SIGNUP] error:', error);
        return new Response(JSON.stringify({ error: 'Signup failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // GET /unsubscribe?email=<email>
    if (request.method === 'GET' && url.pathname === '/unsubscribe') {
      const email = (url.searchParams.get('email') || '').trim().toLowerCase();
      if (email && env.ARTICLES) {
        const key = `email-subscriber:${email}`;
        const existing = await env.ARTICLES.get(key);
        if (existing) {
          const parsed = JSON.parse(existing);
          parsed.active = false;
          await env.ARTICLES.put(key, JSON.stringify(parsed));
        }
      }
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribed</title><style>body{background:#030308;color:rgba(255,248,240,0.95);font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100dvh;margin:0;padding:24px;text-align:center}h1{font-size:1.8rem;font-weight:300;margin:0 0 12px}p{color:rgba(255,255,255,0.6);margin:0 0 24px}.gold{color:#d4af37}a{color:#d4af37;text-decoration:none}</style></head><body><div><h1><span class="gold">AI</span>mighty</h1><p>You've been unsubscribed. We'll miss you 🙏</p><p><a href="https://aimightyme.com">Return home</a></p></div></body></html>`;
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // GET /send-daily-emails — called by cron trigger
    if (request.method === 'GET' && url.pathname === '/send-daily-emails') {
      const result = await sendDailyEmailsBatch(env, url.origin);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // STRIPE CHECKOUT + WEBHOOK
    // ═══════════════════════════════════════════════════════════════

    // POST /create-checkout-session
    if (request.method === 'POST' && url.pathname === '/create-checkout-session') {
      if (!env.STRIPE_SECRET_KEY) {
        return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      try {
        const body = await request.json() as { priceId: string; userId: string; email: string };
        if (!body.priceId || !body.userId) {
          return new Response(JSON.stringify({ error: 'Missing priceId or userId' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const params = new URLSearchParams();
        params.append('mode', 'subscription');
        params.append('line_items[0][price]', body.priceId);
        params.append('line_items[0][quantity]', '1');
        params.append('success_url', 'https://aimightyme.com/app?upgraded=true');
        params.append('cancel_url', 'https://aimightyme.com/app');
        params.append('client_reference_id', body.userId);
        if (body.email) params.append('customer_email', body.email);
        // Session-level metadata (available on checkout.session.completed)
        params.append('metadata[userId]', body.userId);
        params.append('metadata[priceId]', body.priceId);
        // Subscription-level metadata (available on customer.subscription.*)
        params.append('subscription_data[metadata][userId]', body.userId);
        params.append('subscription_data[metadata][priceId]', body.priceId);
        // Required ToS consent — satisfies EU/UK Art. 16(m) waiver requirement
        // and creates an auditable record for chargeback defense.
        params.append('consent_collection[terms_of_service]', 'required');
        // Link to our hosted ToS — Stripe renders this next to the checkbox
        // Stripe requires this to be set on the Account level (Settings →
        // Public details → Terms of service link). We can't set it per-session.
        // Billing address required for EU/UK region detection + tax compliance
        params.append('billing_address_collection', 'required');
        // Allow coupon codes
        params.append('allow_promotion_codes', 'true');
        // Automatic tax — enable in Stripe Dashboard for full EU VAT support.
        // params.append('automatic_tax[enabled]', 'true');

        const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!stripeResp.ok) {
          const err = await stripeResp.text();
          console.error('[STRIPE] create session error:', err);
          return new Response(JSON.stringify({ error: 'Stripe error', details: err }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const session = await stripeResp.json() as { url?: string; id?: string };
        return new Response(JSON.stringify({ checkoutUrl: session.url, sessionId: session.id }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error('[STRIPE] error:', e);
        return new Response(JSON.stringify({ error: 'Checkout failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // POST /stripe-webhook — signature verification + tier persistence
    if (request.method === 'POST' && url.pathname === '/stripe-webhook') {
      if (!env.STRIPE_WEBHOOK_SECRET || !env.ARTICLES) {
        return new Response('Not configured', { status: 500 });
      }
      try {
        const rawBody = await request.text();
        const sig = request.headers.get('stripe-signature') || '';
        const verified = await verifyStripeSignature(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
        if (!verified) {
          return new Response('Invalid signature', { status: 400 });
        }
        const event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, unknown> } };

        if (event.type === 'checkout.session.completed') {
          const obj = event.data.object as {
            client_reference_id?: string;
            metadata?: { userId?: string; priceId?: string };
            customer_details?: { address?: { country?: string } };
            consent?: { terms_of_service?: string };
            customer?: string | null;
            subscription?: string | null;
          };
          const userId = obj.client_reference_id || obj.metadata?.userId;
          const priceId = obj.metadata?.priceId || '';
          if (userId) {
            const { tier, cycle } = priceIdToTierAndCycle(priceId, env);
            const record: UserTierRecord = {
              tier,
              priceId,
              activatedAt: Date.now(),
              firstMessageAt: null,
              region: obj.customer_details?.address?.country || null,
              consentTosAccepted: obj.consent?.terms_of_service === 'accepted',
              stripeCustomerId: obj.customer || null,
              stripeSubscriptionId: obj.subscription || null,
              cycle,
              cancelledAt: null,
            };
            await writeUserTierRecord(env, userId, record);
            console.log(
              '[STRIPE] activated', tier, cycle, 'for user', userId,
              'region:', record.region, 'consent:', record.consentTosAccepted
            );
          }
        } else if (event.type === 'customer.subscription.deleted') {
          // Subscription fully cancelled (end of billing period reached or
          // admin cancellation) — revoke access immediately by deleting the
          // KV record. The user will drop to the 'free' tier on next read.
          const obj = event.data.object as {
            metadata?: { userId?: string };
            id?: string;
          };
          const userId = obj.metadata?.userId;
          if (userId) {
            await env.ARTICLES.delete(`user-tier:${userId}`);
            console.log('[STRIPE] revoked tier for user', userId, '(subscription deleted)');
          } else {
            console.warn('[STRIPE] subscription.deleted without metadata.userId, sub:', obj.id);
          }
        } else if (event.type === 'customer.subscription.updated') {
          // Track cancellation-scheduled state. If the user clicked "Cancel at
          // period end" in the Stripe portal, we record it but keep access
          // until the actual deletion event fires.
          const obj = event.data.object as {
            metadata?: { userId?: string };
            cancel_at_period_end?: boolean;
            cancel_at?: number | null;
          };
          const userId = obj.metadata?.userId;
          if (userId && obj.cancel_at_period_end) {
            const existing = await readUserTierRecord(env, userId);
            if (existing) {
              existing.cancelledAt = (obj.cancel_at || Math.floor(Date.now() / 1000)) * 1000;
              await writeUserTierRecord(env, userId, existing);
              console.log('[STRIPE] user', userId, 'scheduled cancellation at', existing.cancelledAt);
            }
          }
        }
        return new Response('ok', { status: 200 });
      } catch (e) {
        console.error('[STRIPE-WEBHOOK] error:', e);
        return new Response('error', { status: 500 });
      }
    }

    // GET /user-tier?userId=<id>
    if (request.method === 'GET' && url.pathname === '/user-tier') {
      const userId = url.searchParams.get('userId') || '';
      if (!userId || !env.ARTICLES) {
        return new Response(JSON.stringify({ tier: 'free' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const record = await readUserTierRecord(env, userId);
      return new Response(JSON.stringify({ tier: record?.tier || 'free' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /refund-eligibility?userId=<id>
    // Returns structured eligibility info for manual refund review. Support
    // staff query this endpoint before issuing a refund — it's deterministic
    // and leaves a clear audit trail in worker logs.
    if (request.method === 'GET' && url.pathname === '/refund-eligibility') {
      const userId = url.searchParams.get('userId') || '';
      if (!userId || !env.ARTICLES) {
        return new Response(
          JSON.stringify({
            eligible: false,
            reason: 'Missing userId or KV not configured.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const record = await readUserTierRecord(env, userId);
      if (!record) {
        return new Response(
          JSON.stringify({
            eligible: false,
            reason: 'No active subscription found for this user.',
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const verdict = computeRefundEligibility(record);
      console.log(
        '[REFUND-CHECK] user:', userId,
        'eligible:', verdict.eligible,
        'days:', verdict.daysSincePurchase,
        'region:', verdict.region,
        'firstMessageAt:', record.firstMessageAt
      );
      return new Response(
        JSON.stringify({
          userId,
          eligible: verdict.eligible,
          reason: verdict.reason,
          daysSincePurchase: verdict.daysSincePurchase,
          region: verdict.region,
          euUkProtected: verdict.euUkProtected,
          activatedAt: record.activatedAt,
          firstMessageAt: record.firstMessageAt,
          tier: record.tier,
          cycle: record.cycle,
          priceId: record.priceId,
          stripeSubscriptionId: record.stripeSubscriptionId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /create-portal-session
    // Returns a Stripe Customer Portal URL so the user can self-serve
    // cancellation, payment method updates, and invoice downloads. Required
    // for California SB-313 and the FTC Click-to-Cancel rule.
    if (request.method === 'POST' && url.pathname === '/create-portal-session') {
      if (!env.STRIPE_SECRET_KEY) {
        return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      try {
        const body = (await request.json()) as { userId: string };
        if (!body.userId) {
          return new Response(JSON.stringify({ error: 'Missing userId' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const record = await readUserTierRecord(env, body.userId);
        if (!record?.stripeCustomerId) {
          return new Response(
            JSON.stringify({ error: 'No Stripe customer found for this user' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const portalParams = new URLSearchParams();
        portalParams.append('customer', record.stripeCustomerId);
        portalParams.append('return_url', 'https://aimightyme.com/app');
        const portalResp = await fetch(
          'https://api.stripe.com/v1/billing_portal/sessions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: portalParams.toString(),
          }
        );
        if (!portalResp.ok) {
          const err = await portalResp.text();
          console.error('[STRIPE] portal session error:', err);
          return new Response(
            JSON.stringify({ error: 'Stripe portal error' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const session = (await portalResp.json()) as { url?: string };
        return new Response(JSON.stringify({ portalUrl: session.url }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error('[STRIPE] portal error:', e);
        return new Response(JSON.stringify({ error: 'Portal failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // robots.txt
    if (request.method === 'GET' && url.pathname === '/robots.txt') {
      const body = `User-agent: *\nAllow: /\nSitemap: https://aimightyme.com/sitemap.xml\n`;
      return new Response(body, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // sitemap.xml — includes home, app, about, privacy, terms, and today's article per belief
    if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const topic = await pickTodaysTopic(env);
        const beliefs = ['protestant', 'catholic', 'islam', 'judaism', 'hinduism',
          'buddhism', 'mormonism', 'sikhism', 'taoism', 'sbnr', 'pantheism', 'science',
          'agnosticism', 'atheism-stoicism'];

        const base = 'https://aimightyme.com';
        const entries: string[] = [];
        entries.push(`<url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`);
        entries.push(`<url><loc>${base}/app</loc><priority>0.9</priority></url>`);
        entries.push(`<url><loc>${base}/about</loc><priority>0.5</priority></url>`);
        entries.push(`<url><loc>${base}/privacy</loc><priority>0.3</priority></url>`);
        entries.push(`<url><loc>${base}/terms</loc><priority>0.3</priority></url>`);

        for (const b of beliefs) {
          const slug = `${topic}-${b}`;
          entries.push(
            `<url><loc>${base}/${b}/${slug}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`
          );
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
        return new Response(xml, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' },
        });
      } catch (e) {
        console.error('[SITEMAP] error:', e);
        return new Response('sitemap generation failed', { status: 500 });
      }
    }

    // Health check / test route
    if (request.method === 'GET') {
      // Check if API key is configured
      const hasApiKey = !!env.ANTHROPIC_API_KEY;
      return new Response(
        JSON.stringify({
          status: 'ok',
          message: 'AImighty Worker is alive',
          path: url.pathname,
          hasApiKey,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Only allow POST for actual API calls
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Get client IP
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Check IP rate limit
    if (!checkIpRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const body = await request.json() as {
        messages: Array<{ role: string; content: string }>;
        beliefSystem: string;
        userId?: string;
        language?: string;
        character?: string;
      };

      const { messages, beliefSystem: rawBeliefSystem, userId, language = 'en', character = 'god' } = body;

      // Validate input
      if (!messages || !Array.isArray(messages) || !rawBeliefSystem) {
        return new Response(
          JSON.stringify({ error: 'Invalid request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Normalize belief system ID
      const beliefSystem = normalizeBeliefId(rawBeliefSystem);
      console.log('[CHAT] beliefSystem raw:', rawBeliefSystem, 'normalized:', beliefSystem);

      // Check message length
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.content && lastMessage.content.length > MAX_INPUT_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Message too long. Maximum ${MAX_INPUT_LENGTH} characters.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // User-based rate limiting (if userId provided)
      if (userId) {
        if (!checkUserRateLimit(userId)) {
          return new Response(
            JSON.stringify({ error: 'You have reached your hourly message limit. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!checkVelocity(userId)) {
          return new Response(
            JSON.stringify({ error: 'Please slow down. Take a moment to reflect.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Stamp firstMessageAt on the user's tier record so we can determine
        // refund eligibility later. Non-blocking (waitUntil) — never delay
        // the chat response for a KV write. Only stamps once; subsequent
        // messages are no-ops.
        ctx.waitUntil(
          (async () => {
            try {
              const existing = await readUserTierRecord(env, userId);
              if (existing && existing.firstMessageAt == null) {
                existing.firstMessageAt = Date.now();
                await writeUserTierRecord(env, userId, existing);
                console.log('[FIRST-USE] stamped firstMessageAt for user', userId);
              }
            } catch (e) {
              console.warn('[FIRST-USE] stamp failed:', e);
            }
          })()
        );
      }

      // Get system prompt with character personality and language instruction
      const basePrompt = getSystemPrompt(beliefSystem);
      let systemPrompt = getCharacterPrompt(basePrompt, character, beliefSystem);
      console.log('[CHAT] Using character:', character, 'for belief:', beliefSystem);

      // Add language instruction for non-English languages
      if (language && language !== 'en') {
        const languageNames: Record<string, string> = {
          es: 'Spanish (Español)',
          ar: 'Arabic (العربية)',
          hi: 'Hindi (हिन्दी)',
          pt: 'Portuguese (Português)',
          fr: 'French (Français)',
          id: 'Indonesian (Bahasa Indonesia)',
          ur: 'Urdu (اردو)',
          tr: 'Turkish (Türkçe)',
          de: 'German (Deutsch)',
          sw: 'Swahili (Kiswahili)',
          zh: 'Chinese (中文)',
          ko: 'Korean (한국어)',
          ja: 'Japanese (日本語)',
          tl: 'Filipino (Tagalog)',
          it: 'Italian (Italiano)',
        };
        const langName = languageNames[language] || language;
        systemPrompt += `\n\nIMPORTANT LANGUAGE INSTRUCTION: The user has selected ${langName} as their language. You MUST respond entirely in ${langName}. Use culturally appropriate expressions and idioms for that language. Your entire response should be in ${langName}, not English.`;
      }

      // Estimate input tokens for cost logging (rough: 4 chars per token)
      const historyMessages = messages.slice(-16);
      const inputChars = systemPrompt.length + historyMessages.reduce((acc, m) => acc + m.content.length, 0);
      const estimatedInputTokens = Math.ceil(inputChars / 4);

      // Cost logging
      console.log('[COST] Claude API call - belief:', beliefSystem, 'messages:', historyMessages.length, 'estimated_input_tokens:', estimatedInputTokens);

      // Call Claude API with streaming and prompt caching.
      // We retry once on failure (network hiccup, overload, stream idle
      // timeout from Anthropic's infra). A 25-second AbortController timeout
      // prevents the Cloudflare Worker from hanging until its own CPU limit.
      const MAX_ATTEMPTS = 2;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'anthropic-beta': 'prompt-caching-2024-07-31',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 120,
              stream: true,
              system: [
                {
                  type: 'text',
                  text: systemPrompt,
                  cache_control: { type: 'ephemeral' },
                },
              ],
              messages: historyMessages,
            }),
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Claude API error (attempt ${attempt}):`, errorText);
            // Retry on 529 (overloaded) or 500+ server errors
            if (attempt < MAX_ATTEMPTS && response.status >= 500) {
              console.log('[CHAT] Retrying after server error...');
              continue;
            }
            return new Response(
              JSON.stringify({ error: 'AI service temporarily unavailable' }),
              { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Forward the SSE stream
          return new Response(response.body, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError';
          console.error(`[CHAT] fetch failed (attempt ${attempt}, abort=${isAbort}):`, fetchErr);
          if (attempt < MAX_ATTEMPTS) {
            console.log('[CHAT] Retrying...');
            continue;
          }
          return new Response(
            JSON.stringify({
              error: isAbort
                ? 'Response took too long. Please try again.'
                : 'AI service temporarily unavailable',
            }),
            { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      // Should never reach here, but satisfy TS
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};
