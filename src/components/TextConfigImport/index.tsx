import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Stack,
  Chip,
  IconButton,
  Collapse,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentPaste as PasteIcon,
} from '@mui/icons-material';
import type {
  TextAnimationConfigJSON,
  TextItem,
  MusicTrack,
  TextAnimationConfig,
  ConfigTextItem,
} from '../../types';

interface TextConfigImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (texts: TextItem[], config: Partial<TextAnimationConfig>, music?: MusicTrack) => void;
}

interface DownloadProgress {
  total: number;
  completed: number;
  current: string;
  errors: string[];
}

const EXAMPLE_CONFIG: TextAnimationConfigJSON = {
  globalConfig: {
    animationDuration: 1000,
    pauseDuration: 2000,
    animationType: 'typewriter',
    videoDimensions: '1080x1920',
    videoQuality: 'high',
    backgroundColor: '#000000',
  },
  texts: [
    {
      content: 'Welcome to our\nText Animation!',
      animationDuration: 1500,
      pauseDuration: 3000,
      animationType: 'typewriter',
      fontSize: 48,
      fontColor: '#ffffff',
      fontWeight: 'bold',
      textAlign: 'center',
      position: 'center',
    },
    {
      content: 'This is the\nsecond slide',
      animationDuration: 1000,
      pauseDuration: 2500,
      animationType: 'fadeIn',
      fontSize: 42,
      fontColor: '#ff6b6b',
      fontWeight: 'normal',
      textAlign: 'center',
      position: 'center',
    },
    {
      content: 'The End',
      animationDuration: 800,
      pauseDuration: 2000,
      animationType: 'slideIn',
      fontSize: 36,
      fontColor: '#4ecdc4',
      textAlign: 'center',
      position: 'center',
    },
  ],
  music: {
    url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    startTime: 0,
    endTime: 10,
    volume: 0.7,
  },
};

async function downloadAudioAsDataUrl(url: string): Promise<{ dataUrl: string; duration: number }> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const blob = await response.blob();

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Get audio duration
  const duration = await new Promise<number>((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => resolve(60); // Default to 60 seconds if can't determine
    audio.src = dataUrl;
  });

  return { dataUrl, duration };
}

function parseConfig(jsonString: string): TextAnimationConfigJSON {
  const parsed = JSON.parse(jsonString);

  // Validate required fields
  if (!parsed.texts || !Array.isArray(parsed.texts)) {
    throw new Error('Config must have a "texts" array');
  }

  if (parsed.texts.length === 0) {
    throw new Error('Texts array cannot be empty');
  }

  // Validate each text has content
  for (let i = 0; i < parsed.texts.length; i++) {
    if (!parsed.texts[i].content || typeof parsed.texts[i].content !== 'string') {
      throw new Error(`Text at index ${i} must have a "content" string`);
    }
  }

  return parsed as TextAnimationConfigJSON;
}

function createTextItem(textConfig: ConfigTextItem, index: number): TextItem {
  return {
    id: `imported-${Date.now()}-${index}`,
    content: textConfig.content,
    animationType: textConfig.animationType || 'typewriter',
    animationDuration: textConfig.animationDuration || 1000,
    pauseDuration: textConfig.pauseDuration || 2000,
    fontSize: textConfig.fontSize || 48,
    fontColor: textConfig.fontColor || '#ffffff',
    backgroundColor: textConfig.backgroundColor,
    fontWeight: textConfig.fontWeight || 'bold',
    textAlign: textConfig.textAlign || 'center',
    position: textConfig.position || 'center',
  };
}

export const TextConfigImport: React.FC<TextConfigImportProps> = ({ open, onClose, onImport }) => {
  const [configText, setConfigText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [showExample, setShowExample] = useState(false);

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

  const handleImport = useCallback(async () => {
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
        current: 'Processing texts...',
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

      // Download music if specified
      let musicTrack: MusicTrack | undefined;
      if (config.music?.url) {
        setProgress(prev => prev ? {
          ...prev,
          current: 'Downloading music...',
        } : null);

        try {
          const { dataUrl, duration } = await downloadAudioAsDataUrl(config.music.url);

          const urlParts = config.music.url.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0] || 'music.mp3';

          musicTrack = {
            id: `music-${Date.now()}`,
            name: filename,
            dataUrl,
            duration,
            startTime: config.music.startTime || 0,
            endTime: config.music.endTime || duration,
            volume: config.music.volume ?? 1,
          };
        } catch (err) {
          errors.push(`Music: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }

        setProgress(prev => prev ? {
          ...prev,
          completed: prev.completed + 1,
          errors,
        } : null);
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
        onImport(textItems, textAnimationConfig, musicTrack);
        onClose();
        setConfigText('');
        setProgress(null);
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse config');
      setIsLoading(false);
      setProgress(null);
    }
  }, [configText, onImport, onClose]);

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setError(null);
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CodeIcon />
          <Typography variant="h6">Import Text Animation from JSON</Typography>
        </Stack>
        <IconButton onClick={handleClose} disabled={isLoading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
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
    {
      "content": "Hello\\nWorld!",    // Use \\n for line breaks
      "animationDuration": 1500,      // Optional: override global
      "pauseDuration": 3000,          // Optional: override global
      "animationType": "typewriter",  // Optional: override global
      "fontSize": 48,
      "fontColor": "#ffffff",
      "fontWeight": "bold",           // normal | bold
      "textAlign": "center",          // left | center | right
      "position": "center"            // top | center | bottom
    }
  ],
  "music": {                         // Optional
    "url": "https://...",
    "startTime": 0,                  // seconds
    "endTime": 30,                   // seconds
    "volume": 0.8                    // 0-1
  }
}`}
            </Typography>
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
          }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!configText.trim() || isLoading}
        >
          {isLoading ? 'Importing...' : 'Import & Load'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};