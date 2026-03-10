import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../services/auth.service';
import { LoginRequest } from '../types';

/**
 * 认证 Hook
 * 封装认证相关的业务逻辑
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error, login: storeLogin, logout: storeLogout, setLoading, setError, clearError } = useAuthStore();

  /**
   * 登录
   */
  const login = useCallback(
    async (loginData: LoginRequest) => {
      try {
        setLoading(true);
        clearError();

        const response = await authService.login(loginData);
        
        // 存储到 store
        storeLogin(response.access_token, response.user);

        // 登录成功后跳转到首页
        navigate('/');
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || '登录失败，请重试';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [storeLogin, setLoading, setError, clearError, navigate],
  );

  /**
   * 登出
   */
  const logout = useCallback(() => {
    authService.logout();
    storeLogout();
    navigate('/login');
  }, [storeLogout, navigate]);

  /**
   * 获取当前用户信息
   */
  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const user = await authService.getMe();
      useAuthStore.setState({ user });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '获取用户信息失败';
      setError(errorMessage);
      // 如果获取用户信息失败（可能是 token 过期），则登出
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, logout]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    fetchCurrentUser,
    clearError,
  };
};
