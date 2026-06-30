import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventService } from '@services/event.service';
import type { SearchMatch } from '../types';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { FaceHighlightImage } from '@components/ui/FaceHighlightImage';
import { Loader } from '@components/ui/Loader';
import { useToast } from '../contexts/ToastContext';
import { Camera, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <span className="text-2xl font-bold text-black tracking-tight">
            Spot<span className="text-[#FFD600]">Me</span>
          </span>
          <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
            Login
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Event Info */}
        {eventLoading ? (
          <div className="flex justify-center py-8"><Loader size="lg" /></div>
        ) : eventError ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-red-100 shadow-sm">
            <p className="text-red-500 font-medium">{eventError}</p>
          </div>
        ) : eventData ? (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-black mb-2">{eventData.title}</h1>
              {eventData.description && (
                <p className="text-gray-500 max-w-xl mx-auto">{eventData.description}</p>
              )}
            </div>

            {/* Find My Photos Card */}
            <Card className="p-8 shadow-md max-w-xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#FFD600]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-[#FFD600]" />
                </div>
                <h2 className="text-2xl font-bold text-black mb-1">Find Your Photos</h2>
                <p className="text-gray-500 text-sm">Upload a selfie to instantly find all your photos from this event.</p>
              </div>

              <div className="space-y-6">
                {selfieFile && !searchMatches ? (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 h-64 border border-gray-200">
                    <img src={URL.createObjectURL(selfieFile)} alt="Selfie" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setSelfieFile(null)}
                      className="absolute top-4 right-4 bg-white text-red-500 px-4 py-2 rounded-full text-sm font-medium shadow hover:bg-red-50"
                    >
                      Remove &amp; Reselect
                    </button>
                  </div>
                ) : !searchMatches && (
                  <div className="space-y-3">
                    <FileUploadBox onFilesSelected={(files) => setSelfieFile(files[0])} accept="image/*" />
                    <button
                      onClick={() => setCameraOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#FFD600] hover:bg-[#FFD600]/5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-all duration-200"
                    >
                      <Camera className="w-4 h-4" />
                      Click a Selfie
                    </button>
                  </div>
                )}

                {!searchMatches && selfieFile && (
                  <Button className="w-full text-lg py-3" onClick={handleSearch} isLoading={searching}>
                    Search for my face
                  </Button>
                )}

                {searchMatches && searchMatches.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-green-600">
                        {searchMatches.length} photo{searchMatches.length > 1 ? 's' : ''} found!
                      </h3>
                      {searchMatches.length > 1 && (
                        <span className="text-xs text-gray-400">{matchIndex + 1} / {searchMatches.length}</span>
                      )}
                    </div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <FaceHighlightImage
                        imageUrl={searchMatches[matchIndex].imageUrl}
                        faces={searchMatches[matchIndex].faces}
                      />
                    </div>
                    {searchMatches.length > 1 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setMatchIndex(i => (i > 0 ? i - 1 : searchMatches.length - 1))}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" /> Prev
                        </button>
                        <button
                          onClick={() => setMatchIndex(i => (i < searchMatches.length - 1 ? i + 1 : 0))}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <Button variant="secondary" className="w-full py-3" onClick={() => { setSearchMatches(null); setSelfieFile(null); setMatchIndex(0); }}>
                      Search for another face
                    </Button>
                  </div>
                )}

                {searchMatches && searchMatches.length === 0 && (
                  <div className="space-y-4">
                    <p className="text-center text-gray-500 text-sm py-4 bg-gray-50 rounded-xl">No photos of you were found in this event.</p>
                    <Button variant="secondary" className="w-full py-3" onClick={() => { setSearchMatches(null); setSelfieFile(null); }}>
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Event Gallery */}
            {eventData.images && eventData.images.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-black border-b pb-2">
                  Event Gallery ({eventData.images.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {eventData.images.map((img, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setGalleryIndex(index)}
                    >
                      <img
                        src={img.imageUrl}
                        alt={`Event photo ${index + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {eventData.images && eventData.images.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">No photos have been uploaded for this event yet.</p>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Gallery Lightbox */}
      {galleryIndex !== null && eventData?.images && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <button
            onClick={() => setGalleryIndex(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            ✕
          </button>
          <button
            onClick={() => setGalleryIndex(i => (i! > 0 ? i! - 1 : eventData.images.length - 1))}
            className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <div className="max-w-[85vw] max-h-[85vh] relative flex items-center justify-center">
            <img
              src={eventData.images[galleryIndex].imageUrl}
              alt={`Preview ${galleryIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute -bottom-10 text-white/70 text-sm">
              {galleryIndex + 1} / {eventData.images.length}
            </div>
          </div>
          <button
            onClick={() => setGalleryIndex(i => (i! < eventData.images.length - 1 ? i! + 1 : 0))}
            className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
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
