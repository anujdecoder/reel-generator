# 🎬 Reel Generator

A React + TypeScript application that allows users to create stunning video reels from their images with smooth transitions, text overlays, and background music.

## Features

- **Image Upload**: Drag and drop or click to upload multiple images
- **Image Management**: Reorder images by dragging or using arrow buttons, remove individual images
- **Image Cropping**: Crop and resize images with preset aspect ratios (9:16, 1:1, 4:5, 16:9)
- **Text Overlays**: Add customizable text to each image (position, font size, color, background)
- **Background Music**: Upload audio with trimming (start/end time) and volume control
- **Real-time Preview**: Preview your reel with images, text, and music synchronized
- **Multiple Transition Effects**: Choose from Fade, Slide, Zoom, or None
- **Customizable Timing**: Adjust image display duration and transition duration
- **Video Generation**: Export as MP4 or WebM format
- **Persistent Storage**: Images stored in IndexedDB, settings in localStorage

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Navigate to the project directory
cd reel-generator

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build

# Preview production build
npm run preview
```

The built files will be in the `dist` directory.

## Usage

1. **Upload Images**: Click on the upload area or drag and drop images from your computer
2. **Crop Images**: Click the crop icon on any image to adjust its framing
3. **Add Text**: Click the text icon to add customizable text overlays
4. **Arrange Images**: Drag images to reorder them, or use the arrow buttons
5. **Add Music**: Upload an audio file and adjust start time, end time, and volume
6. **Preview**: Use the play/pause controls to preview your reel with music
7. **Configure Settings**:
   - **Image Duration**: How long each image is displayed (0.5s - 5s)
   - **Transition Duration**: How long the transition takes (0.2s - 2s)
   - **Transition Type**: Fade, Slide, Zoom, or None
   - **Output Format**: MP4 (recommended) or WebM
8. **Generate Video**: Click "Generate Video" to create and download your reel

## MP4 Export

MP4 export uses FFmpeg.wasm which requires **Cross-Origin Isolation**. This is automatically enabled when running the dev server (`npm run dev`).

### How to verify MP4 is working:
1. The format selector will show "MP4 ✓" when supported
2. A green "✓ MP4 export ready" message will appear
3. Check browser console for `[FFmpeg] Environment check: { ... supported: true }`

### Troubleshooting MP4:

If you see "MP4 ⚠️" or get WebM instead of MP4:

1. **Make sure you're running via `npm run dev`** - The dev server sends required security headers
2. **Hard refresh the browser** (Ctrl+Shift+R) - Clear any cached non-isolated pages
3. **Check the browser console** - Look for `[FFmpeg]` logs to see what's failing
4. **Use a supported browser** - Chrome, Edge, or Firefox (Safari has limited support)

For production deployment, your server must send these headers:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Tech Stack

- **React 19** - UI Library
- **TypeScript** - Type safety
- **Vite** - Build tool with COOP/COEP headers
- **FFmpeg.wasm** - WebM to MP4 conversion
- **IndexedDB** - Large image storage
- **Canvas API** - Video frame rendering
- **MediaRecorder API** - Video encoding
- **Web Audio API** - Audio processing

## Project Structure

```
reel-generator/
├── src/
│   ├── components/
│   │   ├── ImageUpload.tsx       # Drag & drop image upload
│   │   ├── ImageList.tsx         # Sortable image grid
│   │   ├── ImageCropEditor.tsx   # Visual crop editor
│   │   ├── TextOverlayEditor.tsx # Text overlay customization
│   │   ├── MusicUpload.tsx       # Audio upload & trimming
│   │   ├── ReelPreview.tsx       # Preview & video generation
│   │   └── index.ts              # Component exports
│   ├── hooks/
│   │   ├── useImageStorage.ts    # IndexedDB for images
│   │   └── useLocalStorage.ts    # localStorage for config
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── utils/
│   │   ├── helpers.ts            # Utility functions
│   │   └── videoConverter.ts     # FFmpeg.wasm integration
│   ├── App.tsx                   # Main application
│   └── App.css                   # Application styles
├── vite.config.ts                # Vite config with headers
└── package.json
```

## Browser Support

| Feature | Chrome | Firefox | Edge | Safari |
|---------|--------|---------|------|--------|
| WebM Export | ✅ 47+ | ✅ 25+ | ✅ 79+ | ⚠️ 14.1+ |
| MP4 Export | ✅ 92+ | ✅ 79+ | ✅ 92+ | ❌ |
| Background Music | ✅ | ✅ | ✅ | ✅ |
| Image Cropping | ✅ | ✅ | ✅ | ✅ |

## Storage

- **Images**: Stored in IndexedDB (no size limit, typically 50-500MB available)
- **Settings**: Stored in localStorage (5MB limit)
- Images are automatically compressed to max 1920×1920 pixels at 85% quality

## License

MIT
