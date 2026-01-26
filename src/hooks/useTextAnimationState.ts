import { useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { TextItem, TextAnimationConfig } from '../types';

const DEFAULT_TEXT_CONFIG: TextAnimationConfig = {
  textDuration: 3000,
  animationType: 'fadeIn',
  outputFormat: 'mp4',
  videoQuality: 'high',
  useDirectEncoding: true,
  videoDimensions: '1080x1920',
  backgroundColor: '#000000',
};

export const useTextAnimationState = () => {
  const [config, setConfig] = useLocalStorage<TextAnimationConfig>('text-animation-config', DEFAULT_TEXT_CONFIG);
  const [selectedText, setSelectedText] = useState<TextItem | null>(null);
  const [showMusicUpload, setShowMusicUpload] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfigImport, setShowConfigImport] = useState(false);

  return {
    config,
    setConfig,
    selectedText,
    setSelectedText,
    showMusicUpload,
    setShowMusicUpload,
    showPreview,
    setShowPreview,
    showConfigImport,
    setShowConfigImport,
  };
};