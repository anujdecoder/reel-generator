import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Stack,
  alpha,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import type { TextItem } from '../../types';
import { sidebarStyles } from './styles';

interface TextSidebarProps {
  texts: TextItem[];
  selectedTextId: string | null;
  onSelectText: (text: TextItem) => void;
  onReorder: (texts: TextItem[]) => void;
  onRemove: (id: string) => void;
}

export const TextSidebar: React.FC<TextSidebarProps> = ({
  texts,
  selectedTextId,
  onSelectText,
  onReorder,
  onRemove,
}) => {
  return (
    <Box sx={sidebarStyles.root}>
      <Typography variant="h6" sx={sidebarStyles.title}>
        Texts
      </Typography>

      <List sx={sidebarStyles.list}>
        {texts.map((text, index) => (
          <ListItem
            key={text.id}
            disablePadding
            secondaryAction={
              <IconButton
                edge="end"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(text.id);
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemButton
              selected={selectedTextId === text.id}
              onClick={() => onSelectText(text)}
              sx={sidebarStyles.listItem}
            >
              <ListItemText
                primary={`Text ${index + 1}`}
                secondary={text.content.substring(0, 30) + (text.content.length > 30 ? '...' : '')}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};