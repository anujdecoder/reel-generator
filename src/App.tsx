import { useCallback, useState } from 'react';
import { ImageUpload, ImageList, ReelPreview, TextOverlayEditor, ImageCropEditor } from './components';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useImageStorage } from './hooks/useImageStorage';
import type { ImageItem, ReelConfig, TextOverlay, CropSettings } from './types';
import './App.css';

const DEFAULT_CONFIG: ReelConfig = {
  transitionDuration: 500,
  imageDuration: 2000,
  transitionType: 'fade',
};

function App() {
  // Use IndexedDB for images (supports larger storage)
  const [images, setImages, isLoadingImages, storageError] = useImageStorage();
  // Use localStorage for config (small data)
  const [config, setConfig] = useLocalStorage<ReelConfig>('reel-config', DEFAULT_CONFIG);
  const [showPreview, setShowPreview] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
  const [croppingImage, setCroppingImage] = useState<ImageItem | null>(null);

  const handleImagesAdded = useCallback((newImages: ImageItem[]) => {
    setImages((prev) => [...prev, ...newImages]);
  }, [setImages]);

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, [setImages]);

  const handleReorderImages = useCallback((newImages: ImageItem[]) => {
    setImages(newImages);
  }, [setImages]);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to remove all images?')) {
      setImages([]);
      setShowPreview(false);
    }
  }, [setImages]);

  const handleProceedToGenerate = () => {
    setShowPreview(true);
  };

  const handleBackToEdit = () => {
    setShowPreview(false);
  };

  const handleEditText = useCallback((image: ImageItem) => {
    setEditingImage(image);
  }, []);

  const handleSaveTextOverlay = useCallback((imageId: string, textOverlay: TextOverlay | undefined) => {
    setImages((prev) => 
      prev.map((img) => 
        img.id === imageId ? { ...img, textOverlay } : img
      )
    );
  }, [setImages]);

  const handleCloseTextEditor = useCallback(() => {
    setEditingImage(null);
  }, []);

  const handleEditCrop = useCallback((image: ImageItem) => {
    setCroppingImage(image);
  }, []);

  const handleSaveCrop = useCallback((imageId: string, cropSettings: CropSettings, croppedDataUrl: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, cropSettings, croppedDataUrl } : img
      )
    );
  }, [setImages]);

  const handleCloseCropEditor = useCallback(() => {
    setCroppingImage(null);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎬 Reel Generator</h1>
        <p className="app-subtitle">Create stunning video reels from your images</p>
      </header>

      {/* Step Indicator */}
      <div className="step-indicator">
        <div className={`step ${!showPreview ? 'active' : 'completed'}`}>
          <span className="step-number">1</span>
          <span className="step-label">Upload & Order Images</span>
        </div>
        <div className="step-connector"></div>
        <div className={`step ${showPreview ? 'active' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Preview & Generate</span>
        </div>
      </div>

      <main className="app-main">
        {/* Show loading state */}
        {isLoadingImages && (
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <p>Loading your images...</p>
          </div>
        )}

        {/* Show storage error if any */}
        {storageError && (
          <div className="error-state">
            <p>⚠️ {storageError}</p>
          </div>
        )}

        {!isLoadingImages && !showPreview ? (
          /* Step 1: Upload and Order Images */
          <div className="upload-section">
            <div className="section-header">
              <h2>📤 Upload Your Images</h2>
              <p>Select multiple images at once. You can upload more anytime.</p>
            </div>
            
            <ImageUpload onImagesAdded={handleImagesAdded} />
            
            {images.length > 0 && (
              <>
                <div className="section-header">
                  <h2>🖼️ Arrange Your Images</h2>
                  <p>Drag and drop to set the order. Images will play from first to last.</p>
                </div>

                <div className="images-header">
                  <span className="image-count">{images.length} image{images.length !== 1 ? 's' : ''} selected</span>
                  <button className="clear-btn" onClick={handleClearAll}>
                    🗑️ Clear All
                  </button>
                </div>
                
                <ImageList
                  images={images}
                  onRemove={handleRemoveImage}
                  onReorder={handleReorderImages}
                  onEditText={handleEditText}
                  onEditCrop={handleEditCrop}
                />

                {/* Prominent CTA to proceed */}
                <div className="proceed-section">
                  <div className="proceed-info">
                    <p>✅ Images are ready!</p>
                    <p className="proceed-hint">You've selected {images.length} images. Continue to preview and generate your video.</p>
                  </div>
                  <button 
                    className="proceed-btn"
                    onClick={handleProceedToGenerate}
                    disabled={images.length < 2}
                  >
                    {images.length < 2 
                      ? `Add ${2 - images.length} more image${2 - images.length !== 1 ? 's' : ''} to continue`
                      : '🎬 Continue to Generate Video →'
                    }
                  </button>
                </div>
              </>
            )}

            {images.length === 0 && (
              <div className="empty-state">
                <p>👆 Upload at least 2 images to create a reel</p>
              </div>
            )}
          </div>
        ) : !isLoadingImages ? (
          /* Step 2: Preview and Generate */
          <div className="preview-section">
            <button className="back-btn" onClick={handleBackToEdit}>
              ← Back to Edit Images
            </button>
            
            <div className="preview-layout">
              {/* Left side: Image list and controls */}
              <div className="preview-left">
                <div className="images-summary">
                  <h3>📋 Reorder Images ({images.length})</h3>
                  <p className="summary-hint">Drag to reorder • This is the playback order</p>
                  <div className="summary-list">
                    {images.map((image, index) => (
                      <div 
                        key={image.id} 
                        className="summary-item"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', index.toString());
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('drag-over');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('drag-over');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('drag-over');
                          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          const toIndex = index;
                          if (fromIndex !== toIndex) {
                            const newImages = [...images];
                            const [moved] = newImages.splice(fromIndex, 1);
                            newImages.splice(toIndex, 0, moved);
                            handleReorderImages(newImages);
                          }
                        }}
                      >
                        <span className="summary-number">{index + 1}</span>
                        <div className="summary-image-wrapper">
                          <img src={image.croppedDataUrl || image.dataUrl} alt={image.name} />
                          {image.cropSettings && (
                            <span className="summary-crop-badge" title="Cropped">✂</span>
                          )}
                          {image.textOverlay && (
                            <span className="summary-text-badge" title={image.textOverlay.text}>T</span>
                          )}
                        </div>
                        <div className="summary-info">
                          <span className="summary-name">{image.name}</span>
                          {image.textOverlay && (
                            <span className="summary-text-preview">{image.textOverlay.text}</span>
                          )}
                        </div>
                        <span className="drag-icon">⋮⋮</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generate CTA */}
                <div className="generate-section">
                  <ReelPreview
                    images={images}
                    config={config}
                    onConfigChange={setConfig}
                    showPreviewPlayer={false}
                  />
                </div>
              </div>
              
              {/* Right side: Large Preview */}
              <div className="preview-right">
                <h3>🎬 Preview</h3>
                <ReelPreview
                  images={images}
                  config={config}
                  onConfigChange={setConfig}
                  showPreviewOnly={true}
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="app-footer">
        <p>
          {!showPreview 
            ? 'Tip: Click ✂️ to crop/resize • Click 📝 to add text overlay'
            : 'Tip: Adjust settings and preview before generating your final video'
          }
        </p>
      </footer>

      {/* Text Overlay Editor Modal */}
      {editingImage && (
        <TextOverlayEditor
          image={editingImage}
          onSave={handleSaveTextOverlay}
          onClose={handleCloseTextEditor}
        />
      )}

      {/* Crop Editor Modal */}
      {croppingImage && (
        <ImageCropEditor
          image={croppingImage}
          onSave={handleSaveCrop}
          onClose={handleCloseCropEditor}
        />
      )}
    </div>
  );
}

export default App;
