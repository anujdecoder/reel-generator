import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Paper,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  ContentCut as CropIcon,
  TextFields as TextIcon,
  Timer as TimerIcon,
  Close as CloseIcon,
  Refresh as ResetIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  VerticalAlignTop as TopIcon,
  VerticalAlignCenter as CenterIcon,
  VerticalAlignBottom as BottomIcon,
} from '@mui/icons-material';
import type { ImageItem, TextOverlay, CropSettings, AspectRatio, TransitionType } from '../types';

interface ImageEditorProps {
  image: ImageItem | null;
  defaultDuration: number;
  defaultTransition: TransitionType;
  onSaveTextOverlay: (imageId: string, textOverlay: TextOverlay | undefined) => void;
  onSaveCrop: (imageId: string, cropSettings: CropSettings, croppedDataUrl: string) => void;
  onSaveTiming: (imageId: string, duration: number | undefined, transitionType: TransitionType | undefined) => void;
  onCopyTimingToAll: (duration: number, transitionType: TransitionType) => void;
}

type EditorMode = 'view' | 'crop' | 'text' | 'timing';

const DEFAULT_TEXT_OVERLAY: TextOverlay = {
  text: '',
  position: 'bottom',
  fontSize: 32,
  fontColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  fontWeight: 'bold',
  textAlign: 'center',
};

const DEFAULT_CROP: CropSettings = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  zoom: 1,
  aspectRatio: '9:16',
};

const ASPECT_RATIOS: { label: string; value: AspectRatio; ratio: number | null }[] = [
  { label: '9:16', value: '9:16', ratio: 9 / 16 },
  { label: '1:1', value: '1:1', ratio: 1 },
  { label: '4:5', value: '4:5', ratio: 4 / 5 },
  { label: '16:9', value: '16:9', ratio: 16 / 9 },
  { label: 'Free', value: 'free', ratio: null },
];

const TRANSITION_TYPES: { label: string; value: TransitionType }[] = [
  { label: 'Fade', value: 'fade' },
  { label: 'Slide', value: 'slide' },
  { label: 'Zoom', value: 'zoom' },
  { label: 'None', value: 'none' },
];

const BG_PRESETS = [
  { value: 'rgba(0, 0, 0, 0.6)', color: '#000000' },
  { value: 'rgba(255, 255, 255, 0.8)', color: '#ffffff' },
  { value: 'rgba(102, 126, 234, 0.8)', color: '#667eea' },
  { value: 'rgba(239, 68, 68, 0.8)', color: '#ef4444' },
  { value: 'rgba(72, 187, 120, 0.8)', color: '#48bb78' },
  { value: 'transparent', color: 'transparent' },
];

const getAspectRatioValue = (ar: AspectRatio): number | null => {
  const found = ASPECT_RATIOS.find(a => a.value === ar);
  return found?.ratio || null;
};

