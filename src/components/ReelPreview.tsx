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
import type { ImageItem, ReelConfig, TextOverlay, VideoFormat, VideoQuality, VideoDimensions } from '../types';
import { VIDEO_DIMENSION_PRESETS } from '../types';
import { 
  convertWebmToMp4, 
  isFFmpegSupported, 
  getFFmpegSupportStatus, 
  generateVideoWithFFmpeg, 
  isDirectFFmpegEncodingSupported,
  QUALITY_PRESETS 
} from '../utils/videoConverter';

interface ReelPreviewProps {
  images: ImageItem[];
  config: ReelConfig;
  onConfigChange: (config: ReelConfig) => void;
  showPreviewOnly?: boolean;
  showPreviewPlayer?: boolean;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export const ReelPreview: React.FC<ReelPreviewProps> = ({ 
  images, 
  config, 
  onConfigChange,
  showPreviewOnly = false,
  showPreviewPlayer = true,
  audioRef,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0); // Current playback time in ms
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [conversionStatus, setConversionStatus] = useState<string>('');
  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const playbackStartRef = useRef<number>(0); // When playback started
  const playbackOffsetRef = useRef<number>(0); // Time offset when paused/resumed
  
  // Get video dimensions from config
  const videoDimensions = useMemo(() => {
    const dims = config.videoDimensions || '1080x1920';
    return VIDEO_DIMENSION_PRESETS[dims] || VIDEO_DIMENSION_PRESETS['1080x1920'];
  }, [config.videoDimensions]);
  
  const ffmpegSupported = isFFmpegSupported();
  const ffmpegStatus = useMemo(() => getFFmpegSupportStatus(), []);

  // Calculate total video duration
  const totalDuration = useMemo(() => {
    if (images.length === 0) return 0;
    let total = 0;
    for (let i = 0; i < images.length; i++) {
      const duration = images[i]?.duration ?? config.imageDuration;
      // Last image has no transition
      const transitionDur = i === images.length - 1 ? 0 : config.transitionDuration;
      total += duration + transitionDur;
    }
    return total;
  }, [images, config.imageDuration, config.transitionDuration]);

  // Format time as mm:ss
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Load images for canvas rendering
  useEffect(() => {
    if (images.length === 0) {
      setLoadedImages([]);
      return;
    }

    const loadImages = async () => {
      const loaded = await Promise.all(
        images.map((img) => new Promise<HTMLImageElement>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => resolve(image); // Still resolve to maintain order
          image.src = img.croppedDataUrl || img.dataUrl;
        }))
      );
      setLoadedImages(loaded);
    };

    loadImages();
  }, [images]);

  // Render preview canvas frame
  const renderPreviewFrame = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || loadedImages.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video dimensions
    canvas.width = videoDimensions.width;
    canvas.height = videoDimensions.height;

    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear with black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const currentImage = loadedImages[currentIndex];
    if (!currentImage) return;

    const isLastImage = currentIndex === loadedImages.length - 1;

    // Check if we're in transition phase
    if (isTransitioning && !isLastImage && transitionProgress > 0) {
      const nextIndex = currentIndex + 1;
      const nextImage = loadedImages[nextIndex];
      const transitionType = images[currentIndex]?.transitionType ?? config.transitionType;

      switch (transitionType) {
        case 'fade': {
          // Draw next image first
          if (nextImage) {
            drawImageCover(ctx, nextImage, canvas.width, canvas.height);
            if (images[nextIndex]?.textOverlay) {
              drawTextOverlay(ctx, images[nextIndex].textOverlay!, canvas.width, canvas.height);
            }
          }
          // Draw current image with fading alpha
          ctx.globalAlpha = 1 - transitionProgress;
          drawImageCover(ctx, currentImage, canvas.width, canvas.height);
          if (images[currentIndex]?.textOverlay) {
            drawTextOverlay(ctx, images[currentIndex].textOverlay!, canvas.width, canvas.height);
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'slide': {
          const offset = transitionProgress * canvas.width;
          ctx.save();
          ctx.translate(-offset, 0);
          drawImageCover(ctx, currentImage, canvas.width, canvas.height);
          if (images[currentIndex]?.textOverlay) {
            drawTextOverlay(ctx, images[currentIndex].textOverlay!, canvas.width, canvas.height);
          }
          ctx.restore();
          if (nextImage) {
            ctx.save();
            ctx.translate(canvas.width - offset, 0);
            drawImageCover(ctx, nextImage, canvas.width, canvas.height);
            if (images[nextIndex]?.textOverlay) {
              drawTextOverlay(ctx, images[nextIndex].textOverlay!, canvas.width, canvas.height);
            }
            ctx.restore();
          }
          break;
        }
        case 'zoom': {
          const scale = 1 + transitionProgress * 0.5;
          ctx.save();
          ctx.globalAlpha = 1 - transitionProgress;
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
          drawImageCover(ctx, currentImage, canvas.width, canvas.height);
          if (images[currentIndex]?.textOverlay) {
            drawTextOverlay(ctx, images[currentIndex].textOverlay!, canvas.width, canvas.height);
          }
          ctx.restore();
          if (nextImage) {
            ctx.save();
            ctx.globalAlpha = transitionProgress;
            drawImageCover(ctx, nextImage, canvas.width, canvas.height);
            if (images[nextIndex]?.textOverlay) {
              drawTextOverlay(ctx, images[nextIndex].textOverlay!, canvas.width, canvas.height);
            }
            ctx.restore();
          }
          ctx.globalAlpha = 1;
          break;
        }
        default: {
          // No transition - just show current
          drawImageCover(ctx, currentImage, canvas.width, canvas.height);
          if (images[currentIndex]?.textOverlay) {
            drawTextOverlay(ctx, images[currentIndex].textOverlay!, canvas.width, canvas.height);
          }
        }
      }
    } else {
      // Not transitioning - just show current image
      drawImageCover(ctx, currentImage, canvas.width, canvas.height);
      if (images[currentIndex]?.textOverlay) {
        drawTextOverlay(ctx, images[currentIndex].textOverlay!, canvas.width, canvas.height);
      }
    }
  }, [loadedImages, currentIndex, isTransitioning, transitionProgress, images, videoDimensions, config.transitionType]);

  // Update preview canvas when state changes
  useEffect(() => {
    renderPreviewFrame();
  }, [renderPreviewFrame]);

  // Animate transitions
  useEffect(() => {
    if (!isTransitioning) {
      setTransitionProgress(0);
      return;
    }

    const startTime = Date.now();
    const duration = config.transitionDuration;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setTransitionProgress(progress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isTransitioning, config.transitionDuration]);

  const timeoutRef2 = useRef<number | null>(null);
  
  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (timeoutRef2.current) {
      clearTimeout(timeoutRef2.current);
      timeoutRef2.current = null;
    }
  }, []);

  const getImageDuration = useCallback((index: number) => {
    return images[index]?.duration ?? config.imageDuration;
  }, [images, config.imageDuration]);

  // Main playback effect - runs continuously while playing
  useEffect(() => {
    if (!isPlaying || images.length === 0) return;
    
    const idx = currentIndex;
    const isLastImage = idx === images.length - 1;
    
    // Clear any existing timeouts
    clearAllTimeouts();
    
    if (isLastImage) {
      // Last image - stop after its duration
      timeoutRef.current = window.setTimeout(() => {
        setIsPlaying(false);
        playbackOffsetRef.current = totalDuration;
        setPlaybackTime(totalDuration);
        if (audioRef?.current) {
          audioRef.current.pause();
        }
      }, getImageDuration(idx));
    } else {
      // Not last image - show for duration, then transition to next
      timeoutRef.current = window.setTimeout(() => {
        // Start transition
        setIsTransitioning(true);
        
        timeoutRef2.current = window.setTimeout(() => {
          // End transition, move to next image
          setIsTransitioning(false);
          setCurrentIndex(prev => prev + 1);
        }, config.transitionDuration);
      }, getImageDuration(idx));
    }
    
    return clearAllTimeouts;
  }, [isPlaying, currentIndex, images.length, config.transitionDuration, getImageDuration, audioRef, totalDuration, clearAllTimeouts]);

  // Track playback time while playing
  useEffect(() => {
    if (!isPlaying) return;

    playbackStartRef.current = Date.now();
    
    const updatePlaybackTime = () => {
      const elapsed = Date.now() - playbackStartRef.current;
      const currentTime = playbackOffsetRef.current + elapsed;
      
      if (currentTime >= totalDuration) {
        setPlaybackTime(totalDuration);
        return;
      }
      
      setPlaybackTime(currentTime);
      animationRef.current = requestAnimationFrame(updatePlaybackTime);
    };

    animationRef.current = requestAnimationFrame(updatePlaybackTime);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  const handlePlayPause = () => {
    if (isPlaying) {
      // Pausing - save current position
      playbackOffsetRef.current = playbackTime;
      setIsPlaying(false);
      clearAllTimeouts();
      if (audioRef?.current) {
        audioRef.current.pause();
      }
    } else {
      // Playing - start from current position
      setIsPlaying(true);
      if (audioRef?.current && config.music) {
        const audio = audioRef.current;
        if (audio.src !== config.music.dataUrl) {
          audio.src = config.music.dataUrl;
          audio.load();
        }
        audio.volume = config.music.volume;
        audio.currentTime = config.music.startTime + (playbackTime / 1000);
        setTimeout(() => {
          audio.play().catch(console.error);
        }, 50);
      }
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setIsTransitioning(false);
    setPlaybackTime(0);
    playbackOffsetRef.current = 0;
    clearAllTimeouts();
    if (audioRef?.current && config.music) {
      audioRef.current.pause();
      audioRef.current.currentTime = config.music.startTime;
    }
  };

  const generateVideo = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);
    setGenerationProgress(0);

    const canvas = canvasRef.current;
    if (!canvas) { setIsGenerating(false); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { setIsGenerating(false); return; }

    // Set high-quality canvas rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Use dimensions from config
    canvas.width = videoDimensions.width;
    canvas.height = videoDimensions.height;

    const fps = 30;
    const loadedImages: HTMLImageElement[] = await Promise.all(
      images.map((img) => new Promise<HTMLImageElement>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = img.croppedDataUrl || img.dataUrl;
      }))
    );

    const videoQuality = config.videoQuality || 'high';
    const useDirectEncoding = config.useDirectEncoding !== false;

    try {
      // Check if we should use direct FFmpeg encoding (best quality)
      const canUseDirectEncoding = config.outputFormat === 'mp4' && 
                                    ffmpegSupported && 
                                    useDirectEncoding && 
                                    isDirectFFmpegEncodingSupported();

      let finalBlob: Blob;
      let filename: string;

      if (canUseDirectEncoding) {
        // Use advanced direct FFmpeg encoding for best quality
        setConversionStatus('Generating high-quality video...');
        console.log('[Video] Using direct FFmpeg encoding for best quality');

        // Calculate timeline for frame rendering
        const { timeline, totalDuration } = buildTimeline(images, config);
        const totalFrames = Math.ceil(totalDuration / (1000 / fps));

        // Prepare audio if available
        let audioBlob: Blob | null = null;
        if (config.music) {
          const response = await fetch(config.music.dataUrl);
          audioBlob = await response.blob();
        }

        // Create frame renderer function
        const renderFrameFunc = (frameIndex: number) => {
          const currentTime = frameIndex * (1000 / fps);
          renderFrameAtTime(ctx, canvas, loadedImages, images, timeline, currentTime);
        };

        finalBlob = await generateVideoWithFFmpeg(
          canvas,
          renderFrameFunc,
          totalFrames,
          fps,
          audioBlob,
          config.music?.startTime || 0,
          config.music?.volume || 1,
          videoQuality,
          (progress) => {
            setConversionStatus(progress.message);
            if (progress.phase === 'converting') setGenerationProgress(progress.progress);
          }
        );
        filename = `reel-${Date.now()}.mp4`;
      } else {
        // Fallback to MediaRecorder method
        setConversionStatus('Creating video...');
        const webmBlob = await createWebMVideo(canvas, loadedImages, images, config, fps, setGenerationProgress, videoQuality);
        
        if (config.outputFormat === 'mp4' && ffmpegSupported) {
          try {
            setConversionStatus('Converting to MP4...');
            setGenerationProgress(0);
            finalBlob = await convertWebmToMp4(webmBlob, (progress) => {
              setConversionStatus(progress.message);
              if (progress.phase === 'converting') setGenerationProgress(progress.progress);
            }, videoQuality);
            filename = `reel-${Date.now()}.mp4`;
          } catch {
            finalBlob = webmBlob;
            filename = `reel-${Date.now()}.webm`;
          }
        } else {
          finalBlob = webmBlob;
          filename = `reel-${Date.now()}.webm`;
        }
      }
      
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating video:', error);
      alert('Error generating video. ' + (error instanceof Error ? error.message : ''));
    }

    setIsGenerating(false);
    setGenerationProgress(0);
    setConversionStatus('');
  };

  // Preview Only Mode - Uses canvas to show exact video output
  if (showPreviewOnly) {
    // Calculate scaled dimensions to fit in preview area while maintaining aspect ratio
    const maxPreviewHeight = 450;
    const maxPreviewWidth = 320;
    const aspectRatio = videoDimensions.width / videoDimensions.height;
    
    let previewWidth: number;
    let previewHeight: number;
    
    if (aspectRatio > maxPreviewWidth / maxPreviewHeight) {
      // Width constrained
      previewWidth = maxPreviewWidth;
      previewHeight = maxPreviewWidth / aspectRatio;
    } else {
      // Height constrained
      previewHeight = maxPreviewHeight;
      previewWidth = maxPreviewHeight * aspectRatio;
    }

    return (
      <Box>
        <Box 
          sx={{ 
            position: 'relative', 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#1a1a1a',
            borderRadius: 2,
            p: 1,
            minHeight: maxPreviewHeight + 20,
          }}
        >
          {images.length === 0 ? (
            <Box sx={{ 
              width: previewWidth, 
              height: previewHeight, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'black',
              borderRadius: 1,
            }}>
              <Typography color="text.secondary">Add images to preview</Typography>
            </Box>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <canvas
                ref={previewCanvasRef}
                style={{
                  width: previewWidth,
                  height: previewHeight,
                  borderRadius: 4,
                  display: 'block',
                }}
              />
              <Chip 
                label={`${currentIndex + 1} / ${images.length}`} 
                size="small" 
                sx={{ 
                  position: 'absolute', 
                  bottom: 8, 
                  right: 8, 
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                }} 
              />
              <Chip 
                label={`${videoDimensions.label} (${videoDimensions.aspectRatio})`} 
                size="small" 
                sx={{ 
                  position: 'absolute', 
                  top: 8, 
                  left: 8, 
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  fontSize: '0.7rem',
                }} 
              />
            </Box>
          )}
        </Box>

        {/* Time bar / Progress bar */}
        {images.length > 0 && (
          <Box sx={{ mt: 2, px: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ minWidth: 40, color: 'text.secondary' }}>
                {formatTime(playbackTime)}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={totalDuration > 0 ? (playbackTime / totalDuration) * 100 : 0}
                sx={{ 
                  flex: 1, 
                  height: 6, 
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                  }
                }}
              />
              <Typography variant="caption" sx={{ minWidth: 40, color: 'text.secondary', textAlign: 'right' }}>
                {formatTime(totalDuration)}
              </Typography>
            </Stack>
          </Box>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="center">
          <Button variant="contained" startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />} onClick={handlePlayPause} disabled={images.length === 0}>
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button variant="outlined" startIcon={<StopIcon />} onClick={handleStop} disabled={images.length === 0 || (!isPlaying && currentIndex === 0 && playbackTime === 0)}>
            Stop
          </Button>
        </Stack>
      </Box>
    );
  }

  // Controls Only Mode
  if (!showPreviewPlayer) {
    return (
      <Stack spacing={2}>
        {/* Transition Duration */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Transition Duration: {(config.transitionDuration / 1000).toFixed(1)}s
          </Typography>
          <Slider 
            value={config.transitionDuration} 
            min={100} 
            max={2000} 
            step={100} 
            onChange={(_, v) => onConfigChange({ ...config, transitionDuration: v as number })}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${(v / 1000).toFixed(1)}s`}
            size="small"
          />
        </Box>

        <FormControl size="small">
          <InputLabel>Video Dimensions</InputLabel>
          <Select 
            value={config.videoDimensions || '1080x1920'} 
            label="Video Dimensions" 
            onChange={(e) => onConfigChange({ ...config, videoDimensions: e.target.value as VideoDimensions })}
          >
            {Object.entries(VIDEO_DIMENSION_PRESETS).map(([key, preset]) => (
              <MenuItem key={key} value={key}>
                <Stack>
                  <Typography variant="body2">
                    {preset.label} ({preset.aspectRatio})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {preset.description}
                  </Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Output Format</InputLabel>
          <Select value={config.outputFormat} label="Output Format" onChange={(e) => onConfigChange({ ...config, outputFormat: e.target.value as VideoFormat })}>
            <MenuItem value="mp4">MP4 {ffmpegSupported ? '✓' : '⚠️'}</MenuItem>
            <MenuItem value="webm">WebM</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Video Quality</InputLabel>
          <Select 
            value={config.videoQuality || 'high'} 
            label="Video Quality" 
            onChange={(e) => onConfigChange({ ...config, videoQuality: e.target.value as VideoQuality })}
          >
            <MenuItem value="standard">
              Standard ({QUALITY_PRESETS.standard.description})
            </MenuItem>
            <MenuItem value="high">
              High ({QUALITY_PRESETS.high.description})
            </MenuItem>
            <MenuItem value="maximum">
              Maximum ({QUALITY_PRESETS.maximum.description})
            </MenuItem>
          </Select>
        </FormControl>

        {config.outputFormat === 'mp4' && ffmpegSupported && (
          <Tooltip title="Direct encoding generates frames and encodes them with FFmpeg for the highest quality. Disable for faster (but lower quality) MediaRecorder encoding.">
            <FormControlLabel
              control={
                <Switch
                  checked={config.useDirectEncoding !== false}
                  onChange={(e) => onConfigChange({ ...config, useDirectEncoding: e.target.checked })}
                  color="primary"
                />
              }
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <HighQualityIcon fontSize="small" />
                  <Typography variant="body2">High-Quality Encoding</Typography>
                </Stack>
              }
            />
          </Tooltip>
        )}

        {config.outputFormat === 'mp4' && !ffmpegSupported && (
          <Alert severity="warning" sx={{ py: 0 }}>{ffmpegStatus.message}</Alert>
        )}
        {config.outputFormat === 'mp4' && ffmpegSupported && (
          <Alert severity="success" sx={{ py: 0 }}>
            {config.useDirectEncoding !== false 
              ? '✓ High-quality MP4 export ready (direct encoding)' 
              : '✓ MP4 export ready'}
          </Alert>
        )}

        <Button variant="contained" size="large" startIcon={<MovieIcon />} onClick={generateVideo} disabled={images.length < 2 || isGenerating} fullWidth>
          {isGenerating 
            ? (conversionStatus || `Generating... ${generationProgress}%`) 
            : `Generate ${config.outputFormat === 'mp4' && ffmpegSupported ? 'MP4' : 'Video'} (${(config.videoQuality || 'high').charAt(0).toUpperCase() + (config.videoQuality || 'high').slice(1)} Quality)`}
        </Button>

        {isGenerating && <LinearProgress variant="determinate" value={generationProgress} />}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </Stack>
    );
  }

  return null;
};

// Helper functions
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvasWidth: number, canvasHeight: number) {
  // Enable high-quality image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  const imgRatio = img.width / img.height;
  const canvasRatio = canvasWidth / canvasHeight;
  let drawWidth, drawHeight, offsetX, offsetY;

  if (imgRatio > canvasRatio) {
    drawHeight = canvasHeight;
    drawWidth = img.width * (canvasHeight / img.height);
    offsetX = (canvasWidth - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = canvasWidth;
    drawHeight = img.height * (canvasWidth / img.width);
    offsetX = 0;
    offsetY = (canvasHeight - drawHeight) / 2;
  }

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

function drawTextOverlay(ctx: CanvasRenderingContext2D, overlay: TextOverlay, canvasWidth: number, canvasHeight: number) {
  const padding = 40;
  const fontSize = overlay.fontSize;
  
  ctx.font = `${overlay.fontWeight} ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = overlay.textAlign;
  ctx.textBaseline = 'middle';

  const maxWidth = canvasWidth - padding * 2;
  const lines = wrapText(ctx, overlay.text, maxWidth);
  const lineHeight = fontSize * 1.3;
  const totalTextHeight = lines.length * lineHeight;
  const bgPadding = 30;
  const bgHeight = totalTextHeight + bgPadding * 2;

  let bgY: number;
  switch (overlay.position) {
    case 'top': bgY = 0; break;
    case 'center': bgY = (canvasHeight - bgHeight) / 2; break;
    case 'bottom': default: bgY = canvasHeight - bgHeight; break;
  }

  ctx.fillStyle = overlay.backgroundColor;
  ctx.fillRect(0, bgY, canvasWidth, bgHeight);

  ctx.fillStyle = overlay.fontColor;
  
  let textX: number;
  switch (overlay.textAlign) {
    case 'left': textX = padding; break;
    case 'right': textX = canvasWidth - padding; break;
    case 'center': default: textX = canvasWidth / 2; break;
  }

  const textStartY = bgY + bgPadding + lineHeight / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, textStartY + index * lineHeight);
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  paragraphs.forEach(paragraph => {
    const words = paragraph.split(' ');
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) lines.push(currentLine);
  });

  return lines.length > 0 ? lines : [''];
}

