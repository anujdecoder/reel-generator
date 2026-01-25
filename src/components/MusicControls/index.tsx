import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Slider,
  Stack,
  IconButton,
  alpha,
} from '@mui/material';
import {
  MusicNote as MusicNoteIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import type { MusicTrack } from '../../types';

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

  const handleVolumeChange = (_: Event, value: number | number[]) => {
    const vol = value as number;
    onMusicChange({ ...music, volume: vol });
    if (audioRef.current) {
      audioRef.current.volume = vol;
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
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
      {/* Music Info */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 180 }}>
        <MusicNoteIcon color="primary" />
        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {music.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Track: {formatTime(music.duration)} | Using: {formatTime(videoDuration)}
          </Typography>
        </Box>
      </Stack>

      {/* Track Selector */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Drag to select: {formatTime(music.startTime)} - {formatTime(effectiveEndTime)}
        </Typography>
        <Box
          ref={trackRef}
          onClick={handleTrackClick}
          sx={{
            position: 'relative',
            height: 32,
            bgcolor: 'action.hover',
            borderRadius: 1,
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          {/* Selection Window */}
          <Box
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${selectionStartPercent}%`,
              width: `${Math.min(selectionWidthPercent, 100 - selectionStartPercent)}%`,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.3),
              border: 2,
              borderColor: 'primary.main',
              borderRadius: 0.5,
              cursor: isDragging ? 'grabbing' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: isDragging ? 'none' : 'left 0.1s ease',
            }}
          >
            <DragIcon sx={{ color: 'primary.main', fontSize: 16 }} />
            
            {/* Play Progress */}
            {isPlaying && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${playProgress}%`,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.5),
                  borderRadius: 0.5,
                }}
              />
            )}
          </Box>
        </Box>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">0:00</Typography>
          <Typography variant="caption" color="text.secondary">{formatTime(music.duration)}</Typography>
        </Stack>
      </Box>

      {/* Playback Duration (shown when playing) */}
      {isPlaying && (
        <Typography variant="body2" color="primary" sx={{ minWidth: 80, textAlign: 'center', fontWeight: 500 }}>
          {formatTime(currentTime)} / {formatTime(effectiveEndTime)}
        </Typography>
      )}

      {/* Volume */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 120 }}>
        <VolumeIcon fontSize="small" color="action" />
        <Slider
          size="small"
          value={music.volume}
          min={0}
          max={1}
          step={0.05}
          onChange={handleVolumeChange}
          sx={{ width: 80 }}
        />
        <Typography variant="caption" sx={{ minWidth: 30 }}>
          {Math.round(music.volume * 100)}%
        </Typography>
      </Stack>

      {/* Actions */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          size="small"
          variant="outlined"
          startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />}
          onClick={handlePlayPause}
        >
          {isPlaying ? 'Pause' : 'Preview'}
        </Button>
        <IconButton size="small" color="error" onClick={handleRemoveMusic}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <audio ref={audioRef} />
    </Stack>
  );
};
