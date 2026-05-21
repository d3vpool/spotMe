import api from './api';
import { setToken, removeToken, setUser, removeUser } from '@utils/auth';
import type { LoginPayload, RegisterPayload, AuthResponse } from '../types';

export const authService = {
  login: async (data: LoginPayload) => {
    const response = await api.post<AuthResponse>('/user/login', data);
    if (response.data.token) {
      setToken(response.data.token);
      if (response.data.user) {
        setUser(response.data.user);
      }
    }
    return response.data;
  },

  register: async (data: RegisterPayload) => {
    const response = await api.post<AuthResponse>('/user/signup', data);
    if (response.data.token) {
      setToken(response.data.token);
      if (response.data.user) {
        setUser(response.data.user);
      }
    }
    return response.data;
  },

  logout: () => {
    removeToken();
    removeUser();
    window.location.href = '/login';
  }
};
