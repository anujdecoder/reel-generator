import { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import {
  Box,
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
  transitionType: 'slide',
  outputFormat: 'mp4',
  videoQuality: 'high',
  useDirectEncoding: true, // Use advanced FFmpeg encoding for best quality
  videoDimensions: '1080x1920', // Default to vertical HD for reels
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
    // Update selected image if it's the one being edited (use functional update to avoid stale closure)
    setSelectedImage(prev => prev?.id === imageId ? { ...prev, textOverlay } : prev);
  }, [setImages]);

  const handleSaveCrop = useCallback((imageId: string, cropSettings: CropSettings, croppedDataUrl: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, cropSettings, croppedDataUrl } : img
      )
    );
    // Update selected image if it's the one being edited (use functional update to avoid stale closure)
    setSelectedImage(prev => prev?.id === imageId ? { ...prev, cropSettings, croppedDataUrl } : prev);
  }, [setImages]);

  const handleSaveTiming = useCallback((imageId: string, duration: number | undefined, transitionType: TransitionType | undefined) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, duration, transitionType } : img
      )
    );
    // Update selected image if it's the one being edited (use functional update to avoid stale closure)
    setSelectedImage(prev => prev?.id === imageId ? { ...prev, duration, transitionType } : prev);
  }, [setImages]);

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
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Loading State */}
      {isLoadingImages && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <CircularProgress size={48} />
          <Typography sx={{ mt: 2 }}>Loading your images...</Typography>
        </Box>
      )}

      {/* Storage Error */}
      {storageError && (
        <Alert severity="error" sx={{ m: 1 }}>
          {storageError}
        </Alert>
      )}

      {!isLoadingImages && images.length === 0 ? (
        /* No images - show upload screen */
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 600 }}>
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
        </Box>
      ) : !isLoadingImages ? (
        /* Images exist - show the editor layout */
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Action Bar */}
          <Paper sx={{ p: 1.5, m: 1, mb: 0, flexShrink: 0 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
            >
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <ImageUpload onImagesAdded={handleImagesAdded} />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<MusicNoteIcon />}
                  onClick={() => setShowMusicUpload(!showMusicUpload)}
                >
                  {config.music ? 'Music' : 'Add Music'}
                </Button>
                <Button
                  variant="contained"
                  size="small"
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
                  size="small"
                />
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteSweepIcon />}
                  onClick={handleClearAll}
                  size="small"
                >
                  Clear
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* Music Upload Dropdown */}
          {showMusicUpload && !config.music && (
            <Paper sx={{ p: 1.5, mx: 1, mt: 1, flexShrink: 0 }}>
              <MusicUpload
                music={config.music}
                videoDuration={videoDuration}
                onMusicChange={handleMusicChange}
              />
            </Paper>
          )}

          {/* Music Controls */}
          {config.music && (
            <Paper sx={{ p: 1.5, mx: 1, mt: 1, flexShrink: 0 }}>
              <MusicControls
                music={config.music}
                videoDuration={videoDuration}
                onMusicChange={handleMusicChange}
              />
            </Paper>
          )}

          {/* Two-column layout - fills remaining space */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
              gap: 1,
              flex: 1,
              m: 1,
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            {/* Left column: Image Sidebar */}
            <Paper sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ImageSidebar
                images={images}
                selectedImageId={selectedImage?.id || null}
                onSelectImage={handleSelectImage}
                onReorder={handleReorderImages}
                onRemove={handleRemoveImage}
              />
            </Paper>

            {/* Right column: Image Editor */}
            <Paper sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ImageEditor
                image={selectedImage}
                defaultDuration={config.imageDuration}
                defaultTransition={config.transitionType}
                onSaveTextOverlay={handleSaveTextOverlay}
                onSaveCrop={handleSaveCrop}
                onSaveTiming={handleSaveTiming}
              />
            </Paper>
          </Box>
        </Box>
      ) : null}

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

