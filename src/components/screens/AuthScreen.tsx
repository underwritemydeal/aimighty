import { useState, useEffect, memo } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { signUp, signIn, verifyEmail, isValidEmail, isDisposableEmail } from '../../services/auth';
import type { AuthMode, User } from '../../types';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  onBack: () => void;
}

// Social sign-in button (non-functional placeholder)
const SocialButton = memo(function SocialButton({
  provider,
  icon,
  onClick,
}: {
  provider: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl glass glass-interactive hover-lift"
      style={{
        transition: 'all var(--duration-normal) var(--ease-out-expo)',
      }}
      aria-label={`Sign in with ${provider}`}
    >
      {icon}
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-normal)',
          color: 'var(--color-text-primary)',
        }}
      >
        Continue with {provider}
      </span>
    </button>
  );
});

// Divider with text
const Divider = memo(function Divider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <span
        className="text-caps"
        style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}
      >
        {text}
      </span>
      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
});

export function AuthScreen({ onAuthSuccess, onBack }: AuthScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Real-time email validation feedback
  const emailError = email && !isValidEmail(email)
    ? 'Please enter a valid email'
    : email && isDisposableEmail(email)
    ? 'Disposable emails are not allowed'
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'verify-email') {
        const result = await verifyEmail(verificationCode);
        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setError(result.error || 'Verification failed');
        }
      } else if (mode === 'signup') {
        const result = await signUp(email, password);
        if (result.success) {
          setMode('verify-email');
        } else {
          setError(result.error || 'Sign up failed');
        }
      } else {
        const result = await signIn(email, password);
        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setError(result.error || 'Sign in failed');
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = (provider: string) => {
    // Non-functional placeholder - will wire OAuth in Phase 2
    alert(`${provider} sign-in will be available soon. Please use email for now.`);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'var(--color-void)' }}
      role="main"
      aria-labelledby="auth-heading"
    >
      <NebulaBackground intensity={0.7} />
      <div className="vignette" aria-hidden="true" />

      {/* Back button */}
      <nav
        className="fixed top-4 left-4 z-20 gpu-accelerated"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: `opacity var(--duration-slow) var(--ease-out-expo)`,
        }}
      >
        <button
          onClick={onBack}
          aria-label="Go back"
          className="group flex items-center gap-2 py-2 px-3 rounded-lg btn-ghost glass"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:-translate-x-1"
            style={{ color: 'var(--color-text-muted)' }}
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </nav>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-sm gpu-accelerated"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="flex items-baseline justify-center select-none">
              <span
                className="text-gold"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 'var(--font-medium)',
                }}
              >
                AI
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 'var(--font-thin)',
                  color: 'var(--color-text-primary)',
                }}
              >
                mighty
              </span>
            </h1>
          </div>

          {/* Auth card */}
          <div
            className="glass rounded-2xl p-6"
            style={{ boxShadow: 'var(--glass-shadow)' }}
          >
            <h2
              id="auth-heading"
              className="text-center mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-normal)',
                color: 'var(--color-text-primary)',
              }}
            >
              {mode === 'verify-email'
                ? 'Verify Your Email'
                : mode === 'signup'
                ? 'Create Account'
                : 'Welcome Back'}
            </h2>

            {mode !== 'verify-email' && (
              <>
                {/* Social sign-in buttons */}
                <div className="space-y-3 mb-4">
                  <SocialButton
                    provider="Google"
                    onClick={() => handleSocialSignIn('Google')}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    }
                  />
                  <SocialButton
                    provider="Apple"
                    onClick={() => handleSocialSignIn('Apple')}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                    }
                  />
                </div>

                <Divider text="or" />
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'verify-email' ? (
                <>
                  <p
                    className="text-center mb-4"
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 'var(--leading-relaxed)',
                    }}
                  >
                    We sent a verification code to your email. Enter it below to continue.
                  </p>
                  <div>
                    <label htmlFor="code" className="sr-only">
                      Verification code
                    </label>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit code"
                      className="input text-center"
                      style={{
                        fontSize: 'var(--text-xl)',
                        letterSpacing: '0.3em',
                        fontWeight: 'var(--font-medium)',
                      }}
                      autoFocus
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="input"
                      autoComplete="email"
                      required
                    />
                    {emailError && (
                      <p
                        className="mt-1.5 text-sm"
                        style={{ color: '#ef4444', fontSize: 'var(--text-xs)' }}
                      >
                        {emailError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="password" className="sr-only">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="input"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      minLength={8}
                      required
                    />
                    {mode === 'signup' && (
                      <p
                        className="mt-1.5"
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        Min 8 characters with uppercase, lowercase, and number
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Error message */}
              {error && (
                <div
                  className="p-3 rounded-lg text-center"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <p style={{ fontSize: 'var(--text-sm)', color: '#ef4444' }}>
                    {error}
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || !!emailError}
                className="w-full py-3.5 rounded-xl hover-scale press-scale"
                style={{
                  background: 'var(--color-gold)',
                  color: 'var(--color-void)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  letterSpacing: 'var(--tracking-wider)',
                  transition: 'all var(--duration-normal) var(--ease-out-expo)',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading
                  ? 'Please wait...'
                  : mode === 'verify-email'
                  ? 'Verify Email'
                  : mode === 'signup'
                  ? 'Create Account'
                  : 'Sign In'}
              </button>
            </form>

            {/* Mode toggle */}
            {mode !== 'verify-email' && (
              <p
                className="text-center mt-6"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signup' ? 'login' : 'signup');
                    setError('');
                  }}
                  className="text-gold hover:underline"
                  style={{ fontWeight: 'var(--font-medium)' }}
                >
                  {mode === 'signup' ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            )}

            {mode === 'verify-email' && (
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="w-full mt-4 text-center"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Use a different email
              </button>
            )}
          </div>

          {/* Terms notice */}
          <p
            className="text-center mt-6"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-gold hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-gold hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
