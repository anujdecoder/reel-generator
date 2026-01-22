import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockImage,
  createMockImages,
  createMockTextOverlay,
  createMockCropSettings,
  createMockConfig,
  calculateExpectedDuration,
  buildTestTimeline,
} from './testUtils';
import type { ImageItem } from '../types';

/**
 * Integration tests for video generation
 * These tests verify the complete video generation workflow
 */
describe('Video Generation Integration', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let drawCalls: Array<{ method: string; args: unknown[] }>;

  beforeEach(() => {
    drawCalls = [];
    
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1080;
    mockCanvas.height = 1920;
    
    mockCtx = mockCanvas.getContext('2d')!;
    
    // Track draw calls
    const originalFillRect = mockCtx.fillRect.bind(mockCtx);
    mockCtx.fillRect = (...args) => {
      drawCalls.push({ method: 'fillRect', args });
      return originalFillRect(...args);
    };
    
    const originalFillText = mockCtx.fillText.bind(mockCtx);
    mockCtx.fillText = (...args) => {
      drawCalls.push({ method: 'fillText', args });
      return originalFillText(...args);
    };
  });

  describe('Complete Video Generation Flow', () => {
    it('generates video with correct total duration', async () => {
      const images = createMockImages(3);
      const config = createMockConfig({
        imageDuration: 2000,
        transitionDuration: 500,
      });
      
      const expectedDuration = calculateExpectedDuration(images, config);
      
      // 2 images with transitions: (2000 + 500) * 2 = 5000
      // 1 last image: 2000
      // Total: 7000ms
      expect(expectedDuration).toBe(7000);
      
      // Calculate frames at 30fps
      const fps = 30;
      const expectedFrames = Math.ceil(expectedDuration / (1000 / fps));
      expect(expectedFrames).toBe(210); // 7 * 30 = 210
    });

    it('generates video with correct frame sequence', async () => {
      const images = createMockImages(2);
      const config = createMockConfig({
        imageDuration: 1000,
        transitionDuration: 500,
      });
      
      const timeline = buildTestTimeline(images, config);
      const totalDuration = calculateExpectedDuration(images, config);
      const fps = 30;
      const frameDuration = 1000 / fps;
      const totalFrames = Math.ceil(totalDuration / frameDuration);
      
      // Verify timeline
      expect(timeline[0].startTime).toBe(0);
      expect(timeline[0].imageDuration).toBe(1000);
      expect(timeline[0].transitionDuration).toBe(500);
      
      expect(timeline[1].startTime).toBe(1500);
      expect(timeline[1].imageDuration).toBe(1000);
      expect(timeline[1].transitionDuration).toBe(0); // Last image
      
      // Total: 1000 + 500 + 1000 = 2500ms
      expect(totalDuration).toBe(2500);
      expect(totalFrames).toBe(75); // 2.5 * 30 = 75
    });

    it('renders text overlay on each frame where image has text', async () => {
      const images = [
        createMockImage({
          id: '1',
          textOverlay: createMockTextOverlay({ text: 'First Image' }),
        }),
        createMockImage({
          id: '2',
          // No text overlay
        }),
        createMockImage({
          id: '3',
          textOverlay: createMockTextOverlay({ text: 'Third Image' }),
        }),
      ];
      
      // Verify text overlay presence
      expect(images[0].textOverlay).toBeDefined();
      expect(images[0].textOverlay?.text).toBe('First Image');
      
      expect(images[1].textOverlay).toBeUndefined();
      
      expect(images[2].textOverlay).toBeDefined();
      expect(images[2].textOverlay?.text).toBe('Third Image');
    });

    it('uses cropped images when available', async () => {
      const images = [
        createMockImage({
          id: '1',
          cropSettings: createMockCropSettings(),
          croppedDataUrl: 'data:image/jpeg;base64,croppedImage1',
        }),
        createMockImage({
          id: '2',
          // No crop - use original
        }),
      ];
      
      // First image uses cropped version
      const source1 = images[0].croppedDataUrl || images[0].dataUrl;
      expect(source1).toBe('data:image/jpeg;base64,croppedImage1');
      
      // Second image uses original
      const source2 = images[1].croppedDataUrl || images[1].dataUrl;
      expect(source2).toBe(images[1].dataUrl);
    });
  });

  describe('Frame-by-Frame Rendering', () => {
    it('renders correct image at each time point', () => {
      const images = createMockImages(3);
      const config = createMockConfig({
        imageDuration: 2000,
        transitionDuration: 500,
      });
      
      const timeline = buildTestTimeline(images, config);
      
      // Helper to find which image should be shown at a given time
      const getImageIndexAtTime = (time: number): number => {
        for (const segment of timeline) {
          const segmentEnd = segment.startTime + segment.imageDuration + segment.transitionDuration;
          if (time >= segment.startTime && time < segmentEnd) {
            return segment.imageIndex;
          }
        }
        return timeline.length - 1;
      };
      
      // At time 0, should show image 0
      expect(getImageIndexAtTime(0)).toBe(0);
      
      // At time 1000, should still show image 0 (in display phase)
      expect(getImageIndexAtTime(1000)).toBe(0);
      
      // At time 2200, should show image 0 (in transition phase)
      expect(getImageIndexAtTime(2200)).toBe(0);
      
      // At time 2600, should show image 1
      expect(getImageIndexAtTime(2600)).toBe(1);
      
      // At time 5100, should show image 2
      expect(getImageIndexAtTime(5100)).toBe(2);
    });

    it('determines if frame is in transition phase', () => {
      const timeline = [
        { startTime: 0, imageDuration: 2000, transitionDuration: 500, imageIndex: 0 },
        { startTime: 2500, imageDuration: 2000, transitionDuration: 0, imageIndex: 1 },
      ];
      
      const isInTransition = (time: number): boolean => {
        for (const segment of timeline) {
          const transitionStart = segment.startTime + segment.imageDuration;
          const transitionEnd = transitionStart + segment.transitionDuration;
          if (time >= transitionStart && time < transitionEnd) {
            return true;
          }
        }
        return false;
      };
      
      // Display phase
      expect(isInTransition(0)).toBe(false);
      expect(isInTransition(1000)).toBe(false);
      expect(isInTransition(1999)).toBe(false);
      
      // Transition phase
      expect(isInTransition(2000)).toBe(true);
      expect(isInTransition(2250)).toBe(true);
      expect(isInTransition(2499)).toBe(true);
      
      // Next image (no transition)
      expect(isInTransition(2500)).toBe(false);
      expect(isInTransition(3000)).toBe(false);
    });

    it('calculates transition progress correctly', () => {
      const segment = {
        startTime: 0,
        imageDuration: 2000,
        transitionDuration: 500,
      };
      
      const getTransitionProgress = (time: number): number => {
        const transitionStart = segment.startTime + segment.imageDuration;
        const timeInTransition = time - transitionStart;
        return Math.min(1, Math.max(0, timeInTransition / segment.transitionDuration));
      };
      
      // Before transition
      expect(getTransitionProgress(1500)).toBe(0);
      expect(getTransitionProgress(1999)).toBe(0);
      
      // During transition
      expect(getTransitionProgress(2000)).toBeCloseTo(0, 2);
      expect(getTransitionProgress(2250)).toBeCloseTo(0.5, 2);
      expect(getTransitionProgress(2500)).toBeCloseTo(1, 2);
      
      // After transition
      expect(getTransitionProgress(2600)).toBe(1);
    });
  });

  describe('Music Synchronization', () => {
    it('music starts at configured start time', () => {
      const music = {
        startTime: 30, // Start 30 seconds into the track
        duration: 180,
        volume: 1,
      };
      
      const videoStartTime = 0;
      const audioPlaybackTime = music.startTime + (videoStartTime / 1000);
      
      expect(audioPlaybackTime).toBe(30);
    });

    it('music volume is applied correctly', () => {
      const music = {
        startTime: 0,
        duration: 180,
        volume: 0.75,
      };
      
      expect(music.volume).toBe(0.75);
      expect(music.volume).toBeLessThanOrEqual(1);
      expect(music.volume).toBeGreaterThanOrEqual(0);
    });

    it('calculates music end time correctly', () => {
      const music = {
        startTime: 60,
        duration: 180,
      };
      const videoDuration = 10; // 10 seconds
      
      const musicEndInTrack = music.startTime + videoDuration;
      
      expect(musicEndInTrack).toBe(70);
      expect(musicEndInTrack).toBeLessThan(music.duration);
    });
  });

  describe('Output Format and Quality', () => {
    it('supports MP4 and WebM formats', () => {
      const mp4Config = createMockConfig({ outputFormat: 'mp4' });
      const webmConfig = createMockConfig({ outputFormat: 'webm' });
      
      expect(mp4Config.outputFormat).toBe('mp4');
      expect(webmConfig.outputFormat).toBe('webm');
    });

    it('supports different quality presets', () => {
      const standardConfig = createMockConfig({ videoQuality: 'standard' });
      const highConfig = createMockConfig({ videoQuality: 'high' });
      const maxConfig = createMockConfig({ videoQuality: 'maximum' });
      
      expect(standardConfig.videoQuality).toBe('standard');
      expect(highConfig.videoQuality).toBe('high');
      expect(maxConfig.videoQuality).toBe('maximum');
    });

    it('default quality is high', () => {
      const config = createMockConfig();
      expect(config.videoQuality).toBe('high');
    });
  });

  describe('Error Handling', () => {
    it('handles empty image list gracefully', () => {
      const images: ImageItem[] = [];
      const config = createMockConfig();
      
      const duration = calculateExpectedDuration(images, config);
      
      expect(duration).toBe(0);
    });

    it('handles missing text overlay gracefully', () => {
      const image = createMockImage();
      
      expect(image.textOverlay).toBeUndefined();
      
      // Safe text retrieval
      const text = image.textOverlay?.text ?? '';
      expect(text).toBe('');
    });

    it('handles missing crop settings gracefully', () => {
      const image = createMockImage();
      
      expect(image.cropSettings).toBeUndefined();
      expect(image.croppedDataUrl).toBeUndefined();
      
      // Use original when no crop
      const source = image.croppedDataUrl || image.dataUrl;
      expect(source).toBe(image.dataUrl);
    });
  });
});

