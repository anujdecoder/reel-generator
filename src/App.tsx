import { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { ImageUpload, ImageSidebar, ImageEditor, MusicUpload, MusicControls, PreviewModal } from './components';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useImageStorage } from './hooks/useImageStorage';
import type { ImageItem, ReelConfig, TextOverlay, CropSettings, MusicTrack, TransitionType } from './types';
import './App.css';

const DEFAULT_CONFIG: ReelConfig = {
  transitionDuration: 500,
  imageDuration: 2000,
  transitionType: 'fade',
  outputFormat: 'mp4',
};

function App() {
  // Use IndexedDB for images (supports larger storage)
  const [images, setImages, isLoadingImages, storageError] = useImageStorage();
  // Use localStorage for config (small data)
  const [config, setConfig] = useLocalStorage<ReelConfig>('reel-config', DEFAULT_CONFIG);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [showMusicUpload, setShowMusicUpload] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Calculate video duration based on images and config
  const videoDuration = useMemo(() => {
    if (images.length === 0) return 0;
    // Sum up per-image durations (using default if not set) plus transitions
    const totalMs = images.reduce((sum, img) => {
      const duration = img.duration ?? config.imageDuration;
      return sum + duration + config.transitionDuration;
    }, 0);
    return totalMs / 1000; // Convert to seconds
  }, [images, config.imageDuration, config.transitionDuration]);

  // Select first image when images change and no image is selected
  useEffect(() => {
    if (images.length > 0 && !selectedImage) {
      setSelectedImage(images[0]);
    } else if (images.length === 0) {
      setSelectedImage(null);
    } else if (selectedImage && !images.find(img => img.id === selectedImage.id)) {
      // If selected image was removed, select the first one
      setSelectedImage(images[0] || null);
    }
    // Only re-run when images array changes, not selectedImage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const handleImagesAdded = useCallback((newImages: ImageItem[]) => {
    setImages((prev) => [...prev, ...newImages]);
    // Select the first new image if nothing is selected
    if (newImages.length > 0 && !selectedImage) {
      setSelectedImage(newImages[0]);
    }
  }, [setImages, selectedImage]);

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, [setImages]);

  const handleReorderImages = useCallback((newImages: ImageItem[]) => {
    setImages(newImages);
  }, [setImages]);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to remove all images?')) {
      setImages([]);
      setSelectedImage(null);
    }
  }, [setImages]);

  const handleSelectImage = useCallback((image: ImageItem) => {
    setSelectedImage(image);
  }, []);

  const handleSaveTextOverlay = useCallback((imageId: string, textOverlay: TextOverlay | undefined) => {
    setImages((prev) => 
      prev.map((img) => 
        img.id === imageId ? { ...img, textOverlay } : img
      )
    );
    // Update selected image if it's the one being edited
    if (selectedImage?.id === imageId) {
      setSelectedImage(prev => prev ? { ...prev, textOverlay } : null);
    }
  }, [setImages, selectedImage]);

  const handleSaveCrop = useCallback((imageId: string, cropSettings: CropSettings, croppedDataUrl: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, cropSettings, croppedDataUrl } : img
      )
    );
    // Update selected image if it's the one being edited
    if (selectedImage?.id === imageId) {
      setSelectedImage(prev => prev ? { ...prev, cropSettings, croppedDataUrl } : null);
    }
  }, [setImages, selectedImage]);

  const handleSaveTiming = useCallback((imageId: string, duration: number | undefined, transitionType: TransitionType | undefined) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, duration, transitionType } : img
      )
    );
    // Update selected image if it's the one being edited
    if (selectedImage?.id === imageId) {
      setSelectedImage(prev => prev ? { ...prev, duration, transitionType } : null);
    }
  }, [setImages, selectedImage]);

  const handleCopyTimingToAll = useCallback((duration: number, transitionType: TransitionType) => {
    setImages((prev) =>
      prev.map((img) => ({ ...img, duration, transitionType }))
    );
    // Update selected image with new timing
    if (selectedImage) {
      setSelectedImage(prev => prev ? { ...prev, duration, transitionType } : null);
    }
  }, [setImages, selectedImage]);

  const handleMusicChange = useCallback((music: MusicTrack | undefined) => {
    setConfig((prev) => ({ ...prev, music }));
    setShowMusicUpload(false);
    // Update audio element source
    if (audioRef.current) {
      if (music) {
        audioRef.current.src = music.dataUrl;
        audioRef.current.volume = music.volume;
      } else {
        audioRef.current.src = '';
        audioRef.current.pause();
      }
    }
  }, [setConfig]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎬 Reel Generator</h1>
        <p className="app-subtitle">Create stunning video reels from your images</p>
      </header>

      <main className="app-main">
        {/* Show loading state */}
        {isLoadingImages && (
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <p>Loading your images...</p>
          </div>
        )}

        {/* Show storage error if any */}
        {storageError && (
          <div className="error-state">
            <p>⚠️ {storageError}</p>
          </div>
        )}

        {!isLoadingImages && images.length === 0 ? (
          /* No images - show upload screen */
          <div className="upload-section">
            <div className="section-header">
              <h2>📤 Upload Your Images</h2>
              <p>Select multiple images to create your video reel</p>
            </div>
            
            <ImageUpload onImagesAdded={handleImagesAdded} />
            
            <div className="empty-state">
              <p>👆 Upload at least 2 images to create a reel</p>
            </div>
          </div>
        ) : !isLoadingImages ? (
          /* Images exist - show the new 3-row layout */
          <div className="editor-layout">
            {/* Row 1: Action Buttons */}
            <div className="action-bar">
              <div className="action-bar-left">
                <div className="upload-inline">
                  <ImageUpload onImagesAdded={handleImagesAdded} />
                </div>
                <button 
                  className="action-btn music-btn btn-music"
                  onClick={() => setShowMusicUpload(!showMusicUpload)}
                >
                  🎵 {config.music ? 'Change Music' : 'Add Music'}
                </button>
                <button 
                  className="action-btn preview-btn btn-preview"
                  onClick={() => setShowPreview(true)}
                  disabled={images.length < 2}
                >
                  🎬 Preview & Generate
                </button>
              </div>
              <div className="action-bar-right">
                <span className="image-count">{images.length} image{images.length !== 1 ? 's' : ''}</span>
                <button className="action-btn btn-clear" onClick={handleClearAll}>
                  🗑️ Clear All
                </button>
              </div>
            </div>

            {/* Music Upload Dropdown */}
            {showMusicUpload && !config.music && (
              <div className="music-upload-row">
                <MusicUpload
                  music={config.music}
                  videoDuration={videoDuration}
                  onMusicChange={handleMusicChange}
                />
              </div>
            )}

            {/* Row 2: Music Controls (visible only if music is uploaded) */}
            {config.music && (
              <div className="music-row">
                <MusicControls
                  music={config.music}
                  videoDuration={videoDuration}
                  onMusicChange={handleMusicChange}
                />
              </div>
            )}

            {/* Row 3: Two-column layout */}
            <div className="editor-columns">
              {/* Left column: Image Sidebar (30%) */}
              <div className="sidebar-column">
                <ImageSidebar
                  images={images}
                  selectedImageId={selectedImage?.id || null}
                  onSelectImage={handleSelectImage}
                  onReorder={handleReorderImages}
                  onRemove={handleRemoveImage}
                />
              </div>

              {/* Right column: Image Editor (70%) */}
              <div className="editor-column">
                <ImageEditor
                  image={selectedImage}
                  defaultDuration={config.imageDuration}
                  defaultTransition={config.transitionType}
                  onSaveTextOverlay={handleSaveTextOverlay}
                  onSaveCrop={handleSaveCrop}
                  onSaveTiming={handleSaveTiming}
                  onCopyTimingToAll={handleCopyTimingToAll}
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="app-footer">
        <p>
          {images.length === 0 
            ? 'Tip: Upload multiple images at once by selecting them all'
            : images.length < 2
            ? 'Tip: Add at least one more image to create a reel'
            : 'Tip: Click an image in the sidebar to crop or add text'
          }
        </p>
      </footer>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          images={images}
          config={config}
          onConfigChange={setConfig}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Hidden audio element for music playback */}
      <audio ref={audioRef} />
    </div>
  );
}

export default App;

