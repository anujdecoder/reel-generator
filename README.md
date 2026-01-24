# 🎬 Reel Generator

A React + TypeScript application that allows users to create stunning video reels from their images with smooth transitions, text overlays, and background music.

## Features

- **Image Upload**: Drag and drop or click to upload multiple images
- **Image Management**: Reorder images by dragging or using arrow buttons, remove individual images
- **Image Cropping**: Crop and resize images with preset aspect ratios (9:16, 1:1, 4:5, 16:9)
- **Text Overlays**: Add customizable text to each image (position, font size, color, background)
- **Background Music**: Upload audio with trimming (start/end time) and volume control
- **Real-time Preview**: Canvas-based preview that shows exactly what will be generated
- **Multiple Video Dimensions**: Choose from various presets (1080×1920, 1080×1080, 1920×1080, etc.)
- **Multiple Transition Effects**: Choose from Fade, Slide, Zoom, or None
- **Customizable Timing**: Adjust image display duration and transition duration
- **High-Quality Video Generation**: Export as MP4 or WebM with multiple quality options
- **Advanced FFmpeg Encoding**: Direct frame-by-frame encoding for maximum quality
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

### CLI Video Generation

Generate videos directly from the command line using browser automation. This approach opens a browser, automates the web interface, and monitors your downloads folder for the completed video.

```bash
# Install dependencies
npm install

# Generate video from config
npm run generate -- samples/sample-config.json -o my-reel.mp4

# Keep browser open after completion for debugging
npm run generate -- samples/sample-config.json -o my-reel.mp4 --keep-browser

# Or use the script directly
npx tsx src/cli/generate.ts samples/sample-config.json -o my-reel.mp4
```

The CLI accepts the same JSON config format as the web interface. See the JSON Schema section above for details.

**How it works:**
1. Starts a local development server
2. Launches a visible Chrome browser (for reliable downloads)
3. Loads the reel generator web app
4. Automatically imports your JSON config
5. Clicks "Preview & Generate" to open the generation modal
6. Clicks "Generate MP4" to start video processing
7. Monitors your Downloads folder for the completed video
8. Moves the video to your specified output location

**Requirements:**
- Chrome/Chromium browser dependencies (automatically installed with Puppeteer)
- Sufficient system resources for headless browsing

**Note:** CLI generation may take several minutes depending on video length and quality settings. The headless browser provides real-time progress updates during generation.

**Troubleshooting:**
- For complex videos with music, the web interface may work better than headless mode
- If generation fails, try with a simpler config first
- Ensure your system has sufficient resources for video encoding

## Usage

### Manual Upload

1. **Upload Images**: Click on the upload area or drag and drop images from your computer
2. **Edit Images**: Click any image in the sidebar to select it, then use the toolbar to:
   - **Crop**: Click ✂️ Crop to adjust framing with various aspect ratios (9:16, 1:1, 4:5, 16:9)
   - **Add Text**: Click 📝 Text to add customizable text overlays
3. **Arrange Images**: Drag images in the sidebar to reorder them, or use the arrow buttons
4. **Add Music**: Click "Add Music" to upload an audio file and adjust start time, end time, and volume
5. **Preview & Generate**: Click "Preview & Generate" to:
   - Preview your reel with music
   - Configure settings (image duration, transition type, output format)
   - Download your video

### JSON Config Import

You can also create reels programmatically using a JSON configuration file:

1. **Click "Import JSON"** button
2. **Paste your JSON config** (see schema below)
3. **Click "Import & Load"** - images will be downloaded and settings applied automatically

#### JSON Schema

```json
{
  "globalConfig": {
    "transitionDuration": 500,      // ms - transition duration between images
    "imageDuration": 3000,          // ms - default display duration per image
    "transitionType": "slide",      // fade | slide | zoom | none
    "videoDimensions": "1080x1920", // output video size
    "videoQuality": "high"          // standard | high | maximum
  },
  "images": [
    {
      "url": "https://example.com/image.jpg",  // Required: image URL
      "duration": 3500,                         // Optional: override global duration
      "transitionType": "fade",                 // Optional: override global transition
      "text": {                                 // Optional: text overlay
        "content": "Hello World!",              // Required if text is set
        "position": "bottom",                   // top | center | bottom
        "fontSize": 48,
        "fontColor": "#ffffff",
        "backgroundColor": "rgba(0, 0, 0, 0.6)",
        "fontWeight": "bold",                   // normal | bold
        "textAlign": "center"                   // left | center | right
      }
    }
  ],
  "music": {                          // Optional
    "url": "https://example.com/song.mp3",
    "startTime": 0,                   // seconds - where to start in the track
    "endTime": 30,                    // seconds - where to end
    "volume": 0.8                     // 0-1
  }
}
```

