import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getEnv } from '../config/env';
import { authStore } from '../store/authStore';
import { Endpoints } from './endpoints';

const { API_URL } = getEnv();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error: any) => void;
  config: AxiosRequestConfig;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      if (p.config.headers) p.config.headers.Authorization = `Bearer ${token}`;
      p.resolve(api(p.config));
    }
  });
  failedQueue = [];
};

// Request interceptor to attach token
api.interceptors.request.use(async (config) => {
  try {
    const token = await authStore.getState().getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

// Response interceptor to handle 401 and refresh token
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError & { config?: AxiosRequestConfig }) => {
    const originalConfig = error.config;

    if (!originalConfig) return Promise.reject(error);

    const status = error.response?.status;

    if (status === 401 && !(originalConfig as any)._retry) {
      (originalConfig as any)._retry = true;

      if (isRefreshing) {
        // queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalConfig });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await authStore.getState().getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${API_URL}${Endpoints.AUTH.REFRESH}`, { refreshToken });
        const data = res.data;
        const newToken = data?.token || data?.accessToken;
        const newRefresh = data?.refreshToken || data?.refresh_token || refreshToken;

        if (!newToken) throw new Error('Refresh failed');

        await authStore.getState().setTokens(newToken, newRefresh);

        processQueue(null, newToken);
        isRefreshing = false;

        if (originalConfig.headers) originalConfig.headers.Authorization = `Bearer ${newToken}`;
        return api(originalConfig);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        // logout on refresh failure
        try {
          await authStore.getState().logout();
        } catch (e) {}
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
