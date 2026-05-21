import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '@services/event.service';
import type { Event } from '../types';
import { Card } from '@components/ui/Card';
import { Loader } from '@components/ui/Loader';
import { useToast } from '../contexts/ToastContext';
import { Image as ImageIcon } from 'lucide-react';

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

  if (loading) return <div className="py-20 flex justify-center"><Loader size="lg" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-black">My Events</h1>
        <button
          onClick={() => navigate('/create-event')}
          className="bg-[#FFD600] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#E6C200] transition-colors shadow-sm"
        >
          Create Event
        </button>
      </div>

      {error ? (
        <div className="text-center py-20 bg-red-50 rounded-2xl">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchEvents} className="text-[#FFD600] font-medium underline">Try Again</button>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500 mb-4">You don't have any events yet.</p>
          <button onClick={() => navigate('/create-event')} className="text-[#FFD600] font-medium hover:underline">
            Create your first event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((event) => (
            <Card
              key={event.id}
              hoverable
              onClick={() => navigate(`/events/${event.id}`)}
              className="group flex flex-col h-full"
            >
              <div className="h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                {event.thumbnailUrl ? (
                  <img
                    src={event.thumbnailUrl}
                    alt={event.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                )}
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {event.imageCount || 0}
                </div>
              </div>
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-black mb-1 line-clamp-1">{event.title}</h3>
                  {event.description && <p className="text-gray-500 text-sm line-clamp-2">{event.description}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
