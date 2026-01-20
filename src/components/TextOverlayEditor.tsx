import React, { useState, useEffect } from 'react';
import type { ImageItem, TextOverlay, TextPosition } from '../types';
import './TextOverlayEditor.css';

interface TextOverlayEditorProps {
  image: ImageItem;
  onSave: (imageId: string, textOverlay: TextOverlay | undefined) => void;
  onClose: () => void;
}

const DEFAULT_TEXT_OVERLAY: TextOverlay = {
  text: '',
  position: 'bottom',
  fontSize: 32,
  fontColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  fontWeight: 'bold',
  textAlign: 'center',
};

export const TextOverlayEditor: React.FC<TextOverlayEditorProps> = ({
  image,
  onSave,
  onClose,
}) => {
  const [textOverlay, setTextOverlay] = useState<TextOverlay>(
    image.textOverlay || DEFAULT_TEXT_OVERLAY
  );

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleChange = <K extends keyof TextOverlay>(
    key: K,
    value: TextOverlay[K]
  ) => {
    setTextOverlay((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (textOverlay.text.trim()) {
      onSave(image.id, textOverlay);
    } else {
      onSave(image.id, undefined);
    }
    onClose();
  };

  const handleRemoveText = () => {
    onSave(image.id, undefined);
    onClose();
  };

  const getPositionStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      padding: '16px',
      fontSize: `${textOverlay.fontSize}px`,
      color: textOverlay.fontColor,
      backgroundColor: textOverlay.backgroundColor,
      fontWeight: textOverlay.fontWeight,
      textAlign: textOverlay.textAlign,
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

  return (
    <div className="text-overlay-modal" onClick={onClose}>
      <div className="text-overlay-editor" onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h2>✏️ Add Text Overlay</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="editor-content">
          {/* Preview */}
          <div className="preview-section">
            <h3>Preview</h3>
            <div className="image-preview">
              <img src={image.dataUrl} alt={image.name} />
              {textOverlay.text && (
                <div className="text-preview" style={getPositionStyle()}>
                  {textOverlay.text}
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="controls-section">
            <div className="control-group">
              <label>Text Content</label>
              <textarea
                value={textOverlay.text}
                onChange={(e) => handleChange('text', e.target.value)}
                placeholder="Enter your text here..."
                rows={3}
              />
            </div>

            <div className="control-group">
              <label>Position</label>
              <div className="position-buttons">
                {(['top', 'center', 'bottom'] as TextPosition[]).map((pos) => (
                  <button
                    key={pos}
                    className={`position-btn ${textOverlay.position === pos ? 'active' : ''}`}
                    onClick={() => handleChange('position', pos)}
                  >
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-row">
              <div className="control-group">
                <label>Font Size</label>
                <div className="range-control">
                  <input
                    type="range"
                    min="16"
                    max="72"
                    value={textOverlay.fontSize}
                    onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                  />
                  <span>{textOverlay.fontSize}px</span>
                </div>
              </div>

              <div className="control-group">
                <label>Font Weight</label>
                <select
                  value={textOverlay.fontWeight}
                  onChange={(e) => handleChange('fontWeight', e.target.value as 'normal' | 'bold')}
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>

            <div className="control-row">
              <div className="control-group">
                <label>Text Color</label>
                <div className="color-input">
                  <input
                    type="color"
                    value={textOverlay.fontColor}
                    onChange={(e) => handleChange('fontColor', e.target.value)}
                  />
                  <span>{textOverlay.fontColor}</span>
                </div>
              </div>

              <div className="control-group">
                <label>Text Align</label>
                <div className="align-buttons">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      className={`align-btn ${textOverlay.textAlign === align ? 'active' : ''}`}
                      onClick={() => handleChange('textAlign', align)}
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
                  onClick={() => handleChange('backgroundColor', 'rgba(0, 0, 0, 0.6)')}
                  title="Dark"
                />
                <button
                  className={`bg-preset ${textOverlay.backgroundColor === 'rgba(255, 255, 255, 0.8)' ? 'active' : ''}`}
                  style={{ background: 'rgba(255, 255, 255, 0.8)' }}
                  onClick={() => handleChange('backgroundColor', 'rgba(255, 255, 255, 0.8)')}
                  title="Light"
                />
                <button
                  className={`bg-preset ${textOverlay.backgroundColor === 'rgba(102, 126, 234, 0.8)' ? 'active' : ''}`}
                  style={{ background: 'rgba(102, 126, 234, 0.8)' }}
                  onClick={() => handleChange('backgroundColor', 'rgba(102, 126, 234, 0.8)')}
                  title="Purple"
                />
                <button
                  className={`bg-preset ${textOverlay.backgroundColor === 'rgba(239, 68, 68, 0.8)' ? 'active' : ''}`}
                  style={{ background: 'rgba(239, 68, 68, 0.8)' }}
                  onClick={() => handleChange('backgroundColor', 'rgba(239, 68, 68, 0.8)')}
                  title="Red"
                />
                <button
                  className={`bg-preset ${textOverlay.backgroundColor === 'rgba(72, 187, 120, 0.8)' ? 'active' : ''}`}
                  style={{ background: 'rgba(72, 187, 120, 0.8)' }}
                  onClick={() => handleChange('backgroundColor', 'rgba(72, 187, 120, 0.8)')}
                  title="Green"
                />
                <button
                  className={`bg-preset transparent ${textOverlay.backgroundColor === 'transparent' ? 'active' : ''}`}
                  onClick={() => handleChange('backgroundColor', 'transparent')}
                  title="None"
                >
                  ∅
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="editor-footer">
          {image.textOverlay && (
            <button className="remove-btn" onClick={handleRemoveText}>
              🗑️ Remove Text
            </button>
          )}
          <div className="footer-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="save-btn" onClick={handleSave}>
              💾 Save Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
