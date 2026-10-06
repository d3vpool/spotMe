import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService } from '@services/event.service';
import type { EventDetails as EventDetailsType, SearchMatch } from '../types';
import { Card } from '@components/ui/Card';
import { Loader } from '@components/ui/Loader';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { ImageGrid } from '@components/ui/ImageGrid';
import { FaceHighlightImage } from '@components/ui/FaceHighlightImage';
import { Lightbox } from '@components/ui/Lightbox';
import { CameraCapture } from '@components/ui/CameraCapture';
import { useToast } from '../contexts/ToastContext';
import { Camera, Upload, Share2, Pencil, Trash2, Globe, Lock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Scanline } from '@components/ui/Scanline';

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
  const editModalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);

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

  // Handle ESC close for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditOpen(false);
        setDeleteConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        title: editTitle,
        description: editDescription,
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

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-80 bg-white/5 rounded-3xl shimmer-bg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="h-64 bg-white/5 rounded-2xl shimmer-bg" />
            <div className="h-64 bg-white/5 rounded-2xl shimmer-bg" />
          </div>
          <div className="lg:col-span-2 h-96 bg-white/5 rounded-2xl shimmer-bg" />
        </div>
      </div>
    );
  }

  if (!event) return <div className="text-center py-20 text-red-500">Event not found</div>;

  return (
    <div className="space-y-8 animate-[fade-in_0.35s_ease-out]">
      {/* Cover Header */}
      <div className="relative w-full h-[320px] md:h-[400px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl flex flex-col justify-end p-6 md:p-10 bg-slate-950">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover select-none"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 to-slate-950" />
        )}
        
        {/* Contrast Overlay Gradient: Works for bright and dark photos */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/60 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6 w-full">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight leading-tight">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-gray-300 text-sm sm:text-base max-w-2xl font-medium leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0 w-full md:w-auto">
            <button
              onClick={handleToggleVisibility}
              disabled={toggling}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none cursor-pointer ${
                event.isPublic
                  ? 'border-green-500/20 text-green-400 bg-green-500/10 hover:bg-green-500/20'
                  : 'border-white/10 text-gray-300 bg-white/5 hover:bg-white/10'
              }`}
              aria-label={event.isPublic ? "Toggle to Private" : "Toggle to Public"}
            >
              {toggling ? (
                <Loader size="sm" />
              ) : event.isPublic ? (
                <>
                  <Globe className="w-4 h-4" /> Public
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Private
                </>
              )}
            </button>

            <Button onClick={copyShareLink} variant="secondary" className="flex-1 md:flex-initial">
              <Share2 className="w-4 h-4" /> Share Link
            </Button>

            <button
              onClick={openEdit}
              className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5 focus-visible:ring-2 focus-visible:ring-brand-yellow cursor-pointer"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>

            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Search & Upload */}
        <div className="lg:col-span-1 space-y-8">
          {/* Find My Photos */}
          <Card className="p-6 bg-surface-dark/20">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-6 h-6 text-brand-yellow" />
              <h2 className="text-xl font-bold text-white tracking-tight">Find My Photos</h2>
            </div>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">
              Upload or take a selfie to find your photos in this event.
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
                <Button className="w-full" onClick={handleSearch} isLoading={searching}>
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
                  <FaceHighlightImage
                    imageUrl={searchMatches[matchIndex].imageUrl}
                    faces={searchMatches[matchIndex].faces}
                  />
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

          {/* Upload Images */}
          <Card className="p-6 bg-surface-dark/20">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-6 h-6 text-brand-yellow" />
              <h2 className="text-xl font-bold text-white tracking-tight">Upload Images</h2>
            </div>
            {uploading ? (
              <div className="relative py-8 flex flex-col items-center justify-center gap-4 overflow-hidden">
                <Scanline active />
                <Loader size="md" />
                <p className="text-sm text-text-mid font-medium">Uploading images...</p>
              </div>
            ) : (
              <FileUploadBox multiple onFilesSelected={handleUploadImages} accept="image/*" />
            )}
          </Card>
        </div>

        {/* Right Column: Gallery */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-white tracking-tight border-b border-white/5 pb-3">
            Gallery ({event.images?.length || 0})
          </h2>
          {event.images && event.images.length > 0 ? (
            <ImageGrid>
              {event.images.map((img, index) => (
                <div
                  key={img.id}
                  className="relative group aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-white/5 cursor-pointer"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '250px' }}
                >
                  <img
                    src={img.url}
                    alt={`Event gallery item ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onClick={() => setLightboxIndex(index)}
                  />
                  {/* Delete overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 pointer-events-none" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }}
                    disabled={deletingImageId === img.id}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-danger/90 hover:bg-danger text-white p-2 rounded-full shadow-lg disabled:opacity-60 focus-visible:opacity-100 cursor-pointer"
                    title="Delete image"
                    aria-label="Delete image"
                  >
                    {deletingImageId === img.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </ImageGrid>
          ) : (
            <div className="text-center py-24 bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
              <p className="text-gray-400">No images uploaded yet.</p>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Event Details"
          ref={editModalRef}
        >
          <div className="bg-surface-dark border border-white/10 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Edit Event</h2>
              <button 
                onClick={() => setEditOpen(false)} 
                className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white cursor-pointer"
                aria-label="Close edit dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                label="Title"
                type="text"
                value={editTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-yellow/50 resize-none"
                />
              </div>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Event Deletion"
          ref={deleteModalRef}
        >
          <div className="bg-surface-dark border border-white/10 rounded-3xl shadow-2xl w-full max-w-sm p-6 sm:p-8 space-y-5 text-center">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Delete Event?</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              This will permanently delete the event and all its photos. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-60 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500"
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
