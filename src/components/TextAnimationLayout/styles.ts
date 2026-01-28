import type { SxProps, Theme } from '@mui/material/styles';

export const layoutStyles: Record<string, SxProps<Theme>> = {
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    bgcolor: 'background.default',
    overflow: 'hidden',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  loadingText: {
    mt: 2,
  },

  errorAlert: {
    m: 1,
  },

  editorContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
};