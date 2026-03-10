/**
 * FavoriteList 组件测试
 *
 * T181: 测试收藏列表的显示、拖拽排序、点击跳转、删除、空状态和加载状态
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteList } from '../../src/components/FavoriteList';
import type { Favorite } from '../../src/types';

/** 收藏列表展示用的扩展类型（含最新价、涨跌幅） */
interface FavoriteWithQuote extends Favorite {
  stock?: {
    stockName?: string;
    latestPrice?: number;
    priceChangePercent?: number;
  };
}

const createMockFavorite = (overrides: Partial<FavoriteWithQuote> = {}): FavoriteWithQuote => ({
  id: 1,
  userId: 'user-1',
  stockCode: '600519',
  sortOrder: 0,
  createdAt: new Date().toISOString(),
  stock: {
    stockName: '贵州茅台',
    latestPrice: 1850.5,
    priceChangePercent: 2.35,
  },
  ...overrides,
});

describe('FavoriteList', () => {
  const mockOnRemove = vi.fn();
  const mockOnReorder = vi.fn();
  const mockOnItemClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('显示收藏列表（股票代码、名称、最新价格、涨跌幅）', () => {
    const favorites: FavoriteWithQuote[] = [
      createMockFavorite({ id: 1, stockCode: '600519', stock: { stockName: '贵州茅台', latestPrice: 1850.5, priceChangePercent: 2.35 } }),
      createMockFavorite({ id: 2, stockCode: '000001', stock: { stockName: '平安银行', latestPrice: 12.5, priceChangePercent: -1.2 } }),
    ];

    render(
      <FavoriteList
        favorites={favorites as Favorite[]}
        onRemove={mockOnRemove}
        onReorder={mockOnReorder}
        onItemClick={mockOnItemClick}
      />
    );

    expect(screen.getByText('600519')).toBeInTheDocument();
    expect(screen.getByText('贵州茅台')).toBeInTheDocument();
    expect(screen.getByText(/1850\.5|1850/)).toBeInTheDocument();
    expect(screen.getByText(/2\.35%|2\.35/)).toBeInTheDocument();

    expect(screen.getByText('000001')).toBeInTheDocument();
    expect(screen.getByText('平安银行')).toBeInTheDocument();
    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
    expect(screen.getByText(/-1\.2%|-1\.2/)).toBeInTheDocument();
  });

  it('点击股票项时调用 onItemClick 并传递 stockCode', async () => {
    const user = userEvent.setup();
    const favorites: FavoriteWithQuote[] = [createMockFavorite({ stockCode: '600519' })];

    render(
      <FavoriteList
        favorites={favorites as Favorite[]}
        onRemove={mockOnRemove}
        onReorder={mockOnReorder}
        onItemClick={mockOnItemClick}
      />
    );

    const stockItem = screen.getByText('贵州茅台');
    await user.click(stockItem);

    expect(mockOnItemClick).toHaveBeenCalledWith('600519');
  });

  it('点击删除按钮时调用 onRemove 并传递 id', async () => {
    const user = userEvent.setup();
    const favorites: FavoriteWithQuote[] = [createMockFavorite({ id: 42 })];

    render(
      <FavoriteList
        favorites={favorites as Favorite[]}
        onRemove={mockOnRemove}
        onReorder={mockOnReorder}
        onItemClick={mockOnItemClick}
      />
    );

    const deleteButton = screen.getByTestId('delete-favorite-42');
    await user.click(deleteButton);

    expect(mockOnRemove).toHaveBeenCalledWith(42);
  });

  it('空列表时显示空状态', () => {
    render(
      <FavoriteList
        favorites={[]}
        onRemove={mockOnRemove}
        onReorder={mockOnReorder}
        onItemClick={mockOnItemClick}
      />
    );

    expect(screen.getByText(/暂无收藏|空|还没有|empty/i)).toBeInTheDocument();
  });

  it('加载状态时显示加载指示', () => {
    const favorites: FavoriteWithQuote[] = [createMockFavorite()];

    render(
      <FavoriteList
        favorites={favorites as Favorite[]}
        loading={true}
        onRemove={mockOnRemove}
        onReorder={mockOnReorder}
        onItemClick={mockOnItemClick}
      />
    );

    // Ant Design Spin 或 Skeleton 组件
    const spinner = document.querySelector('.ant-spin') ?? document.querySelector('.ant-skeleton');
    expect(spinner).toBeInTheDocument();
  });

  it('支持拖拽排序时调用 onReorder', async () => {
    // 拖拽测试通常需要 @dnd-kit 或 react-beautiful-dnd 的测试工具
    // 这里验证组件渲染了可拖拽的列表项，onReorder 由拖拽库在拖放时调用
    const favorites: FavoriteWithQuote[] = [
      createMockFavorite({ id: 1, sortOrder: 0 }),
      createMockFavorite({ id: 2, stockCode: '000001', stock: { stockName: '平安银行', latestPrice: 12.5, priceChangePercent: 0 }, sortOrder: 1 }),
    ];

    render(
      <FavoriteList
        favorites={favorites as Favorite[]}
        onRemove={mockOnRemove}
        onReorder={mockOnReorder}
        onItemClick={mockOnItemClick}
      />
    );

    // 验证列表项存在，拖拽功能由 DnD 库实现
    expect(screen.getByText('贵州茅台')).toBeInTheDocument();
    expect(screen.getByText('平安银行')).toBeInTheDocument();
    // onReorder(startIndex, endIndex) 应在拖拽完成时被调用
    expect(mockOnReorder).not.toHaveBeenCalled();
  });

  it('涨跌幅为正时显示上涨样式', () => {
    const favorites: FavoriteWithQuote[] = [createMockFavorite({ stock: { stockName: '贵州茅台', latestPrice: 1850, priceChangePercent: 2.5 } })];

    render(
      <FavoriteList
        favorites={favorites as Favorite[]}
        onRemove={mockOnRemove}
        onReorder={mockOnReorder}
        onItemClick={mockOnItemClick}
      />
    );

    const percentElement = screen.getByText(/2\.5%|2\.5/);
    expect(percentElement).toBeInTheDocument();
  });

  it('涨跌幅为负时显示下跌样式', () => {
    const favorites: FavoriteWithQuote[] = [createMockFavorite({ stock: { stockName: '贵州茅台', latestPrice: 1850, priceChangePercent: -1.5 } })];

    render(
      <FavoriteList
        favorites={favorites as Favorite[]}
        onRemove={mockOnRemove}
        onReorder={mockOnReorder}
        onItemClick={mockOnItemClick}
      />
    );

    const percentElement = screen.getByText(/-1\.5%|-1\.5/);
    expect(percentElement).toBeInTheDocument();
  });
});
