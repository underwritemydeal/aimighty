import { useState, useEffect, useCallback } from 'react';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { BeliefSelector } from './components/screens/BeliefSelector';
import { BeliefWelcomeScreen } from './components/screens/BeliefWelcomeScreen';
import { ConversationScreen } from './components/screens/ConversationScreen';
import { PaywallScreen } from './components/screens/PaywallScreen';
import { AboutScreen } from './components/screens/AboutScreen';
import { PrivacyScreen } from './components/screens/PrivacyScreen';
import { TermsScreen } from './components/screens/TermsScreen';
import { getCurrentUser, getSession, updateSessionBelief, isLoggedIn, signOut } from './services/auth';
import { defaultLanguage, type LanguageCode, isRTL } from './data/translations';
import { beliefSystems } from './data/beliefSystems';
import type { Screen, BeliefSystem, User } from './types';

// localStorage key for language preference
const LANGUAGE_STORAGE_KEY = 'aimighty_language';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [selectedBelief, setSelectedBelief] = useState<BeliefSystem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Language state — persisted to localStorage
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (stored as LanguageCode) || defaultLanguage;
  });

  // Update language with persistence
  const handleLanguageChange = useCallback((lang: LanguageCode) => {
    setLanguage(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    // Update document direction for RTL languages
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  // Set initial document direction and check session on mount
  useEffect(() => {
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    // Check for existing session
    if (isLoggedIn()) {
      const existingUser = getCurrentUser();
      const session = getSession();

      if (existingUser) {
        setUser(existingUser);

        // If session has a saved belief system, restore it
        if (session?.beliefSystemId) {
          const savedBelief = beliefSystems.find(b => b.id === session.beliefSystemId);
          if (savedBelief) {
            setSelectedBelief(savedBelief);
            // Go directly to conversation screen
            setCurrentScreen('conversation');
          } else {
            // Belief not found, go to selector
            setCurrentScreen('belief-selector');
          }
        } else {
          // No saved belief, go to selector
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
    // Save belief to session for persistence
    updateSessionBelief(belief.id);
    transitionTo('belief-welcome');
  };

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
        {currentScreen === 'welcome' && (
          <WelcomeScreen
            onBegin={handleBegin}
            language={language}
            onLanguageChange={handleLanguageChange}
          />
        )}

        {currentScreen === 'auth' && (
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
            onBack={handleBackToWelcome}
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
            belief={selectedBelief}
            user={user}
            onBack={handleBackToBeliefSelector}
            onPaywall={handleShowPaywall}
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
