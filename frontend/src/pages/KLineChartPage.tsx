/**
 * K线图表页面
 * 
 * 集成所有组件，提供完整的股票K线分析界面
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Alert, Button } from 'antd';
import { StockSearch } from '../components/StockSearch';
import { KLineChart } from '../components/KLineChart';
import { IndicatorSelector } from '../components/IndicatorSelector';
import { PeriodToggle } from '../components/PeriodToggle';
import { DrawingToolbar } from '../components/DrawingToolbar';
import { useKLineData } from '../hooks/useKLineData';
import { useIndicators } from '../hooks/useIndicators';
import { useChartStore } from '../store/chart.store';
import { stockService } from '../services/stock.service';
import styles from '../styles/chart-page.module.css';
import type { Stock } from '../types/stock';
import { useState } from 'react';

export function KLineChartPage() {
  const { stockCode } = useParams<{ stockCode: string }>();
  const navigate = useNavigate();
  
  const [stockInfo, setStockInfo] = useState<Stock | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  
  const {
    period,
    selectedIndicators,
    showVolume,
    showTurnover,
    activeTool,
    setPeriod,
    setSelectedIndicators,
    setStockCode,
  } = useChartStore();

  // 加载K线数据
  const {
    data: klineData,
    loading: klineLoading,
    error: klineError,
    refresh: refreshKLine,
  } = useKLineData(stockCode || '', period);

  // 加载技术指标数据
  const {
    indicators,
    loading: indicatorLoading,
    error: indicatorError,
    refresh: refreshIndicators,
  } = useIndicators(stockCode || '', period, selectedIndicators);

  // 加载股票信息
  useEffect(() => {
    if (!stockCode) return;

    const loadStockInfo = async () => {
      try {
        setLoadingStock(true);
        const info = await stockService.getStockDetail(stockCode);
        setStockInfo(info);
        setStockCode(stockCode);
      } catch (error) {
        console.error('加载股票信息失败:', error);
      } finally {
        setLoadingStock(false);
      }
    };

    loadStockInfo();
  }, [stockCode, setStockCode]);

  const handleStockSelect = (code: string) => {
    navigate(`/chart/${code}`);
  };

  const handleRefresh = () => {
    refreshKLine();
    refreshIndicators();
  };

  if (!stockCode) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.stockSearch}>
              <StockSearch onSelect={handleStockSelect} />
            </div>
          </div>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 'calc(100vh - 64px)',
          color: '#a0aec0'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2>请搜索并选择股票</h2>
            <p>输入股票代码或名称进行搜索</p>
          </div>
        </div>
      </div>
    );
  }

  const loading = klineLoading || indicatorLoading || loadingStock;
  const error = klineError || indicatorError;

  return (
    <div className={styles.page}>
      {/* 顶部导航栏 */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.stockSearch}>
            <StockSearch onSelect={handleStockSelect} />
          </div>
          <div className={styles.headerActions}>
            <PeriodToggle value={period} onChange={setPeriod} />
            <Button type="primary" onClick={handleRefresh}>
              刷新数据
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className={styles.mainContent}>
        {/* 左侧：图表区 */}
        <div className={styles.chartSection}>
          {/* 股票信息卡片 */}
          {stockInfo && (
            <div className={styles.stockInfoCard}>
              <div className={styles.stockInfoHeader}>
                <div className={styles.stockCode}>{stockInfo.stock_code}</div>
                <div className={styles.stockName}>{stockInfo.stock_name}</div>
              </div>
              <div className={styles.stockMetrics}>
                {stockInfo.latest_price && (
                  <div className={styles.metric}>
                    <div className={styles.metricLabel}>最新价</div>
                    <div className={`${styles.metricValue} ${
                      (stockInfo.price_change || 0) > 0 ? styles.positive :
                      (stockInfo.price_change || 0) < 0 ? styles.negative :
                      styles.neutral
                    }`}>
                      ¥{stockInfo.latest_price.toFixed(2)}
                    </div>
                  </div>
                )}
                {stockInfo.price_change !== undefined && (
                  <div className={styles.metric}>
                    <div className={styles.metricLabel}>涨跌额</div>
                    <div className={`${styles.metricValue} ${
                      stockInfo.price_change > 0 ? styles.positive :
                      stockInfo.price_change < 0 ? styles.negative :
                      styles.neutral
                    }`}>
                      {stockInfo.price_change > 0 ? '+' : ''}
                      {stockInfo.price_change.toFixed(2)}
                    </div>
                  </div>
                )}
                {stockInfo.price_change_percent !== undefined && (
                  <div className={styles.metric}>
                    <div className={styles.metricLabel}>涨跌幅</div>
                    <div className={`${styles.metricValue} ${
                      stockInfo.price_change_percent > 0 ? styles.positive :
                      stockInfo.price_change_percent < 0 ? styles.negative :
                      styles.neutral
                    }`}>
                      {stockInfo.price_change_percent > 0 ? '+' : ''}
                      {stockInfo.price_change_percent.toFixed(2)}%
                    </div>
                  </div>
                )}
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>市值</div>
                  <div className={`${styles.metricValue} ${styles.neutral}`}>
                    {stockInfo.market_cap.toFixed(2)}亿
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 图表容器 */}
          <div className={styles.chartContainer}>
            {loading && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '550px' 
              }}>
                <Spin size="large" tip="加载数据中..." />
              </div>
            )}
            
            {error && (
              <Alert
                message="加载失败"
                description={error.message}
                type="error"
                showIcon
                style={{ margin: '1rem 0' }}
              />
            )}
            
            {!loading && !error && klineData.length > 0 && (
              <KLineChart
                data={klineData}
                indicators={indicators}
                period={period}
                showVolume={showVolume}
                showTurnover={showTurnover}
                selectedIndicators={selectedIndicators}
              />
            )}
            
            {!loading && !error && klineData.length === 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '550px',
                color: '#a0aec0'
              }}>
                暂无K线数据
              </div>
            )}
          </div>
        </div>

        {/* 右侧：控制面板 */}
        <aside className={styles.sidebar}>
          <div className={styles.controlCard}>
            <div className={styles.cardTitle}>绘图工具</div>
            <DrawingToolbar />
            {activeTool !== 'none' && (
              <div style={{ 
                marginTop: '12px', 
                padding: '8px 12px', 
                background: 'rgba(102, 126, 234, 0.1)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#667eea',
              }}>
                绘图模式已激活
              </div>
            )}
          </div>
          
          <div className={styles.controlCard}>
            <div className={styles.cardTitle}>技术指标</div>
            <IndicatorSelector
              selectedIndicators={selectedIndicators}
              period={period}
              onChange={setSelectedIndicators}
            />
          </div>

          <div className={styles.controlCard}>
            <div className={styles.cardTitle}>图表设置</div>
            <div className={styles.controlGroup}>
              <div style={{ fontSize: '0.875rem', color: '#a0aec0' }}>
                当前周期：{period === 'daily' ? '日K' : '周K'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#a0aec0' }}>
                数据点数：{klineData.length}
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
