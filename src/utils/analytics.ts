/**
 * Thin analytics layer.
 *
 * Always logs to console so we can verify events fire during dev/QA.
 * Forwards to whichever analytics provider is loaded on window at runtime
 * — gtag (Google Analytics 4), plausible, or posthog — without hard-wiring
 * a dependency. If none is loaded (local dev, first-visitor), the console
 * log is still authoritative.
 *
 * Keep this layer thin. Additional event metadata goes in `props`, not new
 * top-level functions — so the Capture-This-Moment funnel stays a single
 * event stream rather than six scattered call sites.
 */

type EventProps = Record<string, string | number | boolean | null | undefined>;

interface WindowWithAnalytics extends Window {
  gtag?: (command: 'event', name: string, params?: EventProps) => void;
  plausible?: (name: string, opts?: { props?: EventProps }) => void;
  posthog?: { capture: (name: string, props?: EventProps) => void };
}

export function track(eventName: string, props: EventProps = {}): void {
  // Always log — our primary "analytics provider" is our own eyeballs during
  // the first week after launch. If an event isn't in the console, it isn't
  // firing.
  console.log(`[analytics] ${eventName}`, props);

  if (typeof window === 'undefined') return;
  const w = window as WindowWithAnalytics;

  try {
    w.gtag?.('event', eventName, props);
    w.plausible?.(eventName, { props });
    w.posthog?.capture(eventName, props);
  } catch (e) {
    // Never let an analytics bug crash the app.
    console.warn('[analytics] forward failed:', e);
  }
}
