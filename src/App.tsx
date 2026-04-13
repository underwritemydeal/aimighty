import { useState } from 'react';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { BeliefSelector } from './components/screens/BeliefSelector';
import { ConversationScreen } from './components/screens/ConversationScreen';
import type { Screen, BeliefSystem } from './types';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [selectedBelief, setSelectedBelief] = useState<BeliefSystem | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transitionTo = (screen: Screen) => {
    setIsTransitioning(true);

    // Cinematic crossfade: fade out → switch → fade in
    setTimeout(() => {
      setCurrentScreen(screen);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 180);
    }, 550);
  };

  const handleBegin = () => {
    transitionTo('belief-selector');
  };

  const handleSelectBelief = (belief: BeliefSystem) => {
    setSelectedBelief(belief);
    transitionTo('conversation');
  };

  const handleBackToWelcome = () => {
    transitionTo('welcome');
  };

  const handleBackToBeliefSelector = () => {
    transitionTo('belief-selector');
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

      {/* Transition overlay — cinematic crossfade */}
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

        {currentScreen === 'belief-selector' && (
          <BeliefSelector
            onSelect={handleSelectBelief}
            onBack={handleBackToWelcome}
          />
        )}

        {currentScreen === 'conversation' && selectedBelief && (
          <ConversationScreen
            belief={selectedBelief}
            onBack={handleBackToBeliefSelector}
          />
        )}
      </div>
    </div>
  );
}

export default App;
