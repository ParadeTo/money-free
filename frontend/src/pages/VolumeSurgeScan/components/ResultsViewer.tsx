import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Select, Spin, Statistic, Row, Col, Modal, message } from 'antd';
import { DownloadOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { volumeSurgeScanApi } from '../../../services/volumeSurgeScanApi';
import { ScanSummary, ScanResultDetail } from '../../../types/scan.types';
import dayjs from 'dayjs';

interface ResultsViewerProps {
  scan: ScanSummary;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ scan }) => {
  const [results, setResults] = useState<ScanResultDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('matched');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [selectedStock, setSelectedStock] = useState<ScanResultDetail | null>(null);

  const fetchResults = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const response = await volumeSurgeScanApi.getScanResults(scan.scanId, {
        filter,
        page,
        limit: pageSize,
        sortBy: 'volumeSupportRatio',
        sortOrder: 'desc',
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
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(1, pagination.pageSize);
  }, [scan.scanId, filter]);

  const handleExport = async (format: 'csv' | 'markdown') => {
    try {
      const content = await volumeSurgeScanApi.exportResults(scan.scanId, format, filter);
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
    } catch (error) {
      message.error('Export failed');
    }
  };

  const columns = [
    {
      title: 'Stock Code',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 120,
      render: (code: string) => <strong>{code}</strong>,
    },
    {
      title: 'Expansion Multiplier',
      dataIndex: 'expansionMultiplier',
      key: 'expansionMultiplier',
      width: 150,
      render: (value: number) => `${value.toFixed(2)}x`,
      sorter: true,
    },
    {
      title: 'Volume Support Ratio',
      dataIndex: 'volumeSupportRatio',
      key: 'volumeSupportRatio',
      width: 180,
      render: (value: number) => (
        <Tag color={value >= 1.5 ? 'green' : value >= 1.2 ? 'orange' : 'red'}>
          {value.toFixed(2)}
        </Tag>
      ),
      sorter: true,
    },
    {
      title: 'MA50 Slope',
      dataIndex: 'ma50Slope',
      key: 'ma50Slope',
      width: 120,
      render: (value: number) => (
        <span style={{ color: value > 0 ? 'green' : 'red' }}>
          {value > 0 ? '↗' : '↘'} {value.toFixed(4)}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_: any, record: ScanResultDetail) => (
        <Tag color={record.meetsAllCriteria ? 'success' : 'warning'}>
          {record.meetsAllCriteria ? 'All Criteria Met' : 'Partial Match'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: ScanResultDetail) => (
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
          <Table
            dataSource={results}
            columns={columns}
            rowKey="stockCode"
            pagination={{
              ...pagination,
              onChange: fetchResults,
            }}
          />
        </Spin>
      </Card>

      <Modal
        title={`Stock Details: ${selectedStock?.stockCode}`}
        visible={!!selectedStock}
        onCancel={() => setSelectedStock(null)}
        footer={null}
        width={800}
      >
        {selectedStock && (
          <div className="stock-detail-modal">
            <h3>Volume Pattern</h3>
            <p>
              <strong>Contraction Period:</strong>{' '}
              {dayjs(selectedStock.contractionStartDate).format('YYYY-MM-DD')} to{' '}
              {dayjs(selectedStock.contractionEndDate).format('YYYY-MM-DD')}
            </p>
            <p>
              <strong>Contraction Avg Volume:</strong>{' '}
              {selectedStock.contractionAvgVolume.toLocaleString()}
            </p>
            <p>
              <strong>Expansion Start:</strong>{' '}
              {dayjs(selectedStock.expansionStartDate).format('YYYY-MM-DD')}
            </p>
            <p>
              <strong>Expansion Multiplier:</strong> {selectedStock.expansionMultiplier.toFixed(2)}x
            </p>

            <h3>Volume Support</h3>
            <p>
              <strong>Up Day Avg Volume:</strong>{' '}
              {selectedStock.upDayAvgVolume.toLocaleString()}
            </p>
            <p>
              <strong>Down Day Avg Volume:</strong>{' '}
              {selectedStock.downDayAvgVolume.toLocaleString()}
            </p>
            <p>
              <strong>Support Ratio:</strong> {selectedStock.volumeSupportRatio.toFixed(2)}
            </p>

            <h3>Moving Averages</h3>
            <p>
              <strong>MA50:</strong> {selectedStock.ma50Value.toFixed(2)}{' '}
              {selectedStock.ma50TrendingUp && <Tag color="green">Trending Up</Tag>}
            </p>
            <p>
              <strong>MA150:</strong> {selectedStock.ma150Value.toFixed(2)}
            </p>
            <p>
              <strong>MA50 Slope:</strong> {selectedStock.ma50Slope.toFixed(4)}
            </p>
            <p>
              <strong>MA50 Below MA150:</strong> {selectedStock.ma50BelowMa150 ? 'Yes' : 'No'}
            </p>

            <h3>Criteria Status</h3>
            <p>
              <Tag color={selectedStock.meetsVolumeCriteria ? 'success' : 'error'}>
                Volume Criteria: {selectedStock.meetsVolumeCriteria ? 'Met' : 'Not Met'}
              </Tag>
            </p>
            <p>
              <Tag color={selectedStock.meetsMaCriteria ? 'success' : 'error'}>
                MA Criteria: {selectedStock.meetsMaCriteria ? 'Met' : 'Not Met'}
              </Tag>
            </p>
            <p>
              <Tag color={selectedStock.meetsSupportCriteria ? 'success' : 'error'}>
                Support Criteria: {selectedStock.meetsSupportCriteria ? 'Met' : 'Not Met'}
              </Tag>
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ResultsViewer;
