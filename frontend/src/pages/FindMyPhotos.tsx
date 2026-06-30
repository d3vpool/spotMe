import React, { useState, useEffect } from 'react';
import { Camera, ChevronDown } from 'lucide-react';
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
      setEvents(data.events);
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
      setSearchResult(data.result);
      if (data.result.faces.length === 0) {
        showToast('No matches found for this selfie.', 'info');
      } else {
        showToast('Match found!', 'success');
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
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Find My Photos</h1>
        <p className="text-gray-500">
          Choose an event, upload a selfie, and we'll find every photo you appear in.
        </p>
      </div>

      {!searchResult ? (
        <Card className="p-6 md:p-8 space-y-8">
          {/* Step 1: Pick Event */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#FFD600] text-black text-xs font-bold flex items-center justify-center flex-shrink-0">
                1
              </span>
              <h2 className="font-semibold text-black">Select an Event</h2>
            </div>
            <div className="relative">
              <select
                id="event-select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD600] focus:border-transparent bg-white text-gray-800 transition-all"
              >
                <option value="">— Choose an event —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={String(ev.id)}>
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
              <span className="w-6 h-6 rounded-full bg-[#FFD600] text-black text-xs font-bold flex items-center justify-center flex-shrink-0">
                2
              </span>
              <h2 className="font-semibold text-black">Upload Your Selfie</h2>
            </div>

            {selfieFile ? (
              <div className="relative rounded-xl overflow-hidden bg-gray-100 h-52 border border-gray-200">
                <img
                  src={URL.createObjectURL(selfieFile)}
                  alt="Your selfie"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setSelfieFile(null)}
                  className="absolute top-3 right-3 bg-white text-red-500 px-3 py-1 rounded-full text-sm font-medium shadow hover:bg-red-50 transition-colors"
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
            className="w-full py-3 text-base"
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
        <Card className="p-6 md:p-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Camera className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-1">Match Found!</h2>
            <p className="text-gray-500 text-sm">
              Here's a photo of you from{' '}
              <span className="font-semibold text-black">{selectedEvent?.title}</span>.
            </p>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            <FaceHighlightImage
              imageUrl={searchResult.imageUrl}
              faces={searchResult.faces}
            />
          </div>

          <Button variant="secondary" className="w-full py-3" onClick={handleReset}>
            Search Another Event
          </Button>
        </Card>
      )}
    </div>
  );
}