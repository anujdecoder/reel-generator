import { useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { ImageItem, ReelConfig } from '../types';

const DEFAULT_CONFIG: ReelConfig = {
  transitionDuration: 500,
  imageDuration: 2000,
  transitionType: 'slide',
  outputFormat: 'mp4',
  videoQuality: 'high',
  useDirectEncoding: true,
  videoDimensions: '1080x1920',
};

export const useReelState = () => {
  const [config, setConfig] = useLocalStorage<ReelConfig>('reel-config', DEFAULT_CONFIG);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [showMusicUpload, setShowMusicUpload] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfigImport, setShowConfigImport] = useState(false);

  return {
    config,
    setConfig,
    selectedImage,
    setSelectedImage,
    showMusicUpload,
    setShowMusicUpload,
    showPreview,
    setShowPreview,
    showConfigImport,
    setShowConfigImport,
  };
};
