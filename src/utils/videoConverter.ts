import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoading = false;
let loadError: Error | null = null;

export type VideoFormat = 'webm' | 'mp4';
export type VideoQuality = 'standard' | 'high' | 'maximum';

export interface VideoEncodingOptions {
  quality: VideoQuality;
  fps: number;
}

// Quality presets for different use cases
export const QUALITY_PRESETS: Record<VideoQuality, {
  crf: number;        // Lower = higher quality (18 is visually lossless, 23 is good, 28 is mediocre)
  preset: string;     // Encoding speed vs quality tradeoff
  bitrate: number;    // Video bitrate in bps for MediaRecorder
  audioBitrate: string; // Audio bitrate for FFmpeg
  description: string;
}> = {
  standard: {
    crf: 23,
    preset: 'medium',
    bitrate: 8_000_000,
    audioBitrate: '128k',
    description: 'Good quality, smaller file size',
  },
  high: {
    crf: 18,
    preset: 'slow',
    bitrate: 15_000_000,
    audioBitrate: '192k',
    description: 'High quality, medium file size',
  },
  maximum: {
    crf: 15,
    preset: 'slower',
    bitrate: 25_000_000,
    audioBitrate: '256k',
    description: 'Maximum quality, larger file size',
  },
};

export interface ConversionProgress {
  phase: 'loading' | 'converting' | 'done' | 'error';
  progress: number;
  message: string;
}

// Check if the browser environment supports FFmpeg.wasm
export function checkFFmpegEnvironment(): { 
  supported: boolean; 
  hasSharedArrayBuffer: boolean;
  isCrossOriginIsolated: boolean;
  reason?: string;
} {
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isCrossOriginIsolated = typeof window !== 'undefined' && 
    'crossOriginIsolated' in window && 
    window.crossOriginIsolated === true;
  
  console.log('[FFmpeg] Environment check:', {
    hasSharedArrayBuffer,
    isCrossOriginIsolated,
    crossOriginIsolatedValue: typeof window !== 'undefined' ? (window as any).crossOriginIsolated : 'N/A'
  });
  
  if (!hasSharedArrayBuffer) {
    return {
      supported: false,
      hasSharedArrayBuffer,
      isCrossOriginIsolated,
      reason: 'SharedArrayBuffer is not available in this browser.'
    };
  }
  
  if (!isCrossOriginIsolated) {
    return {
      supported: false,
      hasSharedArrayBuffer,
      isCrossOriginIsolated,
      reason: 'Page is not cross-origin isolated. Server must send COOP and COEP headers.'
    };
  }
  
  return {
    supported: true,
    hasSharedArrayBuffer,
    isCrossOriginIsolated
  };
}

async function loadFFmpeg(onProgress?: (progress: ConversionProgress) => void): Promise<FFmpeg> {
  // Check environment first
  const envCheck = checkFFmpegEnvironment();
  if (!envCheck.supported) {
    throw new Error(envCheck.reason || 'FFmpeg not supported in this environment');
  }

  if (ffmpeg && ffmpeg.loaded) {
    console.log('[FFmpeg] Already loaded, reusing instance');
    return ffmpeg;
  }

  // If we previously failed to load, throw the cached error
  if (loadError) {
    throw loadError;
  }

  if (isLoading) {
    console.log('[FFmpeg] Already loading, waiting...');
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpeg && ffmpeg.loaded) {
      return ffmpeg;
    }
    if (loadError) {
      throw loadError;
    }
  }

  isLoading = true;
  console.log('[FFmpeg] Starting load...');
  
  try {
    ffmpeg = new FFmpeg();
    
    ffmpeg.on('log', ({ type, message }) => {
      console.log(`[FFmpeg ${type}]`, message);
    });
    
    ffmpeg.on('progress', ({ progress, time }) => {
      console.log(`[FFmpeg] Progress: ${Math.round(progress * 100)}%, time: ${time}`);
      onProgress?.({
        phase: 'converting',
        progress: Math.round(progress * 100),
        message: `Converting: ${Math.round(progress * 100)}%`,
      });
    });

    onProgress?.({
      phase: 'loading',
      progress: 0,
      message: 'Loading video converter...',
    });

    // Load FFmpeg with CORS-enabled URLs
    // Using version 0.12.10 to match @ffmpeg/ffmpeg 0.12.x
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
    console.log('[FFmpeg] Fetching core files from:', baseURL);
    
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    console.log('[FFmpeg] Core JS loaded');
    
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
    console.log('[FFmpeg] WASM loaded');
    
    await ffmpeg.load({
      coreURL,
      wasmURL,
    });
    
    console.log('[FFmpeg] Successfully loaded!');

    onProgress?.({
      phase: 'loading',
      progress: 100,
      message: 'Converter ready',
    });

    return ffmpeg;
  } catch (error) {
    console.error('[FFmpeg] Load failed:', error);
    loadError = error instanceof Error ? error : new Error(String(error));
    ffmpeg = null;
    throw loadError;
  } finally {
    isLoading = false;
  }
}

