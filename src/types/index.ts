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

export interface ImageItem {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
  textOverlay?: TextOverlay;
}

export interface ReelConfig {
  transitionDuration: number; // Duration of transition in ms
  imageDuration: number; // How long each image shows in ms
  transitionType: TransitionType;
}

export type TransitionType = 'fade' | 'slide' | 'zoom' | 'none';
