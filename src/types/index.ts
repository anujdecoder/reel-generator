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
}

export type TransitionType = 'fade' | 'slide' | 'zoom' | 'none';
export type VideoFormat = 'webm' | 'mp4';
