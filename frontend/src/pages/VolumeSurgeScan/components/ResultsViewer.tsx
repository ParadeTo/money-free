import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Space, Select, Spin, Statistic, Row, Col, Modal, Empty, message } from 'antd';
import { DownloadOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { volumeSurgeScanApi } from '../../../services/volumeSurgeScanApi';
import { ScanSummary, ScanResultDetail } from '../../../types/scan.types';
import type { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import dayjs from 'dayjs';

interface ResultsViewerProps {
  scan: ScanSummary;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ scan }) => {
  const [results, setResults] = useState<ScanResultDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('matched');
  const [sortBy, setSortBy] = useState('volumeSupportRatio');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [selectedStock, setSelectedStock] = useState<ScanResultDetail | null>(null);

  const fetchResults = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const response = await volumeSurgeScanApi.getScanResults(scan.scanId, {
        filter,
        page,
        limit: pageSize,
        sortBy,
        sortOrder,
      });

      if (response.success && response.data) {
        setResults(response.data.results);
        setPagination({
          current: response.data.pagination.page,
          pageSize: response.data.pagination.limit,
          total: response.data.pagination.total,
        });
      }
    } catch (error) {
      message.error('Failed to fetch results');
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  }, [scan.scanId, filter, sortBy, sortOrder]);

  useEffect(() => {
    fetchResults(1, pagination.pageSize);
  }, [scan.scanId, filter, sortBy, sortOrder]);

  const handleTableChange: TableProps<ScanResultDetail>['onChange'] = (_pag, _filters, sorter) => {
    const s = sorter as SorterResult<ScanResultDetail>;
    if (s.columnKey && s.order) {
      setSortBy(s.columnKey as string);
      setSortOrder(s.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  const handleExport = async (format: 'csv' | 'markdown') => {
    const exportFilter = filter === 'unmatched' ? 'all' : filter;
    try {
      const content = await volumeSurgeScanApi.exportResults(scan.scanId, format, exportFilter);
      const blob = new Blob([content], {
        type: format === 'csv' ? 'text/csv' : 'text/markdown',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `volume-surge-scan-${dayjs(scan.scanDate).format('YYYY-MM-DD')}.${format === 'csv' ? 'csv' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success(`Exported successfully as ${format.toUpperCase()}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Export failed: ${errMsg}`);
    }
  };

  const columns: TableProps<ScanResultDetail>['columns'] = [
    {
      title: 'Stock Code',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 120,
      render: (code: string) => (
        <Link to={`/chart/${code}`} style={{ fontWeight: 'bold' }}>
          {code}
        </Link>
      ),
    },
    {
      title: 'Stock Name',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 140,
    },
    {
      title: 'Expansion Multiplier',
      key: 'expansionMultiplier',
      width: 150,
      render: (_: unknown, record: ScanResultDetail) =>
        `${record.volumePattern.expansionPoint.multiplier.toFixed(2)}x`,
      sorter: true,
    },
    {
      title: 'Volume Support Ratio',
      key: 'volumeSupportRatio',
      width: 180,
      render: (_: unknown, record: ScanResultDetail) => {
        const ratio = record.volumeSupport.ratio;
        return (
          <Tag color={ratio >= 1.5 ? 'green' : ratio >= 1.2 ? 'orange' : 'red'}>
            {ratio.toFixed(2)}
          </Tag>
        );
      },
      sorter: true,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'MA50 Slope',
      key: 'ma50Slope',
      width: 120,
      render: (_: unknown, record: ScanResultDetail) => {
        const slope = record.movingAverages.ma50Slope;
        return (
          <span style={{ color: slope > 0 ? 'green' : 'red' }}>
            {slope > 0 ? '↗' : '↘'} {slope.toFixed(4)}
          </span>
        );
      },
      sorter: true,
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_: unknown, record: ScanResultDetail) => (
        <Tag color={record.criteria.meetsAllCriteria ? 'success' : 'warning'}>
          {record.criteria.meetsAllCriteria ? 'All Criteria Met' : 'Partial Match'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: ScanResultDetail) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => setSelectedStock(record)}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="results-viewer">
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Scan Date" value={dayjs(scan.scanDate).format('YYYY-MM-DD')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Stocks" value={scan.totalStocks} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Matched Stocks"
              value={scan.matchedStocks}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Duration"
              value={scan.durationMs ? (scan.durationMs / 1000).toFixed(1) : '-'}
              suffix="s"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Scan Results"
        extra={
          <Space>
            <Select
              value={filter}
              onChange={setFilter}
              style={{ width: 150 }}
            >
              <Select.Option value="all">All Results</Select.Option>
              <Select.Option value="matched">Matched Only</Select.Option>
              <Select.Option value="unmatched">Unmatched Only</Select.Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={() => fetchResults()}>
              Refresh
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>
              Export CSV
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport('markdown')}>
              Export MD
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          {!loading && results.length === 0 ? (
            <Empty description="No results found for this scan" />
          ) : (
            <Table
              dataSource={results}
              columns={columns}
              rowKey="stockCode"
              onChange={handleTableChange}
              pagination={{
                ...pagination,
                onChange: fetchResults,
              }}
            />
          )}
        </Spin>
      </Card>

      <Modal
        title={`Stock Details: ${selectedStock?.stockCode} ${selectedStock?.stockName ? `- ${selectedStock.stockName}` : ''}`}
        open={!!selectedStock}
        onCancel={() => setSelectedStock(null)}
        footer={null}
        width={800}
      >
        {selectedStock && (
          <div className="stock-detail-modal">
            <h3>Volume Pattern</h3>
            <p>
              <strong>Contraction Period:</strong>{' '}
              {dayjs(selectedStock.volumePattern.contractionPeriod.startDate).format('YYYY-MM-DD')} to{' '}
              {dayjs(selectedStock.volumePattern.contractionPeriod.endDate).format('YYYY-MM-DD')}
            </p>
            <p>
              <strong>Contraction Avg Volume:</strong>{' '}
              {selectedStock.volumePattern.contractionPeriod.avgVolume.toLocaleString()}
            </p>
            <p>
              <strong>Expansion Start:</strong>{' '}
              {dayjs(selectedStock.volumePattern.expansionPoint.date).format('YYYY-MM-DD')}
            </p>
            <p>
              <strong>Expansion Multiplier:</strong> {selectedStock.volumePattern.expansionPoint.multiplier.toFixed(2)}x
            </p>

            <h3>Volume Support</h3>
            <p>
              <strong>Up Day Avg Volume:</strong>{' '}
              {selectedStock.volumeSupport.upDayAvgVolume.toLocaleString()}
            </p>
            <p>
              <strong>Down Day Avg Volume:</strong>{' '}
              {selectedStock.volumeSupport.downDayAvgVolume.toLocaleString()}
            </p>
            <p>
              <strong>Support Ratio:</strong> {selectedStock.volumeSupport.ratio.toFixed(2)}
            </p>

            <h3>Moving Averages</h3>
            <p>
              <strong>MA50:</strong> {selectedStock.movingAverages.ma50.toFixed(2)}{' '}
              {selectedStock.movingAverages.isTrendingUp && <Tag color="green">Trending Up</Tag>}
            </p>
            <p>
              <strong>MA150:</strong> {selectedStock.movingAverages.ma150.toFixed(2)}
            </p>
            <p>
              <strong>MA50 Slope:</strong> {selectedStock.movingAverages.ma50Slope.toFixed(4)}
            </p>
            <p>
              <strong>MA50 Below MA150:</strong> {selectedStock.movingAverages.ma50BelowMa150 ? 'Yes' : 'No'}
            </p>

            <h3>Criteria Status</h3>
            <p>
              <Tag color={selectedStock.criteria.meetsVolumeCriteria ? 'success' : 'error'}>
                Volume Criteria: {selectedStock.criteria.meetsVolumeCriteria ? 'Met' : 'Not Met'}
              </Tag>
            </p>
            <p>
              <Tag color={selectedStock.criteria.meetsMaCriteria ? 'success' : 'error'}>
                MA Criteria: {selectedStock.criteria.meetsMaCriteria ? 'Met' : 'Not Met'}
              </Tag>
            </p>
            <p>
              <Tag color={selectedStock.criteria.meetsSupportCriteria ? 'success' : 'error'}>
                Support Criteria: {selectedStock.criteria.meetsSupportCriteria ? 'Met' : 'Not Met'}
              </Tag>
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ResultsViewer;
