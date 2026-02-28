/**
 * 选股页面
 */

import { useState } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  message, 
  Select, 
  InputNumber, 
  Table, 
  Empty,
  Tag,
  Spin,
  Alert,
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  LineChartOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { screenerService, type StockResult, type FilterCondition as ApiFilterCondition } from '../services/screener.service';
import styles from './ScreenerPage.module.css';

const { Option } = Select;

interface FilterCondition extends ApiFilterCondition {
  id: string;
}

const CONDITION_TYPES = [
  { value: 'indicator_value', label: '指标数值' },
  { value: 'pattern', label: '指标形态' },
  { value: 'price_change', label: '涨跌幅' },
  { value: 'volume_change', label: '成交量变化' },
  { value: 'week_52_high', label: '创52周新高' },
  { value: 'week_52_low', label: '创52周新低' },
];

const INDICATORS = [
  { value: 'rsi', label: 'RSI' },
  { value: 'kdj_k', label: 'KDJ-K' },
  { value: 'kdj_d', label: 'KDJ-D' },
  { value: 'kdj_j', label: 'KDJ-J' },
  { value: 'ma50', label: 'MA50' },
  { value: 'ma150', label: 'MA150' },
  { value: 'ma200', label: 'MA200' },
];

const OPERATORS = [
  { value: '>', label: '大于' },
  { value: '<', label: '小于' },
  { value: '>=', label: '大于等于' },
  { value: '<=', label: '小于等于' },
  { value: '=', label: '等于' },
];

const PATTERNS = [
  { value: 'kdj_golden_cross', label: 'KDJ金叉' },
  { value: 'kdj_death_cross', label: 'KDJ死叉' },
  { value: 'price_above_ma', label: '价格突破均线' },
  { value: 'price_below_ma', label: '价格跌破均线' },
];

