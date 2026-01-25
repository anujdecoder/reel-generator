import { useMemo } from 'react';
import type { ImageItem, ReelConfig } from '../types';

export const useVideoCalculation = (images: ImageItem[], config: ReelConfig) => {
  const videoDuration = useMemo(() => {
    if (images.length === 0) return 0;
    // Sum up per-image durations (using default if not set) plus transitions
    const totalMs = images.reduce((sum, img) => {
      const duration = img.duration ?? config.imageDuration;
      return sum + duration + config.transitionDuration;
    }, 0);
    return totalMs / 1000; // Convert to seconds
  }, [images, config.imageDuration, config.transitionDuration]);

  return { videoDuration };
};
