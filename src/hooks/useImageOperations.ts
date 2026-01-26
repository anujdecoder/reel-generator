import { useCallback, useEffect } from 'react';
import type { ImageItem, TextOverlay, CropSettings, TransitionType } from '../types';

interface UseImageOperationsProps {
  images: ImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  selectedImage: ImageItem | null;
  setSelectedImage: React.Dispatch<React.SetStateAction<ImageItem | null>>;
}

export const useImageOperations = ({
  images,
  setImages,
  selectedImage,
  setSelectedImage,
}: UseImageOperationsProps) => {
  // Select first image when images change and no image is selected
  useEffect(() => {
    if (images.length > 0 && !selectedImage) {
      setSelectedImage(images[0]);
    } else if (images.length === 0) {
      setSelectedImage(null);
    } else if (selectedImage && !images.find(img => img.id === selectedImage.id)) {
      // If selected image was removed, select the first one
      setSelectedImage(images[0] || null);
    }
    // Only re-run when images array changes, not selectedImage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const handleImagesAdded = useCallback((newImages: ImageItem[]) => {
    setImages((prev) => [...prev, ...newImages]);
    // Select the first new image if nothing is selected
    if (newImages.length > 0 && !selectedImage) {
      setSelectedImage(newImages[0]);
    }
  }, [setImages, selectedImage, setSelectedImage]);

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, [setImages]);

  const handleReorderImages = useCallback((newImages: ImageItem[]) => {
    setImages(newImages);
  }, [setImages]);

  const handleSelectImage = useCallback((image: ImageItem) => {
    setSelectedImage(image);
  }, [setSelectedImage]);

  const handleSaveTextOverlay = useCallback((imageId: string, textOverlay: TextOverlay | undefined) => {
    setImages((prev) => 
      prev.map((img) => 
        img.id === imageId ? { ...img, textOverlay } : img
      )
    );
    // Update selected image if it's the one being edited (use functional update to avoid stale closure)
    setSelectedImage(prev => prev?.id === imageId ? { ...prev, textOverlay } : prev);
  }, [setImages, setSelectedImage]);

  const handleSaveCrop = useCallback((imageId: string, cropSettings: CropSettings, croppedDataUrl: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, cropSettings, croppedDataUrl } : img
      )
    );
    // Update selected image if it's the one being edited (use functional update to avoid stale closure)
    setSelectedImage(prev => prev?.id === imageId ? { ...prev, cropSettings, croppedDataUrl } : prev);
  }, [setImages, setSelectedImage]);

  const handleSaveTiming = useCallback((imageId: string, duration: number | undefined, transitionType: TransitionType | undefined) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, duration, transitionType } : img
      )
    );
    // Update selected image if it's the one being edited (use functional update to avoid stale closure)
    setSelectedImage(prev => prev?.id === imageId ? { ...prev, duration, transitionType } : prev);
  }, [setImages, setSelectedImage]);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to remove all images?')) {
      setImages([]);
      setSelectedImage(null);
    }
  }, [setImages, setSelectedImage]);

  return {
    handleImagesAdded,
    handleRemoveImage,
    handleReorderImages,
    handleSelectImage,
    handleSaveTextOverlay,
    handleSaveCrop,
    handleSaveTiming,
    handleClearAll,
  };
};
