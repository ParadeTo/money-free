// frontend/tests/components/FilterBuilder.test.tsx
// T136 [P] [US2] Component test for FilterBuilder

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBuilder } from '../../src/components/FilterBuilder';

describe('FilterBuilder', () => {
  it('should render with empty conditions initially', () => {
    render(<FilterBuilder conditions={[]} onChange={vi.fn()} />);

    expect(screen.getByText(/add condition/i)).toBeInTheDocument();
  });

  it('should add new condition when Add button clicked', async () => {
    const handleChange = vi.fn();
    render(<FilterBuilder conditions={[]} onChange={handleChange} />);

    const addButton = screen.getByText(/add condition/i);
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            conditionType: expect.any(String),
          }),
        ]),
      );
    });
  });

  it('should remove condition when Remove button clicked', async () => {
    const initialConditions = [
      {
        conditionType: 'indicator_value',
        indicatorName: 'rsi',
        operator: '<',
        targetValue: 30,
      },
    ];

    const handleChange = vi.fn();
    render(<FilterBuilder conditions={initialConditions} onChange={handleChange} />);

    const removeButton = screen.getByRole('button', { name: /remove|delete/i });
    await userEvent.click(removeButton);

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('should display condition type selector', () => {
    const conditions = [
      {
        conditionType: 'indicator_value',
        indicatorName: 'rsi',
        operator: '<',
        targetValue: 30,
      },
    ];

    render(<FilterBuilder conditions={conditions} onChange={vi.fn()} />);

    expect(screen.getByText(/indicator value/i)).toBeInTheDocument();
  });

  it('should display indicator name selector for indicator_value type', () => {
    const conditions = [
      {
        conditionType: 'indicator_value',
        indicatorName: 'rsi',
        operator: '<',
        targetValue: 30,
      },
    ];

    render(<FilterBuilder conditions={conditions} onChange={vi.fn()} />);

    expect(screen.getByDisplayValue('rsi')).toBeInTheDocument();
  });

  it('should display operator selector', () => {
    const conditions = [
      {
        conditionType: 'indicator_value',
        indicatorName: 'rsi',
        operator: '<',
        targetValue: 30,
      },
    ];

    render(<FilterBuilder conditions={conditions} onChange={vi.fn()} />);

    expect(screen.getByDisplayValue('<')).toBeInTheDocument();
  });

  it('should display target value input', () => {
    const conditions = [
      {
        conditionType: 'indicator_value',
        indicatorName: 'rsi',
        operator: '<',
        targetValue: 30,
      },
    ];

    render(<FilterBuilder conditions={conditions} onChange={vi.fn()} />);

    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
  });

  it('should update condition when values change', async () => {
    const handleChange = vi.fn();
    const conditions = [
      {
        conditionType: 'indicator_value',
        indicatorName: 'rsi',
        operator: '<',
        targetValue: 30,
      },
    ];

    render(<FilterBuilder conditions={conditions} onChange={handleChange} />);

    const targetValueInput = screen.getByDisplayValue('30');
    await userEvent.clear(targetValueInput);
    await userEvent.type(targetValueInput, '50');

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            targetValue: 50,
          }),
        ]),
      );
    });
  });

  it('should support pattern condition type', () => {
    const conditions = [
      {
        conditionType: 'pattern',
        pattern: 'kdj_golden_cross',
      },
    ];

    render(<FilterBuilder conditions={conditions} onChange={vi.fn()} />);

    expect(screen.getByText(/pattern/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('kdj_golden_cross')).toBeInTheDocument();
  });

  it('should support price_change condition type', () => {
    const conditions = [
      {
        conditionType: 'price_change',
        operator: '>',
        targetValue: 5,
      },
    ];

    render(<FilterBuilder conditions={conditions} onChange={vi.fn()} />);

    expect(screen.getByText(/price change/i)).toBeInTheDocument();
  });

  it('should support volume_change condition type', () => {
    const conditions = [
      {
        conditionType: 'volume_change',
        operator: '>',
        targetValue: 50,
      },
    ];

    render(<FilterBuilder conditions={conditions} onChange={vi.fn()} />);

    expect(screen.getByText(/volume change/i)).toBeInTheDocument();
  });

  it('should support 52-week high/low conditions', () => {
    const conditions = [
      {
        conditionType: 'week_52_high',
      },
    ];

    render(<FilterBuilder conditions={conditions} onChange={vi.fn()} />);

    expect(screen.getByText(/52.?week high/i)).toBeInTheDocument();
  });

  it('should handle multiple conditions', () => {
    const conditions = [
      {
        conditionType: 'indicator_value',
        indicatorName: 'rsi',
        operator: '<',
        targetValue: 30,
      },
      {
        conditionType: 'indicator_value',
        indicatorName: 'volume',
        operator: '>',
        targetValue: 1000000,
      },
      {
        conditionType: 'pattern',
        pattern: 'kdj_golden_cross',
      },
    ];

    render(<FilterBuilder conditions={conditions} onChange={vi.fn()} />);

    expect(screen.getAllByText(/indicator value/i)).toHaveLength(2);
    expect(screen.getByText(/pattern/i)).toBeInTheDocument();
  });
});
