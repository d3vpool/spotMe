import { useState, useEffect } from 'react';
import { Camera, ChevronDown } from 'lucide-react';
import { Reticle } from '@components/ui/Reticle';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { FaceHighlightImage } from '@components/ui/FaceHighlightImage';
import { useToast } from '../contexts/ToastContext';
import { eventService } from '@services/event.service';
import type { Event, SearchResult } from '../types';

export function FindMyPhotos() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    eventService.getEvents().then((data) => {
      setEvents(data.events || []);
    }).catch(() => {
      showToast('Failed to load events', 'error');
    });
  }, []);

  const selectedEvent = events.find((e) => String(e.id) === selectedEventId);

  const handleSearch = async () => {
    if (!selectedEventId || !selfieFile) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const data = await eventService.searchPrivateFaces(selectedEventId, selfieFile);
      // Fallback if data format differs
      const result = (data as any).result || (data as any).matches?.[0];
      if (result) {
        setSearchResult(result);
        showToast('Match found!', 'success');
      } else {
        showToast('No matches found for this selfie.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setSelfieFile(null);
    setSearchResult(null);
    setSelectedEventId('');
  };

  return (
    <div className="max-w-2xl mx-auto animate-[fade-in_0.35s_ease-out]">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Find My Photos</h1>
        <p className="text-gray-400">
          Choose an event, upload a selfie, and we'll find every photo you appear in.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Search only events you belong to — and only with a selfie of someone
          who has agreed to be searched. Demo instances may wipe data periodically.
        </p>
      </div>

      {!searchResult ? (
        <Card className="p-6 md:p-8 space-y-8 bg-surface-dark/20 border-white/5">
          {/* Step 1: Pick Event */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-brand-yellow text-bg-dark text-xs font-bold flex items-center justify-center flex-shrink-0">
                1
              </span>
              <h2 className="font-semibold text-white">Select an Event</h2>
            </div>
            <div className="relative">
              <select
                id="event-select"
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
          </div>

          {/* Step 2: Upload Selfie */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-brand-yellow text-bg-dark text-xs font-bold flex items-center justify-center flex-shrink-0">
                2
              </span>
              <h2 className="font-semibold text-white">Upload Your Selfie</h2>
            </div>

            {selfieFile ? (
              <div className="relative rounded-xl overflow-hidden bg-slate-950 h-52 border border-white/10">
                <img
                  src={URL.createObjectURL(selfieFile)}
                  alt="Your selfie preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setSelfieFile(null)}
                  className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <FileUploadBox
                onFilesSelected={(files) => setSelfieFile(files[0])}
                accept="image/*"
                multiple={false}
              />
            )}
          </div>

          {/* Search CTA */}
          <Button
            className="w-full py-3.5 text-base"
            onClick={handleSearch}
            isLoading={searching}
            disabled={!selectedEventId || !selfieFile}
          >
            <Camera className="w-5 h-5 mr-2" />
            {searching ? 'Searching...' : 'Find My Photos'}
          </Button>
        </Card>
      ) : (
        /* Result */
        <Card className="p-6 md:p-8 space-y-6 bg-surface-dark/20 border-white/5">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
              <Camera className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-400 mb-1">Match Found!</h2>
            <p className="text-gray-400 text-sm">
              Here's a photo of you from{' '}
              <span className="font-semibold text-white">{selectedEvent?.title}</span>.
            </p>
          </div>            <Reticle active className="rounded-2xl overflow-hidden border border-border-dark shadow-lg bg-slate-950 flex justify-center p-0">
            <FaceHighlightImage
              imageUrl={searchResult.imageUrl}
              faces={searchResult.faces}
            />
          </Reticle>

          <Button variant="secondary" className="w-full py-3" onClick={handleReset}>
            Search Another Event
          </Button>
        </Card>
      )}
    </div>
  );
}