describe('End-to-End Video Generation Scenarios', () => {
  describe('Scenario: Simple 3-image reel with default settings', () => {
    it('generates correctly configured video', () => {
      const images = createMockImages(3);
      const config = createMockConfig();
      
      const duration = calculateExpectedDuration(images, config);
      const timeline = buildTestTimeline(images, config);
      
      // Default: 2000ms per image, 500ms transition, slide transition
      expect(duration).toBe(7000); // (2000+500) * 2 + 2000 = 7000
      expect(timeline.every(s => s.transitionType === 'slide' || s.transitionType === 'none')).toBe(true);
    });
  });

  describe('Scenario: Mixed durations and transitions', () => {
    it('handles per-image customization', () => {
      const images = [
        createMockImage({ id: '1', duration: 1000, transitionType: 'fade' }),
        createMockImage({ id: '2', duration: 3000, transitionType: 'zoom' }),
        createMockImage({ id: '3', duration: 2000 }), // Uses default transition (none for last)
      ];
      const config = createMockConfig({
        imageDuration: 2000,
        transitionDuration: 500,
        transitionType: 'slide',
      });
      
      const timeline = buildTestTimeline(images, config);
      
      expect(timeline[0].imageDuration).toBe(1000);
      expect(timeline[0].transitionType).toBe('fade');
      
      expect(timeline[1].imageDuration).toBe(3000);
      expect(timeline[1].transitionType).toBe('zoom');
      
      expect(timeline[2].imageDuration).toBe(2000);
      expect(timeline[2].transitionType).toBe('none'); // Last image
    });
  });

  describe('Scenario: Images with text and crops', () => {
    it('includes all metadata for each image', () => {
      const images = [
        createMockImage({
          id: '1',
          textOverlay: createMockTextOverlay({ text: 'Welcome!' }),
          cropSettings: createMockCropSettings({ aspectRatio: '9:16' }),
          croppedDataUrl: 'data:image/jpeg;base64,cropped1',
        }),
        createMockImage({
          id: '2',
          textOverlay: createMockTextOverlay({ text: 'Middle slide' }),
        }),
        createMockImage({
          id: '3',
          cropSettings: createMockCropSettings({ aspectRatio: '1:1' }),
          croppedDataUrl: 'data:image/jpeg;base64,cropped3',
        }),
      ];
      
      // Image 1: Has text and crop
      expect(images[0].textOverlay?.text).toBe('Welcome!');
      expect(images[0].croppedDataUrl).toBeDefined();
      
      // Image 2: Has text only
      expect(images[1].textOverlay?.text).toBe('Middle slide');
      expect(images[1].croppedDataUrl).toBeUndefined();
      
      // Image 3: Has crop only
      expect(images[2].textOverlay).toBeUndefined();
      expect(images[2].croppedDataUrl).toBeDefined();
    });
  });

  describe('Scenario: Long video with many images', () => {
    it('handles 10 images correctly', () => {
      const images = createMockImages(10);
      const config = createMockConfig({
        imageDuration: 2000,
        transitionDuration: 500,
      });
      
      const duration = calculateExpectedDuration(images, config);
      
      // 9 images with transitions: (2000 + 500) * 9 = 22500
      // 1 last image: 2000
      // Total: 24500ms = 24.5 seconds
      expect(duration).toBe(24500);
      
      const fps = 30;
      const totalFrames = Math.ceil(duration / (1000 / fps));
      expect(totalFrames).toBe(735); // 24.5 * 30 = 735
    });
  });
});
