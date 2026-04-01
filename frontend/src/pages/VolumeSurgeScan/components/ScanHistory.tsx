import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Pagination, Card, Empty, message } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { volumeSurgeScanApi } from '../../../services/volumeSurgeScanApi';
import { ScanSummary } from '../../../types/scan.types';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';

interface ScanHistoryProps {
  refreshTrigger?: number;
  onScanSelect?: (scanId: string) => void;
}

const ScanHistory: React.FC<ScanHistoryProps> = ({ refreshTrigger = 0, onScanSelect }) => {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchScans = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await volumeSurgeScanApi.getScans({
        page,
        limit: pageSize,
      });

      if (response.success && response.data) {
        setScans(response.data.scans);
        setPagination({
          current: response.data.pagination.page,
          pageSize: response.data.pagination.limit,
          total: response.data.pagination.total,
        });
      }
    } catch (error) {
      message.error('Failed to load scan history');
      console.error('Failed to fetch scans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans(pagination.current, pagination.pageSize);
  }, [refreshTrigger]);

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      RUNNING: { color: 'processing', text: 'Running' },
      COMPLETED: { color: 'success', text: 'Completed' },
      FAILED: { color: 'error', text: 'Failed' },
      CANCELLED: { color: 'default', text: 'Cancelled' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: TableProps<ScanSummary>['columns'] = [
    {
      title: 'Scan Date',
      dataIndex: 'scanDate',
      key: 'scanDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Mode',
      dataIndex: 'scanMode',
      key: 'scanMode',
      render: (mode: string) => <Tag>{mode}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Matched',
      dataIndex: 'matchedStocks',
      key: 'matchedStocks',
      render: (matched: number, record: ScanSummary) => (
        <span>
          {matched} / {record.totalStocks}
        </span>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'durationMs',
      key: 'durationMs',
      render: (ms?: number) => (ms ? `${(ms / 1000).toFixed(1)}s` : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: ScanSummary) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => onScanSelect?.(record.scanId)}
          >
            View Results
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Scan History"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => fetchScans(1, pagination.pageSize)}>
          Refresh
        </Button>
      }
    >
      {!loading && scans.length === 0 ? (
        <Empty description="No scans found. Start a new scan to see results here." />
      ) : (
        <>
          <Table
            dataSource={scans}
            columns={columns}
            loading={loading}
            rowKey="scanId"
            pagination={false}
          />
          <Pagination
            style={{ marginTop: 16, textAlign: 'right' }}
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={fetchScans}
            showSizeChanger
            showTotal={(total) => `Total ${total} scans`}
          />
        </>
      )}
    </Card>
  );
};

export default ScanHistory;
