import { Component, type ReactNode } from 'react';

/**
 * Root error boundary.
 *
 * Any unhandled throw in any screen (bad belief id from URL, malformed
 * memory JSON, null access during render, etc.) would otherwise blank the
 * entire app — a black screen with no copy and no recovery. This boundary
 * renders a warm fallback and a reset button that reloads the app.
 *
 * Closes P0-6 from audits/03-harden.md.
 */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught:', error, info?.componentStack);
  }

  handleReset = () => {
    // Full reload resets every in-memory screen/state and re-runs routing.
    if (typeof window !== 'undefined') window.location.reload();
  };

  handleHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          textAlign: 'center',
          background: 'var(--color-void, #030308)',
          color: 'rgba(255, 248, 240, 0.95)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
            fontSize: 'clamp(1.05rem, 4vw, 1.15rem)',
            letterSpacing: '0.05em',
            marginBottom: '24px',
          }}
        >
          <span style={{ color: '#d4b882' }}>AI</span>
          <span>mighty</span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
            fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
            fontWeight: 300,
            lineHeight: 1.2,
            marginBottom: '16px',
            maxWidth: '520px',
          }}
        >
          Something interrupted us.
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body, Outfit, system-ui, sans-serif)',
            fontSize: '1rem',
            lineHeight: 1.6,
            color: 'rgba(255, 248, 240, 0.7)',
            maxWidth: '440px',
            marginBottom: '32px',
          }}
        >
          Your words are safe. Take a breath and try again.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '14px 28px',
              minHeight: '44px',
              borderRadius: '999px',
              background: '#d4b882',
              color: '#0a0a0f',
              fontFamily: 'var(--font-body, Outfit, system-ui, sans-serif)',
              fontSize: '0.95rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.handleHome}
            style={{
              padding: '14px 28px',
              minHeight: '44px',
              borderRadius: '999px',
              background: 'transparent',
              color: 'rgba(255, 248, 240, 0.85)',
              fontFamily: 'var(--font-body, Outfit, system-ui, sans-serif)',
              fontSize: '0.95rem',
              fontWeight: 500,
              border: '1px solid rgba(212, 184, 130, 0.4)',
              cursor: 'pointer',
            }}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }
}
