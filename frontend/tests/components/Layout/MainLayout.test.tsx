import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MainLayout } from '../../../src/components/Layout/MainLayout';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLayout = (initialPath = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <MainLayout>
          <div>Page Content</div>
        </MainLayout>
      </MemoryRouter>
    );
  };

  describe('Volume Surge navigation', () => {
    it('renders "Volume Surge" menu item in the navigation', () => {
      renderLayout();
      expect(screen.getByText('Volume Surge')).toBeInTheDocument();
    });

    it('navigates to /volume-surge-scan when clicked', async () => {
      const user = userEvent.setup();
      renderLayout();

      const menuItem = screen.getByText('Volume Surge');
      await user.click(menuItem);

      expect(mockNavigate).toHaveBeenCalledWith('/volume-surge-scan');
    });

    it('highlights Volume Surge menu item when location is /volume-surge-scan', () => {
      renderLayout('/volume-surge-scan');

      const menuItem = screen.getByText('Volume Surge').closest('li');
      expect(menuItem).toHaveClass('ant-menu-item-selected');
    });

    it('does not highlight Volume Surge when on a different page', () => {
      renderLayout('/chart');

      const menuItem = screen.getByText('Volume Surge').closest('li');
      expect(menuItem).not.toHaveClass('ant-menu-item-selected');
    });
  });

  describe('existing navigation items', () => {
    it('renders all expected menu items', () => {
      renderLayout();

      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('Screener')).toBeInTheDocument();
      expect(screen.getByText('VCP Scanner')).toBeInTheDocument();
      expect(screen.getByText('Volume Surge')).toBeInTheDocument();
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });
  });
});
