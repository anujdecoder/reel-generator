# 🎬 Reel Generator

A React + TypeScript application that allows users to create stunning video reels from their images with smooth transitions.

## Features

- **Image Upload**: Drag and drop or click to upload multiple images
- **Image Management**: Reorder images by dragging or using arrow buttons, remove individual images
- **Real-time Preview**: Preview your reel with selected images and transitions
- **Multiple Transition Effects**: Choose from Fade, Slide, Zoom, or None
- **Customizable Timing**: Adjust image display duration and transition duration
- **Video Generation**: Generate a WebM video file with your images and transitions
- **Local Storage**: All images and settings are saved to localStorage for persistence

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
```

The built files will be in the `dist` directory.

## Usage

1. **Upload Images**: Click on the upload area or drag and drop images from your computer
2. **Arrange Images**: Drag images to reorder them, or use the arrow buttons
3. **Preview**: Use the play/pause controls to preview your reel
4. **Configure Settings**:
   - **Image Duration**: How long each image is displayed (0.5s - 5s)
   - **Transition Duration**: How long the transition takes (0.2s - 2s)
   - **Transition Type**: Fade, Slide, Zoom, or None
5. **Generate Video**: Click "Generate Video" to create and download a WebM video file

## Tech Stack

- **React 19** - UI Library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **CSS3** - Styling with animations
- **Canvas API** - Video frame rendering
- **MediaRecorder API** - Video encoding

## Project Structure

```
reel-generator/
├── src/
│   ├── components/
│   │   ├── ImageUpload.tsx    # Drag & drop image upload
│   │   ├── ImageList.tsx      # Sortable image grid
│   │   ├── ReelPreview.tsx    # Preview & video generation
│   │   └── index.ts           # Component exports
│   ├── hooks/
│   │   └── useLocalStorage.ts # LocalStorage state management
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   ├── utils/
│   │   └── helpers.ts         # Utility functions
│   ├── App.tsx                # Main application
│   ├── App.css                # Application styles
│   └── index.css              # Global styles
├── index.html
└── package.json
```

## Browser Support

Video generation uses the MediaRecorder API with WebM/VP9 encoding. Supported browsers:
- Chrome 47+
- Firefox 25+
- Edge 79+
- Safari 14.1+ (limited support)

## Local Storage

The application stores:
- Uploaded images (as base64 data URLs)
- Reel configuration (durations, transition type)

Note: Large images may impact localStorage limits (~5MB typical). Consider resizing large images before upload.

## License

MIT
