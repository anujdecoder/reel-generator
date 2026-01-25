import type { SxProps, Theme } from '@mui/material/styles';

export const editorLayoutStyles: Record<string, SxProps<Theme>> = {
  root: {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
    gap: 1,
    flex: 1,
    m: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  sidebar: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  editor: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};
