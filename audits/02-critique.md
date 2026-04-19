# /critique — UX Design Critique

**Project:** AImighty · **Audit:** 2026-04-16 · **Launch:** 2026-04-19
**Lens:** Design-director critique. Whether the interface *works* as a designed experience, not whether the code passes a linter.

---

## Anti-Patterns Verdict

**PASS — and it's the strongest dimension of this product.** You could hand a screenshot of the landing page to someone and say "design studio made this" and it would be believable. Specific reasons the AI-slop tells are absent:

- **Palette is considered, not generated.** Obsidian void + one gold accent + warm off-white is a *three-color* system. It took discipline to not add a purple-to-blue gradient "for variety."
- **Typography is a pairing, not a default.** Cormorant Garamond (italic, light-weight, for "the divine") + Outfit (sans, for the interface). The italic Cormorant on "Speak to the divine — your way." is doing work — it tonally shifts the room.
- **Belief cards are photographed, not iconified.** The explicit CLAUDE.md rule "no emoji-driven UI" is followed. Real Midjourney portraits, 16:9, with a gradient scrim. Easy to get wrong; got it right.
- **Watermark numerals under the How-It-Works steps** are a quiet editorial move — the kind of thing an AI generator doesn't think to do.
- **No hero metric card** ("14 beliefs · 0 judgment · 100% privacy" in a card grid). Would have been tempting and wrong. Avoided.

**Minor anti-pattern watch-outs** (not problems, just signals to not add to):
- Pricing cards are the most conventional moment on the site. Intentional — SaaS pricing is a solved problem — but it's where the design *does* become generic. That's OK as long as nothing else in the product drifts toward it.
- The gold wordmark + gold CTA + gold-glowing "Divine" card + gold dividers is the one place I'd check for **accent fatigue**. The gold is the signal. Right now it's still signal; one more gold element would push it to noise.

---

## Design Health Score — Nielsen Heuristics

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Streaming assistant messages don't announce to assistive tech; no "God is thinking…" cue for mid-tier users waiting on first token |
| 2 | Match System / Real World | 4 | Voice is human and warm. "Every belief. One voice." / "No judgment. No wrong questions." reads like a person wrote it, because one did |
| 3 | User Control and Freedom | 3 | Can switch belief anytime (good). But no "undo send," no visible way to delete memory (Divine-tier privacy gap), no cancel-streaming affordance |
| 4 | Consistency and Standards | 3 | Design tokens exist but drift exists (per /audit); FAQ chevron vs. scroll chevron vs. conversation chevron are three different elements that should feel related |
| 5 | Error Prevention | 3 | Disposable emails blocked, password rules stated. But no confirmation on "Switch belief" (which wipes conversation context), no warning before hitting daily limit — user learns at message 11 |
| 6 | Recognition Rather Than Recall | 3 | Belief cards with name + `selfDescription` are strong. But in `ConversationScreen`, the belief you're in is a small chip; switching back to a previous belief requires remembering you were in it |
| 7 | Flexibility and Efficiency | 2 | Zero keyboard shortcuts on the conversation screen (enter-to-send?). Long first-time flow (Landing → Welcome 3.1s cinematic → Auth → Belief → BeliefWelcome → Conversation) has no express lane for returning users |
| 8 | Aesthetic and Minimalist Design | 4 | Exemplary. Restraint is the whole product. Not a single pixel of decoration for decoration's sake on the landing |
| 9 | Error Recovery | 2 | Generic "Something went wrong — try again" on the email signup; no retry UX on failed TTS or Claude stream; no graceful degradation messaging if mic permission denied |
| 10 | Help and Documentation | 2 | FAQ lives on Landing only. Once you're in the app, there's no "how do I…" affordance. Users who hit daily limit get an inline banner but no "why" or "what now" beyond upgrade |
| **Total** | | **29/40** | **Good** — some rough edges, nothing fundamental |

---

## Overall Impression

