import { render, screen } from '@testing-library/react';
import { TrendTemplateChecks } from './index';
import type { TrendTemplateCheck } from '../../types/vcp';

const mockChecks: TrendTemplateCheck[] = [
  { name: 'priceAboveMA150', label: '股价 > MA150', pass: true, currentValue: 100, threshold: 85 },
  { name: 'priceAboveMA200', label: '股价 > MA200', pass: true, currentValue: 100, threshold: 80 },
  { name: 'rsRatingAbove70', label: 'RS Rating ≥ 70', pass: false, currentValue: 65, threshold: 70 },
];

describe('TrendTemplateChecks', () => {
  it('renders all check items from the checks array', () => {
    render(<TrendTemplateChecks checks={mockChecks} allPass={false} />);
    expect(screen.getByText('股价 > MA150')).toBeInTheDocument();
    expect(screen.getByText('股价 > MA200')).toBeInTheDocument();
    expect(screen.getByText('RS Rating ≥ 70')).toBeInTheDocument();
  });

  it('shows 全部通过 tag when allPass is true', () => {
    render(<TrendTemplateChecks checks={mockChecks} allPass={true} />);
    expect(screen.getByText('全部通过')).toBeInTheDocument();
  });

  it('shows 部分未通过 tag when allPass is false', () => {
    render(<TrendTemplateChecks checks={mockChecks} allPass={false} />);
    expect(screen.getByText('部分未通过')).toBeInTheDocument();
  });

  it('renders CheckCircleOutlined for passing checks', () => {
    render(<TrendTemplateChecks checks={mockChecks} allPass={false} />);
    const checkIcons = document.querySelectorAll('.anticon-check-circle');
    expect(checkIcons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders CloseCircleOutlined for failing checks', () => {
    render(<TrendTemplateChecks checks={mockChecks} allPass={false} />);
    const closeIcons = document.querySelectorAll('.anticon-close-circle');
    expect(closeIcons.length).toBeGreaterThanOrEqual(1);
  });
});
