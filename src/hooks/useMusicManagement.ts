import { useCallback, useRef, useEffect } from 'react';
import type { MusicTrack } from '../types';

interface UseMusicManagementProps<T extends { music?: MusicTrack }> {
  config: T;
  setConfig: React.Dispatch<React.SetStateAction<T>>;
  setShowMusicUpload: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useMusicManagement = <T extends { music?: MusicTrack }>({
  config,
  setConfig,
  setShowMusicUpload,
}: UseMusicManagementProps<T>) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Set up audio when music changes in config
  useEffect(() => {
    if (audioRef.current && config.music) {
      audioRef.current.src = config.music.dataUrl;
      audioRef.current.volume = config.music.volume;
      audioRef.current.load();
    } else if (audioRef.current && !config.music) {
      audioRef.current.src = '';
      audioRef.current.pause();
    }
  }, [config.music]);

  const handleMusicChange = useCallback((music: MusicTrack | undefined) => {
    setConfig((prev) => ({ ...prev, music }));
    setShowMusicUpload(false);
    // Audio will be set up by the useEffect above
  }, [setConfig, setShowMusicUpload]);

  return {
    audioRef,
    handleMusicChange,
  };
};
