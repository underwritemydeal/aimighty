/**
 * Global toast event bus.
 *
 * Exists so that non-React code (src/config/stripe.ts, src/services/*) can
 * surface a friendly in-app notice without reaching for `window.alert()`.
 * The iOS system alert popup is visually jarring, doesn't respect our dark
 * theme, and in one case was leaking a raw "Invalid request body" string
 * from the worker straight into users' faces.
 *
 * Architecture:
 *   - `showToast(message, options?)` is callable from anywhere.
 *   - `subscribeToast(listener)` is used by the <ToastContainer/>
 *     component mounted once at the App root. It receives every
 *     dispatched toast and renders them.
 *   - There is no singleton store; the listener set is the state. If the
 *     container isn't mounted yet (extremely brief window on initial
 *     render), the toast is simply dropped — that matches the
 *     best-effort semantics of a user-facing notice.
 */

export type ToastType = 'info' | 'error' | 'success';

export interface ToastOptions {
  /** Visual variant. Defaults to 'info'. */
  type?: ToastType;
  /** Auto-dismiss delay in ms. Defaults to 5000. Set to 0 for sticky. */
  duration?: number;
}

export interface ToastEvent {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

type Listener = (toast: ToastEvent) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function showToast(message: string, options: ToastOptions = {}): void {
  const toast: ToastEvent = {
    id: nextId++,
    message,
    type: options.type ?? 'info',
    duration: options.duration ?? 5000,
  };
  listeners.forEach((fn) => {
    try {
      fn(toast);
    } catch {
      // Listener threw — don't let one bad listener break the fan-out.
    }
  });
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
