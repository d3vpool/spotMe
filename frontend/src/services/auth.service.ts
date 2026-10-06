import api from './api';
import { setToken, removeToken, removeUser } from '@utils/auth';
import type { LoginPayload, RegisterPayload, AuthResponse } from '../types';

export const authService = {
  login: async (data: LoginPayload) => {
    const response = await api.post<AuthResponse>('/user/login', data);
    // response.data is already unwrapped by the interceptor (just { token })
    if (response.data.token) {
      setToken(response.data.token);
    }
    return response.data;
  },

  register: async (data: RegisterPayload) => {
    const response = await api.post<AuthResponse>('/user/signup', data);
    // response.data is already unwrapped by the interceptor (just { token })
    if (response.data.token) {
      setToken(response.data.token);
    }
    return response.data;
  },

  logout: () => {
    removeToken();
    removeUser();
    window.location.href = '/login';
  }
};
