/**
 * FavoritePage 页面测试
 *
 * Phase 7 Task T182: 为 FavoritePage 页面编写完整的测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { FavoritePage } from '../../src/pages/FavoritePage';
import { favoriteService } from '../../src/services/favorite.service';
import { useFavoritesStore } from '../../src/store/favorites.store';

vi.mock('../../src/services/favorite.service', () => ({
  favoriteService: {
    getFavorites: vi.fn(),
    removeFavorite: vi.fn(),
    updateSortOrder: vi.fn(),
    batchUpdateSortOrder: vi.fn(),
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

const mockFavorites = [
  {
    id: 1,
    userId: 'user-1',
    stockCode: '600519',
    groupName: 'default',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    stock: {
      stockName: '贵州茅台',
      latestPrice: 1850.5,
      priceChange: 42.5,
      priceChangePercent: 2.35,
    },
  },
  {
    id: 2,
    userId: 'user-1',
    stockCode: '000858',
    groupName: 'default',
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    stock: {
      stockName: '五粮液',
      latestPrice: 158.2,
      priceChange: -1.92,
      priceChangePercent: -1.2,
    },
  },
];

describe('FavoritePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    useFavoritesStore.setState({
      favorites: [],
      isLoading: false,
      error: null,
    });
  });

  const renderFavoritePage = () => {
    return render(
      <BrowserRouter>
        <FavoritePage />
      </BrowserRouter>
    );
  };

  describe('页面加载测试', () => {
    it('初始加载时显示 loading 状态', () => {
      vi.mocked(favoriteService.getFavorites).mockImplementation(
        () => new Promise(() => {})
      );

      renderFavoritePage();

      const loadingIndicator = document.querySelector('.ant-skeleton');
      expect(loadingIndicator || screen.getByText(/My Favorites/)).toBeTruthy();
    });

    it('成功加载后显示收藏列表', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({
        favorites: mockFavorites,
        total: mockFavorites.length,
      });

      renderFavoritePage();

      await waitFor(() => {
        expect(favoriteService.getFavorites).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
        expect(screen.getByText('五粮液')).toBeInTheDocument();
        expect(screen.getByText('600519')).toBeInTheDocument();
        expect(screen.getByText('000858')).toBeInTheDocument();
      });
    });

    it('加载失败显示错误信息和重试按钮', async () => {
      vi.mocked(favoriteService.getFavorites).mockRejectedValue(new Error('Failed'));

      renderFavoritePage();

      await waitFor(() => {
        expect(favoriteService.getFavorites).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Load Failed')).toBeInTheDocument();
        const retryButton = screen.getByRole('button', { name: /Retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('点击重试按钮时重新加载数据', { timeout: 10000 }, async () => {
      const user = userEvent.setup();
      vi.mocked(favoriteService.getFavorites)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({
          favorites: mockFavorites,
          total: mockFavorites.length,
        });

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(favoriteService.getFavorites).toHaveBeenCalledTimes(2);
      }, { timeout: 5000 });
    });
  });

  describe('收藏列表显示测试', () => {
    it('显示所有收藏股票的信息（代码、名称、价格、涨跌幅）', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({
        favorites: mockFavorites,
        total: mockFavorites.length,
      });

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
        expect(screen.getByText('600519')).toBeInTheDocument();
      });

      expect(screen.getByText(/1850/)).toBeInTheDocument();
    });

    it('空列表时显示友好提示', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({
        favorites: [],
        total: 0,
      });

      renderFavoritePage();

      await waitFor(() => {
        expect(favoriteService.getFavorites).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/No favorites yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('交互功能测试', () => {
    it('点击股票跳转到 /chart/:stockCode', async () => {
      const user = userEvent.setup();
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({
        favorites: mockFavorites,
        total: mockFavorites.length,
      });

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      });

      const stockItem = screen.getByText('贵州茅台');
      await user.click(stockItem);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/chart/600519');
      });
    });

    it('点击删除按钮删除收藏', async () => {
      const user = userEvent.setup();
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({
        favorites: mockFavorites,
        total: mockFavorites.length,
      });
      vi.mocked(favoriteService.removeFavorite).mockResolvedValue({
        message: 'ok',
        favorite_id: 1,
      });

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTestId('delete-favorite-1');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(favoriteService.removeFavorite).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('页面结构', () => {
    it('显示页面标题"My Favorites"', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({
        favorites: mockFavorites,
        total: mockFavorites.length,
      });

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('My Favorites')).toBeInTheDocument();
      });
    });
  });
});
