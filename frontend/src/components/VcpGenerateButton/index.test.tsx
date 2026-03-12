import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VcpGenerateButton } from './index';

/**
 * T021 [US1] - Component test for VcpGenerateButton
 */
describe('VcpGenerateButton', () => {
  it('should render button with correct Chinese text', () => {
    const mockOnClick = vi.fn();
    
    render(<VcpGenerateButton stockCode="605117" onClick={mockOnClick} loading={false} />);
    
    const button = screen.getByRole('button', { name: /生成VCP分析报告/i });
    expect(button).toBeInTheDocument();
  });

  it('should call onClick handler when button is clicked', () => {
    const mockOnClick = vi.fn();
    
    render(<VcpGenerateButton stockCode="605117" onClick={mockOnClick} loading={false} />);
    
    const button = screen.getByRole('button', { name: /生成VCP分析报告/i });
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should show loading state with "生成中..." text when loading is true', () => {
    const mockOnClick = vi.fn();
    
    render(<VcpGenerateButton stockCode="605117" onClick={mockOnClick} loading={true} />);
    
    expect(screen.getByText(/生成中/i)).toBeInTheDocument();
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
