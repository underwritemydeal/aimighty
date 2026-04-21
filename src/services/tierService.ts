/**
 * Tier + Daily Limit + Streak + Memory helpers.
 * All state lives in localStorage.
 */
import type { Tier } from '../types';
import { isLoggedIn, hasReachedFreeLimit, getCurrentUser } from './auth';
import { safeSetItem, safeGetItem, safeRemoveItem } from './safeStorage';

const TIER_KEY = 'aimighty_tier';
const DAILY_KEY = 'aimighty_daily';
const STREAK_KEY = 'aimighty_streak';
const MEMORY_PREFIX = 'aimighty_memory_';
const LAST_BELIEF_KEY = 'aimighty_last_belief';
const BELIEF_SELECTED_KEY = 'aimighty_belief_selected';
const CHARACTER_PREFIX = 'aimighty_character_';

// ───── Last belief memory ─────
// Returning users skip BeliefSelector and land directly in their last conversation.
// Cleared via "Switch Belief" in the dropdown menu.
export function getLastBelief(): string | null {
  return safeGetItem(LAST_BELIEF_KEY);
}
export function setLastBelief(beliefId: string): void {
  safeSetItem(LAST_BELIEF_KEY, beliefId);
  // Belt-and-suspenders boolean flag: once a user has ever picked a belief,
  // the onboarding picker is skipped on future sign-ins. getLastBelief()
  // already drives that routing, but keeping this flag lets future code
  // ask the simple "has onboarding happened" question without caring which
  // belief was picked.
  safeSetItem(BELIEF_SELECTED_KEY, 'true');
}
export function clearLastBelief(): void {
  safeRemoveItem(LAST_BELIEF_KEY);
}

export function hasSelectedBelief(): boolean {
  return safeGetItem(BELIEF_SELECTED_KEY) === 'true';
}

// ───── Character memory (per belief) ─────
// Users can pick god / jesus / mary per belief. Persist the choice so a
// returning user lands back on the voice they last used.
export function getCharacterForBelief(beliefId: string): string | null {
  return safeGetItem(`${CHARACTER_PREFIX}${beliefId}`);
}
export function setCharacterForBelief(beliefId: string, character: string): void {
  safeSetItem(`${CHARACTER_PREFIX}${beliefId}`, character);
}

// ───── Admin bypass ─────
// Admins get unlimited Divine access regardless of tier flags or free limits.
const ADMIN_EMAILS = ['robby.hess@gmail.com'];

