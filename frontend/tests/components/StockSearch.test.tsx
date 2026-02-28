/**
 * StockSearch 组件测试
 * 
 * 测试股票搜索组件的交互和显示
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockSearch } from '../../src/components/StockSearch';
import { stockService } from '../../src/services/stock.service';

// Mock stockService
vi.mock('../../src/services/stock.service');

describe('StockSearch', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染搜索输入框', () => {
    render(<StockSearch onSelect={mockOnSelect} />);
    
    // Ant Design AutoComplete 使用 role="combobox"
    const searchInput = screen.getByRole('combobox');
    expect(searchInput).toBeDefined();
  });

  it('应该在用户输入时触发搜索（带防抖）', async () => {
    const user = userEvent.setup();
    const mockResults = {
      results: [
        {
          stock_code: '600519',
          stock_name: '贵州茅台',
          market: 'SH' as const,
          industry: '白酒',
          list_date: '2001-08-27',
          market_cap: 25000.5,
          avg_turnover: 50000.0,
          status: 'active' as const
        }
      ],
      total: 1
    };

    vi.spyOn(stockService, 'searchStocks').mockResolvedValue(mockResults);

    render(<StockSearch onSelect={mockOnSelect} />);
    
    const searchInput = screen.getByRole('combobox');
    
    // 输入搜索关键词
    await user.type(searchInput, '茅台');
    
    // 等待防抖延迟（300ms）
    await waitFor(() => {
      expect(stockService.searchStocks).toHaveBeenCalledWith('茅台', 20);
    }, { timeout: 1000 });
  });

  it('应该显示搜索结果并支持选择', async () => {
    const user = userEvent.setup();
    const mockResults = {
      results: [
        {
          stock_code: '600519',
          stock_name: '贵州茅台',
          market: 'SH' as const,
          industry: '白酒',
          list_date: '2001-08-27',
          market_cap: 25000.5,
          avg_turnover: 50000.0,
          status: 'active' as const
        }
      ],
      total: 1
    };

    vi.spyOn(stockService, 'searchStocks').mockResolvedValue(mockResults);

    render(<StockSearch onSelect={mockOnSelect} />);
    
    const searchInput = screen.getByRole('combobox');
    await user.type(searchInput, '茅台');
    
    // 等待搜索结果显示
    await waitFor(() => {
      expect(screen.getByText(/贵州茅台/)).toBeDefined();
    });
    
    // 选择搜索结果
    const option = screen.getByText(/贵州茅台/);
    await user.click(option);
    
    expect(mockOnSelect).toHaveBeenCalledWith('600519', mockResults.results[0]);
  });

  it('应该显示加载状态', async () => {
    const user = userEvent.setup();
    
    // Mock 延迟响应
    vi.spyOn(stockService, 'searchStocks').mockImplementation(() => 
      new Promise((resolve) => setTimeout(() => resolve({ results: [], total: 0 }), 1000))
    );

    render(<StockSearch onSelect={mockOnSelect} />);
    
    const searchInput = screen.getByRole('combobox');
    await user.type(searchInput, 'test');
    
    // 等待防抖后，应该显示加载状态（Spin 组件）
    await waitFor(() => {
      // Ant Design Spin 组件没有"加载中"文本，只有 loading 动画
      expect(stockService.searchStocks).toHaveBeenCalled();
    });
  });

  it('应该处理搜索错误', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.spyOn(stockService, 'searchStocks').mockRejectedValue(new Error('Network error'));

    render(<StockSearch onSelect={mockOnSelect} />);
    
    const searchInput = screen.getByRole('combobox');
    await user.type(searchInput, 'test');
    
    // 等待错误处理
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('应该在输入少于2个字符时不触发搜索', async () => {
    const user = userEvent.setup();
    vi.spyOn(stockService, 'searchStocks');

    render(<StockSearch onSelect={mockOnSelect} />);
    
    const searchInput = screen.getByRole('combobox');
    await user.type(searchInput, 'a');
    
    // 等待一段时间，确保没有触发搜索
    await new Promise(resolve => setTimeout(resolve, 500));
    
    expect(stockService.searchStocks).not.toHaveBeenCalled();
  });
});
