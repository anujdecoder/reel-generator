import React from 'react';
import { GlobalStyles } from '@mui/material';

export const GlobalStylesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <GlobalStyles
        styles={{
          '*': {
            boxSizing: 'border-box',
          },
          ':root': {
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            lineHeight: 1.5,
            fontWeight: 400,
            colorScheme: 'dark',
            color: '#e2e8f0',
            backgroundColor: '#0f1117',
            fontSynthesis: 'none',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          'body': {
            margin: 0,
            minWidth: 320,
            minHeight: '100vh',
          },
          '#root': {
            minHeight: '100vh',
          },
          '::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '::-webkit-scrollbar-track': {
            background: '#1a202c',
          },
          '::-webkit-scrollbar-thumb': {
            background: '#4a5568',
            borderRadius: 4,
          },
          '::-webkit-scrollbar-thumb:hover': {
            background: '#718096',
          },
          '::selection': {
            background: 'rgba(102, 126, 234, 0.4)',
          },
        }}
      />
      {children}
    </>
  );
};
