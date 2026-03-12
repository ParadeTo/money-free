/**
 * Stock Screener Page
 */

import { useState, useEffect } from 'react';
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
  Modal,
  Input,
  Dropdown,
  Popconfirm,
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  LineChartOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  MoreOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { screenerService, type StockResult, type FilterCondition as ApiFilterCondition } from '../services/screener.service';
import { strategyService, type Strategy } from '../services/strategy.service';
import styles from './ScreenerPage.module.css';

const { Option } = Select;

interface FilterCondition extends ApiFilterCondition {
  id: string;
  ma1Period?: string;
  ma2Period?: string;
}

const CONDITION_TYPES = [
  { value: 'indicator_value', label: 'Indicator Value' },
  { value: 'price_vs_ma', label: 'Price vs MA' },
  { value: 'ma_vs_ma', label: 'MA vs MA' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'price_change', label: 'Price Change' },
  { value: 'volume_change', label: 'Volume Change' },
  { value: 'week_52_high', label: '52-Week High' },
  { value: 'week_52_low', label: '52-Week Low' },
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

const MA_TYPES = [
  { value: 'ma50', label: 'MA50' },
  { value: 'ma150', label: 'MA150' },
  { value: 'ma200', label: 'MA200' },
];

const MA_PERIODS_DAILY = [
  { value: 'ma_50', label: 'MA50' },
  { value: 'ma_150', label: 'MA150' },
  { value: 'ma_200', label: 'MA200' },
];

const MA_PERIODS_WEEKLY = [
  { value: 'ma_10', label: 'MA10' },
  { value: 'ma_30', label: 'MA30' },
  { value: 'ma_40', label: 'MA40' },
];

const OPERATORS = [
  { value: '>', label: 'Greater than' },
  { value: '<', label: 'Less than' },
  { value: '>=', label: 'Greater than or equal' },
  { value: '<=', label: 'Less than or equal' },
  { value: '=', label: 'Equal' },
];

const PATTERNS = [
  { value: 'kdj_golden_cross', label: 'KDJ Golden Cross' },
  { value: 'kdj_death_cross', label: 'KDJ Death Cross' },
  { value: 'price_above_ma', label: 'Price Breaks Above MA' },
  { value: 'price_below_ma', label: 'Price Breaks Below MA' },
];

export function ScreenerPage() {
  const navigate = useNavigate();
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [results, setResults] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isTruncated, setIsTruncated] = useState(false);
  
  // Strategy related state
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [currentStrategyId, setCurrentStrategyId] = useState<string>();

  // Load strategy list
  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      const data = await strategyService.getAll();
      setStrategies(data);
    } catch (error: any) {
      console.error('Failed to load strategies:', error);
    }
  };

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
    setConditions(conditions.map(c => {
      if (c.id !== id) return c;
      
      const updated = { ...c, ...updates };
      
      // Set default values when switching to ma_vs_ma type
      if (updates.conditionType === 'ma_vs_ma') {
        if (!updated.ma1Period) updated.ma1Period = 'ma_50';
        if (!updated.ma2Period) updated.ma2Period = 'ma_150';
        if (!updated.operator) updated.operator = '>';
      }
      
      return updated;
    }));
  };

  // Save strategy
  const handleSaveStrategy = async () => {
    if (!strategyName.trim()) {
      message.error('Please enter strategy name');
      return;
    }

    if (conditions.length === 0) {
      message.error('Please add at least one filter condition');
      return;
    }

    try {
      const strategyConditions = conditions.map((c, index) => ({
        conditionType: c.conditionType,
        indicatorName: c.indicatorName,
        operator: c.operator,
        targetValue: c.targetValue,
        pattern: c.pattern,
        ma1Period: c.ma1Period,
        ma2Period: c.ma2Period,
        sortOrder: index,
      }));

      if (currentStrategyId) {
        // Update existing strategy
        await strategyService.update(currentStrategyId, {
          strategyName,
          description: strategyDescription,
          conditions: strategyConditions,
        });
        message.success('Strategy updated successfully');
      } else {
        // Create new strategy
        await strategyService.create({
          strategyName,
          description: strategyDescription,
          conditions: strategyConditions,
        });
        message.success('Strategy saved successfully');
      }

      setSaveModalVisible(false);
      setStrategyName('');
      setStrategyDescription('');
      setCurrentStrategyId(undefined);
      loadStrategies();
    } catch (error: any) {
      message.error(error.message || 'Failed to save strategy');
    }
  };

  // Load strategy
  const handleLoadStrategy = async (strategyId: string) => {
    try {
      const strategy = await strategyService.getOne(strategyId);
      
      // Convert strategy conditions to local format
      const loadedConditions: FilterCondition[] = strategy.conditions.map((c) => ({
        id: Date.now().toString() + Math.random(),
        conditionType: c.conditionType,
        indicatorName: c.indicatorName,
        operator: c.operator,
        targetValue: c.targetValue,
        pattern: c.pattern,
        ma1Period: c.ma1Period,
        ma2Period: c.ma2Period,
      }));

      setConditions(loadedConditions);
      setCurrentStrategyId(strategy.strategyId);
      setStrategyName(strategy.strategyName);
      setStrategyDescription(strategy.description || '');
      message.success(`Loaded strategy: ${strategy.strategyName}`);
    } catch (error: any) {
      message.error(error.message || 'Failed to load strategy');
    }
  };

  // Delete strategy
  const handleDeleteStrategy = async (strategyId: string) => {
    try {
      await strategyService.delete(strategyId);
      message.success('Strategy deleted successfully');
      loadStrategies();
      
      // If the current strategy is deleted, clear related state
      if (currentStrategyId === strategyId) {
        setCurrentStrategyId(undefined);
        setStrategyName('');
        setStrategyDescription('');
      }
    } catch (error: any) {
      message.error(error.message || 'Failed to delete strategy');
    }
  };

  // Open save strategy modal
  const openSaveModal = () => {
    if (conditions.length === 0) {
      message.warning('Please add at least one filter condition');
      return;
    }
    setSaveModalVisible(true);
  };

  const executeFilter = async () => {
    if (conditions.length === 0) {
      message.warning('Please add at least one filter condition');
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
          ma1Period: c.ma1Period,
          ma2Period: c.ma2Period,
        })),
        'stockCode',
        'asc',
      );

      setResults(result.stocks);
      setTotalCount(result.totalCount);
      setIsTruncated(result.isTruncated);
      
      if (result.stocks.length === 0) {
        message.info('No stocks found matching criteria');
      } else {
        message.success(`Found ${result.totalCount} stocks${result.isTruncated ? ' (showing first 100)' : ''}`);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Filter failed';
      message.error(errorMsg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<StockResult> = [
    {
      title: 'Stock Code',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 120,
      render: (code: string) => (
        <Button type="link" onClick={() => window.open(`/chart/${code}`, '_blank')}>
          {code}
        </Button>
      ),
    },
    {
      title: 'Stock Name',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 150,
    },
    {
      title: 'Market',
      dataIndex: 'market',
      key: 'market',
      width: 80,
      render: (market: string) => (
        <Tag color={market === 'SH' ? 'red' : 'green'}>{market}</Tag>
      ),
    },
    {
      title: 'Latest Price',
      dataIndex: 'latestPrice',
      key: 'latestPrice',
      width: 100,
      align: 'right',
      render: (price?: number) => price?.toFixed(2) || '-',
    },
    {
      title: 'Change %',
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
      title: 'Volume',
      dataIndex: 'volume',
      key: 'volume',
      width: 120,
      align: 'right',
      render: (vol?: number) => vol ? `${(vol / 10000).toFixed(0)}k` : '-',
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<LineChartOutlined />}
          onClick={() => window.open(`/chart/${record.stockCode}`, '_blank')}
        >
          View Chart
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Stock Screener</h1>
        <Space size="middle">
          {strategies.length > 0 && (
            <Dropdown
              menu={{
                items: strategies.map((strategy) => ({
                  key: strategy.strategyId,
                  label: (
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <span>{strategy.strategyName}</span>
                      <Space size="small" onClick={(e) => e.stopPropagation()}>
                        <Popconfirm
                          title="Are you sure to delete this strategy?"
                          onConfirm={() => handleDeleteStrategy(strategy.strategyId)}
                          okText="OK"
                          cancelText="Cancel"
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </Space>
                    </Space>
                  ),
                  onClick: () => handleLoadStrategy(strategy.strategyId),
                })),
              }}
            >
              <Button icon={<FolderOpenOutlined />}>
                Load Strategy
              </Button>
            </Dropdown>
          )}
          <Button 
            icon={<SaveOutlined />}
            onClick={openSaveModal}
            disabled={conditions.length === 0}
          >
            {currentStrategyId ? 'Update Strategy' : 'Save Strategy'}
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={addCondition}
          >
            Add Condition
          </Button>
          <Button 
            type="primary"
            icon={<SearchOutlined />}
            onClick={executeFilter}
            loading={loading}
            disabled={conditions.length === 0}
          >
            Start Screening
          </Button>
        </Space>
      </div>

      {conditions.length > 0 && (
        <Card className={styles.conditionsCard} title="Filter Conditions (All conditions must be met)">
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
                      placeholder="Target value"
                    />
                  </>
                )}

                {condition.conditionType === 'price_vs_ma' && (
                  <>
                    <span style={{ margin: '0 8px' }}>Price</span>
                    <Select
                      style={{ width: 100 }}
                      value={condition.operator}
                      onChange={(value) => updateCondition(condition.id, { operator: value })}
                    >
                      {OPERATORS.filter(op => op.value !== '=').map(op => (
                        <Option key={op.value} value={op.value}>{op.label}</Option>
                      ))}
                    </Select>
                    <Select
                      style={{ width: 120 }}
                      value={condition.indicatorName || 'ma50'}
                      onChange={(value) => updateCondition(condition.id, { indicatorName: value })}
                    >
                      {MA_TYPES.map(ma => (
                        <Option key={ma.value} value={ma.value}>{ma.label}</Option>
                      ))}
                    </Select>
                  </>
                )}

                {condition.conditionType === 'ma_vs_ma' && (
                  <>
                    <Select
                      style={{ width: 120 }}
                      value={condition.ma1Period || 'ma_50'}
                      onChange={(value) => updateCondition(condition.id, { ma1Period: value })}
                      placeholder="First MA"
                    >
                      {MA_PERIODS_DAILY.map(ma => (
                        <Option key={ma.value} value={ma.value}>{ma.label}</Option>
                      ))}
                    </Select>
                    <Select
                      style={{ width: 100 }}
                      value={condition.operator || '>'}
                      onChange={(value) => updateCondition(condition.id, { operator: value })}
                    >
                      {OPERATORS.filter(op => op.value !== '=').map(op => (
                        <Option key={op.value} value={op.value}>{op.label}</Option>
                      ))}
                    </Select>
                    <Select
                      style={{ width: 120 }}
                      value={condition.ma2Period || 'ma_150'}
                      onChange={(value) => updateCondition(condition.id, { ma2Period: value })}
                      placeholder="Second MA"
                    >
                      {MA_PERIODS_DAILY.map(ma => (
                        <Option key={ma.value} value={ma.value}>{ma.label}</Option>
                      ))}
                    </Select>
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
                      placeholder="Percentage (%)"
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
                  Delete
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
                Click "Add Condition" button to start creating filter conditions<br/>
                Set technical indicator conditions to quickly screen stocks that fit your investment strategy
              </span>
            }
          />
        </Card>
      )}

      {loading && (
        <div className={styles.loadingContainer}>
          <Spin size="large" tip="Screening stocks..." />
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          {isTruncated && (
            <Alert
              message="Too Many Results"
              description={`Found ${totalCount} stocks in total, showing first 100 results. Consider adding more filter conditions for more precise results.`}
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
                showTotal: (total) => `Total ${total} stocks`,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              scroll={{ x: 900 }}
            />
          </Card>
        </>
      )}

      {/* Save strategy modal */}
      <Modal
        title={currentStrategyId ? 'Update Strategy' : 'Save Stock Screening Strategy'}
        open={saveModalVisible}
        onOk={handleSaveStrategy}
        onCancel={() => {
          setSaveModalVisible(false);
          if (!currentStrategyId) {
            setStrategyName('');
            setStrategyDescription('');
          }
        }}
        okText="Save"
        cancelText="Cancel"
        width={500}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <label style={{ marginBottom: 8, display: 'block' }}>
              Strategy Name <span style={{ color: 'red' }}>*</span>
            </label>
            <Input
              placeholder="e.g., Oversold Rebound Strategy"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div>
            <label style={{ marginBottom: 8, display: 'block' }}>Strategy Description</label>
            <Input.TextArea
              placeholder="Optional: Describe the purpose and logic of the strategy"
              value={strategyDescription}
              onChange={(e) => setStrategyDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>
          <Alert
            message="Notice"
            description={`${conditions.length} filter condition(s) will be saved`}
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </div>
  );
}
