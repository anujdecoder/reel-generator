import { useCallback } from 'react';
import type { ImageItem, ReelConfig, MusicTrack } from '../types';

interface UseConfigImportProps {
  setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  setConfig: React.Dispatch<React.SetStateAction<ReelConfig>>;
  setSelectedImage: React.Dispatch<React.SetStateAction<ImageItem | null>>;
  setShowConfigImport: React.Dispatch<React.SetStateAction<boolean>>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export const useConfigImport = ({
  setImages,
  setConfig,
  setSelectedImage,
  setShowConfigImport,
  audioRef,
}: UseConfigImportProps) => {
  const handleConfigImport = useCallback((
    importedImages: ImageItem[], 
    importedConfig: Partial<ReelConfig>, 
    importedMusic?: MusicTrack
  ) => {
    // Add imported images
    setImages(prev => [...prev, ...importedImages]);
    
    // Apply config settings and music in a single update to avoid race conditions
    setConfig(prev => {
      const newConfig = { ...prev };
      
      // Apply imported config settings
      if (importedConfig.transitionDuration !== undefined) {
        newConfig.transitionDuration = importedConfig.transitionDuration;
      }
      if (importedConfig.imageDuration !== undefined) {
        newConfig.imageDuration = importedConfig.imageDuration;
      }
      if (importedConfig.transitionType !== undefined) {
        newConfig.transitionType = importedConfig.transitionType;
      }
      if (importedConfig.videoDimensions !== undefined) {
        newConfig.videoDimensions = importedConfig.videoDimensions;
      }
      if (importedConfig.videoQuality !== undefined) {
        newConfig.videoQuality = importedConfig.videoQuality;
      }
      
      // Apply music if provided
      if (importedMusic) {
        newConfig.music = importedMusic;
      }
      
      return newConfig;
    });
    
    // Set up audio element if music was provided
    if (importedMusic && audioRef.current) {
      audioRef.current.src = importedMusic.dataUrl;
      audioRef.current.volume = importedMusic.volume;
      audioRef.current.load();
    }
    
    // Select first imported image
    if (importedImages.length > 0) {
      setSelectedImage(importedImages[0]);
    }
    
    setShowConfigImport(false);
  }, [setImages, setConfig, setSelectedImage, setShowConfigImport, audioRef]);

  return { handleConfigImport };
};
