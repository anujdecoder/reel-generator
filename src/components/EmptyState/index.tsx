import React from 'react';
import { Box, Paper, Typography, Stack, Button } from '@mui/material';
import { Code as CodeIcon } from '@mui/icons-material';
import { ImageUpload } from '../ImageUpload';
import { emptyStateStyles } from './styles';

interface EmptyStateProps {
  onImagesAdded: (images: any[]) => void;
  onConfigImport: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onImagesAdded,
  onConfigImport,
}) => {
  return (
    <Box sx={emptyStateStyles.root}>
      <Paper sx={emptyStateStyles.paper}>
        <Typography variant="h5" gutterBottom>
          📤 Upload Your Images
        </Typography>
        <Typography color="text.secondary" sx={emptyStateStyles.title}>
          Select multiple images to create your video reel
        </Typography>
        
        <ImageUpload onImagesAdded={onImagesAdded} variant="dropzone" />
        
        <Stack sx={emptyStateStyles.uploadSection}>
          <Typography color="text.secondary">
            👆 Upload at least 2 images
          </Typography>
          <Typography color="text.secondary">or</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CodeIcon />}
            onClick={onConfigImport}
          >
            Import from JSON
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
