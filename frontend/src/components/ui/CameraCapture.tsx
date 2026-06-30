import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Camera, RotateCcw, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [starting, setStarting] = useState(true);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    // Stop existing stream
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
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontally for front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(dataUrl);

    // Stop stream while showing preview
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
      onClose();
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-950 rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#FFD600]" />
            Take a Selfie
          </h2>
          <button
            onClick={() => {
              if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
              onClose();
            }}
            className="p-1.5 hover:bg-white/10 rounded-full text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {error ? (
            <div className="text-center px-6">
              <Camera className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          ) : preview ? (
            <img src={preview} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <>
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                  <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {/* Selfie guide oval */}
              {!starting && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-52 rounded-full border-2 border-[#FFD600]/60 border-dashed" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="px-4 py-4 flex items-center justify-center gap-4">
          {!preview ? (
            <>
              {/* Flip camera */}
              <button
                onClick={handleFlip}
                disabled={starting || !!error}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 transition-colors"
                title="Flip camera"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Capture shutter */}
              <button
                onClick={handleCapture}
                disabled={starting || !!error}
                className="w-16 h-16 rounded-full bg-white disabled:opacity-40 hover:bg-gray-100 transition-colors flex items-center justify-center shadow-lg"
                title="Take photo"
              >
                <div className="w-12 h-12 rounded-full border-4 border-gray-400" />
              </button>

              <div className="w-11 h-11" /> {/* spacer */}
            </>
          ) : (
            <>
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Retake
              </button>
              <button
                onClick={handleUsePhoto}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD600] hover:bg-[#E6C200] text-black text-sm font-semibold transition-colors"
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
