import React from 'react';
import type { ImageItem } from '../types';
import './ImageSidebar.css';

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
    <div className="image-sidebar">
      <div className="sidebar-header">
        <h3>🖼️ Images ({images.length})</h3>
        <p className="sidebar-hint">Drag to reorder</p>
      </div>
      
      <div className="sidebar-list">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={`sidebar-item ${selectedImageId === image.id ? 'selected' : ''} ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
            draggable
            onClick={() => onSelectImage(image)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <span className="sidebar-number">{index + 1}</span>
            <div className="sidebar-image-wrapper">
              <img src={image.croppedDataUrl || image.dataUrl} alt={image.name} />
              {image.cropSettings && (
                <span className="sidebar-crop-badge" title="Cropped">✂</span>
              )}
              {image.textOverlay && (
                <span className="sidebar-text-badge" title={image.textOverlay.text}>T</span>
              )}
            </div>
            <div className="sidebar-info">
              <span className="sidebar-name">{image.name}</span>
              {image.textOverlay && (
                <span className="sidebar-text-preview">{image.textOverlay.text}</span>
              )}
            </div>
            <div className="sidebar-actions">
              <button
                className="sidebar-move-btn"
                onClick={(e) => { e.stopPropagation(); moveImage(index, 'up'); }}
                disabled={index === 0}
                title="Move up"
              >
                ↑
              </button>
              <button
                className="sidebar-move-btn"
                onClick={(e) => { e.stopPropagation(); moveImage(index, 'down'); }}
                disabled={index === images.length - 1}
                title="Move down"
              >
                ↓
              </button>
              <button
                className="sidebar-remove-btn"
                onClick={(e) => { e.stopPropagation(); onRemove(image.id); }}
                title="Remove"
              >
                ✕
              </button>
            </div>
            <span className="sidebar-drag-icon">⋮⋮</span>
          </div>
        ))}
      </div>
    </div>
  );
};
