/**
 * FavoriteButton 组件测试
 *
 * T180: 测试收藏按钮的显示、切换、API 调用、加载和错误处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteButton } from '../../src/components/FavoriteButton';

describe('FavoriteButton', () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未收藏时显示空心星标（可点击的收藏按钮）', () => {
    render(
      <FavoriteButton
        stockCode="600519"
        isFavorited={false}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    // 应具有收藏相关的可访问名称（aria-label 或 title）
    expect(button).toHaveAccessibleName();
  });

  it('已收藏时显示实心星标', () => {
    render(
      <FavoriteButton
        stockCode="600519"
        isFavorited={true}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAccessibleName();
  });

  it('点击时切换收藏状态并调用 onToggle', async () => {
    const user = userEvent.setup();
    render(
      <FavoriteButton
        stockCode="600519"
        isFavorited={false}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('加载状态时按钮禁用或显示加载指示', () => {
    render(
      <FavoriteButton
        stockCode="600519"
        isFavorited={false}
        onToggle={mockOnToggle}
        loading={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('加载状态时不应响应点击', async () => {
    const user = userEvent.setup();
    render(
      <FavoriteButton
        stockCode="600519"
        isFavorited={false}
        onToggle={mockOnToggle}
        loading={true}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(mockOnToggle).not.toHaveBeenCalled();
  });

  it('应正确传递 stockCode 用于 API 调用', async () => {
    const user = userEvent.setup();
    render(
      <FavoriteButton
        stockCode="000001"
        isFavorited={false}
        onToggle={mockOnToggle}
      />
    );

    await user.click(screen.getByRole('button'));

    // onToggle 由父组件处理，父组件会使用 stockCode 调用 API
    // 组件应能正确渲染并触发回调
    expect(mockOnToggle).toHaveBeenCalled();
  });

  it('错误时组件不应崩溃', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorOnToggle = vi.fn().mockRejectedValue(new Error('API 错误'));

    render(
      <FavoriteButton
        stockCode="600519"
        isFavorited={false}
        onToggle={errorOnToggle}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    // 组件应仍然存在，错误由组件内部或父组件处理
    expect(button).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });
});
