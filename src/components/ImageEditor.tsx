import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  ContentCut as CropIcon,
  TextFields as TextIcon,
  Timer as TimerIcon,
  Delete as DeleteIcon,
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
}

const TRANSITION_TYPES: { label: string; value: TransitionType }[] = [
  { label: 'Slide', value: 'slide' },
  { label: 'Fade', value: 'fade' },
  { label: 'Zoom', value: 'zoom' },
  { label: 'None', value: 'none' },
];

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
}) => {
  const [textOverlay, setTextOverlay] = useState<TextOverlay>(DEFAULT_TEXT_OVERLAY);
  const [cropSettings, setCropSettings] = useState<CropSettings>(DEFAULT_CROP);
  const [timingDuration, setTimingDuration] = useState<number>(defaultDuration);
  const [transitionType, setTransitionType] = useState<TransitionType>(defaultTransition);
  const [isCropping, setIsCropping] = useState(false);
  
  // Crop editor state
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  // Handle image change - load new image state
  useEffect(() => {
    if (image) {
      setTextOverlay(image.textOverlay || DEFAULT_TEXT_OVERLAY);
      setCropSettings(image.cropSettings || DEFAULT_CROP);
      setTimingDuration(image.duration ?? defaultDuration);
      setTransitionType(image.transitionType ?? defaultTransition);
      setImageLoaded(false);
      setIsCropping(false);
    }
  }, [image?.id, defaultDuration, defaultTransition]);

  // Load the image
  useEffect(() => {
    if (!image) return;
    
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = image.dataUrl;
  }, [image?.dataUrl]);

  // Update preview size
  useEffect(() => {
    const updateSize = () => {
      if (previewContainerRef.current) {
        const rect = previewContainerRef.current.getBoundingClientRect();
        setPreviewSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Draw the crop canvas when cropping
  useEffect(() => {
    if (!isCropping || !imageLoaded || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    
    const maxWidth = previewSize.width || 400;
    const maxHeight = previewSize.height || 400;
    
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    const displayWidth = img.width * scale;
    const displayHeight = img.height * scale;
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // Draw full image with overlay
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    // Draw crop area
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
    
    // Draw crop border
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);
    
    // Draw corner handles
    ctx.fillStyle = '#667eea';
    const handleSize = 10;
    const handles = [
      { x: cropX, y: cropY },
      { x: cropX + cropW, y: cropY },
      { x: cropX, y: cropY + cropH },
      { x: cropX + cropW, y: cropY + cropH },
    ];
    handles.forEach(h => {
      ctx.fillRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
    });
  }, [isCropping, imageLoaded, cropSettings, previewSize]);

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
    if (!isCropping) return;
    
    const coords = getCanvasCoords(e);
    const handleSize = 0.04;
    
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
    setIsCropping(true);
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

  const cancelCrop = () => {
    setCropSettings(image?.cropSettings || DEFAULT_CROP);
    setIsCropping(false);
  };

  const applyCrop = useCallback(() => {
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
    
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onSaveCrop(image.id, cropSettings, croppedDataUrl);
    setIsCropping(false);
  }, [image, cropSettings, onSaveCrop]);

  const handleTextChange = <K extends keyof TextOverlay>(field: K, value: TextOverlay[K]) => {
    const newOverlay = { ...textOverlay, [field]: value };
    setTextOverlay(newOverlay);
  };

  // Use refs for callbacks to avoid effect dependency issues
  const onSaveTextOverlayRef = useRef(onSaveTextOverlay);
  const onSaveTimingRef = useRef(onSaveTiming);
  useEffect(() => {
    onSaveTextOverlayRef.current = onSaveTextOverlay;
    onSaveTimingRef.current = onSaveTiming;
  });

  // Track if user has modified text (to avoid saving on initial load)
  const hasUserModifiedText = useRef(false);
  const lastSavedTextRef = useRef<string>('');

  // Reset modification tracking when image changes
  useEffect(() => {
    hasUserModifiedText.current = false;
    lastSavedTextRef.current = image?.textOverlay?.text || '';
  }, [image?.id]);

  // Save text when it changes (debounced) - only if user modified it
  useEffect(() => {
    if (!image?.id) return;
    
    // Check if text actually changed from last saved value
    const currentText = textOverlay.text;
    if (currentText === lastSavedTextRef.current && !hasUserModifiedText.current) {
      return;
    }
    
    const imageId = image.id;
    const overlayToSave = { ...textOverlay };
    
    const timer = setTimeout(() => {
      if (overlayToSave.text.trim()) {
        onSaveTextOverlayRef.current(imageId, overlayToSave);
        lastSavedTextRef.current = overlayToSave.text;
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [image?.id, textOverlay]);

  // Mark text as modified when user types
  const handleTextChangeWithTracking = <K extends keyof TextOverlay>(field: K, value: TextOverlay[K]) => {
    hasUserModifiedText.current = true;
    handleTextChange(field, value);
  };

  const handleRemoveText = () => {
    if (!image) return;
    onSaveTextOverlayRef.current(image.id, undefined);
    setTextOverlay(DEFAULT_TEXT_OVERLAY);
    lastSavedTextRef.current = '';
    hasUserModifiedText.current = false;
  };

  // Save timing when duration or transition changes (debounced)
  const lastSavedTimingRef = useRef({ duration: defaultDuration, transitionType: defaultTransition });
  
  useEffect(() => {
    lastSavedTimingRef.current = { 
      duration: image?.duration ?? defaultDuration, 
      transitionType: image?.transitionType ?? defaultTransition 
    };
  }, [image?.id]);

  useEffect(() => {
    if (!image?.id) return;
    
    // Check if timing actually changed
    if (timingDuration === lastSavedTimingRef.current.duration && 
        transitionType === lastSavedTimingRef.current.transitionType) {
      return;
    }
    
    const imageId = image.id;
    
    const timer = setTimeout(() => {
      const duration = timingDuration !== defaultDuration ? timingDuration : undefined;
      const transition = transitionType !== defaultTransition ? transitionType : undefined;
      onSaveTimingRef.current(imageId, duration, transition);
      lastSavedTimingRef.current = { duration: timingDuration, transitionType };
    }, 300);
    
    return () => clearTimeout(timer);
  }, [image?.id, timingDuration, transitionType, defaultDuration, defaultTransition]);

  const getTextPositionStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'max-content',
      maxWidth: '90%',
      padding: '6px 12px',
      fontSize: `${Math.max(10, textOverlay.fontSize * 0.3)}px`,
      color: textOverlay.fontColor,
      backgroundColor: textOverlay.backgroundColor,
      fontWeight: textOverlay.fontWeight,
      textAlign: textOverlay.textAlign,
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      pointerEvents: 'none',
      borderRadius: '4px',
    };

    switch (textOverlay.position) {
      case 'top': return { ...base, top: '5%' };
      case 'center': return { ...base, top: '50%', transform: 'translate(-50%, -50%)' };
      case 'bottom': return { ...base, bottom: '5%', transform: 'translateX(-50%)' };
      default: return { ...base, bottom: '5%', transform: 'translateX(-50%)' };
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
    <Box sx={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Left: Image Preview */}
      <Box 
        ref={previewContainerRef}
        sx={{ 
          flex: 1, 
          bgcolor: '#111', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          minWidth: 0,
          minHeight: 0,
          p: 1,
        }}
      >
        {!imageLoaded ? (
          <CircularProgress />
        ) : isCropping ? (
          // Show crop canvas
          <canvas 
            ref={canvasRef} 
            onMouseDown={handleMouseDown} 
            onMouseMove={handleMouseMove} 
            onMouseUp={handleMouseUp} 
            onMouseLeave={handleMouseUp} 
            style={{ 
              cursor: isDragging ? 'move' : isResizing ? 'nwse-resize' : 'crosshair', 
              display: 'block', 
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }} 
          />
        ) : (
          // Show normal preview with text overlay
          <Box sx={{ 
            position: 'relative', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}>
            <Box 
              component="img" 
              src={image.croppedDataUrl || image.dataUrl} 
              alt={image.name} 
              sx={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain',
                display: 'block',
              }} 
            />
            {textOverlay.text && (
              <Box sx={getTextPositionStyle()}>{textOverlay.text}</Box>
            )}
          </Box>
        )}
      </Box>

      {/* Right: Controls Panel */}
      <Box 
        sx={{ 
          width: 260, 
          borderLeft: 1, 
          borderColor: 'divider', 
          overflow: 'auto',
          bgcolor: 'background.paper',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Image name */}
        <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Typography variant="caption" fontWeight={600} noWrap>
            {image.name}
          </Typography>
        </Box>

        {/* Duration & Transition Section */}
        <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
            <TimerIcon sx={{ fontSize: 14 }} color="primary" />
            <Typography variant="caption" fontWeight={500}>Duration</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {(timingDuration / 1000).toFixed(1)}s
            </Typography>
          </Stack>
          <Slider 
            value={timingDuration} 
            onChange={(_, v) => setTimingDuration(v as number)} 
            min={500} 
            max={10000} 
            step={100}
            size="small"
            sx={{ mb: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Transition</Typography>
          <ToggleButtonGroup 
            value={transitionType} 
            exclusive 
            onChange={(_, v) => v && setTransitionType(v)} 
            size="small"
            fullWidth
          >
            {TRANSITION_TYPES.map(t => (
              <ToggleButton key={t.value} value={t.value} sx={{ flex: 1, px: 0.5, py: 0.5, fontSize: 10 }}>
                {t.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Crop Section */}
        <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
            <CropIcon sx={{ fontSize: 14 }} color={isCropping ? 'success' : 'primary'} />
            <Typography variant="caption" fontWeight={500}>Crop</Typography>
            {image.cropSettings && !isCropping && (
              <Typography variant="caption" color="success.main" sx={{ ml: 'auto' }}>
                {image.cropSettings.aspectRatio}
              </Typography>
            )}
          </Stack>
          
          <ToggleButtonGroup 
            value={isCropping ? cropSettings.aspectRatio : (image.cropSettings?.aspectRatio || null)}
            exclusive 
            onChange={(_, v) => v && handleAspectRatioChange(v)} 
            size="small"
            fullWidth
          >
            {ASPECT_RATIOS.slice(0, 4).map(ar => (
              <ToggleButton key={ar.value} value={ar.value} sx={{ flex: 1, px: 0.5, py: 0.5, fontSize: 11 }}>
                {ar.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          
          {isCropping && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="outlined" onClick={cancelCrop} fullWidth sx={{ py: 0.5 }}>
                Cancel
              </Button>
              <Button size="small" variant="contained" color="success" onClick={applyCrop} fullWidth sx={{ py: 0.5 }}>
                Apply
              </Button>
            </Stack>
          )}
        </Box>

        {/* Text Section */}
        <Box sx={{ px: 1.5, py: 1, flex: 1, overflow: 'auto' }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
            <TextIcon sx={{ fontSize: 14 }} color={textOverlay.text ? 'primary' : 'action'} />
            <Typography variant="caption" fontWeight={500}>Text Overlay</Typography>
          </Stack>
          
          <TextField 
            fullWidth 
            multiline 
            rows={2} 
            size="small"
            value={textOverlay.text} 
            onChange={(e) => handleTextChangeWithTracking('text', e.target.value)} 
            placeholder="Enter text..." 
            sx={{ mb: 1, '& .MuiInputBase-input': { fontSize: 12 } }} 
          />
          
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Position</Typography>
              <ToggleButtonGroup 
                value={textOverlay.position} 
                exclusive 
                onChange={(_, v) => v && handleTextChangeWithTracking('position', v)} 
                size="small"
              >
                <ToggleButton value="top" sx={{ p: 0.5 }}><TopIcon sx={{ fontSize: 14 }} /></ToggleButton>
                <ToggleButton value="center" sx={{ p: 0.5 }}><CenterIcon sx={{ fontSize: 14 }} /></ToggleButton>
                <ToggleButton value="bottom" sx={{ p: 0.5 }}><BottomIcon sx={{ fontSize: 14 }} /></ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Align</Typography>
              <ToggleButtonGroup 
                value={textOverlay.textAlign} 
                exclusive 
                onChange={(_, v) => v && handleTextChangeWithTracking('textAlign', v)} 
                size="small"
              >
                <ToggleButton value="left" sx={{ p: 0.5 }}><AlignLeftIcon sx={{ fontSize: 14 }} /></ToggleButton>
                <ToggleButton value="center" sx={{ p: 0.5 }}><AlignCenterIcon sx={{ fontSize: 14 }} /></ToggleButton>
                <ToggleButton value="right" sx={{ p: 0.5 }}><AlignRightIcon sx={{ fontSize: 14 }} /></ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
          
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Size: {textOverlay.fontSize}</Typography>
              <Slider 
                value={textOverlay.fontSize} 
                onChange={(_, v) => handleTextChangeWithTracking('fontSize', v as number)} 
                min={16} 
                max={72} 
                size="small"
              />
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Color</Typography>
              <input 
                type="color" 
                value={textOverlay.fontColor} 
                onChange={(e) => handleTextChangeWithTracking('fontColor', e.target.value)} 
                style={{ width: 24, height: 24, border: 'none', cursor: 'pointer', borderRadius: 4, display: 'block' }} 
              />
            </Box>
            
            <FormControl size="small" sx={{ minWidth: 60 }}>
              <InputLabel sx={{ fontSize: 10 }}>Wt</InputLabel>
              <Select 
                value={textOverlay.fontWeight} 
                label="Wt" 
                onChange={(e) => handleTextChangeWithTracking('fontWeight', e.target.value as 'normal' | 'bold')}
                sx={{ fontSize: 11 }}
              >
                <MenuItem value="normal">N</MenuItem>
                <MenuItem value="bold">B</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10, mb: 0.5 }}>
              Background
            </Typography>
            <Stack direction="row" spacing={0.25}>
              {BG_PRESETS.map((bg) => (
                <IconButton 
                  key={bg.value} 
                  size="small" 
                  onClick={() => handleTextChangeWithTracking('backgroundColor', bg.value)} 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: bg.color, 
                    border: textOverlay.backgroundColor === bg.value ? 2 : 1, 
                    borderColor: textOverlay.backgroundColor === bg.value ? 'primary.main' : 'divider', 
                    '&:hover': { bgcolor: bg.color } 
                  }}
                >
                  {bg.value === 'transparent' && <Typography sx={{ fontSize: 8 }}>∅</Typography>}
                </IconButton>
              ))}
            </Stack>
          </Box>
          
          {image.textOverlay && (
            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={handleRemoveText} fullWidth sx={{ py: 0.5 }}>
              Remove
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};
