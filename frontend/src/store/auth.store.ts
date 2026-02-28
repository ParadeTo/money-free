import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * 认证状态管理 Store
 * 使用 Zustand 管理用户认证状态
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * 登录
       */
      login: (token: string, user: User) => {
        localStorage.setItem('access_token', token);
        set({
          token,
          user,
          isAuthenticated: true,
          error: null,
        });
      },

      /**
       * 登出
       */
      logout: () => {
        localStorage.removeItem('access_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      /**
       * 设置用户信息
       */
      setUser: (user: User) => {
        set({ user });
      },

      /**
       * 设置加载状态
       */
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      /**
       * 设置错误信息
       */
      setError: (error: string | null) => {
        set({ error });
      },

      /**
       * 清除错误信息
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
