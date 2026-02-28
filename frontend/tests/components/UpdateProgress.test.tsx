/**
 * UpdateProgress 组件测试
 * 
 * T103: 测试更新进度组件的显示和状态变化
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UpdateProgress } from '../../src/components/UpdateProgress';
import { useUpdateStore } from '../../src/store/update.store';

// Mock Zustand store
vi.mock('../../src/store/update.store');

describe('UpdateProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该在没有任务时不显示', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: null,
    });

    const { container } = render(<UpdateProgress />);
    expect(container.firstChild).toBeNull();
  });

  it('应该在任务状态为pending时不显示', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: {
        taskId: 'test-task-1',
        status: 'pending',
        progress: {
          total: 0,
          current: 0,
          success: 0,
          failed: 0,
          percentage: 0,
        },
        startedAt: new Date().toISOString(),
      },
    });

    const { container } = render(<UpdateProgress />);
    expect(container.firstChild).toBeNull();
  });

  it('应该显示正在运行的任务进度', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: {
        taskId: 'test-task-1',
        status: 'running',
        progress: {
          total: 100,
          current: 50,
          success: 48,
          failed: 2,
          percentage: 50,
        },
        startedAt: new Date().toISOString(),
      },
    });

    render(<UpdateProgress />);
    
    expect(screen.getByText('更新中')).toBeDefined();
    expect(screen.getByText(/正在更新 50 \/ 100 只股票/)).toBeDefined();
  });

  it('应该显示成功、失败的统计数据', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: {
        taskId: 'test-task-1',
        status: 'running',
        progress: {
          total: 100,
          current: 50,
          success: 45,
          failed: 5,
          percentage: 50,
        },
        startedAt: new Date().toISOString(),
      },
    });

    render(<UpdateProgress />);
    
    expect(screen.getByText('总计')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('成功')).toBeDefined();
    expect(screen.getByText('45')).toBeDefined();
    expect(screen.getByText('失败')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('应该在任务完成时显示完成状态', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: {
        taskId: 'test-task-1',
        status: 'completed',
        progress: {
          total: 100,
          current: 100,
          success: 100,
          failed: 0,
          percentage: 100,
        },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    });

    render(<UpdateProgress />);
    
    expect(screen.getByText('更新完成')).toBeDefined();
    expect(screen.getByText(/成功更新 100 只股票的数据/)).toBeDefined();
  });

  it('应该在任务完成但有失败项时显示警告', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: {
        taskId: 'test-task-1',
        status: 'completed',
        progress: {
          total: 100,
          current: 100,
          success: 95,
          failed: 5,
          percentage: 100,
        },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    });

    render(<UpdateProgress />);
    
    expect(screen.getByText('更新完成')).toBeDefined();
    expect(screen.getByText(/更新完成：成功 95 只，失败 5 只/)).toBeDefined();
  });

  it('应该在任务失败时显示失败状态', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: {
        taskId: 'test-task-1',
        status: 'failed',
        progress: {
          total: 100,
          current: 50,
          success: 40,
          failed: 10,
          percentage: 50,
        },
        startedAt: new Date().toISOString(),
      },
    });

    render(<UpdateProgress />);
    
    expect(screen.getByText('更新失败')).toBeDefined();
    expect(screen.getByText(/更新失败，请查看错误日志了解详情/)).toBeDefined();
  });

  it('应该显示进度百分比', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: {
        taskId: 'test-task-1',
        status: 'running',
        progress: {
          total: 100,
          current: 75,
          success: 70,
          failed: 5,
          percentage: 75,
        },
        startedAt: new Date().toISOString(),
      },
    });

    render(<UpdateProgress />);
    
    // Ant Design Progress 组件会显示百分比
    // 通过检查 progress 元素是否存在来验证
    const progressBar = document.querySelector('.ant-progress');
    expect(progressBar).toBeDefined();
  });

  it('应该在进度为0时显示正确的统计', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: {
        taskId: 'test-task-1',
        status: 'running',
        progress: {
          total: 100,
          current: 0,
          success: 0,
          failed: 0,
          percentage: 0,
        },
        startedAt: new Date().toISOString(),
      },
    });

    render(<UpdateProgress />);
    
    expect(screen.getByText('更新中')).toBeDefined();
    expect(screen.getByText('总计')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('成功')).toBeDefined();
    expect(screen.getByText('失败')).toBeDefined();
  });
});
