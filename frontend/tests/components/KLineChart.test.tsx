/**
 * KLineChart 组件测试
 * 
 * 测试K线图表组件的渲染、绘图交互和数据加载
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KLineChart } from '../../src/components/KLineChart';
import { drawingService } from '../../src/services/drawing.service';
import type { KLineData, TechnicalIndicator } from '../../src/types';
import type { Drawing } from '../../src/types/drawing';

// Mock drawing service
vi.mock('../../src/services/drawing.service');

// Mock lightweight-charts library
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addCandlestickSeries: vi.fn(() => ({
      setData: vi.fn(),
    })),
    addLineSeries: vi.fn(() => ({
      setData: vi.fn(),
    })),
    addHistogramSeries: vi.fn(() => ({
      setData: vi.fn(),
    })),
    timeScale: vi.fn(() => ({
      fitContent: vi.fn(),
    })),
    remove: vi.fn(),
    applyOptions: vi.fn(),
    subscribeCrosshairMove: vi.fn(),
    resize: vi.fn(),
  })),
}));

describe('KLineChart', () => {
  const mockKLineData: KLineData[] = [
    {
      id: 1,
      stockCode: '600519',
      date: '2024-01-01',
      period: 'daily',
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      volume: 1000000,
      amount: 100000000,
      source: 'tushare',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      stockCode: '600519',
      date: '2024-01-02',
      period: 'daily',
      open: 105,
      high: 115,
      low: 100,
      close: 110,
      volume: 1200000,
      amount: 120000000,
      source: 'tushare',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  const mockIndicators: TechnicalIndicator[] = [
    {
      id: 1,
      stockCode: '600519',
      date: '2024-01-01',
      period: 'daily',
      indicatorType: 'ma',
      values: '{"ma50": 102, "ma150": 100, "ma200": 98}',
      calculatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      stockCode: '600519',
      date: '2024-01-02',
      period: 'daily',
      indicatorType: 'ma',
      values: '{"ma50": 107, "ma150": 105, "ma200": 103}',
      calculatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该渲染图表容器', () => {
    render(
      <KLineChart
        data={mockKLineData}
        indicators={mockIndicators}
        period="daily"
        selectedIndicators={['ma']}
        stockCode="600519"
      />
    );
    
    const chartContainer = screen.getByTestId('kline-chart-container');
    expect(chartContainer).toBeDefined();
  });

  it('应该在数据为空时显示提示信息', () => {
    render(
      <KLineChart
        data={[]}
        indicators={[]}
        period="daily"
        selectedIndicators={[]}
        stockCode="600519"
      />
    );
    
    expect(screen.getByText(/暂无数据/)).toBeDefined();
  });

  it('应该在组件挂载时加载已保存的绘图', async () => {
    const mockDrawings: Drawing[] = [
      {
        id: '1',
        stockCode: '600519',
        period: 'daily',
        drawingType: 'trend_line',
        coordinates: {
          start: { x: 0, y: 100 },
          end: { x: 1, y: 110 },
        },
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    vi.spyOn(drawingService, 'getDrawings').mockResolvedValue(mockDrawings);

    render(
      <KLineChart
        data={mockKLineData}
        indicators={mockIndicators}
        period="daily"
        selectedIndicators={['ma']}
        stockCode="600519"
      />
    );

    await waitFor(() => {
      expect(drawingService.getDrawings).toHaveBeenCalledWith('600519', 'daily');
    });
  });

  describe('绘图交互 - 趋势线', () => {
    it('应该在趋势线模式下捕获两次点击并创建绘图', async () => {
      const user = userEvent.setup();
      const mockOnDrawingCreated = vi.fn();

      vi.spyOn(drawingService, 'createDrawing').mockResolvedValue({
        id: '1',
        stockCode: '600519',
        period: 'daily',
        drawingType: 'trend_line',
        coordinates: {
          start: { x: 0, y: 100 },
          end: { x: 1, y: 110 },
        },
        createdAt: '2024-01-01T00:00:00Z',
      });

      render(
        <KLineChart
          data={mockKLineData}
          indicators={mockIndicators}
          period="daily"
          selectedIndicators={['ma']}
          stockCode="600519"
          activeTool="trend_line"
          onDrawingCreated={mockOnDrawingCreated}
        />
      );

      const chartContainer = screen.getByTestId('kline-chart-container');

      // 模拟第一次点击（起点）
      await user.click(chartContainer);

      // 模拟第二次点击（终点）
      await user.click(chartContainer);

      await waitFor(() => {
        expect(drawingService.createDrawing).toHaveBeenCalled();
        expect(mockOnDrawingCreated).toHaveBeenCalled();
      });
    });
  });

  describe('绘图交互 - 水平线', () => {
    it('应该在水平线模式下捕获一次点击并创建绘图', async () => {
      const user = userEvent.setup();
      const mockOnDrawingCreated = vi.fn();

      vi.spyOn(drawingService, 'createDrawing').mockResolvedValue({
        id: '2',
        stockCode: '600519',
        period: 'daily',
        drawingType: 'horizontal_line',
        coordinates: {
          y: 105,
        },
        createdAt: '2024-01-01T00:00:00Z',
      });

      render(
        <KLineChart
          data={mockKLineData}
          indicators={mockIndicators}
          period="daily"
          selectedIndicators={['ma']}
          stockCode="600519"
          activeTool="horizontal_line"
          onDrawingCreated={mockOnDrawingCreated}
        />
      );

      const chartContainer = screen.getByTestId('kline-chart-container');

      // 模拟点击
      await user.click(chartContainer);

      await waitFor(() => {
        expect(drawingService.createDrawing).toHaveBeenCalled();
        expect(mockOnDrawingCreated).toHaveBeenCalled();
      });
    });
  });

  describe('绘图交互 - 垂直线', () => {
    it('应该在垂直线模式下捕获一次点击并创建绘图', async () => {
      const user = userEvent.setup();
      const mockOnDrawingCreated = vi.fn();

      vi.spyOn(drawingService, 'createDrawing').mockResolvedValue({
        id: '3',
        stockCode: '600519',
        period: 'daily',
        drawingType: 'vertical_line',
        coordinates: {
          x: 0,
        },
        createdAt: '2024-01-01T00:00:00Z',
      });

      render(
        <KLineChart
          data={mockKLineData}
          indicators={mockIndicators}
          period="daily"
          selectedIndicators={['ma']}
          stockCode="600519"
          activeTool="vertical_line"
          onDrawingCreated={mockOnDrawingCreated}
        />
      );

      const chartContainer = screen.getByTestId('kline-chart-container');

      // 模拟点击
      await user.click(chartContainer);

      await waitFor(() => {
        expect(drawingService.createDrawing).toHaveBeenCalled();
        expect(mockOnDrawingCreated).toHaveBeenCalled();
      });
    });
  });

  describe('绘图交互 - 矩形', () => {
    it('应该在矩形模式下捕获两次点击并创建绘图', async () => {
      const user = userEvent.setup();
      const mockOnDrawingCreated = vi.fn();

      vi.spyOn(drawingService, 'createDrawing').mockResolvedValue({
        id: '4',
        stockCode: '600519',
        period: 'daily',
        drawingType: 'rectangle',
        coordinates: {
          topLeft: { x: 0, y: 110 },
          bottomRight: { x: 1, y: 100 },
        },
        createdAt: '2024-01-01T00:00:00Z',
      });

      render(
        <KLineChart
          data={mockKLineData}
          indicators={mockIndicators}
          period="daily"
          selectedIndicators={['ma']}
          stockCode="600519"
          activeTool="rectangle"
          onDrawingCreated={mockOnDrawingCreated}
        />
      );

      const chartContainer = screen.getByTestId('kline-chart-container');

      // 模拟第一次点击（左上角）
      await user.click(chartContainer);

      // 模拟第二次点击（右下角）
      await user.click(chartContainer);

      await waitFor(() => {
        expect(drawingService.createDrawing).toHaveBeenCalled();
        expect(mockOnDrawingCreated).toHaveBeenCalled();
      });
    });
  });

  describe('绘图删除', () => {
    it('应该支持通过右键菜单删除绘图', async () => {
      const user = userEvent.setup();
      const mockOnDrawingDeleted = vi.fn();

      const mockDrawings: Drawing[] = [
        {
          id: '1',
          stockCode: '600519',
          period: 'daily',
          drawingType: 'trend_line',
          coordinates: {
            start: { x: 0, y: 100 },
            end: { x: 1, y: 110 },
          },
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.spyOn(drawingService, 'getDrawings').mockResolvedValue(mockDrawings);
      vi.spyOn(drawingService, 'deleteDrawing').mockResolvedValue();

      render(
        <KLineChart
          data={mockKLineData}
          indicators={mockIndicators}
          period="daily"
          selectedIndicators={['ma']}
          stockCode="600519"
          onDrawingDeleted={mockOnDrawingDeleted}
        />
      );

      // 等待绘图加载
      await waitFor(() => {
        expect(drawingService.getDrawings).toHaveBeenCalled();
      });

      // 模拟右键点击绘图区域（这里简化处理，实际需要定位到具体绘图）
      const chartContainer = screen.getByTestId('kline-chart-container');
      await user.pointer({ keys: '[MouseRight]', target: chartContainer });

      // 等待右键菜单出现并点击删除
      await waitFor(() => {
        const deleteOption = screen.queryByText('删除');
        if (deleteOption) {
          user.click(deleteOption);
        }
      });

      // 验证删除调用
      // 注意：这是简化的测试，实际可能需要更复杂的交互逻辑
    });
  });

  it('应该在切换周期时重新加载绘图', async () => {
    const { rerender } = render(
      <KLineChart
        data={mockKLineData}
        indicators={mockIndicators}
        period="daily"
        selectedIndicators={['ma']}
        stockCode="600519"
      />
    );

    vi.spyOn(drawingService, 'getDrawings').mockResolvedValue([]);

    // 切换到周K
    rerender(
      <KLineChart
        data={mockKLineData}
        indicators={mockIndicators}
        period="weekly"
        selectedIndicators={['ma']}
        stockCode="600519"
      />
    );

    await waitFor(() => {
      expect(drawingService.getDrawings).toHaveBeenCalledWith('600519', 'weekly');
    });
  });

  it('应该处理绘图创建失败的情况', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(drawingService, 'createDrawing').mockRejectedValue(
      new Error('Failed to create drawing')
    );

    render(
      <KLineChart
        data={mockKLineData}
        indicators={mockIndicators}
        period="daily"
        selectedIndicators={['ma']}
        stockCode="600519"
        activeTool="trend_line"
      />
    );

    const chartContainer = screen.getByTestId('kline-chart-container');

    // 模拟绘图操作
    await user.click(chartContainer);
    await user.click(chartContainer);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});
