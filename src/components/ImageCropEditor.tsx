import React, { useState, useRef, useEffect } from 'react';
import type { ImageItem, CropSettings, AspectRatio } from '../types';
import './ImageCropEditor.css';

interface ImageCropEditorProps {
  image: ImageItem;
  onSave: (imageId: string, cropSettings: CropSettings, croppedDataUrl: string) => void;
  onClose: () => void;
}

const DEFAULT_CROP: CropSettings = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  zoom: 1,
  aspectRatio: '9:16',
};

const ASPECT_RATIOS: { label: string; value: AspectRatio; ratio: number | null }[] = [
  { label: '9:16 (Reel)', value: '9:16', ratio: 9 / 16 },
  { label: '1:1 (Square)', value: '1:1', ratio: 1 },
  { label: '4:5 (Portrait)', value: '4:5', ratio: 4 / 5 },
  { label: '16:9 (Landscape)', value: '16:9', ratio: 16 / 9 },
  { label: 'Free', value: 'free', ratio: null },
];

const getAspectRatioValue = (ar: AspectRatio): number | null => {
  const found = ASPECT_RATIOS.find(a => a.value === ar);
  return found?.ratio || null;
};

export const ImageCropEditor: React.FC<ImageCropEditorProps> = ({
  image,
  onSave,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [cropSettings, setCropSettings] = useState<CropSettings>(
    image.cropSettings || DEFAULT_CROP
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Load the image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = image.dataUrl;
  }, [image.dataUrl]);

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Draw the canvas
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    // Use fixed container dimensions to ensure visibility
    const containerWidth = Math.min(containerSize.width || 600, 900);
    const containerHeight = Math.min(containerSize.height || 350, 350);

    // Calculate scale to fit image in container with padding
    const padding = 20;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;
    
    const scale = Math.min(
      availableWidth / img.width,
      availableHeight / img.height
    );

    const displayWidth = img.width * scale;
    const displayHeight = img.height * scale;

    canvas.width = displayWidth + padding * 2;
    canvas.height = displayHeight + padding * 2;

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image centered with padding
    const imgX = padding;
    const imgY = padding;
    
    ctx.drawImage(img, imgX, imgY, displayWidth, displayHeight);

    // Draw darkened overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    
    const cropX = imgX + cropSettings.x * displayWidth;
    const cropY = imgY + cropSettings.y * displayHeight;
    const cropW = cropSettings.width * displayWidth;
    const cropH = cropSettings.height * displayHeight;

    // Top
    ctx.fillRect(0, 0, canvas.width, cropY);
    // Bottom
    ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - cropY - cropH);
    // Left
    ctx.fillRect(0, cropY, cropX, cropH);
    // Right
    ctx.fillRect(cropX + cropW, cropY, canvas.width - cropX - cropW, cropH);

    // Draw crop border
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    // Draw corner handles
    const handleSize = 10;
    ctx.fillStyle = '#667eea';
    
    // Top-left
    ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(cropX + cropW - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(cropX - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(cropX + cropW - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize);

    // Draw grid lines (rule of thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(cropX + cropW / 3, cropY);
    ctx.lineTo(cropX + cropW / 3, cropY + cropH);
    ctx.moveTo(cropX + (cropW * 2) / 3, cropY);
    ctx.lineTo(cropX + (cropW * 2) / 3, cropY + cropH);
    // Horizontal lines
    ctx.moveTo(cropX, cropY + cropH / 3);
    ctx.lineTo(cropX + cropW, cropY + cropH / 3);
    ctx.moveTo(cropX, cropY + (cropH * 2) / 3);
    ctx.lineTo(cropX + cropW, cropY + (cropH * 2) / 3);
    ctx.stroke();
  }, [imageLoaded, cropSettings, containerSize]);

  const getImageDimensions = () => {
    if (!imageRef.current) return { imgX: 0, imgY: 0, displayWidth: 0, displayHeight: 0, padding: 20 };
    
    const img = imageRef.current;
    const containerWidth = Math.min(containerSize.width || 600, 900);
    const containerHeight = Math.min(containerSize.height || 350, 350);
    const padding = 20;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;
    
    const scale = Math.min(
      availableWidth / img.width,
      availableHeight / img.height
    );

    return {
      imgX: padding,
      imgY: padding,
      displayWidth: img.width * scale,
      displayHeight: img.height * scale,
      padding,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const { imgX, imgY, displayWidth, displayHeight } = getImageDimensions();

    const cropX = imgX + cropSettings.x * displayWidth;
    const cropY = imgY + cropSettings.y * displayHeight;
    const cropW = cropSettings.width * displayWidth;
    const cropH = cropSettings.height * displayHeight;

    const handleSize = 15;

    // Check if clicking on handles
    if (Math.abs(mouseX - cropX) < handleSize && Math.abs(mouseY - cropY) < handleSize) {
      setIsResizing('tl');
    } else if (Math.abs(mouseX - (cropX + cropW)) < handleSize && Math.abs(mouseY - cropY) < handleSize) {
      setIsResizing('tr');
    } else if (Math.abs(mouseX - cropX) < handleSize && Math.abs(mouseY - (cropY + cropH)) < handleSize) {
      setIsResizing('bl');
    } else if (Math.abs(mouseX - (cropX + cropW)) < handleSize && Math.abs(mouseY - (cropY + cropH)) < handleSize) {
      setIsResizing('br');
    } else if (
      mouseX >= cropX && mouseX <= cropX + cropW &&
      mouseY >= cropY && mouseY <= cropY + cropH
    ) {
      setIsDragging(true);
    }

    setDragStart({ x: mouseX, y: mouseY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging && !isResizing) return;
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const { displayWidth, displayHeight } = getImageDimensions();

    const deltaX = (mouseX - dragStart.x) / displayWidth;
    const deltaY = (mouseY - dragStart.y) / displayHeight;

    if (isDragging) {
      setCropSettings(prev => {
        let newX = prev.x + deltaX;
        let newY = prev.y + deltaY;

        // Constrain to image bounds
        newX = Math.max(0, Math.min(1 - prev.width, newX));
        newY = Math.max(0, Math.min(1 - prev.height, newY));

        return { ...prev, x: newX, y: newY };
      });
    } else if (isResizing) {
      setCropSettings(prev => {
        let { x, y, width, height } = prev;
        const aspectRatio = getAspectRatioValue(prev.aspectRatio);

        switch (isResizing) {
          case 'br':
            width = Math.max(0.1, Math.min(1 - x, prev.width + deltaX));
            if (aspectRatio) {
              height = width / aspectRatio;
            } else {
              height = Math.max(0.1, Math.min(1 - y, prev.height + deltaY));
            }
            break;
          case 'bl':
            const newWidthBl = Math.max(0.1, prev.width - deltaX);
            x = prev.x + prev.width - newWidthBl;
            width = newWidthBl;
            if (aspectRatio) {
              height = width / aspectRatio;
            } else {
              height = Math.max(0.1, Math.min(1 - y, prev.height + deltaY));
            }
            break;
          case 'tr':
            width = Math.max(0.1, Math.min(1 - x, prev.width + deltaX));
            if (aspectRatio) {
              const newHeight = width / aspectRatio;
              y = prev.y + prev.height - newHeight;
              height = newHeight;
            } else {
              const newHeightTr = Math.max(0.1, prev.height - deltaY);
              y = prev.y + prev.height - newHeightTr;
              height = newHeightTr;
            }
            break;
          case 'tl':
            const newWidthTl = Math.max(0.1, prev.width - deltaX);
            x = prev.x + prev.width - newWidthTl;
            width = newWidthTl;
            if (aspectRatio) {
              const newHeight = width / aspectRatio;
              y = prev.y + prev.height - newHeight;
              height = newHeight;
            } else {
              const newHeightTl = Math.max(0.1, prev.height - deltaY);
              y = prev.y + prev.height - newHeightTl;
              height = newHeightTl;
            }
            break;
        }

        // Constrain to bounds
        x = Math.max(0, x);
        y = Math.max(0, y);
        if (x + width > 1) width = 1 - x;
        if (y + height > 1) height = 1 - y;

        return { ...prev, x, y, width, height };
      });
    }

    setDragStart({ x: mouseX, y: mouseY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  const handleAspectRatioChange = (ar: AspectRatio) => {
    const ratio = ASPECT_RATIOS.find(a => a.value === ar)?.ratio;
    
    setCropSettings(prev => {
      if (!ratio) {
        return { ...prev, aspectRatio: ar };
      }

      // Adjust crop area to match new aspect ratio
      let { x, y, width, height } = prev;
      const currentRatio = width / height;

      if (currentRatio > ratio) {
        // Too wide, reduce width
        const newWidth = height * ratio;
        x = x + (width - newWidth) / 2;
        width = newWidth;
      } else {
        // Too tall, reduce height
        const newHeight = width / ratio;
        y = y + (height - newHeight) / 2;
        height = newHeight;
      }

      // Constrain to bounds
      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x + width > 1) x = 1 - width;
      if (y + height > 1) y = 1 - height;

      return { ...prev, x, y, width, height, aspectRatio: ar };
    });
  };

  const handleReset = () => {
    const ratio = getAspectRatioValue(cropSettings.aspectRatio);
    if (ratio) {
      // Calculate centered crop with aspect ratio
      let width = 1;
      let height = 1 / ratio;
      if (height > 1) {
        height = 1;
        width = ratio;
      }
      setCropSettings({
        ...DEFAULT_CROP,
        aspectRatio: cropSettings.aspectRatio,
        x: (1 - width) / 2,
        y: (1 - height) / 2,
        width,
        height,
      });
    } else {
      setCropSettings({ ...DEFAULT_CROP, aspectRatio: 'free' });
    }
  };

  const generateCroppedImage = (): string => {
    if (!imageRef.current) return image.dataUrl;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return image.dataUrl;

    // Calculate source crop area
    const srcX = cropSettings.x * img.width;
    const srcY = cropSettings.y * img.height;
    const srcW = cropSettings.width * img.width;
    const srcH = cropSettings.height * img.height;

    // Output size (1080p width for reels)
    const outputWidth = 1080;
    const outputHeight = Math.round(outputWidth / (srcW / srcH));

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      img,
      srcX, srcY, srcW, srcH,
      0, 0, outputWidth, outputHeight
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = () => {
    const croppedDataUrl = generateCroppedImage();
    onSave(image.id, cropSettings, croppedDataUrl);
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="crop-modal" onClick={onClose}>
      <div className="crop-editor" onClick={e => e.stopPropagation()}>
        <div className="editor-header">
          <h2>✂️ Crop & Resize Image</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="editor-content">
          <div className="crop-area" ref={containerRef}>
            {!imageLoaded ? (
              <div className="loading">Loading image...</div>
            ) : (
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            )}
          </div>

          <div className="crop-controls">
            <div className="control-section">
              <h3>Aspect Ratio</h3>
              <div className="aspect-ratio-buttons">
                {ASPECT_RATIOS.map(ar => (
                  <button
                    key={ar.value}
                    className={`ar-btn ${cropSettings.aspectRatio === ar.value ? 'active' : ''}`}
                    onClick={() => handleAspectRatioChange(ar.value)}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-section">
              <h3>Crop Dimensions</h3>
              <div className="dimension-info">
                <span>X: {Math.round(cropSettings.x * 100)}%</span>
                <span>Y: {Math.round(cropSettings.y * 100)}%</span>
                <span>W: {Math.round(cropSettings.width * 100)}%</span>
                <span>H: {Math.round(cropSettings.height * 100)}%</span>
              </div>
            </div>

            <div className="control-section">
              <button className="reset-btn" onClick={handleReset}>
                🔄 Reset Crop
              </button>
            </div>
          </div>
        </div>

        <div className="editor-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave}>
            ✂️ Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};
