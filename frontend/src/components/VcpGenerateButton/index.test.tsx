import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VcpGenerateButton } from './index';

/**
 * T021 [US1] - Component test for VcpGenerateButton
 */
describe('VcpGenerateButton', () => {
  it('should render button with correct text', () => {
    const mockOnClick = vi.fn();

    render(<VcpGenerateButton stockCode="605117" onClick={mockOnClick} loading={false} />);

    const button = screen.getByRole('button', { name: /Generate VCP Analysis/i });
    expect(button).toBeInTheDocument();
  });

  it('should call onClick handler when button is clicked', () => {
    const mockOnClick = vi.fn();

    render(<VcpGenerateButton stockCode="605117" onClick={mockOnClick} loading={false} />);

    const button = screen.getByRole('button', { name: /Generate VCP Analysis/i });
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should show loading state with "Generating..." text when loading is true', () => {
    const mockOnClick = vi.fn();

    render(<VcpGenerateButton stockCode="605117" onClick={mockOnClick} loading={true} />);

    expect(screen.getByText(/Generating/i)).toBeInTheDocument();
  });

  it('should disable button when loading is true', () => {
    const mockOnClick = vi.fn();

    render(<VcpGenerateButton stockCode="605117" onClick={mockOnClick} loading={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should not call onClick when button is disabled', () => {
    const mockOnClick = vi.fn();

    render(<VcpGenerateButton stockCode="605117" onClick={mockOnClick} loading={true} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnClick).not.toHaveBeenCalled();
  });
});
