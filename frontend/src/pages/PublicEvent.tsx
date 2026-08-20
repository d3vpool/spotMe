import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventService } from '@services/event.service';
import type { SearchMatch } from '../types';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { FaceHighlightImage } from '@components/ui/FaceHighlightImage';
import { useToast } from '../contexts/ToastContext';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Reticle } from '@components/ui/Reticle';
import { Scanline } from '@components/ui/Scanline';
import { HudTag } from '@components/ui/HudTag';
import { CameraCapture } from '@components/ui/CameraCapture';

interface PublicEventData {
  title: string;
  description?: string;
  images: { imageUrl: string }[];
}

export const PublicEvent: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();

  // Event Data
  const [eventData, setEventData] = useState<PublicEventData | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState('');

  // Gallery lightbox
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  // Search State
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[] | null>(null);
  const [matchIndex, setMatchIndex] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    if (!shareToken) return;
    const fetchEvent = async () => {
      try {
        const data = await eventService.getPublicEvent(shareToken);
        setEventData(data.event);
      } catch (err: any) {
        setEventError(err.response?.status === 404 ? 'This event is private or does not exist.' : 'Failed to load event.');
      } finally {
        setEventLoading(false);
      }
    };
    fetchEvent();
  }, [shareToken]);

  const handleSearch = async () => {
    if (!shareToken || !selfieFile) return;
    setSearching(true);
    setSearchMatches(null);
    setMatchIndex(0);
    try {
      const data = await eventService.searchPublicFaces(shareToken, selfieFile);
      setSearchMatches(data.matches);
      if (data.matches.length === 0) {
        showToast('No matches found for this selfie.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-bg-dark text-slate-100 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-40 glass-nav shadow-lg h-20 flex items-center px-4 sm:px-6 lg:px-8 border-b border-white/5">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
            <span className="text-2xl font-extrabold text-white tracking-tight">
              Spot<span className="text-brand-yellow">Me</span>
            </span>
            <Link to="/login" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
              Login
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-pulse w-full">
          <div className="h-80 bg-white/5 rounded-3xl shimmer-bg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 h-64 bg-white/5 rounded-2xl shimmer-bg" />
            <div className="lg:col-span-2 h-96 bg-white/5 rounded-2xl shimmer-bg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-nav shadow-lg h-20 flex items-center px-4 sm:px-6 lg:px-8 border-b border-white/5">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <span className="text-2xl font-extrabold text-white tracking-tight">
            Spot<span className="text-brand-yellow">Me</span>
          </span>
          <Link to="/login" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
            Login
          </Link>
        </div>
      </div>

      <div className="flex-grow max-w-7xl mx-auto px-4 py-8 space-y-8 w-full animate-[fade-in_0.35s_ease-out]">
        {eventError ? (
          <div className="text-center py-20 bg-red-500/5 border border-red-500/10 rounded-2xl max-w-md mx-auto">
            <p className="text-red-400 font-semibold mb-2">{eventError}</p>
            <p className="text-gray-500 text-sm">Please check the sharing URL and try again.</p>
          </div>
        ) : eventData ? (
          <>
            {/* Cover Header */}
            <div className="relative w-full h-[280px] md:h-[360px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl flex flex-col justify-end p-6 md:p-10 bg-slate-950">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 to-slate-950" />
              
              {/* Contrast Overlay Gradient: Works for bright and dark photos */}
              <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/60 to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col justify-end w-full">
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-2 tracking-tight leading-tight">
                  {eventData.title}
                </h1>
                {eventData.description && (
                  <p className="text-gray-300 text-sm sm:text-base max-w-2xl font-medium leading-relaxed">
                    {eventData.description}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Find My Photos */}
              <div className="lg:col-span-1">
                <Card className="p-6 bg-surface-dark/20 border-white/5 sticky top-24">
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="w-6 h-6 text-brand-yellow" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Find My Photos</h2>
                  </div>
                  <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                    Upload or take a selfie to instantly find all photos you appear in.
                  </p>

                  <div className="space-y-4">
                    {/* Selfie preview */}
                    {selfieFile && !searchMatches ? (
                      <div className="relative rounded-xl overflow-hidden bg-slate-950 h-48 border border-white/10">
                        <img src={URL.createObjectURL(selfieFile)} alt="Selfie preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setSelfieFile(null)}
                          className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : !searchMatches && (
                      <div className="space-y-3">
                        <FileUploadBox onFilesSelected={(files) => setSelfieFile(files[0])} accept="image/*" />
                        <button
                          onClick={() => setCameraOpen(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 hover:border-brand-yellow/50 bg-white/5 hover:bg-white/8 text-gray-300 hover:text-white text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-yellow cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          Click a Selfie
                        </button>
                      </div>
                    )}

                    {!searchMatches && selfieFile && (
                      <Button className="w-full text-base py-3" onClick={handleSearch} isLoading={searching}>
                        Search for my face
                      </Button>
                    )}

                    {/* Match results */}
                    {searchMatches && searchMatches.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-green-400 text-sm">
                            {searchMatches.length} photo{searchMatches.length > 1 ? 's' : ''} found!
                          </h3>
                          {searchMatches.length > 1 && (
                            <span className="text-xs text-gray-400 font-semibold">{matchIndex + 1} / {searchMatches.length}</span>
                          )}
                        </div>
                        <Reticle active className="border border-border-dark rounded-2xl overflow-hidden shadow-lg bg-slate-950 flex justify-center p-0">
                          <FaceHighlightImage
                            imageUrl={searchMatches[matchIndex].imageUrl}
                            faces={searchMatches[matchIndex].faces}
                          />
                        </Reticle>
                        {searchMatches.length > 1 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setMatchIndex(i => (i > 0 ? i - 1 : searchMatches.length - 1))}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-yellow cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" /> Prev
                            </button>
                            <button
                              onClick={() => setMatchIndex(i => (i < searchMatches.length - 1 ? i + 1 : 0))}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-yellow cursor-pointer"
                            >
                              Next <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <Button variant="secondary" className="w-full" onClick={() => { setSearchMatches(null); setSelfieFile(null); setMatchIndex(0); }}>
                          Search Again
                        </Button>
                      </div>
                    )}

                    {searchMatches && searchMatches.length === 0 && (
                      <div className="space-y-4">
                        <p className="text-center text-gray-400 text-sm py-6 bg-white/5 rounded-xl border border-white/5">
                          No photos of you were found.
                        </p>
                        <Button variant="secondary" className="w-full" onClick={() => { setSearchMatches(null); setSelfieFile(null); }}>
                          Try Again
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Column: Gallery */}
              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-2xl font-bold text-white tracking-tight border-b border-white/5 pb-3">
                  Event Gallery ({eventData.images?.length || 0})
                </h2>
                {eventData.images && eventData.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {eventData.images.map((img, index) => (
                      <div
                        key={index}
                        className="relative group aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-white/5 cursor-pointer"
                        style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' }}
                        onClick={() => setGalleryIndex(index)}
                      >
                        <img
                          src={img.imageUrl}
                          alt={`Event gallery item ${index + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 pointer-events-none" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24 bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
                    <p className="text-gray-400">No photos have been uploaded for this event yet.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Gallery Lightbox */}
      {galleryIndex !== null && eventData?.images && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery lightbox"
        >
          <button
            onClick={() => setGalleryIndex(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-yellow"
            aria-label="Close Lightbox"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={() => setGalleryIndex(i => (i! > 0 ? i! - 1 : eventData.images.length - 1))}
            className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-yellow"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <div className="max-w-[85vw] max-h-[85vh] relative flex items-center justify-center">
            <img
              src={eventData.images[galleryIndex].imageUrl}
              alt={`Preview ${galleryIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <div className="absolute -bottom-10 text-white/70 text-sm font-semibold">
              {galleryIndex + 1} / {eventData.images.length}
            </div>
          </div>
          <button
            onClick={() => setGalleryIndex(i => (i! < eventData.images.length - 1 ? i! + 1 : 0))}
            className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-yellow"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* Camera Capture Modal */}
      {cameraOpen && (
        <CameraCapture
          onCapture={(file) => setSelfieFile(file)}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
};
