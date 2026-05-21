export interface AuthResponse {
  token: string;
  user?: any;
}

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RegisterPayload {
  firstName: string;
  email: string;
  password?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  imageCount: number;
  thumbnailUrl?: string;
}

export interface EventImage {
  id: string;
  url: string;
}

export interface EventDetails extends Event {
  images: EventImage[];
}

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SearchResult {
  imageUrl: string;
  faces: FaceBoundingBox[];
}
