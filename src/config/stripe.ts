/**
 * Stripe price IDs — fill these in from the Stripe Dashboard once products exist.
 * Until these are populated, the PaywallScreen CTAs stay in "Coming Soon" state.
 *
 * To create the 4 products in Stripe dashboard (or via Stripe CLI):
 *   Believer Monthly  — $4.99/month  → PRICE_IDS.believerMonthly
 *   Divine Monthly    — $14.99/month → PRICE_IDS.divineMonthly
 *   Believer Annual   — $47.00/year  → PRICE_IDS.believerAnnual
 *   Divine Annual     — $119.00/year → PRICE_IDS.divineAnnual
 */
export const STRIPE_PRICE_IDS: {
  believerMonthly: string;
  believerAnnual: string;
  divineMonthly: string;
  divineAnnual: string;
} = {
  believerMonthly: '',
  believerAnnual: '',
  divineMonthly: '',
  divineAnnual: '',
};

export function isStripeConfigured(): boolean {
  return Object.values(STRIPE_PRICE_IDS).some((v) => v.length > 0);
}

const WORKER_URL = 'https://aimighty-api.robby-hess.workers.dev';

import { fetchWithTimeout } from '../services/fetchWithTimeout';
import { showToast } from '../services/toast';

export async function startCheckout(priceId: string, userId: string, email: string): Promise<void> {
  if (!priceId) {
    showToast('Payment options are coming soon. Sign up for the newsletter in the meantime.', { type: 'info' });
    return;
  }
  try {
    // 10s budget — this redirects to Stripe, just getting the session URL.
    const resp = await fetchWithTimeout(`${WORKER_URL}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, userId, email }),
    }, 10000);
    if (!resp.ok) {
      showToast('We could not start checkout. Please try again in a moment.', { type: 'error' });
      return;
    }
    const data = await resp.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      showToast('We could not start checkout. Please try again in a moment.', { type: 'error' });
    }
  } catch (e) {
    console.error('[Stripe] checkout failed:', e);
    showToast('The connection is briefly strained. One more breath, then try again.', { type: 'error' });
  }
}

export async function fetchUserTier(userId: string): Promise<'free' | 'believer' | 'divine'> {
  if (!userId) return 'free';
  try {
    // 5s budget — fast worker lookup. Longer delays mean network is unhealthy.
    const r = await fetchWithTimeout(`${WORKER_URL}/user-tier?userId=${encodeURIComponent(userId)}`, {}, 5000);
    if (!r.ok) return 'free';
    const data = await r.json();
    return (data.tier as 'free' | 'believer' | 'divine') || 'free';
  } catch {
    return 'free';
  }
}

/**
 * Poll the worker's `/user-tier` after a Stripe checkout success redirect
 * (`?upgraded=true`). Stripe's webhook can take 2-10s to arrive at our worker
 * and write the paid tier to KV; without this poll, the user enters their
 * first conversation still marked `'free'` and gets no TTS. Exponential
 * backoff starting at 500ms, capped at 15s total budget. Resolves as soon
 * as a non-free tier appears, or returns `'free'` if the budget expires.
 */
export async function pollUserTierUntilPaid(
  userId: string,
  totalBudgetMs: number = 15000,
): Promise<'free' | 'believer' | 'divine'> {
  if (!userId) return 'free';
  const started = Date.now();
  let delay = 500;
  while (Date.now() - started < totalBudgetMs) {
    const tier = await fetchUserTier(userId);
    if (tier === 'believer' || tier === 'divine') return tier;
    const remaining = totalBudgetMs - (Date.now() - started);
    if (remaining <= 0) break;
    await new Promise((r) => setTimeout(r, Math.min(delay, remaining)));
    delay = Math.min(delay * 1.7, 3000);
  }
  return 'free';
}

/**
 * Opens the Stripe Billing Portal for the user in the current tab so they can
 * self-serve cancellation, update their payment method, or download invoices.
 * Required for compliance with California SB-313 and FTC Click-to-Cancel.
 */
export async function openBillingPortal(userId: string): Promise<void> {
  if (!userId) {
    showToast('Please sign in to manage your subscription.', { type: 'error' });
    return;
  }
  try {
    // 10s budget — getting the portal session URL from the worker.
    const resp = await fetchWithTimeout(`${WORKER_URL}/create-portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }, 10000);
    if (!resp.ok) {
      if (resp.status === 404) {
        showToast(
          'We could not find an active subscription on file. If you believe this is an error, email support@aimightyme.com.',
          { type: 'error', duration: 8000 },
        );
        return;
      }
      const data = await resp.json().catch(() => ({} as { error?: string }));
      showToast(
        data.error || 'Something went sideways on our end. Please try again.',
        { type: 'error' },
      );
      return;
    }
    const data = await resp.json();
    if (data.portalUrl) {
      window.location.href = data.portalUrl;
    } else {
      showToast('Something went sideways on our end. Please try again.', { type: 'error' });
    }
  } catch (e) {
    console.error('[Stripe] portal failed:', e);
    showToast('The connection is briefly strained. One more breath, then try again.', { type: 'error' });
  }
}
