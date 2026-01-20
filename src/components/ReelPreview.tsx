import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ImageItem, ReelConfig, TransitionType, TextOverlay, VideoFormat } from '../types';
import { convertWebmToMp4, isFFmpegSupported, getFFmpegSupportStatus } from '../utils/videoConverter';
import './ReelPreview.css';

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

  const playNextFrame = useCallback(() => {
    if (!isPlaying || images.length === 0) return;

    setIsTransitioning(true);
    
    timeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      setCurrentIndex((prev) => {
        const next = (prev + 1) % images.length;
        if (next === 0) {
          // Loop completed
        }
        return next;
      });
      
      timeoutRef.current = window.setTimeout(() => {
        playNextFrame();
      }, config.imageDuration);
    }, config.transitionDuration);
  }, [isPlaying, images.length, config.imageDuration, config.transitionDuration]);

  useEffect(() => {
    if (isPlaying && images.length > 0) {
      timeoutRef.current = window.setTimeout(() => {
        playNextFrame();
      }, config.imageDuration);
    }
    return clearTimeouts;
  }, [isPlaying, images.length, playNextFrame, config.imageDuration, clearTimeouts]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      clearTimeouts();
      // Pause music
      if (audioRef?.current) {
        audioRef.current.pause();
      }
    } else {
      setIsPlaying(true);
      // Play music from start time
      if (audioRef?.current && config.music) {
        audioRef.current.currentTime = config.music.startTime;
        audioRef.current.volume = config.music.volume;
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setIsTransitioning(false);
    clearTimeouts();
    // Stop and reset music
    if (audioRef?.current && config.music) {
      audioRef.current.pause();
      audioRef.current.currentTime = config.music.startTime;
    }
  };

  const getTransitionStyle = (): React.CSSProperties => {
    if (!isTransitioning) return {};

    const duration = config.transitionDuration / 1000;
    
    switch (config.transitionType) {
      case 'fade':
        return {
          animation: `fadeOut ${duration}s ease-in-out`,
        };
      case 'slide':
        return {
          animation: `slideOut ${duration}s ease-in-out`,
        };
      case 'zoom':
        return {
          animation: `zoomOut ${duration}s ease-in-out`,
        };
      default:
        return {};
    }
  };

  const getTextOverlayStyle = (overlay: TextOverlay): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      padding: '12px 16px',
      fontSize: `${Math.max(12, overlay.fontSize * 0.4)}px`, // Scale down for preview
      color: overlay.fontColor,
      backgroundColor: overlay.backgroundColor,
      fontWeight: overlay.fontWeight,
      textAlign: overlay.textAlign,
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      lineHeight: 1.3,
    };

    switch (overlay.position) {
      case 'top':
        return { ...base, top: 0 };
      case 'center':
        return { ...base, top: '50%', transform: 'translateY(-50%)' };
      case 'bottom':
        return { ...base, bottom: 0 };
      default:
        return { ...base, bottom: 0 };
    }
  };

  const generateVideo = async () => {
    if (images.length === 0) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    const canvas = canvasRef.current;
    if (!canvas) {
      setIsGenerating(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsGenerating(false);
      return;
    }

    // Set canvas size to common video resolution
    canvas.width = 1080;
    canvas.height = 1920; // 9:16 aspect ratio for reels

    const fps = 30;
    const frameDuration = 1000 / fps;
    const totalDuration = images.length * (config.imageDuration + config.transitionDuration);
    const totalFrames = Math.ceil(totalDuration / frameDuration);

    // Collect all frames
    const frames: Blob[] = [];
    
    // Load all images first (use cropped version if available)
    const loadedImages: HTMLImageElement[] = await Promise.all(
      images.map((img) => {
        return new Promise<HTMLImageElement>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image);
          // Use cropped image if available, otherwise original
          image.src = img.croppedDataUrl || img.dataUrl;
        });
      })
    );

    // Generate frames
    for (let frame = 0; frame < totalFrames; frame++) {
      const currentTime = frame * frameDuration;
      const cycleDuration = config.imageDuration + config.transitionDuration;
      const currentCycle = Math.floor(currentTime / cycleDuration);
      const timeInCycle = currentTime % cycleDuration;

      const imageIndex = currentCycle % images.length;
      const nextIndex = (imageIndex + 1) % images.length;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const currentImage = loadedImages[imageIndex];
      const nextImage = loadedImages[nextIndex];

      if (timeInCycle < config.imageDuration) {
        // Show current image
        drawImageCover(ctx, currentImage, canvas.width, canvas.height);
        // Draw text overlay for current image
        if (images[imageIndex].textOverlay) {
          drawTextOverlay(ctx, images[imageIndex].textOverlay!, canvas.width, canvas.height);
        }
      } else {
        // Transitioning
        const transitionProgress = (timeInCycle - config.imageDuration) / config.transitionDuration;
        
        switch (config.transitionType) {
          case 'fade':
            drawImageCover(ctx, nextImage, canvas.width, canvas.height);
            if (images[nextIndex].textOverlay) {
              drawTextOverlay(ctx, images[nextIndex].textOverlay!, canvas.width, canvas.height);
            }
            ctx.globalAlpha = 1 - transitionProgress;
            drawImageCover(ctx, currentImage, canvas.width, canvas.height);
            if (images[imageIndex].textOverlay) {
              drawTextOverlay(ctx, images[imageIndex].textOverlay!, canvas.width, canvas.height);
            }
            ctx.globalAlpha = 1;
            break;
          case 'slide':
            const offset = transitionProgress * canvas.width;
            ctx.save();
            ctx.translate(-offset, 0);
            drawImageCover(ctx, currentImage, canvas.width, canvas.height);
            if (images[imageIndex].textOverlay) {
              drawTextOverlay(ctx, images[imageIndex].textOverlay!, canvas.width, canvas.height);
            }
            ctx.restore();
            ctx.save();
            ctx.translate(canvas.width - offset, 0);
            drawImageCover(ctx, nextImage, canvas.width, canvas.height);
            if (images[nextIndex].textOverlay) {
              drawTextOverlay(ctx, images[nextIndex].textOverlay!, canvas.width, canvas.height);
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
            if (images[imageIndex].textOverlay) {
              drawTextOverlay(ctx, images[imageIndex].textOverlay!, canvas.width, canvas.height);
            }
            ctx.restore();
            ctx.save();
            ctx.globalAlpha = transitionProgress;
            drawImageCover(ctx, nextImage, canvas.width, canvas.height);
            if (images[nextIndex].textOverlay) {
              drawTextOverlay(ctx, images[nextIndex].textOverlay!, canvas.width, canvas.height);
            }
            ctx.restore();
            ctx.globalAlpha = 1;
            break;
          default:
            const showNext = transitionProgress >= 0.5;
            drawImageCover(ctx, showNext ? nextImage : currentImage, canvas.width, canvas.height);
            const overlayData = showNext ? images[nextIndex].textOverlay : images[imageIndex].textOverlay;
            if (overlayData) {
              drawTextOverlay(ctx, overlayData, canvas.width, canvas.height);
            }
        }
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/webp', 0.8);
      });
      frames.push(blob);

      setGenerationProgress(Math.round((frame / totalFrames) * 100));
    }

    // Create video using WebM (with optional audio)
    try {
      setConversionStatus('Creating video...');
      console.log('[ReelPreview] Creating WebM video...');
      
      const webmBlob = await createWebMVideo(
        canvas, 
        loadedImages, 
        images, 
        config, 
        fps,
        setGenerationProgress
      );
      
      console.log('[ReelPreview] WebM created, size:', webmBlob.size, 'bytes');
      
      let finalBlob: Blob;
      let filename: string;

      // Convert to MP4 if requested
      if (config.outputFormat === 'mp4') {
        console.log('[ReelPreview] MP4 requested, ffmpegSupported:', ffmpegSupported);
        
        if (ffmpegSupported) {
          try {
            setConversionStatus('Loading MP4 converter...');
            setGenerationProgress(0);
            console.log('[ReelPreview] Starting MP4 conversion...');
            
            finalBlob = await convertWebmToMp4(webmBlob, (progress) => {
              console.log('[ReelPreview] Conversion progress:', progress);
              setConversionStatus(progress.message);
              if (progress.phase === 'converting') {
                setGenerationProgress(progress.progress);
              }
            });
            
            console.log('[ReelPreview] MP4 conversion successful, size:', finalBlob.size);
            filename = `reel-${Date.now()}.mp4`;
          } catch (conversionError) {
            console.error('[ReelPreview] MP4 conversion failed:', conversionError);
            // Fall back to WebM
            const errorMessage = conversionError instanceof Error 
              ? conversionError.message 
              : 'Unknown error';
            alert(`MP4 conversion failed: ${errorMessage}\n\nDownloading as WebM instead.`);
            finalBlob = webmBlob;
            filename = `reel-${Date.now()}.webm`;
          }
        } else {
          console.warn('[ReelPreview] FFmpeg not supported, reason:', ffmpegStatus.message);
          alert(`MP4 format is not available:\n${ffmpegStatus.message}\n\nDownloading as WebM instead.`);
          finalBlob = webmBlob;
          filename = `reel-${Date.now()}.webm`;
        }
      } else {
        console.log('[ReelPreview] WebM format selected');
        finalBlob = webmBlob;
        filename = `reel-${Date.now()}.webm`;
      }
      
      console.log('[ReelPreview] Downloading:', filename, 'size:', finalBlob.size);
      
      // Download video
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[ReelPreview] Error generating video:', error);
      alert('Error generating video. Your browser might not support video encoding.');
    }

    setIsGenerating(false);
    setGenerationProgress(0);
    setConversionStatus('');
  };

  // If showing preview only (large preview on right side)
  if (showPreviewOnly) {
    return (
      <div className="reel-preview preview-only">
        <div className="preview-container large">
          {images.length === 0 ? (
            <div className="preview-placeholder">
              <p>Add images to preview your reel</p>
            </div>
          ) : (
            <div className="preview-frame">
              <img
                src={images[currentIndex]?.croppedDataUrl || images[currentIndex]?.dataUrl}
                alt="Current frame"
                className="preview-image"
                style={getTransitionStyle()}
              />
              {/* Text Overlay */}
              {images[currentIndex]?.textOverlay && (
                <div 
                  className="preview-text-overlay"
                  style={getTextOverlayStyle(images[currentIndex].textOverlay)}
                >
                  {images[currentIndex].textOverlay.text}
                </div>
              )}
              <div className="preview-counter">
                {currentIndex + 1} / {images.length}
              </div>
            </div>
          )}
        </div>

        <div className="preview-controls">
          <button 
            className="control-btn"
            onClick={handlePlayPause}
            disabled={images.length === 0}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button 
            className="control-btn"
            onClick={handleStop}
            disabled={images.length === 0 || (!isPlaying && currentIndex === 0)}
          >
            ⏹ Stop
          </button>
        </div>
      </div>
    );
  }

  // If hiding preview player (controls only mode)
  if (!showPreviewPlayer) {
    return (
      <div className="reel-preview controls-only">
        <div className="config-section">
          <h4>⚙️ Settings</h4>
          
          <div className="config-item">
            <label>Image Duration</label>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={config.imageDuration}
              onChange={(e) => onConfigChange({ ...config, imageDuration: Number(e.target.value) })}
            />
            <span>{(config.imageDuration / 1000).toFixed(1)}s</span>
          </div>

          <div className="config-item">
            <label>Transition Duration</label>
            <input
              type="range"
              min="200"
              max="2000"
              step="100"
              value={config.transitionDuration}
              onChange={(e) => onConfigChange({ ...config, transitionDuration: Number(e.target.value) })}
            />
            <span>{(config.transitionDuration / 1000).toFixed(1)}s</span>
          </div>

          <div className="config-item">
            <label>Transition Type</label>
            <select
              value={config.transitionType}
              onChange={(e) => onConfigChange({ ...config, transitionType: e.target.value as TransitionType })}
            >
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
              <option value="none">None</option>
            </select>
          </div>

          <div className="config-item">
            <label>Output Format</label>
            <select
              value={config.outputFormat}
              onChange={(e) => onConfigChange({ ...config, outputFormat: e.target.value as VideoFormat })}
            >
              <option value="mp4">MP4 {ffmpegSupported ? '✓' : '⚠️'}</option>
              <option value="webm">WebM (Always works)</option>
            </select>
          </div>
          
          {config.outputFormat === 'mp4' && !ffmpegSupported && (
            <div className="format-warning">
              ⚠️ {ffmpegStatus.message}
            </div>
          )}
          
          {config.outputFormat === 'mp4' && ffmpegSupported && (
            <div className="format-success">
              ✓ MP4 export ready
            </div>
          )}
        </div>

        <button 
          className="generate-btn"
          onClick={generateVideo}
          disabled={images.length < 2 || isGenerating}
        >
          {isGenerating ? (
            <>
              {conversionStatus || `Generating... ${generationProgress}%`}
            </>
          ) : (
            <>🎬 Generate {config.outputFormat === 'mp4' && ffmpegSupported ? 'MP4' : 'WebM'}</>
          )}
        </button>

        {isGenerating && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    );
  }

  // Default: full preview with all controls
  return (
    <div className="reel-preview">
      <h3 className="preview-title">Preview & Generate</h3>
      
      <div className="preview-container">
        {images.length === 0 ? (
          <div className="preview-placeholder">
            <p>Add images to preview your reel</p>
          </div>
        ) : (
          <div className="preview-frame">
            <img
              src={images[currentIndex]?.croppedDataUrl || images[currentIndex]?.dataUrl}
              alt="Current frame"
              className="preview-image"
              style={getTransitionStyle()}
            />
            {/* Text Overlay */}
            {images[currentIndex]?.textOverlay && (
              <div 
                className="preview-text-overlay"
                style={getTextOverlayStyle(images[currentIndex].textOverlay)}
              >
                {images[currentIndex].textOverlay.text}
              </div>
            )}
            <div className="preview-counter">
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        )}
      </div>

      <div className="preview-controls">
        <button 
          className="control-btn"
          onClick={handlePlayPause}
          disabled={images.length === 0}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button 
          className="control-btn"
          onClick={handleStop}
          disabled={images.length === 0 || (!isPlaying && currentIndex === 0)}
        >
          ⏹ Stop
        </button>
      </div>

      <div className="config-section">
        <h4>Settings</h4>
        
        <div className="config-item">
          <label>Image Duration</label>
          <input
            type="range"
            min="500"
            max="5000"
            step="100"
            value={config.imageDuration}
            onChange={(e) => onConfigChange({ ...config, imageDuration: Number(e.target.value) })}
          />
          <span>{(config.imageDuration / 1000).toFixed(1)}s</span>
        </div>

        <div className="config-item">
          <label>Transition Duration</label>
          <input
            type="range"
            min="200"
            max="2000"
            step="100"
            value={config.transitionDuration}
            onChange={(e) => onConfigChange({ ...config, transitionDuration: Number(e.target.value) })}
          />
          <span>{(config.transitionDuration / 1000).toFixed(1)}s</span>
        </div>

        <div className="config-item">
          <label>Transition Type</label>
          <select
            value={config.transitionType}
            onChange={(e) => onConfigChange({ ...config, transitionType: e.target.value as TransitionType })}
          >
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="zoom">Zoom</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="config-item">
          <label>Output Format</label>
          <select
            value={config.outputFormat}
            onChange={(e) => onConfigChange({ ...config, outputFormat: e.target.value as VideoFormat })}
          >
            <option value="mp4">MP4 {ffmpegSupported ? '✓' : '⚠️'}</option>
            <option value="webm">WebM (Always works)</option>
          </select>
        </div>
        
        {config.outputFormat === 'mp4' && !ffmpegSupported && (
          <div className="format-warning">
            ⚠️ {ffmpegStatus.message}
          </div>
        )}
        
        {config.outputFormat === 'mp4' && ffmpegSupported && (
          <div className="format-success">
            ✓ MP4 export ready
          </div>
        )}
      </div>

      <button 
        className="generate-btn"
        onClick={generateVideo}
        disabled={images.length < 2 || isGenerating}
      >
        {isGenerating ? (
          <>
            {conversionStatus || `Generating... ${generationProgress}%`}
          </>
        ) : (
          <>🎬 Generate {config.outputFormat === 'mp4' && ffmpegSupported ? 'MP4' : 'Video'}</>
        )}
      </button>

      {isGenerating && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${generationProgress}%` }}
          />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
) {
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

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: TextOverlay,
  canvasWidth: number,
  canvasHeight: number
) {
  const padding = 40;
  const fontSize = overlay.fontSize;
  
  // Set up text styling
  ctx.font = `${overlay.fontWeight} ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = overlay.textAlign;
  ctx.textBaseline = 'middle';

  // Measure text and wrap if necessary
  const maxWidth = canvasWidth - padding * 2;
  const lines = wrapText(ctx, overlay.text, maxWidth);
  const lineHeight = fontSize * 1.3;
  const totalTextHeight = lines.length * lineHeight;
  const bgPadding = 30;
  const bgHeight = totalTextHeight + bgPadding * 2;

  // Calculate Y position based on overlay position
  let bgY: number;
  switch (overlay.position) {
    case 'top':
      bgY = 0;
      break;
    case 'center':
      bgY = (canvasHeight - bgHeight) / 2;
      break;
    case 'bottom':
    default:
      bgY = canvasHeight - bgHeight;
      break;
  }

  // Draw background
  ctx.fillStyle = overlay.backgroundColor;
  ctx.fillRect(0, bgY, canvasWidth, bgHeight);

  // Draw text
  ctx.fillStyle = overlay.fontColor;
  
  let textX: number;
  switch (overlay.textAlign) {
    case 'left':
      textX = padding;
      break;
    case 'right':
      textX = canvasWidth - padding;
      break;
    case 'center':
    default:
      textX = canvasWidth / 2;
      break;
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

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines.length > 0 ? lines : [''];
}

async function createWebMVideo(
  canvas: HTMLCanvasElement,
  loadedImages: HTMLImageElement[],
  imageItems: ImageItem[],
  config: ReelConfig,
  fps: number,
  onProgress: (progress: number) => void
): Promise<Blob> {
  const ctx = canvas.getContext('2d')!;
  const frameDuration = 1000 / fps;
  const totalDuration = loadedImages.length * (config.imageDuration + config.transitionDuration);
  const totalFrames = Math.ceil(totalDuration / frameDuration);

  // Set up audio if available
  let audioContext: AudioContext | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  let audioSource: AudioBufferSourceNode | null = null;

  if (config.music) {
    try {
      audioContext = new AudioContext();
      audioDestination = audioContext.createMediaStreamDestination();
      
      // Load and decode audio
      const response = await fetch(config.music.dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create source and connect to destination
      audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer;
      
      // Create gain node for volume
      const gainNode = audioContext.createGain();
      gainNode.gain.value = config.music.volume;
      
      audioSource.connect(gainNode);
      gainNode.connect(audioDestination);
      
      // Set the start offset
      audioSource.start(0, config.music.startTime);
    } catch (error) {
      console.error('Error setting up audio:', error);
      audioContext = null;
    }
  }

  // Combine video and audio streams
  const videoStream = canvas.captureStream(fps);
  let combinedStream: MediaStream;
  
  if (audioDestination) {
    const audioTracks = audioDestination.stream.getAudioTracks();
    combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioTracks,
    ]);
  } else {
    combinedStream = videoStream;
  }

  // Check if MediaRecorder supports webm with audio
  let mimeType: string;
  if (audioDestination) {
    mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';
  } else {
    mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';
  }

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 5000000,
    audioBitsPerSecond: 128000,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      // Clean up audio
      if (audioSource) {
        audioSource.stop();
      }
      if (audioContext) {
        audioContext.close();
      }
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    mediaRecorder.start();

    let frame = 0;
    const renderFrame = () => {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const currentTime = frame * frameDuration;
      const cycleDuration = config.imageDuration + config.transitionDuration;
      const currentCycle = Math.floor(currentTime / cycleDuration);
      const timeInCycle = currentTime % cycleDuration;

      const imageIndex = currentCycle % loadedImages.length;
      const nextIndex = (imageIndex + 1) % loadedImages.length;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const currentImage = loadedImages[imageIndex];
      const nextImage = loadedImages[nextIndex];

      if (timeInCycle < config.imageDuration) {
        drawImageCover(ctx, currentImage, canvas.width, canvas.height);
        if (imageItems[imageIndex].textOverlay) {
          drawTextOverlay(ctx, imageItems[imageIndex].textOverlay!, canvas.width, canvas.height);
        }
      } else {
        const transitionProgress = (timeInCycle - config.imageDuration) / config.transitionDuration;

        switch (config.transitionType) {
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
            const showNext = transitionProgress >= 0.5;
            drawImageCover(ctx, showNext ? nextImage : currentImage, canvas.width, canvas.height);
            const overlayData = showNext ? imageItems[nextIndex].textOverlay : imageItems[imageIndex].textOverlay;
            if (overlayData) {
              drawTextOverlay(ctx, overlayData, canvas.width, canvas.height);
            }
        }
      }

      // Update progress
      onProgress(Math.round((frame / totalFrames) * 100));

      frame++;
      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  });
}
