import api from './api';
import { LoginRequest, LoginResponse, User } from '../types';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * 认证服务
 * 处理用户登录、登出和用户信息获取
 */
class AuthService {
  /**
   * 用户登录
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    return api.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, loginData);
  }

  /**
   * 获取当前用户信息
   */
  async getMe(): Promise<User> {
    return api.get<User>(API_ENDPOINTS.AUTH.ME);
  }

  /**
   * 用户登出
   * 清除本地存储的 token
   */
  logout(): void {
    localStorage.removeItem('access_token');
  }

  /**
   * 检查用户是否已登录
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  /**
   * 获取存储的 token
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

export const authService = new AuthService();
export default authService;
