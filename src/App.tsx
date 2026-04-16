import { useState, useEffect, useCallback } from 'react';
import { LandingPage } from './components/screens/LandingPage';
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
    if (typeof window === 'undefined') return 'auth';
    const p = window.location.pathname;
    // Public content pages — always render directly
    if (articleRoute) return 'article';
    if (p === '/about') return 'about';
    if (p === '/privacy') return 'privacy';
    if (p === '/terms') return 'terms';
    // Everything else (/, /app, etc):
    //   session        → conversation/belief-selector (resolved in useEffect)
    //   no session + visited before → auth screen
    //   no session + first ever visit → landing page (shown once)
    if (isLoggedIn()) return 'loading';
    if (localStorage.getItem('aimighty_has_visited')) return 'auth';
    return 'landing';
  });
  const [selectedBelief, setSelectedBelief] = useState<BeliefSystem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Language state — persisted to localStorage
  const [language] = useState<LanguageCode>(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (stored as LanguageCode) || defaultLanguage;
  });

  // Set initial document direction and restore session on mount
  useEffect(() => {
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    // Public content pages — no session restore needed
    const publicPaths = ['about', 'privacy', 'terms', 'article'];
    if (publicPaths.includes(currentScreen)) {
      setIsInitialized(true);
      return;
    }

    // Restore session: if logged in → conversation or belief-selector.
    // If not → stay on auth screen. No landing page. No welcome screen.
    if (isLoggedIn()) {
      const existingUser = getCurrentUser();
      const session = getSession();

      if (existingUser) {
        setUser(existingUser);

        // Always show /app in the URL bar
        if (window.location.pathname !== '/app') {
          window.history.replaceState({}, '', '/app');
        }

        // Go to last conversation, or belief-selector if no saved belief
        const lastBeliefId = getLastBelief() || session?.beliefSystemId;
        if (lastBeliefId) {
          const savedBelief = beliefSystems.find(b => b.id === lastBeliefId);
          if (savedBelief) {
            setSelectedBelief(savedBelief);
            setCurrentScreen('conversation');
          } else {
            setCurrentScreen('belief-selector');
          }
        } else {
          setCurrentScreen('belief-selector');
        }
      } else {
        // Session exists but user object is gone — force re-auth
        setCurrentScreen('auth');
      }
    } else {
      setCurrentScreen('auth');
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

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    window.history.replaceState({}, '', '/app');

    // If they have a saved belief from a previous session, go straight
    // to conversation. Otherwise belief-selector.
    const lastBeliefId = getLastBelief();
    if (lastBeliefId) {
      const savedBelief = beliefSystems.find(b => b.id === lastBeliefId);
      if (savedBelief) {
        setSelectedBelief(savedBelief);
        transitionTo('conversation');
        return;
      }
    }
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
    transitionTo('auth');
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
              if (isLoggedIn()) {
                const existingUser = getCurrentUser();
                if (existingUser) {
                  setUser(existingUser);
                  const lastBeliefId = getLastBelief();
                  const savedBelief = lastBeliefId ? beliefSystems.find(b => b.id === lastBeliefId) : null;
                  if (savedBelief) {
                    setSelectedBelief(savedBelief);
                    transitionTo('conversation');
                  } else {
                    transitionTo('belief-selector');
                  }
                  return;
                }
              }
              transitionTo('auth');
            }}
          />
        )}

        {currentScreen === 'landing' && (
          <LandingPage
            onEnterApp={() => {
              localStorage.setItem('aimighty_has_visited', '1');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/app');
              }
              transitionTo('auth');
            }}
            onNavigate={(screen) => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', `/${screen}`);
              }
              transitionTo(screen as Screen);
            }}
          />
        )}

        {/* Loading state while session is being restored */}
        {currentScreen === 'loading' && (
          <div style={{ background: '#030308', height: '100dvh', minHeight: '100dvh' }} />
        )}

        {currentScreen === 'auth' && (
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
            onBack={() => transitionTo('landing')}
            onNavigate={(screen) => transitionTo(screen)}
            language={language}
          />
        )}

        {currentScreen === 'belief-selector' && (
          <BeliefSelector
            onSelect={handleSelectBelief}
            onBack={handleSignOut}
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
          <AboutScreen onBack={() => handleNavigate('auth')} />
        )}

        {currentScreen === 'privacy' && (
          <PrivacyScreen onBack={() => handleNavigate('auth')} />
        )}

        {currentScreen === 'terms' && (
          <TermsScreen onBack={() => handleNavigate('auth')} />
        )}
      </div>
    </div>
  );
}

export default App;
