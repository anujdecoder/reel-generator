import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { TextItem } from '../../types';
import { sidebarStyles } from './styles';

interface TextSidebarProps {
  texts: TextItem[];
  selectedTextId: string | null;
  onSelectText: (text: TextItem) => void;
  onReorder: (texts: TextItem[]) => void;
  onRemove: (id: string) => void;
  onAddText: (content?: string) => void;
}

export const TextSidebar: React.FC<TextSidebarProps> = ({
  texts,
  selectedTextId,
  onSelectText,
  onRemove,
  onAddText,
}) => {
  return (
    <Box sx={sidebarStyles.root}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" sx={sidebarStyles.title}>
          Texts
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onAddText()}
          sx={{ minWidth: 'auto', px: 1 }}
        >
          Add
        </Button>
      </Box>

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
                secondary={
                  text.columns && text.columns.length > 0
                    ? `${text.columns.length} column${text.columns.length > 1 ? 's' : ''}`
                    : text.content
                      ? text.content.substring(0, 30) + (text.content.length > 30 ? '...' : '')
                      : 'Empty text'
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};