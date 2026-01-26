import React from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import {
  ActionBar,
  EditorLayout,
  MusicSection,
  EmptyState,
  PreviewModal,
  ConfigImport
} from '../';
import type { ImageItem, ReelConfig } from '../../types';
import { layoutStyles } from './styles';

interface LayoutProps {
  // Data
  images: ImageItem[];
  config: ReelConfig;
  isLoadingImages: boolean;
  storageError: string | null;
  videoDuration: number;
  
  // UI State
  selectedImage: ImageItem | null;
  showMusicUpload: boolean;
  showPreview: boolean;
  showConfigImport: boolean;
  
  // Event handlers
  onImagesAdded: (images: ImageItem[]) => void;
  onConfigImport: () => void;
  onMusicToggle: () => void;
  onPreview: () => void;
  onClearAll: () => void;
  onSelectImage: (image: ImageItem) => void;
  onReorderImages: (images: ImageItem[]) => void;
  onRemoveImage: (id: string) => void;
  onSaveTextOverlay: (imageId: string, textOverlay: any) => void;
  onSaveCrop: (imageId: string, cropSettings: any, croppedDataUrl: string) => void;
  onSaveTiming: (imageId: string, duration?: number, transitionType?: any) => void;
  onMusicChange: (music: any) => void;
  onConfigChange: (config: ReelConfig) => void;
  onPreviewClose: () => void;
  onConfigImportClose: () => void;
  onConfigImportSubmit: (importedImages: ImageItem[], importedConfig: Partial<ReelConfig>, importedMusic?: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  images,
  config,
  isLoadingImages,
  storageError,
  videoDuration,
  selectedImage,
  showMusicUpload,
  showPreview,
  showConfigImport,
  onImagesAdded,
  onConfigImport,
  onMusicToggle,
  onPreview,
  onClearAll,
  onSelectImage,
  onReorderImages,
  onRemoveImage,
  onSaveTextOverlay,
  onSaveCrop,
  onSaveTiming,
  onMusicChange,
  onConfigChange,
  onPreviewClose,
  onConfigImportClose,
  onConfigImportSubmit,
}) => {
  return (
    <Box sx={layoutStyles.root}>
      {/* Loading State */}
      {isLoadingImages && (
        <Box sx={layoutStyles.loadingContainer}>
          <CircularProgress size={48} />
          <Typography sx={layoutStyles.loadingText}>Loading your images...</Typography>
        </Box>
      )}

      {/* Storage Error */}
      {storageError && (
        <Alert severity="error" sx={layoutStyles.errorAlert}>
          {storageError}
        </Alert>
      )}

      {!isLoadingImages && images.length === 0 ? (
        /* No images - show empty state */
        <EmptyState
          onImagesAdded={onImagesAdded}
          onConfigImport={onConfigImport}
        />
      ) : !isLoadingImages ? (
        /* Images exist - show editor layout */
        <Box sx={layoutStyles.editorContainer}>
          <ActionBar
            images={images}
            config={config}
            onImagesAdded={onImagesAdded}
            onConfigImport={onConfigImport}
            onMusicToggle={onMusicToggle}
            onPreview={onPreview}
            onClearAll={onClearAll}
          />

          <MusicSection
            music={config.music}
            videoDuration={videoDuration}
            showMusicUpload={showMusicUpload}
            onMusicChange={onMusicChange}
          />

          <EditorLayout
            images={images}
            selectedImage={selectedImage}
            config={{
              imageDuration: config.imageDuration,
              transitionType: config.transitionType,
            }}
            onSelectImage={onSelectImage}
            onReorder={onReorderImages}
            onRemove={onRemoveImage}
            onSaveTextOverlay={onSaveTextOverlay}
            onSaveCrop={onSaveCrop}
            onSaveTiming={onSaveTiming}
          />
        </Box>
      ) : null}

      {/* Modals */}
      {showPreview && (
        <PreviewModal
          images={images}
          config={config}
          onConfigChange={onConfigChange}
          onClose={onPreviewClose}
        />
      )}

      <ConfigImport
        open={showConfigImport}
        onClose={onConfigImportClose}
        onImport={onConfigImportSubmit}
      />
    </Box>
  );
};