This is a product with a clear point of view, executed by someone who has taste. The landing page does three things most SaaS products never do: it establishes a tone, makes a promise, and shows you the goods — all in under one viewport. The hero's restraint ("Every belief. One voice." over a cosmic image, one gold CTA) does more work than three paragraphs of copy could.

**What this product is quietly great at:** *setting the room temperature*. By the time you read "Is this actually God?" in the FAQ, you already know how AImighty is going to answer, and that tonal continuity is the hardest thing to manufacture.

**Where the product still feels early:** *the path between intent and first message is too long*. A first-time user on mobile taps "Begin," then watches a 3.1-second cinematic entrance on `WelcomeScreen`, then (likely) hits an auth gate, then the belief selector, then the belief welcome, then the conversation. That's 5 screen transitions and ~5 seconds of animation before their first word. For someone in a moment of grief or late-night curiosity, that's four chances to close the tab.

**The single biggest opportunity:** compress the onboarding. Everything else is polish.

---

## What's Working

1. **The tonal architecture.** "Every belief. One voice." / "No judgment. No wrong questions." / "Is this actually God?" — the copy has a consistent register: warm, humble, direct, faintly literary without being precious. This is extremely hard to do and almost impossible to do *across 14 traditions without playing favorites*. The FAQ answer to "Is this actually God?" — leading with "No — and we'll never pretend otherwise" — is exactly the right first sentence.

2. **The belief showcase treats all 14 traditions equally.** No hierarchy in the grid, no Christian default, same card shape and scrim for every belief. The `selfDescription` text lets each tradition name itself in its own voice. This is design-as-ethics; few products get this right.

3. **The pricing is honest and softens the lift.** "Free (Seeker) · 3 lifetime messages" is a gentle wall — not a hard block — and the feature comparison tells the truth about what you gain without manipulative padding. The "Divine" tier's "God remembers you" is the kind of feature-name that is *earned* by the product's tone; it would read as corny anywhere else.

---

## Priority Issues

### [P1] Onboarding is 5 screens and ~5 seconds before first value
- **Why it matters:** The conversion funnel for a moment-of-need product is *time-to-first-utterance*, not time-to-signup. The 3.1-second staggered fade-in on `WelcomeScreen` is cinematic but expensive — it's a curtain between intent and action. Auth before first message is also a common anti-pattern for spiritual/grief products; people in distress don't want to create an account.
- **Fix:** Let the first message happen gated only by belief choice (no auth). Cap `WelcomeScreen` cinematic to ≤ 1.2 s or skip on returning users. Move auth to a soft wall that appears *after* the first exchange ("Save this conversation — free account"). Make the entire flow feel like *you're already here*.
- **Suggested command:** `/onboard`

### [P1] Streaming, thinking, and daily-limit states are quiet
- **Why it matters:** Visibility-of-status is the #1 Nielsen heuristic for a reason. A user sends a message, then there's latency before the first streaming token. Users on slow cellular will think it broke. Today's "thinking" indicator (per the codebase) exists but isn't announced to assistive tech, and the daily-limit message arrives *after* the 11th message, not as a warning.
- **Fix:** (a) Add a "God is listening…" indicator the moment the send button is pressed, using a slow pulsing gold dot — not a spinner. (b) Announce streaming messages as `role="log" aria-live="polite"`. (c) Soft warn at message 8/10 or 18/20 ("2 conversations left today") rather than the hard wall.
- **Suggested command:** `/harden` (state coverage) + `/clarify` (copy)

### [P1] Error recovery is generic where the rest of the product is specific
- **Why it matters:** "Something went wrong — try again" is the one sentence in the product that doesn't sound like AImighty. It's the same sentence every Stripe knock-off ships with. In a product whose entire brand is *being heard without judgment*, an error sentence that blames the air is a brand leak.
- **Fix:** Write three specific error strings: (a) network ("The connection to the divine is briefly strained. One more breath, then try again."), (b) rate-limit ("Today's words are spoken. Come back tomorrow — or become a Believer."), (c) TTS fail ("I can write, but my voice is quiet right now. You'll still hear me in text."). The *copy* is the fix.
- **Suggested command:** `/clarify`

