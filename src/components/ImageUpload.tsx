import React, { useRef, useState } from 'react';
import type { ImageItem } from '../types';
import { generateId, fileToDataUrl } from '../utils/helpers';
import './ImageUpload.css';

interface ImageUploadProps {
  onImagesAdded: (images: ImageItem[]) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImagesAdded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    try {
      const newImages: ImageItem[] = await Promise.all(
        imageFiles.map(async (file) => {
          const dataUrl = await fileToDataUrl(file);
          return {
            id: generateId(),
            name: file.name,
            dataUrl,
            createdAt: Date.now(),
          };
        })
      );

      if (newImages.length > 0) {
        onImagesAdded(newImages);
      }
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
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
        <div className="upload-icon">📁</div>
        {isProcessing ? (
          <p>Processing images...</p>
        ) : (
          <>
            <p className="upload-text">
              <span className="upload-highlight">Click to upload</span> or drag and drop
            </p>
            <p className="upload-hint">PNG, JPG, GIF, WebP (multiple allowed)</p>
          </>
        )}
      </div>
    </div>
  );
};
