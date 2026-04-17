/**
 * Share and save helpers for Capture This Moment.
 *
 * Responsibilities:
 * 1. Build a UTM-tagged share URL so we can measure viral coefficient
 *    per belief (`?utm_source=capture&utm_medium=share&utm_campaign={belief}`).
 * 2. Attempt a native Web Share with the PNG file + share text + URL.
 *    iOS Safari, Chrome Android, and Edge all support `navigator.share`
 *    with files — this produces the richest share sheet (SMS, iMessage,
 *    WhatsApp, Instagram, X, etc.).
 * 3. Fall back gracefully when `canShare({ files })` is false: download
 *    the PNG and copy the tagged URL to the clipboard so the user can
 *    paste it wherever they intended.
 * 4. Expose a separate `saveMomentToDevice` for the "Save" action that
 *    downloads the PNG without invoking the share sheet.
 */

import { track } from './analytics';

const PROD_ORIGIN = 'https://aimightyme.com';

interface ShareMomentParams {
  blob: Blob;
  beliefId: string;
  shareText: string;
}

interface ShareMomentResult {
  shared: boolean;
  method: 'native' | 'fallback' | 'cancelled' | 'error';
}

/**
 * Build the tagged share URL. Uses aimightyme.com even in local dev so
 * the link anyone receives actually works — no one on the receiving end
 * should ever get a localhost URL.
 */
export function buildShareUrl(beliefId: string): string {
  const url = new URL(PROD_ORIGIN + '/');
  url.searchParams.set('utm_source', 'capture');
  url.searchParams.set('utm_medium', 'share');
  url.searchParams.set('utm_campaign', beliefId);
  return url.toString();
}

/**
 * Trigger a PNG download using an anchor + object URL. Works on all
 * browsers including iOS Safari (which opens the image in a new tab
 * on older versions — still useful for long-press Save).
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  // Append so Firefox respects the download attribute, click, then clean up.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on next tick so the click has time to register.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copy text to clipboard with a legacy-friendly fallback. Returns true
 * if anything worked. Used when the native share sheet isn't available
 * so the user at least gets the tagged URL in their clipboard.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy path.
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Primary share entry point — called from the Capture component's Share
 * button. Tries native share with files first, falls back to download
 * + clipboard copy if unsupported.
 */
export async function shareMoment(params: ShareMomentParams): Promise<ShareMomentResult> {
  const { blob, beliefId, shareText } = params;
  const url = buildShareUrl(beliefId);
  const filename = `aimighty-${beliefId}-${Date.now()}.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const canShareFiles = Boolean(
    nav?.canShare && nav.canShare({ files: [file] }) && nav.share
  );

  if (canShareFiles) {
    try {
      await nav!.share({
        files: [file],
        text: shareText,
        url,
        title: 'A moment from AImighty',
      });
      track('moment_shared', { belief: beliefId, method: 'native' });
      return { shared: true, method: 'native' };
    } catch (err) {
      // User tapped the system cancel button. Not an error — don't log.
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort) {
        track('capture_cancelled', { belief: beliefId, stage: 'share_sheet' });
        return { shared: false, method: 'cancelled' };
      }
      console.warn('[shareMoment] native share failed, falling back:', err);
      // Intentional fall-through to the download path below.
    }
  }

  // Fallback: download PNG + copy tagged URL so the user can paste.
  try {
    downloadBlob(blob, filename);
    const copied = await copyToClipboard(url);
    track('moment_shared', {
      belief: beliefId,
      method: 'fallback',
      url_copied: copied,
    });
    return { shared: true, method: 'fallback' };
  } catch (err) {
    console.error('[shareMoment] fallback failed:', err);
    track('moment_shared', { belief: beliefId, method: 'error' });
    return { shared: false, method: 'error' };
  }
}

/**
 * Save-only path — downloads the PNG without invoking the share sheet.
 * Wired to the "Save" action on the capture screen.
 */
export function saveMomentToDevice(blob: Blob, beliefId: string): void {
  const filename = `aimighty-${beliefId}-${Date.now()}.png`;
  downloadBlob(blob, filename);
  track('moment_saved', { belief: beliefId });
}
