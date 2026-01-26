import { useCallback, useEffect } from 'react';
import type { TextItem, AnimationType, TextPosition } from '../types';

interface UseTextOperationsProps {
  texts: TextItem[];
  setTexts: React.Dispatch<React.SetStateAction<TextItem[]>>;
  selectedText: TextItem | null;
  setSelectedText: React.Dispatch<React.SetStateAction<TextItem | null>>;
}

export const useTextOperations = ({
  texts,
  setTexts,
  selectedText,
  setSelectedText,
}: UseTextOperationsProps) => {
  // Select first text when texts change and no text is selected
  useEffect(() => {
    if (texts.length > 0 && !selectedText) {
      setSelectedText(texts[0]);
    } else if (texts.length === 0) {
      setSelectedText(null);
    } else if (selectedText && !texts.find(txt => txt.id === selectedText.id)) {
      // If selected text was removed, select the first one
      setSelectedText(texts[0] || null);
    }
    // Only re-run when texts array changes, not selectedText
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texts]);

  const handleAddText = useCallback((content: string = '') => {
    const newText: TextItem = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      animationType: 'fadeIn',
      duration: 3000,
      fontSize: 48,
      fontColor: '#ffffff',
      fontWeight: 'bold',
      textAlign: 'center',
      position: 'center',
    };
    setTexts((prev) => [...prev, newText]);
    if (!selectedText) {
      setSelectedText(newText);
    }
  }, [setTexts, selectedText, setSelectedText]);

  const handleRemoveText = useCallback((id: string) => {
    setTexts((prev) => prev.filter((txt) => txt.id !== id));
  }, [setTexts]);

  const handleReorderTexts = useCallback((newTexts: TextItem[]) => {
    setTexts(newTexts);
  }, [setTexts]);

  const handleSelectText = useCallback((text: TextItem) => {
    setSelectedText(text);
  }, [setSelectedText]);

  const handleSaveText = useCallback((textId: string, updates: Partial<TextItem>) => {
    setTexts((prev) =>
      prev.map((txt) =>
        txt.id === textId ? { ...txt, ...updates } : txt
      )
    );
    // Update selected text if it's the one being edited
    setSelectedText(prev => prev?.id === textId ? { ...prev, ...updates } : prev);
  }, [setTexts, setSelectedText]);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to remove all texts?')) {
      setTexts([]);
      setSelectedText(null);
    }
  }, [setTexts, setSelectedText]);

  return {
    handleAddText,
    handleRemoveText,
    handleReorderTexts,
    handleSelectText,
    handleSaveText,
    handleClearAll,
  };
};