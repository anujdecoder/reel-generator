import React, { useRef, useState, useEffect } from 'react';
import type { MusicTrack } from '../types';
import './MusicControls.css';

interface MusicControlsProps {
  music: MusicTrack;
  videoDuration: number;
  onMusicChange: (music: MusicTrack | undefined) => void;
}

export const MusicControls: React.FC<MusicControlsProps> = ({
  music,
  videoDuration,
  onMusicChange,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = music.dataUrl;
      audioRef.current.volume = music.volume;
    }
  }, [music.dataUrl, music.volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= music.endTime) {
        audio.pause();
        audio.currentTime = music.startTime;
        setIsPlaying(false);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      audio.currentTime = music.startTime;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [music.startTime, music.endTime]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

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
    const newStart = Math.min(value, music.endTime - 1);
    onMusicChange({ ...music, startTime: newStart });
  };

  const handleEndTimeChange = (value: number) => {
    const newEnd = Math.max(value, music.startTime + 1);
    onMusicChange({ ...music, endTime: newEnd });
  };

  const handleVolumeChange = (value: number) => {
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

  const selectedDuration = music.endTime - music.startTime;

  return (
    <div className="music-controls-inline">
      <div className="music-header">
        <div className="music-title">
          <span className="music-icon">🎵</span>
          <span className="music-name">{music.name}</span>
        </div>
        <div className="music-meta">
          <span className="music-duration">
            Duration: {formatTime(music.duration)} | Selected: {formatTime(selectedDuration)}
          </span>
          <span className="video-duration">
            Video: {formatTime(videoDuration)}
          </span>
        </div>
      </div>

      <div className="music-sliders">
        <div className="slider-group">
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

        <div className="slider-group">
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

        <div className="slider-group volume">
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
      </div>

      <div className="music-actions">
        <button className="preview-btn" onClick={handlePlayPause}>
          {isPlaying ? '⏸ Pause' : '▶ Preview'}
          {isPlaying && <span className="current-time"> ({formatTime(currentTime)})</span>}
        </button>
        <button className="remove-btn" onClick={handleRemoveMusic}>
          ✕ Remove
        </button>
      </div>

      <audio ref={audioRef} />
    </div>
  );
};
