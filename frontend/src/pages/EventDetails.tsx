import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService } from '@services/event.service';
import type { EventDetails as EventDetailsType, SearchMatch } from '../types';
import { Card } from '@components/ui/Card';
import { Loader } from '@components/ui/Loader';
import { Button } from '@components/ui/Button';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { ImageGrid } from '@components/ui/ImageGrid';
import { FaceHighlightImage } from '@components/ui/FaceHighlightImage';
import { Lightbox } from '@components/ui/Lightbox';
import { CameraCapture } from '@components/ui/CameraCapture';
import { useToast } from '../contexts/ToastContext';
import { Camera, Upload, Share2, Pencil, Trash2, Globe, Lock, X, ChevronLeft, ChevronRight } from 'lucide-react';

export const EventDetails: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [uploading, setUploading] = useState(false);

  // Search State
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[] | null>(null);
  const [matchIndex, setMatchIndex] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Event State
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Delete Image State
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // Toggle State
  const [toggling, setToggling] = useState(false);

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
      fetchEventDetails();
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!eventId || !selfieFile) return;
    setSearching(true);
    setSearchMatches(null);
    setMatchIndex(0);
    try {
      const data = await eventService.searchPrivateFaces(eventId, selfieFile);
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

  const handleDeleteImage = async (imageId: string) => {
    if (!eventId) return;
    setDeletingImageId(imageId);
    try {
      await eventService.deleteImage(eventId, imageId);
      // Optimistically remove from state
      setEvent(prev =>
        prev ? { ...prev, images: prev.images.filter(img => img.id !== imageId), imageCount: prev.imageCount - 1 } : prev
      );
      showToast('Image deleted.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete image', 'error');
    } finally {
      setDeletingImageId(null);
    }
  };

  const copyShareLink = () => {
    if (!event?.shareToken) return;
    const url = `${window.location.origin}/share/${event.shareToken}`;
    navigator.clipboard.writeText(url);
    showToast('Public link copied to clipboard!', 'success');
  };

  const openEdit = () => {
    if (!event) return;
    setEditTitle(event.title);
    setEditDescription(event.description || '');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!eventId) return;
    setSaving(true);
    try {
      await eventService.updateEvent(eventId, {
        newTitle: editTitle,
        newDescription: editDescription,
      });
      showToast('Event updated!', 'success');
      setEditOpen(false);
      fetchEventDetails();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;
    setDeleting(true);
    try {
      await eventService.deleteEvent(eventId);
      showToast('Event deleted.', 'success');
      navigate('/events');
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
      setDeleting(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!eventId || !event) return;
    setToggling(true);
    try {
      const data = await eventService.toggleVisibility(eventId);
      setEvent(prev => prev ? { ...prev, isPublic: data.event.isPublic } : prev);
      showToast(
        data.event.isPublic ? 'Event is now public. Share link is active!' : 'Event is now private.',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Toggle failed', 'error');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><Loader size="lg" /></div>;
  if (!event) return <div className="text-center py-20 text-red-500">Event not found</div>;

  return (
    <div className="space-y-8">
      {/* Cover Image */}
      {event.coverImageUrl && (
        <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-black mb-2">{event.title}</h1>
          {event.description && <p className="text-gray-500 max-w-2xl">{event.description}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggleVisibility}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
              event.isPublic
                ? 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100'
                : 'border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {toggling ? <Loader size="sm" /> : event.isPublic ? (
              <><Globe className="w-4 h-4" /> Public</>
            ) : (
              <><Lock className="w-4 h-4" /> Private</>
            )}
          </button>

          <Button onClick={copyShareLink} variant="secondary" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Share Link
          </Button>

          <button
            onClick={openEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>

          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
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
            <p className="text-sm text-gray-500 mb-4">Upload or take a selfie to find your photos in this event.</p>

            <div className="space-y-4">
              {/* Selfie preview */}
              {selfieFile && !searchMatches ? (
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
              ) : !searchMatches && (
                <div className="space-y-3">
                  <FileUploadBox onFilesSelected={(files) => setSelfieFile(files[0])} accept="image/*" />
                  {/* Camera option */}
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
                <Button className="w-full" onClick={handleSearch} isLoading={searching}>
                  Search for my face
                </Button>
              )}

              {/* Match results */}
              {searchMatches && searchMatches.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-green-600">
                      {searchMatches.length} photo{searchMatches.length > 1 ? 's' : ''} found!
                    </h3>
                    {searchMatches.length > 1 && (
                      <span className="text-xs text-gray-400">{matchIndex + 1} / {searchMatches.length}</span>
                    )}
                  </div>
                  <FaceHighlightImage
                    imageUrl={searchMatches[matchIndex].imageUrl}
                    faces={searchMatches[matchIndex].faces}
                  />
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
                  <Button variant="secondary" className="w-full" onClick={() => { setSearchMatches(null); setSelfieFile(null); setMatchIndex(0); }}>
                    Search Again
                  </Button>
                </div>
              )}

              {searchMatches && searchMatches.length === 0 && (
                <div className="space-y-4">
                  <p className="text-center text-gray-500 text-sm py-4 bg-gray-50 rounded-xl">No photos of you were found.</p>
                  <Button variant="secondary" className="w-full" onClick={() => { setSearchMatches(null); setSelfieFile(null); }}>
                    Try Again
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
                <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer">
                  <img
                    src={img.url}
                    alt={`Event image ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onClick={() => setLightboxIndex(index)}
                  />
                  {/* Delete overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 pointer-events-none" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }}
                    disabled={deletingImageId === img.id}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg disabled:opacity-60"
                    title="Delete image"
                  >
                    {deletingImageId === img.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </ImageGrid>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500">No images uploaded yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && event.images && (
        <Lightbox
          images={event.images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Camera Capture Modal */}
      {cameraOpen && (
        <CameraCapture
          onCapture={(file) => setSelfieFile(file)}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit Event</h2>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD600]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD600] resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSaveEdit} isLoading={saving}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold">Delete Event?</h2>
            <p className="text-gray-500 text-sm">This will permanently delete the event and all its photos. This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
