/**
 * Config Import Tests
 * 
 * Tests for the JSON config import feature that allows users to:
 * - Import images from URLs
 * - Configure image duration, transitions, and text overlays
 * - Add background music
 */

import { describe, it, expect } from 'vitest';
import type { 
  ReelConfigJSON, 
  ConfigImageItem, 
  ImageItem, 
  ReelConfig,
  TextOverlay,
  MusicTrack,
} from '../types';

// ==========================================
// JSON Parsing and Validation Tests
// ==========================================
describe('Config JSON Parsing', () => {
  function parseConfig(jsonString: string): ReelConfigJSON {
    const parsed = JSON.parse(jsonString);
    
    if (!parsed.images || !Array.isArray(parsed.images)) {
      throw new Error('Config must have an "images" array');
    }
    
    if (parsed.images.length === 0) {
      throw new Error('Images array cannot be empty');
    }
    
    for (let i = 0; i < parsed.images.length; i++) {
      if (!parsed.images[i].url || typeof parsed.images[i].url !== 'string') {
        throw new Error(`Image at index ${i} must have a "url" string`);
      }
    }
    
    return parsed as ReelConfigJSON;
  }

  it('should parse valid minimal config', () => {
    const config = parseConfig(`{
      "images": [
        { "url": "https://example.com/image1.jpg" },
        { "url": "https://example.com/image2.jpg" }
      ]
    }`);
    
    expect(config.images).toHaveLength(2);
    expect(config.images[0].url).toBe('https://example.com/image1.jpg');
    expect(config.images[1].url).toBe('https://example.com/image2.jpg');
  });

  it('should parse config with global settings', () => {
    const config = parseConfig(`{
      "globalConfig": {
        "transitionDuration": 500,
        "imageDuration": 3000,
        "transitionType": "slide",
        "videoDimensions": "1080x1920",
        "videoQuality": "high"
      },
      "images": [
        { "url": "https://example.com/image.jpg" }
      ]
    }`);
    
    expect(config.globalConfig?.transitionDuration).toBe(500);
    expect(config.globalConfig?.imageDuration).toBe(3000);
    expect(config.globalConfig?.transitionType).toBe('slide');
    expect(config.globalConfig?.videoDimensions).toBe('1080x1920');
    expect(config.globalConfig?.videoQuality).toBe('high');
  });

  it('should parse config with per-image settings', () => {
    const config = parseConfig(`{
      "images": [
        {
          "url": "https://example.com/image.jpg",
          "duration": 4000,
          "transitionType": "fade"
        }
      ]
    }`);
    
    expect(config.images[0].duration).toBe(4000);
    expect(config.images[0].transitionType).toBe('fade');
  });

  it('should parse config with text overlays', () => {
    const config = parseConfig(`{
      "images": [
        {
          "url": "https://example.com/image.jpg",
          "text": {
            "content": "Hello World",
            "position": "bottom",
            "fontSize": 48,
            "fontColor": "#ffffff",
            "backgroundColor": "rgba(0,0,0,0.6)",
            "fontWeight": "bold",
            "textAlign": "center"
          }
        }
      ]
    }`);
    
    expect(config.images[0].text?.content).toBe('Hello World');
    expect(config.images[0].text?.position).toBe('bottom');
    expect(config.images[0].text?.fontSize).toBe(48);
    expect(config.images[0].text?.fontColor).toBe('#ffffff');
    expect(config.images[0].text?.fontWeight).toBe('bold');
  });

  it('should parse config with music', () => {
    const config = parseConfig(`{
      "images": [
        { "url": "https://example.com/image.jpg" }
      ],
      "music": {
        "url": "https://example.com/music.mp3",
        "startTime": 10,
        "endTime": 40,
        "volume": 0.8
      }
    }`);
    
    expect(config.music?.url).toBe('https://example.com/music.mp3');
    expect(config.music?.startTime).toBe(10);
    expect(config.music?.endTime).toBe(40);
    expect(config.music?.volume).toBe(0.8);
  });

  it('should throw error for missing images array', () => {
    expect(() => parseConfig(`{ "globalConfig": {} }`))
      .toThrow('Config must have an "images" array');
  });

  it('should throw error for empty images array', () => {
    expect(() => parseConfig(`{ "images": [] }`))
      .toThrow('Images array cannot be empty');
  });

  it('should throw error for image without URL', () => {
    expect(() => parseConfig(`{ "images": [{ "duration": 3000 }] }`))
      .toThrow('Image at index 0 must have a "url" string');
  });

  it('should throw error for invalid JSON', () => {
    expect(() => parseConfig(`{ invalid json }`))
      .toThrow();
  });
});

