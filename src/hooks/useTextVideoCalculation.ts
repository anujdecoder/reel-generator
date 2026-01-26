import { useMemo } from 'react';
import type { TextItem, TextAnimationConfig } from '../types';

export const useTextVideoCalculation = (texts: TextItem[], config: TextAnimationConfig) => {
  const videoDuration = useMemo(() => {
    if (texts.length === 0) return 0;
    // Sum up per-text durations (using default if not set)
    const totalMs = texts.reduce((sum, txt) => {
      const duration = txt.duration ?? config.textDuration;
      return sum + duration;
    }, 0);
    return totalMs / 1000; // Convert to seconds
  }, [texts, config.textDuration]);

  return { videoDuration };
};