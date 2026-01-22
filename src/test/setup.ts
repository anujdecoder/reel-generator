import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock canvas for Node.js environment
class MockCanvasRenderingContext2D {
  canvas: HTMLCanvasElement;
  fillStyle: string = '#000000';
  strokeStyle: string = '#000000';
  lineWidth: number = 1;
  font: string = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  globalAlpha: number = 1;
  imageSmoothingEnabled: boolean = true;
  imageSmoothingQuality: ImageSmoothingQuality = 'low';
  
  private _drawCalls: Array<{ method: string; args: unknown[] }> = [];
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }
  
  getDrawCalls() {
    return this._drawCalls;
  }
  
  clearDrawCalls() {
    this._drawCalls = [];
  }
  
  fillRect(x: number, y: number, w: number, h: number) {
    this._drawCalls.push({ method: 'fillRect', args: [x, y, w, h] });
  }
  
  strokeRect(x: number, y: number, w: number, h: number) {
    this._drawCalls.push({ method: 'strokeRect', args: [x, y, w, h] });
  }
  
  fillText(text: string, x: number, y: number) {
    this._drawCalls.push({ method: 'fillText', args: [text, x, y] });
  }
  
  drawImage(...args: unknown[]) {
    this._drawCalls.push({ method: 'drawImage', args });
  }
  
  save() {
    this._drawCalls.push({ method: 'save', args: [] });
  }
  
  restore() {
    this._drawCalls.push({ method: 'restore', args: [] });
  }
  
  translate(x: number, y: number) {
    this._drawCalls.push({ method: 'translate', args: [x, y] });
  }
  
  scale(x: number, y: number) {
    this._drawCalls.push({ method: 'scale', args: [x, y] });
  }
  
  beginPath() {
    this._drawCalls.push({ method: 'beginPath', args: [] });
  }
  
  rect(x: number, y: number, w: number, h: number) {
    this._drawCalls.push({ method: 'rect', args: [x, y, w, h] });
  }
  
  clip() {
    this._drawCalls.push({ method: 'clip', args: [] });
  }
  
  measureText(text: string) {
    return { width: text.length * 8 };
  }
}

// Store contexts for testing
const canvasContexts = new Map<HTMLCanvasElement, MockCanvasRenderingContext2D>();

// Mock HTMLCanvasElement
const originalCreateElement = document.createElement.bind(document);
document.createElement = ((tagName: string, options?: ElementCreationOptions) => {
  const element = originalCreateElement(tagName, options);
  
  if (tagName.toLowerCase() === 'canvas') {
    const canvas = element as HTMLCanvasElement;
    const mockCtx = new MockCanvasRenderingContext2D(canvas);
    canvasContexts.set(canvas, mockCtx);
    
    canvas.getContext = ((contextId: string) => {
      if (contextId === '2d') {
        return mockCtx as unknown as CanvasRenderingContext2D;
      }
      return null;
    }) as typeof canvas.getContext;
    
    canvas.toDataURL = () => 'data:image/png;base64,mockImageData';
    canvas.captureStream = () => new MediaStream();
  }
  
  return element;
}) as typeof document.createElement;

// Mock Image
class MockImage {
  src: string = '';
  width: number = 100;
  height: number = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

(globalThis as typeof globalThis & { Image: typeof Image }).Image = MockImage as unknown as typeof Image;

// Mock MediaRecorder
class MockMediaRecorder {
  stream: MediaStream;
  mimeType: string;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  
  static isTypeSupported(mimeType: string) {
    return mimeType.includes('webm');
  }
  
  constructor(stream: MediaStream, options?: { mimeType?: string }) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'video/webm';
  }
  
  start() {
    this.state = 'recording';
  }
  
  stop() {
    this.state = 'inactive';
    // Simulate data available
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['mock video data'], { type: this.mimeType }) });
    }
    setTimeout(() => {
      if (this.onstop) this.onstop();
    }, 0);
  }
}

(globalThis as typeof globalThis & { MediaRecorder: typeof MediaRecorder }).MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

// Mock requestAnimationFrame
let rafId = 0;
(globalThis as typeof globalThis & { requestAnimationFrame: typeof requestAnimationFrame }).requestAnimationFrame = (callback: FrameRequestCallback): number => {
  rafId++;
  setTimeout(() => callback(performance.now()), 16);
  return rafId;
};

(globalThis as typeof globalThis & { cancelAnimationFrame: typeof cancelAnimationFrame }).cancelAnimationFrame = (_id: number) => {
  // No-op in test environment
};

// Mock URL.createObjectURL
URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();

// Mock AudioContext
class MockAudioContext {
  destination = {};
  state = 'running';
  
  createMediaStreamDestination() {
    return {
      stream: new MediaStream(),
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  
  decodeAudioData() {
    return Promise.resolve({
      duration: 60,
      numberOfChannels: 2,
      sampleRate: 44100,
    });
  }
  
  close() {
    return Promise.resolve();
  }
}

(globalThis as typeof globalThis & { AudioContext: typeof AudioContext }).AudioContext = MockAudioContext as unknown as typeof AudioContext;

// Export for tests to access
export { canvasContexts, MockCanvasRenderingContext2D };
