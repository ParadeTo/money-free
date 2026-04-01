import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, Table, Tag, Space, Statistic, Spin, Empty, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { volumeSurgeScanApi } from '../../../services/volumeSurgeScanApi';
import { ScanSummary, PersistentStock, CompareResult } from '../../../types/scan.types';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';

const ComparisonView: React.FC = () => {
  const [form] = Form.useForm();
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<CompareResult | null>(null);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    setLoading(true);
    try {
      const response = await volumeSurgeScanApi.getScans({ limit: 100 });
      if (response.success && response.data) {
        const completedScans = response.data.scans.filter((s) => s.status === 'COMPLETED');
        setScans(completedScans);
      }
    } catch (error) {
      message.error('Failed to load scans');
      console.error('Failed to fetch scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async (values: { scanId1: string; scanId2: string }) => {
    if (values.scanId1 === values.scanId2) {
      message.warning('Please select two different scans');
      return;
    }

    setComparing(true);
    try {
      const response = await volumeSurgeScanApi.compareScans({
        scanId1: values.scanId1,
        scanId2: values.scanId2,
      });

      if (response.success && response.data) {
        setComparisonResult(response.data);
      }
    } catch (error) {
      message.error('Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  const getTrendTag = (trend: 'improving' | 'declining' | 'stable') => {
    const trendMap = {
      improving: { color: 'green', text: 'Improving ↗' },
      declining: { color: 'red', text: 'Declining ↘' },
      stable: { color: 'blue', text: 'Stable →' },
    };
    const config = trendMap[trend];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: TableProps<PersistentStock>['columns'] = [
    {
      title: 'Stock Code',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 120,
      render: (code: string, record: PersistentStock) => (
        <div>
          <Link to={`/chart/${code}`} style={{ fontWeight: 'bold' }}>
            {code}
          </Link>
          <div style={{ fontSize: '12px', color: '#888' }}>{record.stockName}</div>
        </div>
      ),
    },
    {
      title: 'Scan 1 Ratio',
      dataIndex: 'volumeSupportRatio1',
      key: 'volumeSupportRatio1',
      width: 140,
      render: (value: number) => value.toFixed(2),
    },
    {
      title: 'Scan 2 Ratio',
      dataIndex: 'volumeSupportRatio2',
      key: 'volumeSupportRatio2',
      width: 140,
      render: (value: number) => value.toFixed(2),
    },
    {
      title: 'Trend',
      dataIndex: 'trend',
      key: 'trend',
      width: 150,
      render: (trend: 'improving' | 'declining' | 'stable') => getTrendTag(trend),
    },
  ];

  return (
    <div className="comparison-view">
      <Card title="Compare Two Scans" loading={loading}>
        {!loading && scans.length < 2 ? (
          <Empty description="No completed scans available for comparison. Run at least two scans first." />
        ) : (
          <Form form={form} layout="inline" onFinish={handleCompare}>
            <Form.Item
              name="scanId1"
              label="First Scan"
              rules={[{ required: true, message: 'Please select the first scan' }]}
            >
              <Select
                placeholder="Select first scan"
                style={{ width: 250 }}
                showSearch
                optionFilterProp="children"
              >
                {scans.map((s) => (
                  <Select.Option key={s.scanId} value={s.scanId}>
                    {dayjs(s.scanDate).format('YYYY-MM-DD')} - {s.matchedStocks} matched
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="scanId2"
              label="Second Scan"
              rules={[{ required: true, message: 'Please select the second scan' }]}
            >
              <Select
                placeholder="Select second scan"
                style={{ width: 250 }}
                showSearch
                optionFilterProp="children"
              >
                {scans.map((s) => (
                  <Select.Option key={s.scanId} value={s.scanId}>
                    {dayjs(s.scanDate).format('YYYY-MM-DD')} - {s.matchedStocks} matched
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SwapOutlined />}
                loading={comparing}
              >
                Compare
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>

      {comparisonResult && (
        <>
          <Card style={{ marginTop: 16 }} title="Comparison Summary">
            <Space size="large">
              <Statistic
                title="Persistent Stocks"
                value={comparisonResult.summary.persistentCount}
                valueStyle={{ color: '#3f8600' }}
              />
              <Statistic
                title="Only in Scan 1"
                value={comparisonResult.summary.onlyInScan1}
              />
              <Statistic
                title="Only in Scan 2"
                value={comparisonResult.summary.onlyInScan2}
              />
            </Space>
          </Card>

          <Card style={{ marginTop: 16 }} title="Persistent Stocks (Matched in Both Scans)">
            <Spin spinning={comparing}>
              {comparisonResult.persistentStocks.length === 0 ? (
                <Empty description="No persistent stocks found between the two scans" />
              ) : (
                <Table
                  dataSource={comparisonResult.persistentStocks}
                  columns={columns}
                  rowKey="stockCode"
                  pagination={{ pageSize: 20 }}
                />
              )}
            </Spin>
          </Card>
        </>
      )}
    </div>
  );
};

export default ComparisonView;
