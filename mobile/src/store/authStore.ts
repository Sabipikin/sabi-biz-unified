import create from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/axios';
import { Endpoints } from '../api/endpoints';

type User = { id?: string; email?: string; name?: string } | null;

type AuthState = {
  accessToken: string | null;
  refreshToken?: string | null;
  user: User;
  loading: boolean;
  setTokens: (accessToken: string | null, refreshToken?: string | null) => Promise<void>;
  login: (creds: { email: string; password: string }) => Promise<void>;
  register?: (data: { name: string; email: string; password: string; phone?: string }) => Promise<any>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  getToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  refreshToken: () => Promise<boolean>;
};

const TOKEN_KEY = 'SABI_ACCESS_TOKEN';
const REFRESH_KEY = 'SABI_REFRESH_TOKEN';

export const authStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  getToken: async () => {
    const token = get().accessToken || (await SecureStore.getItemAsync(TOKEN_KEY));
    return token || null;
  },
  getRefreshToken: async () => {
    const t = get().refreshToken || (await SecureStore.getItemAsync(REFRESH_KEY));
    return t || null;
  },
  setTokens: async (accessToken, refreshToken) => {
    if (accessToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    }
    set({ accessToken, refreshToken });
  },
  refreshToken: async () => {
    try {
      const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refresh) return false;
      // call refresh endpoint directly to avoid circular import issues
      const res = await fetch(`${(await import('../config/env')).getEnv().API_URL}${(await import('../api/endpoints')).Endpoints.AUTH.REFRESH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const newToken = data?.token || data?.accessToken;
      const newRefresh = data?.refreshToken || data?.refresh_token || refresh;
      if (!newToken) return false;
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      if (newRefresh) await SecureStore.setItemAsync(REFRESH_KEY, newRefresh);
      set({ accessToken: newToken, refreshToken: newRefresh || refresh });
      return true;
    } catch (err) {
      return false;
    }
  },
  login: async ({ email, password }) => {
    set({ loading: true });
    try {
      const res = await fetch(`${(await import('../config/env')).getEnv().API_URL}${(await import('../api/endpoints')).Endpoints.AUTH.LOGIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      const token = data?.token || data?.accessToken;
      const refresh = data?.refreshToken || data?.refresh_token;
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
        set({ accessToken: token, refreshToken: refresh || null, user: data.user });
      } else {
        throw new Error(data?.message || 'Login failed');
      }
    } finally {
      set({ loading: false });
    }
  },
  register: async ({ name, email, password, phone }: { name: string; email: string; password: string; phone?: string }) => {
    set({ loading: true });
    try {
      const res = await fetch(`${(await import('../config/env')).getEnv().API_URL}${(await import('../api/endpoints')).Endpoints.AUTH.REGISTER}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await res.json();
      const token = data?.token || data?.accessToken;
      const refresh = data?.refreshToken || data?.refresh_token;
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
        set({ accessToken: token, refreshToken: refresh || null, user: data.user });
      }
      return data;
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    set({ accessToken: null, user: null });
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
}));

// Ensure token is loaded on import
(async () => {
  const t = await SecureStore.getItemAsync(TOKEN_KEY);
  if (t) {
    authStore.setState({ accessToken: t, loading: false });
  } else {
    authStore.setState({ loading: false });
  }
})();

export default authStore;
