import { useState, useEffect, memo } from 'react';
import { signUp, signIn, isValidEmail, getRememberMe, getLastEmail, hasSignedInBefore } from '../../services/auth';
import { t, type LanguageCode } from '../../data/translations';
import type { User } from '../../types';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  onBack: () => void;
  onNavigate?: (screen: 'terms' | 'privacy') => void;
  language: LanguageCode;
}

type AuthMode = 'signup' | 'login';

// Back icon
const BackIcon = memo(function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
});

// Eye icon for password toggle
const EyeIcon = memo(function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {visible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );
});

export function AuthScreen({ onAuthSuccess, onBack, onNavigate, language }: AuthScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  // Returning visitors default to the Sign In tab with their email pre-filled.
  // First-time visitors still see Create Account.
  const [mode, setMode] = useState<AuthMode>(() =>
    hasSignedInBefore() ? 'login' : 'signup'
  );
  const [email, setEmail] = useState(() => getLastEmail());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotMessage, setShowForgotMessage] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberMe());

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowForgotMessage(false);

    // Basic email validation
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password minimum length
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, rememberMe);
        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setError(result.error || 'Something went wrong');
        }
      } else {
        const result = await signIn(email, password, rememberMe);
        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setError('Account not found or incorrect password');
        }
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signup' ? 'login' : 'signup');
    setError('');
    setShowForgotMessage(false);
  };

  const handleForgotPassword = () => {
    setShowForgotMessage(true);
    setError('');
  };

  const isFormValid = email.length > 0 && password.length >= 8;

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center"
      style={{ background: 'var(--color-void)' }}
      role="main"
      aria-labelledby="auth-heading"
    >
      {/* Blurred background */}
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: 'url(/images/avatars/hero-mashup-mobile.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
          filter: 'blur(30px)',
        }}
        aria-hidden="true"
      />

      {/* Dark overlay */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(3, 3, 8, 0.85)' }}
        aria-hidden="true"
      />

      {/* Back button */}
      <nav
        className="fixed z-20"
        style={{
          top: 'max(env(safe-area-inset-top, 16px), 16px)',
          left: '16px',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        <button
          onClick={onBack}
          aria-label={t('common.back', language)}
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'rgba(255, 255, 255, 0.5)' }}
        >
          <BackIcon />
        </button>
      </nav>

      {/* Auth card */}
      <div
        className="relative z-10 w-full max-w-[400px] mx-4"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.6s ease',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '40px 32px',
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="flex items-baseline justify-center select-none">
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#d4af37',
                }}
              >
                AI
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  color: 'rgba(255, 248, 240, 0.95)',
                }}
              >
                mighty
              </span>
            </h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col" style={{ gap: '20px' }}>
              {/* Email field */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="Email"
                  autoComplete="email"
                  required
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 0,
                    color: 'rgba(255, 248, 240, 0.95)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Password field */}
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    style={{
                      width: '100%',
                      height: '52px',
                      padding: '0 48px 0 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 0,
                      color: 'rgba(255, 248, 240, 0.95)',
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: 'rgba(255, 255, 255, 0.35)' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
                <p className="mt-2" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.35)' }}>
                  Minimum 8 characters
                </p>
              </div>

              {/* Remember me toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-transparent accent-[#d4af37]"
                  style={{
                    accentColor: '#d4af37',
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Remember me
                </span>
              </label>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4">
                <p style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                  {error}
                </p>
              </div>
            )}

            {/* Forgot password message */}
            {showForgotMessage && (
              <div className="mt-4">
                <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Password reset coming soon. For now, create a new account.
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full mt-6 transition-all duration-200"
              style={{
                height: '52px',
                background: '#d4af37',
                color: '#0a0a0f',
                borderRadius: '12px',
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                fontWeight: 500,
                opacity: isLoading || !isFormValid ? 0.6 : 1,
              }}
            >
              {isLoading
                ? (mode === 'signup' ? 'Creating...' : 'Signing In...')
                : (mode === 'signup' ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {/* Forgot password */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full text-center mt-4"
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              Forgot Password?
            </button>
          )}

          {/* Switch mode */}
          <p
            className="text-center mt-6"
            style={{
              fontSize: '0.9rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            {mode === 'signup' ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={switchMode}
              style={{ color: '#d4af37', fontWeight: 500 }}
            >
              {mode === 'signup' ? 'Sign In' : 'Create Account'}
            </button>
          </p>

          {/* Terms and Privacy */}
          <p
            className="text-center mt-6"
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.35)',
              lineHeight: 1.6,
            }}
          >
            By continuing, you agree to our{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('terms')}
              style={{ color: 'rgba(255, 255, 255, 0.5)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
            >
              Terms of Service
            </button>
            {' '}and{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('privacy')}
              style={{ color: 'rgba(255, 255, 255, 0.5)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
