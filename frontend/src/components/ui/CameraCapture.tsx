import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Camera, RotateCcw, Check } from 'lucide-react';
import { Reticle } from './Reticle';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [starting, setStarting] = useState(true);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setError('');
    setStarting(true);
    setPreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied. Please allow camera permissions and try again.'
          : 'Could not access camera. Please ensure a camera is connected.'
      );
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    
    // Accessibility: Keyboard trap & Escape close
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode, startCamera]);

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    onClose();
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(dataUrl);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const handleRetake = () => {
    setPreview(null);
    startCamera(facingMode);
  };

  const handleFlip = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    setPreview(null);
    startCamera(next);
  };

  const handleUsePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      handleClose();
    }, 'image/jpeg', 0.9);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Camera Capture Modal"
    >
      <div
        ref={dialogRef}
        className="bg-surface-dark border border-white/10 rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-yellow" />
            Take a Selfie
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-yellow"
            aria-label="Close camera dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-center px-6">
              <Camera className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          ) : preview ? (
            <img src={preview} alt="Captured preview" className="w-full h-full object-cover" />
          ) : (
            <>
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                  <div className="w-8 h-8 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {/* Reticle bracket framing guide */}
              {!starting && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Reticle className="w-44 h-56">
                    <div className="w-full h-full" />
                  </Reticle>
                </div>
              )}
            </>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="px-6 py-5 flex items-center justify-center gap-6 bg-surface-dark">
          {!preview ? (
            <>
              <button
                onClick={handleFlip}
                disabled={starting || !!error}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-brand-yellow"
                title="Flip camera"
                aria-label="Flip camera"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={handleCapture}
                disabled={starting || !!error}
                className="w-20 h-20 rounded-full bg-white hover:bg-brand-yellow disabled:opacity-40 transition-all duration-300 flex items-center justify-center shadow-lg active:scale-95 group focus-visible:ring-2 focus-visible:ring-brand-yellow"
                title="Take photo"
                aria-label="Capture photo"
              >
                <div className="w-16 h-16 rounded-full border-4 border-slate-950/20 group-hover:border-slate-950/40 transition-colors" />
              </button>

              <div className="w-12 h-12" /> {/* spacer */}
            </>
          ) : (
            <>
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-yellow"
              >
                <RotateCcw className="w-4 h-4" /> Retake
              </button>
              <button
                onClick={handleUsePhoto}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-yellow hover:bg-brand-yellow-hover text-bg-dark text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-yellow"
              >
                <Check className="w-4 h-4" /> Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