// ==========================================
// Text Overlay Creation Tests
// ==========================================
describe('Text Overlay Creation', () => {
  function createTextOverlay(textConfig: ConfigImageItem['text']): TextOverlay | undefined {
    if (!textConfig || !textConfig.content) return undefined;
    
    return {
      text: textConfig.content,
      position: textConfig.position || 'bottom',
      fontSize: textConfig.fontSize || 32,
      fontColor: textConfig.fontColor || '#ffffff',
      backgroundColor: textConfig.backgroundColor || 'rgba(0, 0, 0, 0.6)',
      fontWeight: textConfig.fontWeight || 'bold',
      textAlign: textConfig.textAlign || 'center',
    };
  }

  it('should create text overlay with all properties', () => {
    const overlay = createTextOverlay({
      content: 'Test Text',
      position: 'top',
      fontSize: 56,
      fontColor: '#ff0000',
      backgroundColor: 'rgba(255,255,255,0.8)',
      fontWeight: 'normal',
      textAlign: 'left',
    });
    
    expect(overlay).toBeDefined();
    expect(overlay?.text).toBe('Test Text');
    expect(overlay?.position).toBe('top');
    expect(overlay?.fontSize).toBe(56);
    expect(overlay?.fontColor).toBe('#ff0000');
    expect(overlay?.backgroundColor).toBe('rgba(255,255,255,0.8)');
    expect(overlay?.fontWeight).toBe('normal');
    expect(overlay?.textAlign).toBe('left');
  });

  it('should use default values for missing properties', () => {
    const overlay = createTextOverlay({
      content: 'Minimal Text',
    });
    
    expect(overlay?.text).toBe('Minimal Text');
    expect(overlay?.position).toBe('bottom');
    expect(overlay?.fontSize).toBe(32);
    expect(overlay?.fontColor).toBe('#ffffff');
    expect(overlay?.backgroundColor).toBe('rgba(0, 0, 0, 0.6)');
    expect(overlay?.fontWeight).toBe('bold');
    expect(overlay?.textAlign).toBe('center');
  });

  it('should return undefined for empty text config', () => {
    expect(createTextOverlay(undefined)).toBeUndefined();
    expect(createTextOverlay({ content: '' })).toBeUndefined();
  });

  it('should handle multiline text', () => {
    const overlay = createTextOverlay({
      content: 'Line 1\nLine 2\nLine 3',
    });
    
    expect(overlay?.text).toBe('Line 1\nLine 2\nLine 3');
    expect(overlay?.text.split('\n')).toHaveLength(3);
  });
});

// ==========================================
// Image Item Creation Tests
// ==========================================
describe('ImageItem Creation from Config', () => {
  function createImageItem(
    imgConfig: ConfigImageItem,
    dataUrl: string,
    index: number
  ): ImageItem {
    const urlParts = imgConfig.url.split('/');
    const filename = urlParts[urlParts.length - 1].split('?')[0] || `image-${index + 1}.jpg`;

    return {
      id: `imported-${Date.now()}-${index}`,
      name: filename,
      dataUrl,
      createdAt: Date.now(),
      duration: imgConfig.duration,
      transitionType: imgConfig.transitionType,
      textOverlay: imgConfig.text ? {
        text: imgConfig.text.content,
        position: imgConfig.text.position || 'bottom',
        fontSize: imgConfig.text.fontSize || 32,
        fontColor: imgConfig.text.fontColor || '#ffffff',
        backgroundColor: imgConfig.text.backgroundColor || 'rgba(0, 0, 0, 0.6)',
        fontWeight: imgConfig.text.fontWeight || 'bold',
        textAlign: imgConfig.text.textAlign || 'center',
      } : undefined,
    };
  }

  it('should create image item with all properties', () => {
    const imgConfig: ConfigImageItem = {
      url: 'https://example.com/my-image.jpg',
      duration: 4000,
      transitionType: 'zoom',
      text: {
        content: 'Test',
        position: 'center',
      },
    };
    
    const item = createImageItem(imgConfig, 'data:image/jpeg;base64,test', 0);
    
    expect(item.name).toBe('my-image.jpg');
    expect(item.dataUrl).toBe('data:image/jpeg;base64,test');
    expect(item.duration).toBe(4000);
    expect(item.transitionType).toBe('zoom');
    expect(item.textOverlay?.text).toBe('Test');
    expect(item.textOverlay?.position).toBe('center');
  });

  it('should extract filename from URL', () => {
    const tests = [
      { url: 'https://example.com/photo.jpg', expected: 'photo.jpg' },
      { url: 'https://example.com/path/to/image.png', expected: 'image.png' },
      { url: 'https://example.com/image.jpg?size=large', expected: 'image.jpg' },
      { url: 'https://picsum.photos/1080/1920?random=1', expected: '1920' },
    ];
    
    tests.forEach(({ url, expected }, i) => {
      const item = createImageItem({ url }, 'data:test', i);
      expect(item.name).toBe(expected);
    });
  });

  it('should use default filename if URL parsing fails', () => {
    const item = createImageItem({ url: 'https://example.com/' }, 'data:test', 5);
    expect(item.name).toBe('image-6.jpg');
  });

  it('should handle missing optional properties', () => {
    const item = createImageItem({ url: 'https://example.com/img.jpg' }, 'data:test', 0);
    
    expect(item.duration).toBeUndefined();
    expect(item.transitionType).toBeUndefined();
    expect(item.textOverlay).toBeUndefined();
  });
});

