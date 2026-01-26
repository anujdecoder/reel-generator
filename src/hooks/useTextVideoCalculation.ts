import { useMemo } from 'react';
import type { TextItem, TextAnimationConfig } from '../types';

export const useTextVideoCalculation = (texts: TextItem[], config: TextAnimationConfig) => {
  const videoDuration = useMemo(() => {
    if (texts.length === 0) return 0;
    // Sum up per-text durations (animation + pause)
    const totalMs = texts.reduce((sum, txt) => {
      const animationDuration = txt.animationDuration ?? config.animationDuration;
      const pauseDuration = txt.pauseDuration ?? config.pauseDuration;
      return sum + animationDuration + pauseDuration;
    }, 0);
    return totalMs / 1000; // Convert to seconds
  }, [texts, config.animationDuration, config.pauseDuration]);

  return { videoDuration };
};