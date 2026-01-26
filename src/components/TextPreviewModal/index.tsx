import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { Close as CloseIcon, PlayArrow, Stop } from '@mui/icons-material';
import type { TextItem, TextAnimationConfig } from '../../types';

interface TextPreviewModalProps {
  texts: TextItem[];
  config: TextAnimationConfig;
  onConfigChange: (config: TextAnimationConfig) => void;
  onClose: () => void;
}

export const TextPreviewModal: React.FC<TextPreviewModalProps> = ({
  texts,
  config,
  onConfigChange,
  onClose,
}) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;

    const currentText = texts[currentTextIndex];
    if (!currentText) return;

    const duration = currentText.duration;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Move to next text
        if (currentTextIndex < texts.length - 1) {
          setCurrentTextIndex(currentTextIndex + 1);
          setAnimationProgress(0);
          startTime = Date.now();
          requestAnimationFrame(animate);
        } else {
          setIsPlaying(false);
          setAnimationProgress(0);
        }
      }
    };

    requestAnimationFrame(animate);

    return () => setAnimationProgress(0);
  }, [isPlaying, currentTextIndex, texts]);

  const handlePlay = () => {
    setCurrentTextIndex(0);
    setAnimationProgress(0);
    setIsPlaying(true);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTextIndex(0);
    setAnimationProgress(0);
  };

  const currentText = texts[currentTextIndex];

  const getAnimationStyle = (text: TextItem) => {
    const progress = animationProgress;
    switch (text.animationType) {
      case 'fadeIn':
        return { opacity: progress };
      case 'slideIn':
        return { transform: `translateX(${(1 - progress) * 100}%)`, opacity: progress };
      case 'zoomIn':
        return { transform: `scale(${0.5 + progress * 0.5})`, opacity: progress };
      case 'bounce':
        const bounce = Math.sin(progress * Math.PI * 4) * (1 - progress) * 20;
        return { transform: `translateY(${bounce}px)`, opacity: progress };
      case 'typewriter':
        const chars = Math.floor(progress * text.content.length);
        return { opacity: 1 };
      default:
        return { opacity: 1 };
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Preview & Generate Text Animation</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={handlePlay}
            disabled={isPlaying || texts.length === 0}
          >
            Play
          </Button>
          <Button
            variant="outlined"
            startIcon={<Stop />}
            onClick={handleStop}
            disabled={!isPlaying}
          >
            Stop
          </Button>
        </Box>

        <Box
          sx={{
            width: '100%',
            height: 400,
            bgcolor: config.backgroundColor || '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {currentText && (
            <Typography
              sx={{
                fontSize: currentText.fontSize,
                color: currentText.fontColor,
                fontWeight: currentText.fontWeight,
                textAlign: currentText.textAlign,
                position: 'absolute',
                ...getAnimationStyle(currentText),
                transition: 'none', // Disable CSS transitions, use JS animation
              }}
            >
              {currentText.animationType === 'typewriter'
                ? currentText.content.substring(0, Math.floor(animationProgress * currentText.content.length))
                : currentText.content
              }
            </Typography>
          )}
        </Box>

        <Typography sx={{ mt: 2 }}>
          Text {currentTextIndex + 1} of {texts.length}
        </Typography>

        <Button variant="contained" sx={{ mt: 2 }}>
          Generate Video (Not Implemented Yet)
        </Button>
      </DialogContent>
    </Dialog>
  );
};