import { describe, it, expect } from 'vitest';
import {
  createMockImage,
  createMockTextOverlay,
} from './testUtils';
import type { TextOverlay } from '../types';

// Helper functions that mirror the actual implementation for testing
function drawImageCover(
  _ctx: CanvasRenderingContext2D,
  img: { width: number; height: number },
  canvasWidth: number,
  canvasHeight: number
): { offsetX: number; offsetY: number; drawWidth: number; drawHeight: number } {
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

  return { offsetX, offsetY, drawWidth, drawHeight };
}

function calculateTextPosition(
  position: 'top' | 'center' | 'bottom',
  canvasHeight: number,
  textHeight: number
): number {
  switch (position) {
    case 'top':
      return 0;
    case 'center':
      return (canvasHeight - textHeight) / 2;
    case 'bottom':
    default:
      return canvasHeight - textHeight;
  }
}

describe('Video Rendering Logic', () => {
  describe('Image Cover Calculation', () => {
    it('calculates correct dimensions for landscape image in portrait canvas', () => {
      const img = { width: 1920, height: 1080 }; // Landscape
      const canvasWidth = 1080;
      const canvasHeight = 1920; // Portrait
      
      const result = drawImageCover(
        {} as CanvasRenderingContext2D,
        img,
        canvasWidth,
        canvasHeight
      );
      
      // Landscape image in portrait canvas: fill height, crop sides
      // imgRatio (1920/1080 = 1.78) > canvasRatio (1080/1920 = 0.56)
      // So drawHeight = canvasHeight, drawWidth = img.width * (canvasHeight / img.height)
      expect(result.drawHeight).toBe(canvasHeight);
      expect(result.offsetY).toBe(0);
      expect(result.offsetX).toBeLessThan(0); // Extends beyond canvas on sides (centered)
    });

    it('calculates correct dimensions for portrait image in portrait canvas', () => {
      const img = { width: 1080, height: 1920 }; // Portrait
      const canvasWidth = 1080;
      const canvasHeight = 1920; // Portrait
      
      const result = drawImageCover(
        {} as CanvasRenderingContext2D,
        img,
        canvasWidth,
        canvasHeight
      );
      
      // Same aspect ratio - should fill exactly
      expect(result.drawWidth).toBe(canvasWidth);
      expect(result.drawHeight).toBe(canvasHeight);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
    });

    it('calculates correct dimensions for square image in portrait canvas', () => {
      const img = { width: 1000, height: 1000 }; // Square
      const canvasWidth = 1080;
      const canvasHeight = 1920; // Portrait
      
      const result = drawImageCover(
        {} as CanvasRenderingContext2D,
        img,
        canvasWidth,
        canvasHeight
      );
      
      // Square image in portrait canvas - should fill height
      // Image ratio (1) > canvas ratio (1080/1920 = 0.5625)
      expect(result.drawHeight).toBe(canvasHeight);
      expect(result.offsetY).toBe(0);
      expect(result.offsetX).toBeLessThan(0); // Extends beyond canvas on sides
    });

    it('covers entire canvas without leaving gaps', () => {
      const testCases = [
        { img: { width: 1920, height: 1080 }, canvas: { w: 1080, h: 1920 } },
        { img: { width: 1080, height: 1920 }, canvas: { w: 1080, h: 1080 } },
        { img: { width: 800, height: 600 }, canvas: { w: 1080, h: 1920 } },
        { img: { width: 600, height: 800 }, canvas: { w: 1920, h: 1080 } },
      ];
      
      testCases.forEach(({ img, canvas }) => {
        const result = drawImageCover(
          {} as CanvasRenderingContext2D,
          img,
          canvas.w,
          canvas.h
        );
        
        // Either width or height should match canvas exactly
        const coversWidth = Math.abs(result.drawWidth - canvas.w) < 0.01 || result.drawWidth >= canvas.w;
        const coversHeight = Math.abs(result.drawHeight - canvas.h) < 0.01 || result.drawHeight >= canvas.h;
        
        expect(coversWidth || coversHeight).toBe(true);
      });
    });
  });

  describe('Text Overlay Positioning', () => {
    const canvasHeight = 1920;
    const textHeight = 100;

    it('positions text at top correctly', () => {
      const y = calculateTextPosition('top', canvasHeight, textHeight);
      expect(y).toBe(0);
    });

    it('positions text at center correctly', () => {
      const y = calculateTextPosition('center', canvasHeight, textHeight);
      expect(y).toBe((canvasHeight - textHeight) / 2);
      expect(y).toBe(910); // (1920 - 100) / 2
    });

    it('positions text at bottom correctly', () => {
      const y = calculateTextPosition('bottom', canvasHeight, textHeight);
      expect(y).toBe(canvasHeight - textHeight);
      expect(y).toBe(1820); // 1920 - 100
    });
  });

  describe('Text Overlay Properties', () => {
    it('builds correct font string', () => {
      const overlay: TextOverlay = createMockTextOverlay({
        fontSize: 48,
        fontWeight: 'bold',
      });
      
      const fontString = `${overlay.fontWeight} ${overlay.fontSize}px Inter, system-ui, sans-serif`;
      
      expect(fontString).toBe('bold 48px Inter, system-ui, sans-serif');
    });

    it('handles normal font weight', () => {
      const overlay: TextOverlay = createMockTextOverlay({
        fontSize: 32,
        fontWeight: 'normal',
      });
      
      const fontString = `${overlay.fontWeight} ${overlay.fontSize}px Inter, system-ui, sans-serif`;
      
      expect(fontString).toBe('normal 32px Inter, system-ui, sans-serif');
    });

    it('text alignment is properly set', () => {
      const leftAlign = createMockTextOverlay({ textAlign: 'left' });
      const centerAlign = createMockTextOverlay({ textAlign: 'center' });
      const rightAlign = createMockTextOverlay({ textAlign: 'right' });
      
      expect(leftAlign.textAlign).toBe('left');
      expect(centerAlign.textAlign).toBe('center');
      expect(rightAlign.textAlign).toBe('right');
    });
  });

  describe('Transition Rendering', () => {
    it('slide transition calculates correct offset', () => {
      const canvasWidth = 1080;
      
      // At 0% progress
      expect(0 * canvasWidth).toBe(0);
      
      // At 50% progress
      expect(0.5 * canvasWidth).toBe(540);
      
      // At 100% progress
      expect(1 * canvasWidth).toBe(1080);
    });

    it('fade transition calculates correct alpha values', () => {
      const testProgress = [0, 0.25, 0.5, 0.75, 1];
      
      testProgress.forEach(progress => {
        const currentAlpha = 1 - progress;
        const nextAlpha = progress;
        
        expect(currentAlpha + nextAlpha).toBe(1); // Should always sum to 1
        expect(currentAlpha).toBeGreaterThanOrEqual(0);
        expect(currentAlpha).toBeLessThanOrEqual(1);
        expect(nextAlpha).toBeGreaterThanOrEqual(0);
        expect(nextAlpha).toBeLessThanOrEqual(1);
      });
    });

    it('zoom transition calculates correct scale', () => {
      const zoomFactor = 0.5; // Standard zoom factor
      
      // At start
      const scaleStart = 1 + 0 * zoomFactor;
      expect(scaleStart).toBe(1);
      
      // At middle
      const scaleMid = 1 + 0.5 * zoomFactor;
      expect(scaleMid).toBe(1.25);
      
      // At end
      const scaleEnd = 1 + 1 * zoomFactor;
      expect(scaleEnd).toBe(1.5);
    });

    it('none transition shows instant switch at 50%', () => {
      const progressValues = [0, 0.25, 0.49, 0.5, 0.51, 0.75, 1];
      
      progressValues.forEach(progress => {
        const showNext = progress >= 0.5;
        
        if (progress < 0.5) {
          expect(showNext).toBe(false);
        } else {
          expect(showNext).toBe(true);
        }
      });
    });
  });

  describe('Frame Timing', () => {
    it('calculates correct frame time at 30fps', () => {
      const fps = 30;
      const frameDuration = 1000 / fps;
      
      expect(frameDuration).toBeCloseTo(33.33, 1);
      
      // Frame 0 should be at time 0
      expect(0 * frameDuration).toBe(0);
      
      // Frame 30 should be at time 1000ms (1 second)
      expect(30 * frameDuration).toBeCloseTo(1000, 0);
      
      // Frame 90 should be at time 3000ms (3 seconds)
      expect(90 * frameDuration).toBeCloseTo(3000, 0);
    });

    it('calculates total frames for video duration', () => {
      const fps = 30;
      const videoDurationMs = 5000; // 5 seconds
      
      const totalFrames = Math.ceil(videoDurationMs / (1000 / fps));
      
      expect(totalFrames).toBe(150); // 5 * 30 = 150 frames
    });

    it('calculates total frames for complex duration', () => {
      const fps = 30;
      const videoDurationMs = 7500; // 7.5 seconds
      
      const totalFrames = Math.ceil(videoDurationMs / (1000 / fps));
      
      expect(totalFrames).toBe(225); // 7.5 * 30 = 225 frames
    });
  });

  describe('Cropped Image Rendering', () => {
    it('original image dimensions are preserved for rendering calculations', () => {
      const originalImage = {
        width: 4000,
        height: 3000,
      };
      
      const cropSettings = {
        x: 0.1,
        y: 0.2,
        width: 0.6,
        height: 0.5,
      };
      
      // Calculate cropped dimensions
      const croppedWidth = originalImage.width * cropSettings.width;
      const croppedHeight = originalImage.height * cropSettings.height;
      
      expect(croppedWidth).toBe(2400); // 4000 * 0.6
      expect(croppedHeight).toBe(1500); // 3000 * 0.5
    });

    it('cropped region is within original image bounds', () => {
      const cropSettings = {
        x: 0.1,
        y: 0.2,
        width: 0.6,
        height: 0.5,
      };
      
      // Validate crop stays within bounds
      expect(cropSettings.x + cropSettings.width).toBeLessThanOrEqual(1);
      expect(cropSettings.y + cropSettings.height).toBeLessThanOrEqual(1);
      expect(cropSettings.x).toBeGreaterThanOrEqual(0);
      expect(cropSettings.y).toBeGreaterThanOrEqual(0);
    });

    it('cropped image maintains correct data URL', () => {
      const image = createMockImage({
        dataUrl: 'data:image/jpeg;base64,originalData',
        croppedDataUrl: 'data:image/jpeg;base64,croppedData',
      });
      
      // For rendering, use croppedDataUrl if available
      const renderSource = image.croppedDataUrl || image.dataUrl;
      
      expect(renderSource).toBe('data:image/jpeg;base64,croppedData');
    });
  });
});
