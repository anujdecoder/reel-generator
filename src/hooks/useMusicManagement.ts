import { useCallback, useRef } from 'react';
import type { MusicTrack } from '../types';

interface UseMusicManagementProps<T extends { music?: MusicTrack }> {
  setConfig: React.Dispatch<React.SetStateAction<T>>;
  setShowMusicUpload: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useMusicManagement = <T extends { music?: MusicTrack }>({
  setConfig,
  setShowMusicUpload,
}: UseMusicManagementProps<T>) => {
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
