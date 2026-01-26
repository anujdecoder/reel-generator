import React from 'react';
import { Paper, Stack, Button, Chip } from '@mui/material';
import { MusicNote as MusicNoteIcon, Movie as MovieIcon, DeleteSweep as DeleteSweepIcon, Code as CodeIcon } from '@mui/icons-material';
import type { ImageItem, ReelConfig } from '../../types';
import { ImageUpload } from '../ImageUpload';
import { actionBarStyles } from './styles';

interface ActionBarProps {
  images: ImageItem[];
  config: ReelConfig;
  onImagesAdded: (images: ImageItem[]) => void;
  onConfigImport: () => void;
  onMusicToggle: () => void;
  onPreview: () => void;
  onClearAll: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  images,
  config,
  onImagesAdded,
  onConfigImport,
  onMusicToggle,
  onPreview,
  onClearAll,
}) => {
  return (
    <Paper sx={actionBarStyles.root}>
      <Stack sx={actionBarStyles.buttonStack}>
        <Stack sx={actionBarStyles.actionButtons}>
          <ImageUpload onImagesAdded={onImagesAdded} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<CodeIcon />}
            onClick={onConfigImport}
          >
            Import JSON
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<MusicNoteIcon />}
            onClick={onMusicToggle}
          >
            {config.music ? 'Music' : 'Add Music'}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<MovieIcon />}
            onClick={onPreview}
            disabled={images.length < 2}
          >
            Preview & Generate
          </Button>
        </Stack>
        <Stack sx={actionBarStyles.statsStack}>
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
            onClick={onClearAll}
            size="small"
          >
            Clear
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};
