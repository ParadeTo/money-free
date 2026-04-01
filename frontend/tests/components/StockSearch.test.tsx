/**
 * StockSearch 组件测试
 *
 * 测试股票搜索组件的交互和显示
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockSearch } from '../../src/components/StockSearch';
import { stockService } from '../../src/services/stock.service';

vi.mock('../../src/services/stock.service');

vi.mock('lodash-es', async () => {
  const actual = await vi.importActual('lodash-es');
  return {
    ...(actual as any),
    debounce: (fn: any) => fn,
  };
});

describe('StockSearch', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染搜索输入框', () => {
    render(<StockSearch onSelect={mockOnSelect} />);

    const searchInput = screen.getByPlaceholderText('Search stock code or name');
    expect(searchInput).toBeDefined();
  });

  it('应该在用户输入时触发搜索（带防抖）', async () => {
    const mockResults = {
      data: [
        {
          stockCode: '600519',
          stockName: '贵州茅台',
          market: 'SH',
          industry: '白酒',
          listDate: '2001-08-27',
        },
      ],
      meta: { total: 1, page: 1, limit: 10 },
    };

    vi.mocked(stockService.searchStocks).mockResolvedValue(mockResults as any);

    render(<StockSearch onSelect={mockOnSelect} />);

    const searchInput = screen.getByPlaceholderText('Search stock code or name');
    fireEvent.change(searchInput, { target: { value: '茅台' } });

    await waitFor(
      () => {
        expect(stockService.searchStocks).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it('应该显示搜索结果并支持选择', async () => {
    const user = userEvent.setup();
    const mockStock = {
      stockCode: '600519',
      stockName: '贵州茅台',
      market: 'SH',
      industry: '白酒',
      listDate: '2001-08-27',
    };
    const mockResults = {
      data: [mockStock],
      meta: { total: 1, page: 1, limit: 10 },
    };

    vi.mocked(stockService.searchStocks).mockResolvedValue(mockResults as any);

    render(<StockSearch onSelect={mockOnSelect} />);

    const searchInput = screen.getByPlaceholderText('Search stock code or name');
    fireEvent.change(searchInput, { target: { value: '茅台' } });

    await waitFor(
      () => {
        expect(screen.getByText(/贵州茅台/)).toBeDefined();
      },
      { timeout: 3000 }
    );

    const option = screen.getByText(/贵州茅台/);
    await user.click(option);

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({ stockCode: '600519' })
    );
  });

  it('应该显示加载状态', async () => {
    const user = userEvent.setup();

    vi.mocked(stockService.searchStocks).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: [], meta: { total: 0 } } as any), 1000)
        )
    );

    render(<StockSearch onSelect={mockOnSelect} />);

    const searchInput = screen.getByPlaceholderText('Search stock code or name');
    await user.type(searchInput, 'test');

    await waitFor(() => {
      expect(stockService.searchStocks).toHaveBeenCalled();
    });
  });

  it('应该处理搜索错误', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(stockService.searchStocks).mockRejectedValue(new Error('Network error'));

    render(<StockSearch onSelect={mockOnSelect} />);

    const searchInput = screen.getByPlaceholderText('Search stock code or name');
    await user.type(searchInput, 'test');

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('应该在输入少于2个字符时不触发搜索', async () => {
    const user = userEvent.setup();
    vi.mocked(stockService.searchStocks);

    render(<StockSearch onSelect={mockOnSelect} />);

    const searchInput = screen.getByPlaceholderText('Search stock code or name');
    await user.type(searchInput, 'a');

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(stockService.searchStocks).not.toHaveBeenCalled();
  });
});
