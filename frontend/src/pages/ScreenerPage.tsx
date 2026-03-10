/**
 * 选股页面
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
  { value: 'indicator_value', label: '指标数值' },
  { value: 'price_vs_ma', label: '股价与均线' },
  { value: 'ma_vs_ma', label: '均线与均线' },
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
  
  // 策略相关状态
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [currentStrategyId, setCurrentStrategyId] = useState<string>();

  // 加载策略列表
  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      const data = await strategyService.getAll();
      setStrategies(data);
    } catch (error: any) {
      console.error('加载策略失败:', error);
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
      
      // 当切换到 ma_vs_ma 类型时，设置默认值
      if (updates.conditionType === 'ma_vs_ma') {
        if (!updated.ma1Period) updated.ma1Period = 'ma_50';
        if (!updated.ma2Period) updated.ma2Period = 'ma_150';
        if (!updated.operator) updated.operator = '>';
      }
      
      return updated;
    }));
  };

  // 保存策略
  const handleSaveStrategy = async () => {
    if (!strategyName.trim()) {
      message.error('请输入策略名称');
      return;
    }

    if (conditions.length === 0) {
      message.error('请至少添加一个筛选条件');
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
        // 更新现有策略
        await strategyService.update(currentStrategyId, {
          strategyName,
          description: strategyDescription,
          conditions: strategyConditions,
        });
        message.success('策略更新成功');
      } else {
        // 创建新策略
        await strategyService.create({
          strategyName,
          description: strategyDescription,
          conditions: strategyConditions,
        });
        message.success('策略保存成功');
      }

      setSaveModalVisible(false);
      setStrategyName('');
      setStrategyDescription('');
      setCurrentStrategyId(undefined);
      loadStrategies();
    } catch (error: any) {
      message.error(error.message || '保存策略失败');
    }
  };

  // 加载策略
  const handleLoadStrategy = async (strategyId: string) => {
    try {
      const strategy = await strategyService.getOne(strategyId);
      
      // 将策略条件转换为本地格式
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
      message.success(`已加载策略: ${strategy.strategyName}`);
    } catch (error: any) {
      message.error(error.message || '加载策略失败');
    }
  };

  // 删除策略
  const handleDeleteStrategy = async (strategyId: string) => {
    try {
      await strategyService.delete(strategyId);
      message.success('策略删除成功');
      loadStrategies();
      
      // 如果删除的是当前加载的策略，清空相关状态
      if (currentStrategyId === strategyId) {
        setCurrentStrategyId(undefined);
        setStrategyName('');
        setStrategyDescription('');
      }
    } catch (error: any) {
      message.error(error.message || '删除策略失败');
    }
  };

  // 打开保存策略弹窗
  const openSaveModal = () => {
    if (conditions.length === 0) {
      message.warning('请至少添加一个筛选条件');
      return;
    }
    setSaveModalVisible(true);
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
        <Button type="link" onClick={() => window.open(`/chart/${code}`, '_blank')}>
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
          onClick={() => window.open(`/chart/${record.stockCode}`, '_blank')}
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
                          title="确定删除此策略？"
                          onConfirm={() => handleDeleteStrategy(strategy.strategyId)}
                          okText="确定"
                          cancelText="取消"
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
                加载策略
              </Button>
            </Dropdown>
          )}
          <Button 
            icon={<SaveOutlined />}
            onClick={openSaveModal}
            disabled={conditions.length === 0}
          >
            {currentStrategyId ? '更新策略' : '保存策略'}
          </Button>
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

                {condition.conditionType === 'price_vs_ma' && (
                  <>
                    <span style={{ margin: '0 8px' }}>股价</span>
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
                      placeholder="第一条均线"
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
                      placeholder="第二条均线"
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

      {/* 保存策略弹窗 */}
      <Modal
        title={currentStrategyId ? '更新策略' : '保存选股策略'}
        open={saveModalVisible}
        onOk={handleSaveStrategy}
        onCancel={() => {
          setSaveModalVisible(false);
          if (!currentStrategyId) {
            setStrategyName('');
            setStrategyDescription('');
          }
        }}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <label style={{ marginBottom: 8, display: 'block' }}>
              策略名称 <span style={{ color: 'red' }}>*</span>
            </label>
            <Input
              placeholder="请输入策略名称，例如：超跌反弹策略"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div>
            <label style={{ marginBottom: 8, display: 'block' }}>策略描述</label>
            <Input.TextArea
              placeholder="可选：描述策略的用途和逻辑"
              value={strategyDescription}
              onChange={(e) => setStrategyDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>
          <Alert
            message="提示"
            description={`当前共有 ${conditions.length} 个筛选条件将被保存`}
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </div>
  );
}