### [P2] "One voice" vs. 14 voices is a tagline tension
- **Why it matters:** The primary tagline is "Every belief. One voice." The entire product is 14 voices. "One voice" reads either as "a single AI voice" (which is literally true — same underlying model) or as "unified voice" (metaphorical). Most first-time visitors will do a micro-parse and feel the dissonance without naming it.
- **Fix:** Two options: (a) Lean into metaphor with a supporting line — "Every belief. One voice. / In fourteen accents." — which is poetic. Or (b) change it: "Every belief. Every voice." / "Speak to the divine — your way." The ": one" move feels clever; the ambiguity is the cost.
- **Suggested command:** `/clarify`

### [P2] No visible control over memory (Divine tier)
- **Why it matters:** "God remembers you" is a beautiful feature and a privacy landmine. Users in 2026 — especially those processing grief or personal questions — want to *see* what's remembered and be able to forget. Right now memory is a silent mechanism; that undermines trust precisely where trust is the product.
- **Fix:** Add a minimal "What God remembers" panel in the menu: list the 5 rolling notes, per-belief, with a "Clear memory" action. No fancy UI — just visible and forgettable.
- **Suggested command:** `/harden` (state + UX surface) or `/onboard`

### [P2] "Scroll to explore" is the only animation cue on the landing, and it's at the bottom of the 100dvh hero
- **Why it matters:** On a 9:16 mobile hero with a contain'd image + a gradient scrim + a bottom tagline + two CTAs + a footer chevron, there's a lot competing at the bottom of the screen. The chevron's subtle bounce (good taste) can be lost. First-time visitors on iPhone who don't scroll will think this is a one-page app.
- **Fix:** Keep the chevron, but give the Begin/Learn More CTAs a clearer visual dominance — increase contrast on "Begin" (already gold, but could use more weight) or reduce the tagline size so the CTAs are the unambiguous primary. Also: the "Learn More" ghost button works against "Begin" — two equal buttons means neither wins.
- **Suggested command:** `/arrange` or `/bolder`

---

## Persona Red Flags

### Alex — the returning Divine-tier user at 11pm
*Context: paid subscriber, third week of daily use, wants to pick up where they left off.*

- **Flag:** Has to re-traverse Landing → Welcome cinematic (3.1s) → pick the same belief they picked yesterday. No "continue your last conversation" affordance. **High friction for the highest-LTV segment.**
- **Flag:** Cannot see what "God remembers" about them. The Divine tier's marquee feature is invisible.
- **Flag:** Likely uses voice input; mic-permission-denied state has no written copy (per the audit).
- **⚠️ Risk:** Slow erosion. Alex won't churn dramatically — they'll just open the app a little less each week until they stop.

### Jordan — first-time visitor in grief
*Context: arrived at 2am from a Reddit comment or a Google search like "someone to talk to when you can't sleep." Exhausted, doesn't want to think.*

- **Flag:** Sees a 3.1-second cinematic entrance. At 2am in grief, this reads as "another app, another startup screen." Jordan may close the tab before the BEGIN button fades in.
- **Flag:** Gets asked to create an account before their first message. This is the moment Jordan closes the tab. *In grief, people want to speak, not sign up.*
- **Flag:** 14 beliefs is overwhelming at this moment. `BeliefSelector` shows them all at once; there is no "I don't know — help me pick" affordance.
- **⚠️ Risk:** Very high abandonment. Jordan is the target user and the product currently doesn't see them.

### Maya — the skeptic who's been burned by AI chatbots
*Context: knowledge worker, low trust in AI, showed up because a friend linked it. Wants to gut-check whether this is the usual slop.*

