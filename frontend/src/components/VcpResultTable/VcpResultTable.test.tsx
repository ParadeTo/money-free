import { render, screen } from '@testing-library/react';
import { VcpResultTable } from './index';
import type { VcpScanItem } from '../../types/vcp';

const mockData: VcpScanItem[] = [
  {
    stockCode: '600519.SH',
    stockName: '贵州茅台',
    market: 'SH',
    currency: 'CNY',
    latestPrice: 1800.5,
    priceChangePct: 2.35,
    distFrom52WeekHigh: 8.5,
    distFrom52WeekLow: 45.2,
    contractionCount: 3,
    lastContractionPct: 8.5,
    volumeDryingUp: true,
    rsRating: 92,
    inPullback: true,
    pullbackCount: 3,
  },
  {
    stockCode: '000858.SZ',
    stockName: '五粮液',
    market: 'SZ',
    currency: 'CNY',
    latestPrice: 150.3,
    priceChangePct: -1.2,
    distFrom52WeekHigh: 15.3,
    distFrom52WeekLow: 30.1,
    contractionCount: 2,
    lastContractionPct: 12.3,
    volumeDryingUp: false,
    rsRating: 78,
    inPullback: false,
    pullbackCount: 2,
  },
];

describe('VcpResultTable', () => {
  it('renders stock data in table with all required columns', () => {
    render(
      <VcpResultTable
        data={mockData}
        loading={false}
        sortBy="lastContractionPct"
        sortOrder="asc"
        onSortChange={vi.fn()}
      />
    );
    const columnHeaders = [
      'Stock Code',
      'Name',
      'Current Price',
      'Change %',
      'From 52W High',
      'From 52W Low',
      'Contractions',
      'Last Contraction %',
      'Volume Dry Up',
      'RS Rating',
    ];
    columnHeaders.forEach((header) => {
      expect(screen.getAllByText(header).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows empty state message when data is empty', () => {
    render(
      <VcpResultTable
        data={[]}
        loading={false}
        sortBy="lastContractionPct"
        sortOrder="asc"
        onSortChange={vi.fn()}
      />
    );
    expect(screen.getByText('No stocks meeting VCP criteria')).toBeInTheDocument();
  });

  it('renders correct number of rows for given data', () => {
    render(
      <VcpResultTable
        data={mockData}
        loading={false}
        sortBy="lastContractionPct"
        sortOrder="asc"
        onSortChange={vi.fn()}
      />
    );
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('renders positive priceChangePct in green, negative in red', () => {
    render(
      <VcpResultTable
        data={mockData}
        loading={false}
        sortBy="lastContractionPct"
        sortOrder="asc"
        onSortChange={vi.fn()}
      />
    );
    const positiveEl = screen.getByText('+2.35%');
    const negativeEl = screen.getByText('-1.20%');
    expect(positiveEl).toHaveStyle({ color: '#52c41a' });
    expect(negativeEl).toHaveStyle({ color: '#ff4d4f' });
  });

  it('renders volumeDryingUp as Yes/No tags', () => {
    render(
      <VcpResultTable
        data={mockData}
        loading={false}
        sortBy="lastContractionPct"
        sortOrder="asc"
        onSortChange={vi.fn()}
      />
    );
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renders action column when provided', () => {
    const actionColumn = {
      title: 'Actions',
      key: 'action',
      width: 80,
      render: () => <span>Action</span>,
    };
    render(
      <VcpResultTable
        data={mockData}
        loading={false}
        sortBy="lastContractionPct"
        sortOrder="asc"
        onSortChange={vi.fn()}
        actionColumn={actionColumn}
      />
    );
    expect(screen.getAllByText('Actions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Action')).toHaveLength(2);
  });
});
