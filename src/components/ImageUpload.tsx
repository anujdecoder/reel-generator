import React, { useRef, useState } from 'react';
import type { ImageItem } from '../types';
import { generateId, compressImage, formatFileSize, getDataUrlSize } from '../utils/helpers';
import './ImageUpload.css';

interface ImageUploadProps {
  onImagesAdded: (images: ImageItem[]) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImagesAdded }) => {
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

  return (
    <div
      className={`image-upload ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="file-input"
      />
      <div className="upload-content">
        <div className="upload-icon">{isProcessing ? '⏳' : '📁'}</div>
        {isProcessing ? (
          <>
            <p>Processing images...</p>
            {processingStatus && (
              <p className="upload-status">{processingStatus}</p>
            )}
          </>
        ) : (
          <>
            <p className="upload-text">
              <span className="upload-highlight">Click to upload</span> or drag and drop
            </p>
            <p className="upload-hint">PNG, JPG, GIF, WebP (multiple allowed)</p>
            <p className="upload-hint">Images are automatically compressed for optimal storage</p>
          </>
        )}
      </div>
    </div>
  );
};
