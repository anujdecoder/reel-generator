import type { SxProps, Theme } from '@mui/material/styles';

export const sidebarStyles: Record<string, SxProps<Theme>> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    p: 1,
  },
  title: {
    mb: 1,
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    overflow: 'auto',
  },
  listItem: {
    borderRadius: 1,
  },
};