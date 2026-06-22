import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Permission } from '@agbms/shared';
import { hasPermission } from '@agbms/shared';
import { api } from '@/shared/lib/api';

export interface Subsidiary {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  roleName: string;
  permissions: Permission[];
  subsidiaries: Subsidiary[];
  qrCode?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeSubsidiary: Subsidiary | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveSubsidiary: (subsidiary: Subsidiary | null) => void;
  can: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeSubsidiary: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const data = await api.post<{
          accessToken: string;
          refreshToken: string;
          user: User;
        }>('/auth/login', { email, password });

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        const refreshToken = get().refreshToken;
        try {
          await api.post('/auth/logout', { refreshToken });
        } catch {
          // ignore
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          activeSubsidiary: null,
          isAuthenticated: false,
        });
      },

      setActiveSubsidiary: (subsidiary) => set({ activeSubsidiary: subsidiary }),

      can: (permission) => {
        const { user } = get();
        if (!user) return false;
        return hasPermission(user.permissions, permission);
      },
    }),
    {
      name: 'agbms-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        activeSubsidiary: state.activeSubsidiary,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
