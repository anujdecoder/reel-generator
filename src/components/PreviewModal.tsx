import React, { useRef, useEffect } from 'react';
import type { ImageItem, ReelConfig } from '../types';
import { ReelPreview } from './ReelPreview';
import './PreviewModal.css';

interface PreviewModalProps {
  images: ImageItem[];
  config: ReelConfig;
  onConfigChange: (config: ReelConfig) => void;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  images,
  config,
  onConfigChange,
  onClose,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Set up audio source when music is available
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && config.music) {
      audio.src = config.music.dataUrl;
      audio.volume = config.music.volume;
      audio.load(); // Explicitly load the audio
    }
  }, [config.music]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="preview-modal-header">
          <h2>🎬 Preview & Generate Video</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="preview-modal-body">
          <div className="preview-column">
            <h3>Preview</h3>
            <ReelPreview
              images={images}
              config={config}
              onConfigChange={onConfigChange}
              showPreviewOnly={true}
              audioRef={audioRef}
            />
          </div>

          <div className="settings-column">
            <h3>Settings & Export</h3>
            <ReelPreview
              images={images}
              config={config}
              onConfigChange={onConfigChange}
              showPreviewPlayer={false}
            />
          </div>
        </div>

        <audio ref={audioRef} preload="auto" />
      </div>
    </div>
  );
};
