import React from 'react';
import { Box, Paper, Typography, Button, TextField } from '@mui/material';
import { emptyStateStyles } from './styles';

interface TextEmptyStateProps {
  onAddText: (content?: string) => void;
}

export const TextEmptyState: React.FC<TextEmptyStateProps> = ({
  onAddText,
}) => {
  const [text, setText] = React.useState('');

  const handleAdd = () => {
    onAddText(text || 'Your Text Here');
    setText('');
  };

  return (
    <Box sx={emptyStateStyles.root}>
      <Paper sx={emptyStateStyles.paper}>
        <Typography variant="h5" gutterBottom>
          📝 Add Your Text
        </Typography>
        <Typography color="text.secondary" sx={emptyStateStyles.title}>
          Enter text to create animated video
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Enter your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button variant="contained" onClick={handleAdd} sx={{ mb: 2 }}>
          Add Text
        </Button>


      </Paper>
    </Box>
  );
};