import React from 'react';
import { Paper } from '@mui/material';
import type { MusicTrack } from '../../types';
import { MusicUpload } from '../MusicUpload';
import { MusicControls } from '../MusicControls';
import { musicSectionStyles } from './styles';

interface MusicSectionProps {
  music: MusicTrack | undefined;
  videoDuration: number;
  showMusicUpload: boolean;
  onMusicChange: (music: MusicTrack | undefined) => void;
}

export const MusicSection: React.FC<MusicSectionProps> = ({
  music,
  videoDuration,
  showMusicUpload,
  onMusicChange,
}) => {
  return (
    <>
      {/* Music Upload Dropdown */}
      {showMusicUpload && !music && (
        <Paper sx={musicSectionStyles.uploadPaper}>
          <MusicUpload
            music={music}
            videoDuration={videoDuration}
            onMusicChange={onMusicChange}
          />
        </Paper>
      )}

      {/* Music Controls */}
      {music && (
        <Paper sx={musicSectionStyles.controlsPaper}>
          <MusicControls
            music={music}
            videoDuration={videoDuration}
            onMusicChange={onMusicChange}
          />
        </Paper>
      )}
    </>
  );
};
