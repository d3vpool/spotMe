import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { eventService } from '@services/event.service';
import type { EventDetails as EventDetailsType, SearchResult } from '../types';
import { Card } from '@components/ui/Card';
import { Loader } from '@components/ui/Loader';
import { Button } from '@components/ui/Button';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { ImageGrid } from '@components/ui/ImageGrid';
import { ImageCard } from '@components/ui/ImageCard';
import { FaceHighlightImage } from '@components/ui/FaceHighlightImage';
import { Lightbox } from '@components/ui/Lightbox';
import { useToast } from '../contexts/ToastContext';
import { Camera, Upload, Share2 } from 'lucide-react';

export const EventDetails: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [uploading, setUploading] = useState(false);
  
  // Search State
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  const { showToast } = useToast();

  const fetchEventDetails = async () => {
    if (!eventId) return;
    try {
      const data = await eventService.getEventDetails(eventId);
      setEvent(data.event);
    } catch (err: any) {
      showToast(err.message || 'Failed to load event details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const handleUploadImages = async (files: File[]) => {
    if (!eventId) return;
    setUploading(true);
    try {
      await eventService.uploadImages(eventId, files);
      showToast('Images uploaded successfully', 'success');
      fetchEventDetails(); // refresh
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!eventId || !selfieFile) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const data = await eventService.searchPrivateFaces(eventId, selfieFile);
      setSearchResult(data.result);
      if (data.result.faces.length === 0) {
         showToast('No matches found for this selfie.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const copyShareLink = () => {
    // Assuming the share token is the same as eventId or is returned from API.
    // For now, we will use eventId to mock a share link.
    const url = `${window.location.origin}/share/${eventId}`;
    navigator.clipboard.writeText(url);
    showToast('Public link copied to clipboard!', 'success');
  };

  if (loading) return <div className="py-20 flex justify-center"><Loader size="lg" /></div>;
  if (!event) return <div className="text-center py-20 text-red-500">Event not found</div>;

  return (
    <div className="space-y-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-bold text-black mb-2">{event.title}</h1>
          {event.description && <p className="text-gray-500 max-w-2xl">{event.description}</p>}
        </div>
        <Button onClick={copyShareLink} variant="secondary" className="flex items-center gap-2">
          <Share2 className="w-4 h-4" /> Share Public Link
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Search & Upload */}
        <div className="lg:col-span-1 space-y-8">
          {/* Find My Photos */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-6 h-6 text-[#FFD600]" />
              <h2 className="text-xl font-bold">Find My Photos</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Upload a selfie to find photos of you in this event gallery.</p>
            
            <div className="space-y-4">
              {selfieFile && !searchResult ? (
                <div className="relative rounded-xl overflow-hidden bg-gray-100 h-48 border border-gray-200">
                  <img src={URL.createObjectURL(selfieFile)} alt="Selfie" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setSelfieFile(null)}
                    className="absolute top-2 right-2 bg-white text-red-500 px-3 py-1 rounded-full text-sm font-medium shadow"
                  >
                    Remove
                  </button>
                </div>
              ) : !searchResult && (
                <FileUploadBox onFilesSelected={(files) => setSelfieFile(files[0])} accept="image/*" />
              )}
              
              {!searchResult && selfieFile && (
                <Button className="w-full" onClick={handleSearch} isLoading={searching}>
                  Search for my face
                </Button>
              )}

              {searchResult && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-green-600">Match Found!</h3>
                  <FaceHighlightImage imageUrl={searchResult.imageUrl} faces={searchResult.faces} />
                  <Button variant="secondary" className="w-full" onClick={() => { setSearchResult(null); setSelfieFile(null); }}>
                    Search Again
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Upload Images */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-6 h-6 text-[#FFD600]" />
              <h2 className="text-xl font-bold">Upload Images</h2>
            </div>
            {uploading ? (
               <div className="py-8 flex flex-col items-center justify-center">
                 <Loader size="md" />
                 <p className="mt-4 text-sm text-gray-500">Uploading images...</p>
               </div>
            ) : (
              <FileUploadBox multiple onFilesSelected={handleUploadImages} accept="image/*" />
            )}
          </Card>
        </div>

        {/* Right Column: Gallery */}
        <div className="lg:col-span-2 space-y-6">
           <h2 className="text-2xl font-bold border-b pb-2">Gallery ({event.images?.length || 0})</h2>
           {event.images && event.images.length > 0 ? (
             <ImageGrid>
               {event.images.map((img, index) => (
                 <ImageCard key={img.id} url={img.url} onClick={() => setLightboxIndex(index)} />
               ))}
             </ImageGrid>
           ) : (
             <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-500">No images uploaded yet.</p>
             </div>
           )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && event.images && (
        <Lightbox 
          images={event.images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
};
