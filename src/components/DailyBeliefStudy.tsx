/**
 * Daily Belief Study — Divine tier.
 *
 * A 3-question conversational study: user reads a prompt, writes or
 * speaks an answer, Claude (as the divine voice of the user's chosen
 * belief) replies with a short 1-2 sentence response. Three questions,
 * one per "screen". On completion, the full session auto-saves to the
 * Personal Library (localStorage `aimighty_library`) and the user can
 * Save / Share / Done.
 *
 * Design constraints:
 *  - Each screen preserves the divine background image (no flat black).
 *  - Live Claude responses are hard-capped at ~40 words by the Worker's
 *    max_tokens=120 + system-prompt ceiling. Do not retry this cap here.
 *  - Three questions are evergreen and belief-agnostic so the same
 *    component works across all 14 traditions.
 *  - The component streams the response token-by-token via sendMessage
 *    so the user sees the divine voice arriving, not a spinner.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { sendMessage, type Message } from '../services/claudeApi';
import { startListening, stopListening, isSupported as isSpeechSupported, requestMicrophonePermission } from '../services/speechInput';
import { showToast } from '../services/toast';
import { normalizeBeliefId } from '../config/beliefSystems';
import { colors } from '../styles/designSystem';
import type { BeliefSystem, User } from '../types';
import type { LanguageCode } from '../data/translations';

interface DailyBeliefStudyProps {
  belief: BeliefSystem;
  user: User;
  imagePath: string;
  language: LanguageCode;
  onClose: () => void;
}

const QUESTIONS = [
  "What are you holding today that you're ready to release?",
  'What wisdom have you been avoiding hearing?',
  'What single action would honor both yourself and what you believe?',
];

const MIC_GRANTED_KEY = 'aimighty_mic_granted';
const LIBRARY_KEY = 'aimighty_library';

interface LibraryEntry {
  id: string;
  type: 'daily-belief-study';
  belief: string;
  beliefName: string;
  dateISO: string;
  exchanges: Array<{ question: string; answer: string; reply: string }>;
}

function saveToLibrary(entry: LibraryEntry) {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    const list: LibraryEntry[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    // Keep the library bounded — last 100 entries is plenty.
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(list.slice(-100)));
  } catch {
    /* quota / private browsing — silently drop */
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={listening ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function DailyBeliefStudy({ belief, user, imagePath, language, onClose }: DailyBeliefStudyProps) {
  const accentColor = (belief as { accentColor?: string }).accentColor || belief.themeColor || colors.gold;
  const [step, setStep] = useState(0); // 0..2 = questions, 3 = complete
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [replies, setReplies] = useState<string[]>(['', '', '']);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListeningState] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingIdxRef = useRef<number>(-1);

  const isReviewing = step >= QUESTIONS.length; // show completion screen

  // Build the user-prompt we send to Claude. Wrapping the answer in a
  // short instructional frame so Claude knows to respond as the divine
  // voice to THIS specific reflection, not as an open chat.
  const buildPrompt = useCallback((questionIdx: number, answer: string): Message[] => {
    const prompt =
      `I'm in a short Daily Belief Study in the ${belief.name} tradition.\n\n` +
      `Question: ${QUESTIONS[questionIdx]}\n\n` +
      `My answer: ${answer}\n\n` +
      `Please respond as the divine voice of this tradition with one or two short sentences — a blessing, a gentle challenge, or a reflection that meets me where I am.`;
    return [{ role: 'user', content: prompt }];
  }, [belief.name]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || sending) return;
    const questionIdx = step;
    const answer = input.trim();
    setAnswers((prev) => { const next = [...prev]; next[questionIdx] = answer; return next; });
    setInput('');
    setSending(true);
    streamingIdxRef.current = questionIdx;

    let accumulated = '';
    try {
      await sendMessage(
        buildPrompt(questionIdx, answer),
        normalizeBeliefId(belief.id),
        user.id,
        {
          onToken: (token) => {
            accumulated += token;
            setReplies((prev) => {
              const next = [...prev];
              next[questionIdx] = accumulated;
              return next;
            });
          },
          onSentence: () => {},
          onComplete: (text) => {
            setReplies((prev) => { const next = [...prev]; next[questionIdx] = text; return next; });
          },
          onError: (err) => {
            console.error('[DBS] Claude error:', err);
            setReplies((prev) => { const next = [...prev]; next[questionIdx] = 'I am still here with you. Try again in a moment.'; return next; });
          },
        },
        language,
      );
    } finally {
      setSending(false);
      streamingIdxRef.current = -1;
    }
  }, [input, sending, step, belief.id, user.id, language, buildPrompt]);

  const handleNext = useCallback(() => {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // Advance to completion screen and persist the session.
      setStep(QUESTIONS.length);
      saveToLibrary({
        id: `dbs_${Date.now().toString(36)}`,
        type: 'daily-belief-study',
        belief: belief.id,
        beliefName: belief.name,
        dateISO: new Date().toISOString(),
        exchanges: QUESTIONS.map((q, i) => ({ question: q, answer: answers[i], reply: replies[i] })),
      });
    }
  }, [step, belief.id, belief.name, answers, replies]);

  const handleSave = useCallback(() => {
    // Library already persisted on completion. Surface a confirmation
    // toast so the tap isn't silent.
    showToast('Saved to your library.', { type: 'success' });
  }, []);

  const handleShare = useCallback(async () => {
    const text = QUESTIONS.map((q, i) => `Q: ${q}\nA: ${answers[i]}\n${belief.name}: ${replies[i]}`).join('\n\n') +
      `\n\n— Daily Belief Study · AImighty · aimightyme.com`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Daily Belief Study — ${belief.name}`, text });
      } else {
        await navigator.clipboard?.writeText(text);
        showToast('Copied to clipboard.', { type: 'success' });
      }
    } catch {
      /* user cancelled or clipboard blocked */
    }
  }, [answers, replies, belief.name]);

  // Mic — reuses the same permission flag the main conversation uses.
  const handleMic = useCallback(async () => {
    if (listening) {
      stopListening();
      setListeningState(false);
      return;
    }
    if (!isSpeechSupported()) {
      showToast('Voice input isn’t supported in this browser. You can still type.', { type: 'error' });
      return;
    }
    const alreadyGranted = (() => {
      try { return localStorage.getItem(MIC_GRANTED_KEY) === '1'; } catch { return false; }
    })();
    if (!alreadyGranted) {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        showToast('Voice input needs microphone access. You can still type.', { type: 'error' });
        return;
      }
      try { localStorage.setItem(MIC_GRANTED_KEY, '1'); } catch { /* ignore */ }
    }
    startListening({
      language,
      onStart: () => setListeningState(true),
      onResult: (transcript) => setInput(transcript),
      onEnd: () => setListeningState(false),
      onError: (msg) => { setListeningState(false); if (msg) showToast(msg, { type: 'error' }); },
    });
  }, [listening, language]);

  useEffect(() => {
    return () => { stopListening(); };
  }, []);

  const currentQuestion = !isReviewing ? QUESTIONS[step] : null;
  const currentReply = !isReviewing ? replies[step] : '';
  const hasReply = currentReply.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Belief Study"
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: `linear-gradient(rgba(3,3,8,0.78), rgba(3,3,8,0.92)), url(${imagePath})`,
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        height: '100dvh',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 20px 12px 20px' }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5"
          style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}
        >
          <BackIcon /> Back
        </button>
        <div style={{ fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: accentColor, fontFamily: 'var(--font-body, Outfit)' }}>
          Daily Belief Study · {belief.name}
        </div>
        <div style={{ width: '44px' }} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 24px' }}>
        <div className="mx-auto flex flex-col" style={{ maxWidth: '640px', minHeight: '100%', paddingTop: '24px', paddingBottom: '24px' }}>
          {!isReviewing && (
            <>
              <div
                style={{
                  fontSize: '0.75rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                  textAlign: 'center',
                  marginBottom: '24px',
                  fontFamily: 'var(--font-body, Outfit)',
                }}
              >
                Question {step + 1} of {QUESTIONS.length}
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.5rem, 4.5vw, 2rem)',
                  fontWeight: 300,
                  lineHeight: 1.4,
                  color: 'rgba(255, 248, 240, 0.95)',
                  textAlign: 'center',
                  marginBottom: '32px',
                }}
              >
                {currentQuestion}
              </h2>

              {!hasReply && (
                <div className="relative" style={{ marginBottom: '20px' }}>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={listening ? 'Listening…' : 'Your answer…'}
                    disabled={sending}
                    rows={4}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '16px 48px 16px 16px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '16px',
                      color: 'rgba(255, 255, 255, 0.92)',
                      fontFamily: 'var(--font-body, Outfit)',
                      fontSize: '16px',
                      lineHeight: 1.5,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleMic}
                    aria-label={listening ? 'Stop listening' : 'Start voice input'}
                    className="absolute"
                    style={{
                      top: '12px',
                      right: '12px',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '999px',
                      background: listening ? accentColor : 'transparent',
                      color: listening ? '#0a0a0f' : 'rgba(255,255,255,0.65)',
                      border: `1px solid ${listening ? accentColor : 'rgba(255,255,255,0.15)'}`,
                    }}
                  >
                    <MicIcon listening={listening} />
                  </button>
                </div>
              )}

              {!hasReply && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim() || sending}
                  className="w-full"
                  style={{
                    height: '52px',
                    borderRadius: '12px',
                    background: colors.gold,
                    color: '#0a0a0f',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1rem',
                    fontWeight: 500,
                    opacity: !input.trim() || sending ? 0.5 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {sending ? 'Listening to your words…' : 'Submit'}
                </button>
              )}

              {hasReply && (
                <>
                  <div
                    style={{
                      fontFamily: 'var(--font-body, Outfit)',
                      fontSize: '0.85rem',
                      color: 'rgba(255,255,255,0.55)',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    You said: “{answers[step]}”
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.2rem, 3.6vw, 1.6rem)',
                      fontWeight: 300,
                      lineHeight: 1.6,
                      color: 'rgba(255, 248, 240, 0.95)',
                      textAlign: 'center',
                      marginBottom: '40px',
                      textShadow: `0 0 20px ${accentColor}20`,
                    }}
                  >
                    {currentReply}
                  </p>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full"
                    style={{
                      height: '52px',
                      borderRadius: '12px',
                      background: 'transparent',
                      color: accentColor,
                      border: `1px solid ${accentColor}`,
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                      fontWeight: 500,
                    }}
                  >
                    {step < QUESTIONS.length - 1 ? 'Next question →' : 'Finish study'}
                  </button>
                </>
              )}
            </>
          )}

          {isReviewing && (
            <>
              <div
                style={{
                  fontSize: '0.75rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: accentColor,
                  textAlign: 'center',
                  marginBottom: '12px',
                  fontFamily: 'var(--font-body, Outfit)',
                }}
              >
                Study complete · {formatDate(new Date())}
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
                  fontWeight: 300,
                  lineHeight: 1.4,
                  color: 'rgba(255, 248, 240, 0.95)',
                  textAlign: 'center',
                  marginBottom: '32px',
                }}
              >
                Carry this with you today.
              </h2>
              <div style={{ marginBottom: '32px' }}>
                {QUESTIONS.map((q, i) => (
                  <div key={i} style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', fontFamily: 'var(--font-body, Outfit)' }}>
                      Question {i + 1}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'rgba(255,248,240,0.85)', lineHeight: 1.5, marginBottom: '8px' }}>
                      {q}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body, Outfit)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: '8px' }}>
                      “{answers[i]}”
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: accentColor, lineHeight: 1.6 }}>
                      {replies[i]}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleSave}
                  style={{
                    padding: '12px 22px',
                    borderRadius: '999px',
                    background: 'transparent',
                    color: accentColor,
                    border: `1px solid ${accentColor}`,
                    fontFamily: 'var(--font-body, Outfit)',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  style={{
                    padding: '12px 22px',
                    borderRadius: '999px',
                    background: colors.gold,
                    color: '#0a0a0f',
                    border: '1px solid transparent',
                    fontFamily: 'var(--font-body, Outfit)',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '12px 22px',
                    borderRadius: '999px',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.65)',
                    border: '1px solid transparent',
                    fontFamily: 'var(--font-body, Outfit)',
                    fontSize: '0.9rem',
                    fontWeight: 400,
                  }}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
