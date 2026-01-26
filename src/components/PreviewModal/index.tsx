import React, { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Grid,
  Paper,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { ImageItem, ReelConfig } from '../../types';
import { ReelPreview } from '../ReelPreview';

interface PreviewModalProps {
  images: ImageItem[];
  config: ReelConfig;
  onConfigChange: (config: ReelConfig) => void;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  images,
  config,
  onConfigChange,
  onClose,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Set up audio source when music is available
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && config.music) {
      audio.src = config.music.dataUrl;
      audio.volume = config.music.volume;
      audio.load(); // Explicitly load the audio
    }
  }, [config.music]);

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">🎬 Preview & Generate Video</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Preview
              </Typography>
              <ReelPreview
                images={images}
                config={config}
                onConfigChange={onConfigChange}
                showPreviewOnly={true}
                audioRef={audioRef}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Settings & Export
              </Typography>
              <ReelPreview
                images={images}
                config={config}
                onConfigChange={onConfigChange}
                showPreviewPlayer={false}
              />
            </Paper>
          </Grid>
        </Grid>

        <audio ref={audioRef} preload="auto" />
      </DialogContent>
    </Dialog>
  );
};
