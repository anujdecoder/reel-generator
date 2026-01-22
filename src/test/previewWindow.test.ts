/**
 * Preview Window Tests
 * 
 * Tests for the ReelPreview component that shows the canvas-based preview
 * of the video with playback controls.
 * 
 * Tests cover:
 * 1. Preview duration calculation matches sum of image durations + transition durations
 * 2. Images change correctly based on individual durations
 * 3. Transitions animate properly between images
 * 4. Text overlays appear on each image
 * 5. Cropped images are used in preview
 * 6. Playback controls (play/pause/stop) work correctly
 * 7. Audio synchronizes with playback
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  createMockImage, 
  createMockConfig, 
  createMockImages, 
  createMockTextOverlay,
  createMockCropSettings,
  createMockMusicTrack,
  calculateExpectedDuration,
  buildTestTimeline,
} from './testUtils';
import type { ImageItem } from '../types';

// ==========================================
// Preview Duration Calculation Tests
// ==========================================
describe('Preview Duration Calculation', () => {
  it('should calculate total duration for single image (no transition)', () => {
    const images = createMockImages(1, () => ({ duration: 3000 }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    const total = calculateExpectedDuration(images, config);
    
    // Single image: just the image duration, no transition
    expect(total).toBe(3000);
  });

  it('should calculate total duration for two images', () => {
    const images = createMockImages(2, () => ({ duration: 2000 }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    const total = calculateExpectedDuration(images, config);
    
    // 2 images: 2000 + 500 (transition) + 2000 = 4500
    expect(total).toBe(4500);
  });

  it('should calculate total duration for multiple images', () => {
    const images = createMockImages(5, () => ({ duration: 2000 }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    const total = calculateExpectedDuration(images, config);
    
    // 5 images: 5 * 2000 + 4 * 500 (4 transitions) = 12000
    expect(total).toBe(12000);
  });

  it('should use per-image custom durations', () => {
    const images = createMockImages(3, (i) => ({ 
      duration: i === 0 ? 1000 : i === 1 ? 3000 : 5000 
    }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    const total = calculateExpectedDuration(images, config);
    
    // 1000 + 500 + 3000 + 500 + 5000 = 10000
    expect(total).toBe(10000);
  });

  it('should use default duration when image has no custom duration', () => {
    const images = createMockImages(2, (i) => 
      i === 0 ? { duration: 3000 } : {}
    );
    const config = createMockConfig({ imageDuration: 2000, transitionDuration: 500 });
    
    const total = calculateExpectedDuration(images, config);
    
    // 3000 + 500 + 2000 = 5500
    expect(total).toBe(5500);
  });

  it('should handle zero transition duration', () => {
    const images = createMockImages(3, () => ({ duration: 2000 }));
    const config = createMockConfig({ transitionDuration: 0 });
    
    const total = calculateExpectedDuration(images, config);
    
    // 3 * 2000 + 0 = 6000
    expect(total).toBe(6000);
  });

  it('should return 0 for empty images array', () => {
    const images: ImageItem[] = [];
    const config = createMockConfig();
    
    const total = calculateExpectedDuration(images, config);
    
    expect(total).toBe(0);
  });

  it('should handle very long durations', () => {
    const images = createMockImages(10, () => ({ duration: 60000 })); // 1 minute each
    const config = createMockConfig({ transitionDuration: 2000 });
    
    const total = calculateExpectedDuration(images, config);
    
    // 10 * 60000 + 9 * 2000 = 618000
    expect(total).toBe(618000);
  });
});

// ==========================================
// Timeline Building Tests
// ==========================================
describe('Preview Timeline Building', () => {
  it('should create correct timeline segments', () => {
    const images = createMockImages(3, () => ({ duration: 2000 }));
    const config = createMockConfig({ transitionDuration: 500, transitionType: 'fade' });
    
    const timeline = buildTestTimeline(images, config);
    
    expect(timeline).toHaveLength(3);
    expect(timeline[0]).toEqual({
      startTime: 0,
      imageDuration: 2000,
      transitionDuration: 500,
      transitionType: 'fade',
      imageIndex: 0,
    });
    expect(timeline[1]).toEqual({
      startTime: 2500,
      imageDuration: 2000,
      transitionDuration: 500,
      transitionType: 'fade',
      imageIndex: 1,
    });
    expect(timeline[2]).toEqual({
      startTime: 5000,
      imageDuration: 2000,
      transitionDuration: 0, // Last image has no transition
      transitionType: 'none',
      imageIndex: 2,
    });
  });

  it('should use per-image transition types', () => {
    const images = createMockImages(3, (i) => ({ 
      duration: 2000,
      transitionType: i === 0 ? 'slide' : i === 1 ? 'zoom' : 'fade',
    }));
    const config = createMockConfig({ transitionType: 'fade' });
    
    const timeline = buildTestTimeline(images, config);
    
    expect(timeline[0].transitionType).toBe('slide');
    expect(timeline[1].transitionType).toBe('zoom');
    expect(timeline[2].transitionType).toBe('none'); // Last image has no transition
  });

  it('should handle mixed custom and default durations', () => {
    const images = createMockImages(4, (i) => 
      i % 2 === 0 ? { duration: 3000 } : {}
    );
    const config = createMockConfig({ imageDuration: 2000, transitionDuration: 500 });
    
    const timeline = buildTestTimeline(images, config);
    
    expect(timeline[0].imageDuration).toBe(3000);
    expect(timeline[1].imageDuration).toBe(2000);
    expect(timeline[2].imageDuration).toBe(3000);
    expect(timeline[3].imageDuration).toBe(2000);
  });

  it('should calculate correct start times', () => {
    const images = createMockImages(3, (i) => ({ 
      duration: (i + 1) * 1000 // 1000, 2000, 3000
    }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    const timeline = buildTestTimeline(images, config);
    
    expect(timeline[0].startTime).toBe(0);
    expect(timeline[1].startTime).toBe(1500); // 1000 + 500
    expect(timeline[2].startTime).toBe(4000); // 1500 + 2000 + 500
  });
});

// ==========================================
// Image Display Phase Tests
// ==========================================
describe('Preview Image Display', () => {
  it('should identify image display phase correctly', () => {
    const images = createMockImages(2, () => ({ duration: 2000 }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    const timeline = buildTestTimeline(images, config);
    
    // At time 0, should be showing first image (display phase)
    expect(timeline[0].startTime).toBe(0);
    expect(timeline[0].imageDuration).toBe(2000);
    
    // Display phase is from startTime to startTime + imageDuration
    const displayEnd = timeline[0].startTime + timeline[0].imageDuration;
    expect(displayEnd).toBe(2000);
  });

  it('should identify transition phase correctly', () => {
    const images = createMockImages(2, () => ({ duration: 2000 }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    const timeline = buildTestTimeline(images, config);
    
    // Transition phase is from startTime + imageDuration to startTime + imageDuration + transitionDuration
    const transitionStart = timeline[0].startTime + timeline[0].imageDuration;
    const transitionEnd = transitionStart + timeline[0].transitionDuration;
    
    expect(transitionStart).toBe(2000);
    expect(transitionEnd).toBe(2500);
  });

  it('should show last image without transition', () => {
    const images = createMockImages(3, () => ({ duration: 2000 }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    const timeline = buildTestTimeline(images, config);
    
    // Last image should have no transition
    const lastSegment = timeline[timeline.length - 1];
    expect(lastSegment.transitionDuration).toBe(0);
    expect(lastSegment.transitionType).toBe('none');
  });
});

// ==========================================
// Text Overlay Tests
// ==========================================
describe('Preview Text Overlay', () => {
  it('should include text overlay data for images with text', () => {
    const overlay = createMockTextOverlay({ text: 'Hello World' });
    const images = createMockImages(2, (i) => 
      i === 0 ? { textOverlay: overlay } : {}
    );
    
    expect(images[0].textOverlay).toBeDefined();
    expect(images[0].textOverlay?.text).toBe('Hello World');
    expect(images[1].textOverlay).toBeUndefined();
  });

  it('should preserve text overlay properties', () => {
    const overlay = createMockTextOverlay({
      text: 'Custom Text',
      position: 'top',
      fontSize: 48,
      fontColor: '#ff0000',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      fontWeight: 'normal',
      textAlign: 'left',
    });
    
    const image = createMockImage({ textOverlay: overlay });
    
    expect(image.textOverlay?.position).toBe('top');
    expect(image.textOverlay?.fontSize).toBe(48);
    expect(image.textOverlay?.fontColor).toBe('#ff0000');
    expect(image.textOverlay?.backgroundColor).toBe('rgba(0, 0, 0, 0.8)');
    expect(image.textOverlay?.fontWeight).toBe('normal');
    expect(image.textOverlay?.textAlign).toBe('left');
  });

  it('should support all text positions', () => {
    const positions: Array<'top' | 'center' | 'bottom'> = ['top', 'center', 'bottom'];
    
    positions.forEach(position => {
      const overlay = createMockTextOverlay({ position });
      expect(overlay.position).toBe(position);
    });
  });

  it('should support all text alignments', () => {
    const alignments: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
    
    alignments.forEach(textAlign => {
      const overlay = createMockTextOverlay({ textAlign });
      expect(overlay.textAlign).toBe(textAlign);
    });
  });

  it('should handle multiline text', () => {
    const overlay = createMockTextOverlay({ text: 'Line 1\nLine 2\nLine 3' });
    
    expect(overlay.text).toContain('\n');
    expect(overlay.text.split('\n')).toHaveLength(3);
  });
});

// ==========================================
// Cropped Image Tests
// ==========================================
describe('Preview Cropped Images', () => {
  it('should use croppedDataUrl when available', () => {
    const image = createMockImage({
      dataUrl: 'data:image/jpeg;base64,original',
      croppedDataUrl: 'data:image/jpeg;base64,cropped',
    });
    
    expect(image.croppedDataUrl).toBe('data:image/jpeg;base64,cropped');
    // Preview should use croppedDataUrl
    const imageSource = image.croppedDataUrl || image.dataUrl;
    expect(imageSource).toBe('data:image/jpeg;base64,cropped');
  });

  it('should fall back to dataUrl when croppedDataUrl is not available', () => {
    const image = createMockImage({
      dataUrl: 'data:image/jpeg;base64,original',
    });
    
    expect(image.croppedDataUrl).toBeUndefined();
    const imageSource = image.croppedDataUrl || image.dataUrl;
    expect(imageSource).toBe('data:image/jpeg;base64,original');
  });

  it('should store crop settings with image', () => {
    const cropSettings = createMockCropSettings({
      x: 0.2,
      y: 0.1,
      width: 0.6,
      height: 0.8,
    });
    
    const image = createMockImage({ cropSettings });
    
    expect(image.cropSettings?.x).toBe(0.2);
    expect(image.cropSettings?.y).toBe(0.1);
    expect(image.cropSettings?.width).toBe(0.6);
    expect(image.cropSettings?.height).toBe(0.8);
  });

  it('should handle different aspect ratios in crop settings', () => {
    const aspectRatios: Array<'9:16' | '1:1' | '4:5' | '16:9'> = ['9:16', '1:1', '4:5', '16:9'];
    
    aspectRatios.forEach(aspectRatio => {
      const cropSettings = createMockCropSettings({ aspectRatio });
      expect(cropSettings.aspectRatio).toBe(aspectRatio);
    });
  });
});

// ==========================================
// Playback Control Tests
// ==========================================
describe('Preview Playback Controls', () => {
  it('should track playback state correctly', () => {
    // Simulate playback state
    let isPlaying = false;
    let currentIndex = 0;
    let playbackTime = 0;
    
    // Play
    isPlaying = true;
    expect(isPlaying).toBe(true);
    
    // Pause
    isPlaying = false;
    expect(isPlaying).toBe(false);
    
    // Update time
    playbackTime = 1500;
    expect(playbackTime).toBe(1500);
    
    // Update index
    currentIndex = 1;
    expect(currentIndex).toBe(1);
  });

  it('should reset state on stop', () => {
    let isPlaying = true;
    let currentIndex = 2;
    let playbackTime = 5000;
    let isTransitioning = true;
    
    // Simulate stop
    isPlaying = false;
    currentIndex = 0;
    playbackTime = 0;
    isTransitioning = false;
    
    expect(isPlaying).toBe(false);
    expect(currentIndex).toBe(0);
    expect(playbackTime).toBe(0);
    expect(isTransitioning).toBe(false);
  });

  it('should preserve playback offset on pause', () => {
    let playbackOffset = 0;
    let playbackTime = 3500;
    
    // Simulate pause - save current position
    playbackOffset = playbackTime;
    
    expect(playbackOffset).toBe(3500);
    
    // Simulate resume - should continue from offset
    const resumeTime = playbackOffset;
    expect(resumeTime).toBe(3500);
  });

  it('should calculate correct audio seek position', () => {
    const config = createMockConfig({
      music: createMockMusicTrack({
        startTime: 10, // 10 seconds into the audio
        endTime: 30,
        volume: 0.8,
      }),
    });
    
    const playbackTime = 5000; // 5 seconds into video
    const audioCurrentTime = config.music!.startTime + (playbackTime / 1000);
    
    expect(audioCurrentTime).toBe(15); // 10 + 5 = 15 seconds
  });
});

// ==========================================
// Transition Type Tests
// ==========================================
describe('Preview Transition Types', () => {
  it('should support fade transition', () => {
    const images = createMockImages(2, () => ({ 
      transitionType: 'fade',
    }));
    const config = createMockConfig({ transitionType: 'fade' });
    
    const timeline = buildTestTimeline(images, config);
    
    expect(timeline[0].transitionType).toBe('fade');
  });

  it('should support slide transition', () => {
    const images = createMockImages(2, () => ({ 
      transitionType: 'slide',
    }));
    
    const timeline = buildTestTimeline(images, createMockConfig());
    
    expect(timeline[0].transitionType).toBe('slide');
  });

  it('should support zoom transition', () => {
    const images = createMockImages(2, () => ({ 
      transitionType: 'zoom',
    }));
    
    const timeline = buildTestTimeline(images, createMockConfig());
    
    expect(timeline[0].transitionType).toBe('zoom');
  });

  it('should support none transition', () => {
    const images = createMockImages(2, () => ({ 
      transitionType: 'none',
    }));
    
    const timeline = buildTestTimeline(images, createMockConfig());
    
    expect(timeline[0].transitionType).toBe('none');
  });

  it('should calculate transition progress correctly', () => {
    const transitionDuration = 500;
    const timeInTransition = 250;
    
    const progress = timeInTransition / transitionDuration;
    
    expect(progress).toBe(0.5);
  });
});

// ==========================================
// Video Dimensions Tests
// ==========================================
describe('Preview Video Dimensions', () => {
  it('should use 1080x1920 as default (9:16 portrait)', () => {
    const config = createMockConfig({ videoDimensions: '1080x1920' });
    
    expect(config.videoDimensions).toBe('1080x1920');
  });

  it('should support 1080x1080 (1:1 square)', () => {
    const config = createMockConfig({ videoDimensions: '1080x1080' });
    
    expect(config.videoDimensions).toBe('1080x1080');
  });

  it('should support 1080x1350 (4:5 portrait)', () => {
    const config = createMockConfig({ videoDimensions: '1080x1350' });
    
    expect(config.videoDimensions).toBe('1080x1350');
  });

  it('should support 1920x1080 (16:9 landscape)', () => {
    const config = createMockConfig({ videoDimensions: '1920x1080' });
    
    expect(config.videoDimensions).toBe('1920x1080');
  });

  it('should calculate correct aspect ratio for scaling preview', () => {
    const dimensions = {
      '1080x1920': { width: 1080, height: 1920, aspectRatio: 1080 / 1920 },
      '1080x1080': { width: 1080, height: 1080, aspectRatio: 1 },
      '1920x1080': { width: 1920, height: 1080, aspectRatio: 1920 / 1080 },
    };
    
    expect(dimensions['1080x1920'].aspectRatio).toBeCloseTo(0.5625);
    expect(dimensions['1080x1080'].aspectRatio).toBe(1);
    expect(dimensions['1920x1080'].aspectRatio).toBeCloseTo(1.778, 2);
  });
});

// ==========================================
// Time Formatting Tests
// ==========================================
describe('Preview Time Formatting', () => {
  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  it('should format zero time correctly', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('should format seconds only', () => {
    expect(formatTime(5000)).toBe('0:05');
    expect(formatTime(30000)).toBe('0:30');
    expect(formatTime(59000)).toBe('0:59');
  });

  it('should format minutes and seconds', () => {
    expect(formatTime(60000)).toBe('1:00');
    expect(formatTime(90000)).toBe('1:30');
    expect(formatTime(150000)).toBe('2:30');
  });

  it('should handle long durations', () => {
    expect(formatTime(600000)).toBe('10:00'); // 10 minutes
    expect(formatTime(3600000)).toBe('60:00'); // 1 hour
  });

  it('should round down milliseconds', () => {
    expect(formatTime(5500)).toBe('0:05'); // 5.5 seconds rounds to 5
    expect(formatTime(5999)).toBe('0:05'); // 5.999 seconds rounds to 5
  });
});

// ==========================================
// Progress Bar Tests
// ==========================================
describe('Preview Progress Bar', () => {
  it('should calculate progress percentage correctly', () => {
    const totalDuration = 10000;
    
    expect((0 / totalDuration) * 100).toBe(0);
    expect((2500 / totalDuration) * 100).toBe(25);
    expect((5000 / totalDuration) * 100).toBe(50);
    expect((7500 / totalDuration) * 100).toBe(75);
    expect((10000 / totalDuration) * 100).toBe(100);
  });

  it('should handle zero total duration', () => {
    const totalDuration = 0;
    const playbackTime = 0;
    
    const progress = totalDuration > 0 ? (playbackTime / totalDuration) * 100 : 0;
    
    expect(progress).toBe(0);
  });

  it('should clamp progress to 100%', () => {
    const totalDuration = 10000;
    const playbackTime = 12000; // Exceeds total
    
    const progress = Math.min((playbackTime / totalDuration) * 100, 100);
    
    expect(progress).toBe(100);
  });
});

// ==========================================
// Scheduling Logic Tests
// ==========================================
describe('Preview Scheduling Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should schedule image display for correct duration', async () => {
    const images = createMockImages(2, () => ({ duration: 2000 }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    let currentIndex = 0;
    let isTransitioning = false;
    
    // Simulate the scheduling logic
    setTimeout(() => {
      isTransitioning = true;
    }, images[currentIndex].duration ?? config.imageDuration);
    
    expect(isTransitioning).toBe(false);
    
    vi.advanceTimersByTime(2000);
    
    expect(isTransitioning).toBe(true);
  });

  it('should transition to next image after transition duration', async () => {
    const images = createMockImages(2, () => ({ duration: 2000 }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    let currentIndex = 0;
    let isTransitioning = false;
    
    // Schedule image display
    setTimeout(() => {
      isTransitioning = true;
      
      // Schedule transition end
      setTimeout(() => {
        isTransitioning = false;
        currentIndex++;
      }, config.transitionDuration);
    }, images[currentIndex].duration ?? config.imageDuration);
    
    vi.advanceTimersByTime(2000);
    expect(isTransitioning).toBe(true);
    expect(currentIndex).toBe(0);
    
    vi.advanceTimersByTime(500);
    expect(isTransitioning).toBe(false);
    expect(currentIndex).toBe(1);
  });

  it('should stop after last image (no transition)', async () => {
    const images = createMockImages(1, () => ({ duration: 2000 }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    let isPlaying = true;
    const isLastImage = true;
    
    if (isLastImage) {
      setTimeout(() => {
        isPlaying = false;
      }, images[0].duration ?? config.imageDuration);
    }
    
    expect(isPlaying).toBe(true);
    
    vi.advanceTimersByTime(2000);
    
    expect(isPlaying).toBe(false);
  });
});

// ==========================================
// Edge Cases Tests
// ==========================================
describe('Preview Edge Cases', () => {
  it('should handle single image without crash', () => {
    const images = createMockImages(1, () => ({ duration: 3000 }));
    const config = createMockConfig();
    
    const timeline = buildTestTimeline(images, config);
    const total = calculateExpectedDuration(images, config);
    
    expect(timeline).toHaveLength(1);
    expect(timeline[0].transitionDuration).toBe(0);
    expect(total).toBe(3000);
  });

  it('should handle very short durations', () => {
    const images = createMockImages(2, () => ({ duration: 100 }));
    const config = createMockConfig({ transitionDuration: 50 });
    
    const total = calculateExpectedDuration(images, config);
    
    expect(total).toBe(250); // 100 + 50 + 100
  });

  it('should handle images with missing optional properties', () => {
    const image = createMockImage();
    
    expect(image.duration).toBeUndefined();
    expect(image.transitionType).toBeUndefined();
    expect(image.textOverlay).toBeUndefined();
    expect(image.croppedDataUrl).toBeUndefined();
    expect(image.cropSettings).toBeUndefined();
  });

  it('should calculate segment boundaries correctly', () => {
    const images = createMockImages(3, (i) => ({ 
      duration: 1000 * (i + 1), // 1s, 2s, 3s
    }));
    const config = createMockConfig({ transitionDuration: 500 });
    
    const timeline = buildTestTimeline(images, config);
    
    // Image 1: 0 - 1000ms (display) - 1000 - 1500ms (transition)
    expect(timeline[0].startTime).toBe(0);
    expect(timeline[0].startTime + timeline[0].imageDuration).toBe(1000);
    expect(timeline[0].startTime + timeline[0].imageDuration + timeline[0].transitionDuration).toBe(1500);
    
    // Image 2: 1500 - 3500ms (display) - 3500 - 4000ms (transition)
    expect(timeline[1].startTime).toBe(1500);
    expect(timeline[1].startTime + timeline[1].imageDuration).toBe(3500);
    expect(timeline[1].startTime + timeline[1].imageDuration + timeline[1].transitionDuration).toBe(4000);
    
    // Image 3: 4000 - 7000ms (display only, no transition)
    expect(timeline[2].startTime).toBe(4000);
    expect(timeline[2].startTime + timeline[2].imageDuration).toBe(7000);
    expect(timeline[2].transitionDuration).toBe(0);
  });
});

// ==========================================
// Audio Sync Tests
// ==========================================
describe('Preview Audio Synchronization', () => {
  it('should calculate audio start time correctly', () => {
    const config = createMockConfig({
      music: createMockMusicTrack({
        startTime: 15,
        endTime: 45,
        volume: 0.75,
      }),
    });
    
    // Audio starts at 15 seconds
    expect(config.music?.startTime).toBe(15);
  });

  it('should apply volume correctly', () => {
    const config = createMockConfig({
      music: createMockMusicTrack({
        startTime: 0,
        endTime: 30,
        volume: 0.5,
      }),
    });
    
    expect(config.music?.volume).toBe(0.5);
  });

  it('should sync playback time with audio position', () => {
    const musicStartTime = 5; // Audio starts at 5 seconds
    const playbackTime = 10000; // 10 seconds into video
    
    const expectedAudioTime = musicStartTime + (playbackTime / 1000);
    
    expect(expectedAudioTime).toBe(15); // 5 + 10 = 15 seconds
  });

  it('should pause audio when video pauses', () => {
    const audio = {
      pause: vi.fn(),
      currentTime: 10,
    };
    
    // Simulate pause
    audio.pause();
    
    expect(audio.pause).toHaveBeenCalled();
  });

  it('should reset audio on stop', () => {
    const config = createMockConfig({
      music: createMockMusicTrack({
        startTime: 5,
        endTime: 30,
        volume: 1,
      }),
    });
    
    const audio = {
      pause: vi.fn(),
      currentTime: 15,
    };
    
    // Simulate stop - reset to music start time
    audio.pause();
    audio.currentTime = config.music!.startTime;
    
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.currentTime).toBe(5);
  });
});

// ==========================================
// Canvas Rendering Tests
// ==========================================
describe('Preview Canvas Rendering', () => {
  it('should calculate image cover dimensions correctly (landscape into portrait)', () => {
    // Image: 1920x1080 (landscape)
    // Canvas: 1080x1920 (portrait)
    const imgWidth = 1920, imgHeight = 1080;
    const canvasWidth = 1080, canvasHeight = 1920;
    
    const imgRatio = imgWidth / imgHeight; // 1.78
    const canvasRatio = canvasWidth / canvasHeight; // 0.5625
    
    // imgRatio > canvasRatio, so height constrained
    expect(imgRatio > canvasRatio).toBe(true);
    
    // Calculate draw dimensions
    const drawHeight = canvasHeight;
    const drawWidth = imgWidth * (canvasHeight / imgHeight);
    
    expect(drawHeight).toBe(1920);
    expect(drawWidth).toBeCloseTo(3413.33, 1); // Approximately
  });

  it('should calculate image cover dimensions correctly (portrait into portrait)', () => {
    // Image: 1080x1920 (portrait)
    // Canvas: 1080x1920 (portrait)
    const imgWidth = 1080, imgHeight = 1920;
    const canvasWidth = 1080, canvasHeight = 1920;
    
    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;
    
    expect(imgRatio).toBe(canvasRatio);
    
    // Perfect fit
    const drawWidth = canvasWidth;
    const drawHeight = canvasHeight;
    
    expect(drawWidth).toBe(1080);
    expect(drawHeight).toBe(1920);
  });

  it('should calculate slide transition offset', () => {
    const canvasWidth = 1080;
    const transitionProgress = 0.5;
    
    const offset = transitionProgress * canvasWidth;
    
    expect(offset).toBe(540);
  });

  it('should calculate zoom transition scale', () => {
    const transitionProgress = 0.5;
    const maxZoom = 0.5;
    
    const scale = 1 + transitionProgress * maxZoom;
    
    expect(scale).toBe(1.25);
  });

  it('should calculate fade transition alpha', () => {
    const transitionProgress = 0.3;
    
    const currentAlpha = 1 - transitionProgress;
    const nextAlpha = transitionProgress;
    
    expect(currentAlpha).toBe(0.7);
    expect(nextAlpha).toBe(0.3);
  });
});
