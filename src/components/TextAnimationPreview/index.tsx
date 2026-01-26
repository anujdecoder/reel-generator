import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Alert,
  LinearProgress,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip,
  Slider,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Movie as MovieIcon,
  HighQuality as HighQualityIcon,
} from '@mui/icons-material';
import type { TextItem, TextAnimationConfig, VideoFormat, VideoQuality, VideoDimensions } from '../../types';
import { VIDEO_DIMENSION_PRESETS } from '../../types';
import {
  convertWebmToMp4,
  isFFmpegSupported,
  getFFmpegSupportStatus,
  generateVideoWithFFmpeg,
  isDirectFFmpegEncodingSupported,
  QUALITY_PRESETS
} from '../../utils/videoConverter';

interface TextAnimationPreviewProps {
  texts: TextItem[];
  config: TextAnimationConfig;
  onConfigChange: (config: TextAnimationConfig) => void;
  showPreviewOnly?: boolean;
  showPreviewPlayer?: boolean;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export const TextAnimationPreview: React.FC<TextAnimationPreviewProps> = ({
  texts,
  config,
  onConfigChange,
  showPreviewOnly = false,
  showPreviewPlayer = true,
  audioRef,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [ffmpegSupported, setFfmpegSupported] = useState<boolean | null>(null);
  const [ffmpegStatus, setFfmpegStatus] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Calculate video duration and total frames
  const videoSpecs = useMemo(() => {
    const fps = 30;
    const totalDuration = texts.reduce((sum, text) => sum + text.duration, 0) / 1000; // in seconds
    const totalFrames = Math.ceil(totalDuration * fps);
    return { fps, totalDuration, totalFrames };
  }, [texts]);

  // Get canvas dimensions
  const canvasDimensions = useMemo(() => {
    const preset = VIDEO_DIMENSION_PRESETS[config.videoDimensions];
    return { width: preset.width, height: preset.height };
  }, [config.videoDimensions]);

  // Render text to canvas
  const renderTextToCanvas = useCallback((ctx: CanvasRenderingContext2D, text: TextItem, progress: number, dimensions: { width: number; height: number }) => {
    // Clear canvas with background color
    ctx.fillStyle = config.backgroundColor || '#000000';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Apply animation
    const animationStyle = getAnimationStyle(text, progress);

    // Set text properties
    ctx.fillStyle = text.fontColor;
    ctx.font = `${text.fontWeight} ${text.fontSize}px Arial`; // Using Arial as fallback
    ctx.textAlign = text.textAlign as CanvasTextAlign;
    ctx.textBaseline = 'middle';

    // Position text
    let x = dimensions.width / 2;
    let y = dimensions.height / 2;

    switch (text.position) {
      case 'top':
        y = dimensions.height * 0.25;
        break;
      case 'center':
        y = dimensions.height / 2;
        break;
      case 'bottom':
        y = dimensions.height * 0.75;
        break;
    }

    // Apply animation transformations
    ctx.save();
    ctx.translate(x, y);
    if (animationStyle.transform) {
      // Parse transform (simple implementation)
      if (animationStyle.transform.includes('translateX')) {
        const match = animationStyle.transform.match(/translateX\(([^)]+)px\)/);
        if (match) {
          const tx = parseFloat(match[1]);
          ctx.translate(tx, 0);
        }
      }
      if (animationStyle.transform.includes('scale')) {
        const match = animationStyle.transform.match(/scale\(([^)]+)\)/);
        if (match) {
          const scale = parseFloat(match[1]);
          ctx.scale(scale, scale);
        }
      }
    }
    ctx.globalAlpha = animationStyle.opacity || 1;

    // Render text
    const displayText = text.animationType === 'typewriter'
      ? text.content.substring(0, Math.floor(progress * text.content.length))
      : text.content;

    ctx.fillText(displayText, 0, 0);
    ctx.restore();
  }, [config.backgroundColor]);

