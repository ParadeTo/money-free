import { render, screen } from '@testing-library/react';
import { VcpResultTable } from './index';
import type { VcpScanItem } from '../../types/vcp';

const mockData: VcpScanItem[] = [
  {
    stockCode: '600519.SH',
    stockName: '贵州茅台',
    latestPrice: 1800.5,
    priceChangePct: 2.35,
    distFrom52WeekHigh: 8.5,
    distFrom52WeekLow: 45.2,
    contractionCount: 3,
    lastContractionPct: 8.5,
    volumeDryingUp: true,
    rsRating: 92,
  },
  {
    stockCode: '000858.SZ',
    stockName: '五粮液',
    latestPrice: 150.3,
    priceChangePct: -1.2,
    distFrom52WeekHigh: 15.3,
    distFrom52WeekLow: 30.1,
    contractionCount: 2,
    lastContractionPct: 12.3,
    volumeDryingUp: false,
    rsRating: 78,
  },
];

const mockActionColumn = {
  title: '收藏',
  key: 'favorite',
  width: 60,
  align: 'center' as const,
  render: (_: unknown, record: VcpScanItem) => (
    <span data-testid={`action-${record.stockCode}`}>Action for {record.stockName}</span>
  ),
};

describe('VcpResultTable FavoriteIntegration', () => {
  it('when actionColumn with title 收藏 is provided, renders the column header', () => {
    render(
      <VcpResultTable
        data={mockData}
        loading={false}
        sortBy="lastContractionPct"
        sortOrder="asc"
        onSortChange={vi.fn()}
        actionColumn={mockActionColumn}
      />
    );
    expect(screen.getAllByText('收藏').length).toBeGreaterThanOrEqual(1);
  });

  it('actionColumn renders content for each row', () => {
    render(
      <VcpResultTable
        data={mockData}
        loading={false}
        sortBy="lastContractionPct"
        sortOrder="asc"
        onSortChange={vi.fn()}
        actionColumn={mockActionColumn}
      />
    );
    expect(screen.getByTestId('action-600519.SH')).toBeInTheDocument();
    expect(screen.getByTestId('action-000858.SZ')).toBeInTheDocument();
    expect(screen.getByText('Action for 贵州茅台')).toBeInTheDocument();
    expect(screen.getByText('Action for 五粮液')).toBeInTheDocument();
  });
});
