import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '@services/event.service';
import type { Event } from '../types';
import { Card } from '@components/ui/Card';
import { useToast } from '../contexts/ToastContext';
import { Image as ImageIcon, Plus } from 'lucide-react';

export const MyEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await eventService.getEvents();
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
      showToast(err.message || 'Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center mb-8">
          <div className="h-10 w-48 bg-white/5 rounded-xl shimmer-bg" />
          <div className="h-10 w-32 bg-white/5 rounded-xl shimmer-bg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-white/5 border border-white/5 rounded-2xl shimmer-bg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fade-in_0.35s_ease-out]">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">My Events</h1>
        <button
          onClick={() => navigate('/create-event')}
          className="bg-brand-yellow text-bg-dark px-4 py-2.5 rounded-xl font-bold hover:bg-brand-yellow-hover transition-all duration-200 active:scale-95 shadow-[0_4px_15px_rgba(255,214,0,0.15)] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none"
        >
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </div>

      {error ? (
        <div className="text-center py-20 bg-red-500/5 border border-red-500/10 rounded-2xl">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchEvents} className="text-brand-yellow font-semibold hover:underline">Try Again</button>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
          <p className="text-gray-400 mb-4">You don't have any events yet.</p>
          <button onClick={() => navigate('/create-event')} className="text-brand-yellow font-semibold hover:underline">
            Create your first event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((event) => (
            <Card
              key={event.id}
              hoverable
              reticle
              onClick={() => navigate(`/events/${event.id}`)}
              className="group flex flex-col h-full bg-surface-dark/20"
            >
              <div className="h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-white/5">
                {event.thumbnailUrl ? (
                  <img
                    src={event.thumbnailUrl}
                    alt={event.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <ImageIcon className="w-12 h-12 text-white/10" />
                )}
                <div className="absolute top-3 right-3 bg-bg-dark/85 backdrop-blur-md px-2 py-1 rounded-md border border-brand-yellow/25 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-yellow" />
                  <span className="font-mono text-[11px] font-semibold text-brand-yellow tracking-wide">{event.imageCount || 0}</span>
                </div>
              </div>
              <div className="p-5 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-text-hi mb-1.5 line-clamp-1 group-hover:text-brand-yellow transition-colors">{event.title}</h3>
                  {event.description && <p className="text-text-mid text-sm line-clamp-2 leading-relaxed">{event.description}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
