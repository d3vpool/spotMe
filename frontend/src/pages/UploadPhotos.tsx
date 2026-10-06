import { useState, useEffect } from 'react';
import { Upload, ChevronDown, X, CheckCircle, FolderOpen } from 'lucide-react';
import { HudTag } from '@components/ui/HudTag';
import { Scanline } from '@components/ui/Scanline';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { useToast } from '../contexts/ToastContext';
import { eventService } from '@services/event.service';
import type { Event } from '../types';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';
type Tab = 'files' | 'drive';

export function UploadPhotos() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const { showToast } = useToast();

  // Processing progress state
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchProcessed, setBatchProcessed] = useState(0);
  const [batchFailed, setBatchFailed] = useState(0);

  // File upload state
  const [files, setFiles] = useState<File[]>([]);

  // Drive import state
  const [driveUrl, setDriveUrl] = useState('');
  const [driveImporting, setDriveImporting] = useState(false);

  useEffect(() => {
    eventService.getEvents().then((data) => {
      setEvents(data.events || []);
    }).catch(() => {
      showToast('Failed to load events', 'error');
    });
  }, []);

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
      const result = await eventService.uploadImages(selectedEventId, files);
      // Upload accepted — now poll for background processing
      setBatchId(result.batchId);
      setBatchTotal(result.totalImages);
      setBatchProcessed(0);
      setBatchFailed(0);
      setUploadStatus('processing');
      showToast(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded — processing started`, 'success');
    } catch (err: any) {
      setUploadStatus('error');
      showToast(err.message || 'Upload failed', 'error');
    }
  };

  // Poll batch status while processing
  useEffect(() => {
    if (uploadStatus !== 'processing' || !batchId || !selectedEventId) return;

    const interval = setInterval(async () => {
      try {
        const status = await eventService.getUploadStatus(selectedEventId, batchId);
        setBatchProcessed(status.completed);
        setBatchFailed(status.failed);

        if (status.status === 'completed' || status.status === 'completed_with_errors') {
          clearInterval(interval);
          setUploadStatus('done');
          if (status.status === 'completed_with_errors') {
            showToast(`Processing complete — ${status.failed} image(s) failed to process`, 'error');
          } else {
            showToast(`All ${status.completed} images processed successfully!`, 'success');
          }
        }
      } catch {
        // Ignore polling errors — keep trying
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [uploadStatus, batchId, selectedEventId]);

  const handleDriveImport = async () => {
    if (!selectedEventId || !driveUrl.trim()) return;
    setDriveImporting(true);
    try {
      const result = await eventService.importFromDrive(selectedEventId, driveUrl.trim());
      if (result.imported === 0 && result.totalFound === 0) {
        showToast('No images found in this folder', 'error');
      } else if (result.batchId) {
        // Transition to processing state — poll for progress
        setBatchId(result.batchId);
        setBatchTotal(result.imported);
        setBatchProcessed(0);
        setBatchFailed(0);
        setUploadStatus('processing');
        showToast(
          `Import started: ${result.imported} images queued (${result.skipped} skipped, ${result.totalFound} total found)`,
          'success'
        );
      } else {
        showToast(
          `Import complete: ${result.imported} imported, ${result.skipped} skipped`,
          'success'
        );
        setUploadStatus('done');
      }
      setDriveUrl('');
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setDriveImporting(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setSelectedEventId('');
    setDriveUrl('');
    setUploadStatus('idle');
    setBatchId(null);
    setBatchTotal(0);
    setBatchProcessed(0);
    setBatchFailed(0);
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
        <p className="text-xs text-gray-500 mt-2">
          Only upload photos of people who have consented to being in them.
          Demo instances may wipe data periodically.
        </p>
      </div>

      {uploadStatus === 'processing' ? (
        /* Processing State — poll progress */
        <Card className="p-10 flex flex-col items-center text-center gap-5 bg-surface-dark/20 border-white/5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center shadow-lg">
            <svg className="animate-spin w-8 h-8 text-brand-yellow" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-hi tracking-tight">Processing Photos...</h2>
          <p className="text-gray-300 max-w-md">
            <HudTag dot="yellow">{batchProcessed + batchFailed} / {batchTotal} PROCESSED</HudTag>
          </p>
          {/* Progress bar */}
          <div className="w-full max-w-sm">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-yellow rounded-full transition-all duration-500"
                style={{ width: `${((batchProcessed + batchFailed) / batchTotal) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {batchProcessed} succeeded{batchFailed > 0 ? `, ${batchFailed} failed` : ''} — keep this page open to track progress
            </p>
          </div>
        </Card>
      ) : uploadStatus === 'done' ? (
        /* Success State */
        <Card className="p-10 flex flex-col items-center text-center gap-5 bg-surface-dark/20 border-white/5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-lg animate-bounce">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-text-hi tracking-tight">Processing Complete!</h2>
          <p className="text-gray-300 max-w-md">
            <HudTag dot="green">{batchTotal} PHOTOS INDEXED</HudTag>
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

          {/* Step 2: Add Photos — Tab Toggle */}
          <Card className="p-6 bg-surface-dark/20 border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-brand-yellow text-bg-dark text-xs font-bold flex items-center justify-center flex-shrink-0">
                2
              </span>
              <h2 className="font-semibold text-white">Add Photos</h2>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2 mb-5 p-1 bg-white/5 rounded-xl">
              <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'files'
                    ? 'bg-brand-yellow text-bg-dark shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload Files
              </button>
              <button
                onClick={() => setActiveTab('drive')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'drive'
                    ? 'bg-brand-yellow text-bg-dark shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FolderOpen className="w-4 h-4 inline mr-2" />
                Import from Google Drive
              </button>
            </div>

            {/* Tab Content: File Upload */}
            {activeTab === 'files' && (
              <>
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
              </>
            )}

            {/* Tab Content: Drive Import */}
            {activeTab === 'drive' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Paste a Google Drive folder link (must be set to
                  <span className="text-white font-medium"> &quot;Anyone with the link can view&quot;</span>).
                  Only image files will be imported (max 200 per import, 10 MB each).
                </p>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow/50 bg-white/5 text-white placeholder-gray-500 transition-all"
                />
                <Button
                  onClick={handleDriveImport}
                  isLoading={driveImporting}
                  disabled={!selectedEventId || !driveUrl.trim()}
                  className="w-full py-3"
                >
                  {driveImporting ? 'Importing...' : 'Import from Drive'}
                </Button>
              </div>
            )}
          </Card>

          {/* Upload CTA — File Upload only */}
          {activeTab === 'files' && (
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
              <div className="relative flex-1">
                <Scanline active={uploadStatus === 'uploading'} />
                <Button
                  className="w-full py-3.5 text-base"
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
      )}
    </div>
  );
}
