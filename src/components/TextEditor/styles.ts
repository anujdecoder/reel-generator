import type { SxProps, Theme } from '@mui/material/styles';

export const editorStyles: Record<string, SxProps<Theme>> = {
  root: {
    p: 2,
    height: '100%',
    overflow: 'auto',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
};