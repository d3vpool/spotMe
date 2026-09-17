import api from './api';
import type { Event, EventDetails, SearchMatch, UploadBatchStatus } from '../types';

export const eventService = {
  getEvents: async () => {
    // response.data is unwrapped by interceptor → { events: Event[] }
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
    // response.data is unwrapped → { event: Event }
    const response = await api.post<{ event: Event }>('/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getEventDetails: async (eventId: string) => {
    // response.data is unwrapped → { event: EventDetails }
    const response = await api.get<{ event: EventDetails }>(`/events/${eventId}`);
    return response.data;
  },

  updateEvent: async (eventId: string, data: { newTitle?: string; newDescription?: string }) => {
    // response.data is unwrapped → { updatedEvent: ... }
    const response = await api.patch(`/events/${eventId}`, data);
    return response.data;
  },

  deleteEvent: async (eventId: string) => {
    // response.data is unwrapped → null (data is null)
    const response = await api.delete(`/events/${eventId}`);
    return response.data;
  },

  toggleVisibility: async (eventId: string) => {
    // response.data is unwrapped → { event: { id, isPublic } }
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
    // response.data is unwrapped → { batchId, totalImages }
    const response = await api.post<{ batchId: string; totalImages: number }>(
      `/events/${eventId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  getUploadStatus: async (eventId: string, batchId: string) => {
    // response.data is unwrapped → UploadBatchStatus
    const response = await api.get<UploadBatchStatus>(
      `/events/${eventId}/upload-status/${batchId}`
    );
    return response.data;
  },

  searchPrivateFaces: async (eventId: string, selfie: File) => {
    const formData = new FormData();
    formData.append('Selfie', selfie);
    // response.data is unwrapped → { matches: SearchMatch[] }
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
    // response.data is unwrapped → { matches: SearchMatch[] }
    const response = await api.post<{ matches: SearchMatch[] }>(
      `/events/share/${shareToken}/search`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  getPublicEvent: async (shareToken: string) => {
    // response.data is unwrapped → { event: { title, description, images } }
    const response = await api.get<{ event: { title: string; description?: string; images: { imageUrl: string }[] } }>(
      `/events/share/${shareToken}`
    );
    return response.data;
  },

  deleteImage: async (eventId: string, imageId: string) => {
    // response.data is unwrapped → null
    const response = await api.delete(`/events/${eventId}/images/${imageId}`);
    return response.data;
  },

  importFromDrive: async (eventId: string, driveUrl: string) => {
    // response.data is unwrapped → { imported, skipped, totalFound }
    const response = await api.post<{ imported: number; skipped: number; totalFound: number }>(
      `/events/${eventId}/images/import-drive`,
      { driveUrl }
    );
    return response.data;
  },
};
