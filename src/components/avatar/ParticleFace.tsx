import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleFaceProps {
  themeColor?: string;
  audioLevel?: number;
  isActive?: boolean;
}

// Constants for animation tuning
const BREATHE_SPEED = 0.8;
const BREATHE_SCALE = 0.02;
const BREATHE_Y_OFFSET = 0.01;
const DRIFT_X_INTENSITY = 0.008;
const DRIFT_Y_INTENSITY = 0.006;
const DRIFT_Z_INTENSITY = 0.008;
const ROTATION_SPEED = 0.1;
const ROTATION_AMPLITUDE = 0.03;
const PARTICLE_SIZE_MIN = 0.008;
const PARTICLE_SIZE_RANGE = 0.008;

// Generate head-shaped point cloud using Fibonacci sphere
function generateHeadPoints(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

    let radius = 1;
    const y = Math.cos(phi);

    // Head shape modifications
    if (y > 0.7) {
      // Forehead - slightly larger
      radius *= 0.95 + (y - 0.7) * 0.1;
    } else if (y < 0.2 && y > -0.5) {
      // Jaw area - narrower
      const jawFactor = 1 - (0.2 - y) * 0.4;
      radius *= jawFactor;
    } else if (y <= -0.5) {
      // Chin - pointed
      const chinFactor = 0.6 + (y + 1) * 0.8;
      radius *= Math.max(0.3, chinFactor);
    }

    const sinPhi = Math.sin(phi);
    let x = radius * sinPhi * Math.cos(theta);
    let z = radius * sinPhi * Math.sin(theta);

    // Nose protrusion
    if (y > -0.1 && y < 0.3 && z > 0.3) {
      z *= 1 + (0.15 * Math.max(0, 1 - Math.abs(x) * 3));
    }

    // Add subtle randomness for organic feel
    positions[i * 3] = x + (Math.random() - 0.5) * 0.03;
    positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.03;
    positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.03;
  }

  return positions;
}

export function ParticleFace({
  themeColor = '#d4af37',
  audioLevel = 0,
  isActive = true,
}: ParticleFaceProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Mobile detection for particle count
  const [particleCount] = useState(() => {
    if (typeof window === 'undefined') return 4000;
    const isMobile = window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? 1800 : 4000;
  });

  // Page visibility for pausing animation
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const { positions, originalPositions, mouthRegion } = useMemo(() => {
    const pos = generateHeadPoints(particleCount);
    const original = new Float32Array(pos);

    // Identify mouth region particles
    const mouth = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const x = original[i * 3];
      const y = original[i * 3 + 1];
      const z = original[i * 3 + 2];
      const isMouthArea = y > -0.4 && y < 0.1 && z > 0.3 && Math.abs(x) < 0.5;
      mouth[i] = isMouthArea ? 1 : 0;
    }

    return { positions: pos, originalPositions: original, mouthRegion: mouth };
  }, [particleCount]);

  const sizes = useMemo(() => {
    const s = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      s[i] = PARTICLE_SIZE_MIN + Math.random() * PARTICLE_SIZE_RANGE;
    }
    return s;
  }, [particleCount]);

  useFrame((state) => {
    if (!pointsRef.current || !isActive || !isPageVisible) return;

    const time = state.clock.elapsedTime;
    const geometry = pointsRef.current.geometry;
    const positionAttr = geometry.attributes.position;
    const posArray = positionAttr.array as Float32Array;

    // Breathing animation
    const breathe = Math.sin(time * BREATHE_SPEED) * BREATHE_SCALE;
    const breatheY = Math.sin(time * BREATHE_SPEED + 0.5) * BREATHE_Y_OFFSET;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      const ox = originalPositions[i3];
      const oy = originalPositions[i3 + 1];
      const oz = originalPositions[i3 + 2];

      // Apply breathing
      let x = ox * (1 + breathe);
      let y = oy + breatheY;
      let z = oz * (1 + breathe);

      // Gentle drift for organic feel
      const driftX = Math.sin(time * 0.3 + i * 0.1) * DRIFT_X_INTENSITY;
      const driftY = Math.cos(time * 0.25 + i * 0.15) * DRIFT_Y_INTENSITY;
      const driftZ = Math.sin(time * 0.35 + i * 0.12) * DRIFT_Z_INTENSITY;

      x += driftX;
      y += driftY;
      z += driftZ;

      // Audio-reactive mouth animation
      if (mouthRegion[i] > 0 && audioLevel > 0.05) {
        const rippleIntensity = audioLevel * mouthRegion[i];
        const rippleTime = time * 12;
        const distFromCenter = Math.sqrt(ox * ox + (oy + 0.15) * (oy + 0.15));
        const ripple = Math.sin(rippleTime - distFromCenter * 6) * rippleIntensity * 0.06;
        z += ripple;
        x += ox * rippleIntensity * 0.04;
      }

      posArray[i3] = x;
      posArray[i3 + 1] = y;
      posArray[i3 + 2] = z;
    }

    positionAttr.needsUpdate = true;

    // Update time uniform for shader
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
    }

    // Subtle head rotation
    pointsRef.current.rotation.y = Math.sin(time * ROTATION_SPEED) * ROTATION_AMPLITUDE;
  });

  const color = useMemo(() => new THREE.Color(themeColor), [themeColor]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uColor: { value: color },
          uTime: { value: 0 },
        }}
        vertexShader={`
          attribute float size;
          varying float vAlpha;
          varying float vSize;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (250.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;

            // Depth-based alpha for atmospheric depth
            vAlpha = smoothstep(-4.0, -1.5, mvPosition.z) * 0.7;
            vSize = size;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uTime;
          varying float vAlpha;
          varying float vSize;

          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;

            // Soft circular particle with glow
            float core = smoothstep(0.5, 0.1, dist);
            float glow = smoothstep(0.5, 0.0, dist) * 0.5;
            float alpha = (core + glow) * vAlpha;

            // Subtle color variation
            vec3 col = uColor * (0.9 + 0.1 * core);

            gl_FragColor = vec4(col, alpha * 0.6);
          }
        `}
      />
    </points>
  );
}
