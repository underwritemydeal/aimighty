import { useState, useEffect, memo } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { signUp, signIn, isValidEmail, isDisposableEmail } from '../../services/auth';
import { t, type LanguageCode } from '../../data/translations';
import type { User } from '../../types';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  onBack: () => void;
  language: LanguageCode;
}

type AuthMode = 'signup' | 'login' | 'forgot';

// Social sign-in button (non-functional placeholder)
const SocialButton = memo(function SocialButton({
  provider,
  icon,
  onClick,
  language,
}: {
  provider: string;
  icon: React.ReactNode;
  onClick: () => void;
  language: LanguageCode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 rounded-xl glass glass-interactive hover-lift"
      style={{
        height: '52px',
        transition: 'all var(--duration-normal) var(--ease-out-expo)',
      }}
      aria-label={`${t('auth.continueWith', language)} ${provider}`}
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
        {t('auth.continueWith', language)} {provider}
      </span>
    </button>
  );
});

// Divider with text
const Divider = memo(function Divider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4">
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

export function AuthScreen({ onAuthSuccess, onBack, language }: AuthScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Real-time email validation feedback
  const emailError = email && !isValidEmail(email)
    ? t('auth.invalidEmail', language)
    : email && isDisposableEmail(email)
    ? t('auth.disposableEmail', language)
    : '';

  // Password match validation
  const passwordMatchError = mode === 'signup' && confirmPassword && password !== confirmPassword
    ? t('auth.passwordsNoMatch', language)
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check password match for signup
    if (mode === 'signup' && password !== confirmPassword) {
      setError(t('auth.passwordsNoMatch', language));
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const result = await signUp(email, password);
        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setError(result.error || t('common.error', language));
        }
      } else if (mode === 'login') {
        const result = await signIn(email, password);
        if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setError(result.error || t('common.error', language));
        }
      }
    } catch {
      setError(t('common.error', language));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = (provider: string) => {
    alert(`${provider} sign-in will be available soon. Please use email for now.`);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
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
          aria-label={t('common.back', language)}
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

      {/* Content - centered on desktop, bottom sheet on mobile */}
      <div
        className="relative z-10 min-h-screen flex flex-col sm:justify-center"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Spacer on mobile to push content down */}
        <div className="flex-1 sm:hidden" />

        <div
          className="w-full sm:max-w-sm sm:mx-auto gpu-accelerated"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
          }}
        >
          {/* Logo - hidden on mobile in bottom sheet mode, shown on desktop */}
          <div className="hidden sm:block text-center mb-8">
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

          {/* Auth card - full width on mobile, floating on desktop */}
          <div
            className="rounded-t-3xl sm:rounded-2xl"
            style={{
              padding: '32px 24px 40px 24px',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderBottom: 'none',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <h2
              id="auth-heading"
              className="text-center"
              style={{
                marginBottom: '28px',
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-normal)',
                color: 'var(--color-text-primary)',
              }}
            >
              {mode === 'forgot'
                ? t('auth.forgotPassword', language)
                : mode === 'signup'
                ? t('auth.createAccount', language)
                : t('auth.welcomeBack', language)}
            </h2>

            {/* Forgot password message */}
            {mode === 'forgot' && (
              <div style={{ marginBottom: '24px' }}>
                <p
                  className="text-center"
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  {t('auth.forgotPasswordMessage', language)}
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full mt-4 py-3 rounded-xl glass glass-interactive"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {t('auth.backToSignIn', language)}
                </button>
              </div>
            )}

            {mode !== 'forgot' && (
              <>
                {/* Social sign-in buttons - only on signup */}
                {mode === 'signup' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <SocialButton
                        provider="Google"
                        onClick={() => handleSocialSignIn('Google')}
                        language={language}
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
                        language={language}
                        icon={
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                          </svg>
                        }
                      />
                    </div>

                    {/* Divider */}
                    <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                      <Divider text={t('auth.or', language)} />
                    </div>
                  </>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Email field */}
                    <div>
                      <label htmlFor="email" className="sr-only">
                        {t('auth.email', language)}
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth.email', language)}
                        className="input"
                        autoComplete="email"
                        required
                        style={{ height: '52px' }}
                      />
                      {emailError && (
                        <p
                          style={{
                            marginTop: '8px',
                            color: '#ef4444',
                            fontSize: 'var(--text-xs)',
                          }}
                        >
                          {emailError}
                        </p>
                      )}
                    </div>

                    {/* Password field */}
                    <div>
                      <label htmlFor="password" className="sr-only">
                        {t('auth.password', language)}
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth.password', language)}
                        className="input"
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        minLength={8}
                        required
                        style={{ height: '52px' }}
                      />
                      {mode === 'signup' && (
                        <p
                          style={{
                            marginTop: '12px',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                            lineHeight: 'var(--leading-relaxed)',
                          }}
                        >
                          {t('auth.minChars', language)}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password field - only on signup */}
                    {mode === 'signup' && (
                      <div>
                        <label htmlFor="confirm-password" className="sr-only">
                          {t('auth.confirmPassword', language)}
                        </label>
                        <input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('auth.confirmPassword', language)}
                          className="input"
                          autoComplete="new-password"
                          minLength={8}
                          required
                          style={{ height: '52px' }}
                        />
                        {passwordMatchError && (
                          <p
                            style={{
                              marginTop: '8px',
                              color: '#ef4444',
                              fontSize: 'var(--text-xs)',
                            }}
                          >
                            {passwordMatchError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error message */}
                  {error && (
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '12px',
                        borderRadius: '12px',
                        textAlign: 'center',
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
                    disabled={isLoading || !!emailError || (mode === 'signup' && !!passwordMatchError)}
                    className="w-full rounded-xl hover-scale press-scale"
                    style={{
                      marginTop: '20px',
                      height: '56px',
                      background: 'var(--color-gold)',
                      color: 'var(--color-void)',
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-medium)',
                      letterSpacing: 'var(--tracking-wider)',
                      transition: 'all var(--duration-normal) var(--ease-out-expo)',
                      opacity: isLoading ? 0.7 : 1,
                    }}
                  >
                    {isLoading
                      ? t('common.loading', language)
                      : mode === 'signup'
                      ? t('auth.createAccount', language)
                      : t('auth.signIn', language)}
                  </button>
                </form>

                {/* Forgot password link - only on login */}
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="w-full text-center mt-4"
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {t('auth.forgotPassword', language)}
                  </button>
                )}

                {/* Mode toggle */}
                <p
                  className="text-center"
                  style={{
                    marginTop: '24px',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {mode === 'signup' ? t('auth.alreadyHaveAccount', language) : t('auth.noAccount', language)}{' '}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
                    className="text-gold hover:underline"
                    style={{ fontWeight: 'var(--font-medium)' }}
                  >
                    {mode === 'signup' ? t('auth.signIn', language) : t('auth.signUp', language)}
                  </button>
                </p>

                {/* Terms notice */}
                <p
                  className="text-center"
                  style={{
                    marginTop: '24px',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  {t('auth.terms', language)}{' '}
                  <a href="/terms" className="text-gold hover:underline">
                    {t('auth.termsLink', language)}
                  </a>{' '}
                  {t('auth.and', language)}{' '}
                  <a href="/privacy" className="text-gold hover:underline">
                    {t('auth.privacyLink', language)}
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
