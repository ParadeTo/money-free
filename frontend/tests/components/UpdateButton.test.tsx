/**
 * UpdateButton 组件测试
 * 
 * T102: 测试更新按钮的显示、禁用状态和交互
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateButton } from '../../src/components/UpdateButton';
import { useUpdateStore } from '../../src/store/update.store';

// Mock Zustand store
vi.mock('../../src/store/update.store');

describe('UpdateButton', () => {
  const mockOnTriggerUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useUpdateStore as any).mockReturnValue({
      lastUpdateTime: null,
      currentTask: null,
    });
  });

  it('应该渲染更新按钮和上次更新时间', () => {
    render(<UpdateButton onTriggerUpdate={mockOnTriggerUpdate} />);
    
    expect(screen.getByText('上次更新')).toBeDefined();
    expect(screen.getByText('从未更新')).toBeDefined();
    expect(screen.getByRole('button', { name: /更新数据/i })).toBeDefined();
  });

  it('应该在点击时触发更新', async () => {
    const user = userEvent.setup();
    render(<UpdateButton onTriggerUpdate={mockOnTriggerUpdate} />);
    
    const button = screen.getByRole('button', { name: /更新数据/i });
    await user.click(button);
    
    expect(mockOnTriggerUpdate).toHaveBeenCalledTimes(1);
  });

  it('应该在加载时禁用按钮', () => {
    render(<UpdateButton onTriggerUpdate={mockOnTriggerUpdate} loading={true} />);
    
    const button = screen.getByRole('button', { name: /更新数据/i });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('应该在更新进行中时禁用按钮并显示"更新中..."', () => {
    (useUpdateStore as any).mockReturnValue({
      lastUpdateTime: null,
      currentTask: { status: 'running' },
    });

    render(<UpdateButton onTriggerUpdate={mockOnTriggerUpdate} />);
    
    const button = screen.getByRole('button', { name: /更新中/i });
    expect(button).toBeDefined();
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('应该显示上次更新时间', () => {
    const lastUpdateTime = new Date(Date.now() - 60000 * 30).toISOString(); // 30分钟前
    
    (useUpdateStore as any).mockReturnValue({
      lastUpdateTime,
      currentTask: null,
    });

    render(<UpdateButton onTriggerUpdate={mockOnTriggerUpdate} />);
    
    expect(screen.getByText(/30 小时前|30 分钟前/)).toBeDefined();
  });

  it('应该在距离上次更新不到1分钟时禁用按钮', () => {
    const lastUpdateTime = new Date(Date.now() - 30000).toISOString(); // 30秒前
    
    (useUpdateStore as any).mockReturnValue({
      lastUpdateTime,
      currentTask: null,
    });

    render(<UpdateButton onTriggerUpdate={mockOnTriggerUpdate} />);
    
    const button = screen.getByRole('button', { name: /更新数据/i });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('应该在距离上次更新超过1分钟时启用按钮', () => {
    const lastUpdateTime = new Date(Date.now() - 120000).toISOString(); // 2分钟前
    
    (useUpdateStore as any).mockReturnValue({
      lastUpdateTime,
      currentTask: null,
    });

    render(<UpdateButton onTriggerUpdate={mockOnTriggerUpdate} />);
    
    const button = screen.getByRole('button', { name: /更新数据/i });
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('应该显示刚刚更新的提示', () => {
    const lastUpdateTime = new Date(Date.now() - 10000).toISOString(); // 10秒前
    
    (useUpdateStore as any).mockReturnValue({
      lastUpdateTime,
      currentTask: null,
    });

    render(<UpdateButton onTriggerUpdate={mockOnTriggerUpdate} />);
    
    expect(screen.getByText('刚刚更新')).toBeDefined();
  });

  it('应该显示完整日期格式（超过24小时）', () => {
    const lastUpdateTime = new Date(Date.now() - 60000 * 60 * 25).toISOString(); // 25小时前
    
    (useUpdateStore as any).mockReturnValue({
      lastUpdateTime,
      currentTask: null,
    });

    render(<UpdateButton onTriggerUpdate={mockOnTriggerUpdate} />);
    
    // 应该显示完整的日期时间格式
    const dateRegex = /\d{4}[/-]\d{2}[/-]\d{2}/;
    expect(screen.getByText(dateRegex)).toBeDefined();
  });
});
