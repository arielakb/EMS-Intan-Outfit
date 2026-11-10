import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, AuthTokens } from '../types';

interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, tokens: AuthTokens) => void;
  logout: () => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      login: (user, tokens) =>
        set({ user, tokens, isAuthenticated: true }),

      logout: () =>
        set({ user: null, tokens: null, isAuthenticated: false }),

      setTokens: (tokens) =>
        set({ tokens }),

      setUser: (user) =>
        set({ user }),
    }),
    {
      name: 'intan-auth',
      partialize: (state) => ({ user: state.user, tokens: state.tokens, isAuthenticated: state.isAuthenticated }),
    }
  )
);

