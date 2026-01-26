import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { TextAnimationPreview } from '../TextAnimationPreview';
import type { TextItem, TextAnimationConfig } from '../../types';

interface TextPreviewModalProps {
  texts: TextItem[];
  config: TextAnimationConfig;
  onConfigChange: (config: TextAnimationConfig) => void;
  onClose: () => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export const TextPreviewModal: React.FC<TextPreviewModalProps> = ({
  texts,
  config,
  onConfigChange,
  onClose,
  audioRef,
}) => {
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      maxWidth={false}
      sx={{ '& .MuiDialog-paper': { height: '90vh', maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <div>Preview & Generate Text Animation</div>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TextAnimationPreview
          texts={texts}
          config={config}
          onConfigChange={onConfigChange}
          showPreviewOnly={false}
          showPreviewPlayer={true}
          audioRef={audioRef}
        />
      </DialogContent>
    </Dialog>
  );
};