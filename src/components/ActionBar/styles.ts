import type { SxProps, Theme } from '@mui/material/styles';

export const actionBarStyles: Record<string, SxProps<Theme>> = {
  root: {
    p: 1.5,
    m: 1,
    mb: 0,
    flexShrink: 0,
  },
  buttonStack: {
    direction: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    spacing: 1,
    flexWrap: 'wrap',
  },
  actionButtons: {
    direction: 'row',
    spacing: 1,
    flexWrap: 'wrap',
  },
  statsStack: {
    direction: 'row',
    spacing: 1,
    alignItems: 'center',
  },
};
