import { useState, useEffect, memo } from 'react';
import { signUp, signIn, isValidEmail, getRememberMe, getLastEmail, hasSignedInBefore } from '../../services/auth';
import { t, type LanguageCode } from '../../data/translations';
import type { User } from '../../types';
import { Wordmark } from '../Wordmark';
import { colors } from '../../styles/designSystem';

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
  // First-time visitors default to Sign Up (Create Account) because they have
  // no account yet. Returning visitors default to Sign In with their email
  // pre-filled. hasSignedInBefore() reads aimighty_last_email, which is
  // written on every successful signUp and signIn — so this flips to 'login'
  // the moment an account is created on this device.
  const [mode, setMode] = useState<AuthMode>(() => hasSignedInBefore() ? 'login' : 'signup');
  const [email, setEmail] = useState(() => getLastEmail());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotMessage, setShowForgotMessage] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberMe());
  // Track focus state for each input so we can render a gold underline on
  // focus without relying on the browser's native focus ring (which on iOS
  // Safari is a dark rectangular outline that visually collides with the
  // wordmark above the form).
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
          setError(result.error || 'The connection is briefly strained. One more breath, then try again.');
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
      setError('The connection is briefly strained. One more breath, then try again.');
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

  // Shared input style — font-size: 16px is REQUIRED on iOS to prevent the
  // browser from auto-zooming into the input on focus. outline: none kills
  // the iOS default focus ring (which otherwise visually collides with the
  // wordmark and card edge); we replace it with a gold border-bottom on
  // focus via the focused flags below.
  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    height: '52px',
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    color: 'rgba(255, 248, 240, 0.95)',
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  };

  return (
    <div
      className="relative overflow-hidden flex flex-col items-center"
      style={{ background: 'var(--color-void)', minHeight: '100dvh' }}
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

      {/* Wordmark — anchored from the top of the screen so the focus ring
          on the email input can never visually collide with it (the card
          below has its own stacking context). safe-area-inset-top + 40px
          per the vertical-rhythm spec. */}
      <div
        className="relative z-10 flex justify-center w-full"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 16px) + 40px)',
          marginBottom: '32px',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        <h1 id="auth-heading" style={{ margin: 0 }} className="select-none">
          <Wordmark size="md" style={{ fontSize: '1.5rem' }} />
        </h1>
      </div>

      {/* Card container — flex-1 so the legal line inside can anchor to the
          card bottom via margin-top: auto regardless of viewport height. */}
      <div
        className="relative z-10 w-full max-w-[400px] flex-1 flex flex-col"
        style={{
          padding: '0 16px 40px 16px',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.6s ease',
        }}
      >
        <div
          className="flex flex-col flex-1"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '32px',
          }}
        >
          {/* Form title */}
          <h2
            className="text-center select-none"
            style={{
              margin: 0,
              marginBottom: '24px',
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 400,
              color: colors.textPrimary,
              letterSpacing: '0.01em',
            }}
          >
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col" style={{ gap: '20px' }}>
              {/* Email field */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  style={{
                    ...baseInputStyle,
                    padding: '0 16px',
                    borderBottom: `1px solid ${emailFocused ? colors.gold : 'rgba(255, 255, 255, 0.2)'}`,
                    boxShadow: emailFocused ? `0 1px 0 0 ${colors.gold}` : 'none',
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
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Password"
                    aria-label="Password"
                    aria-describedby="password-hint"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    style={{
                      ...baseInputStyle,
                      padding: '0 48px 0 16px',
                      borderBottom: `1px solid ${passwordFocused ? colors.gold : 'rgba(255, 255, 255, 0.2)'}`,
                      boxShadow: passwordFocused ? `0 1px 0 0 ${colors.gold}` : 'none',
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
                <p id="password-hint" className="mt-2" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.35)' }}>
                  Minimum 8 characters
                </p>
              </div>

              {/* Remember me toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-transparent accent-[#d4b882]"
                  style={{
                    accentColor: colors.gold,
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

            {/* Submit button — 28px above (spec: Remember me → Submit) */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full transition-all duration-200"
              style={{
                marginTop: '28px',
                height: '52px',
                background: colors.gold,
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

          {/* Forgot password — 16px below submit (spec: Submit → Forgot) */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full text-center"
              style={{
                marginTop: '16px',
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              Forgot Password?
            </button>
          )}

          {/* Switch mode — 20px above (spec: Forgot → Switch-mode, and same
              value used from Submit in signup mode for consistency). */}
          <p
            className="text-center"
            style={{
              marginTop: '20px',
              fontSize: '0.9rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            {mode === 'signup' ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={switchMode}
              style={{ color: colors.gold, fontWeight: 500 }}
            >
              {mode === 'signup' ? 'Sign In' : 'Create Account'}
            </button>
          </p>

          {/* Legal — anchored to the bottom of the card via margin-top: auto.
              padding-top: 24px guarantees the 24px minimum gap above legal
              when the card is content-sized (spec: Switch-mode → Legal). */}
          <p
            className="text-center"
            style={{
              marginTop: 'auto',
              paddingTop: '24px',
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.35)',
              lineHeight: 1.6,
              whiteSpace: 'nowrap',
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
