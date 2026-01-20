import React from 'react';
import type { ImageItem } from '../types';
import './ImageList.css';

interface ImageListProps {
  images: ImageItem[];
  onRemove: (id: string) => void;
  onReorder: (images: ImageItem[]) => void;
  onEditText: (image: ImageItem) => void;
}

export const ImageList: React.FC<ImageListProps> = ({ images, onRemove, onReorder, onEditText }) => {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay to allow the drag image to show
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('dragging');
    }, 0);
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
    <div className="image-list">
      <div className="image-grid">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={`image-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${image.textOverlay ? 'has-text' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className="image-number">{index + 1}</div>
            <img src={image.dataUrl} alt={image.name} className="image-thumbnail" />
            
            {/* Text indicator */}
            {image.textOverlay && (
              <div className="text-indicator" title={image.textOverlay.text}>
                T
              </div>
            )}
            
            <div className="drag-handle">
              <span>⋮⋮</span>
            </div>
            
            {/* Add Text Button - always visible on hover */}
            <button
              className="add-text-btn"
              onClick={(e) => { e.stopPropagation(); onEditText(image); }}
              title={image.textOverlay ? 'Edit text' : 'Add text'}
            >
              {image.textOverlay ? '✏️' : '📝'}
            </button>
            
            <div className="image-overlay">
              <span className="image-name" title={image.name}>
                {image.name}
              </span>
              <div className="image-actions">
                <button
                  className="action-btn text-btn"
                  onClick={(e) => { e.stopPropagation(); onEditText(image); }}
                  title={image.textOverlay ? 'Edit text' : 'Add text'}
                >
                  T
                </button>
                <button
                  className="action-btn"
                  onClick={(e) => { e.stopPropagation(); moveImage(index, 'up'); }}
                  disabled={index === 0}
                  title="Move left"
                >
                  ←
                </button>
                <button
                  className="action-btn"
                  onClick={(e) => { e.stopPropagation(); moveImage(index, 'down'); }}
                  disabled={index === images.length - 1}
                  title="Move right"
                >
                  →
                </button>
                <button
                  className="action-btn delete"
                  onClick={(e) => { e.stopPropagation(); onRemove(image.id); }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="drag-hint">💡 Drag to reorder • Click 📝 to add text overlay</p>
    </div>
  );
};