// ==========================================
// Config to ReelConfig Mapping Tests
// ==========================================
describe('Config to ReelConfig Mapping', () => {
  function mapToReelConfig(config: ReelConfigJSON): Partial<ReelConfig> {
    const reelConfig: Partial<ReelConfig> = {};
    
    if (config.globalConfig) {
      if (config.globalConfig.transitionDuration !== undefined) {
        reelConfig.transitionDuration = config.globalConfig.transitionDuration;
      }
      if (config.globalConfig.imageDuration !== undefined) {
        reelConfig.imageDuration = config.globalConfig.imageDuration;
      }
      if (config.globalConfig.transitionType) {
        reelConfig.transitionType = config.globalConfig.transitionType;
      }
      if (config.globalConfig.videoDimensions) {
        reelConfig.videoDimensions = config.globalConfig.videoDimensions;
      }
      if (config.globalConfig.videoQuality) {
        reelConfig.videoQuality = config.globalConfig.videoQuality;
      }
    }
    
    return reelConfig;
  }

  it('should map all global config properties', () => {
    const config: ReelConfigJSON = {
      globalConfig: {
        transitionDuration: 600,
        imageDuration: 4000,
        transitionType: 'fade',
        videoDimensions: '1920x1080',
        videoQuality: 'maximum',
      },
      images: [{ url: 'test' }],
    };
    
    const reelConfig = mapToReelConfig(config);
    
    expect(reelConfig.transitionDuration).toBe(600);
    expect(reelConfig.imageDuration).toBe(4000);
    expect(reelConfig.transitionType).toBe('fade');
    expect(reelConfig.videoDimensions).toBe('1920x1080');
    expect(reelConfig.videoQuality).toBe('maximum');
  });

  it('should handle partial global config', () => {
    const config: ReelConfigJSON = {
      globalConfig: {
        transitionDuration: 300,
      },
      images: [{ url: 'test' }],
    };
    
    const reelConfig = mapToReelConfig(config);
    
    expect(reelConfig.transitionDuration).toBe(300);
    expect(reelConfig.imageDuration).toBeUndefined();
    expect(reelConfig.transitionType).toBeUndefined();
  });

  it('should return empty object for missing global config', () => {
    const config: ReelConfigJSON = {
      images: [{ url: 'test' }],
    };
    
    const reelConfig = mapToReelConfig(config);
    
    expect(Object.keys(reelConfig)).toHaveLength(0);
  });
});

