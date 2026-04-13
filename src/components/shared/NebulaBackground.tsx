import { useRef, useEffect, memo } from 'react';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';

interface NebulaBackgroundProps {
  /** Enable subtle color shifting animation */
  enableColorShift?: boolean;
  /** Intensity of the nebula glow (0-1) */
  intensity?: number;
  /** Custom class name */
  className?: string;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  hue: number;
  speed: number;
  baseHue: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export const NebulaBackground = memo(function NebulaBackground({
  enableColorShift = false,
  intensity = 1,
  className = '',
}: NebulaBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPageVisible, prefersReducedMotion, starCount } = useDeviceCapabilities();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI canvas setup
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize nebulae — cosmic color palette
    const nebulae: Nebula[] = [
      { x: 0.25, y: 0.35, radius: 0.45, hue: 260, baseHue: 260, speed: 0.00028 }, // Deep purple
      { x: 0.75, y: 0.55, radius: 0.38, hue: 225, baseHue: 225, speed: 0.00035 }, // Royal blue
      { x: 0.5, y: 0.72, radius: 0.32, hue: 280, baseHue: 280, speed: 0.00032 },  // Violet
      { x: 0.18, y: 0.82, radius: 0.28, hue: 205, baseHue: 205, speed: 0.00022 }, // Cyan-blue
    ];

    // Initialize stars
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.6 + 0.4,
        opacity: Math.random() * 0.55 + 0.18,
        twinkleSpeed: Math.random() * 0.018 + 0.004,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    let animationId: number;
    let time = 0;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      // Skip when hidden or reduced motion
      if (!isPageVisible || prefersReducedMotion) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      time += deltaTime;

      const width = window.innerWidth;
      const height = window.innerHeight;

      // Clear with void color
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, width, height);

      // Draw nebulae
      nebulae.forEach((nebula) => {
        // Subtle color drift
        if (enableColorShift) {
          nebula.hue = nebula.baseHue + Math.sin(time * 0.00008) * 12;
        }

        const offsetX = Math.sin(time * nebula.speed * 0.001) * 0.045;
        const offsetY = Math.cos(time * nebula.speed * 0.0007) * 0.028;
        const x = (nebula.x + offsetX) * width;
        const y = (nebula.y + offsetY) * height;
        const radius = nebula.radius * Math.min(width, height);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const alpha = intensity;
        gradient.addColorStop(0, `hsla(${nebula.hue}, 65%, 18%, ${0.16 * alpha})`);
        gradient.addColorStop(0.35, `hsla(${nebula.hue}, 55%, 14%, ${0.09 * alpha})`);
        gradient.addColorStop(0.65, `hsla(${nebula.hue}, 45%, 10%, ${0.04 * alpha})`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      });

      // Draw stars
      stars.forEach((star) => {
        const twinkle = Math.sin(time * star.twinkleSpeed * 0.001 + star.twinkleOffset) * 0.32 + 0.68;
        const opacity = star.opacity * twinkle;
        const x = star.x * width;
        const y = star.y * height;

        // Star glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, star.size * 2.5);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        gradient.addColorStop(0.4, `rgba(220, 225, 255, ${opacity * 0.45})`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(x, y, star.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    // Start animation
    animationId = requestAnimationFrame(animate);

    // Draw static frame if reduced motion
    if (prefersReducedMotion) {
      animate(performance.now());
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [isPageVisible, prefersReducedMotion, starCount, enableColorShift, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 nebula-canvas ${className}`}
      aria-hidden="true"
      role="presentation"
    />
  );
});
