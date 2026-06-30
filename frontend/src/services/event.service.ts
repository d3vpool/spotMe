import api from './api';
import type { Event, EventDetails, SearchMatch } from '../types';

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
      formData.append('coverImage', data.image);
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

  updateEvent: async (eventId: string, data: { newTitle?: string; newDescription?: string }) => {
    const response = await api.patch(`/events/${eventId}`, data);
    return response.data;
  },

  deleteEvent: async (eventId: string) => {
    const response = await api.delete(`/events/${eventId}`);
    return response.data;
  },

  toggleVisibility: async (eventId: string) => {
    const response = await api.patch<{ event: { id: number; isPublic: boolean } }>(
      `/events/${eventId}/visibility`
    );
    return response.data;
  },

  uploadImages: async (eventId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('EventImages', file);
    });
    const response = await api.post(`/events/${eventId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  searchPrivateFaces: async (eventId: string, selfie: File) => {
    const formData = new FormData();
    formData.append('Selfie', selfie);
    const response = await api.post<{ matches: SearchMatch[] }>(
      `/events/${eventId}/search`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  searchPublicFaces: async (shareToken: string, selfie: File) => {
    const formData = new FormData();
    formData.append('Selfie', selfie);
    const response = await api.post<{ matches: SearchMatch[] }>(
      `/events/share/${shareToken}/search`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  getPublicEvent: async (shareToken: string) => {
    const response = await api.get<{ event: { title: string; description?: string; images: { imageUrl: string }[] } }>(
      `/events/share/${shareToken}`
    );
    return response.data;
  },

  deleteImage: async (eventId: string, imageId: string) => {
    const response = await api.delete(`/events/${eventId}/images/${imageId}`);
    return response.data;
  },
};

