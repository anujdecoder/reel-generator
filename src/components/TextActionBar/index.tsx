import React from 'react';
import { Paper, Stack, Button, Chip, Box } from '@mui/material';
import { MusicNote as MusicNoteIcon, Movie as MovieIcon, DeleteSweep as DeleteSweepIcon, TextFields as TextFieldsIcon } from '@mui/icons-material';
import type { TextItem, TextAnimationConfig } from '../../types';
import { actionBarStyles } from './styles';

interface TextActionBarProps {
  texts: TextItem[];
  config: TextAnimationConfig;
  onAddText: (content?: string) => void;
  onMusicToggle: () => void;
  onPreview: () => void;
  onClearAll: () => void;
}

export const TextActionBar: React.FC<TextActionBarProps> = ({
  texts,
  config,
  onAddText,
  onMusicToggle,
  onPreview,
  onClearAll,
}) => {
  return (
    <Paper sx={actionBarStyles.root}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TextFieldsIcon />}
          onClick={() => onAddText()}
        >
          Add Text
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
          disabled={texts.length === 0}
        >
          Preview & Generate
        </Button>
        <Box sx={{ flex: 1 }} />
        <Chip
          label={`${texts.length} text${texts.length !== 1 ? 's' : ''}`}
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
    </Paper>
  );
};