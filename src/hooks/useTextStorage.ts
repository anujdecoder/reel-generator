import { useLocalStorage } from './useLocalStorage';
import type { TextItem } from '../types';

export const useTextStorage = () => {
  const [texts, setTexts] = useLocalStorage<TextItem[]>('text-animation-texts', []);

  return [texts, setTexts] as const;
};