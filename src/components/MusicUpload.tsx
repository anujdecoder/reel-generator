import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Slider,
  Stack,
  IconButton,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  MusicNote as MusicNoteIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
} from '@mui/icons-material';
import type { MusicTrack } from '../types';
import { generateId } from '../utils/helpers';

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

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <MusicNoteIcon fontSize="small" /> Background Music
      </Typography>
      
      {!music ? (
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: 2,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: isLoading ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
            },
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {isLoading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <MusicNoteIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography>Click to add background music</Typography>
              <Typography variant="caption" color="text.secondary">
                MP3, WAV, OGG supported
              </Typography>
            </>
          )}
        </Box>
      ) : (
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MusicNoteIcon fontSize="small" /> {music.name}
            </Typography>
            <IconButton size="small" color="error" onClick={handleRemoveMusic}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Video: {formatTime(videoDuration)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Selected: {formatTime(music.endTime - music.startTime)}
            </Typography>
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Start: {formatTime(music.startTime)}
            </Typography>
            <Slider
              size="small"
              value={music.startTime}
              min={0}
              max={music.duration}
              step={0.1}
              onChange={(_, v) => onMusicChange({ ...music, startTime: Math.min(v as number, music.endTime - 1) })}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              End: {formatTime(music.endTime)}
            </Typography>
            <Slider
              size="small"
              value={music.endTime}
              min={0}
              max={music.duration}
              step={0.1}
              onChange={(_, v) => onMusicChange({ ...music, endTime: Math.max(v as number, music.startTime + 1) })}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Volume: {Math.round(music.volume * 100)}%
            </Typography>
            <Slider
              size="small"
              value={music.volume}
              min={0}
              max={1}
              step={0.05}
              onChange={(_, v) => {
                onMusicChange({ ...music, volume: v as number });
                if (audioRef.current) audioRef.current.volume = v as number;
              }}
            />
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />}
              onClick={handlePlayPause}
            >
              {isPlaying ? 'Pause' : 'Preview'}
            </Button>
            {isPlaying && (
              <Typography variant="caption" color="text.secondary">
                {formatTime(currentTime)}
              </Typography>
            )}
          </Stack>

          <audio ref={audioRef} />
        </Stack>
      )}
    </Box>
  );
};
