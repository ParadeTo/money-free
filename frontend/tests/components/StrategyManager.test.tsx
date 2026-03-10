// frontend/tests/components/StrategyManager.test.tsx
// T137 [P] [US2] Component test for StrategyManager

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrategyManager } from '../../src/components/StrategyManager';

const mockStrategies = [
  {
    strategyId: '1',
    strategyName: '超跌反弹策略',
    description: 'RSI < 30 且成交量放大',
    conditions: [
      {
        conditionType: 'indicator_value',
        indicatorName: 'rsi',
        operator: '<',
        targetValue: 30,
      },
    ],
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    strategyId: '2',
    strategyName: '强势股策略',
    description: '突破52周高点',
    conditions: [
      {
        conditionType: 'week_52_high',
      },
    ],
    createdAt: '2026-02-10T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
];

describe('StrategyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<StrategyManager onLoad={vi.fn()} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display list of strategies', async () => {
    const mockOnLoad = vi.fn();
    render(<StrategyManager strategies={mockStrategies} onLoad={mockOnLoad} />);

    expect(screen.getByText('超跌反弹策略')).toBeInTheDocument();
    expect(screen.getByText('强势股策略')).toBeInTheDocument();
  });

  it('should display strategy descriptions', () => {
    render(<StrategyManager strategies={mockStrategies} onLoad={vi.fn()} />);

    expect(screen.getByText('RSI < 30 且成交量放大')).toBeInTheDocument();
    expect(screen.getByText('突破52周高点')).toBeInTheDocument();
  });

  it('should call onLoad when strategy is clicked', async () => {
    const handleLoad = vi.fn();
    render(<StrategyManager strategies={mockStrategies} onLoad={handleLoad} />);

    const strategyItem = screen.getByText('超跌反弹策略');
    await userEvent.click(strategyItem);

    expect(handleLoad).toHaveBeenCalledWith(mockStrategies[0]);
  });

  it('should show edit button for each strategy', () => {
    render(
      <StrategyManager
        strategies={mockStrategies}
        onLoad={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons).toHaveLength(2);
  });

  it('should call onEdit when edit button is clicked', async () => {
    const handleEdit = vi.fn();
    render(
      <StrategyManager
        strategies={mockStrategies}
        onLoad={vi.fn()}
        onEdit={handleEdit}
      />,
    );

    const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
    await userEvent.click(editButton);

    expect(handleEdit).toHaveBeenCalledWith(mockStrategies[0]);
  });

  it('should show delete button for each strategy', () => {
    render(
      <StrategyManager
        strategies={mockStrategies}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it('should show confirmation before delete', async () => {
    const handleDelete = vi.fn();
    render(
      <StrategyManager
        strategies={mockStrategies}
        onLoad={vi.fn()}
        onDelete={handleDelete}
      />,
    );

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await userEvent.click(deleteButton);

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it('should call onDelete after confirmation', async () => {
    const handleDelete = vi.fn();
    render(
      <StrategyManager
        strategies={mockStrategies}
        onLoad={vi.fn()}
        onDelete={handleDelete}
      />,
    );

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await userEvent.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: /confirm|yes|ok/i });
    await userEvent.click(confirmButton);

    expect(handleDelete).toHaveBeenCalledWith('1');
  });

  it('should show "Save Current" button', () => {
    render(
      <StrategyManager
        strategies={mockStrategies}
        onLoad={vi.fn()}
        onSaveCurrent={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /save current/i })).toBeInTheDocument();
  });

  it('should call onSaveCurrent when Save Current button is clicked', async () => {
    const handleSaveCurrent = vi.fn();
    render(
      <StrategyManager
        strategies={mockStrategies}
        onLoad={vi.fn()}
        onSaveCurrent={handleSaveCurrent}
      />,
    );

    const saveButton = screen.getByRole('button', { name: /save current/i });
    await userEvent.click(saveButton);

    expect(handleSaveCurrent).toHaveBeenCalled();
  });

  it('should display empty state when no strategies', () => {
    render(<StrategyManager strategies={[]} onLoad={vi.fn()} />);

    expect(screen.getByText(/no strategies/i)).toBeInTheDocument();
  });

  it('should display condition count for each strategy', () => {
    render(<StrategyManager strategies={mockStrategies} onLoad={vi.fn()} />);

    expect(screen.getByText(/1.*condition/i)).toBeInTheDocument();
  });
});
