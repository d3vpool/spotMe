import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '@services/event.service';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Card } from '@components/ui/Card';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { useToast } from '../contexts/ToastContext';

export const CreateEvent: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await eventService.createEvent({ title, description, image: image || undefined });
      showToast('Event created successfully!', 'success');
      navigate(`/events/${data.event.id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create event', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Create New Event</h1>
        <p className="text-gray-500">Set up a gallery for your party or gathering.</p>
      </div>

      <Card className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Event Title"
            placeholder="e.g. Sarah's Birthday Party"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          
          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
            <textarea
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD600] focus:border-transparent transition-all min-h-[100px] resize-y"
              placeholder="Tell people about this event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Event Cover Image (Optional)</label>
            {image ? (
              <div className="relative rounded-xl overflow-hidden bg-gray-100 h-48 border border-gray-200">
                <img src={URL.createObjectURL(image)} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 bg-white text-red-500 px-3 py-1 rounded-full text-sm font-medium shadow hover:bg-gray-50"
                >
                  Remove
                </button>
              </div>
            ) : (
              <FileUploadBox onFilesSelected={(files) => setImage(files[0])} multiple={false} accept="image/*" />
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate('/events')} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} className="flex-1">
              Create Event
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
