import { useState, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when state changes
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      
      try {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        // Handle QuotaExceededError specifically
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.error(`localStorage quota exceeded for key "${key}". Consider clearing some data.`);
        } else {
          console.error(`Error setting localStorage key "${key}":`, error);
        }
        // Still update state even if localStorage fails
      }
      
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue];
}
