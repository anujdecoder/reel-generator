import { Navigation, TextAnimationLayout } from './components';
import {
  useTextStorage,
  useTextAnimationState,
  useTextVideoCalculation,
  useTextOperations,
  useMusicManagement,
  useTextConfigImport,
} from './hooks';

export function VideoGenerator() {
  // Data layer hooks
  const [texts, setTexts] = useTextStorage();
  const textState = useTextAnimationState();
  const { videoDuration } = useTextVideoCalculation(texts, textState.config);

  // Business logic hooks
  const textOps = useTextOperations({
    texts,
    setTexts,
    selectedText: textState.selectedText,
    setSelectedText: textState.setSelectedText,
  });

  const { audioRef, handleMusicChange } = useMusicManagement({
    setConfig: textState.setConfig,
    setShowMusicUpload: textState.setShowMusicUpload,
  });

  const { handleConfigImport } = useTextConfigImport({
    setTexts,
    setConfig: textState.setConfig,
    setSelectedText: textState.setSelectedText,
    setShowConfigImport: textState.setShowConfigImport,
    audioRef,
  });

  return (
    <>
      <Navigation />
      <TextAnimationLayout
        texts={texts}
        config={textState.config}
        videoDuration={videoDuration}
        selectedText={textState.selectedText}
        showMusicUpload={textState.showMusicUpload}
        showPreview={textState.showPreview}
        showConfigImport={textState.showConfigImport}
        onAddText={textOps.handleAddText}
        onConfigImport={() => textState.setShowConfigImport(true)}
        onMusicToggle={() => textState.setShowMusicUpload(!textState.showMusicUpload)}
        onPreview={() => textState.setShowPreview(true)}
        onClearAll={textOps.handleClearAll}
        onSelectText={textOps.handleSelectText}
        onReorderTexts={textOps.handleReorderTexts}
        onRemoveText={textOps.handleRemoveText}
        onSaveText={textOps.handleSaveText}
        onMusicChange={handleMusicChange}
        onConfigChange={textState.setConfig}
        onPreviewClose={() => textState.setShowPreview(false)}
        onConfigImportClose={() => textState.setShowConfigImport(false)}
        onConfigImportSubmit={handleConfigImport}
        audioRef={audioRef}
      />

      {/* Hidden audio element for music playback */}
      <audio ref={audioRef} />
    </>
  );
}