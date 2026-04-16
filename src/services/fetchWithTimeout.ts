/**
 * Streaming-safe fetch with AbortController timeout.
 *
 * The timeout applies to time-to-headers (i.e. the fetch() Promise resolving),
 * not to total body-read duration. This means:
 *
 *  - For non-streaming requests, if the server is silent past timeoutMs, abort.
 *  - For streaming requests (Claude SSE, TTS audio), if headers arrive inside
 *    the window, the timer is cleared and the body can stream for as long as
 *    needed. If the server stalls before returning headers, abort.
 *
 * Closes P0-3 from audits/03-harden.md.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException(`Request timeout after ${timeoutMs}ms`, 'TimeoutError'));
  }, timeoutMs);

  // Compose with a caller-provided signal if present. AbortSignal.any is
  // available everywhere the app targets (iOS Safari 17.4+, Chrome 116+).
  const signal = options.signal
    ? (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal
        ? AbortSignal.any([options.signal, controller.signal])
        : controller.signal)
    : controller.signal;

  try {
    // Clear the timer as soon as headers arrive. The body can then stream
    // indefinitely — appropriate for SSE and audio responses.
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
