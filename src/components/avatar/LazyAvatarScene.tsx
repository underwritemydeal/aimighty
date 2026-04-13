import { Suspense, lazy, memo } from 'react';

// Lazy load the heavy Three.js component
const AvatarScene = lazy(() =>
  import('./AvatarScene').then(module => ({ default: module.AvatarScene }))
);

interface LazyAvatarSceneProps {
  themeColor?: string;
  particleColor?: string;
  audioLevel?: number;
  className?: string;
}

// Loading placeholder with breathing animation — more visible
const AvatarPlaceholder = memo(function AvatarPlaceholder() {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      aria-hidden="true"
    >
      <div
        className="animate-breathe"
        style={{
          width: '160px',
          height: '200px',
          borderRadius: '50% 50% 45% 45%',
          background: 'radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.35) 0%, rgba(212,175,55,0.15) 40%, transparent 70%)',
          boxShadow: '0 0 80px rgba(212,175,55,0.25), 0 0 160px rgba(212,175,55,0.1)',
        }}
      />
    </div>
  );
});

export const LazyAvatarScene = memo(function LazyAvatarScene({
  themeColor = '#d4af37',
  particleColor,
  audioLevel = 0,
  className = '',
}: LazyAvatarSceneProps) {
  return (
    <Suspense fallback={<AvatarPlaceholder />}>
      <AvatarScene
        themeColor={themeColor}
        particleColor={particleColor}
        audioLevel={audioLevel}
        className={className}
      />
    </Suspense>
  );
});
