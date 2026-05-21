import React, { useState } from 'react';
import { Upload, ChevronDown, X, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { Loader } from '@components/ui/Loader';
import { useToast } from '../contexts/ToastContext';

// ---------------------------------------------------------------------------
// Mock data — replace with real API calls when backend is ready
// ---------------------------------------------------------------------------
const MOCK_EVENTS = [
  { id: 'e1', title: 'Summer Festival 2024' },
  { id: 'e2', title: 'Tech Conference Meetup' },
  { id: 'e3', title: "Sarah's Birthday Party" },
];
// ---------------------------------------------------------------------------

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export function UploadPhotos() {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const { showToast } = useToast();

  const selectedEvent = MOCK_EVENTS.find((e) => e.id === selectedEventId);

  const handleFilesSelected = (incoming: File[]) => {
    // Merge, deduplicating by name
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

    // TODO: Replace with real API call:
    // await eventService.uploadImages(selectedEventId, files);
    await new Promise((r) => setTimeout(r, 2000)); // simulate upload

    setUploadStatus('done');
    showToast(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded successfully!`, 'success');
  };

  const handleReset = () => {
    setFiles([]);
    setSelectedEventId('');
    setUploadStatus('idle');
  };

  const totalSizeMB = (files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(1);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Upload Photos</h1>
        <p className="text-gray-500">
          Select an event and upload photos in bulk. Our AI will process them automatically.
        </p>
      </div>

      {uploadStatus === 'done' ? (
        /* Success State */
        <Card className="p-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-black">Upload Complete!</h2>
          <p className="text-gray-500">
            <span className="font-semibold text-black">{files.length} photo{files.length > 1 ? 's' : ''}</span>{' '}
            uploaded to{' '}
            <span className="font-semibold text-black">{selectedEvent?.title}</span>.
          </p>
          <p className="text-sm text-gray-400">
            Our AI is now processing the images in the background. This may take a minute.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={handleReset}>
              Upload More Photos
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Step 1: Pick Event */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#FFD600] text-black text-xs font-bold flex items-center justify-center flex-shrink-0">
                1
              </span>
              <h2 className="font-semibold text-black">Select Event</h2>
            </div>
            <div className="relative">
              <select
                id="upload-event-select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD600] focus:border-transparent bg-white text-gray-800 transition-all"
              >
                <option value="">— Choose an event —</option>
                {MOCK_EVENTS.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </Card>

          {/* Step 2: Upload */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#FFD600] text-black text-xs font-bold flex items-center justify-center flex-shrink-0">
                2
              </span>
              <h2 className="font-semibold text-black">Add Photos</h2>
            </div>

            <FileUploadBox
              onFilesSelected={handleFilesSelected}
              multiple
              accept="image/*"
            />

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                  <span>
                    <span className="font-semibold text-black">{files.length}</span> file
                    {files.length > 1 ? 's' : ''} selected
                  </span>
                  <span>{totalSizeMB} MB total</span>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">{file.name}</p>
                        <p className="text-xs text-gray-400">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(file.name)}
                        className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
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
          <div className="flex gap-3">
            {files.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => setFiles([])}
                className="flex-shrink-0"
              >
                Clear All
              </Button>
            )}
            <Button
              className="flex-1 py-3 text-base"
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
      )}
    </div>
  );
}