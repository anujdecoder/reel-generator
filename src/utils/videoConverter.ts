import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoading = false;
let loadError: Error | null = null;

export type VideoFormat = 'webm' | 'mp4';

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
  onProgress?: (progress: ConversionProgress) => void
): Promise<Blob> {
  console.log('[FFmpeg] Starting WebM to MP4 conversion, input size:', webmBlob.size);
  
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
    message: 'Converting to MP4...',
  });

  // Convert WebM to MP4
  // Using libx264 for video and aac for audio
  console.log('[FFmpeg] Starting conversion...');
  const execResult = await ff.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
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
