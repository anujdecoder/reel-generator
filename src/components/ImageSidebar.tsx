import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Stack,
  alpha,
} from '@mui/material';
import {
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Close as CloseIcon,
  DragIndicator as DragIcon,
  ContentCut as CropIcon,
  TextFields as TextIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import type { ImageItem } from '../types';

interface ImageSidebarProps {
  images: ImageItem[];
  selectedImageId: string | null;
  onSelectImage: (image: ImageItem) => void;
  onReorder: (images: ImageItem[]) => void;
  onRemove: (id: string) => void;
}

export const ImageSidebar: React.FC<ImageSidebarProps> = ({
  images,
  selectedImageId,
  onSelectImage,
  onReorder,
  onRemove,
}) => {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      return;
    }
    
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    
    onReorder(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === images.length - 1)
    ) {
      return;
    }

    const newImages = [...images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    onReorder(newImages);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" fontWeight={600}>
            🖼️ Images ({images.length})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Drag to reorder
          </Typography>
        </Stack>
      </Box>
      
      {/* List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 0.5, minHeight: 0 }}>
        <Stack spacing={0.5}>
          {images.map((image, index) => {
            const isSelected = selectedImageId === image.id;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            
            return (
              <Box
                key={image.id}
                draggable
                onClick={() => onSelectImage(image)}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  p: 0.5,
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: isSelected 
                    ? (theme) => alpha(theme.palette.primary.main, 0.15)
                    : 'transparent',
                  border: 2,
                  borderColor: isSelected 
                    ? 'primary.main' 
                    : isDragOver 
                    ? 'primary.light' 
                    : 'transparent',
                  opacity: isDragging ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                {/* Index Number */}
                <Typography
                  variant="caption"
                  sx={{
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: 'action.hover',
                    flexShrink: 0,
                    fontSize: 10,
                  }}
                >
                  {index + 1}
                </Typography>
                
                {/* Thumbnail */}
                <Box
                  sx={{
                    position: 'relative',
                    width: 40,
                    height: 40,
                    borderRadius: 0.5,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <Box
                    component="img"
                    src={image.croppedDataUrl || image.dataUrl}
                    alt={image.name}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  {/* Badges */}
                  <Stack
                    direction="row"
                    spacing={0.25}
                    sx={{
                      position: 'absolute',
                      bottom: 1,
                      right: 1,
                    }}
                  >
                    {image.cropSettings && (
                      <CropIcon sx={{ fontSize: 10, color: 'success.main' }} />
                    )}
                    {image.textOverlay && (
                      <TextIcon sx={{ fontSize: 10, color: 'primary.main' }} />
                    )}
                    {image.duration && (
                      <TimerIcon sx={{ fontSize: 10, color: 'warning.main' }} />
                    )}
                  </Stack>
                </Box>
                
                {/* Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      fontSize: 11,
                    }}
                  >
                    {image.name}
                  </Typography>
                </Box>
                
                {/* Actions */}
                <Stack direction="row" spacing={0}>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); moveImage(index, 'up'); }}
                    disabled={index === 0}
                    sx={{ p: 0.25 }}
                  >
                    <ArrowUpIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); moveImage(index, 'down'); }}
                    disabled={index === images.length - 1}
                    sx={{ p: 0.25 }}
                  >
                    <ArrowDownIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onRemove(image.id); }}
                    color="error"
                    sx={{ p: 0.25 }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
                
                {/* Drag Handle */}
                <DragIcon sx={{ color: 'text.disabled', cursor: 'grab', fontSize: 16 }} />
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
};
