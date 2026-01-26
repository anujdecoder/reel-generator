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
  ReelConfigJSON, 
  ImageItem, 
  MusicTrack, 
  ReelConfig,
  TextOverlay,
  ConfigImageItem,
} from '../../types';

interface ConfigImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (images: ImageItem[], config: Partial<ReelConfig>, music?: MusicTrack) => void;
}

interface DownloadProgress {
  total: number;
  completed: number;
  current: string;
  errors: string[];
}

const EXAMPLE_CONFIG: ReelConfigJSON = {
  globalConfig: {
    transitionDuration: 500,
    imageDuration: 3000,
    transitionType: 'slide',
    videoDimensions: '1080x1920',
    videoQuality: 'high',
  },
  images: [
    {
      url: 'https://picsum.photos/1080/1920?random=1',
      duration: 3000,
      transitionType: 'slide',
      text: {
        content: 'Welcome!',
        position: 'bottom',
        fontSize: 48,
        fontColor: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
      },
    },
    {
      url: 'https://picsum.photos/1080/1920?random=2',
      duration: 2500,
      transitionType: 'fade',
      text: {
        content: 'Second Slide',
        position: 'center',
        fontSize: 36,
      },
    },
    {
      url: 'https://picsum.photos/1080/1920?random=3',
      duration: 3000,
      text: {
        content: 'The End',
        position: 'bottom',
      },
    },
  ],
};

async function downloadImageAsDataUrl(url: string): Promise<string> {
  try {
    // Try fetching directly first
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    // If CORS fails, try using an image element (works for some cases)
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(dataUrl);
        } catch {
          reject(new Error('CORS blocked - image cannot be loaded'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }
}

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

function parseConfig(jsonString: string): ReelConfigJSON {
  const parsed = JSON.parse(jsonString);
  
  // Validate required fields
  if (!parsed.images || !Array.isArray(parsed.images)) {
    throw new Error('Config must have an "images" array');
  }
  
  if (parsed.images.length === 0) {
    throw new Error('Images array cannot be empty');
  }
  
  // Validate each image has a URL
  for (let i = 0; i < parsed.images.length; i++) {
    if (!parsed.images[i].url || typeof parsed.images[i].url !== 'string') {
      throw new Error(`Image at index ${i} must have a "url" string`);
    }
  }
  
  return parsed as ReelConfigJSON;
}

function createTextOverlay(textConfig: ConfigImageItem['text']): TextOverlay | undefined {
  if (!textConfig || !textConfig.content) return undefined;
  
  return {
    text: textConfig.content,
    position: textConfig.position || 'bottom',
    fontSize: textConfig.fontSize || 32,
    fontColor: textConfig.fontColor || '#ffffff',
    backgroundColor: textConfig.backgroundColor || 'rgba(0, 0, 0, 0.6)',
    fontWeight: textConfig.fontWeight || 'bold',
    textAlign: textConfig.textAlign || 'center',
  };
}

export const ConfigImport: React.FC<ConfigImportProps> = ({ open, onClose, onImport }) => {
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
      
      const totalItems = config.images.length + (config.music ? 1 : 0);
      setProgress({
        total: totalItems,
        completed: 0,
        current: 'Starting...',
        errors: [],
      });

      // Download images
      const downloadedImages: ImageItem[] = [];
      const errors: string[] = [];

      for (let i = 0; i < config.images.length; i++) {
        const imgConfig = config.images[i];
        setProgress(prev => prev ? {
          ...prev,
          current: `Downloading image ${i + 1}/${config.images.length}...`,
        } : null);

        try {
          const dataUrl = await downloadImageAsDataUrl(imgConfig.url);
          
          // Extract filename from URL
          const urlParts = imgConfig.url.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0] || `image-${i + 1}.jpg`;

          const imageItem: ImageItem = {
            id: `imported-${Date.now()}-${i}`,
            name: filename,
            dataUrl,
            createdAt: Date.now(),
            duration: imgConfig.duration,
            transitionType: imgConfig.transitionType,
            textOverlay: createTextOverlay(imgConfig.text),
          };

          downloadedImages.push(imageItem);
        } catch (err) {
          const errMsg = `Image ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`;
          errors.push(errMsg);
        }

        setProgress(prev => prev ? {
          ...prev,
          completed: prev.completed + 1,
          errors,
        } : null);
      }

      if (downloadedImages.length === 0) {
        throw new Error('No images could be downloaded. Check the URLs and CORS settings.');
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

      // Build reel config
      const reelConfig: Partial<ReelConfig> = {};
      if (config.globalConfig) {
        if (config.globalConfig.transitionDuration !== undefined) {
          reelConfig.transitionDuration = config.globalConfig.transitionDuration;
        }
        if (config.globalConfig.imageDuration !== undefined) {
          reelConfig.imageDuration = config.globalConfig.imageDuration;
        }
        if (config.globalConfig.transitionType) {
          reelConfig.transitionType = config.globalConfig.transitionType;
        }
        if (config.globalConfig.videoDimensions) {
          reelConfig.videoDimensions = config.globalConfig.videoDimensions;
        }
        if (config.globalConfig.videoQuality) {
          reelConfig.videoQuality = config.globalConfig.videoQuality;
        }
      }

      // Success - call onImport
      setProgress(prev => prev ? {
        ...prev,
        current: 'Complete!',
        errors,
      } : null);

      setTimeout(() => {
        onImport(downloadedImages, reelConfig, musicTrack);
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
          <Typography variant="h6">Import from JSON Config</Typography>
        </Stack>
        <IconButton onClick={handleClose} disabled={isLoading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste a JSON configuration to automatically download images, apply settings, and generate a video.
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
    "transitionDuration": 500,    // ms
    "imageDuration": 3000,        // ms (default for images)
    "transitionType": "slide",    // fade | slide | zoom | none
    "videoDimensions": "1080x1920",
    "videoQuality": "high"        // standard | high | maximum
  },
  "images": [
    {
      "url": "https://...",       // Required: image URL
      "duration": 3000,           // Optional: override global
      "transitionType": "fade",   // Optional: override global
      "text": {                   // Optional: text overlay
        "content": "Hello!",      // Required if text is set
        "position": "bottom",     // top | center | bottom
        "fontSize": 48,
        "fontColor": "#ffffff",
        "backgroundColor": "rgba(0,0,0,0.6)",
        "fontWeight": "bold",     // normal | bold
        "textAlign": "center"     // left | center | right
      }
    }
  ],
  "music": {                      // Optional
    "url": "https://...",
    "startTime": 0,               // seconds
    "endTime": 30,                // seconds
    "volume": 0.8                 // 0-1
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