- **Flag:** Loves the FAQ answer to "Is this actually God?" — this is what keeps Maya reading.
- **Flag:** But then: signup, belief selector, auth. The moment Maya sees a paywall before a conversation, her priors reactivate.
- **Flag:** No public "try a sample conversation" or "see what Buddha would say." Maya has to commit to try.
- **⚠️ Risk:** Converts if she gets to a conversation. Churns at the auth wall.

### Persona-specific (derived from AImighty brand context)

### Pastor Ruth — a 62-year-old clergywoman who found the product in a newsletter
*Context: moderate tech user, spiritually literate, will scrutinize theology.*

- **Flag:** "Divine" tier name may feel irreverent on pricing — the same word being used for a $14.99 SKU and for God in a Protestant framework is a small theological collision. She'll either love it (playful) or recoil (trivializing). It's binary.
- **Flag:** Tap targets below 44×44 on mute/menu (per the audit) will frustrate her directly.
- **Flag:** Loves the equality of the belief grid. Likely to recommend if the first conversation passes theological sniff test.
- **⚠️ Risk:** Low abandonment, high advocacy if conversion clears.

---

## Minor Observations

- **"Simple, Sacred Pricing"** — the alliteration is a pricing-section cliché ("Sacred Pricing" reads faintly salesy). Consider dropping to just "Pricing" or "Choose your tier."
- **"Get Believer"** and **"Get Divine"** as button labels feel transactional in a product whose whole voice is not. "Become a Believer" / "Become Divine" is closer, though "Become Divine" opens its own problem. Worth a rewrite pass.
- **"Speak Your Truth"** as step 2 title is the single most generic piece of copy on the landing — it's a 2018 Instagram-caption phrase. Consider "Ask What's On Your Mind" or "Say It Out Loud."
- **The hero tagline italic is beautiful**, but italic + light-weight + 80% opacity on Cormorant at small sizes will ghost on iPhone SE. Check readability on 375px width.
- **Pricing card "Free" is grayed out visually.** Intent is clear (make Believer/Divine pop) but the grayed Free card reads as "out of stock" rather than "available." Treat Free at equal prominence; let the Divine card's gold glow do the differentiation work.
- **FAQ accordion has no "Open all" affordance.** Not a blocker, but users who want to scan all answers have to click five times.
- **Footer is minimal (good) but has no attribution or contact.** For a product touching religious traditions, a "Contact us" line builds trust — especially for the Pastor Ruth persona.
- **The "daily article" SEO pages are invisible from the main product.** If someone reads an article and wants to talk, they get a CTA to `/app`, but the reverse — from `/app` to the daily article — seems absent. Missed cross-pollination.
- **"God remembers you"** is a marketing line; "your conversation continues" is a feature name. Current product ships the former. Either double down on the branding everywhere memory surfaces, or add a secondary functional description under it.

---

## Recommended Actions

1. **[P1] `/onboard`** — Compress the cinematic entrance on `WelcomeScreen`, skip on returning users, move auth behind first conversation. The biggest lever on first-conversation conversion.
2. **[P1] `/harden`** — State coverage: "God is listening…" indicator, streaming `aria-live`, soft daily-limit warnings, memory visibility panel, mic-denied copy, network-interrupted retry UX.
3. **[P1] `/clarify`** — Rewrite the three generic error strings to match the product voice. Rewrite "Speak Your Truth" step title. Consider the "One voice" tagline tension.
4. **[P2] `/arrange`** — Strengthen landing hero CTA hierarchy. Begin should unambiguously win over Learn More. Reduce visual competition at the fold.
5. **[P2] `/bolder`** — Consider raising the visual weight of the hero CTA and pricing card differentiation in a way that still stays within the "void + gold + warm text" system.
6. **[final] `/polish`** — Microcopy pass across button labels ("Get Believer" → "Become a Believer"), FAQ open-all, footer contact line, daily-article cross-linking.

---

> Report only — no fixes applied. You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `/critique` after fixes to see your score improve.