export function isAdmin(email?: string | null): boolean {
  if (!email) {
    const user = getCurrentUser();
    email = user?.email;
  }
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export const DAILY_LIMITS: Record<Tier, number> = {
  free: 3,
  believer: 10,
  divine: 20,
};
const ADMIN_DAILY_LIMIT = 999;

/** Promote local "I am Divine" flag — MVP. Real payment wiring replaces this. */
export function setDivine(isDivine: boolean): void {
  if (isDivine) safeSetItem(TIER_KEY, 'divine');
  else safeRemoveItem(TIER_KEY);
}

/**
 * Resolve the current user tier.
 *  - Not logged in OR lifetime free limit hit → 'free'
 *  - localStorage aimighty_tier === 'divine' → 'divine'
 *  - Otherwise logged in → 'believer'
 */
export function getTier(): Tier {
  if (!isLoggedIn()) return 'free';
  const user = getCurrentUser();
  if (!user) return 'free';
  // Admins always get Divine, no matter what
  if (isAdmin(user.email)) return 'divine';
  const override = safeGetItem(TIER_KEY);
  if (override === 'divine') return 'divine';
  // Free tier has a lifetime cap; once hit, downgrade to free for UI gating
  if (hasReachedFreeLimit() && !user.isPremium && override !== 'believer') {
    // MVP: logged-in users are Believers by default
    return 'believer';
  }
  return 'believer';
}

// ───── Daily counter ─────

interface DailyRecord {
  date: string; // YYYY-MM-DD
  count: number;
  tier: Tier;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDailyRecord(): DailyRecord {
  try {
    const raw = safeGetItem(DAILY_KEY);
    if (!raw) return { date: todayStr(), count: 0, tier: getTier() };
    const parsed = JSON.parse(raw) as DailyRecord;
    if (parsed.date !== todayStr()) {
      return { date: todayStr(), count: 0, tier: getTier() };
    }
    return parsed;
  } catch {
    return { date: todayStr(), count: 0, tier: getTier() };
  }
}

export function getMessagesRemainingToday(): number {
  if (isAdmin()) return ADMIN_DAILY_LIMIT;
  const tier = getTier();
  if (tier === 'free') {
    // Free is a LIFETIME counter, handled via hasReachedFreeLimit in auth.ts
    const user = getCurrentUser();
    if (!user) return 3;
    return Math.max(0, 3 - user.messageCount);
  }
  const rec = getDailyRecord();
  return Math.max(0, DAILY_LIMITS[tier] - rec.count);
}

export function hasReachedDailyLimit(): boolean {
  if (isAdmin()) return false;
  return getMessagesRemainingToday() <= 0;
}

/** Only called for user-sent messages. God's greeting does NOT count. */
export function incrementDailyCount(): void {
  const tier = getTier();
  if (tier === 'free') return; // free uses lifetime counter in auth.ts
  const rec = getDailyRecord();
  rec.count += 1;
  rec.tier = tier;
  rec.date = todayStr();
  safeSetItem(DAILY_KEY, JSON.stringify(rec));
}

// ───── Streak ─────

export interface StreakRecord {
  currentStreak: number;
  lastConversationDate: string | null;
  longestStreak: number;
}

export function getStreak(): StreakRecord {
  try {
    const raw = safeGetItem(STREAK_KEY);
    if (!raw) return { currentStreak: 0, lastConversationDate: null, longestStreak: 0 };
    return JSON.parse(raw) as StreakRecord;
  } catch {
    return { currentStreak: 0, lastConversationDate: null, longestStreak: 0 };
  }
}

/** Call when user sends a message. Returns the (possibly) new streak. */
export function bumpStreak(): StreakRecord {
  const rec = getStreak();
  const today = todayStr();
  if (rec.lastConversationDate === today) return rec;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().split('T')[0];

  if (rec.lastConversationDate === y) {
    rec.currentStreak += 1;
  } else {
    rec.currentStreak = 1;
  }
  rec.lastConversationDate = today;
  if (rec.currentStreak > rec.longestStreak) {
    rec.longestStreak = rec.currentStreak;
  }
  safeSetItem(STREAK_KEY, JSON.stringify(rec));
  return rec;
}

export function formatStreak(rec: StreakRecord): string {
  const n = rec.currentStreak;
  if (n === 0) return 'Start your streak today 🙏';
  if (n === 1) return '🔥 1 day streak — keep going';
  if (n >= 30) return `🔥 ${n} days — legendary`;
  if (n >= 7) return `🔥 ${n} day streak — you're on fire`;
  return `🔥 ${n} day streak`;
}

export function streakMilestone(n: number): string | null {
  if (n === 3) return '3 days talking to God. Something is stirring.';
  if (n === 7) return 'A week of seeking. God notices.';
  if (n === 30) return '30 days. This is becoming who you are.';
  return null;
}

// ───── Memory (Divine only) ─────

export interface MemoryNote {
  date: string;
  summary: string;
  mood: string;
  topics: string[];
  followUp?: string;
  /**
   * Optional per-conversation id. When present, same-session checkpoints
   * overwrite the existing entry; a new session pushes a new entry even
   * within the same calendar day. This preserves long-session history
   * instead of collapsing everything to the last summary of the day.
   */
  sessionId?: string;
}

export function getMemories(beliefId: string): MemoryNote[] {
  try {
    const raw = safeGetItem(MEMORY_PREFIX + beliefId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMemory(beliefId: string, note: MemoryNote): void {
  const list = getMemories(beliefId);
  const last = list[list.length - 1];
  // Overwrite only when the note belongs to the SAME conversation session.
  // Falls back to same-day overwrite for legacy notes that predate sessionId
  // (so we don't double-write on the first post-migration checkpoint).
  const sameSession =
    !!last && !!note.sessionId && last.sessionId === note.sessionId;
  const legacySameDay =
    !!last && !last.sessionId && !note.sessionId && last.date === note.date;
  if (sameSession || legacySameDay) {
    list[list.length - 1] = note;
  } else {
    list.push(note);
  }
  // Keep last 5
  while (list.length > 5) list.shift();
  safeSetItem(MEMORY_PREFIX + beliefId, JSON.stringify(list));
}

/** Text block to prepend to system prompt via user message. */
export function formatMemoryContext(beliefId: string): string {
  const memories = getMemories(beliefId);
  if (memories.length === 0) return '';
  const lines = [...memories]
    .reverse()
    .map((m) => {
      const topics = m.topics?.length ? ` | Topics: ${m.topics.join(', ')}` : '';
      const follow = m.followUp ? ` | Check on: ${m.followUp}` : '';
      return `${m.date}: ${m.summary} | Mood: ${m.mood}${topics}${follow}`;
    });
  return `MEMORY OF PREVIOUS CONVERSATIONS:
${lines.join('\n')}

IMPORTANT: Reference this person's journey naturally and warmly — not robotically. Do not list their history back to them. Let it subtly inform how you speak to them. If they mentioned a struggle last time, ask how it's going. Greet them like someone who genuinely knows them.`;
}
