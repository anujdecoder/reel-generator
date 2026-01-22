import { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Paper,
} from '@mui/material';
import {
  MusicNote as MusicNoteIcon,
  Movie as MovieIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import { ImageUpload, ImageSidebar, ImageEditor, MusicUpload, MusicControls, PreviewModal } from './components';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useImageStorage } from './hooks/useImageStorage';
import type { ImageItem, ReelConfig, TextOverlay, CropSettings, MusicTrack, TransitionType } from './types';

const DEFAULT_CONFIG: ReelConfig = {
  transitionDuration: 500,
  imageDuration: 2000,
  transitionType: 'fade',
  outputFormat: 'mp4',
  videoQuality: 'high',
  useDirectEncoding: true, // Use advanced FFmpeg encoding for best quality
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Box
        component="header"
        sx={{
          py: 3,
          textAlign: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          🎬 Reel Generator
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Create stunning video reels from your images
        </Typography>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flex: 1, py: 3 }}>
        <Container maxWidth="xl">
          {/* Loading State */}
          {isLoadingImages && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={48} />
              <Typography sx={{ mt: 2 }}>Loading your images...</Typography>
            </Box>
          )}

          {/* Storage Error */}
          {storageError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {storageError}
            </Alert>
          )}

          {!isLoadingImages && images.length === 0 ? (
            /* No images - show upload screen */
            <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
              <Typography variant="h5" gutterBottom>
                📤 Upload Your Images
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Select multiple images to create your video reel
              </Typography>
              
              <ImageUpload onImagesAdded={handleImagesAdded} variant="dropzone" />
              
              <Typography color="text.secondary" sx={{ mt: 3 }}>
                👆 Upload at least 2 images to create a reel
              </Typography>
            </Paper>
          ) : !isLoadingImages ? (
            /* Images exist - show the editor layout */
            <Stack spacing={2}>
              {/* Action Bar */}
              <Paper sx={{ p: 2 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', md: 'center' }}
                  spacing={2}
                >
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <ImageUpload onImagesAdded={handleImagesAdded} />
                    <Button
                      variant="outlined"
                      startIcon={<MusicNoteIcon />}
                      onClick={() => setShowMusicUpload(!showMusicUpload)}
                    >
                      {config.music ? 'Change Music' : 'Add Music'}
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<MovieIcon />}
                      onClick={() => setShowPreview(true)}
                      disabled={images.length < 2}
                    >
                      Preview & Generate
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={`${images.length} image${images.length !== 1 ? 's' : ''}`}
                      color="primary"
                      variant="outlined"
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteSweepIcon />}
                      onClick={handleClearAll}
                      size="small"
                    >
                      Clear All
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              {/* Music Upload Dropdown */}
              {showMusicUpload && !config.music && (
                <Paper sx={{ p: 2 }}>
                  <MusicUpload
                    music={config.music}
                    videoDuration={videoDuration}
                    onMusicChange={handleMusicChange}
                  />
                </Paper>
              )}

              {/* Music Controls */}
              {config.music && (
                <Paper sx={{ p: 2 }}>
                  <MusicControls
                    music={config.music}
                    videoDuration={videoDuration}
                    onMusicChange={handleMusicChange}
                  />
                </Paper>
              )}

              {/* Two-column layout */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '300px 1fr' },
                  gap: 2,
                  minHeight: 500,
                }}
              >
                {/* Left column: Image Sidebar */}
                <Paper sx={{ overflow: 'hidden' }}>
                  <ImageSidebar
                    images={images}
                    selectedImageId={selectedImage?.id || null}
                    onSelectImage={handleSelectImage}
                    onReorder={handleReorderImages}
                    onRemove={handleRemoveImage}
                  />
                </Paper>

                {/* Right column: Image Editor */}
                <Paper sx={{ overflow: 'hidden' }}>
                  <ImageEditor
                    image={selectedImage}
                    defaultDuration={config.imageDuration}
                    defaultTransition={config.transitionType}
                    onSaveTextOverlay={handleSaveTextOverlay}
                    onSaveCrop={handleSaveCrop}
                    onSaveTiming={handleSaveTiming}
                    onCopyTimingToAll={handleCopyTimingToAll}
                  />
                </Paper>
              </Box>
            </Stack>
          ) : null}
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: 'center',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {images.length === 0 
            ? 'Tip: Upload multiple images at once by selecting them all'
            : images.length < 2
            ? 'Tip: Add at least one more image to create a reel'
            : 'Tip: Click an image in the sidebar to crop or add text'
          }
        </Typography>
      </Box>

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
    </Box>
  );
}

export default App;

