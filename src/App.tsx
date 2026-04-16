import { useState, useEffect, useCallback } from 'react';
import { LandingPage } from './components/screens/LandingPage';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { BeliefSelector } from './components/screens/BeliefSelector';
import { BeliefWelcomeScreen } from './components/screens/BeliefWelcomeScreen';
import { ConversationScreen } from './components/screens/ConversationScreen';
import { PaywallScreen } from './components/screens/PaywallScreen';
import { AboutScreen } from './components/screens/AboutScreen';
import { PrivacyScreen } from './components/screens/PrivacyScreen';
import { TermsScreen } from './components/screens/TermsScreen';
import { ArticlePage } from './components/screens/ArticlePage';
import { getCurrentUser, getSession, updateSessionBelief, isLoggedIn, signOut } from './services/auth';
import { getLastBelief, setLastBelief, clearLastBelief } from './services/tierService';
import { safeSetItem, safeGetItem } from './services/safeStorage';
import { defaultLanguage, type LanguageCode, isRTL } from './data/translations';
import { beliefSystems } from './data/beliefSystems';
import type { Screen, BeliefSystem, User } from './types';

// localStorage key for language preference
const LANGUAGE_STORAGE_KEY = 'aimighty_language';

function App() {
  // Parse pathname to decide initial screen. Also detect `/[belief]/[slug]` article pages.
  const [articleRoute, setArticleRoute] = useState<{ belief: string; slug: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    const p = window.location.pathname;
    const m = /^\/([a-z-]+)\/([a-z0-9-]+)\/?$/.exec(p);
    if (!m) return null;
    const knownBeliefs = new Set([
      'protestant', 'catholic', 'islam', 'judaism', 'hinduism', 'buddhism',
      'mormonism', 'sikhism', 'sbnr', 'taoism', 'pantheism', 'science',
      'agnosticism', 'atheism-stoicism',
    ]);
    if (!knownBeliefs.has(m[1])) return null;
    return { belief: m[1], slug: m[2] };
  });

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    if (typeof window === 'undefined') return 'welcome';
    const p = window.location.pathname;
    if (articleRoute) return 'article';
    if (p === '/' || p === '') return 'landing';
    if (p === '/about') return 'about';
    if (p === '/privacy') return 'privacy';
    if (p === '/terms') return 'terms';
    return 'welcome';
  });
  const [selectedBelief, setSelectedBelief] = useState<BeliefSystem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Language state — persisted to localStorage
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const stored = safeGetItem(LANGUAGE_STORAGE_KEY);
    return (stored as LanguageCode) || defaultLanguage;
  });

  // Update language with persistence
  const handleLanguageChange = useCallback((lang: LanguageCode) => {
    setLanguage(lang);
    safeSetItem(LANGUAGE_STORAGE_KEY, lang);
    // Update document direction for RTL languages
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  // Set initial document direction and check session on mount
  useEffect(() => {
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    // Skip session-restore for public landing/about/privacy/terms/article so refreshing
    // those URLs doesn't yank the user into the app unexpectedly
    const publicPaths = ['landing', 'about', 'privacy', 'terms', 'article'];
    if (publicPaths.includes(currentScreen)) {
      setIsInitialized(true);
      return;
    }

    // Check for existing session
    if (isLoggedIn()) {
      const existingUser = getCurrentUser();
      const session = getSession();

      if (existingUser) {
        setUser(existingUser);

        // Prefer `aimighty_last_belief` (set on every conversation start).
        // Fall back to legacy session.beliefSystemId for backward compat.
        const lastBeliefId = getLastBelief() || session?.beliefSystemId;
        if (lastBeliefId) {
          const savedBelief = beliefSystems.find(b => b.id === lastBeliefId);
          if (savedBelief) {
            setSelectedBelief(savedBelief);
            // Go directly to conversation screen — skip BeliefSelector
            setCurrentScreen('conversation');
          } else {
            setCurrentScreen('belief-selector');
          }
        } else {
          // First-time login — show BeliefSelector
          setCurrentScreen('belief-selector');
        }
      }
    }

    setIsInitialized(true);
  }, []);

  const transitionTo = (screen: Screen) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScreen(screen);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 180);
    }, 550);
  };

  const handleBegin = () => {
    // If user is already logged in, go to belief selector or conversation
    if (user) {
      const session = getSession();
      if (session?.beliefSystemId) {
        const savedBelief = beliefSystems.find(b => b.id === session.beliefSystemId);
        if (savedBelief) {
          setSelectedBelief(savedBelief);
          transitionTo('conversation');
          return;
        }
      }
      transitionTo('belief-selector');
    } else {
      // Otherwise, show auth screen
      transitionTo('auth');
    }
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    transitionTo('belief-selector');
  };

  const handleSelectBelief = (belief: BeliefSystem) => {
    setSelectedBelief(belief);
    // Save belief to session for persistence + last-belief memory
    updateSessionBelief(belief.id);
    setLastBelief(belief.id);
    transitionTo('belief-welcome');
  };

  // Handle belief change from conversation screen (skip welcome screen)
  const handleChangeBelief = useCallback((belief: BeliefSystem) => {
    setSelectedBelief(belief);
    updateSessionBelief(belief.id);
    setLastBelief(belief.id);
    // Stay on conversation screen - it will reset with new belief
    setCurrentScreen('conversation');
  }, []);

  // Explicit "Switch Belief" from the dropdown clears last-belief memory
  // so BeliefSelector gets shown again
  const handleSwitchBelief = useCallback(() => {
    clearLastBelief();
    transitionTo('belief-selector');
  }, []);

  const handleBeliefWelcomeComplete = () => {
    transitionTo('conversation');
  };

  const handleShowPaywall = () => {
    transitionTo('paywall');
  };

  const handleBackToWelcome = () => {
    transitionTo('welcome');
  };

  const handleBackToBeliefSelector = () => {
    transitionTo('belief-selector');
  };

  const handleBackToConversation = () => {
    transitionTo('conversation');
  };

  const handleSignOut = useCallback(() => {
    signOut();
    setUser(null);
    setSelectedBelief(null);
    transitionTo('welcome');
  }, []);

  // Handle navigation to static pages
  const handleNavigate = (screen: Screen) => {
    transitionTo(screen);
  };

  // Show nothing until initialized to prevent flash
  if (!isInitialized) {
    return (
      <div
        className="relative w-full min-h-screen overflow-hidden"
        style={{ background: 'var(--color-void)' }}
      />
    );
  }

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden"
      style={{ background: 'var(--color-void)' }}
    >
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Transition overlay */}
      <div
        className="fixed inset-0 pointer-events-none gpu-accelerated-opacity"
        style={{
          background: 'radial-gradient(ellipse at center, var(--color-void-light) 0%, var(--color-void) 100%)',
          opacity: isTransitioning ? 1 : 0,
          transition: 'opacity 550ms var(--ease-out-expo)',
          zIndex: 'var(--z-overlay)',
        }}
        aria-hidden="true"
      />

      {/* Screen container */}
      <div
        id="main-content"
        className="gpu-accelerated-opacity"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 450ms var(--ease-out-expo)',
        }}
      >
        {currentScreen === 'article' && articleRoute && (
          <ArticlePage
            belief={articleRoute.belief}
            slug={articleRoute.slug}
            onBackToHome={() => {
              if (typeof window !== 'undefined') window.history.pushState({}, '', '/');
              setArticleRoute(null);
              transitionTo('landing');
            }}
            onEnterApp={() => {
              if (typeof window !== 'undefined') window.history.pushState({}, '', '/app');
              setArticleRoute(null);
              transitionTo('welcome');
            }}
          />
        )}

        {currentScreen === 'landing' && (
          <LandingPage
            onEnterApp={() => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/app');
              }
              transitionTo('welcome');
            }}
            onNavigate={(screen) => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', `/${screen}`);
              }
              transitionTo(screen as Screen);
            }}
          />
        )}

        {currentScreen === 'welcome' && (
          <WelcomeScreen
            onBegin={handleBegin}
            language={language}
            onLanguageChange={handleLanguageChange}
            onNavigate={(screen) => transitionTo(screen)}
          />
        )}

        {currentScreen === 'auth' && (
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
            onBack={handleBackToWelcome}
            onNavigate={(screen) => transitionTo(screen)}
            language={language}
          />
        )}

        {currentScreen === 'belief-selector' && (
          <BeliefSelector
            onSelect={handleSelectBelief}
            onBack={handleBackToWelcome}
            language={language}
            onSignOut={handleSignOut}
          />
        )}

        {currentScreen === 'belief-welcome' && selectedBelief && (
          <BeliefWelcomeScreen
            belief={selectedBelief}
            userName={user?.name}
            onContinue={handleBeliefWelcomeComplete}
            language={language}
          />
        )}

        {currentScreen === 'conversation' && selectedBelief && user && (
          <ConversationScreen
            key={selectedBelief.id}
            belief={selectedBelief}
            user={user}
            onBack={handleBackToBeliefSelector}
            onPaywall={handleShowPaywall}
            onChangeBelief={handleChangeBelief}
            onSwitchBelief={handleSwitchBelief}
            onSignOut={handleSignOut}
            onNavigate={(screen) => transitionTo(screen)}
            language={language}
          />
        )}

        {currentScreen === 'paywall' && (
          <PaywallScreen
            onBack={handleBackToConversation}
            language={language}
          />
        )}

        {currentScreen === 'about' && (
          <AboutScreen onBack={() => handleNavigate('welcome')} />
        )}

        {currentScreen === 'privacy' && (
          <PrivacyScreen onBack={() => handleNavigate('welcome')} />
        )}

        {currentScreen === 'terms' && (
          <TermsScreen onBack={() => handleNavigate('welcome')} />
        )}
      </div>
    </div>
  );
}

export default App;
