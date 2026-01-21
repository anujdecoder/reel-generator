import React, { useState, useRef, useEffect } from 'react';
import type { ImageItem, TextOverlay, TextPosition, CropSettings, AspectRatio } from '../types';
import './ImageEditor.css';

interface ImageEditorProps {
  image: ImageItem | null;
  onSaveTextOverlay: (imageId: string, textOverlay: TextOverlay | undefined) => void;
  onSaveCrop: (imageId: string, cropSettings: CropSettings, croppedDataUrl: string) => void;
}

type EditorMode = 'view' | 'crop' | 'text';

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

export const ImageEditor: React.FC<ImageEditorProps> = ({
  image,
  onSaveTextOverlay,
  onSaveCrop,
}) => {
  const [mode, setMode] = useState<EditorMode>('view');
  const [textOverlay, setTextOverlay] = useState<TextOverlay>(DEFAULT_TEXT_OVERLAY);
  const [cropSettings, setCropSettings] = useState<CropSettings>(DEFAULT_CROP);
  
  // Crop editor state
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Reset state when image changes - intentional sync state with props
  useEffect(() => {
    if (image) {
      setTextOverlay(image.textOverlay || DEFAULT_TEXT_OVERLAY);
      setCropSettings(image.cropSettings || DEFAULT_CROP);
      setMode('view');
      setImageLoaded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image?.id]);

  // Load the image for crop editor
  useEffect(() => {
    if (!image || mode !== 'crop') return;
    
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = image.dataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const containerWidth = Math.min(containerSize.width || 500, 700);
    const containerHeight = Math.min(containerSize.height || 300, 300);

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

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imgX = padding;
    const imgY = padding;
    
    ctx.drawImage(img, imgX, imgY, displayWidth, displayHeight);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    
    const cropX = imgX + cropSettings.x * displayWidth;
    const cropY = imgY + cropSettings.y * displayHeight;
    const cropW = cropSettings.width * displayWidth;
    const cropH = cropSettings.height * displayHeight;

    ctx.fillRect(0, 0, canvas.width, cropY);
    ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - cropY - cropH);
    ctx.fillRect(0, cropY, cropX, cropH);
    ctx.fillRect(cropX + cropW, cropY, canvas.width - cropX - cropW, cropH);

    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    const handleSize = 10;
    ctx.fillStyle = '#667eea';
    
    ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropX + cropW - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropX - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropX + cropW - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(cropX + cropW / 3, cropY);
    ctx.lineTo(cropX + cropW / 3, cropY + cropH);
    ctx.moveTo(cropX + (cropW * 2) / 3, cropY);
    ctx.lineTo(cropX + (cropW * 2) / 3, cropY + cropH);
    ctx.moveTo(cropX, cropY + cropH / 3);
    ctx.lineTo(cropX + cropW, cropY + cropH / 3);
    ctx.moveTo(cropX, cropY + (cropH * 2) / 3);
    ctx.lineTo(cropX + cropW, cropY + (cropH * 2) / 3);
    ctx.stroke();
  }, [mode, imageLoaded, cropSettings, containerSize]);

  const getImageDimensions = () => {
    if (!imageRef.current) return { imgX: 0, imgY: 0, displayWidth: 0, displayHeight: 0, padding: 20 };
    
    const img = imageRef.current;
    const containerWidth = Math.min(containerSize.width || 500, 700);
    const containerHeight = Math.min(containerSize.height || 300, 300);
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
          case 'bl': {
            const newWidthBl = Math.max(0.1, prev.width - deltaX);
            x = prev.x + prev.width - newWidthBl;
            width = newWidthBl;
            if (aspectRatio) {
              height = width / aspectRatio;
            } else {
              height = Math.max(0.1, Math.min(1 - y, prev.height + deltaY));
            }
            break;
          }
          case 'tr': {
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
          }
          case 'tl': {
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
        }

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

      let { x, y, width, height } = prev;
      const currentRatio = width / height;

      if (currentRatio > ratio) {
        const newWidth = height * ratio;
        x = x + (width - newWidth) / 2;
        width = newWidth;
      } else {
        const newHeight = width / ratio;
        y = y + (height - newHeight) / 2;
        height = newHeight;
      }

      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x + width > 1) x = 1 - width;
      if (y + height > 1) y = 1 - height;

      return { ...prev, x, y, width, height, aspectRatio: ar };
    });
  };

  const handleResetCrop = () => {
    const ratio = getAspectRatioValue(cropSettings.aspectRatio);
    if (ratio) {
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
    if (!imageRef.current || !image) return image?.dataUrl || '';

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return image.dataUrl;

    const srcX = cropSettings.x * img.width;
    const srcY = cropSettings.y * img.height;
    const srcW = cropSettings.width * img.width;
    const srcH = cropSettings.height * img.height;

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

  const handleSaveCrop = () => {
    if (!image) return;
    const croppedDataUrl = generateCroppedImage();
    onSaveCrop(image.id, cropSettings, croppedDataUrl);
    setMode('view');
  };

  const handleTextChange = <K extends keyof TextOverlay>(
    key: K,
    value: TextOverlay[K]
  ) => {
    setTextOverlay((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveText = () => {
    if (!image) return;
    if (textOverlay.text.trim()) {
      onSaveTextOverlay(image.id, textOverlay);
    } else {
      onSaveTextOverlay(image.id, undefined);
    }
    setMode('view');
  };

  const handleRemoveText = () => {
    if (!image) return;
    onSaveTextOverlay(image.id, undefined);
    setTextOverlay(DEFAULT_TEXT_OVERLAY);
    setMode('view');
  };

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
      case 'top':
        return { ...base, top: 0 };
      case 'center':
        return { ...base, top: '50%', transform: 'translateY(-50%)' };
      case 'bottom':
        return { ...base, bottom: 0 };
      default:
        return { ...base, bottom: 0 };
    }
  };

  if (!image) {
    return (
      <div className="image-editor">
        <div className="editor-empty">
          <span className="empty-icon">👆</span>
          <p>Select an image from the sidebar to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="image-editor">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <h3>{image.name}</h3>
        </div>
        <div className="toolbar-right">
          {mode === 'view' && (
            <>
              <button
                className={`toolbar-btn ${image.cropSettings ? 'has-edit' : ''}`}
                onClick={() => setMode('crop')}
              >
                ✂️ Crop
              </button>
              <button
                className={`toolbar-btn ${image.textOverlay ? 'has-edit' : ''}`}
                onClick={() => setMode('text')}
              >
                📝 Text
              </button>
            </>
          )}
          {mode !== 'view' && (
            <button className="toolbar-btn cancel" onClick={() => setMode('view')}>
              ✕ Cancel
            </button>
          )}
        </div>
      </div>

      <div className="editor-content">
        {mode === 'view' && (
          <div className="view-mode">
            <div className="image-preview-container">
              <img 
                src={image.croppedDataUrl || image.dataUrl} 
                alt={image.name}
                className="preview-image"
              />
              {image.textOverlay && (
                <div className="preview-text-overlay" style={getTextPositionStyle()}>
                  {image.textOverlay.text}
                </div>
              )}
            </div>
            <div className="image-info">
              {image.cropSettings && (
                <span className="info-badge crop">✂️ Cropped ({image.cropSettings.aspectRatio})</span>
              )}
              {image.textOverlay && (
                <span className="info-badge text">📝 "{image.textOverlay.text.substring(0, 20)}{image.textOverlay.text.length > 20 ? '...' : ''}"</span>
              )}
            </div>
          </div>
        )}

        {mode === 'crop' && (
          <div className="crop-mode">
            <div className="crop-canvas-container" ref={containerRef}>
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
              <div className="control-group">
                <label>Aspect Ratio</label>
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
              
              <div className="control-group">
                <label>Dimensions</label>
                <div className="dimension-info">
                  <span>X: {Math.round(cropSettings.x * 100)}%</span>
                  <span>Y: {Math.round(cropSettings.y * 100)}%</span>
                  <span>W: {Math.round(cropSettings.width * 100)}%</span>
                  <span>H: {Math.round(cropSettings.height * 100)}%</span>
                </div>
              </div>
              
              <div className="control-actions">
                <button className="action-btn reset" onClick={handleResetCrop}>
                  🔄 Reset
                </button>
                <button className="action-btn primary" onClick={handleSaveCrop}>
                  ✂️ Apply Crop
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'text' && (
          <div className="text-mode">
            <div className="text-preview-container">
              <img src={image.croppedDataUrl || image.dataUrl} alt={image.name} />
              {textOverlay.text && (
                <div className="text-preview" style={getTextPositionStyle()}>
                  {textOverlay.text}
                </div>
              )}
            </div>
            
            <div className="text-controls">
              <div className="control-group">
                <label>Text Content</label>
                <textarea
                  value={textOverlay.text}
                  onChange={(e) => handleTextChange('text', e.target.value)}
                  placeholder="Enter your text here..."
                  rows={2}
                />
              </div>
              
              <div className="control-row">
                <div className="control-group">
                  <label>Position</label>
                  <div className="position-buttons">
                    {(['top', 'center', 'bottom'] as TextPosition[]).map((pos) => (
                      <button
                        key={pos}
                        className={`pos-btn ${textOverlay.position === pos ? 'active' : ''}`}
                        onClick={() => handleTextChange('position', pos)}
                      >
                        {pos.charAt(0).toUpperCase() + pos.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="control-group">
                  <label>Font Size: {textOverlay.fontSize}px</label>
                  <input
                    type="range"
                    min="16"
                    max="72"
                    value={textOverlay.fontSize}
                    onChange={(e) => handleTextChange('fontSize', Number(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="control-row">
                <div className="control-group">
                  <label>Text Color</label>
                  <input
                    type="color"
                    value={textOverlay.fontColor}
                    onChange={(e) => handleTextChange('fontColor', e.target.value)}
                  />
                </div>
                
                <div className="control-group">
                  <label>Weight</label>
                  <select
                    value={textOverlay.fontWeight}
                    onChange={(e) => handleTextChange('fontWeight', e.target.value as 'normal' | 'bold')}
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
                
                <div className="control-group">
                  <label>Align</label>
                  <div className="align-buttons">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        className={`align-btn ${textOverlay.textAlign === align ? 'active' : ''}`}
                        onClick={() => handleTextChange('textAlign', align)}
                      >
                        {align === 'left' ? '◀' : align === 'right' ? '▶' : '●'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="control-group">
                <label>Background</label>
                <div className="bg-presets">
                  <button
                    className={`bg-preset ${textOverlay.backgroundColor === 'rgba(0, 0, 0, 0.6)' ? 'active' : ''}`}
                    style={{ background: 'rgba(0, 0, 0, 0.6)' }}
                    onClick={() => handleTextChange('backgroundColor', 'rgba(0, 0, 0, 0.6)')}
                    title="Dark"
                  />
                  <button
                    className={`bg-preset ${textOverlay.backgroundColor === 'rgba(255, 255, 255, 0.8)' ? 'active' : ''}`}
                    style={{ background: 'rgba(255, 255, 255, 0.8)' }}
                    onClick={() => handleTextChange('backgroundColor', 'rgba(255, 255, 255, 0.8)')}
                    title="Light"
                  />
                  <button
                    className={`bg-preset ${textOverlay.backgroundColor === 'rgba(102, 126, 234, 0.8)' ? 'active' : ''}`}
                    style={{ background: 'rgba(102, 126, 234, 0.8)' }}
                    onClick={() => handleTextChange('backgroundColor', 'rgba(102, 126, 234, 0.8)')}
                    title="Purple"
                  />
                  <button
                    className={`bg-preset ${textOverlay.backgroundColor === 'rgba(239, 68, 68, 0.8)' ? 'active' : ''}`}
                    style={{ background: 'rgba(239, 68, 68, 0.8)' }}
                    onClick={() => handleTextChange('backgroundColor', 'rgba(239, 68, 68, 0.8)')}
                    title="Red"
                  />
                  <button
                    className={`bg-preset ${textOverlay.backgroundColor === 'rgba(72, 187, 120, 0.8)' ? 'active' : ''}`}
                    style={{ background: 'rgba(72, 187, 120, 0.8)' }}
                    onClick={() => handleTextChange('backgroundColor', 'rgba(72, 187, 120, 0.8)')}
                    title="Green"
                  />
                  <button
                    className={`bg-preset transparent ${textOverlay.backgroundColor === 'transparent' ? 'active' : ''}`}
                    onClick={() => handleTextChange('backgroundColor', 'transparent')}
                    title="None"
                  >
                    ∅
                  </button>
                </div>
              </div>
              
              <div className="control-actions">
                {image.textOverlay && (
                  <button className="action-btn danger" onClick={handleRemoveText}>
                    🗑️ Remove Text
                  </button>
                )}
                <button className="action-btn primary" onClick={handleSaveText}>
                  💾 Save Text
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
