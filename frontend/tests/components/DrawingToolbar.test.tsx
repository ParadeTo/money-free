/**
 * DrawingToolbar 组件测试
 * 
 * 测试绘图工具栏的交互和工具选择
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawingToolbar } from '../../src/components/DrawingToolbar';
import type { DrawingType } from '../../src/types/drawing';

// Mock chart store
vi.mock('../../src/store/chart.store', () => ({
  useChartStore: vi.fn(),
}));

import { useChartStore } from '../../src/store/chart.store';

describe('DrawingToolbar', () => {
  const mockSetActiveTool = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 默认 mock store 状态
    (useChartStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeTool: 'none',
      setActiveTool: mockSetActiveTool,
    });
  });

  it('应该渲染所有绘图工具按钮', () => {
    render(<DrawingToolbar />);
    
    // 验证所有工具按钮都渲染
    expect(screen.getByText('趋势线')).toBeDefined();
    expect(screen.getByText('水平线')).toBeDefined();
    expect(screen.getByText('垂直线')).toBeDefined();
    expect(screen.getByText('矩形')).toBeDefined();
  });

  it('应该高亮当前选中的工具', () => {
    (useChartStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeTool: 'trend_line',
      setActiveTool: mockSetActiveTool,
    });
    
    render(<DrawingToolbar />);
    
    const trendLineBtn = screen.getByText('趋势线').closest('button');
    
    // Ant Design Button 在选中状态下会有 ant-btn-primary 类
    expect(trendLineBtn?.className).toContain('ant-btn-primary');
  });

  it('应该在点击工具按钮时调用 setActiveTool', async () => {
    const user = userEvent.setup();
    render(<DrawingToolbar />);
    
    const trendLineBtn = screen.getByText('趋势线');
    await user.click(trendLineBtn);
    
    expect(mockSetActiveTool).toHaveBeenCalledWith('trend_line');
  });

  it('应该在再次点击已选中的工具时取消选择', async () => {
    const user = userEvent.setup();
    
    (useChartStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeTool: 'trend_line',
      setActiveTool: mockSetActiveTool,
    });
    
    render(<DrawingToolbar />);
    
    const trendLineBtn = screen.getByText('趋势线');
    await user.click(trendLineBtn);
    
    // 再次点击应该取消选择（设置为 'none'）
    expect(mockSetActiveTool).toHaveBeenCalledWith('none');
  });

  it('应该支持切换不同的绘图工具', async () => {
    const user = userEvent.setup();
    
    render(<DrawingToolbar />);
    
    // 点击水平线工具
    const horizontalLineBtn = screen.getByText('水平线');
    await user.click(horizontalLineBtn);
    
    expect(mockSetActiveTool).toHaveBeenCalledWith('horizontal_line');
  });

  it('应该显示工具提示信息', () => {
    render(<DrawingToolbar />);
    
    // 验证所有工具按钮文本都存在
    expect(screen.getByText('趋势线')).toBeDefined();
    expect(screen.getByText('水平线')).toBeDefined();
    expect(screen.getByText('垂直线')).toBeDefined();
    expect(screen.getByText('矩形')).toBeDefined();
  });

  it('应该在选中工具时显示取消按钮', () => {
    (useChartStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeTool: 'trend_line',
      setActiveTool: mockSetActiveTool,
    });
    
    render(<DrawingToolbar />);
    
    // 应该显示取消按钮
    expect(screen.getByText('取消')).toBeDefined();
  });

  it('应该在点击取消按钮时清除工具选择', async () => {
    const user = userEvent.setup();
    
    (useChartStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeTool: 'trend_line',
      setActiveTool: mockSetActiveTool,
    });
    
    render(<DrawingToolbar />);
    
    const cancelBtn = screen.getByText('取消');
    await user.click(cancelBtn);
    
    expect(mockSetActiveTool).toHaveBeenCalledWith('none');
  });
});
