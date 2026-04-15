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

export async function startCheckout(priceId: string, userId: string, email: string): Promise<void> {
  if (!priceId) {
    alert('Payment coming soon.');
    return;
  }
  try {
    const resp = await fetch(`${WORKER_URL}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, userId, email }),
    });
    if (!resp.ok) {
      alert('Unable to start checkout. Please try again later.');
      return;
    }
    const data = await resp.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      alert('Unable to start checkout.');
    }
  } catch (e) {
    console.error('[Stripe] checkout failed:', e);
    alert('Unable to start checkout.');
  }
}

export async function fetchUserTier(userId: string): Promise<'free' | 'believer' | 'divine'> {
  if (!userId) return 'free';
  try {
    const r = await fetch(`${WORKER_URL}/user-tier?userId=${encodeURIComponent(userId)}`);
    if (!r.ok) return 'free';
    const data = await r.json();
    return (data.tier as 'free' | 'believer' | 'divine') || 'free';
  } catch {
    return 'free';
  }
}