export async function convertWebmToMp4(
  webmBlob: Blob,
  onProgress?: (progress: ConversionProgress) => void,
  quality: VideoQuality = 'high'
): Promise<Blob> {
  console.log('[FFmpeg] Starting WebM to MP4 conversion, input size:', webmBlob.size, 'quality:', quality);
  
  const qualitySettings = QUALITY_PRESETS[quality];
  const ff = await loadFFmpeg(onProgress);

  onProgress?.({
    phase: 'converting',
    progress: 0,
    message: 'Preparing video...',
  });

  // Write the WebM file to FFmpeg's virtual file system
  console.log('[FFmpeg] Writing input file...');
  const webmData = await fetchFile(webmBlob);
  await ff.writeFile('input.webm', webmData);
  console.log('[FFmpeg] Input file written, size:', webmData.length);

  onProgress?.({
    phase: 'converting',
    progress: 10,
    message: `Converting to MP4 (${quality} quality)...`,
  });

  // Convert WebM to MP4 with quality-based settings
  // Using libx264 for video and aac for audio
  console.log('[FFmpeg] Starting conversion with CRF:', qualitySettings.crf, 'preset:', qualitySettings.preset);
  const execResult = await ff.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-preset', qualitySettings.preset,
    '-crf', String(qualitySettings.crf),
    // Use high quality encoding profile
    '-profile:v', 'high',
    '-level', '4.2',
    // Better color handling
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', qualitySettings.audioBitrate,
    '-movflags', '+faststart',
    '-y', // Overwrite output file
    'output.mp4'
  ]);
  console.log('[FFmpeg] Conversion exec result:', execResult);

  onProgress?.({
    phase: 'converting',
    progress: 90,
    message: 'Finalizing...',
  });

  // Read the output file
  console.log('[FFmpeg] Reading output file...');
  const mp4Data = await ff.readFile('output.mp4');
  console.log('[FFmpeg] Output file read, size:', mp4Data instanceof Uint8Array ? mp4Data.length : 'unknown');
  
  // Clean up
  await ff.deleteFile('input.webm');
  await ff.deleteFile('output.mp4');

  onProgress?.({
    phase: 'done',
    progress: 100,
    message: 'Conversion complete!',
  });

  // Create blob from the output
  // FFmpeg returns Uint8Array, we need to copy it to a regular ArrayBuffer
  if (mp4Data instanceof Uint8Array) {
    const buffer = new ArrayBuffer(mp4Data.length);
    const view = new Uint8Array(buffer);
    view.set(mp4Data);
    const blob = new Blob([buffer], { type: 'video/mp4' });
    console.log('[FFmpeg] Created MP4 blob, size:', blob.size);
    return blob;
  }
  
  // Fallback for string data (shouldn't happen for binary files)
  console.warn('[FFmpeg] Unexpected data type, using fallback');
  return new Blob([mp4Data], { type: 'video/mp4' });
}

export function isFFmpegSupported(): boolean {
  const check = checkFFmpegEnvironment();
  return check.supported;
}

/**
 * Advanced video generation using FFmpeg directly (bypasses MediaRecorder)
 * This provides the best quality by:
 * 1. Rendering frames as high-quality PNG images
 * 2. Encoding directly with FFmpeg using optimal settings
 * 3. Full control over encoding parameters
 */
