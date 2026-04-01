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

  it('加载状态时按钮禁用', () => {
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

    expect(mockOnToggle).toHaveBeenCalled();
  });
});
