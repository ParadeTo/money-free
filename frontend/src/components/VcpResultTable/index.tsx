import { Table, Tag, Empty, Typography } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { VcpScanItem, VcpScanQuery } from '../../types/vcp';
import styles from './VcpResultTable.module.css';

const { Text } = Typography;

interface VcpResultTableProps {
  data: VcpScanItem[];
  loading: boolean;
  sortBy: VcpScanQuery['sortBy'];
  sortOrder: VcpScanQuery['sortOrder'];
  onSortChange: (sortBy: VcpScanQuery['sortBy'], sortOrder: VcpScanQuery['sortOrder']) => void;
  expandedRowRender?: (record: VcpScanItem) => React.ReactNode;
  expandedRowKeys?: string[];
  onExpand?: (expanded: boolean, record: VcpScanItem) => void;
  actionColumn?: ColumnsType<VcpScanItem>[number];
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
}: VcpResultTableProps) {
  const columns: ColumnsType<VcpScanItem> = [
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

  return (
    <div className={styles.container}>
      <Table<VcpScanItem>
        columns={columns}
        dataSource={data}
        rowKey="stockCode"
        loading={loading}
        onChange={handleTableChange}
        pagination={false}
        scroll={{ x: 1100 }}
        size="small"
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
    </div>
  );
}