// ==========================================
// Music Track Creation Tests
// ==========================================
describe('Music Track Creation', () => {
  function createMusicTrack(
    musicConfig: ReelConfigJSON['music'],
    dataUrl: string,
    duration: number
  ): MusicTrack | undefined {
    if (!musicConfig?.url) return undefined;
    
    const urlParts = musicConfig.url.split('/');
    const filename = urlParts[urlParts.length - 1].split('?')[0] || 'music.mp3';
    
    return {
      id: `music-${Date.now()}`,
      name: filename,
      dataUrl,
      duration,
      startTime: musicConfig.startTime || 0,
      endTime: musicConfig.endTime || duration,
      volume: musicConfig.volume ?? 1,
    };
  }

  it('should create music track with all properties', () => {
    const track = createMusicTrack(
      {
        url: 'https://example.com/song.mp3',
        startTime: 10,
        endTime: 40,
        volume: 0.75,
      },
      'data:audio/mp3;base64,test',
      180
    );
    
    expect(track?.name).toBe('song.mp3');
    expect(track?.dataUrl).toBe('data:audio/mp3;base64,test');
    expect(track?.duration).toBe(180);
    expect(track?.startTime).toBe(10);
    expect(track?.endTime).toBe(40);
    expect(track?.volume).toBe(0.75);
  });

  it('should use defaults for missing properties', () => {
    const track = createMusicTrack(
      { url: 'https://example.com/track.mp3' },
      'data:test',
      120
    );
    
    expect(track?.startTime).toBe(0);
    expect(track?.endTime).toBe(120); // Uses full duration
    expect(track?.volume).toBe(1);
  });

  it('should return undefined for missing music config', () => {
    expect(createMusicTrack(undefined, 'data:test', 60)).toBeUndefined();
    expect(createMusicTrack({ url: '' }, 'data:test', 60)).toBeUndefined();
  });
});

// ==========================================
// Full Config Integration Tests
// ==========================================
describe('Full Config Processing', () => {
  const sampleConfig: ReelConfigJSON = {
    globalConfig: {
      transitionDuration: 500,
      imageDuration: 3000,
      transitionType: 'slide',
      videoDimensions: '1080x1920',
      videoQuality: 'high',
    },
    images: [
      {
        url: 'https://example.com/image1.jpg',
        duration: 3500,
        transitionType: 'fade',
        text: {
          content: 'Welcome',
          position: 'bottom',
          fontSize: 48,
        },
      },
      {
        url: 'https://example.com/image2.jpg',
        text: {
          content: 'Middle Slide',
          position: 'center',
        },
      },
      {
        url: 'https://example.com/image3.jpg',
        duration: 4000,
        text: {
          content: 'The End',
        },
      },
    ],
    music: {
      url: 'https://example.com/music.mp3',
      startTime: 5,
      volume: 0.8,
    },
  };

  it('should have correct number of images', () => {
    expect(sampleConfig.images).toHaveLength(3);
  });

  it('should preserve per-image overrides', () => {
    expect(sampleConfig.images[0].duration).toBe(3500);
    expect(sampleConfig.images[0].transitionType).toBe('fade');
    expect(sampleConfig.images[1].duration).toBeUndefined(); // Uses global
    expect(sampleConfig.images[2].duration).toBe(4000);
  });

  it('should have text on all images', () => {
    sampleConfig.images.forEach((img) => {
      expect(img.text).toBeDefined();
      expect(img.text?.content).toBeTruthy();
    });
  });

  it('should have music configuration', () => {
    expect(sampleConfig.music).toBeDefined();
    expect(sampleConfig.music?.url).toBeTruthy();
    expect(sampleConfig.music?.startTime).toBe(5);
    expect(sampleConfig.music?.volume).toBe(0.8);
  });

  it('should calculate expected video duration', () => {
    const globalDuration = sampleConfig.globalConfig?.imageDuration || 2000;
    const transitionDuration = sampleConfig.globalConfig?.transitionDuration || 500;
    
    let totalDuration = 0;
    for (let i = 0; i < sampleConfig.images.length; i++) {
      const imgDuration = sampleConfig.images[i].duration || globalDuration;
      const transition = i < sampleConfig.images.length - 1 ? transitionDuration : 0;
      totalDuration += imgDuration + transition;
    }
    
    // 3500 + 500 + 3000 + 500 + 4000 = 11500ms
    expect(totalDuration).toBe(11500);
  });
});