  // Animation style helper
  const getAnimationStyle = (text: TextItem, progress: number) => {
    switch (text.animationType) {
      case 'fadeIn':
        return { opacity: progress };
      case 'slideIn':
        return {
          transform: `translateX(${(1 - progress) * 100}%)`,
          opacity: progress
        };
      case 'zoomIn':
        return {
          transform: `scale(${0.5 + progress * 0.5})`,
          opacity: progress
        };
      case 'bounce':
        const bounce = Math.sin(progress * Math.PI * 4) * (1 - progress) * 20;
        return {
          transform: `translateY(${bounce}px)`,
          opacity: progress
        };
      default:
        return { opacity: 1 };
    }
  };

  // Preview animation
  const startPreview = useCallback(() => {
    if (!canvasRef.current || texts.length === 0) return;

    setIsPlayingPreview(true);
    setCurrentTextIndex(0);
    setPreviewProgress(0);

    let startTime = Date.now();
    let currentIndex = 0;

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = Date.now();
      const elapsed = (now - startTime) / 1000; // in seconds

      // Calculate which text we're on and its progress
      let accumulatedTime = 0;
      for (let i = 0; i < texts.length; i++) {
        const textDuration = texts[i].duration / 1000;
        if (elapsed < accumulatedTime + textDuration) {
          currentIndex = i;
          const textElapsed = elapsed - accumulatedTime;
          const progress = textElapsed / textDuration;
          setCurrentTextIndex(i);
          setPreviewProgress(progress);
          renderTextToCanvas(ctx, texts[i], progress, canvasDimensions);
          break;
        }
        accumulatedTime += textDuration;
      }

      // Check if animation is complete
      if (elapsed >= videoSpecs.totalDuration) {
        setIsPlayingPreview(false);
        setCurrentTextIndex(0);
        setPreviewProgress(0);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, [texts, canvasDimensions, renderTextToCanvas, videoSpecs.totalDuration]);

  const stopPreview = useCallback(() => {
    setIsPlayingPreview(false);
    setCurrentTextIndex(0);
    setPreviewProgress(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Generate video
  const handleGenerateVideo = useCallback(async () => {
    if (!canvasRef.current || texts.length === 0) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationMessage('Preparing...');

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Prepare audio blob if music exists
      let audioBlob: Blob | null = null;
      if (config.music && audioRef?.current) {
        try {
          // Get audio data from the audio element
          const response = await fetch(audioRef.current.src);
          audioBlob = await response.blob();
        } catch (error) {
          console.warn('Could not load audio for video generation:', error);
        }
      }

      // Render frame function
      const renderFrame = (frameIndex: number) => {
        const timeInSeconds = frameIndex / videoSpecs.fps;

        // Find which text corresponds to this time
        let accumulatedTime = 0;
        for (let i = 0; i < texts.length; i++) {
          const textDuration = texts[i].duration / 1000;
          if (timeInSeconds < accumulatedTime + textDuration) {
            const textProgress = (timeInSeconds - accumulatedTime) / textDuration;
            renderTextToCanvas(ctx, texts[i], textProgress, canvasDimensions);
            break;
          }
          accumulatedTime += textDuration;
        }
      };

      // Generate video
      const videoBlob = await generateVideoWithFFmpeg(
        canvas,
        renderFrame,
        videoSpecs.totalFrames,
        videoSpecs.fps,
        audioBlob,
        config.music?.startTime || 0,
        config.music?.volume || 1,
        config.videoQuality,
        (progress) => {
          setGenerationProgress(progress.progress);
          setGenerationMessage(progress.message);
        }
      );

      // Convert to MP4 if needed
      let finalBlob = videoBlob;
      if (config.outputFormat === 'mp4') {
        setGenerationMessage('Converting to MP4...');
        finalBlob = await convertWebmToMp4(videoBlob, (progress) => {
          setGenerationProgress(90 + progress * 0.1);
        });
      }

      // Create download URL
      const url = URL.createObjectURL(finalBlob);
      setGeneratedVideoUrl(url);

      setGenerationMessage('Video ready for download!');
      setGenerationProgress(100);

    } catch (error) {
      console.error('Video generation failed:', error);
      setGenerationMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [texts, config, canvasDimensions, renderTextToCanvas, videoSpecs, audioRef]);

  // Check FFmpeg support
  useEffect(() => {
    const checkSupport = async () => {
      const envCheck = checkFFmpegEnvironment();
      setFfmpegSupported(envCheck.supported);
      setFfmpegStatus(envCheck.reason || 'FFmpeg ready');
    };
    checkSupport();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (generatedVideoUrl) {
        URL.revokeObjectURL(generatedVideoUrl);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [generatedVideoUrl]);

  const currentText = texts[currentTextIndex];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with controls */}
      {!showPreviewOnly && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            {/* Preview Controls */}
            {showPreviewPlayer && (
              <>
                <Button
                  variant="outlined"
                  startIcon={isPlayingPreview ? <PauseIcon /> : <PlayIcon />}
                  onClick={isPlayingPreview ? stopPreview : startPreview}
                  disabled={texts.length === 0}
                >
                  {isPlayingPreview ? 'Pause' : 'Play'}
                </Button>
                {isPlayingPreview && (
                  <Button variant="outlined" startIcon={<StopIcon />} onClick={stopPreview}>
                    Stop
                  </Button>
                )}
              </>
            )}

            {/* Generate Video */}
            <Tooltip title={ffmpegSupported === false ? ffmpegStatus : ''}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<MovieIcon />}
                  onClick={handleGenerateVideo}
                  disabled={isGenerating || texts.length === 0 || ffmpegSupported === false}
                >
                  Generate {config.outputFormat.toUpperCase()}
                  {ffmpegSupported === false && ' ⚠️'}
                </Button>
              </span>
            </Tooltip>

            {/* Settings */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Dimensions</InputLabel>
              <Select
                value={config.videoDimensions}
                label="Dimensions"
                onChange={(e) => onConfigChange({ ...config, videoDimensions: e.target.value as VideoDimensions })}
              >
                {Object.entries(VIDEO_DIMENSION_PRESETS).map(([key, preset]) => (
                  <MenuItem key={key} value={key}>
                    {preset.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Quality</InputLabel>
              <Select
                value={config.videoQuality}
                label="Quality"
                onChange={(e) => onConfigChange({ ...config, videoQuality: e.target.value as VideoQuality })}
              >
                {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
                  <MenuItem key={key} value={key}>
                    <Tooltip title={preset.description}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {key === 'maximum' && <HighQualityIcon fontSize="small" />}
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Box>
                    </Tooltip>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={config.useDirectEncoding}
                  onChange={(e) => onConfigChange({ ...config, useDirectEncoding: e.target.checked })}
                  size="small"
                />
              }
              label="High Quality"
            />
          </Stack>
        </Box>
      )}

      {/* Progress */}
      {(isGenerating || generatedVideoUrl) && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          {isGenerating && (
            <Stack spacing={1}>
              <Typography variant="body2">{generationMessage}</Typography>
              <LinearProgress variant="determinate" value={generationProgress} />
            </Stack>
          )}

          {generatedVideoUrl && (
            <Alert severity="success" sx={{ mb: 1 }}>
              Video generated successfully!
              <Button
                size="small"
                sx={{ ml: 1 }}
                href={generatedVideoUrl}
                download={`text-animation.${config.outputFormat}`}
              >
                Download
              </Button>
            </Alert>
          )}
        </Box>
      )}

      {/* Preview Canvas */}
      <Box sx={{ flex: 1, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#111' }}>
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'block',
            backgroundColor: config.backgroundColor || '#000000',
          }}
        />

        {/* Overlay info */}
        {showPreviewPlayer && currentText && isPlayingPreview && (
          <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
            <Chip
              label={`Text ${currentTextIndex + 1}/${texts.length}`}
              color="primary"
              variant="filled"
              size="small"
            />
          </Box>
        )}
      </Box>

      {/* Video playback (when generated) */}
      {generatedVideoUrl && videoRef.current && (
        <Box sx={{ flexShrink: 0, p: 2, borderTop: 1, borderColor: 'divider' }}>
          <video
            ref={videoRef}
            src={generatedVideoUrl}
            controls
            style={{ width: '100%', maxHeight: 200 }}
          />
        </Box>
      )}
    </Box>
  );
};