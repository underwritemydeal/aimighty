import { Canvas } from '@react-three/fiber';
import { Suspense, memo, useState, useEffect } from 'react';
import { ParticleFace } from './ParticleFace';

interface AvatarSceneProps {
  themeColor?: string;
  particleColor?: string;
  audioLevel?: number;
  className?: string;
}

// CSS fallback for when WebGL fails
const CSSFallback = memo(function CSSFallback({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="animate-breathe"
        style={{
          width: '180px',
          height: '220px',
          borderRadius: '50% 50% 45% 45%',
          background: `radial-gradient(ellipse at 50% 40%, ${color}40 0%, ${color}20 40%, transparent 70%)`,
          boxShadow: `0 0 60px ${color}30, 0 0 120px ${color}15`,
        }}
      />
    </div>
  );
});

export const AvatarScene = memo(function AvatarScene({
  themeColor = '#d4af37',
  particleColor,
  audioLevel = 0,
  className = '',
}: AvatarSceneProps) {
  const effectiveParticleColor = particleColor || themeColor;
  const [webglSupported, setWebglSupported] = useState(true);

  // Check WebGL support on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch {
      setWebglSupported(false);
    }
  }, []);

  // Show CSS fallback if WebGL not supported
  if (!webglSupported) {
    return (
      <div className={`w-full h-full ${className}`} aria-hidden="true">
        <CSSFallback color={effectiveParticleColor} />
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full ${className}`}
      aria-hidden="true"
      role="presentation"
      style={{ minHeight: '200px' }}
    >
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 50 }}
        dpr={[1, 1.5]} // Limit DPR on mobile for performance
        gl={{
          antialias: false, // Disable on mobile for performance
          alpha: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false, // Allow software rendering
        }}
        style={{
          background: 'transparent',
          width: '100%',
          height: '100%',
        }}
        onCreated={({ gl }) => {
          // Ensure canvas fills container
          gl.setSize(gl.domElement.clientWidth, gl.domElement.clientHeight);
        }}
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
