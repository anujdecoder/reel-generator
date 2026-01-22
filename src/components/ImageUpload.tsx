import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  alpha,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import type { ImageItem } from '../types';
import { generateId, compressImage, formatFileSize, getDataUrlSize } from '../utils/helpers';

interface ImageUploadProps {
  onImagesAdded: (images: ImageItem[]) => void;
  variant?: 'dropzone' | 'button';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImagesAdded,
  variant = 'button',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      setIsProcessing(false);
      return;
    }

    try {
      const newImages: ImageItem[] = [];
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        setProcessingStatus(`Compressing ${i + 1}/${imageFiles.length}: ${file.name}`);
        
        try {
          // Compress image to reduce storage size
          const compressedDataUrl = await compressImage(file, 1920, 1920, 0.85);
          
          const originalSize = file.size;
          const compressedSize = getDataUrlSize(compressedDataUrl);
          
          console.log(
            `Compressed ${file.name}: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} ` +
            `(${Math.round((1 - compressedSize / originalSize) * 100)}% reduction)`
          );

          newImages.push({
            id: generateId(),
            name: file.name,
            dataUrl: compressedDataUrl,
            createdAt: Date.now() + i, // Ensure unique timestamps for ordering
          });
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
        }
      }

      if (newImages.length > 0) {
        onImagesAdded(newImages);
      }
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple
      onChange={handleFileChange}
      style={{ display: 'none' }}
    />
  );

  // Button variant for action bar
  if (variant === 'button') {
    return (
      <>
        {hiddenInput}
        <Button
          variant="outlined"
          startIcon={isProcessing ? <CircularProgress size={16} /> : <CloudUploadIcon />}
          onClick={handleClick}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Upload Images'}
        </Button>
      </>
    );
  }

  // Dropzone variant for initial upload screen
  return (
    <Box
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        border: 2,
        borderStyle: 'dashed',
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderRadius: 2,
        p: 4,
        textAlign: 'center',
        cursor: isProcessing ? 'wait' : 'pointer',
        bgcolor: isDragging 
          ? (theme) => alpha(theme.palette.primary.main, 0.1)
          : 'transparent',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
        },
      }}
    >
      {hiddenInput}
      
      <Typography variant="h2" sx={{ mb: 2 }}>
        {isProcessing ? '⏳' : '📁'}
      </Typography>
      
      {isProcessing ? (
        <>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Processing images...
          </Typography>
          {processingStatus && (
            <Typography variant="body2" color="text.secondary">
              {processingStatus}
            </Typography>
          )}
        </>
      ) : (
        <>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Click to upload
            </Box>{' '}
            or drag and drop
          </Typography>
          <Typography variant="body2" color="text.secondary">
            PNG, JPG, GIF, WebP (multiple allowed)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Images are automatically compressed for optimal storage
          </Typography>
        </>
      )}
    </Box>
  );
};