// Timeline segment interface
interface TimelineSegment {
  startTime: number;
  imageDuration: number;
  transitionDuration: number;
  transitionType: string;
  imageIndex: number;
}

// Build timeline from images and config
// Last image has no transition - video ends after displaying it
function buildTimeline(
  imageItems: ImageItem[],
  config: ReelConfig
): { timeline: TimelineSegment[]; totalDuration: number } {
  const timeline: TimelineSegment[] = [];
  let currentTime = 0;
  const lastIndex = imageItems.length - 1;
  
  for (let i = 0; i < imageItems.length; i++) {
    const img = imageItems[i];
    const duration = img.duration ?? config.imageDuration;
    const transitionType = img.transitionType ?? config.transitionType;
    
    // Last image has no transition
    const isLastImage = i === lastIndex;
    const transitionDuration = isLastImage ? 0 : config.transitionDuration;
    
    timeline.push({
      startTime: currentTime,
      imageDuration: duration,
      transitionDuration,
      transitionType: isLastImage ? 'none' : transitionType,
      imageIndex: i,
    });
    
    currentTime += duration + transitionDuration;
  }
  
  return { timeline, totalDuration: currentTime };
}

// Find segment at a given time
function findSegment(timeline: TimelineSegment[], time: number): { segment: TimelineSegment; timeInSegment: number } | null {
  for (const segment of timeline) {
    const segmentEnd = segment.startTime + segment.imageDuration + segment.transitionDuration;
    if (time >= segment.startTime && time < segmentEnd) {
      return { segment, timeInSegment: time - segment.startTime };
    }
  }
  return null;
}

