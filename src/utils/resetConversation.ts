/**
 * Conversation reset on belief switch.
 *
 * Per the belief-first spec, tapping "Other Beliefs" → confirmation →
 * picking a new tradition deletes the prior belief's conversation so the
 * new one starts on a blank page. The in-memory `displayMessages` array
 * lives in `ConversationScreen` and is cleared via the `key={beliefId}`
 * remount already in `App.tsx` — so all we need to do here is the
 * persistence-layer cleanup.
 *
 * Two places store per-belief state that should be cleared on switch:
 *
 *   1. `aimighty_memory_<beliefId>` — Divine-tier rolling memory notes.
 *      Summaries of past sessions. If we leave these, the NEW conversation
 *      for the OLD belief (if the user ever switches back) will still
 *      hallucinate familiarity with a relationship the user has asked us
 *      to retire.
 *
 *   2. `aimighty_character_<beliefId>` — which voice character the user
 *      picked last time (god/jesus/mary). Low-stakes, but if we're wiping
 *      the relationship we should wipe the character preference too —
 *      returning to the belief later should feel like a first time.
 *
 * Server-side: no per-belief conversation transcripts are stored on the
 * worker (worker/index.ts only persists tier records + articles + topics).
 * So local cleanup is sufficient today. If server-side transcripts get
 * added later, extend this utility — do not spread the cleanup around.
 */
import { safeRemoveItem } from '../services/safeStorage';

const MEMORY_PREFIX = 'aimighty_memory_';
const CHARACTER_PREFIX = 'aimighty_character_';

/**
 * Wipe all persisted state for `beliefId`. Idempotent — safe to call if
 * nothing was stored. Does NOT clear last-belief memory (the App layer
 * overwrites that when the user picks a new belief).
 */
export function clearBeliefConversation(beliefId: string): void {
  if (!beliefId) return;
  safeRemoveItem(MEMORY_PREFIX + beliefId);
  safeRemoveItem(CHARACTER_PREFIX + beliefId);
}
