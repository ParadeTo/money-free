import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../../src/pages/LoginPage';
import { useAuthStore } from '../../src/store/auth.store';
import api from '../../src/services/api';

// Mock API service
vi.mock('../../src/services/api');

// Mock auth store
vi.mock('../../src/store/auth.store');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  const mockLogin = vi.fn();
  const mockSetLoading = vi.fn();
  const mockSetError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth store methods
    (useAuthStore as any).mockReturnValue({
      login: mockLogin,
      setLoading: mockSetLoading,
      setError: mockSetError,
      isLoading: false,
      error: null,
    });
  });

  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );
  };

  it('should render login form', () => {
    renderLoginPage();

    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    renderLoginPage();

    const submitButton = screen.getByRole('button', { name: '登录' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument();
      expect(screen.getByText('请输入密码')).toBeInTheDocument();
    });
  });

  it('should login successfully with correct credentials', async () => {
    const mockLoginResponse = {
      access_token: 'mock-token',
      user: {
        userId: 'test-user-id',
        username: 'admin',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    (api.post as any).mockResolvedValue(mockLoginResponse);

    renderLoginPage();

    // Fill in the form
    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const submitButton = screen.getByRole('button', { name: '登录' });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'admin123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'admin',
        password: 'admin123',
      });
      expect(mockLogin).toHaveBeenCalledWith(
        mockLoginResponse.access_token,
        mockLoginResponse.user,
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should show error message on login failure', async () => {
    const errorMessage = '用户名或密码错误';
    (api.post as any).mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    });

    renderLoginPage();

    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const submitButton = screen.getByRole('button', { name: '登录' });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(errorMessage);
    });
  });

  it('should disable submit button while loading', () => {
    (useAuthStore as any).mockReturnValue({
      login: mockLogin,
      setLoading: mockSetLoading,
      setError: mockSetError,
      isLoading: true,
      error: null,
    });

    renderLoginPage();

    const submitButton = screen.getByRole('button', { name: '登录中...' });
    expect(submitButton).toBeDisabled();
  });

  it('should display error message when present', () => {
    const errorMessage = '登录失败，请重试';
    (useAuthStore as any).mockReturnValue({
      login: mockLogin,
      setLoading: mockSetLoading,
      setError: mockSetError,
      isLoading: false,
      error: errorMessage,
    });

    renderLoginPage();

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
