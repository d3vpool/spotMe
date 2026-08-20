import React, { useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { HudTag } from './HudTag';

interface LightboxProps {
  images: { id: string; url: string }[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ images, currentIndex, onClose, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') onNavigate(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
    if (e.key === 'ArrowRight') onNavigate(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
    
    // Trap focus in dialog
    if (e.key === 'Tab' && containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusableElements[0] as HTMLElement;
      const last = focusableElements[focusableElements.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }, [currentIndex, images.length, onClose, onNavigate]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!images || images.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-300 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Photo Lightbox"
    >
      {/* Close button */}
      <button 
        ref={closeButtonRef}
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/15 rounded-full text-white transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none"
        aria-label="Close Lightbox"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation Left */}
      <button 
        onClick={() => onNavigate(currentIndex > 0 ? currentIndex - 1 : images.length - 1)}
        className="absolute left-4 p-4 bg-white/5 hover:bg-white/15 rounded-full text-white transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none active:scale-95"
        aria-label="Previous photo"
        aria-keyshortcuts="ArrowLeft"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>

      {/* Main Image Container */}
      <div className="max-w-[85vw] max-h-[85vh] relative flex flex-col items-center justify-center">
        <img 
          src={images[currentIndex].url} 
          alt={`Preview image ${currentIndex + 1} of ${images.length}`} 
          className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl transition-all duration-300 animate-[fade-in_0.3s_ease-out]"
          key={images[currentIndex].id}
        />
        <div className="mt-4">
          <HudTag>{String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</HudTag>
        </div>
      </div>

      {/* Navigation Right */}
      <button 
        onClick={() => onNavigate(currentIndex < images.length - 1 ? currentIndex + 1 : 0)}
        className="absolute right-4 p-4 bg-white/5 hover:bg-white/15 rounded-full text-white transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none active:scale-95"
        aria-label="Next photo"
        aria-keyshortcuts="ArrowRight"
      >
        <ChevronRight className="w-8 h-8" />
      </button>
    </div>
  );
};