export function ScreenerPage() {
  const navigate = useNavigate();
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [results, setResults] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isTruncated, setIsTruncated] = useState(false);

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      conditionType: 'indicator_value',
      indicatorName: 'rsi',
      operator: '<',
      targetValue: 30,
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const executeFilter = async () => {
    if (conditions.length === 0) {
      message.warning('请至少添加一个筛选条件');
      return;
    }

    setLoading(true);
    try {
      const result = await screenerService.executeFilter(
        conditions.map(c => ({
          conditionType: c.conditionType,
          indicatorName: c.indicatorName,
          operator: c.operator,
          targetValue: c.targetValue,
          pattern: c.pattern,
        })),
        'stockCode',
        'asc',
      );

      setResults(result.stocks);
      setTotalCount(result.totalCount);
      setIsTruncated(result.isTruncated);
      
      if (result.stocks.length === 0) {
        message.info('未找到符合条件的股票');
      } else {
        message.success(`找到 ${result.totalCount} 只股票${result.isTruncated ? '（显示前100只）' : ''}`);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || '筛选失败';
      message.error(errorMsg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<StockResult> = [
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 120,
      render: (code: string) => (
        <Button type="link" onClick={() => navigate(`/chart/${code}`)}>
          {code}
        </Button>
      ),
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 150,
    },
    {
      title: '市场',
      dataIndex: 'market',
      key: 'market',
      width: 80,
      render: (market: string) => (
        <Tag color={market === 'SH' ? 'red' : 'green'}>{market}</Tag>
      ),
    },
    {
      title: '最新价',
      dataIndex: 'latestPrice',
      key: 'latestPrice',
      width: 100,
      align: 'right',
      render: (price?: number) => price?.toFixed(2) || '-',
    },
    {
      title: '涨跌幅',
      dataIndex: 'priceChangePercent',
      key: 'priceChangePercent',
      width: 100,
      align: 'right',
      render: (pct?: number) => {
        if (!pct) return '-';
        const color = pct > 0 ? '#ef5350' : pct < 0 ? '#26a69a' : '#666';
        return <span style={{ color }}>{pct > 0 ? '+' : ''}{pct.toFixed(2)}%</span>;
      },
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      width: 120,
      align: 'right',
      render: (vol?: number) => vol ? `${(vol / 10000).toFixed(0)}万` : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<LineChartOutlined />}
          onClick={() => navigate(`/chart/${record.stockCode}`)}
        >
          查看图表
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>选股筛选</h1>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={addCondition}
          >
            添加条件
          </Button>
          <Button 
            type="primary"
            icon={<SearchOutlined />}
            onClick={executeFilter}
            loading={loading}
            disabled={conditions.length === 0}
          >
            开始筛选
          </Button>
        </Space>
      </div>

      {conditions.length > 0 && (
        <Card className={styles.conditionsCard} title="筛选条件（所有条件必须同时满足）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {conditions.map((condition, index) => (
              <div key={condition.id} className={styles.conditionRow}>
                <span className={styles.conditionIndex}>{index + 1}.</span>
                
                <Select
                  style={{ width: 140 }}
                  value={condition.conditionType}
                  onChange={(value) => updateCondition(condition.id, { conditionType: value })}
                >
                  {CONDITION_TYPES.map(type => (
                    <Option key={type.value} value={type.value}>{type.label}</Option>
                  ))}
                </Select>

                {condition.conditionType === 'indicator_value' && (
                  <>
                    <Select
                      style={{ width: 120 }}
                      value={condition.indicatorName}
                      onChange={(value) => updateCondition(condition.id, { indicatorName: value })}
                    >
                      {INDICATORS.map(ind => (
                        <Option key={ind.value} value={ind.value}>{ind.label}</Option>
                      ))}
                    </Select>
                    <Select
                      style={{ width: 100 }}
                      value={condition.operator}
                      onChange={(value) => updateCondition(condition.id, { operator: value })}
                    >
                      {OPERATORS.map(op => (
                        <Option key={op.value} value={op.value}>{op.label}</Option>
                      ))}
                    </Select>
                    <InputNumber
                      style={{ width: 120 }}
                      value={condition.targetValue}
                      onChange={(value) => updateCondition(condition.id, { targetValue: value || 0 })}
                      placeholder="目标值"
                    />
                  </>
                )}

                {condition.conditionType === 'pattern' && (
                  <Select
                    style={{ width: 180 }}
                    value={condition.pattern}
                    onChange={(value) => updateCondition(condition.id, { pattern: value })}
                  >
                    {PATTERNS.map(p => (
                      <Option key={p.value} value={p.value}>{p.label}</Option>
                    ))}
                  </Select>
                )}

                {(condition.conditionType === 'price_change' || condition.conditionType === 'volume_change') && (
                  <>
                    <Select
                      style={{ width: 100 }}
                      value={condition.operator}
                      onChange={(value) => updateCondition(condition.id, { operator: value })}
                    >
                      {OPERATORS.map(op => (
                        <Option key={op.value} value={op.value}>{op.label}</Option>
                      ))}
                    </Select>
                    <InputNumber
                      style={{ width: 120 }}
                      value={condition.targetValue}
                      onChange={(value) => updateCondition(condition.id, { targetValue: value || 0 })}
                      placeholder="百分比(%)"
                      suffix="%"
                    />
                  </>
                )}

                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={() => removeCondition(condition.id)}
                >
                  删除
                </Button>
              </div>
            ))}
          </Space>
        </Card>
      )}

      {conditions.length === 0 && results.length === 0 && (
        <Card className={styles.card}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                点击"添加条件"按钮开始创建筛选条件<br/>
                通过设置技术指标条件，快速筛选符合您投资策略的股票
              </span>
            }
          />
        </Card>
      )}

      {loading && (
        <div className={styles.loadingContainer}>
          <Spin size="large" tip="正在筛选股票..." />
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          {isTruncated && (
            <Alert
              message="结果过多"
              description={`共找到 ${totalCount} 只股票，仅显示前100只结果。建议添加更多筛选条件以获得更精准的结果。`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Card className={styles.resultsCard}>
            <Table
              columns={columns}
              dataSource={results}
              rowKey="stockCode"
              pagination={{
                pageSize: 20,
                showTotal: (total) => `共 ${total} 只股票`,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              scroll={{ x: 900 }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
