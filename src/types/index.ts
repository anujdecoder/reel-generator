export interface TextOverlay {
  text: string;
  position: TextPosition;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
}

export type TextPosition = 'top' | 'center' | 'bottom';

export interface CropSettings {
  x: number;      // Crop area X position (0-1 relative to image)
  y: number;      // Crop area Y position (0-1 relative to image)
  width: number;  // Crop area width (0-1 relative to image)
  height: number; // Crop area height (0-1 relative to image)
  zoom: number;   // Zoom level (1 = no zoom)
  aspectRatio: AspectRatio;
}

export type AspectRatio = '9:16' | '1:1' | '4:5' | '16:9' | 'free';

export interface ImageItem {
  id: string;
  name: string;
  dataUrl: string;
  croppedDataUrl?: string; // Cached cropped image
  createdAt: number;
  textOverlay?: TextOverlay;
  cropSettings?: CropSettings;
  // Per-image timing settings (optional, uses global defaults if not set)
  duration?: number; // How long this image shows in ms
  transitionType?: TransitionType; // Transition to next image
}

export interface MusicTrack {
  id: string;
  name: string;
  dataUrl: string;
  duration: number; // Total duration in seconds
  startTime: number; // Selected start time in seconds
  endTime: number; // Selected end time in seconds
  volume: number; // 0 to 1
}

export interface ReelConfig {
  transitionDuration: number; // Duration of transition in ms
  imageDuration: number; // How long each image shows in ms
  transitionType: TransitionType;
  music?: MusicTrack;
  outputFormat: VideoFormat;
  videoQuality: VideoQuality;
  useDirectEncoding: boolean; // Use advanced FFmpeg encoding (bypasses MediaRecorder)
  videoDimensions: VideoDimensions; // Output video dimensions
}

export type TransitionType = 'fade' | 'slide' | 'zoom' | 'none';
export type VideoFormat = 'webm' | 'mp4';
export type VideoQuality = 'standard' | 'high' | 'maximum';
export type VideoDimensions = '1080x1920' | '1080x1080' | '1080x1350' | '1920x1080' | '720x1280' | '720x720';

// Video dimension presets with metadata
export const VIDEO_DIMENSION_PRESETS: Record<VideoDimensions, {
  width: number;
  height: number;
  label: string;
  aspectRatio: string;
  description: string;
}> = {
  '1080x1920': {
    width: 1080,
    height: 1920,
    label: '1080×1920',
    aspectRatio: '9:16',
    description: 'Vertical HD (Reels, TikTok, Stories)',
  },
  '1080x1350': {
    width: 1080,
    height: 1350,
    label: '1080×1350',
    aspectRatio: '4:5',
    description: 'Portrait (Instagram Feed)',
  },
  '1080x1080': {
    width: 1080,
    height: 1080,
    label: '1080×1080',
    aspectRatio: '1:1',
    description: 'Square (Instagram, Facebook)',
  },
  '1920x1080': {
    width: 1920,
    height: 1080,
    label: '1920×1080',
    aspectRatio: '16:9',
    description: 'Landscape HD (YouTube, TV)',
  },
  '720x1280': {
    width: 720,
    height: 1280,
    label: '720×1280',
    aspectRatio: '9:16',
    description: 'Vertical SD (Smaller file)',
  },
  '720x720': {
    width: 720,
    height: 720,
    label: '720×720',
    aspectRatio: '1:1',
    description: 'Square SD (Smaller file)',
  },
};
