import React from 'react';
import { Box, Paper } from '@mui/material';
import type { TextItem } from '../../types';
import { TextSidebar } from '../TextSidebar';
import { TextEditor } from '../TextEditor';
import { editorLayoutStyles } from './styles';

interface TextEditorLayoutProps {
  texts: TextItem[];
  selectedText: TextItem | null;
  onSelectText: (text: TextItem) => void;
  onReorder: (texts: TextItem[]) => void;
  onRemove: (id: string) => void;
  onSaveText: (textId: string, updates: Partial<TextItem>) => void;
  onAddText: (content?: string) => void;
}

export const TextEditorLayout: React.FC<TextEditorLayoutProps> = ({
  texts,
  selectedText,
  onSelectText,
  onReorder,
  onRemove,
  onSaveText,
  onAddText,
}) => {
  return (
    <Box sx={editorLayoutStyles.root}>
      {/* Left column: Text Sidebar */}
      <Paper sx={editorLayoutStyles.sidebar}>
        <TextSidebar
          texts={texts}
          selectedTextId={selectedText?.id || null}
          onSelectText={onSelectText}
          onReorder={onReorder}
          onRemove={onRemove}
          onAddText={onAddText}
        />
      </Paper>

      {/* Right column: Text Editor */}
      <Paper sx={editorLayoutStyles.editor}>
        <TextEditor
          text={selectedText}
          onSaveText={onSaveText}
        />
      </Paper>
    </Box>
  );
};