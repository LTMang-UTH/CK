import { create } from 'zustand';
import { LocalStorage } from '../services/storage';
import { AuthService } from '../services/authService';
import type { UserData } from '../types';

interface AuthStore {
  user: UserData | null;
  accessToken: string;
  username: string;
  isAuthenticated: boolean;
  lastError: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  setLastError: (error: string | null) => void;
  clearError: () => void;
}

// Initialize store from sessionStorage (tab-specific)
// Each tab will have its own auth state
const getInitialState = () => ({
  user: null,
  accessToken: LocalStorage.getAccessToken(),
  username: LocalStorage.getUsername(),
  isAuthenticated: false,
  lastError: null,
});

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...getInitialState(),

  login: async (username: string, password: string) => {
    try {
      const success = await AuthService.login(username, password);
      if (success) {
        const profile = await AuthService.getUserProfile();
        set({
          isAuthenticated: true,
          accessToken: LocalStorage.getAccessToken(),
          username: LocalStorage.getUsername(),
          user: profile?.data || null,
          lastError: null,
        });
        return true;
      } else {
        set({ lastError: 'Invalid username or password' });
        return false;
      }
    } catch (error: any) {
      set({ lastError: error.response?.data?.message || 'Login failed' });
      return false;
    }
  },

  register: async (username: string, password: string, email: string) => {
    try {
      const success = await AuthService.register(username, password, email);
      if (success) {
        set({ lastError: null });
        return true;
      } else {
        set({ lastError: 'Registration failed' });
        return false;
      }
    } catch (error: any) {
      set({ lastError: error.response?.data?.message || 'Registration failed' });
      return false;
    }
  },

  logout: async () => {
    await AuthService.logout();
    set({
      user: null,
      accessToken: '',
      username: '',
      isAuthenticated: false,
      lastError: null,
    });
  },

  checkAuth: async () => {
    const token = LocalStorage.getAccessToken();
    if (!token) {
      set({ isAuthenticated: false });
      return false;
    }

    try {
      const profile = await AuthService.getUserProfile();
      if (profile?.data) {
        set({
          isAuthenticated: true,
          user: profile.data,
          username: profile.data.username,
          accessToken: token,
        });
        return true;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }

    set({ isAuthenticated: false });
    return false;
  },

  setLastError: (error: string | null) => set({ lastError: error }),
  clearError: () => set({ lastError: null }),
}));

