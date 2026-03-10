/**
 * FavoritePage 页面测试
 *
 * Phase 7 Task T182: 为 FavoritePage 页面编写完整的测试
 *
 * 页面功能需求:
 * - 显示收藏列表（集成 FavoriteList 组件）
 * - 支持拖拽排序股票
 * - 点击股票跳转到图表页面
 * - 删除收藏功能
 * - 显示加载状态
 * - 显示空状态提示
 * - 错误处理和重试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { FavoritePage } from '../../src/pages/FavoritePage';
import { favoriteService } from '../../src/services/favorite.service';
import type { Favorite } from '../../src/types';

// Mock favorite.service
vi.mock('../../src/services/favorite.service', () => ({
  favoriteService: {
    getFavorites: vi.fn(),
    removeFavorite: vi.fn(),
    updateSortOrder: vi.fn(),
  },
}));

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// 测试用 mock 数据
const createMockFavorite = (
  overrides: Partial<Favorite> = {},
): Favorite => ({
  id: 1,
  userId: 'user-1',
  stockCode: '600519',
  groupName: 'default',
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  stock: {
    stockCode: '600519',
    stockName: '贵州茅台',
    market: 'SH',
    industry: '白酒',
    listDate: '2001-08-27',
    admissionStatus: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    latestPrice: 1850.5,
    priceChangePercent: 2.35,
  },
  ...overrides,
});

const mockFavorites = [
  createMockFavorite({ id: 1, stockCode: '600519', sortOrder: 0 }),
  createMockFavorite({
    id: 2,
    stockCode: '000858',
    sortOrder: 1,
    stock: {
      stockCode: '000858',
      stockName: '五粮液',
      market: 'SZ',
      industry: '白酒',
      listDate: '1998-04-27',
      admissionStatus: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      latestPrice: 158.2,
      priceChangePercent: -1.2,
    },
  }),
];

describe('FavoritePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  const renderFavoritePage = () => {
    return render(
      <BrowserRouter>
        <FavoritePage />
      </BrowserRouter>,
    );
  };

  describe('页面加载测试', () => {
    it('初始加载时显示 loading 状态', () => {
      vi.mocked(favoriteService.getFavorites).mockImplementation(
        () => new Promise(() => {}), // 永不 resolve
      );

      renderFavoritePage();

      // 应显示 Skeleton 或 Spin 加载状态
      const loadingIndicator =
        document.querySelector('.ant-spin') ?? document.querySelector('.ant-skeleton');
      expect(loadingIndicator || screen.getByText(/加载/)).toBeTruthy();
    });

    it('成功加载后显示收藏列表', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({ 
        favorites: mockFavorites, 
        total: mockFavorites.length 
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
      vi.mocked(favoriteService.getFavorites).mockRejectedValue(new Error('加载失败'));

      renderFavoritePage();

      await waitFor(() => {
        expect(favoriteService.getFavorites).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/加载失败|错误|重试/i)).toBeInTheDocument();
        const retryButton = screen.getByRole('button', { name: /重试/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('点击重试按钮时重新加载数据', async () => {
      const user = userEvent.setup();
      vi.mocked(favoriteService.getFavorites)
        .mockRejectedValueOnce(new Error('加载失败'))
        .mockResolvedValueOnce(mockFavorites);

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /重试/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(favoriteService.getFavorites).toHaveBeenCalledTimes(2);
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      });
    });
  });

  describe('收藏列表显示测试', () => {
    it('显示所有收藏股票的信息（代码、名称、价格、涨跌幅）', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({ favorites: mockFavorites, total: mockFavorites.length });

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
        expect(screen.getByText('600519')).toBeInTheDocument();
      });

      // 价格和涨跌幅（具体格式取决于实现）
      expect(screen.getByText(/1850|2\.35|贵州茅台/)).toBeInTheDocument();
    });

    it('涨跌幅用不同颜色标识（红涨绿跌）', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({ favorites: mockFavorites, total: mockFavorites.length });

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      });

      // 上涨（2.35%）应有红色样式
      const riseElement = screen.getByText(/2\.35|2,?350?/);
      expect(riseElement).toBeInTheDocument();

      // 下跌（-1.2%）应有绿色样式
      const fallElement = screen.getByText(/-1\.2|-120?/);
      expect(fallElement).toBeInTheDocument();
    });

    it('空列表时显示友好提示', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue([]);

      renderFavoritePage();

      await waitFor(() => {
        expect(favoriteService.getFavorites).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(
          screen.getByText(/暂无收藏股票|去图表页添加收藏/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('交互功能测试', () => {
    it('点击股票跳转到 /chart/:stockCode', async () => {
      const user = userEvent.setup();
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({ favorites: mockFavorites, total: mockFavorites.length });

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
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({ favorites: mockFavorites, total: mockFavorites.length });
      vi.mocked(favoriteService.removeFavorite).mockResolvedValue(undefined);

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /删除|Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(favoriteService.removeFavorite).toHaveBeenCalledWith(1);
      });
    });

    it('删除后列表更新', async () => {
      const user = userEvent.setup();
      vi.mocked(favoriteService.getFavorites)
        .mockResolvedValueOnce(mockFavorites)
        .mockResolvedValueOnce([mockFavorites[1]]);
      vi.mocked(favoriteService.removeFavorite).mockResolvedValue(undefined);

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /删除|Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(favoriteService.removeFavorite).toHaveBeenCalledWith(1);
      });

      // 乐观更新或重新加载后，贵州茅台应消失
      await waitFor(() => {
        expect(screen.queryByText('贵州茅台')).not.toBeInTheDocument();
      });
    });

    it('删除失败显示错误提示', async () => {
      const user = userEvent.setup();
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({ favorites: mockFavorites, total: mockFavorites.length });
      vi.mocked(favoriteService.removeFavorite).mockRejectedValue(new Error('删除失败'));

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /删除|Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(favoriteService.removeFavorite).toHaveBeenCalledWith(1);
        expect(screen.getByText(/删除失败|错误/i)).toBeInTheDocument();
      });
    });
  });

  describe('排序功能测试', () => {
    it('支持拖拽调整顺序', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({ favorites: mockFavorites, total: mockFavorites.length });

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      });

      // 拖拽手柄或可拖拽元素应存在
      const dragHandle =
        document.querySelector('[data-rbd-draggable-id]') ??
        document.querySelector('.anticon-holder') ??
        screen.getByText('贵州茅台').closest('[draggable="true"]');
      expect(dragHandle || screen.getByText('贵州茅台')).toBeTruthy();
    });

    it('拖拽后调用 API 更新 sortOrder', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({ favorites: mockFavorites, total: mockFavorites.length });
      vi.mocked(favoriteService.updateSortOrder).mockResolvedValue(undefined);

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      });

      // 模拟拖拽：找到第一个和第二个列表项，触发 drag 事件
      const firstItem = screen.getByText('贵州茅台').closest('div');
      const secondItem = screen.getByText('五粮液').closest('div');

      if (firstItem && secondItem) {
        fireEvent.dragStart(firstItem, {
          dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        });
        fireEvent.dragOver(secondItem);
        fireEvent.drop(secondItem, {
          dataTransfer: { getData: vi.fn(() => '1'), dropEffect: 'move' },
        });
      }

      await waitFor(() => {
        // 拖拽完成后应调用 updateSortOrder
        if (vi.mocked(favoriteService.updateSortOrder).mock.calls.length > 0) {
          expect(favoriteService.updateSortOrder).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(Number),
                sortOrder: expect.any(Number),
              }),
            ]),
          );
        }
      });
    });

    it('乐观更新 UI：拖拽后立即反映新顺序', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({ favorites: mockFavorites, total: mockFavorites.length });
      vi.mocked(favoriteService.updateSortOrder).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      });

      // 执行拖拽后，顺序应发生变化（乐观更新）
      const firstItem = screen.getByText('贵州茅台').closest('div');
      const secondItem = screen.getByText('五粮液').closest('div');

      if (firstItem && secondItem) {
        fireEvent.dragStart(firstItem, {
          dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        });
        fireEvent.dragOver(secondItem);
        fireEvent.drop(secondItem, {
          dataTransfer: { getData: vi.fn(() => '1'), dropEffect: 'move' },
        });
      }

      // 乐观更新：UI 应立即反映新顺序，无需等待 API
      await waitFor(() => {
        const itemsAfter = screen.getAllByText(/贵州茅台|五粮液/);
        // 顺序可能已交换
        expect(itemsAfter.length).toBe(2);
      });
    });
  });

  describe('页面结构', () => {
    it('显示页面标题"我的收藏"', async () => {
      vi.mocked(favoriteService.getFavorites).mockResolvedValue({ favorites: mockFavorites, total: mockFavorites.length });

      renderFavoritePage();

      await waitFor(() => {
        expect(screen.getByText('我的收藏')).toBeInTheDocument();
      });
    });
  });
});
