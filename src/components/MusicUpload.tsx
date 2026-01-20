import React, { useRef, useState, useEffect } from 'react';
import type { MusicTrack } from '../types';
import { generateId } from '../utils/helpers';
import './MusicUpload.css';

interface MusicUploadProps {
  music: MusicTrack | undefined;
  videoDuration: number; // in seconds
  onMusicChange: (music: MusicTrack | undefined) => void;
}

export const MusicUpload: React.FC<MusicUploadProps> = ({
  music,
  videoDuration,
  onMusicChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Update audio element when music changes
  useEffect(() => {
    if (audioRef.current && music) {
      audioRef.current.src = music.dataUrl;
      audioRef.current.volume = music.volume;
    }
  }, [music?.dataUrl]);

  // Update current time during playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Stop at end time
      if (music && audio.currentTime >= music.endTime) {
        audio.pause();
        audio.currentTime = music.startTime;
        setIsPlaying(false);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (music) {
        audio.currentTime = music.startTime;
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [music]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }

    setIsLoading(true);

    try {
      const dataUrl = await fileToDataUrl(file);
      const duration = await getAudioDuration(dataUrl);

      const newMusic: MusicTrack = {
        id: generateId(),
        name: file.name,
        dataUrl,
        duration,
        startTime: 0,
        endTime: Math.min(duration, videoDuration),
        volume: 0.7,
      };

      onMusicChange(newMusic);
    } catch (error) {
      console.error('Error loading audio:', error);
      alert('Error loading audio file');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getAudioDuration = (dataUrl: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = reject;
      audio.src = dataUrl;
    });
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !music) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.currentTime = music.startTime;
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleStartTimeChange = (value: number) => {
    if (!music) return;
    const newStart = Math.min(value, music.endTime - 1);
    onMusicChange({ ...music, startTime: newStart });
  };

  const handleEndTimeChange = (value: number) => {
    if (!music) return;
    const newEnd = Math.max(value, music.startTime + 1);
    onMusicChange({ ...music, endTime: newEnd });
  };

  const handleVolumeChange = (value: number) => {
    if (!music) return;
    onMusicChange({ ...music, volume: value });
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  const handleRemoveMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    onMusicChange(undefined);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedDuration = music ? music.endTime - music.startTime : 0;

  return (
    <div className="music-upload">
      <h4>🎵 Background Music</h4>
      
      {!music ? (
        <div className="music-upload-area" onClick={() => fileInputRef.current?.click()}>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {isLoading ? (
            <p>Loading audio...</p>
          ) : (
            <>
              <span className="music-icon">🎵</span>
              <p>Click to add background music</p>
              <span className="music-hint">MP3, WAV, OGG supported</span>
            </>
          )}
        </div>
      ) : (
        <div className="music-editor">
          <div className="music-info">
            <span className="music-name">🎵 {music.name}</span>
            <button className="remove-music-btn" onClick={handleRemoveMusic}>✕</button>
          </div>

          <div className="music-duration-info">
            <span>Video duration: {formatTime(videoDuration)}</span>
            <span>Selected: {formatTime(selectedDuration)}</span>
          </div>

          <div className="music-trimmer">
            <label>Start: {formatTime(music.startTime)}</label>
            <input
              type="range"
              min={0}
              max={music.duration}
              step={0.1}
              value={music.startTime}
              onChange={(e) => handleStartTimeChange(Number(e.target.value))}
            />
          </div>

          <div className="music-trimmer">
            <label>End: {formatTime(music.endTime)}</label>
            <input
              type="range"
              min={0}
              max={music.duration}
              step={0.1}
              value={music.endTime}
              onChange={(e) => handleEndTimeChange(Number(e.target.value))}
            />
          </div>

          <div className="music-volume">
            <label>Volume: {Math.round(music.volume * 100)}%</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={music.volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
            />
          </div>

          <div className="music-preview">
            <button className="preview-btn" onClick={handlePlayPause}>
              {isPlaying ? '⏸ Pause' : '▶ Preview'}
            </button>
            {isPlaying && (
              <span className="current-time">{formatTime(currentTime)}</span>
            )}
          </div>

          <audio ref={audioRef} />
        </div>
      )}
    </div>
  );
};
