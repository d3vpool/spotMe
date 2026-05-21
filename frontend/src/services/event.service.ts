import api from './api';
import type { Event, EventDetails, SearchResult } from '../types';

export const eventService = {
  getEvents: async () => {
    const response = await api.get<{ events: Event[] }>('/events');
    return response.data;
  },

  createEvent: async (data: { title: string; description: string; image?: File }) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    if (data.image) {
      formData.append('coverImage', data.image); // Or perhaps a separate cover image key, assuming EventImages for now
    }
    const response = await api.post<{ event: Event }>('/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getEventDetails: async (eventId: string) => {
    const response = await api.get<{ event: EventDetails }>(`/events/${eventId}`);
    return response.data;
  },

  uploadImages: async (eventId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('EventImages', file);
    });
    const response = await api.post(`/events/${eventId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  searchPrivateFaces: async (eventId: string, selfie: File) => {
    const formData = new FormData();
    formData.append('Selfie', selfie);
    const response = await api.post<{ result: SearchResult }>(`/events/${eventId}/search`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  searchPublicFaces: async (shareToken: string, selfie: File) => {
    const formData = new FormData();
    formData.append('Selfie', selfie);
    const response = await api.post<{ result: SearchResult }>(`/events/share/${shareToken}/search`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};
