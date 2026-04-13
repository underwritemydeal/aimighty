import { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { BeliefSelector } from './components/screens/BeliefSelector';
import { BeliefWelcomeScreen } from './components/screens/BeliefWelcomeScreen';
import { ConversationScreen } from './components/screens/ConversationScreen';
import { PaywallScreen } from './components/screens/PaywallScreen';
import { AboutScreen } from './components/screens/AboutScreen';
import { PrivacyScreen } from './components/screens/PrivacyScreen';
import { TermsScreen } from './components/screens/TermsScreen';
import { getCurrentUser } from './services/auth';
import type { Screen, BeliefSystem, User } from './types';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [selectedBelief, setSelectedBelief] = useState<BeliefSystem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check for existing user session on mount
  useEffect(() => {
    const existingUser = getCurrentUser();
    if (existingUser && existingUser.emailVerified) {
      setUser(existingUser);
    }
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
    // If user is already logged in, go to belief selector
    if (user) {
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

  // Handle navigation to static pages
  const handleNavigate = (screen: Screen) => {
    transitionTo(screen);
  };

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
          <WelcomeScreen onBegin={handleBegin} />
        )}

        {currentScreen === 'auth' && (
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
            onBack={handleBackToWelcome}
          />
        )}

        {currentScreen === 'belief-selector' && (
          <BeliefSelector
            onSelect={handleSelectBelief}
            onBack={handleBackToWelcome}
          />
        )}

        {currentScreen === 'belief-welcome' && selectedBelief && (
          <BeliefWelcomeScreen
            belief={selectedBelief}
            userName={user?.name}
            onContinue={handleBeliefWelcomeComplete}
          />
        )}

        {currentScreen === 'conversation' && selectedBelief && user && (
          <ConversationScreen
            belief={selectedBelief}
            user={user}
            onBack={handleBackToBeliefSelector}
            onPaywall={handleShowPaywall}
          />
        )}

        {currentScreen === 'paywall' && (
          <PaywallScreen
            onBack={handleBackToConversation}
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
