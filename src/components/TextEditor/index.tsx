import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Stack,
  Switch,
  FormControlLabel,
} from '@mui/material';
import CodeEditor from '@uiw/react-textarea-code-editor';
import type { TextItem, AnimationType, TextPosition } from '../../types';
import { editorStyles } from './styles';

interface TextEditorProps {
  text: TextItem | null;
  onSaveText: (textId: string, updates: Partial<TextItem>) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  text,
  onSaveText,
}) => {
  if (!text) {
    return (
      <Box sx={editorStyles.empty}>
        <Typography color="text.secondary">
          Select a text to edit
        </Typography>
      </Box>
    );
  }

  const handleChange = (field: keyof TextItem, value: any) => {
    onSaveText(text.id, { [field]: value });
  };

  return (
    <Box sx={editorStyles.root}>
      <Typography variant="h6" gutterBottom>
        Edit Text
      </Typography>

      {/* Text Content */}
      <Box sx={{ mb: 2 }}>
        {text.isCode ? (
          <Box sx={{ position: 'relative' }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Code Content
            </Typography>
            <CodeEditor
              value={text.content}
              language={text.language || 'javascript'}
              placeholder="Enter your code here..."
              onChange={(evn) => handleChange('content', evn.target.value)}
              padding={15}
              data-color-mode="light"
              style={{
                fontSize: 14,
                backgroundColor: '#f6f8fa',
                fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace',
                borderRadius: 4,
                border: '1px solid #d1d9e0',
                minHeight: '120px',
              }}
            />
          </Box>
        ) : (
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Text Content"
            value={text.content}
            onChange={(e) => handleChange('content', e.target.value)}
          />
        )}
      </Box>

      {/* Code Detection */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Code Settings</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={text.isCode || false}
                onChange={(e) => handleChange('isCode', e.target.checked)}
                size="small"
              />
            }
            label="Syntax Highlight"
          />
          {text.isCode && (
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Language</InputLabel>
              <Select
                value={text.language || 'javascript'}
                label="Language"
                onChange={(e) => handleChange('language', e.target.value)}
                size="small"
              >
                <MenuItem value="javascript">JavaScript</MenuItem>
                <MenuItem value="typescript">TypeScript</MenuItem>
                <MenuItem value="python">Python</MenuItem>
                <MenuItem value="css">CSS</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </Select>
            </FormControl>
          )}
        </Stack>
      </Box>

      {/* Animation & Style Row */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Animation & Style</Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Animation</InputLabel>
            <Select
              value={text.animationType}
              label="Animation"
              onChange={(e) => handleChange('animationType', e.target.value as AnimationType)}
              size="small"
            >
              <MenuItem value="fadeIn">Fade In</MenuItem>
              <MenuItem value="slideIn">Slide In</MenuItem>
              <MenuItem value="zoomIn">Zoom In</MenuItem>
              <MenuItem value="typewriter">Typewriter</MenuItem>
              <MenuItem value="bounce">Bounce</MenuItem>
              <MenuItem value="none">None</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 100 }}>
            <InputLabel>Weight</InputLabel>
            <Select
              value={text.fontWeight}
              label="Weight"
              onChange={(e) => handleChange('fontWeight', e.target.value as 'normal' | 'bold')}
              size="small"
            >
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="bold">Bold</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography variant="caption">Color</Typography>
            <input
              type="color"
              value={text.fontColor}
              onChange={(e) => handleChange('fontColor', e.target.value)}
              style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', borderRadius: 4 }}
            />
          </Box>

          <Box sx={{ minWidth: 80 }}>
            <Typography variant="caption">Size: {text.fontSize}px</Typography>
            <Slider
              value={text.fontSize}
              onChange={(_, value) => handleChange('fontSize', value)}
              min={12}
              max={120}
              step={2}
              size="small"
            />
          </Box>
        </Stack>
      </Box>

      {/* Layout Row */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Layout</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl sx={{ minWidth: 100 }}>
            <InputLabel>Position</InputLabel>
            <Select
              value={text.position}
              label="Position"
              onChange={(e) => handleChange('position', e.target.value as TextPosition)}
              size="small"
            >
              <MenuItem value="top">Top</MenuItem>
              <MenuItem value="center">Center</MenuItem>
              <MenuItem value="bottom">Bottom</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 100 }}>
            <InputLabel>Align</InputLabel>
            <Select
              value={text.textAlign}
              label="Align"
              onChange={(e) => handleChange('textAlign', e.target.value as 'left' | 'center' | 'right')}
              size="small"
            >
              <MenuItem value="left">Left</MenuItem>
              <MenuItem value="center">Center</MenuItem>
              <MenuItem value="right">Right</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Timing */}
      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Timing</Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption">Animation Duration: {text.animationDuration}ms</Typography>
          <Slider
            value={text.animationDuration}
            onChange={(_, value) => handleChange('animationDuration', value)}
            min={200}
            max={5000}
            step={100}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box>
          <Typography variant="caption">Pause Duration: {text.pauseDuration}ms</Typography>
          <Slider
            value={text.pauseDuration}
            onChange={(_, value) => handleChange('pauseDuration', value)}
            min={500}
            max={10000}
            step={500}
            valueLabelDisplay="auto"
          />
        </Box>
      </Box>
    </Box>
  );
};