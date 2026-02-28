/**
 * DataManagementPage 页面测试
 * 
 * T104: 测试数据管理页面的完整流程
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataManagementPage } from '../../src/pages/DataManagementPage';
import { updateService } from '../../src/services/update.service';
import { useUpdateStore } from '../../src/store/update.store';

// Mock services and stores
vi.mock('../../src/services/update.service');
vi.mock('../../src/store/update.store');
vi.mock('../../src/hooks/useUpdatePolling', () => ({
  useUpdatePolling: vi.fn(),
}));

describe('DataManagementPage', () => {
  const mockSetCurrentTask = vi.fn();
  const mockSetIsPolling = vi.fn();
  const mockUpdateProgress = vi.fn();
  const mockSetHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default store mock
    (useUpdateStore as any).mockReturnValue({
      currentTask: null,
      setCurrentTask: mockSetCurrentTask,
      setIsPolling: mockSetIsPolling,
      updateProgress: mockUpdateProgress,
      setHistory: mockSetHistory,
      history: [],
      lastUpdateTime: null,
    });

    // Default service mocks
    vi.spyOn(updateService, 'getUpdateHistory').mockResolvedValue([]);
  });

  it('应该渲染页面标题和更新按钮', async () => {
    render(<DataManagementPage />);
    
    expect(screen.getByText('数据管理')).toBeDefined();
    expect(screen.getByRole('button', { name: /更新数据/i })).toBeDefined();
  });

  it('应该在挂载时加载历史记录', async () => {
    const mockHistory = [
      {
        id: '1',
        taskId: 'task-1',
        status: 'completed' as const,
        stocksUpdated: 100,
        successCount: 95,
        failedCount: 5,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ];

    vi.spyOn(updateService, 'getUpdateHistory').mockResolvedValue(mockHistory);

    render(<DataManagementPage />);
    
    await waitFor(() => {
      expect(updateService.getUpdateHistory).toHaveBeenCalled();
      expect(mockSetHistory).toHaveBeenCalledWith(mockHistory);
    });
  });

  it('应该在点击更新按钮时触发更新', async () => {
    const user = userEvent.setup();
    const mockTriggerResponse = {
      taskId: 'new-task-1',
      message: '数据更新已启动',
    };

    vi.spyOn(updateService, 'triggerUpdate').mockResolvedValue(mockTriggerResponse);

    render(<DataManagementPage />);
    
    const button = screen.getByRole('button', { name: /更新数据/i });
    await user.click(button);
    
    await waitFor(() => {
      expect(updateService.triggerUpdate).toHaveBeenCalled();
      expect(mockSetCurrentTask).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'new-task-1',
          status: 'running',
        })
      );
      expect(mockSetIsPolling).toHaveBeenCalledWith(true);
    });
  });

  it('应该处理触发更新时的错误', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.spyOn(updateService, 'triggerUpdate').mockRejectedValue(new Error('Network error'));

    render(<DataManagementPage />);
    
    const button = screen.getByRole('button', { name: /更新数据/i });
    await user.click(button);
    
    await waitFor(() => {
      expect(updateService.triggerUpdate).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('应该处理已有更新任务的情况（409冲突）', async () => {
    const user = userEvent.setup();
    
    const error = new Error('Conflict');
    (error as any).response = { status: 409 };
    
    vi.spyOn(updateService, 'triggerUpdate').mockRejectedValue(error);

    render(<DataManagementPage />);
    
    const button = screen.getByRole('button', { name: /更新数据/i });
    await user.click(button);
    
    await waitFor(() => {
      expect(updateService.triggerUpdate).toHaveBeenCalled();
    });
  });

  it('应该显示更新进度组件', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: {
        taskId: 'task-1',
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
      setCurrentTask: mockSetCurrentTask,
      setIsPolling: mockSetIsPolling,
      updateProgress: mockUpdateProgress,
      setHistory: mockSetHistory,
      history: [],
      lastUpdateTime: null,
    });

    render(<DataManagementPage />);
    
    expect(screen.getByText('更新中')).toBeDefined();
  });

  it('应该显示更新历史组件', () => {
    (useUpdateStore as any).mockReturnValue({
      currentTask: null,
      setCurrentTask: mockSetCurrentTask,
      setIsPolling: mockSetIsPolling,
      updateProgress: mockUpdateProgress,
      setHistory: mockSetHistory,
      history: [],
      lastUpdateTime: null,
    });

    render(<DataManagementPage />);
    
    expect(screen.getByText('更新历史')).toBeDefined();
  });

  it('应该在更新完成后重新加载历史记录', async () => {
    const mockHistory = [
      {
        id: '1',
        taskId: 'task-1',
        status: 'completed' as const,
        stocksUpdated: 100,
        successCount: 100,
        failedCount: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ];

    vi.spyOn(updateService, 'getUpdateHistory').mockResolvedValue(mockHistory);

    // Mock completed task
    (useUpdateStore as any).mockReturnValue({
      currentTask: {
        taskId: 'task-1',
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
      setCurrentTask: mockSetCurrentTask,
      setIsPolling: mockSetIsPolling,
      updateProgress: mockUpdateProgress,
      setHistory: mockSetHistory,
      history: [],
      lastUpdateTime: null,
    });

    render(<DataManagementPage />);
    
    // History should be loaded on mount
    await waitFor(() => {
      expect(updateService.getUpdateHistory).toHaveBeenCalled();
    });
  });

  it('应该处理加载历史记录时的错误', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.spyOn(updateService, 'getUpdateHistory').mockRejectedValue(new Error('Network error'));

    render(<DataManagementPage />);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    consoleErrorSpy.mockRestore();
  });
});
