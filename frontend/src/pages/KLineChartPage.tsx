import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Alert } from 'antd';
import { useState } from 'react';
import { StockSearch } from '../components/StockSearch';
import { KLineChart } from '../components/KLineChart';
import { ChartToolbar } from '../components/ChartToolbar';
import { ChartDataDisplay } from '../components/ChartDataDisplay';
import { IndicatorValueDisplay } from '../components/IndicatorValueDisplay';
import { VcpIndicator } from '../components/VcpIndicator';
import { useKLineData } from '../hooks/useKLineData';
import { useIndicators } from '../hooks/useIndicators';
import { useVcpDetail } from '../hooks/useVcpDetail';
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

  // Update store when route params change
  useEffect(() => {
    if (stockCode) {
      setStockCode(stockCode);
      // Reset currently displayed data
      setCurrentData(undefined);
    }
  }, [stockCode, setStockCode]);

  // Load K-line data
  const {
    data: klineData,
    loading: klineLoading,
    error: klineError,
  } = useKLineData(stockCode || '', period, timeRange);

  // Load indicator data
  const {
    data: indicatorData,
    markers,
    loading: indicatorLoading,
    error: indicatorError,
  } = useIndicators(stockCode || '', period, subChart1Indicator, subChart2Indicator, showMA, timeRange);

  // Load VCP detail
  const {
    data: vcpData,
    loading: vcpLoading,
    error: vcpError,
  } = useVcpDetail(stockCode || '');

  const handleStockSelect = (stock: Stock) => {
    // Open stock chart in new tab
    window.open(`/chart/${stock.stockCode}`, '_blank');
  };

  const handleDataHover = (data: KLineData | undefined) => {
    setCurrentData(data || (klineData.length > 0 ? klineData[klineData.length - 1] : undefined));
  };

  // Set default display to latest data when data is loaded
  useEffect(() => {
    if (klineData.length > 0 && !currentData) {
      setCurrentData(klineData[klineData.length - 1]);
    }
  }, [klineData, currentData]);

  const loading = klineLoading || indicatorLoading;
  const error = klineError || indicatorError;

  // Set default display to latest data
  const displayData = currentData || (klineData.length > 0 ? klineData[klineData.length - 1] : undefined);

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <StockSearch onSelect={handleStockSelect} />
      </div>

      {!stockCode ? (
        <div className={styles.emptyState}>
          <Alert
            message="Please search and select a stock"
            description="Use the search box above to enter stock code or name"
            type="info"
            showIcon
          />
        </div>
      ) : loading ? (
        <div className={styles.loadingState}>
          <Spin size="large" tip="Loading data..." />
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <Alert
            message="Load Failed"
            description={error.message || 'Unable to load stock data, please try again later'}
            type="error"
            showIcon
          />
        </div>
      ) : klineData.length === 0 ? (
        <div className={styles.emptyState}>
          <Alert
            message="No Data"
            description={`Stock ${stockCode} has no K-line data, please run data scripts to fetch data first`}
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
          <VcpIndicator
            data={vcpData}
            loading={vcpLoading}
            error={vcpError}
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
