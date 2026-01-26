import { Layout } from './components';
import { GlobalStylesProvider } from './styles/GlobalStylesProvider';
import {
  useImageStorage,
  useReelState,
  useVideoCalculation,
  useImageOperations,
  useMusicManagement,
  useConfigImport,
} from './hooks';

function App() {
  // Data layer hooks
  const [images, setImages, isLoadingImages, storageError] = useImageStorage();
  const reelState = useReelState();
  const { videoDuration } = useVideoCalculation(images, reelState.config);

  // Business logic hooks
  const imageOps = useImageOperations({
    images,
    setImages,
    selectedImage: reelState.selectedImage,
    setSelectedImage: reelState.setSelectedImage,
  });

  const { audioRef, handleMusicChange } = useMusicManagement({
    setConfig: reelState.setConfig,
    setShowMusicUpload: reelState.setShowMusicUpload,
  });

  const { handleConfigImport } = useConfigImport({
    setImages,
    setConfig: reelState.setConfig,
    setSelectedImage: reelState.setSelectedImage,
    setShowConfigImport: reelState.setShowConfigImport,
    audioRef,
  });

  return (
    <GlobalStylesProvider>
      <Layout
        images={images}
        config={reelState.config}
        isLoadingImages={isLoadingImages}
        storageError={storageError}
        videoDuration={videoDuration}
        selectedImage={reelState.selectedImage}
        showMusicUpload={reelState.showMusicUpload}
        showPreview={reelState.showPreview}
        showConfigImport={reelState.showConfigImport}
        onImagesAdded={imageOps.handleImagesAdded}
        onConfigImport={() => reelState.setShowConfigImport(true)}
        onMusicToggle={() => reelState.setShowMusicUpload(!reelState.showMusicUpload)}
        onPreview={() => reelState.setShowPreview(true)}
        onClearAll={imageOps.handleClearAll}
        onSelectImage={imageOps.handleSelectImage}
        onReorderImages={imageOps.handleReorderImages}
        onRemoveImage={imageOps.handleRemoveImage}
        onSaveTextOverlay={imageOps.handleSaveTextOverlay}
        onSaveCrop={imageOps.handleSaveCrop}
        onSaveTiming={(imageId: string, duration?: number, transitionType?: any) =>
          imageOps.handleSaveTiming(imageId, duration, transitionType)
        }
        onMusicChange={handleMusicChange}
        onConfigChange={reelState.setConfig}
        onPreviewClose={() => reelState.setShowPreview(false)}
        onConfigImportClose={() => reelState.setShowConfigImport(false)}
        onConfigImportSubmit={handleConfigImport}
      />

      {/* Hidden audio element for music playback */}
      <audio ref={audioRef} />
    </GlobalStylesProvider>
  );
}

export default App;

