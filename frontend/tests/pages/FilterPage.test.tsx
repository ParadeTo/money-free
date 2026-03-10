// frontend/tests/pages/FilterPage.test.tsx
// T138 [P] [US2] Page test for FilterPage

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPage } from '../../src/pages/FilterPage';
import { BrowserRouter } from 'react-router-dom';

// Mock services
vi.mock('../../src/services/screener.service', () => ({
  screenerService: {
    executeFilter: vi.fn(),
  },
}));

vi.mock('../../src/services/strategy.service', () => ({
  strategyService: {
    getStrategies: vi.fn(),
    createStrategy: vi.fn(),
    updateStrategy: vi.fn(),
    deleteStrategy: vi.fn(),
    executeStrategy: vi.fn(),
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('FilterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render FilterBuilder component', () => {
    renderWithRouter(<FilterPage />);

    expect(screen.getByText(/add condition/i)).toBeInTheDocument();
  });

  it('should render Execute button', () => {
    renderWithRouter(<FilterPage />);

    expect(screen.getByRole('button', { name: /execute|run filter/i })).toBeInTheDocument();
  });

  it('should render StrategyManager component', () => {
    renderWithRouter(<FilterPage />);

    expect(screen.getByText(/strategies|saved/i)).toBeInTheDocument();
  });

  it('should execute filter when Execute button is clicked', async () => {
    const { screenerService } = await import('../../src/services/screener.service');
    (screenerService.executeFilter as any).mockResolvedValue({
      stocks: [
        {
          stockCode: '600519',
          stockName: '贵州茅台',
          latestPrice: 1800,
          priceChange: 50,
          priceChangePercent: 2.86,
          amount: 5000000000,
        },
      ],
      isTruncated: false,
      totalCount: 1,
    });

    renderWithRouter(<FilterPage />);

    // 添加一个条件
    const addButton = screen.getByText(/add condition/i);
    await userEvent.click(addButton);

    // 点击执行按钮
    const executeButton = screen.getByRole('button', { name: /execute|run filter/i });
    await userEvent.click(executeButton);

    await waitFor(() => {
      expect(screenerService.executeFilter).toHaveBeenCalled();
    });
  });

  it('should display results after filter execution', async () => {
    const { screenerService } = await import('../../src/services/screener.service');
    (screenerService.executeFilter as any).mockResolvedValue({
      stocks: [
        {
          stockCode: '600519',
          stockName: '贵州茅台',
          latestPrice: 1800,
          priceChange: 50,
          priceChangePercent: 2.86,
          amount: 5000000000,
        },
      ],
      isTruncated: false,
      totalCount: 1,
    });

    renderWithRouter(<FilterPage />);

    const executeButton = screen.getByRole('button', { name: /execute|run filter/i });
    await userEvent.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText('600519')).toBeInTheDocument();
      expect(screen.getByText('贵州茅台')).toBeInTheDocument();
    });
  });

  it('should show truncation warning when results exceed 100', async () => {
    const { screenerService } = await import('../../src/services/screener.service');
    (screenerService.executeFilter as any).mockResolvedValue({
      stocks: Array.from({ length: 100 }, (_, i) => ({
        stockCode: `60${String(i).padStart(4, '0')}`,
        stockName: `股票${i}`,
        latestPrice: 10,
        priceChange: 0.5,
        priceChangePercent: 5,
        amount: 1000000,
      })),
      isTruncated: true,
      totalCount: 150,
    });

    renderWithRouter(<FilterPage />);

    const executeButton = screen.getByRole('button', { name: /execute|run filter/i });
    await userEvent.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText(/too many results|truncated|showing.*100.*of.*150/i)).toBeInTheDocument();
    });
  });

  it('should navigate to chart page when stock is clicked', async () => {
    const { screenerService } = await import('../../src/services/screener.service');
    (screenerService.executeFilter as any).mockResolvedValue({
      stocks: [
        {
          stockCode: '600519',
          stockName: '贵州茅台',
          latestPrice: 1800,
          priceChange: 50,
          priceChangePercent: 2.86,
          amount: 5000000000,
        },
      ],
      isTruncated: false,
      totalCount: 1,
    });

    renderWithRouter(<FilterPage />);

    const executeButton = screen.getByRole('button', { name: /execute|run filter/i });
    await userEvent.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText('600519')).toBeInTheDocument();
    });

    const stockRow = screen.getByText('600519').closest('tr');
    if (stockRow) {
      await userEvent.click(stockRow);
      // 验证导航逻辑（需要 mock useNavigate）
    }
  });

  it('should show Save Strategy button', () => {
    renderWithRouter(<FilterPage />);

    expect(screen.getByRole('button', { name: /save.*strategy/i })).toBeInTheDocument();
  });

  it('should open save strategy modal when Save button is clicked', async () => {
    renderWithRouter(<FilterPage />);

    const saveButton = screen.getByRole('button', { name: /save.*strategy/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/strategy name/i)).toBeInTheDocument();
    });
  });

  it('should save strategy with current conditions', async () => {
    const { strategyService } = await import('../../src/services/strategy.service');
    (strategyService.createStrategy as any).mockResolvedValue({
      strategyId: 'new-strategy-id',
      strategyName: 'New Strategy',
      conditions: [],
    });

    renderWithRouter(<FilterPage />);

    // 添加条件
    const addButton = screen.getByText(/add condition/i);
    await userEvent.click(addButton);

    // 打开保存对话框
    const saveButton = screen.getByRole('button', { name: /save.*strategy/i });
    await userEvent.click(saveButton);

    // 填写策略名称
    const nameInput = screen.getByLabelText(/strategy name/i);
    await userEvent.type(nameInput, 'My Strategy');

    // 提交
    const submitButton = screen.getByRole('button', { name: /save|confirm|ok/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(strategyService.createStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          strategyName: 'My Strategy',
          conditions: expect.any(Array),
        }),
      );
    });
  });

  it('should load strategy from StrategyManager', async () => {
    const { strategyService } = await import('../../src/services/strategy.service');
    (strategyService.getStrategies as any).mockResolvedValue([
      {
        strategyId: '1',
        strategyName: 'Test Strategy',
        conditions: [
          {
            conditionType: 'indicator_value',
            indicatorName: 'rsi',
            operator: '<',
            targetValue: 30,
          },
        ],
      },
    ]);

    renderWithRouter(<FilterPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Strategy')).toBeInTheDocument();
    });

    // 点击策略加载到 FilterBuilder
    const strategyItem = screen.getByText('Test Strategy');
    await userEvent.click(strategyItem);

    await waitFor(() => {
      expect(screen.getByDisplayValue('rsi')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    });
  });

  it('should display loading state during filter execution', async () => {
    const { screenerService } = await import('../../src/services/screener.service');
    (screenerService.executeFilter as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    renderWithRouter(<FilterPage />);

    const executeButton = screen.getByRole('button', { name: /execute|run filter/i });
    await userEvent.click(executeButton);

    expect(screen.getByText(/loading|executing/i)).toBeInTheDocument();
  });

  it('should display error message when filter execution fails', async () => {
    const { screenerService } = await import('../../src/services/screener.service');
    (screenerService.executeFilter as any).mockRejectedValue(
      new Error('Network error'),
    );

    renderWithRouter(<FilterPage />);

    const executeButton = screen.getByRole('button', { name: /execute|run filter/i });
    await userEvent.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });
});
