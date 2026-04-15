/**
 * Tier + Daily Limit + Streak + Memory helpers.
 * All state lives in localStorage.
 */
import type { Tier } from '../types';
import { isLoggedIn, hasReachedFreeLimit, getCurrentUser } from './auth';

const TIER_KEY = 'aimighty_tier';
const DAILY_KEY = 'aimighty_daily';
const STREAK_KEY = 'aimighty_streak';
const MEMORY_PREFIX = 'aimighty_memory_';

export const DAILY_LIMITS: Record<Tier, number> = {
  free: 3,
  believer: 10,
  divine: 20,
};

/** Promote local "I am Divine" flag — MVP. Real payment wiring replaces this. */
export function setDivine(isDivine: boolean): void {
  if (isDivine) localStorage.setItem(TIER_KEY, 'divine');
  else localStorage.removeItem(TIER_KEY);
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
  const override = localStorage.getItem(TIER_KEY);
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
    const raw = localStorage.getItem(DAILY_KEY);
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
  localStorage.setItem(DAILY_KEY, JSON.stringify(rec));
}

// ───── Streak ─────

export interface StreakRecord {
  currentStreak: number;
  lastConversationDate: string | null;
  longestStreak: number;
}

export function getStreak(): StreakRecord {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
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
  localStorage.setItem(STREAK_KEY, JSON.stringify(rec));
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
}

export function getMemories(beliefId: string): MemoryNote[] {
  try {
    const raw = localStorage.getItem(MEMORY_PREFIX + beliefId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMemory(beliefId: string, note: MemoryNote): void {
  const list = getMemories(beliefId);
  // If most recent entry is same day, overwrite (checkpoint)
  if (list.length > 0 && list[list.length - 1].date === note.date) {
    list[list.length - 1] = note;
  } else {
    list.push(note);
  }
  // Keep last 5
  while (list.length > 5) list.shift();
  localStorage.setItem(MEMORY_PREFIX + beliefId, JSON.stringify(list));
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
