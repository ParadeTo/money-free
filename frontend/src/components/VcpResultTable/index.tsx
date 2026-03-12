import { Table, Tag, Empty, Typography, Tooltip } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { VcpScanItem, VcpScanQuery, EarlyStageStock, VcpStage } from '../../types/vcp';
import styles from './VcpResultTable.module.css';

const { Text } = Typography;

interface VcpResultTableProps {
  data: VcpScanItem[] | EarlyStageStock[];
  loading: boolean;
  sortBy?: VcpScanQuery['sortBy'];
  sortOrder?: VcpScanQuery['sortOrder'];
  onSortChange?: (sortBy: VcpScanQuery['sortBy'], sortOrder: VcpScanQuery['sortOrder']) => void;
  expandedRowRender?: (record: VcpScanItem | EarlyStageStock) => React.ReactNode;
  expandedRowKeys?: string[];
  onExpand?: (expanded: boolean, record: VcpScanItem | EarlyStageStock) => void;
  actionColumn?: ColumnsType<VcpScanItem | EarlyStageStock>[number];
  highlightStage?: VcpStage;
  sortByStage?: boolean;
  showVcpStage?: boolean;
}

export function VcpResultTable({
  data,
  loading,
  sortBy,
  sortOrder,
  onSortChange,
  expandedRowRender,
  expandedRowKeys,
  onExpand,
  actionColumn,
  highlightStage,
  sortByStage = false,
  showVcpStage = false,
}: VcpResultTableProps) {
  const isEarlyStageData = (record: any): record is EarlyStageStock => {
    return 'vcpStage' in record;
  };

  const getStageInfo = (stage: VcpStage) => {
    switch (stage) {
      case 'contraction':
        return { label: 'Contracting', color: 'green', icon: '🟢' };
      case 'in_pullback':
        return { label: 'In Pullback', color: 'orange', icon: '🟡' };
      case 'pullback_ended':
        return { label: 'Pullback Ended', color: 'blue', icon: '🟠' };
      default:
        return { label: 'Unknown', color: 'default', icon: '' };
    }
  };

  const columns: ColumnsType<VcpScanItem | EarlyStageStock> = [
    {
      title: 'Stock Code',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 110,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 100,
    },
    ...(showVcpStage ? [{
      title: 'VCP Stage',
      key: 'vcpStage',
      width: 110,
      align: 'center' as const,
      render: (_: unknown, record: VcpScanItem | EarlyStageStock) => {
        if (!isEarlyStageData(record)) return <Tag color="default">-</Tag>;
        const stageInfo = getStageInfo(record.vcpStage);
        return (
          <Tooltip title={stageInfo.label}>
            <Tag color={stageInfo.color}>
              {stageInfo.icon} {stageInfo.label}
            </Tag>
          </Tooltip>
        );
      },
    }] : []),
    {
      title: 'Current Price',
      dataIndex: 'latestPrice',
      key: 'latestPrice',
      width: 100,
      align: 'right',
      render: (v: number) => v?.toFixed(2),
    },
    {
      title: 'Change %',
      dataIndex: 'priceChangePct',
      key: 'priceChangePct',
      width: 90,
      align: 'right',
      sorter: true,
      sortOrder: sortBy === 'priceChangePct' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {v >= 0 ? '+' : ''}{v?.toFixed(2)}%
        </Text>
      ),
    },
    {
      title: 'From 52W High',
      dataIndex: 'distFrom52WeekHigh',
      key: 'distFrom52WeekHigh',
      width: 110,
      align: 'right',
      render: (v: number) => <Text>{-Math.abs(v)?.toFixed(1)}%</Text>,
    },
    {
      title: 'From 52W Low',
      dataIndex: 'distFrom52WeekLow',
      key: 'distFrom52WeekLow',
      width: 110,
      align: 'right',
      render: (v: number) => <Text style={{ color: '#52c41a' }}>+{v?.toFixed(1)}%</Text>,
    },
    {
      title: 'Contractions',
      dataIndex: 'contractionCount',
      key: 'contractionCount',
      width: 90,
      align: 'center',
      sorter: true,
      sortOrder: sortBy === 'contractionCount' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Last Pullback',
      key: 'lastPullbackInfo',
      width: 150,
      align: 'center',
      render: (_: unknown, record: VcpScanItem) => {
        if (!record.lastPullback) {
          return <Tag color="default">-</Tag>;
        }
        
        const { pullbackPct, lowDate, highDate, highPrice, lowPrice, durationDays } = record.lastPullback;
        const isRecent = (new Date().getTime() - new Date(lowDate).getTime()) < 30 * 24 * 60 * 60 * 1000;
        
        const tooltipContent = (
          <div>
            <div>High: {new Date(highDate).toLocaleDateString('en-US')} - ¥{highPrice.toFixed(2)}</div>
            <div>Low: {new Date(lowDate).toLocaleDateString('en-US')} - ¥{lowPrice.toFixed(2)}</div>
            <div>Duration: {durationDays} days</div>
            <div>Pullback: {pullbackPct.toFixed(2)}%</div>
          </div>
        );
        
        return (
          <Tooltip title={tooltipContent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}>
              <Tag color={record.inPullback ? 'orange' : 'blue'}>
                {record.inPullback ? '🎯 ' : ''}{pullbackPct.toFixed(1)}%
              </Tag>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {new Date(lowDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {isRecent && ' 🔥'}
              </Text>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Last Contraction %',
      dataIndex: 'lastContractionPct',
      key: 'lastContractionPct',
      width: 120,
      align: 'right',
      sorter: true,
      sortOrder: sortBy === 'lastContractionPct' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
      render: (v: number) => `${v?.toFixed(1)}%`,
    },
    {
      title: 'Volume Dry Up',
      dataIndex: 'volumeDryingUp',
      key: 'volumeDryingUp',
      width: 100,
      align: 'center',
      sorter: true,
      sortOrder: sortBy === 'volumeDryingUp' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag>
      ),
    },
    {
      title: 'RS Rating',
      dataIndex: 'rsRating',
      key: 'rsRating',
      width: 90,
      align: 'right',
      sorter: true,
      sortOrder: sortBy === 'rsRating' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
      render: (v: number) => v?.toFixed(0),
    },
  ];

  if (actionColumn) {
    columns.push(actionColumn);
  }

  const handleTableChange: TableProps<VcpScanItem>['onChange'] = (_pagination, _filters, sorter) => {
    if (!Array.isArray(sorter) && sorter.columnKey) {
      const key = sorter.columnKey as VcpScanQuery['sortBy'];
      const order = sorter.order === 'descend' ? 'desc' : 'asc';
      onSortChange(key, order);
    }
  };

  const rowClassName = (record: VcpScanItem | EarlyStageStock) => {
    if (isEarlyStageData(record) && highlightStage && record.vcpStage === highlightStage) {
      return `${styles.container} vcp-stage-highlight`;
    }
    return styles.container;
  };

  return (
    <div className={styles.container}>
      <Table<VcpScanItem | EarlyStageStock>
        columns={columns}
        dataSource={data}
        rowKey="stockCode"
        loading={loading}
        onChange={handleTableChange}
        pagination={false}
        scroll={{ x: 1100 }}
        size="small"
        rowClassName={rowClassName}
        expandable={expandedRowRender ? {
          expandedRowRender,
          expandedRowKeys,
          onExpand: onExpand as any,
          expandRowByClick: true,
        } : undefined}
        locale={{
          emptyText: <Empty description="No stocks meeting VCP criteria" />,
        }}
      />
      <style jsx global>{`
        .vcp-stage-highlight {
          background-color: #f6ffed !important;
          border-left: 3px solid #52c41a;
        }
        .vcp-stage-highlight:hover {
          background-color: #efffdb !important;
        }
      `}</style>
    </div>
  );
}
