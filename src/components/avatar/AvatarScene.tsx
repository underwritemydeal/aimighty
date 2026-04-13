import { Canvas } from '@react-three/fiber';
import { Suspense, memo } from 'react';
import { ParticleFace } from './ParticleFace';

interface AvatarSceneProps {
  themeColor?: string;
  particleColor?: string;
  audioLevel?: number;
  className?: string;
}

export const AvatarScene = memo(function AvatarScene({
  themeColor = '#d4af37',
  particleColor,
  audioLevel = 0,
  className = '',
}: AvatarSceneProps) {
  const effectiveParticleColor = particleColor || themeColor;

  return (
    <div
      className={`w-full h-full ${className}`}
      aria-hidden="true"
      role="presentation"
    >
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 50 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ParticleFace
            themeColor={effectiveParticleColor}
            audioLevel={audioLevel}
            isActive={true}
          />
        </Suspense>
      </Canvas>
    </div>
  );
});