#### Sample Config Files

Sample configuration files are available in the `samples/` directory:

| File | Description |
|------|-------------|
| `sample-config.json` | Full-featured config with 5 images and text overlays |
| `sample-config-with-music.json` | Square format (1:1) with background music |
| `sample-config-minimal.json` | Minimal config - just image URLs |

**Quick Start Example:**
```json
{
  "images": [
    { "url": "https://picsum.photos/1080/1920?random=1" },
    { "url": "https://picsum.photos/1080/1920?random=2" },
    { "url": "https://picsum.photos/1080/1920?random=3" }
  ]
}
```

**Note:** Images must be served with CORS headers that allow cross-origin requests, or be on the same origin.

## Video Dimensions

Choose from multiple video dimension presets to match your target platform:

| Dimensions | Aspect Ratio | Best For |
|------------|--------------|----------|
| **1080×1920** | 9:16 | Instagram Reels, TikTok, YouTube Shorts, Stories |
| **1080×1350** | 4:5 | Instagram Feed (portrait) |
| **1080×1080** | 1:1 | Instagram/Facebook Square posts |
| **1920×1080** | 16:9 | YouTube, TV, Landscape videos |
| **720×1280** | 9:16 | Vertical SD (smaller file size) |
| **720×720** | 1:1 | Square SD (smaller file size) |

The preview window shows the exact video output with the selected dimensions, so what you see is what you get!

## Video Quality Settings

The reel generator offers multiple quality levels to balance file size and visual quality:

| Quality | Description | CRF | Video Bitrate | Best For |
|---------|-------------|-----|---------------|----------|
| **Standard** | Good quality, smaller files | 23 | 8 Mbps | Quick sharing, social media |
| **High** | Excellent quality (default) | 18 | 15 Mbps | Most use cases |
| **Maximum** | Best possible quality | 15 | 25 Mbps | Professional use, archival |

### High-Quality Encoding Mode

When MP4 export is available, you can enable **High-Quality Encoding** (enabled by default). This mode:

1. **Generates frames as PNG** - Each video frame is rendered as a lossless PNG image
2. **Encodes directly with FFmpeg** - Bypasses the browser's MediaRecorder for better quality control
3. **Uses optimal encoding settings** - H.264 High Profile, proper color space handling

This produces significantly sharper videos compared to the standard MediaRecorder approach, though it may take longer to generate.

### Tips for Best Quality

1. **Upload high-resolution images** - Images are stored up to 2160×3840 (4K vertical) at 92% quality
2. **Use "High" or "Maximum" quality** - The default "High" setting works well for most cases
3. **Enable High-Quality Encoding** - This is on by default for MP4 exports
4. **Use MP4 format** - MP4 with H.264 generally produces better quality than WebM

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
├── samples/                        # Sample JSON config files
│   ├── sample-config.json          # Full-featured example
│   ├── sample-config-with-music.json # With background music
│   └── sample-config-minimal.json  # Minimal example
├── src/
│   ├── components/
│   │   ├── ImageUpload.tsx       # Drag & drop image upload
│   │   ├── ImageSidebar.tsx      # Sidebar with reorderable image list
│   │   ├── ImageEditor.tsx       # Main editor with inline crop/text editing
│   │   ├── MusicUpload.tsx       # Audio upload component
│   │   ├── MusicControls.tsx     # Inline music trimming controls
│   │   ├── ReelPreview.tsx       # Preview & video generation
│   │   ├── PreviewModal.tsx      # Preview modal with settings
│   │   ├── ConfigImport.tsx      # JSON config import dialog
│   │   └── index.ts              # Component exports
│   ├── hooks/
│   │   ├── useImageStorage.ts    # IndexedDB for images
│   │   └── useLocalStorage.ts    # localStorage for config
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── test/
│   │   ├── setup.ts              # Test setup with mocks
│   │   ├── testUtils.ts          # Test helper functions
│   │   ├── configImport.test.ts  # Config import tests
│   │   ├── previewWindow.test.ts # Preview window tests
│   │   ├── videoGeneration.test.ts # Video generation tests
│   │   ├── videoRendering.test.ts  # Rendering tests
│   │   └── videoIntegration.test.ts # Integration tests
│   ├── utils/
│   │   ├── helpers.ts            # Utility functions
│   │   └── videoConverter.ts     # FFmpeg.wasm integration
│   ├── App.tsx                   # Main application
│   └── index.css                 # Application styles
├── vite.config.ts                # Vite config with headers
├── vitest.config.ts              # Test configuration
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
- Images are stored at high quality: up to 2160×3840 pixels (4K vertical) at 92% JPEG quality
- PNG images with transparency are preserved without lossy compression

## License

MIT
