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
  generateVideoWithFFmpeg,
  checkFFmpegEnvironment,
  QUALITY_PRESETS
} from '../../utils/videoConverter';
import { highlightCode } from '../../utils/codeHighlight';
import type { HighlightedToken } from '../../types';

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
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [ffmpegSupported, setFfmpegSupported] = useState<boolean | null>(null);
  const [ffmpegStatus, setFfmpegStatus] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Calculate video duration and total frames
  const videoSpecs = useMemo(() => {
    const fps = 30;
    const totalDuration = texts.reduce((sum, text) => sum + text.animationDuration + text.pauseDuration, 0) / 1000; // in seconds
    const totalFrames = Math.ceil(totalDuration * fps);
    return { fps, totalDuration, totalFrames };
  }, [texts]);

  // Get canvas dimensions
  const canvasDimensions = useMemo(() => {
    const preset = VIDEO_DIMENSION_PRESETS[config.videoDimensions];
    return { width: preset.width, height: preset.height };
  }, [config.videoDimensions]);

  // Render text to canvas with word wrapping and syntax highlighting
  const renderTextToCanvas = useCallback((ctx: CanvasRenderingContext2D, text: TextItem, progress: number, dimensions: { width: number; height: number }) => {
    // Clear canvas with background color
    ctx.fillStyle = text.backgroundColor || config.backgroundColor || '#000000';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Position text
    const centerX = dimensions.width / 2;
    let centerY = dimensions.height / 2;

    switch (text.position) {
      case 'top':
        centerY = dimensions.height * 0.25;
        break;
      case 'center':
        centerY = dimensions.height / 2;
        break;
      case 'bottom':
        centerY = dimensions.height * 0.75;
        break;
    }

    // Apply animation
    const animationStyle = getAnimationStyle(text, progress);

    ctx.save();
    ctx.translate(centerX, centerY);

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

    // Handle multi-column text or single column text
    if (text.columns && text.columns.length > 0) {
      renderMultiColumnText(ctx, text, progress, dimensions);
    } else if (text.isCode && text.language) {
      renderHighlightedCode(ctx, text, progress, dimensions);
    } else {
      renderPlainText(ctx, text, progress, dimensions);
    }

    ctx.restore();
  }, [config.backgroundColor]);

  // Render plain text
  const renderPlainText = (ctx: CanvasRenderingContext2D, text: TextItem, progress: number, dimensions: { width: number; height: number }) => {
    if (!text.content) return;

    // Set text properties
    ctx.fillStyle = text.fontColor || '#ffffff';
    ctx.font = `${text.fontWeight || 'bold'} ${text.fontSize || 48}px Arial`; // Use Arial as fallback
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Get the text to display (with typewriter effect if applicable)
    const fullText = text.content;
    const displayText = text.animationType === 'typewriter'
      ? fullText.substring(0, Math.floor(progress * fullText.length))
      : fullText;

    // Preserve newlines and word wrap the text
    const paragraphs = displayText.split('\n');
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > dimensions.width * 0.8 && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
    }

    // Draw each line
    const fontSize = text.fontSize || 48;
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = -totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, index) => {
      const y = startY + index * lineHeight;
      ctx.fillText(line, 0, y);
    });
  };

  // Render multi-column text
  const renderMultiColumnText = (ctx: CanvasRenderingContext2D, text: TextItem, progress: number, dimensions: { width: number; height: number }) => {
    if (!text.columns) return;

    const totalWidth = dimensions.width * 0.9; // Use 90% of available width
    const startX = -totalWidth / 2;
    let currentX = startX;

    text.columns.forEach((column) => {
      const columnWidth = totalWidth * (column.width / 100);
      const columnDimensions = { width: columnWidth, height: dimensions.height };

      // Render each paragraph in the column
      let columnY = -dimensions.height / 2 + 50; // Start near top

      column.paragraphs.forEach((paragraph) => {
        // Temporarily modify text object for rendering
        const tempText: TextItem = {
          ...text,
          content: paragraph.content,
          fontSize: paragraph.fontSize,
          fontColor: paragraph.fontColor,
          fontWeight: paragraph.fontWeight,
          textAlign: paragraph.textAlign,
          position: paragraph.position,
          isCode: paragraph.isCode,
          language: paragraph.language,
          highlightedTokens: paragraph.highlightedTokens,
        };

        // Save context
        ctx.save();

        // Position for this paragraph within the column
        const paraCenterX = currentX + columnWidth / 2;
        let paraCenterY = columnY;

        switch (paragraph.position) {
          case 'top':
            paraCenterY = columnY;
            break;
          case 'center':
            paraCenterY = columnY;
            break;
          case 'bottom':
            paraCenterY = columnY;
            break;
        }

        ctx.translate(paraCenterX, paraCenterY);

        // Apply animation (simplified - could be enhanced per paragraph)
        const animationStyle = getAnimationStyle(text, progress);
        ctx.globalAlpha = animationStyle.opacity || 1;

        // Render the paragraph
        if (paragraph.isCode && paragraph.language) {
          renderHighlightedCode(ctx, tempText, progress, columnDimensions);
        } else {
          renderPlainText(ctx, tempText, progress, columnDimensions);
        }

        ctx.restore();

        // Move down for next paragraph
        columnY += 100; // Fixed spacing - could be made configurable
      });

      currentX += columnWidth;
    });
  };

  // Render syntax highlighted code
  const renderHighlightedCode = (ctx: CanvasRenderingContext2D, text: TextItem, progress: number, dimensions: { width: number; height: number }) => {
    if (!text.language || !text.content) return;

    let tokens: HighlightedToken[];
    if (text.highlightedTokens) {
      tokens = text.highlightedTokens;
    } else {
      tokens = highlightCode(text.content, text.language);
      // Cache the tokens (in a real app, we'd update the text item)
      (text as any).highlightedTokens = tokens;
    }

    // Split tokens into lines based on newline markers
    const lines: HighlightedToken[][] = [];
    let currentLine: HighlightedToken[] = [];

    for (const token of tokens) {
      if (token.isNewline) {
        lines.push(currentLine);
        currentLine = [];
      } else {
        currentLine.push(token);
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // Calculate total characters for typewriter effect (excluding newlines)
    const totalChars = tokens.filter(t => !t.isNewline).reduce((sum, token) => sum + token.text.length, 0);
    const displayChars = text.animationType === 'typewriter'
      ? Math.floor(progress * totalChars)
      : totalChars;

    const baseFontSize = text.fontSize || 48;
    ctx.font = `${text.fontWeight || 'bold'} ${baseFontSize}px monospace`;

    // Calculate font size to ensure all text fits vertically
    const lineHeight = baseFontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const maxHeight = dimensions.height * 0.8;

    let effectiveFontSize = baseFontSize;
    if (totalHeight > maxHeight) {
      effectiveFontSize = Math.max(12, (maxHeight / lines.length) / 1.2);
    }

    // Draw lines (left-aligned, not centered)
    const effectiveLineHeight = effectiveFontSize * 1.2;
    const startX = -dimensions.width * 0.45; // Left align within video
    const startY = -totalHeight / 2 + effectiveLineHeight / 2;

    let charCount = 0;
    lines.forEach((line, lineIndex) => {
      const y = startY + lineIndex * effectiveLineHeight;
      let x = startX;

      for (const token of line) {
        // Check if this token should be displayed in typewriter mode
        if (text.animationType === 'typewriter') {
          const tokenChars = token.text.length;
          if (charCount + tokenChars > displayChars) {
            // Partial token display
            const remainingChars = displayChars - charCount;
            if (remainingChars > 0) {
              const partialText = token.text.substring(0, remainingChars);
              ctx.fillStyle = token.color;
              ctx.font = `${token.isBold ? 'bold' : text.fontWeight} ${effectiveFontSize}px monospace`;
              ctx.fillText(partialText, x, y);
            }
            return; // Stop rendering this line
          }
        }

        ctx.fillStyle = token.color;
        ctx.font = `${token.isBold ? 'bold' : text.fontWeight} ${effectiveFontSize}px monospace`;
        ctx.fillText(token.text, x, y);
        x += ctx.measureText(token.text).width;
        charCount += token.text.length;
      }
    });
  };



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
      case 'bounce': {
        const bounce = Math.sin(progress * Math.PI * 4) * (1 - progress) * 20;
        return {
          transform: `translateY(${bounce}px)`,
          opacity: progress
        };
      }
      default:
        return { opacity: 1 };
    }
  };

  // Preview animation
  const startPreview = useCallback(() => {
    if (!canvasRef.current || texts.length === 0) return;

    setIsPlayingPreview(true);
    setCurrentTextIndex(0);

    // Start audio playback if music is available
    if (config.music && audioRef?.current) {
      audioRef.current.currentTime = config.music.startTime || 0;
      audioRef.current.volume = config.music.volume || 1;
      audioRef.current.play().catch(console.error);
    }

    const startTime = Date.now();

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
        const text = texts[i];
        const animationTime = text.animationDuration / 1000;
        const pauseTime = text.pauseDuration / 1000;
        const totalTextTime = animationTime + pauseTime;

        if (elapsed < accumulatedTime + totalTextTime) {
          const textElapsed = elapsed - accumulatedTime;

          // During animation phase
          if (textElapsed < animationTime) {
            const progress = textElapsed / animationTime;
            setCurrentTextIndex(i);
            renderTextToCanvas(ctx, text, progress, canvasDimensions);
          } else {
            // During pause phase - show full text
            setCurrentTextIndex(i);
            renderTextToCanvas(ctx, text, 1, canvasDimensions);
          }
          break;
        }
        accumulatedTime += totalTextTime;
      }

      // Check if animation is complete
      if (elapsed >= videoSpecs.totalDuration) {
        setIsPlayingPreview(false);
        setCurrentTextIndex(0);

        // Stop audio playback
        if (audioRef?.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, [texts, canvasDimensions, renderTextToCanvas, videoSpecs.totalDuration]);

  const stopPreview = useCallback(() => {
    setIsPlayingPreview(false);
    setCurrentTextIndex(0);

    // Stop audio playback
    if (audioRef?.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

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
          const text = texts[i];
          const animationTime = text.animationDuration / 1000;
          const pauseTime = text.pauseDuration / 1000;
          const totalTextTime = animationTime + pauseTime;

          if (timeInSeconds < accumulatedTime + totalTextTime) {
            const textElapsed = timeInSeconds - accumulatedTime;

            // During animation phase
            if (textElapsed < animationTime) {
              const progress = textElapsed / animationTime;
              renderTextToCanvas(ctx, text, progress, canvasDimensions);
            } else {
              // During pause phase - show full text
              renderTextToCanvas(ctx, text, 1, canvasDimensions);
            }
            break;
          }
          accumulatedTime += totalTextTime;
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
          setGenerationProgress(90 + progress.progress * 0.1);
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
      // Stop audio playback
      if (audioRef?.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
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

      {/* Two-column layout */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Preview */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 2,
          borderRight: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="h6" gutterBottom>Preview</Typography>
          <Box sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#111',
            borderRadius: 1,
            overflow: 'hidden',
            position: 'relative'
          }}>
            <canvas
              ref={canvasRef}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'block',
                backgroundColor: config.backgroundColor || '#000000',
                objectFit: 'contain',
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
          {generatedVideoUrl && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Generated Video</Typography>
              <video
                ref={videoRef}
                src={generatedVideoUrl}
                controls
                style={{
                  width: '100%',
                  maxHeight: 200,
                  borderRadius: 4
                }}
              />
            </Box>
          )}
        </Box>

        {/* Right: Controls */}
        <Box sx={{
          width: 320,
          p: 2,
          overflow: 'auto',
          bgcolor: 'background.paper',
          flexShrink: 0
        }}>
          <Typography variant="h6" gutterBottom>Settings</Typography>

          <Stack spacing={3}>
            {/* Dimensions */}
            <FormControl fullWidth size="small">
              <InputLabel>Dimensions</InputLabel>
              <Select
                value={config.videoDimensions}
                label="Dimensions"
                onChange={(e) => onConfigChange({ ...config, videoDimensions: e.target.value as VideoDimensions })}
              >
                {Object.entries(VIDEO_DIMENSION_PRESETS).map(([key, preset]) => (
                  <MenuItem key={key} value={key}>
                    {preset.label} ({preset.aspectRatio})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quality */}
            <FormControl fullWidth size="small">
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

            {/* Format */}
            <FormControl fullWidth size="small">
              <InputLabel>Format</InputLabel>
              <Select
                value={config.outputFormat}
                label="Format"
                onChange={(e) => onConfigChange({ ...config, outputFormat: e.target.value as VideoFormat })}
              >
                <MenuItem value="mp4">MP4</MenuItem>
                <MenuItem value="webm">WebM</MenuItem>
              </Select>
            </FormControl>

            {/* High Quality Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={config.useDirectEncoding}
                  onChange={(e) => onConfigChange({ ...config, useDirectEncoding: e.target.checked })}
                  size="small"
                />
              }
              label="High Quality Encoding"
            />

            {/* Background Color */}
            <Box>
              <Typography variant="body2" gutterBottom>Background Color</Typography>
              <input
                type="color"
                value={config.backgroundColor || '#000000'}
                onChange={(e) => onConfigChange({ ...config, backgroundColor: e.target.value })}
                style={{
                  width: 50,
                  height: 40,
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              />
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};