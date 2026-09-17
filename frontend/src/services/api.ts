import axios from 'axios';
import { API_BASE_URL } from '@config/api.config';
import { getToken } from '@utils/auth';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Unwrap the envelope: { success, data, message? } → return data directly
    response.data = response.data.data;
    return response;
  },
  (error) => {
    // Extract error message from envelope: { success: false, error: { message } }
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    // Preserve the status code for callers that need it (e.g. 404 checks)
    const status = error.response?.status;
    return Promise.reject({ success: false, message, status });
  }
);

export default api;
