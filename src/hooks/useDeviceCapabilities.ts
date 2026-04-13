import { useState, useEffect } from 'react';

interface DeviceCapabilities {
  isMobile: boolean;
  prefersReducedMotion: boolean;
  isPageVisible: boolean;
  particleCount: number;
  starCount: number;
}

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(() => {
    const isMobile = typeof window !== 'undefined' && (
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );

    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
      isMobile,
      prefersReducedMotion,
      isPageVisible: true,
      particleCount: isMobile ? 1800 : 4000,
      starCount: isMobile ? 100 : 200,
    };
  });

  useEffect(() => {
    // Handle page visibility
    const handleVisibilityChange = () => {
      setCapabilities(prev => ({
        ...prev,
        isPageVisible: document.visibilityState === 'visible',
      }));
    };

    // Handle reduced motion preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setCapabilities(prev => ({
        ...prev,
        prefersReducedMotion: e.matches,
      }));
    };

    // Handle resize for mobile detection
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setCapabilities(prev => ({
        ...prev,
        isMobile,
        particleCount: isMobile ? 1800 : 4000,
        starCount: isMobile ? 100 : 200,
      }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    motionQuery.addEventListener('change', handleMotionChange);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      motionQuery.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return capabilities;
}
