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
  Button,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import CodeEditor from '@uiw/react-textarea-code-editor';
import type { TextItem, AnimationType, TextPosition, TextParagraph } from '../../types';
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

  const hasParagraphs = text.paragraphs && text.paragraphs.length > 0;

  const handleToggleMode = () => {
    if (hasParagraphs) {
      // Switch to single paragraph - use first paragraph's content if available
      const firstPara = text.paragraphs?.[0];
      onSaveText(text.id, {
        paragraphs: undefined,
        content: firstPara?.content || '',
        fontSize: firstPara?.fontSize || text.fontSize,
        fontColor: firstPara?.fontColor || text.fontColor,
        fontWeight: firstPara?.fontWeight || text.fontWeight,
        textAlign: firstPara?.textAlign || text.textAlign,
        position: firstPara?.position || text.position,
        isCode: firstPara?.isCode || text.isCode,
        language: firstPara?.language || text.language,
      });
    } else {
      // Switch to multi-paragraph - create paragraphs from current content
      const currentContent = text.content || '';
      const paragraphs = currentContent.split('\n\n').filter(p => p.trim()).map((paraContent, index) => ({
        id: `para-${Date.now()}-${index}`,
        content: paraContent.trim(),
        fontSize: text.fontSize || 48,
        fontColor: text.fontColor || '#ffffff',
        fontWeight: text.fontWeight || 'bold',
        textAlign: text.textAlign || 'center',
        position: text.position || 'center',
        isCode: text.isCode,
        language: text.language,
      }));

      onSaveText(text.id, {
        content: undefined,
        paragraphs: paragraphs.length > 0 ? paragraphs : [{
          id: `para-${Date.now()}`,
          content: currentContent || 'New paragraph',
          fontSize: text.fontSize || 48,
          fontColor: text.fontColor || '#ffffff',
          fontWeight: text.fontWeight || 'bold',
          textAlign: text.textAlign || 'center',
          position: text.position || 'center',
        }],
      });
    }
  };

  return (
    <Box sx={editorStyles.root}>
      <Typography variant="h6" gutterBottom>
        Edit Text
      </Typography>

      {/* Mode Toggle */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={hasParagraphs}
              onChange={handleToggleMode}
            />
          }
          label={hasParagraphs ? "Multi-Paragraph Mode" : "Single Paragraph Mode"}
        />
      </Box>

      {hasParagraphs ? (
        <MultiParagraphEditor text={text} onSaveText={onSaveText} />
      ) : (
        <>
          {/* Text Content */}
          <Box sx={{ mb: 2 }}>
            {text.isCode ? (
              <Box sx={{ position: 'relative' }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Code Content
                </Typography>
                <CodeEditor
                  value={text.content || ''}
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
                value={text.content || ''}
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
                  value={text.fontWeight || 'bold'}
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
                  value={text.fontColor || '#ffffff'}
                  onChange={(e) => handleChange('fontColor', e.target.value)}
                  style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ minWidth: 80 }}>
                <Typography variant="caption">Size: {text.fontSize || 48}px</Typography>
                <Slider
                  value={text.fontSize || 48}
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
                  value={text.position || 'center'}
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
                  value={text.textAlign || 'center'}
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
        </>
      )}

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

// Multi-Paragraph Editor Component
const MultiParagraphEditor: React.FC<{ text: TextItem; onSaveText: (textId: string, updates: Partial<TextItem>) => void }> = ({
  text,
  onSaveText,
}) => {
  const handleAddParagraph = () => {
    const newParagraph = {
      id: `para-${Date.now()}`,
      content: 'New paragraph',
      fontSize: 48,
      fontColor: '#ffffff',
      fontWeight: 'bold' as const,
      textAlign: 'center' as const,
      position: 'center' as const,
    };

    const updatedParagraphs = [...(text.paragraphs || []), newParagraph];
    onSaveText(text.id, { paragraphs: updatedParagraphs });
  };

  const handleRemoveParagraph = (paragraphId: string) => {
    const updatedParagraphs = text.paragraphs?.filter(p => p.id !== paragraphId) || [];
    onSaveText(text.id, { paragraphs: updatedParagraphs });
  };

  const handleUpdateParagraph = (paragraphId: string, updates: Partial<TextParagraph>) => {
    const updatedParagraphs = text.paragraphs?.map(p =>
      p.id === paragraphId ? { ...p, ...updates } : p
    ) || [];
    onSaveText(text.id, { paragraphs: updatedParagraphs });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Multi-Paragraph Layout
      </Typography>

      {/* Global Settings */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Global Animation Settings</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Animation</InputLabel>
            <Select
              value={text.animationType}
              label="Animation"
              onChange={(e) => onSaveText(text.id, { animationType: e.target.value as AnimationType })}
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

          <Box sx={{ minWidth: 120 }}>
            <Typography variant="caption">Anim Duration: {text.animationDuration}ms</Typography>
            <Slider
              value={text.animationDuration}
              onChange={(_, value) => onSaveText(text.id, { animationDuration: value })}
              min={200}
              max={5000}
              step={100}
              size="small"
            />
          </Box>

          <Box sx={{ minWidth: 120 }}>
            <Typography variant="caption">Pause Duration: {text.pauseDuration}ms</Typography>
            <Slider
              value={text.pauseDuration}
              onChange={(_, value) => onSaveText(text.id, { pauseDuration: value })}
              min={500}
              max={10000}
              step={500}
              size="small"
            />
          </Box>
        </Stack>
      </Box>

      {/* Paragraphs */}
      <Stack spacing={2}>
        {text.paragraphs?.map((paragraph, paraIndex) => (
          <Card key={paragraph.id} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Paragraph {paraIndex + 1}</Typography>
                <IconButton
                  size="small"
                  onClick={() => handleRemoveParagraph(paragraph.id)}
                  disabled={text.paragraphs?.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>

              {/* Paragraph Content */}
              <Box sx={{ mb: 2 }}>
                {paragraph.isCode ? (
                  <CodeEditor
                    value={paragraph.content}
                    language={paragraph.language || 'javascript'}
                    placeholder="Enter your code here..."
                    onChange={(evn) => handleUpdateParagraph(paragraph.id, { content: evn.target.value })}
                    padding={10}
                    data-color-mode="light"
                    style={{
                      fontSize: 12,
                      backgroundColor: '#f6f8fa',
                      fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace',
                      borderRadius: 4,
                      border: '1px solid #d1d9e0',
                      minHeight: '80px',
                    }}
                  />
                ) : (
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Paragraph Content"
                    value={paragraph.content}
                    onChange={(e) => handleUpdateParagraph(paragraph.id, { content: e.target.value })}
                  />
                )}
              </Box>

              {/* Paragraph Settings */}
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <FormControl sx={{ minWidth: 80 }}>
                  <InputLabel size="small">Weight</InputLabel>
                  <Select
                    value={paragraph.fontWeight}
                    label="Weight"
                    onChange={(e) => handleUpdateParagraph(paragraph.id, { fontWeight: e.target.value })}
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
                    value={paragraph.fontColor}
                    onChange={(e) => handleUpdateParagraph(paragraph.id, { fontColor: e.target.value })}
                    style={{ width: 30, height: 30, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                  />
                </Box>

                <Box sx={{ minWidth: 60 }}>
                  <Typography variant="caption">Size: {paragraph.fontSize}px</Typography>
                  <Slider
                    value={paragraph.fontSize}
                    onChange={(_, value) => handleUpdateParagraph(paragraph.id, { fontSize: value })}
                    min={12}
                    max={120}
                    step={2}
                    size="small"
                  />
                </Box>

                <FormControl sx={{ minWidth: 80 }}>
                  <InputLabel size="small">Align</InputLabel>
                  <Select
                    value={paragraph.textAlign}
                    label="Align"
                    onChange={(e) => handleUpdateParagraph(paragraph.id, { textAlign: e.target.value })}
                    size="small"
                  >
                    <MenuItem value="left">Left</MenuItem>
                    <MenuItem value="center">Center</MenuItem>
                    <MenuItem value="right">Right</MenuItem>
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 80 }}>
                  <InputLabel size="small">Position</InputLabel>
                  <Select
                    value={paragraph.position}
                    label="Position"
                    onChange={(e) => handleUpdateParagraph(paragraph.id, { position: e.target.value })}
                    size="small"
                  >
                    <MenuItem value="top">Top</MenuItem>
                    <MenuItem value="center">Center</MenuItem>
                    <MenuItem value="bottom">Bottom</MenuItem>
                  </Select>
                </FormControl>

                {/* Code toggle */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={paragraph.isCode || false}
                      onChange={(e) => handleUpdateParagraph(paragraph.id, { isCode: e.target.checked })}
                      size="small"
                    />
                  }
                  label="Code"
                />

                {paragraph.isCode && (
                  <FormControl sx={{ minWidth: 100 }}>
                    <InputLabel size="small">Lang</InputLabel>
                    <Select
                      value={paragraph.language || 'javascript'}
                      label="Lang"
                      onChange={(e) => handleUpdateParagraph(paragraph.id, { language: e.target.value })}
                      size="small"
                    >
                      <MenuItem value="javascript">JS</MenuItem>
                      <MenuItem value="typescript">TS</MenuItem>
                      <MenuItem value="python">Python</MenuItem>
                      <MenuItem value="css">CSS</MenuItem>
                      <MenuItem value="json">JSON</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddParagraph}
        >
          Add Paragraph
        </Button>
      </Box>
    </Box>
  );
};