import { useState, useEffect, useCallback } from 'react';
import type { ImageItem } from '../types';

const DB_NAME = 'reel-generator-db';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

async function getAllImages(): Promise<ImageItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by createdAt to maintain order
      const images = request.result as ImageItem[];
      resolve(images.sort((a, b) => a.createdAt - b.createdAt));
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function saveImages(images: ImageItem[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Clear existing and add all images
    const clearRequest = store.clear();
    
    clearRequest.onsuccess = () => {
      images.forEach((image, index) => {
        // Update createdAt to maintain order
        store.add({ ...image, createdAt: index });
      });
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

async function clearAllImages(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export function useImageStorage(): [
  ImageItem[],
  (updater: ImageItem[] | ((prev: ImageItem[]) => ImageItem[])) => void,
  boolean,
  string | null
] {
  const [images, setImagesState] = useState<ImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load images on mount
  useEffect(() => {
    let mounted = true;

    getAllImages()
      .then((loadedImages) => {
        if (mounted) {
          setImagesState(loadedImages);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading images:', err);
        if (mounted) {
          setError('Failed to load images from storage');
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setImages = useCallback(
    (updater: ImageItem[] | ((prev: ImageItem[]) => ImageItem[])) => {
      setImagesState((prev) => {
        const newImages = typeof updater === 'function' ? updater(prev) : updater;

        // Save to IndexedDB asynchronously
        saveImages(newImages).catch((err) => {
          console.error('Error saving images:', err);
          setError('Failed to save images');
        });

        return newImages;
      });
    },
    []
  );

  return [images, setImages, isLoading, error];
}

export { clearAllImages };
