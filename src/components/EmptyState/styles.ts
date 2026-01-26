import type { SxProps, Theme } from '@mui/material/styles';

export const emptyStateStyles: Record<string, SxProps<Theme>> = {
  root: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paper: {
    p: 4,
    textAlign: 'center',
    maxWidth: 600,
  },
  title: {
    mb: 3,
  },
  uploadSection: {
    direction: 'row',
    spacing: 2,
    justifyContent: 'center',
    mt: 3,
  },
};
