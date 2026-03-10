import { Spin, Alert, Button, Table, Tag, Divider, Typography } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { vcpService } from '../../services/vcp.service';
import { TrendTemplateChecks } from '../TrendTemplateChecks';
import type { VcpDetailResponse, Contraction } from '../../types/vcp';
import styles from './VcpDetailPanel.module.css';

const { Text } = Typography;

interface VcpDetailPanelProps {
  stockCode: string;
}

export function VcpDetailPanel({ stockCode }: VcpDetailPanelProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<VcpDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    vcpService.getVcpDetail(stockCode)
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load detail'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [stockCode]);

  if (loading) return <div className={styles.loading}><Spin /></div>;
  if (error) return <Alert type="error" message={error} />;
  if (!data) return null;

  const contractionColumns = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 60 },
    { title: '高点日期', dataIndex: 'swingHighDate', key: 'swingHighDate', width: 110 },
    { title: '高点价格', dataIndex: 'swingHighPrice', key: 'swingHighPrice', width: 90, render: (v: number) => v?.toFixed(2) },
    { title: '低点日期', dataIndex: 'swingLowDate', key: 'swingLowDate', width: 110 },
    { title: '低点价格', dataIndex: 'swingLowPrice', key: 'swingLowPrice', width: 90, render: (v: number) => v?.toFixed(2) },
    { title: '幅度%', dataIndex: 'depthPct', key: 'depthPct', width: 80, render: (v: number) => `${v?.toFixed(1)}%` },
    { title: '天数', dataIndex: 'durationDays', key: 'durationDays', width: 60 },
    { title: '平均成交量', dataIndex: 'avgVolume', key: 'avgVolume', width: 110, render: (v: number) => v?.toLocaleString() },
  ];

  return (
    <div className={styles.container}>
      <TrendTemplateChecks
        checks={data.trendTemplate.checks}
        allPass={data.trendTemplate.allPass}
      />

      <Divider style={{ margin: '12px 0' }} />

      <div className={styles.sectionHeader}>
        <Text strong>收缩记录</Text>
        <Tag color={data.volumeDryingUp ? 'green' : 'default'}>
          成交量配合: {data.volumeDryingUp ? '是' : '否'}
        </Tag>
      </div>

      <Table<Contraction>
        columns={contractionColumns}
        dataSource={data.contractions}
        rowKey="index"
        pagination={false}
        size="small"
      />

      <div className={styles.actions}>
        <Button
          type="link"
          icon={<LineChartOutlined />}
          onClick={() => navigate(`/chart/${stockCode}`)}
        >
          查看K线
        </Button>
      </div>
    </div>
  );
}