// Render a single frame at a specific time
function renderFrameAtTime(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  loadedImages: HTMLImageElement[],
  imageItems: ImageItem[],
  timeline: TimelineSegment[],
  currentTime: number
) {
  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Clear with black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const segmentInfo = findSegment(timeline, currentTime);
  if (!segmentInfo) return;

  const { segment, timeInSegment } = segmentInfo;
  const imageIndex = segment.imageIndex;
  const isLastImage = imageIndex === loadedImages.length - 1;
  const currentImage = loadedImages[imageIndex];

  // If this is the last image or we're in the display phase, just show the current image
  if (isLastImage || timeInSegment < segment.imageDuration) {
    drawImageCover(ctx, currentImage, canvas.width, canvas.height);
    if (imageItems[imageIndex].textOverlay) {
      drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
    }
    return;
  }

  // Transition phase (only for non-last images)
  const nextIndex = imageIndex + 1;
  const nextImage = loadedImages[nextIndex];
  const transitionProgress = (timeInSegment - segment.imageDuration) / segment.transitionDuration;

  switch (segment.transitionType) {
    case 'fade': {
      drawImageCover(ctx, nextImage, canvas.width, canvas.height);
      if (imageItems[nextIndex].textOverlay) {
        drawTextOverlay(ctx, imageItems[nextIndex].textOverlay!, canvas.width, canvas.height);
      }
      ctx.globalAlpha = 1 - transitionProgress;
      drawImageCover(ctx, currentImage, canvas.width, canvas.height);
      if (imageItems[imageIndex].textOverlay) {
        drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'slide': {
      const offset = transitionProgress * canvas.width;
      ctx.save();
      ctx.translate(-offset, 0);
      drawImageCover(ctx, currentImage, canvas.width, canvas.height);
      if (imageItems[imageIndex].textOverlay) {
        drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
      }
      ctx.restore();
      ctx.save();
      ctx.translate(canvas.width - offset, 0);
      drawImageCover(ctx, nextImage, canvas.width, canvas.height);
      if (imageItems[nextIndex].textOverlay) {
        drawTextOverlay(ctx, imageItems[nextIndex].textOverlay!, canvas.width, canvas.height);
      }
      ctx.restore();
      break;
    }
    case 'zoom': {
      const scale = 1 + transitionProgress * 0.5;
      ctx.save();
      ctx.globalAlpha = 1 - transitionProgress;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      drawImageCover(ctx, currentImage, canvas.width, canvas.height);
      if (imageItems[imageIndex].textOverlay) {
        drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = transitionProgress;
      drawImageCover(ctx, nextImage, canvas.width, canvas.height);
      if (imageItems[nextIndex].textOverlay) {
        drawTextOverlay(ctx, imageItems[nextIndex].textOverlay!, canvas.width, canvas.height);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      break;
    }
    default: {
      // No transition - instant switch
      const showNext = transitionProgress >= 0.5;
      const imgToShow = showNext ? nextImage : currentImage;
      const overlayData = showNext ? imageItems[nextIndex].textOverlay : imageItems[imageIndex].textOverlay;
      drawImageCover(ctx, imgToShow, canvas.width, canvas.height);
      if (overlayData) {
        drawTextOverlay(ctx, overlayData, canvas.width, canvas.height);
      }
    }
  }
}

async function createWebMVideo(
  canvas: HTMLCanvasElement,
  loadedImages: HTMLImageElement[],
  imageItems: ImageItem[],
  config: ReelConfig,
  fps: number,
  onProgress: (progress: number) => void,
  videoQuality: VideoQuality = 'high'
): Promise<Blob> {
  const ctx = canvas.getContext('2d')!;
  
  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  const frameDuration = 1000 / fps;
  const { timeline, totalDuration } = buildTimeline(imageItems, config);
  const totalFrames = Math.ceil(totalDuration / frameDuration);

  let audioContext: AudioContext | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  let audioSource: AudioBufferSourceNode | null = null;

  if (config.music) {
    try {
      audioContext = new AudioContext();
      audioDestination = audioContext.createMediaStreamDestination();
      const response = await fetch(config.music.dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer;
      const gainNode = audioContext.createGain();
      gainNode.gain.value = config.music.volume;
      audioSource.connect(gainNode);
      gainNode.connect(audioDestination);
      audioSource.start(0, config.music.startTime);
    } catch (error) {
      console.error('Error setting up audio:', error);
      audioContext = null;
    }
  }

  const videoStream = canvas.captureStream(fps);
  let combinedStream: MediaStream;
  
  if (audioDestination) {
    combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);
  } else {
    combinedStream = videoStream;
  }

  const mimeType = audioDestination
    ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm')
    : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');

  // Use quality presets for bitrate
  const qualitySettings = QUALITY_PRESETS[videoQuality];
  console.log(`[WebM] Using ${videoQuality} quality, bitrate: ${qualitySettings.bitrate}bps`);
  
  const mediaRecorder = new MediaRecorder(combinedStream, { 
    mimeType, 
    videoBitsPerSecond: qualitySettings.bitrate,
    audioBitsPerSecond: 192000  // Higher audio bitrate
  });
  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const findSegmentForTime = (time: number): { segment: TimelineSegment; timeInSegment: number } | null => {
    for (const segment of timeline) {
      const segmentEnd = segment.startTime + segment.imageDuration + segment.transitionDuration;
      if (time >= segment.startTime && time < segmentEnd) {
        return { segment, timeInSegment: time - segment.startTime };
      }
    }
    return null;
  };

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      if (audioSource) audioSource.stop();
      if (audioContext) audioContext.close();
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    mediaRecorder.start();

    let frame = 0;
    const renderFrame = () => {
      if (frame >= totalFrames) { mediaRecorder.stop(); return; }

      const currentTime = frame * frameDuration;
      const segmentInfo = findSegmentForTime(currentTime);
      
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (segmentInfo) {
        const { segment, timeInSegment } = segmentInfo;
        const imageIndex = segment.imageIndex;
        const isLastImage = imageIndex === loadedImages.length - 1;
        const currentImage = loadedImages[imageIndex];

        // If this is the last image or we're in the display phase, just show the current image
        if (isLastImage || timeInSegment < segment.imageDuration) {
          drawImageCover(ctx, currentImage, canvas.width, canvas.height);
          if (imageItems[imageIndex].textOverlay) {
            drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
          }
        } else {
          // Transition phase (only for non-last images)
          const nextIndex = imageIndex + 1;
          const nextImage = loadedImages[nextIndex];
          const transitionProgress = (timeInSegment - segment.imageDuration) / segment.transitionDuration;

          switch (segment.transitionType) {
            case 'fade': {
              drawImageCover(ctx, nextImage, canvas.width, canvas.height);
              if (imageItems[nextIndex].textOverlay) drawTextOverlay(ctx, imageItems[nextIndex].textOverlay!, canvas.width, canvas.height);
              ctx.globalAlpha = 1 - transitionProgress;
              drawImageCover(ctx, currentImage, canvas.width, canvas.height);
              if (imageItems[imageIndex].textOverlay) drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
              ctx.globalAlpha = 1;
              break;
            }
            case 'slide': {
              const offset = transitionProgress * canvas.width;
              ctx.save(); ctx.translate(-offset, 0);
              drawImageCover(ctx, currentImage, canvas.width, canvas.height);
              if (imageItems[imageIndex].textOverlay) drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
              ctx.restore(); ctx.save(); ctx.translate(canvas.width - offset, 0);
              drawImageCover(ctx, nextImage, canvas.width, canvas.height);
              if (imageItems[nextIndex].textOverlay) drawTextOverlay(ctx, imageItems[nextIndex].textOverlay!, canvas.width, canvas.height);
              ctx.restore();
              break;
            }
            case 'zoom': {
              const scale = 1 + transitionProgress * 0.5;
              ctx.save(); ctx.globalAlpha = 1 - transitionProgress;
              ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(scale, scale); ctx.translate(-canvas.width / 2, -canvas.height / 2);
              drawImageCover(ctx, currentImage, canvas.width, canvas.height);
              if (imageItems[imageIndex].textOverlay) drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
              ctx.restore(); ctx.save(); ctx.globalAlpha = transitionProgress;
              drawImageCover(ctx, nextImage, canvas.width, canvas.height);
              if (imageItems[nextIndex].textOverlay) drawTextOverlay(ctx, imageItems[nextIndex].textOverlay!, canvas.width, canvas.height);
              ctx.restore(); ctx.globalAlpha = 1;
              break;
            }
            default: {
              const showNext = transitionProgress >= 0.5;
              const imgToShow = showNext ? nextImage : currentImage;
              const overlayData = showNext ? imageItems[nextIndex].textOverlay : imageItems[imageIndex].textOverlay;
              drawImageCover(ctx, imgToShow, canvas.width, canvas.height);
              if (overlayData) drawTextOverlay(ctx, overlayData, canvas.width, canvas.height);
            }
          }
        }
      }

      onProgress(Math.round((frame / totalFrames) * 100));
      frame++;
      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  });
}
