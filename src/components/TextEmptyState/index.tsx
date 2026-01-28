import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Stack,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Divider
} from '@mui/material';
import {
  Code as CodeIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentPaste as PasteIcon
} from '@mui/icons-material';
import type {
  TextItem,
  MusicTrack,
  TextAnimationConfig,
  ConfigTextItem,
} from '../../types';
import { highlightCode } from '../../utils/codeHighlight';
import { emptyStateStyles } from './styles';

interface TextEmptyStateProps {
  onAddText: (content?: string) => void;
  onConfigImport: (texts: TextItem[], config: Partial<TextAnimationConfig>, music?: MusicTrack) => void;
}

interface DownloadProgress {
  total: number;
  completed: number;
  current: string;
  errors: string[];
}

const EXAMPLE_CONFIG = {
  "globalConfig": {
    "animationDuration": 1000,
    "pauseDuration": 2000,
    "animationType": "typewriter",
    "videoDimensions": "1080x1920",
    "videoQuality": "high",
    "backgroundColor": "#000000"
  },
  "texts": [
    {
      "content": "Hello\\nWorld!",
      "animationDuration": 1500,
      "pauseDuration": 3000,
      "animationType": "typewriter",
      "fontSize": 48,
      "fontColor": "#ffffff",
      "fontWeight": "bold",
      "textAlign": "center",
      "position": "center",
      "isCode": false,
      "language": "javascript"
    },
    {
      "paragraphs": [
        {
          "content": "function greet(name) {\\n  return \`Hello, \${name}!\`;\\n}",
          "fontSize": 36,
          "fontColor": "#ffffff",
          "fontWeight": "normal",
          "textAlign": "left",
          "position": "top",
          "isCode": true,
          "language": "javascript"
        },
        {
          "content": "This function creates personalized greetings.",
          "fontSize": 24,
          "fontColor": "#cccccc",
          "fontWeight": "normal",
          "textAlign": "left",
          "position": "center"
        }
      ]
    }
  ],
  "music": {
    "url": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    "startTime": 0,
    "endTime": 10,
    "volume": 0.7,
  }
};