export const ImageEditor: React.FC<ImageEditorProps> = ({
  image,
  defaultDuration,
  defaultTransition,
  onSaveTextOverlay,
  onSaveCrop,
  onSaveTiming,
  onCopyTimingToAll,
}) => {
  const [mode, setMode] = useState<EditorMode>('view');
  const [textOverlay, setTextOverlay] = useState<TextOverlay>(DEFAULT_TEXT_OVERLAY);
  const [cropSettings, setCropSettings] = useState<CropSettings>(DEFAULT_CROP);
  const [timingDuration, setTimingDuration] = useState<number>(defaultDuration);
  const [timingTransition, setTimingTransition] = useState<TransitionType>(defaultTransition);
  
  // Crop editor state
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Reset state when image changes
  useEffect(() => {
    if (image) {
      setTextOverlay(image.textOverlay || DEFAULT_TEXT_OVERLAY);
      setCropSettings(image.cropSettings || DEFAULT_CROP);
      setTimingDuration(image.duration ?? defaultDuration);
      setTimingTransition(image.transitionType ?? defaultTransition);
      setMode('view');
      setImageLoaded(false);
    }
  }, [image?.id, defaultDuration, defaultTransition]);

  // Load the image for crop editor
  useEffect(() => {
    if (!image || mode !== 'crop') return;
    
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = image.dataUrl;
  }, [image?.dataUrl, mode]);

  // Update container size for crop editor
  useEffect(() => {
    if (mode !== 'crop') return;
    
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [mode]);

  // Draw the crop canvas
  useEffect(() => {
    if (mode !== 'crop' || !imageLoaded || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    
    const maxWidth = containerSize.width || 500;
    const maxHeight = 280;
    
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
    const displayWidth = img.width * scale;
    const displayHeight = img.height * scale;
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    const cropX = cropSettings.x * displayWidth;
    const cropY = cropSettings.y * displayHeight;
    const cropW = cropSettings.width * displayWidth;
    const cropH = cropSettings.height * displayHeight;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropX, cropY, cropW, cropH);
    ctx.clip();
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
    ctx.restore();
    
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);
    
    ctx.fillStyle = '#667eea';
    const handleSize = 8;
    const handles = [
      { x: cropX, y: cropY },
      { x: cropX + cropW, y: cropY },
      { x: cropX, y: cropY + cropH },
      { x: cropX + cropW, y: cropY + cropH },
    ];
    handles.forEach(h => {
      ctx.fillRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
    });
  }, [mode, imageLoaded, cropSettings, containerSize]);

  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / canvas.width,
      y: (e.clientY - rect.top) / canvas.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    const handleSize = 0.03;
    
    const corners = [
      { name: 'nw', x: cropSettings.x, y: cropSettings.y },
      { name: 'ne', x: cropSettings.x + cropSettings.width, y: cropSettings.y },
      { name: 'sw', x: cropSettings.x, y: cropSettings.y + cropSettings.height },
      { name: 'se', x: cropSettings.x + cropSettings.width, y: cropSettings.y + cropSettings.height },
    ];
    
    for (const corner of corners) {
      if (Math.abs(coords.x - corner.x) < handleSize && Math.abs(coords.y - corner.y) < handleSize) {
        setIsResizing(corner.name);
        setDragStart(coords);
        return;
      }
    }
    
    if (
      coords.x >= cropSettings.x && 
      coords.x <= cropSettings.x + cropSettings.width &&
      coords.y >= cropSettings.y && 
      coords.y <= cropSettings.y + cropSettings.height
    ) {
      setIsDragging(true);
      setDragStart(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    
    const coords = getCanvasCoords(e);
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;
    
    if (isDragging) {
      setCropSettings(prev => ({
        ...prev,
        x: Math.max(0, Math.min(1 - prev.width, prev.x + dx)),
        y: Math.max(0, Math.min(1 - prev.height, prev.y + dy)),
      }));
    } else if (isResizing) {
      setCropSettings(prev => {
        let { x, y, width, height } = prev;
        const aspectRatio = getAspectRatioValue(prev.aspectRatio);
        
        switch (isResizing) {
          case 'se':
            width = Math.max(0.1, Math.min(1 - x, prev.width + dx));
            height = aspectRatio ? width / aspectRatio : Math.max(0.1, Math.min(1 - y, prev.height + dy));
            break;
          case 'sw':
            const newWidthSW = Math.max(0.1, prev.width - dx);
            x = Math.max(0, prev.x + prev.width - newWidthSW);
            width = newWidthSW;
            height = aspectRatio ? width / aspectRatio : Math.max(0.1, Math.min(1 - y, prev.height + dy));
            break;
          case 'ne':
            width = Math.max(0.1, Math.min(1 - x, prev.width + dx));
            const newHeightNE = aspectRatio ? width / aspectRatio : Math.max(0.1, prev.height - dy);
            y = Math.max(0, prev.y + prev.height - newHeightNE);
            height = newHeightNE;
            break;
          case 'nw':
            const newWidthNW = Math.max(0.1, prev.width - dx);
            const newHeightNW = aspectRatio ? newWidthNW / aspectRatio : Math.max(0.1, prev.height - dy);
            x = Math.max(0, prev.x + prev.width - newWidthNW);
            y = Math.max(0, prev.y + prev.height - newHeightNW);
            width = newWidthNW;
            height = newHeightNW;
            break;
        }
        
        return { ...prev, x, y, width, height };
      });
    }
    
    setDragStart(coords);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  const handleAspectRatioChange = (ar: AspectRatio) => {
    const ratio = getAspectRatioValue(ar);
    
    if (ratio) {
      const centerX = cropSettings.x + cropSettings.width / 2;
      const centerY = cropSettings.y + cropSettings.height / 2;
      
      let newWidth = cropSettings.width;
      let newHeight = newWidth / ratio;
      
      if (newHeight > 1) {
        newHeight = 1;
        newWidth = newHeight * ratio;
      }
      
      let newX = centerX - newWidth / 2;
      let newY = centerY - newHeight / 2;
      
      newX = Math.max(0, Math.min(1 - newWidth, newX));
      newY = Math.max(0, Math.min(1 - newHeight, newY));
      
      setCropSettings({ ...cropSettings, aspectRatio: ar, x: newX, y: newY, width: newWidth, height: newHeight });
    } else {
      setCropSettings({ ...cropSettings, aspectRatio: ar });
    }
  };

  const handleResetCrop = () => {
    setCropSettings(DEFAULT_CROP);
  };

  const handleSaveCropClick = () => {
    if (!image || !imageRef.current) return;
    
    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const cropX = cropSettings.x * img.width;
    const cropY = cropSettings.y * img.height;
    const cropW = cropSettings.width * img.width;
    const cropH = cropSettings.height * img.height;
    
    canvas.width = cropW;
    canvas.height = cropH;
    
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onSaveCrop(image.id, cropSettings, croppedDataUrl);
    setMode('view');
  };

  const handleTextChange = <K extends keyof TextOverlay>(field: K, value: TextOverlay[K]) => {
    setTextOverlay(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveText = () => {
    if (!image || !textOverlay.text.trim()) return;
    onSaveTextOverlay(image.id, textOverlay);
    setMode('view');
  };

  const handleRemoveText = () => {
    if (!image) return;
    onSaveTextOverlay(image.id, undefined);
    setTextOverlay(DEFAULT_TEXT_OVERLAY);
    setMode('view');
  };

  const handleSaveTiming = () => {
    if (!image) return;
    const duration = timingDuration !== defaultDuration ? timingDuration : undefined;
    const transition = timingTransition !== defaultTransition ? timingTransition : undefined;
    onSaveTiming(image.id, duration, transition);
    setMode('view');
  };

  const handleResetTiming = () => {
    setTimingDuration(defaultDuration);
    setTimingTransition(defaultTransition);
  };

  const handleCopyToAll = () => {
    onCopyTimingToAll(timingDuration, timingTransition);
    setMode('view');
  };

  const hasCustomTiming = image?.duration !== undefined || image?.transitionType !== undefined;

  const getTextPositionStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      padding: '12px 16px',
      fontSize: `${Math.max(12, textOverlay.fontSize * 0.4)}px`,
      color: textOverlay.fontColor,
      backgroundColor: textOverlay.backgroundColor,
      fontWeight: textOverlay.fontWeight,
      textAlign: textOverlay.textAlign,
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
    };

    switch (textOverlay.position) {
      case 'top': return { ...base, top: 0 };
      case 'center': return { ...base, top: '50%', transform: 'translateY(-50%)' };
      case 'bottom': return { ...base, bottom: 0 };
      default: return { ...base, bottom: 0 };
    }
  };

  if (!image) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h2" sx={{ mb: 2 }}>👆</Typography>
          <Typography color="text.secondary">Select an image from the sidebar to edit</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
          {image.name}
        </Typography>
        <Stack direction="row" spacing={1}>
          {mode === 'view' ? (
            <>
              <Button
                size="small"
                variant={image.cropSettings ? 'contained' : 'outlined'}
                startIcon={<CropIcon />}
                onClick={() => setMode('crop')}
              >
                Crop
              </Button>
              <Button
                size="small"
                variant={image.textOverlay ? 'contained' : 'outlined'}
                startIcon={<TextIcon />}
                onClick={() => setMode('text')}
              >
                Text
              </Button>
              <Button
                size="small"
                variant={hasCustomTiming ? 'contained' : 'outlined'}
                color={hasCustomTiming ? 'warning' : 'primary'}
                startIcon={<TimerIcon />}
                onClick={() => setMode('timing')}
              >
                Timing
              </Button>
            </>
          ) : (
            <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />} onClick={() => setMode('view')}>
              Cancel
            </Button>
          )}
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* View Mode */}
        {mode === 'view' && (
          <Box>
            <Box sx={{ position: 'relative', bgcolor: 'black', borderRadius: 2, overflow: 'hidden', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box component="img" src={image.croppedDataUrl || image.dataUrl} alt={image.name} sx={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }} />
              {image.textOverlay && (
                <Box sx={getTextPositionStyle()}>{image.textOverlay.text}</Box>
              )}
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              {image.cropSettings && (
                <Chip icon={<CropIcon />} label={`Cropped (${image.cropSettings.aspectRatio})`} color="success" size="small" />
              )}
              {image.textOverlay && (
                <Chip icon={<TextIcon />} label={`"${image.textOverlay.text.substring(0, 15)}${image.textOverlay.text.length > 15 ? '...' : ''}"`} color="primary" size="small" />
              )}
              {hasCustomTiming && (
                <Chip icon={<TimerIcon />} label={`${((image.duration ?? defaultDuration) / 1000).toFixed(1)}s · ${image.transitionType ?? defaultTransition}`} color="warning" size="small" />
              )}
            </Stack>
          </Box>
        )}

        {/* Crop Mode */}
        {mode === 'crop' && (
          <Stack spacing={2}>
            <Paper ref={containerRef} sx={{ bgcolor: 'grey.100', borderRadius: 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280, p: 1 }}>
              {!imageLoaded ? (
                <CircularProgress />
              ) : (
                <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} style={{ cursor: 'crosshair', display: 'block', maxWidth: '100%' }} />
              )}
            </Paper>
            
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">Aspect Ratio</Typography>
              <ToggleButtonGroup value={cropSettings.aspectRatio} exclusive onChange={(_, v) => v && handleAspectRatioChange(v)} size="small" sx={{ mb: 2 }}>
                {ASPECT_RATIOS.map(ar => (
                  <ToggleButton key={ar.value} value={ar.value}>{ar.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>
              
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Chip label={`X: ${Math.round(cropSettings.x * 100)}%`} size="small" variant="outlined" />
                <Chip label={`Y: ${Math.round(cropSettings.y * 100)}%`} size="small" variant="outlined" />
                <Chip label={`W: ${Math.round(cropSettings.width * 100)}%`} size="small" variant="outlined" />
                <Chip label={`H: ${Math.round(cropSettings.height * 100)}%`} size="small" variant="outlined" />
              </Stack>
              
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button startIcon={<ResetIcon />} onClick={handleResetCrop}>Reset</Button>
                <Button variant="contained" color="success" startIcon={<CropIcon />} onClick={handleSaveCropClick}>Apply Crop</Button>
              </Stack>
            </Paper>
          </Stack>
        )}

        {/* Text Mode */}
        {mode === 'text' && (
          <Stack spacing={2}>
            <Box sx={{ position: 'relative', bgcolor: 'black', borderRadius: 2, overflow: 'hidden', minHeight: 200 }}>
              <Box component="img" src={image.croppedDataUrl || image.dataUrl} alt={image.name} sx={{ width: '100%', maxHeight: 250, objectFit: 'contain' }} />
              {textOverlay.text && (
                <Box sx={getTextPositionStyle()}>{textOverlay.text}</Box>
              )}
            </Box>
            
            <Paper sx={{ p: 2 }}>
              <TextField fullWidth multiline rows={2} label="Text Content" value={textOverlay.text} onChange={(e) => handleTextChange('text', e.target.value)} placeholder="Enter your text here..." sx={{ mb: 2 }} />
              
              <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography variant="caption" color="text.secondary">Position</Typography>
                  <ToggleButtonGroup value={textOverlay.position} exclusive onChange={(_, v) => v && handleTextChange('position', v)} size="small">
                    <ToggleButton value="top"><TopIcon /></ToggleButton>
                    <ToggleButton value="center"><CenterIcon /></ToggleButton>
                    <ToggleButton value="bottom"><BottomIcon /></ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">Align</Typography>
                  <ToggleButtonGroup value={textOverlay.textAlign} exclusive onChange={(_, v) => v && handleTextChange('textAlign', v)} size="small">
                    <ToggleButton value="left"><AlignLeftIcon /></ToggleButton>
                    <ToggleButton value="center"><AlignCenterIcon /></ToggleButton>
                    <ToggleButton value="right"><AlignRightIcon /></ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                <Box sx={{ minWidth: 100 }}>
                  <Typography variant="caption" color="text.secondary">Size: {textOverlay.fontSize}px</Typography>
                  <Slider value={textOverlay.fontSize} onChange={(_, v) => handleTextChange('fontSize', v as number)} min={16} max={72} size="small" />
                </Box>
              </Stack>
              
              <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Color</Typography>
                  <input type="color" value={textOverlay.fontColor} onChange={(e) => handleTextChange('fontColor', e.target.value)} style={{ width: 40, height: 32, border: 'none', cursor: 'pointer' }} />
                </Box>
                
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Weight</InputLabel>
                  <Select value={textOverlay.fontWeight} label="Weight" onChange={(e) => handleTextChange('fontWeight', e.target.value as 'normal' | 'bold')}>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="bold">Bold</MenuItem>
                  </Select>
                </FormControl>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">Background</Typography>
                  <Stack direction="row" spacing={0.5}>
                    {BG_PRESETS.map((bg) => (
                      <IconButton key={bg.value} size="small" onClick={() => handleTextChange('backgroundColor', bg.value)} sx={{ width: 28, height: 28, bgcolor: bg.color, border: textOverlay.backgroundColor === bg.value ? 2 : 1, borderColor: textOverlay.backgroundColor === bg.value ? 'primary.main' : 'divider', '&:hover': { bgcolor: bg.color } }}>
                        {bg.value === 'transparent' && <Typography variant="caption">∅</Typography>}
                      </IconButton>
                    ))}
                  </Stack>
                </Box>
              </Stack>
              
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {image.textOverlay && (
                  <Button color="error" startIcon={<DeleteIcon />} onClick={handleRemoveText}>Remove</Button>
                )}
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveText}>Save Text</Button>
              </Stack>
            </Paper>
          </Stack>
        )}

        {/* Timing Mode */}
        {mode === 'timing' && (
          <Stack spacing={2}>
            <Box sx={{ position: 'relative', bgcolor: 'black', borderRadius: 2, overflow: 'hidden', minHeight: 200 }}>
              <Box component="img" src={image.croppedDataUrl || image.dataUrl} alt={image.name} sx={{ width: '100%', maxHeight: 250, objectFit: 'contain' }} />
              <Stack sx={{ position: 'absolute', top: 12, right: 12, alignItems: 'flex-end' }} spacing={0.5}>
                <Chip label={`${(timingDuration / 1000).toFixed(1)}s`} color="primary" />
                <Chip label={timingTransition} size="small" variant="outlined" sx={{ bgcolor: 'rgba(0,0,0,0.7)' }} />
              </Stack>
            </Box>
            
            <Paper sx={{ p: 2 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary">Duration: {(timingDuration / 1000).toFixed(1)} seconds</Typography>
                <Slider value={timingDuration} onChange={(_, v) => setTimingDuration(v as number)} min={500} max={10000} step={100} />
                <Stack direction="row" spacing={1}>
                  {[1000, 2000, 3000, 5000].map((d) => (
                    <Button key={d} size="small" variant={timingDuration === d ? 'contained' : 'outlined'} onClick={() => setTimingDuration(d)}>{d / 1000}s</Button>
                  ))}
                </Stack>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">Transition Type</Typography>
                <ToggleButtonGroup value={timingTransition} exclusive onChange={(_, v) => v && setTimingTransition(v)} size="small">
                  {TRANSITION_TYPES.map((t) => (
                    <ToggleButton key={t.value} value={t.value}>{t.label}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
              
              <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                <Button startIcon={<ResetIcon />} onClick={handleResetTiming}>Reset</Button>
                <Button color="warning" startIcon={<CopyIcon />} onClick={handleCopyToAll}>Copy to All</Button>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveTiming}>Save Timing</Button>
              </Stack>
            </Paper>
          </Stack>
        )}
      </Box>
    </Box>
  );
};