// ==========================================
// Edge Cases Tests
// ==========================================
describe('Config Import Edge Cases', () => {
  it('should handle single image config', () => {
    const config: ReelConfigJSON = {
      images: [{ url: 'https://example.com/only-image.jpg' }],
    };
    
    expect(config.images).toHaveLength(1);
  });

  it('should handle large number of images', () => {
    const config: ReelConfigJSON = {
      images: Array.from({ length: 50 }, (_, i) => ({
        url: `https://example.com/image-${i}.jpg`,
      })),
    };
    
    expect(config.images).toHaveLength(50);
  });

  it('should handle special characters in text', () => {
    const config: ReelConfigJSON = {
      images: [{
        url: 'https://example.com/image.jpg',
        text: {
          content: 'Hello! 👋 Special chars: <>&"\'',
        },
      }],
    };
    
    expect(config.images[0].text?.content).toContain('👋');
    expect(config.images[0].text?.content).toContain('<');
  });

  it('should handle very long text', () => {
    const longText = 'A'.repeat(500);
    const config: ReelConfigJSON = {
      images: [{
        url: 'https://example.com/image.jpg',
        text: { content: longText },
      }],
    };
    
    expect(config.images[0].text?.content.length).toBe(500);
  });

  it('should handle URLs with query parameters', () => {
    const config: ReelConfigJSON = {
      images: [{
        url: 'https://example.com/image.jpg?width=1080&height=1920&format=webp',
      }],
    };
    
    expect(config.images[0].url).toContain('?');
    expect(config.images[0].url).toContain('width=1080');
  });

  it('should handle all transition types', () => {
    const transitionTypes = ['fade', 'slide', 'zoom', 'none'] as const;
    
    transitionTypes.forEach(type => {
      const config: ReelConfigJSON = {
        globalConfig: { transitionType: type },
        images: [{ url: 'test' }],
      };
      expect(config.globalConfig?.transitionType).toBe(type);
    });
  });

  it('should handle all video dimensions', () => {
    const dimensions = ['1080x1920', '1080x1080', '1080x1350', '1920x1080', '720x1280', '720x720'] as const;
    
    dimensions.forEach(dim => {
      const config: ReelConfigJSON = {
        globalConfig: { videoDimensions: dim },
        images: [{ url: 'test' }],
      };
      expect(config.globalConfig?.videoDimensions).toBe(dim);
    });
  });

  it('should handle all quality levels', () => {
    const qualities = ['standard', 'high', 'maximum'] as const;
    
    qualities.forEach(quality => {
      const config: ReelConfigJSON = {
        globalConfig: { videoQuality: quality },
        images: [{ url: 'test' }],
      };
      expect(config.globalConfig?.videoQuality).toBe(quality);
    });
  });
});

// ==========================================
// Sample Config File Tests
// ==========================================
describe('Sample Config Files', () => {
  const minimalConfig = {
    "images": [
      { "url": "https://picsum.photos/1080/1920?random=20" },
      { "url": "https://picsum.photos/1080/1920?random=21" },
      { "url": "https://picsum.photos/1080/1920?random=22" }
    ]
  };

  const fullConfig = {
    "globalConfig": {
      "transitionDuration": 500,
      "imageDuration": 3000,
      "transitionType": "slide",
      "videoDimensions": "1080x1920",
      "videoQuality": "high"
    },
    "images": [
      {
        "url": "https://picsum.photos/1080/1920?random=1",
        "duration": 3500,
        "transitionType": "slide",
        "text": {
          "content": "Welcome to Our Story",
          "position": "bottom",
          "fontSize": 48,
          "fontColor": "#ffffff",
          "backgroundColor": "rgba(0, 0, 0, 0.7)"
        }
      },
      {
        "url": "https://picsum.photos/1080/1920?random=2",
        "duration": 3000,
        "transitionType": "fade",
        "text": {
          "content": "Adventure Awaits",
          "position": "center",
          "fontSize": 56
        }
      }
    ]
  };

  it('minimal config should be valid', () => {
    expect(minimalConfig.images).toHaveLength(3);
    minimalConfig.images.forEach(img => {
      expect(img.url).toBeTruthy();
      expect(img.url).toContain('https://');
    });
  });

  it('full config should be valid', () => {
    expect(fullConfig.globalConfig).toBeDefined();
    expect(fullConfig.images).toHaveLength(2);
    expect(fullConfig.images[0].text?.content).toBe('Welcome to Our Story');
    expect(fullConfig.images[1].text?.content).toBe('Adventure Awaits');
  });

  it('should calculate video duration from minimal config with defaults', () => {
    const defaultDuration = 2000;
    const defaultTransition = 500;
    const numImages = minimalConfig.images.length;
    
    // 3 images: 2000 + 500 + 2000 + 500 + 2000 = 7000ms
    const expectedDuration = (numImages * defaultDuration) + ((numImages - 1) * defaultTransition);
    expect(expectedDuration).toBe(7000);
  });
});