export const TextEmptyState: React.FC<TextEmptyStateProps> = ({
  onAddText,
  onConfigImport,
}) => {
  const [text, setText] = useState('');
  const [configText, setConfigText] = useState('');
  const [showConfigImport, setShowConfigImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [showExample, setShowExample] = useState(false);

  const handleAdd = () => {
    onAddText(text || 'Your Text Here');
    setText('');
  };

  const handlePasteExample = () => {
    setConfigText(JSON.stringify(EXAMPLE_CONFIG, null, 2));
    setError(null);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setConfigText(text);
      setError(null);
    } catch {
      setError('Could not read from clipboard. Please paste manually.');
    }
  };

  const parseConfig = (jsonString: string) => {
    const parsed = JSON.parse(jsonString);

    // Validate required fields
    if (!parsed.texts || !Array.isArray(parsed.texts)) {
      throw new Error('Config must have a "texts" array');
    }

    if (parsed.texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    // Validate each text has either content or paragraphs
    for (let i = 0; i < parsed.texts.length; i++) {
      const text = parsed.texts[i];
      const hasContent = text.content && typeof text.content === 'string';
      const hasParagraphs = text.paragraphs && Array.isArray(text.paragraphs) && text.paragraphs.length > 0;

      if (!hasContent && !hasParagraphs) {
        throw new Error(`Text at index ${i} must have either a "content" string or a "paragraphs" array`);
      }

      // If both are present, that's also invalid
      if (hasContent && hasParagraphs) {
        throw new Error(`Text at index ${i} cannot have both "content" and "paragraphs" - choose one mode`);
      }

      // Validate paragraphs structure if present
      if (hasParagraphs) {
        for (let j = 0; j < text.paragraphs!.length; j++) {
          const paragraph = text.paragraphs![j];
          if (!paragraph.content || typeof paragraph.content !== 'string') {
            throw new Error(`Text at index ${i}, paragraph at index ${j} must have a "content" string`);
          }
        }
      }
    }

    return parsed;
  };

  const createTextItem = (textConfig: ConfigTextItem, index: number): TextItem => {
    const textItem: TextItem = {
      id: `imported-${Date.now()}-${index}`,
      animationType: textConfig.animationType || 'typewriter',
      animationDuration: textConfig.animationDuration || 1000,
      pauseDuration: textConfig.pauseDuration || 2000,
    };

    // Handle multi-paragraph or single paragraph
    if (textConfig.paragraphs && textConfig.paragraphs.length > 0) {
      textItem.paragraphs = textConfig.paragraphs.map(para => ({
        id: `para-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        content: para.content,
        fontSize: para.fontSize || 48,
        fontColor: para.fontColor || '#ffffff',
        fontWeight: para.fontWeight || 'bold',
        textAlign: para.textAlign || 'center',
        position: para.position || 'center',
        isCode: para.isCode,
        language: para.language,
        highlightedTokens: para.isCode && para.language ?
          highlightCode(para.content, para.language) : undefined,
      }));
    } else {
      // Single paragraph mode
      textItem.content = textConfig.content;
      textItem.fontSize = textConfig.fontSize || 48;
      textItem.fontColor = textConfig.fontColor || '#ffffff';
      textItem.backgroundColor = textConfig.backgroundColor;
      textItem.fontWeight = textConfig.fontWeight || 'bold';
      textItem.textAlign = textConfig.textAlign || 'center';
      textItem.position = textConfig.position || 'center';
      textItem.isCode = textConfig.isCode;
      textItem.language = textConfig.language;

      // Cache highlighted tokens if this is code
      if (textItem.isCode && textItem.language) {
        textItem.highlightedTokens = highlightCode(textItem.content!, textItem.language);
      }
    }

    return textItem;
  };

  const handleConfigImport = async () => {
    setError(null);
    setIsLoading(true);
    setProgress(null);

    try {
      // Parse and validate config
      const config = parseConfig(configText);

      const totalItems = config.texts.length + (config.music ? 1 : 0);
      setProgress({
        total: totalItems,
        completed: 0,
        current: 'Processing configuration...',
        errors: [],
      });

      // Create text items
      const textItems: TextItem[] = [];
      const errors: string[] = [];

      for (let i = 0; i < config.texts.length; i++) {
        try {
          const textItem = createTextItem(config.texts[i], i);
          textItems.push(textItem);
        } catch (err) {
          const errMsg = `Text ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`;
          errors.push(errMsg);
        }

        setProgress(prev => prev ? {
          ...prev,
          completed: prev.completed + 1,
        } : null);
      }

      if (textItems.length === 0) {
        throw new Error('No texts could be processed.');
      }

      // Build text animation config
      const textAnimationConfig: Partial<TextAnimationConfig> = {};
      if (config.globalConfig) {
        if (config.globalConfig.animationDuration !== undefined) {
          textAnimationConfig.animationDuration = config.globalConfig.animationDuration;
        }
        if (config.globalConfig.pauseDuration !== undefined) {
          textAnimationConfig.pauseDuration = config.globalConfig.pauseDuration;
        }
        if (config.globalConfig.animationType) {
          textAnimationConfig.animationType = config.globalConfig.animationType;
        }
        if (config.globalConfig.videoDimensions) {
          textAnimationConfig.videoDimensions = config.globalConfig.videoDimensions;
        }
        if (config.globalConfig.videoQuality) {
          textAnimationConfig.videoQuality = config.globalConfig.videoQuality;
        }
        if (config.globalConfig.backgroundColor) {
          textAnimationConfig.backgroundColor = config.globalConfig.backgroundColor;
        }
      }

      // Success - call onImport
      setProgress(prev => prev ? {
        ...prev,
        current: 'Complete!',
        errors,
      } : null);

      setTimeout(() => {
        onConfigImport(textItems, textAnimationConfig, config.music);
        setConfigText('');
        setProgress(null);
        setShowConfigImport(false);
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse config');
      setIsLoading(false);
      setProgress(null);
    }
  };

  if (showConfigImport) {
    return (
      <Box sx={emptyStateStyles.root}>
        <Paper sx={{ ...emptyStateStyles.paper, maxWidth: 800 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CodeIcon />
              <Typography variant="h6">Import Text Animation Configuration</Typography>
            </Stack>
            <IconButton onClick={() => setShowConfigImport(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste a JSON configuration to automatically create text animations with music.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {progress && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2">{progress.current}</Typography>
                <Chip
                  label={`${progress.completed}/${progress.total}`}
                  size="small"
                  color="primary"
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={(progress.completed / progress.total) * 100}
              />
              {progress.errors.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight={600}>Some items failed:</Typography>
                  {progress.errors.map((err, i) => (
                    <Typography key={i} variant="caption" display="block">• {err}</Typography>
                  ))}
                </Alert>
              )}
            </Box>
          )}

          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Button
              size="small"
              startIcon={<PasteIcon />}
              onClick={handlePasteFromClipboard}
              disabled={isLoading}
            >
              Paste from Clipboard
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={handlePasteExample}
              disabled={isLoading}
            >
              Use Example
            </Button>
            <Button
              size="small"
              onClick={() => setShowExample(!showExample)}
              endIcon={showExample ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {showExample ? 'Hide' : 'Show'} Schema
            </Button>
          </Stack>

          <Collapse in={showExample}>
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.900' }}>
              <Typography variant="caption" component="pre" sx={{
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                fontSize: '0.75rem',
                color: 'grey.300',
              }}>
{`{
  "globalConfig": {
    "animationDuration": 1000,    // ms - how long animation takes
    "pauseDuration": 2000,        // ms - how long text stays visible
    "animationType": "typewriter", // fadeIn | slideIn | zoomIn | typewriter | bounce | none
    "videoDimensions": "1080x1920",
    "videoQuality": "high",       // standard | high | maximum
    "backgroundColor": "#000000"
  },
  "texts": [
    // Single paragraph mode
    {
      "content": "Hello\\nWorld!",    // Use \\n for line breaks
      "animationDuration": 1500,      // Optional: override global
      "pauseDuration": 3000,          // Optional: override global
      "animationType": "typewriter",  // Optional: override global
      "fontSize": 48,
      "fontColor": "#ffffff",
      "fontWeight": "bold",           // normal | bold
      "textAlign": "center",          // left | center | right
      "position": "center",           // top | center | bottom
      "isCode": false,                // Optional: enable syntax highlighting
      "language": "javascript"        // Optional: programming language
    },
    // Multi-paragraph mode
    {
      "animationDuration": 2000,
      "pauseDuration": 3000,
      "animationType": "fadeIn",
      "paragraphs": [
        {
          "content": "function greet(name) {\\n  return \`Hello, \${name}!\`;\\n}",
          "fontSize": 36,
          "fontColor": "#ffffff",
          "fontWeight": "normal",
          "textAlign": "left",
          "position": "top",
          "isCode": true,
          "language": "javascript"
        },
        {
          "content": "This function creates personalized greetings.",
          "fontSize": 24,
          "fontColor": "#cccccc",
          "fontWeight": "normal",
          "textAlign": "left",
          "position": "center"
        }
      ]
    }
  ],
  "music": {                         // Optional
    "url": "https://...",
    "startTime": 0,                  // seconds
    "endTime": 30,                   // seconds
    "volume": 0.8                    // 0-1
  }
}`}</Typography>
            </Paper>
          </Collapse>

          <TextField
            fullWidth
            multiline
            rows={12}
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            placeholder="Paste your JSON config here..."
            disabled={isLoading}
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              },
              mb: 2
            }}
          />

          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button onClick={() => setShowConfigImport(false)} disabled={isLoading}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleConfigImport}
              disabled={!configText.trim() || isLoading}
            >
              {isLoading ? 'Importing...' : 'Import & Load'}
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={emptyStateStyles.root}>
      <Paper sx={emptyStateStyles.paper}>
        <Typography variant="h5" gutterBottom>
          📝 Create Your Text Animation
        </Typography>
        <Typography color="text.secondary" sx={emptyStateStyles.title}>
          Start with manual text entry or import a configuration
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

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button variant="contained" onClick={handleAdd} sx={{ flex: 1 }}>
            Add Text
          </Button>
          <Button
            variant="outlined"
            startIcon={<CodeIcon />}
            onClick={() => setShowConfigImport(true)}
            sx={{ flex: 1 }}
          >
            Import Config
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary" align="center">
          💡 Tip: Use "Import Config" to load pre-built templates and complex configurations
        </Typography>

      </Paper>
    </Box>
  );
};