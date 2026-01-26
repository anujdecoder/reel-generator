import React from 'react';
import { Box } from '@mui/material';
import {
  TextActionBar,
  TextEditorLayout,
  MusicSection,
  TextEmptyState,
  TextPreviewModal
} from '../';
import type { TextItem, TextAnimationConfig } from '../../types';
import { layoutStyles } from './styles';

interface TextAnimationLayoutProps {
  // Data
  texts: TextItem[];
  config: TextAnimationConfig;
  videoDuration: number;

  // UI State
  selectedText: TextItem | null;
  showMusicUpload: boolean;
  showPreview: boolean;

  // Event handlers
  onAddText: (content?: string) => void;
  onMusicToggle: () => void;
  onPreview: () => void;
  onClearAll: () => void;
  onSelectText: (text: TextItem) => void;
  onReorderTexts: (texts: TextItem[]) => void;
  onRemoveText: (id: string) => void;
  onSaveText: (textId: string, updates: Partial<TextItem>) => void;
  onMusicChange: (music: any) => void;
  onConfigChange: (config: TextAnimationConfig) => void;
  onPreviewClose: () => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export const TextAnimationLayout: React.FC<TextAnimationLayoutProps> = ({
  texts,
  config,
  videoDuration,
  selectedText,
  showMusicUpload,
  showPreview,
  onAddText,
  onMusicToggle,
  onPreview,
  onClearAll,
  onSelectText,
  onReorderTexts,
  onRemoveText,
  onSaveText,
  onMusicChange,
  onConfigChange,
  onPreviewClose,
  audioRef,
}) => {
  return (
    <Box sx={layoutStyles.root}>
      {texts.length === 0 ? (
        /* No texts - show empty state */
        <TextEmptyState
          onAddText={onAddText}
        />
      ) : (
        /* Texts exist - show editor layout */
        <Box sx={layoutStyles.editorContainer}>
          <TextActionBar
            texts={texts}
            config={config}
            onAddText={onAddText}
            onMusicToggle={onMusicToggle}
            onPreview={onPreview}
            onClearAll={onClearAll}
          />

          <MusicSection
            music={config.music}
            videoDuration={videoDuration}
            showMusicUpload={showMusicUpload}
            onMusicChange={onMusicChange}
          />

          <TextEditorLayout
            texts={texts}
            selectedText={selectedText}
            onSelectText={onSelectText}
            onReorder={onReorderTexts}
            onRemove={onRemoveText}
            onSaveText={onSaveText}
            onAddText={onAddText}
          />
        </Box>
      )}

      {/* Modals */}
      {showPreview && (
        <TextPreviewModal
          texts={texts}
          config={config}
          onConfigChange={onConfigChange}
          onClose={onPreviewClose}
          audioRef={audioRef}
        />
      )}

      {/* TODO: ConfigImport for text */}
    </Box>
  );
};