export async function generateVideoWithFFmpeg(
  canvas: HTMLCanvasElement,
  renderFrame: (frameIndex: number) => void,
  totalFrames: number,
  fps: number,
  audioBlob: Blob | null,
  audioStartTime: number,
  audioVolume: number,
  quality: VideoQuality,
  onProgress?: (progress: ConversionProgress) => void
): Promise<Blob> {
  const qualitySettings = QUALITY_PRESETS[quality];
  const ff = await loadFFmpeg(onProgress);
  
  console.log('[FFmpeg Direct] Starting frame-by-frame encoding');
  console.log(`[FFmpeg Direct] Total frames: ${totalFrames}, FPS: ${fps}, Quality: ${quality}`);
  
  onProgress?.({
    phase: 'converting',
    progress: 0,
    message: 'Generating video frames...',
  });

  // Generate and write each frame as a PNG
  const frameDigits = String(totalFrames).length;
  
  for (let i = 0; i < totalFrames; i++) {
    // Render the frame to canvas
    renderFrame(i);
    
    // Convert canvas to PNG blob (higher quality than JPEG for video frames)
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    
    // Write frame to FFmpeg virtual filesystem
    const frameNum = String(i).padStart(frameDigits, '0');
    const frameData = await fetchFile(blob);
    await ff.writeFile(`frame_${frameNum}.png`, frameData);
    
    // Update progress (60% of total for frame generation)
    const frameProgress = Math.round((i / totalFrames) * 60);
    onProgress?.({
      phase: 'converting',
      progress: frameProgress,
      message: `Generating frames: ${i + 1}/${totalFrames}`,
    });
  }
  
  console.log('[FFmpeg Direct] All frames written, starting encoding...');
  
  onProgress?.({
    phase: 'converting',
    progress: 60,
    message: 'Encoding video...',
  });

  // Build FFmpeg command
  const ffmpegArgs: string[] = [
    // Input: image sequence
    '-framerate', String(fps),
    '-i', `frame_%0${frameDigits}d.png`,
  ];
  
  // Add audio if available
  if (audioBlob) {
    const audioData = await fetchFile(audioBlob);
    await ff.writeFile('audio.mp3', audioData);
    ffmpegArgs.push(
      '-ss', String(audioStartTime),    // Start time in audio
      '-i', 'audio.mp3',
      '-filter:a', `volume=${audioVolume}`,  // Apply volume
      '-shortest'  // End video when shortest stream ends
    );
  }
  
  // Output encoding settings for maximum quality
  ffmpegArgs.push(
    '-c:v', 'libx264',
    '-preset', qualitySettings.preset,
    '-crf', String(qualitySettings.crf),
    '-profile:v', 'high',
    '-level', '4.2',
    '-pix_fmt', 'yuv420p',
    // Ensure proper color space handling
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
  );
  
  if (audioBlob) {
    ffmpegArgs.push(
      '-c:a', 'aac',
      '-b:a', qualitySettings.audioBitrate,
    );
  }
  
  ffmpegArgs.push(
    '-movflags', '+faststart',
    '-y',
    'output.mp4'
  );
  
  console.log('[FFmpeg Direct] Running encode with args:', ffmpegArgs.join(' '));
  const execResult = await ff.exec(ffmpegArgs);
  console.log('[FFmpeg Direct] Encode result:', execResult);
  
  onProgress?.({
    phase: 'converting',
    progress: 95,
    message: 'Finalizing video...',
  });

  // Read output
  const mp4Data = await ff.readFile('output.mp4');
  
  // Cleanup all frame files
  for (let i = 0; i < totalFrames; i++) {
    const frameNum = String(i).padStart(frameDigits, '0');
    try {
      await ff.deleteFile(`frame_${frameNum}.png`);
    } catch {
      // Ignore cleanup errors
    }
  }
  
  try {
    await ff.deleteFile('output.mp4');
    if (audioBlob) await ff.deleteFile('audio.mp3');
  } catch {
    // Ignore cleanup errors
  }
  
  onProgress?.({
    phase: 'done',
    progress: 100,
    message: 'Video complete!',
  });
  
  if (mp4Data instanceof Uint8Array) {
    const buffer = new ArrayBuffer(mp4Data.length);
    const view = new Uint8Array(buffer);
    view.set(mp4Data);
    const blob = new Blob([buffer], { type: 'video/mp4' });
    console.log('[FFmpeg Direct] Created MP4 blob, size:', blob.size);
    return blob;
  }
  
  return new Blob([mp4Data], { type: 'video/mp4' });
}

/**
 * Check if direct FFmpeg encoding is available (for advanced high-quality mode)
 */
export function isDirectFFmpegEncodingSupported(): boolean {
  return isFFmpegSupported();
}

// Get detailed support status for UI display
export function getFFmpegSupportStatus(): { 
  supported: boolean; 
  message: string;
} {
  const check = checkFFmpegEnvironment();
  
  if (check.supported) {
    return {
      supported: true,
      message: 'MP4 export is available'
    };
  }
  
  if (!check.hasSharedArrayBuffer) {
    return {
      supported: false,
      message: 'Your browser does not support SharedArrayBuffer. Try Chrome, Edge, or Firefox.'
    };
  }
  
  if (!check.isCrossOriginIsolated) {
    return {
      supported: false,
      message: 'Cross-Origin Isolation required. Run "npm run dev" to enable proper headers.'
    };
  }
  
  return {
    supported: false,
    message: check.reason || 'MP4 export is not available'
  };
}
