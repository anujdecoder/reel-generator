import { useCallback, useRef } from 'react';
import type { MusicTrack, ReelConfig } from '../types';

interface UseMusicManagementProps {
  setConfig: React.Dispatch<React.SetStateAction<ReelConfig>>;
  setShowMusicUpload: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useMusicManagement = ({
  setConfig,
  setShowMusicUpload,
}: UseMusicManagementProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleMusicChange = useCallback((music: MusicTrack | undefined) => {
    setConfig((prev) => ({ ...prev, music }));
    setShowMusicUpload(false);
    // Update audio element source
    if (audioRef.current) {
      if (music) {
        audioRef.current.src = music.dataUrl;
        audioRef.current.volume = music.volume;
      } else {
        audioRef.current.src = '';
        audioRef.current.pause();
      }
    }
  }, [setConfig, setShowMusicUpload]);

  return {
    audioRef,
    handleMusicChange,
  };
};
