import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export const imageUploadStyles = (isDragging: boolean, isProcessing: boolean): Record<string, SxProps<Theme>> => ({
  dropzone: {
    border: 2,
    borderStyle: 'dashed',
    borderColor: isDragging ? 'primary.main' : 'divider',
    borderRadius: 2,
    p: 4,
    textAlign: 'center',
    cursor: isProcessing ? 'wait' : 'pointer',
    bgcolor: isDragging 
      ? (theme: Theme) => alpha(theme.palette.primary.main, 0.1)
      : 'transparent',
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: 'primary.main',
      bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.05),
    },
  },
  icon: {
    mb: 2,
  },
  statusText: {
    mb: 1,
  },
  processingText: {
    color: 'text.secondary',
  },
  uploadText: {
    mb: 1,
  },
  clickText: {
    color: 'primary.main',
    fontWeight: 600,
  },
  formatText: {
    color: 'text.secondary',
  },
  compressionText: {
    color: 'text.secondary',
    mt: 0.5,
  },
});
