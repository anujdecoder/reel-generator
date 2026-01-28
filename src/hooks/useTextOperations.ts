import { useCallback, useEffect } from 'react';
import type { TextItem } from '../types';
import { detectCode, highlightCode } from '../utils/codeHighlight';

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
    const { isCode, language } = detectCode(content);
    const newText: TextItem = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      animationType: isCode ? 'fadeIn' : 'typewriter',
      animationDuration: 1000,
      pauseDuration: 2000,
      fontSize: 48,
      fontColor: '#ffffff',
      fontWeight: 'bold',
      textAlign: 'center',
      position: 'center',
      isCode,
      language,
    };

    // Cache highlighted tokens if this is code
    if (isCode && language) {
      newText.highlightedTokens = highlightCode(content, language);
    }

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
      prev.map((txt) => {
        if (txt.id === textId) {
          const updated = { ...txt, ...updates };

          // Cache highlighted tokens for paragraphs
          if (updated.paragraphs) {
            updated.paragraphs.forEach(paragraph => {
              if (paragraph.isCode && paragraph.language && paragraph.content) {
                paragraph.highlightedTokens = highlightCode(paragraph.content, paragraph.language);
              } else if (!paragraph.isCode) {
                paragraph.highlightedTokens = undefined;
              }
            });
          } else if (updated.isCode && updated.language && updated.content && (updates.content || updates.language || updates.isCode !== txt.isCode)) {
            // Legacy single paragraph support
            updated.highlightedTokens = highlightCode(updated.content, updated.language);
          } else if (!updated.isCode) {
            updated.highlightedTokens = undefined;
          }

          return updated;
        }
        return txt;
      })
    );
    // Update selected text if it's the one being edited
    setSelectedText(prev => {
      if (prev?.id === textId) {
        const updated = { ...prev, ...updates };

        // Cache highlighted tokens for paragraphs
        if (updated.paragraphs) {
          updated.paragraphs.forEach(paragraph => {
            if (paragraph.isCode && paragraph.language && paragraph.content) {
              paragraph.highlightedTokens = highlightCode(paragraph.content, paragraph.language);
            } else if (!paragraph.isCode) {
              paragraph.highlightedTokens = undefined;
            }
          });
        } else if (updated.isCode && updated.language && updated.content && (updates.content || updates.language || updates.isCode !== prev.isCode)) {
          // Legacy single paragraph support
          updated.highlightedTokens = highlightCode(updated.content, updated.language);
        } else if (!updated.isCode) {
          updated.highlightedTokens = undefined;
        }

        return updated;
      }
      return prev;
    });
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