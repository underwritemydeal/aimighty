/**
 * Claude API Service
 * Handles streaming communication with the Cloudflare Worker
 */

// HARDCODED worker URL - this is the deployed Cloudflare Worker
// Using hardcoded URL because VITE env vars may not be available at build time
const WORKER_URL = 'https://aimighty-api.robby-hess.workers.dev';

// Log the worker URL on module load (always, not just in dev)
console.log('[AImighty] Claude API Service initialized');
console.log('[AImighty] Worker URL:', WORKER_URL);

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
  callbacks: StreamCallbacks,
  language: string = 'en',
  character: string = 'god'
): Promise<void> {
  // Always log for debugging
  console.log('=== CLAUDE API REQUEST ===');
  console.log('[ClaudeAPI] URL:', WORKER_URL);
  console.log('[ClaudeAPI] Belief system:', beliefSystem);
  console.log('[ClaudeAPI] Character:', character);
  console.log('[ClaudeAPI] Language:', language);
  console.log('[ClaudeAPI] User ID:', userId);
  console.log('[ClaudeAPI] Messages count:', messages.length);
  console.log('[ClaudeAPI] Last message:', messages[messages.length - 1]);

  const requestBody = {
    messages,
    beliefSystem,
    userId,
    language,
    character,
  };
  console.log('[ClaudeAPI] Request body:', JSON.stringify(requestBody, null, 2));

  try {
    console.log('[ClaudeAPI] Sending fetch request...');
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('=== CLAUDE API RESPONSE ===');
    console.log('[ClaudeAPI] Response status:', response.status);
    console.log('[ClaudeAPI] Response statusText:', response.statusText);
    console.log('[ClaudeAPI] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ClaudeAPI] Error response body:', errorText);
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      console.error('[ClaudeAPI] Parsed error:', errorMessage);
      throw new Error(errorMessage);
    }

    if (!response.body) {
      console.error('[ClaudeAPI] No response body!');
      throw new Error('No response body');
    }

    console.log('[ClaudeAPI] Starting to read SSE stream...');

    // Read the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let currentSentence = '';
    let buffer = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[ClaudeAPI] Stream ended (done=true)');
        break;
      }

      chunkCount++;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      if (chunkCount <= 3) {
        console.log(`[ClaudeAPI] Chunk ${chunkCount}:`, chunk.substring(0, 200));
      }

      // Process SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            console.log('[ClaudeAPI] Received [DONE] marker');
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
              console.log('[ClaudeAPI] Received message_stop');
              if (currentSentence.trim()) {
                callbacks.onSentence(currentSentence.trim());
              }
              callbacks.onComplete(fullText);
              return;
            }

            // Log errors from Claude API
            if (parsed.type === 'error') {
              console.error('[ClaudeAPI] Error event from Claude:', parsed);
            }
          } catch {
            // Log malformed JSON for debugging
            if (data.length > 0 && data !== '[DONE]') {
              console.warn('[ClaudeAPI] Could not parse SSE data:', data.substring(0, 100));
            }
          }
        }
      }
    }

    // Handle any remaining text
    console.log('[ClaudeAPI] Stream processing complete. Total chunks:', chunkCount);
    console.log('[ClaudeAPI] Full response length:', fullText.length);
    if (currentSentence.trim()) {
      callbacks.onSentence(currentSentence.trim());
    }
    callbacks.onComplete(fullText);
  } catch (error) {
    console.error('=== CLAUDE API ERROR ===');
    console.error('[ClaudeAPI] Error:', error);
    console.error('[ClaudeAPI] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[ClaudeAPI] Error message:', error instanceof Error ? error.message : String(error));
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Check if the API is available (for offline detection)
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    console.log('[ClaudeAPI] Checking API health at:', WORKER_URL);
    const response = await fetch(WORKER_URL, {
      method: 'GET',
    });
    const data = await response.json();
    console.log('[ClaudeAPI] Health check response:', data);
    return response.ok;
  } catch (error) {
    console.error('[ClaudeAPI] Health check failed:', error);
    return false;
  }
}
