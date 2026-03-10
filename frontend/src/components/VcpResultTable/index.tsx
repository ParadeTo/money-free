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
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 110,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: '名称',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 100,
    },
    {
      title: '当前价格',
      dataIndex: 'latestPrice',
      key: 'latestPrice',
      width: 100,
      align: 'right',
      render: (v: number) => v?.toFixed(2),
    },
    {
      title: '涨跌幅',
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
      title: '距52周高点',
      dataIndex: 'distFrom52WeekHigh',
      key: 'distFrom52WeekHigh',
      width: 110,
      align: 'right',
      render: (v: number) => <Text>{-Math.abs(v)?.toFixed(1)}%</Text>,
    },
    {
      title: '距52周低点',
      dataIndex: 'distFrom52WeekLow',
      key: 'distFrom52WeekLow',
      width: 110,
      align: 'right',
      render: (v: number) => <Text style={{ color: '#52c41a' }}>+{v?.toFixed(1)}%</Text>,
    },
    {
      title: '收缩次数',
      dataIndex: 'contractionCount',
      key: 'contractionCount',
      width: 90,
      align: 'center',
      sorter: true,
      sortOrder: sortBy === 'contractionCount' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '最近收缩幅度',
      dataIndex: 'lastContractionPct',
      key: 'lastContractionPct',
      width: 120,
      align: 'right',
      sorter: true,
      sortOrder: sortBy === 'lastContractionPct' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
      render: (v: number) => `${v?.toFixed(1)}%`,
    },
    {
      title: '成交量配合',
      dataIndex: 'volumeDryingUp',
      key: 'volumeDryingUp',
      width: 100,
      align: 'center',
      sorter: true,
      sortOrder: sortBy === 'volumeDryingUp' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? '是' : '否'}</Tag>
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
          emptyText: <Empty description="当前无符合 VCP 条件的股票" />,
        }}
      />
    </div>
  );
}
