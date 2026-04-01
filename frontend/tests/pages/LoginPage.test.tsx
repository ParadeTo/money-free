import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../../src/pages/LoginPage';
import { authService } from '../../src/services/auth.service';

vi.mock('../../src/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    getToken: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
  };

  it('should render login form', () => {
    renderLoginPage();

    expect(screen.getByText('StockHub')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Please enter username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Please enter password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    renderLoginPage();

    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter username')).toBeInTheDocument();
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

    vi.mocked(authService.login).mockResolvedValue(mockLoginResponse);

    renderLoginPage();

    const usernameInput = screen.getByPlaceholderText('Please enter username');
    const passwordInput = screen.getByPlaceholderText('Please enter password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'admin123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'admin123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should show error message on login failure', async () => {
    vi.mocked(authService.login).mockRejectedValue({
      response: {
        data: {
          message: 'Invalid credentials',
        },
      },
    });

    renderLoginPage();

    const usernameInput = screen.getByPlaceholderText('Please enter username');
    const passwordInput = screen.getByPlaceholderText('Please enter password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials|登录失败/)).toBeInTheDocument();
    });
  });

  it('should show loading state while submitting', async () => {
    vi.mocked(authService.login).mockImplementation(() => new Promise(() => {}));

    renderLoginPage();

    const usernameInput = screen.getByPlaceholderText('Please enter username');
    const passwordInput = screen.getByPlaceholderText('Please enter password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'admin123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Logging in/i)).toBeInTheDocument();
    });
  });
});
