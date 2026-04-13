/**
 * Claude API Service
 * Handles streaming communication with the Cloudflare Worker
 */

// Worker URL - reads from environment variable, falls back to deployed worker
// The worker was deployed via `wrangler deploy` - check your Cloudflare dashboard for the exact URL
const ENV_WORKER_URL = import.meta.env.VITE_WORKER_URL;

// IMPORTANT: Replace this with your actual deployed worker URL from Cloudflare
// Format: https://aimighty-api.{your-subdomain}.workers.dev
const FALLBACK_WORKER_URL = 'https://aimighty-api.robby-hess.workers.dev';

const WORKER_URL = ENV_WORKER_URL || FALLBACK_WORKER_URL;

// Debug logging in development
if (import.meta.env.DEV) {
  console.log('[AImighty] Worker URL:', WORKER_URL);
  console.log('[AImighty] ENV value:', ENV_WORKER_URL || '(not set, using fallback)');
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onSentence: (sentence: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * Send a message to Claude and stream the response
 */
export async function sendMessage(
  messages: Message[],
  beliefSystem: string,
  userId: string,
  callbacks: StreamCallbacks
): Promise<void> {
  // Log the request in development
  if (import.meta.env.DEV) {
    console.log('[ClaudeAPI] Sending message to:', WORKER_URL);
    console.log('[ClaudeAPI] Belief system:', beliefSystem);
    console.log('[ClaudeAPI] Messages count:', messages.length);
  }

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        messages,
        beliefSystem,
        userId,
      }),
    });

    if (import.meta.env.DEV) {
      console.log('[ClaudeAPI] Response status:', response.status);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      console.error('[ClaudeAPI] Error response:', errorMessage);
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    // Read the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let currentSentence = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            // Stream complete
            if (currentSentence.trim()) {
              callbacks.onSentence(currentSentence.trim());
            }
            callbacks.onComplete(fullText);
            return;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle Claude's streaming format
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              const token = parsed.delta.text;
              fullText += token;
              currentSentence += token;
              callbacks.onToken(token);

              // Detect sentence boundaries for TTS
              const sentenceEnd = /[.!?]\s*$/;
              if (sentenceEnd.test(currentSentence)) {
                // Check for common abbreviations to avoid false positives
                const abbrevPattern = /\b(Mr|Mrs|Ms|Dr|Prof|Jr|Sr|vs|etc|Inc|Ltd)\.\s*$/i;
                if (!abbrevPattern.test(currentSentence)) {
                  callbacks.onSentence(currentSentence.trim());
                  currentSentence = '';
                }
              }
            }

            // Handle message_stop event
            if (parsed.type === 'message_stop') {
              if (currentSentence.trim()) {
                callbacks.onSentence(currentSentence.trim());
              }
              callbacks.onComplete(fullText);
              return;
            }
          } catch {
            // Ignore JSON parse errors for malformed events
          }
        }
      }
    }

    // Handle any remaining text
    if (currentSentence.trim()) {
      callbacks.onSentence(currentSentence.trim());
    }
    callbacks.onComplete(fullText);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Check if the API is available (for offline detection)
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(WORKER_URL, {
      method: 'OPTIONS',
    });
    return response.ok;
  } catch {
    return false;
  }
}
