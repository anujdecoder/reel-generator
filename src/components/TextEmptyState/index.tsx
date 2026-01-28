import React from 'react';
import { Box, Paper, Typography, Button, TextField, Stack } from '@mui/material';
import { Code as CodeIcon } from '@mui/icons-material';
import { emptyStateStyles } from './styles';

interface TextEmptyStateProps {
  onAddText: (content?: string) => void;
  onConfigImport: () => void;
}

export const TextEmptyState: React.FC<TextEmptyStateProps> = ({
  onAddText,
  onConfigImport,
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

        <Stack sx={emptyStateStyles.uploadSection}>
          <Typography color="text.secondary">
            or
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CodeIcon />}
            onClick={onConfigImport}
          >
            Import from JSON
          </Button>
        </Stack>

      </Paper>
    </Box>
  );
};