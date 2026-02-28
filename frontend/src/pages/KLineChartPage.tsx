import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Alert } from 'antd';
import { useState } from 'react';
import { StockSearch } from '../components/StockSearch';
import { KLineChart } from '../components/KLineChart';
import { ChartToolbar } from '../components/ChartToolbar';
import { ChartDataDisplay } from '../components/ChartDataDisplay';
import { IndicatorValueDisplay } from '../components/IndicatorValueDisplay';
import { useKLineData } from '../hooks/useKLineData';
import { useIndicators } from '../hooks/useIndicators';
import { useChartStore } from '../store/chart.store';
import type { Stock, KLineData } from '../types';
import styles from './KLineChartPage.module.css';

export function KLineChartPage() {
  const { stockCode } = useParams<{ stockCode?: string }>();
  const navigate = useNavigate();
  const [currentData, setCurrentData] = useState<KLineData | undefined>();

  const {
    period,
    timeRange,
    showMA,
    subChart1Indicator,
    subChart2Indicator,
    setStockCode,
  } = useChartStore();

  // 当路由参数变化时更新 store
  useEffect(() => {
    if (stockCode) {
      setStockCode(stockCode);
      // 重置当前显示的数据
      setCurrentData(undefined);
    }
  }, [stockCode, setStockCode]);

  // 加载K线数据
  const {
    data: klineData,
    loading: klineLoading,
    error: klineError,
  } = useKLineData(stockCode || '', period, timeRange);

  // 加载技术指标数据
  const {
    data: indicatorData,
    markers,
    loading: indicatorLoading,
    error: indicatorError,
  } = useIndicators(stockCode || '', period, subChart1Indicator, subChart2Indicator, showMA, timeRange);

  const handleStockSelect = (stock: Stock) => {
    navigate(`/chart/${stock.stockCode}`);
  };

  const handleDataHover = (data: KLineData | undefined) => {
    setCurrentData(data || (klineData.length > 0 ? klineData[klineData.length - 1] : undefined));
  };

  // 当数据加载完成后，设置默认显示最新数据
  useEffect(() => {
    if (klineData.length > 0 && !currentData) {
      setCurrentData(klineData[klineData.length - 1]);
    }
  }, [klineData, currentData]);

  const loading = klineLoading || indicatorLoading;
  const error = klineError || indicatorError;

  // 设置默认显示最新数据
  const displayData = currentData || (klineData.length > 0 ? klineData[klineData.length - 1] : undefined);

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <StockSearch onSelect={handleStockSelect} />
      </div>

      {!stockCode ? (
        <div className={styles.emptyState}>
          <Alert
            message="请搜索并选择股票"
            description="使用上方搜索框输入股票代码或名称进行搜索"
            type="info"
            showIcon
          />
        </div>
      ) : loading ? (
        <div className={styles.loadingState}>
          <Spin size="large" tip="加载数据中..." />
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <Alert
            message="加载失败"
            description={error.message || '无法加载股票数据，请稍后重试'}
            type="error"
            showIcon
          />
        </div>
      ) : klineData.length === 0 ? (
        <div className={styles.emptyState}>
          <Alert
            message="暂无数据"
            description={`股票 ${stockCode} 暂无K线数据，请先运行数据脚本获取数据`}
            type="warning"
            showIcon
          />
        </div>
      ) : (
        <div className={styles.chartContainer}>
          <ChartToolbar />
          <ChartDataDisplay data={displayData} stockName={stockCode} />
          <IndicatorValueDisplay 
            currentData={displayData}
            indicators={indicatorData}
            period={period}
            showMA={showMA}
          />
          <div className={styles.chartWrapper}>
            <KLineChart
              data={klineData}
              indicators={indicatorData}
              period={period}
              showMA={showMA}
              subChart1Indicator={subChart1Indicator}
              subChart2Indicator={subChart2Indicator}
              week52High={markers?.high52Week}
              week52Low={markers?.low52Week}
              onDataHover={handleDataHover}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default KLineChartPage;
