import { useState, useEffect } from 'react';
import { Upload, ChevronDown, X, CheckCircle } from 'lucide-react';
import { HudTag } from '@components/ui/HudTag';
import { Scanline } from '@components/ui/Scanline';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { useToast } from '../contexts/ToastContext';
import { eventService } from '@services/event.service';
import type { Event } from '../types';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export function UploadPhotos() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const { showToast } = useToast();

  useEffect(() => {
    eventService.getEvents().then((data) => {
      setEvents(data.events || []);
    }).catch(() => {
      showToast('Failed to load events', 'error');
    });
  }, []);

  const selectedEvent = events.find((e) => String(e.id) === selectedEventId);

  const handleFilesSelected = (incoming: File[]) => {
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newOnes = incoming.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newOnes];
    });
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleUpload = async () => {
    if (!selectedEventId || files.length === 0) return;
    setUploadStatus('uploading');
    try {
      await eventService.uploadImages(selectedEventId, files);
      setUploadStatus('done');
      showToast(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded successfully!`, 'success');
    } catch (err: any) {
      setUploadStatus('error');
      showToast(err.message || 'Upload failed', 'error');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setSelectedEventId('');
    setUploadStatus('idle');
  };

  const totalSizeMB = (files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(1);

  return (
    <div className="max-w-3xl mx-auto animate-[fade-in_0.35s_ease-out]">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Upload Photos</h1>
        <p className="text-gray-400">
          Select an event and upload photos in bulk. Our AI will process them automatically.
        </p>
      </div>

      {uploadStatus === 'done' ? (
        /* Success State */
        <Card className="p-10 flex flex-col items-center text-center gap-5 bg-surface-dark/20 border-white/5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-lg animate-bounce">              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-text-hi tracking-tight">Upload Complete!</h2>
          <p className="text-gray-300 max-w-md">              <HudTag dot="green">{files.length} PHOTOS INDEXED</HudTag>
          </p>
          <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
            Our AI is now processing the images in the background. This may take a minute.
          </p>
          <div className="flex gap-3 pt-2 w-full max-w-xs">
            <Button variant="secondary" onClick={handleReset} className="w-full">
              Upload More Photos
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Step 1: Pick Event */}
          <Card className="p-6 bg-surface-dark/20 border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-brand-yellow text-bg-dark text-xs font-bold flex items-center justify-center flex-shrink-0">
                1
              </span>
              <h2 className="font-semibold text-white">Select Event</h2>
            </div>
            <div className="relative">
              <select
                id="upload-event-select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full appearance-none px-4 py-3 pr-10 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow/50 bg-white/5 text-white transition-all cursor-pointer"
              >
                <option value="" className="bg-bg-dark text-white">— Choose an event —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={String(ev.id)} className="bg-bg-dark text-white">
                    {ev.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </Card>

          {/* Step 2: Upload */}
          <Card className="p-6 bg-surface-dark/20 border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-brand-yellow text-bg-dark text-xs font-bold flex items-center justify-center flex-shrink-0">
                2
              </span>
              <h2 className="font-semibold text-white">Add Photos</h2>
            </div>

            <FileUploadBox
              onFilesSelected={handleFilesSelected}
              multiple
              accept="image/*"
            />

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center text-sm text-gray-400 mb-2">
                  <span>
                    <span className="font-semibold text-white">{files.length}</span> file
                    {files.length > 1 ? 's' : ''} selected
                  </span>
                  <span className="font-medium text-gray-300">{totalSizeMB} MB total</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center gap-3.5 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 flex-shrink-0">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(file.name)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors flex-shrink-0 cursor-pointer"
                        aria-label={`Remove file ${file.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Upload CTA */}
          <div className="flex gap-4">
            {files.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => setFiles([])}
                className="flex-shrink-0 px-6"
              >
                Clear All
              </Button>
            )}
            <div className="relative">
              <Scanline active={uploadStatus === 'uploading'} />
              <Button
                className="flex-1 py-3.5 text-base"
                onClick={handleUpload}
                isLoading={uploadStatus === 'uploading'}
                disabled={!selectedEventId || files.length === 0}
              >
              {uploadStatus === 'uploading' ? (
                'Uploading...'
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload {files.length > 0 ? `${files.length} Photo${files.length > 1 ? 's' : ''}` : 'Photos'}
                </>
              )}
            </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}