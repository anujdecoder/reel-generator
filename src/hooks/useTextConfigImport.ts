import { useCallback } from 'react';
import type { TextItem, TextAnimationConfig, MusicTrack } from '../types';

interface UseTextConfigImportProps {
  setTexts: React.Dispatch<React.SetStateAction<TextItem[]>>;
  setConfig: React.Dispatch<React.SetStateAction<TextAnimationConfig>>;
  setSelectedText: React.Dispatch<React.SetStateAction<TextItem | null>>;
}

export const useTextConfigImport = ({
  setTexts,
  setConfig,
  setSelectedText,
}: UseTextConfigImportProps) => {
  const handleConfigImport = useCallback((
    importedTexts: TextItem[],
    importedConfig: Partial<TextAnimationConfig>,
    importedMusic?: MusicTrack
  ) => {
    // Add imported texts
    setTexts(prev => [...prev, ...importedTexts]);

    // Apply config settings and music in a single update to avoid race conditions
    setConfig(prev => {
      const newConfig = { ...prev };

      // Apply imported config settings
      if (importedConfig.animationDuration !== undefined) {
        newConfig.animationDuration = importedConfig.animationDuration;
      }
      if (importedConfig.pauseDuration !== undefined) {
        newConfig.pauseDuration = importedConfig.pauseDuration;
      }
      if (importedConfig.animationType !== undefined) {
        newConfig.animationType = importedConfig.animationType;
      }
      if (importedConfig.videoDimensions !== undefined) {
        newConfig.videoDimensions = importedConfig.videoDimensions;
      }
      if (importedConfig.videoQuality !== undefined) {
        newConfig.videoQuality = importedConfig.videoQuality;
      }
      if (importedConfig.backgroundColor !== undefined) {
        newConfig.backgroundColor = importedConfig.backgroundColor;
      }

      // Apply music if provided
      if (importedMusic) {
        newConfig.music = importedMusic;
      }

      return newConfig;
    });

    // Audio will be set up automatically by useMusicManagement when config changes

    // Select first imported text
    if (importedTexts.length > 0) {
      setSelectedText(importedTexts[0]);
    }
  }, [setTexts, setConfig, setSelectedText]);

  return { handleConfigImport };
};