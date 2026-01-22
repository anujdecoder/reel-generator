import { describe, it, expect } from 'vitest';
import {
  createMockImage,
  createMockImages,
  createMockTextOverlay,
  createMockCropSettings,
  createMockConfig,
  createMockMusicTrack,
  calculateExpectedDuration,
  buildTestTimeline,
} from './testUtils';
import type { ImageItem, ReelConfig } from '../types';

describe('Video Generation', () => {
  describe('Video Duration Calculation', () => {
    it('calculates correct duration for single image (no transition)', () => {
      const images = createMockImages(1);
      const config = createMockConfig({ imageDuration: 3000, transitionDuration: 500 });
      
      const duration = calculateExpectedDuration(images, config);
      
      // Single image: just the image duration, no transition
      expect(duration).toBe(3000);
    });

    it('calculates correct duration for two images with transition', () => {
      const images = createMockImages(2);
      const config = createMockConfig({ imageDuration: 2000, transitionDuration: 500 });
      
      const duration = calculateExpectedDuration(images, config);
      
      // Image 1: 2000ms + 500ms transition
      // Image 2: 2000ms + 0ms (no transition for last image)
      // Total: 4500ms
      expect(duration).toBe(4500);
    });

    it('calculates correct duration for multiple images', () => {
      const images = createMockImages(5);
      const config = createMockConfig({ imageDuration: 2000, transitionDuration: 500 });
      
      const duration = calculateExpectedDuration(images, config);
      
      // 4 images with transitions: (2000 + 500) * 4 = 10000ms
      // 1 last image without transition: 2000ms
      // Total: 12000ms
      expect(duration).toBe(12000);
    });

    it('respects per-image custom durations', () => {
      const images = createMockImages(3, (i) => ({
        duration: (i + 1) * 1000, // 1000, 2000, 3000
      }));
      const config = createMockConfig({ imageDuration: 2000, transitionDuration: 500 });
      
      const duration = calculateExpectedDuration(images, config);
      
      // Image 1: 1000 + 500 = 1500
      // Image 2: 2000 + 500 = 2500
      // Image 3: 3000 + 0 = 3000
      // Total: 7000ms
      expect(duration).toBe(7000);
    });

    it('uses default duration when image has no custom duration', () => {
      const images = [
        createMockImage({ id: '1', duration: 1000 }),
        createMockImage({ id: '2' }), // No custom duration
        createMockImage({ id: '3', duration: 3000 }),
      ];
      const config = createMockConfig({ imageDuration: 2000, transitionDuration: 500 });
      
      const duration = calculateExpectedDuration(images, config);
      
      // Image 1: 1000 + 500 = 1500
      // Image 2: 2000 (default) + 500 = 2500
      // Image 3: 3000 + 0 = 3000
      // Total: 7000ms
      expect(duration).toBe(7000);
    });

    it('returns 0 for empty image list', () => {
      const images: ImageItem[] = [];
      const config = createMockConfig();
      
      const duration = calculateExpectedDuration(images, config);
      
      expect(duration).toBe(0);
    });
  });

  describe('Timeline Building', () => {
    it('builds correct timeline for multiple images', () => {
      const images = createMockImages(3);
      const config = createMockConfig({ 
        imageDuration: 2000, 
        transitionDuration: 500,
        transitionType: 'slide',
      });
      
      const timeline = buildTestTimeline(images, config);
      
      expect(timeline).toHaveLength(3);
      
      // First segment
      expect(timeline[0]).toEqual({
        startTime: 0,
        imageDuration: 2000,
        transitionDuration: 500,
        transitionType: 'slide',
        imageIndex: 0,
      });
      
      // Second segment
      expect(timeline[1]).toEqual({
        startTime: 2500, // 0 + 2000 + 500
        imageDuration: 2000,
        transitionDuration: 500,
        transitionType: 'slide',
        imageIndex: 1,
      });
      
      // Last segment - no transition
      expect(timeline[2]).toEqual({
        startTime: 5000, // 2500 + 2000 + 500
        imageDuration: 2000,
        transitionDuration: 0,
        transitionType: 'none',
        imageIndex: 2,
      });
    });

    it('respects per-image transition types', () => {
      const images = [
        createMockImage({ id: '1', transitionType: 'fade' }),
        createMockImage({ id: '2', transitionType: 'zoom' }),
        createMockImage({ id: '3' }), // Last image - no transition
      ];
      const config = createMockConfig({ transitionType: 'slide' });
      
      const timeline = buildTestTimeline(images, config);
      
      expect(timeline[0].transitionType).toBe('fade');
      expect(timeline[1].transitionType).toBe('zoom');
      expect(timeline[2].transitionType).toBe('none'); // Last image
    });

    it('uses default transition type for images without custom type', () => {
      const images = [
        createMockImage({ id: '1' }), // No custom transition
        createMockImage({ id: '2', transitionType: 'zoom' }),
        createMockImage({ id: '3' }),
      ];
      const config = createMockConfig({ transitionType: 'fade' });
      
      const timeline = buildTestTimeline(images, config);
      
      expect(timeline[0].transitionType).toBe('fade'); // Uses default
      expect(timeline[1].transitionType).toBe('zoom'); // Custom
      expect(timeline[2].transitionType).toBe('none'); // Last image
    });
  });

  describe('Music Integration', () => {
    it('music track duration matches video duration constraint', () => {
      const videoDuration = 10; // 10 seconds
      const musicDuration = 180; // 3 minutes
      
      const music = createMockMusicTrack({
        duration: musicDuration,
        startTime: 0,
        volume: 1,
      });
      
      // Music should play from startTime for videoDuration seconds
      const expectedPlayDuration = Math.min(musicDuration - music.startTime, videoDuration);
      expect(expectedPlayDuration).toBe(videoDuration);
    });

    it('music respects custom start time', () => {
      const videoDuration = 10;
      const musicDuration = 180;
      const startTime = 60; // Start from 1 minute into the song
      
      const music = createMockMusicTrack({
        duration: musicDuration,
        startTime,
        volume: 1,
      });
      
      // Remaining music from startTime
      const remainingMusicDuration = music.duration - music.startTime; // 120 seconds
      const expectedPlayDuration = Math.min(remainingMusicDuration, videoDuration);
      
      expect(expectedPlayDuration).toBe(videoDuration);
    });

    it('music ends early if track is shorter than video', () => {
      const videoDuration = 30;
      const musicDuration = 20;
      const startTime = 5;
      
      const music = createMockMusicTrack({
        duration: musicDuration,
        startTime,
        volume: 0.8,
      });
      
      const remainingMusicDuration = music.duration - music.startTime; // 15 seconds
      const expectedPlayDuration = Math.min(remainingMusicDuration, videoDuration);
      
      expect(expectedPlayDuration).toBe(15); // Music runs out before video ends
    });

    it('respects volume setting', () => {
      const music = createMockMusicTrack({
        duration: 180,
        startTime: 0,
        volume: 0.5,
      });
      
      expect(music.volume).toBe(0.5);
      expect(music.volume).toBeGreaterThanOrEqual(0);
      expect(music.volume).toBeLessThanOrEqual(1);
    });
  });

  describe('Cropped Image Handling', () => {
    it('cropped image uses croppedDataUrl for rendering', () => {
      const cropSettings = createMockCropSettings({
        x: 0.1,
        y: 0.2,
        width: 0.6,
        height: 0.5,
      });
      
      const image = createMockImage({
        cropSettings,
        croppedDataUrl: 'data:image/jpeg;base64,croppedImageData',
      });
      
      // The croppedDataUrl should be used for rendering
      expect(image.croppedDataUrl).toBeDefined();
      expect(image.croppedDataUrl).not.toBe(image.dataUrl);
    });

    it('uncropped image uses original dataUrl', () => {
      const image = createMockImage();
      
      // No croppedDataUrl, should use original
      expect(image.croppedDataUrl).toBeUndefined();
      expect(image.dataUrl).toBeDefined();
    });

    it('crop settings define the correct region', () => {
      const cropSettings = createMockCropSettings({
        x: 0.25, // Start at 25% from left
        y: 0.1,  // Start at 10% from top
        width: 0.5, // 50% width
        height: 0.8, // 80% height
        aspectRatio: '9:16',
      });
      
      expect(cropSettings.x + cropSettings.width).toBeLessThanOrEqual(1);
      expect(cropSettings.y + cropSettings.height).toBeLessThanOrEqual(1);
      expect(cropSettings.aspectRatio).toBe('9:16');
    });

    it('getImageSource returns correct source based on crop', () => {
      const getImageSource = (image: ImageItem) => image.croppedDataUrl || image.dataUrl;
      
      const croppedImage = createMockImage({
        dataUrl: 'data:image/jpeg;base64,original',
        croppedDataUrl: 'data:image/jpeg;base64,cropped',
      });
      
      const originalImage = createMockImage({
        dataUrl: 'data:image/jpeg;base64,original',
      });
      
      expect(getImageSource(croppedImage)).toBe('data:image/jpeg;base64,cropped');
      expect(getImageSource(originalImage)).toBe('data:image/jpeg;base64,original');
    });
  });

  describe('Text Overlay', () => {
    it('text overlay has all required properties', () => {
      const textOverlay = createMockTextOverlay({
        text: 'Hello World',
        position: 'center',
        fontSize: 48,
        fontColor: '#ff0000',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        fontWeight: 'bold',
        textAlign: 'center',
      });
      
      expect(textOverlay.text).toBe('Hello World');
      expect(textOverlay.position).toBe('center');
      expect(textOverlay.fontSize).toBe(48);
      expect(textOverlay.fontColor).toBe('#ff0000');
      expect(textOverlay.backgroundColor).toBe('rgba(0, 0, 0, 0.8)');
      expect(textOverlay.fontWeight).toBe('bold');
      expect(textOverlay.textAlign).toBe('center');
    });

    it('text appears on correct image', () => {
      const images = [
        createMockImage({ id: '1' }), // No text
        createMockImage({ 
          id: '2', 
          textOverlay: createMockTextOverlay({ text: 'Image 2 Text' }),
        }),
        createMockImage({ id: '3' }), // No text
      ];
      
      expect(images[0].textOverlay).toBeUndefined();
      expect(images[1].textOverlay?.text).toBe('Image 2 Text');
      expect(images[2].textOverlay).toBeUndefined();
    });

    it('text position is correctly mapped', () => {
      const topText = createMockTextOverlay({ position: 'top' });
      const centerText = createMockTextOverlay({ position: 'center' });
      const bottomText = createMockTextOverlay({ position: 'bottom' });
      
      expect(['top', 'center', 'bottom']).toContain(topText.position);
      expect(['top', 'center', 'bottom']).toContain(centerText.position);
      expect(['top', 'center', 'bottom']).toContain(bottomText.position);
    });

    it('multiple images can have different text overlays', () => {
      const images = createMockImages(3, (i) => ({
        textOverlay: createMockTextOverlay({
          text: `Text for image ${i + 1}`,
          position: ['top', 'center', 'bottom'][i] as 'top' | 'center' | 'bottom',
        }),
      }));
      
      expect(images[0].textOverlay?.text).toBe('Text for image 1');
      expect(images[0].textOverlay?.position).toBe('top');
      
      expect(images[1].textOverlay?.text).toBe('Text for image 2');
      expect(images[1].textOverlay?.position).toBe('center');
      
      expect(images[2].textOverlay?.text).toBe('Text for image 3');
      expect(images[2].textOverlay?.position).toBe('bottom');
    });
  });

  describe('Transition Types', () => {
    it('supports all transition types', () => {
      const validTypes = ['slide', 'fade', 'zoom', 'none'] as const;
      
      validTypes.forEach(type => {
        const config = createMockConfig({ transitionType: type });
        expect(config.transitionType).toBe(type);
      });
    });

    it('default transition is slide', () => {
      const config = createMockConfig();
      expect(config.transitionType).toBe('slide');
    });

    it('per-image transition overrides global setting', () => {
      const config = createMockConfig({ transitionType: 'fade' });
      const images = [
        createMockImage({ transitionType: 'zoom' }),
        createMockImage({ transitionType: 'none' }),
        createMockImage(), // Uses global
      ];
      
      const timeline = buildTestTimeline(images, config);
      
      expect(timeline[0].transitionType).toBe('zoom');
      expect(timeline[1].transitionType).toBe('none');
      expect(timeline[2].transitionType).toBe('none'); // Last image always 'none'
    });
  });

  describe('Video Dimensions', () => {
    it('default dimension is vertical HD (1080x1920)', () => {
      const config = createMockConfig();
      expect(config.videoDimensions).toBe('1080x1920');
    });

    it('supports all video dimension presets', () => {
      const dimensions = [
        '1080x1920', // Vertical HD
        '1080x1350', // Portrait
        '1080x1080', // Square
        '1920x1080', // Horizontal HD
        '720x1280',  // Vertical SD
        '720x720',   // Square SD
      ];
      
      dimensions.forEach(dim => {
        const config = createMockConfig({ videoDimensions: dim as ReelConfig['videoDimensions'] });
        expect(config.videoDimensions).toBe(dim);
      });
    });
  });
});
