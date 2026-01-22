import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Slider,
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
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Movie as MovieIcon,
  HighQuality as HighQualityIcon,
} from '@mui/icons-material';
import type { ImageItem, ReelConfig, TransitionType, TextOverlay, VideoFormat, VideoQuality } from '../types';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [conversionStatus, setConversionStatus] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<number | null>(null);
  
  const ffmpegSupported = isFFmpegSupported();
  const ffmpegStatus = useMemo(() => getFFmpegSupportStatus(), []);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const getImageDuration = useCallback((index: number) => {
    return images[index]?.duration ?? config.imageDuration;
  }, [images, config.imageDuration]);

  const getTransitionType = useCallback((index: number) => {
    return images[index]?.transitionType ?? config.transitionType;
  }, [images, config.transitionType]);

  const playNextFrame = useCallback(() => {
    if (!isPlaying || images.length === 0) return;

    setIsTransitioning(true);
    
    timeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      setCurrentIndex((prev) => {
        const next = (prev + 1) % images.length;
        timeoutRef.current = window.setTimeout(() => {
          playNextFrame();
        }, getImageDuration(next));
        return next;
      });
    }, config.transitionDuration);
  }, [isPlaying, images.length, config.transitionDuration, getImageDuration]);

  useEffect(() => {
    if (isPlaying && images.length > 0) {
      timeoutRef.current = window.setTimeout(() => {
        playNextFrame();
      }, getImageDuration(currentIndex));
    }
    return clearTimeouts;
  }, [isPlaying, images.length, playNextFrame, currentIndex, getImageDuration, clearTimeouts]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      clearTimeouts();
      if (audioRef?.current) {
        audioRef.current.pause();
      }
    } else {
      setIsPlaying(true);
      if (audioRef?.current && config.music) {
        const audio = audioRef.current;
        if (audio.src !== config.music.dataUrl) {
          audio.src = config.music.dataUrl;
          audio.load();
        }
        audio.volume = config.music.volume;
        audio.currentTime = config.music.startTime;
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
    clearTimeouts();
    if (audioRef?.current && config.music) {
      audioRef.current.pause();
      audioRef.current.currentTime = config.music.startTime;
    }
  };

  const getTransitionStyle = (): React.CSSProperties => {
    if (!isTransitioning) return {};
    const duration = config.transitionDuration / 1000;
    const transitionType = getTransitionType(currentIndex);
    
    switch (transitionType) {
      case 'fade': return { animation: `fadeOut ${duration}s ease-in-out` };
      case 'slide': return { animation: `slideOut ${duration}s ease-in-out` };
      case 'zoom': return { animation: `zoomOut ${duration}s ease-in-out` };
      default: return {};
    }
  };

  const getTextOverlayStyle = (overlay: TextOverlay): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      padding: '12px 16px',
      fontSize: `${Math.max(12, overlay.fontSize * 0.4)}px`,
      color: overlay.fontColor,
      backgroundColor: overlay.backgroundColor,
      fontWeight: overlay.fontWeight,
      textAlign: overlay.textAlign,
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      lineHeight: 1.3,
    };

    switch (overlay.position) {
      case 'top': return { ...base, top: 0 };
      case 'center': return { ...base, top: '50%', transform: 'translateY(-50%)' };
      case 'bottom': return { ...base, bottom: 0 };
      default: return { ...base, bottom: 0 };
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

    canvas.width = 1080;
    canvas.height = 1920;

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

  // Preview Only Mode
  if (showPreviewOnly) {
    return (
      <Box>
        <Box sx={{ position: 'relative', bgcolor: 'black', borderRadius: 2, overflow: 'hidden', aspectRatio: '9/16', maxHeight: 400 }}>
          {images.length === 0 ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">Add images to preview</Typography>
            </Box>
          ) : (
            <>
              <Box
                component="img"
                src={images[currentIndex]?.croppedDataUrl || images[currentIndex]?.dataUrl}
                alt="Current frame"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', ...getTransitionStyle() }}
              />
              {images[currentIndex]?.textOverlay && (
                <Box sx={getTextOverlayStyle(images[currentIndex].textOverlay)}>
                  {images[currentIndex].textOverlay.text}
                </Box>
              )}
              <Chip label={`${currentIndex + 1} / ${images.length}`} size="small" sx={{ position: 'absolute', bottom: 8, right: 8, bgcolor: 'rgba(0,0,0,0.7)' }} />
            </>
          )}
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="center">
          <Button variant="contained" startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />} onClick={handlePlayPause} disabled={images.length === 0}>
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button variant="outlined" startIcon={<StopIcon />} onClick={handleStop} disabled={images.length === 0 || (!isPlaying && currentIndex === 0)}>
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
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            These apply to images without custom timing
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Default Image Duration: {(config.imageDuration / 1000).toFixed(1)}s
          </Typography>
          <Slider value={config.imageDuration} min={500} max={5000} step={100} onChange={(_, v) => onConfigChange({ ...config, imageDuration: v as number })} />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Transition Duration: {(config.transitionDuration / 1000).toFixed(1)}s
          </Typography>
          <Slider value={config.transitionDuration} min={200} max={2000} step={100} onChange={(_, v) => onConfigChange({ ...config, transitionDuration: v as number })} />
        </Box>

        <FormControl size="small">
          <InputLabel>Transition Type</InputLabel>
          <Select value={config.transitionType} label="Transition Type" onChange={(e) => onConfigChange({ ...config, transitionType: e.target.value as TransitionType })}>
            <MenuItem value="fade">Fade</MenuItem>
            <MenuItem value="slide">Slide</MenuItem>
            <MenuItem value="zoom">Zoom</MenuItem>
            <MenuItem value="none">None</MenuItem>
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
function buildTimeline(
  imageItems: ImageItem[],
  config: ReelConfig
): { timeline: TimelineSegment[]; totalDuration: number } {
  const timeline: TimelineSegment[] = [];
  let currentTime = 0;
  
  for (let i = 0; i < imageItems.length; i++) {
    const img = imageItems[i];
    const duration = img.duration ?? config.imageDuration;
    const transitionType = img.transitionType ?? config.transitionType;
    
    timeline.push({
      startTime: currentTime,
      imageDuration: duration,
      transitionDuration: config.transitionDuration,
      transitionType,
      imageIndex: i,
    });
    
    currentTime += duration + config.transitionDuration;
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
  const nextIndex = (imageIndex + 1) % loadedImages.length;
  const currentImage = loadedImages[imageIndex];
  const nextImage = loadedImages[nextIndex];

  if (timeInSegment < segment.imageDuration) {
    // Display current image
    drawImageCover(ctx, currentImage, canvas.width, canvas.height);
    if (imageItems[imageIndex].textOverlay) {
      drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
    }
  } else {
    // Transition phase
    const transitionProgress = (timeInSegment - segment.imageDuration) / segment.transitionDuration;

    switch (segment.transitionType) {
      case 'fade':
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
      case 'slide':
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
      case 'zoom':
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
      default:
        // No transition - instant switch
        const showNext = transitionProgress >= 0.5;
        drawImageCover(ctx, showNext ? nextImage : currentImage, canvas.width, canvas.height);
        const overlayData = showNext ? imageItems[nextIndex].textOverlay : imageItems[imageIndex].textOverlay;
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
        const nextIndex = (imageIndex + 1) % loadedImages.length;
        const currentImage = loadedImages[imageIndex];
        const nextImage = loadedImages[nextIndex];

        if (timeInSegment < segment.imageDuration) {
          drawImageCover(ctx, currentImage, canvas.width, canvas.height);
          if (imageItems[imageIndex].textOverlay) drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
        } else {
          const transitionProgress = (timeInSegment - segment.imageDuration) / segment.transitionDuration;

          switch (segment.transitionType) {
            case 'fade':
              drawImageCover(ctx, nextImage, canvas.width, canvas.height);
              if (imageItems[nextIndex].textOverlay) drawTextOverlay(ctx, imageItems[nextIndex].textOverlay!, canvas.width, canvas.height);
              ctx.globalAlpha = 1 - transitionProgress;
              drawImageCover(ctx, currentImage, canvas.width, canvas.height);
              if (imageItems[imageIndex].textOverlay) drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
              ctx.globalAlpha = 1;
              break;
            case 'slide':
              const offset = transitionProgress * canvas.width;
              ctx.save(); ctx.translate(-offset, 0);
              drawImageCover(ctx, currentImage, canvas.width, canvas.height);
              if (imageItems[imageIndex].textOverlay) drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
              ctx.restore(); ctx.save(); ctx.translate(canvas.width - offset, 0);
              drawImageCover(ctx, nextImage, canvas.width, canvas.height);
              if (imageItems[nextIndex].textOverlay) drawTextOverlay(ctx, imageItems[nextIndex].textOverlay!, canvas.width, canvas.height);
              ctx.restore();
              break;
            case 'zoom':
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
            default:
              const showNext = transitionProgress >= 0.5;
              drawImageCover(ctx, showNext ? nextImage : currentImage, canvas.width, canvas.height);
              const overlayData = showNext ? imageItems[nextIndex].textOverlay : imageItems[imageIndex].textOverlay;
              if (overlayData) drawTextOverlay(ctx, overlayData, canvas.width, canvas.height);
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
