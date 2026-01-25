import React from 'react';
import { Box, Paper } from '@mui/material';
import type { ImageItem } from '../../types';
import { ImageSidebar } from '../ImageSidebar';
import { ImageEditor } from '../ImageEditor';
import { editorLayoutStyles } from './styles';

interface EditorLayoutProps {
  images: ImageItem[];
  selectedImage: ImageItem | null;
  config: {
    imageDuration: number;
    transitionType: string;
  };
  onSelectImage: (image: ImageItem) => void;
  onReorder: (images: ImageItem[]) => void;
  onRemove: (id: string) => void;
  onSaveTextOverlay: (imageId: string, textOverlay: any) => void;
  onSaveCrop: (imageId: string, cropSettings: any, croppedDataUrl: string) => void;
  onSaveTiming: (imageId: string, duration?: number, transitionType?: string) => void;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  images,
  selectedImage,
  config,
  onSelectImage,
  onReorder,
  onRemove,
  onSaveTextOverlay,
  onSaveCrop,
  onSaveTiming,
}) => {
  return (
    <Box sx={editorLayoutStyles.root}>
      {/* Left column: Image Sidebar */}
      <Paper sx={editorLayoutStyles.sidebar}>
        <ImageSidebar
          images={images}
          selectedImageId={selectedImage?.id || null}
          onSelectImage={onSelectImage}
          onReorder={onReorder}
          onRemove={onRemove}
        />
      </Paper>

      {/* Right column: Image Editor */}
      <Paper sx={editorLayoutStyles.editor}>
        <ImageEditor
          image={selectedImage}
          defaultDuration={config.imageDuration}
          defaultTransition={config.transitionType as any}
          onSaveTextOverlay={onSaveTextOverlay}
          onSaveCrop={onSaveCrop}
          onSaveTiming={onSaveTiming}
        />
      </Paper>
    </Box>
  );
};
