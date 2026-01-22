import type { ImageItem, ReelConfig, TextOverlay, CropSettings, MusicTrack } from '../types';

/**
 * Create a mock image item for testing
 */
export function createMockImage(overrides?: Partial<ImageItem>): ImageItem {
  return {
    id: `test-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'test-image.jpg',
    dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAABmgP/2Q==',
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Create a mock text overlay for testing
 */
export function createMockTextOverlay(overrides?: Partial<TextOverlay>): TextOverlay {
  return {
    text: 'Test Text',
    position: 'bottom',
    fontSize: 32,
    fontColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    fontWeight: 'bold',
    textAlign: 'center',
    ...overrides,
  };
}

/**
 * Create mock crop settings for testing
 */
export function createMockCropSettings(overrides?: Partial<CropSettings>): CropSettings {
  return {
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
    zoom: 1,
    aspectRatio: '9:16',
    ...overrides,
  };
}

/**
 * Create a mock music track for testing
 */
export function createMockMusicTrack(overrides?: Partial<MusicTrack>): MusicTrack {
  return {
    id: `music-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'test-song.mp3',
    dataUrl: 'data:audio/mp3;base64,TestAudioData',
    duration: 180, // 3 minutes
    startTime: 0,
    endTime: 30,
    volume: 1,
    ...overrides,
  };
}

/**
 * Create a default reel config for testing
 */
export function createMockConfig(overrides?: Partial<ReelConfig>): ReelConfig {
  return {
    transitionDuration: 500,
    imageDuration: 2000,
    transitionType: 'slide',
    outputFormat: 'mp4',
    videoQuality: 'high',
    useDirectEncoding: false, // Use MediaRecorder for simpler testing
    videoDimensions: '1080x1920',
    ...overrides,
  };
}

/**
 * Create multiple mock images with sequential IDs
 */
export function createMockImages(count: number, customizations?: (index: number) => Partial<ImageItem>): ImageItem[] {
  return Array.from({ length: count }, (_, i) => {
    const custom = customizations ? customizations(i) : {};
    return createMockImage({
      id: `image-${i + 1}`,
      name: `image-${i + 1}.jpg`,
      ...custom,
    });
  });
}

/**
 * Calculate expected video duration based on images and config
 */
export function calculateExpectedDuration(images: ImageItem[], config: ReelConfig): number {
  if (images.length === 0) return 0;
  
  let total = 0;
  for (let i = 0; i < images.length; i++) {
    const imageDuration = images[i].duration ?? config.imageDuration;
    // Last image has no transition
    const transitionDuration = i === images.length - 1 ? 0 : config.transitionDuration;
    total += imageDuration + transitionDuration;
  }
  
  return total;
}

/**
 * Build timeline segments for testing
 */
export interface TimelineSegment {
  startTime: number;
  imageDuration: number;
  transitionDuration: number;
  transitionType: string;
  imageIndex: number;
}

export function buildTestTimeline(images: ImageItem[], config: ReelConfig): TimelineSegment[] {
  const timeline: TimelineSegment[] = [];
  let currentTime = 0;
  
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const imageDuration = img.duration ?? config.imageDuration;
    const transitionType = img.transitionType ?? config.transitionType;
    const isLastImage = i === images.length - 1;
    const transitionDuration = isLastImage ? 0 : config.transitionDuration;
    
    timeline.push({
      startTime: currentTime,
      imageDuration,
      transitionDuration,
      transitionType: isLastImage ? 'none' : transitionType,
      imageIndex: i,
    });
    
    currentTime += imageDuration + transitionDuration;
  }
  
  return timeline;
}

/**
 * Wait for all pending promises/timers
 */
export async function flushPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Wait for a specified number of milliseconds
 */
export async function wait(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}
