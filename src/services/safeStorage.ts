/**
 * Safe localStorage wrappers.
 *
 * localStorage.setItem throws in iOS Safari Private Browsing mode and when
 * the origin's quota is exceeded. Unguarded writes can blow up mid-flow
 * (signup, memory save, daily-counter update), which leaves the user in a
 * broken state. These wrappers swallow the exception and return a boolean
 * so callers can optionally warn.
 *
 * Closes P0-4 from audits/03-harden.md.
 */

// Dev-mode warn-once tracker so we don't spam the console on every save.
let hasWarnedWriteFailure = false;

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!hasWarnedWriteFailure) {
      hasWarnedWriteFailure = true;
      console.warn('[safeStorage] localStorage write blocked (private mode or quota):', err);
    }
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns true if localStorage is available and writable. Caller can use
 * this to render a one-time "private browsing limits what can be saved" toast.
 */
export function isStorageWritable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const probe = '__aimighty_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
