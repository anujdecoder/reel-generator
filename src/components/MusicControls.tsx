import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playProgress, setPlayProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Use refs to store latest values for event handlers
  const musicRef = useRef(music);
  const videoDurationRef = useRef(videoDuration);
  const onMusicChangeRef = useRef(onMusicChange);
  
  // Keep refs updated
  useEffect(() => {
    musicRef.current = music;
    videoDurationRef.current = videoDuration;
    onMusicChangeRef.current = onMusicChange;
  }, [music, videoDuration, onMusicChange]);
  
  // Ensure end time is always start + videoDuration (capped at music duration)
  const effectiveEndTime = Math.min(music.startTime + videoDuration, music.duration);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = music.dataUrl;
      audioRef.current.volume = music.volume;
    }
  }, [music.dataUrl, music.volume]);

  // Update end time when video duration or start time changes
  useEffect(() => {
    const newEndTime = Math.min(music.startTime + videoDuration, music.duration);
    if (Math.abs(music.endTime - newEndTime) > 0.1) {
      onMusicChange({ ...music, endTime: newEndTime });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.startTime, videoDuration, music.duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const current = audio.currentTime;
      setCurrentTime(current);
      
      // Calculate progress within the selected range
      const rangeStart = music.startTime;
      const rangeEnd = effectiveEndTime;
      const progress = ((current - rangeStart) / (rangeEnd - rangeStart)) * 100;
      setPlayProgress(Math.min(100, Math.max(0, progress)));
      
      if (current >= effectiveEndTime) {
        audio.pause();
        audio.currentTime = music.startTime;
        setIsPlaying(false);
        setPlayProgress(0);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setPlayProgress(0);
      audio.currentTime = music.startTime;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [music.startTime, effectiveEndTime]);

  // Handle dragging the selection window
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    const currentMusic = musicRef.current;
    const currentVideoDuration = videoDurationRef.current;
    
    // Calculate new start time, keeping the selection window centered on the cursor
    const selectionWidthPercent = currentVideoDuration / currentMusic.duration;
    let newStartPercent = percentage - (selectionWidthPercent / 2);
    
    // Clamp to valid range
    newStartPercent = Math.max(0, Math.min(newStartPercent, 1 - selectionWidthPercent));
    
    const newStart = newStartPercent * currentMusic.duration;
    const newEnd = Math.min(newStart + currentVideoDuration, currentMusic.duration);
    
    onMusicChangeRef.current({ ...currentMusic, startTime: newStart, endTime: newEnd });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle click on track to move selection
  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    // Calculate new start time, centering the selection on click position
    const selectionWidthPercent = videoDuration / music.duration;
    let newStartPercent = percentage - (selectionWidthPercent / 2);
    
    // Clamp to valid range
    newStartPercent = Math.max(0, Math.min(newStartPercent, 1 - selectionWidthPercent));
    
    const newStart = newStartPercent * music.duration;
    const newEnd = Math.min(newStart + videoDuration, music.duration);
    
    onMusicChange({ ...music, startTime: newStart, endTime: newEnd });
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.currentTime = music.startTime;
      setPlayProgress(0);
      audio.play();
      setIsPlaying(true);
    }
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
    setPlayProgress(0);
    onMusicChange(undefined);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate the visual position of the selection window on the track
  const selectionStartPercent = (music.startTime / music.duration) * 100;
  const selectionWidthPercent = (videoDuration / music.duration) * 100;

  return (
    <div className="music-controls-inline">
      <div className="music-header">
        <div className="music-title">
          <span className="music-icon">🎵</span>
          <span className="music-name">{music.name}</span>
        </div>
        <div className="music-meta">
          <span className="music-info">
            Track: {formatTime(music.duration)} | Using: {formatTime(videoDuration)}
          </span>
        </div>
      </div>

      <div className="music-selector">
        <div className="selector-label">
          <span>Drag to select: {formatTime(music.startTime)} - {formatTime(effectiveEndTime)}</span>
        </div>
        
        {/* Visual track with draggable selection window */}
        <div className="track-visualizer">
          <div 
            className="track-bar" 
            ref={trackRef}
            onClick={handleTrackClick}
          >
            {/* Selection window indicator */}
            <div 
              className={`selection-window ${isDragging ? 'dragging' : ''}`}
              style={{
                left: `${selectionStartPercent}%`,
                width: `${Math.min(selectionWidthPercent, 100 - selectionStartPercent)}%`
              }}
              onMouseDown={handleMouseDown}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle indicators */}
              <div className="drag-handle">⋮⋮</div>
              
              {/* Playback progress inside selection */}
              {isPlaying && (
                <div 
                  className="play-progress"
                  style={{ width: `${playProgress}%` }}
                />
              )}
            </div>
          </div>
          <div className="track-labels">
            <span>0:00</span>
            <span>{formatTime(music.duration)}</span>
          </div>
        </div>
      </div>

      <div className="music-volume">
        <label>🔊 {Math.round(music.volume * 100)}%</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={music.volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
        />
      </div>

      <div className="music-actions">
        <button className="action-btn btn-preview-music" onClick={handlePlayPause}>
          {isPlaying ? '⏸ Pause' : '▶ Preview'}
        </button>
        {isPlaying && (
          <div className="playback-status">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="time-separator">/</span>
            <span className="end-time">{formatTime(effectiveEndTime)}</span>
          </div>
        )}
        <button className="action-btn btn-remove-music" onClick={handleRemoveMusic}>
          ✕ Remove
        </button>
      </div>

      <audio ref={audioRef} />
    </div>
  );
};
