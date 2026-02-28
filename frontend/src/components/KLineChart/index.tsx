import { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  LineData,
  Time 
} from 'lightweight-charts';
import type { KLineData, TechnicalIndicator } from '../../types';
import type { Period, SubChartIndicator, VolumeChartIndicator } from '../../store/chart.store';
import styles from './KLineChart.module.css';

interface KLineChartProps {
  data: KLineData[];
  indicators: TechnicalIndicator[];
  period: Period;
  showMA: boolean;
  subChart1Indicator: SubChartIndicator;
  subChart2Indicator: VolumeChartIndicator;
  week52High?: number;
  week52Low?: number;
  onDataHover?: (data: KLineData | undefined) => void;
}

interface SubChartValues {
  chart1?: string;
  chart2?: string;
}

export function KLineChart({
  data,
  indicators,
  period,
  showMA,
  subChart1Indicator,
  subChart2Indicator,
  week52High,
  week52Low,
  onDataHover,
}: KLineChartProps) {
  const mainChartRef = useRef<HTMLDivElement>(null);
  const subChart1Ref = useRef<HTMLDivElement>(null);
  const subChart2Ref = useRef<HTMLDivElement>(null);
  
  const mainChartInstanceRef = useRef<IChartApi | null>(null);
  const subChart1InstanceRef = useRef<IChartApi | null>(null);
  const subChart2InstanceRef = useRef<IChartApi | null>(null);
  
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const subChart1SeriesRef = useRef<ISeriesApi<any> | null>(null);
  const subChart2SeriesRef = useRef<ISeriesApi<any> | null>(null);
  
  const [subChartValues, setSubChartValues] = useState<SubChartValues>({});

  useEffect(() => {
    if (!mainChartRef.current || data.length === 0) {
      return;
    }

    // 清理旧图表
    [mainChartInstanceRef, subChart1InstanceRef, subChart2InstanceRef].forEach(ref => {
      if (ref.current) {
        try {
          ref.current.remove();
        } catch (error) {
          console.warn('Chart cleanup error:', error);
        }
        ref.current = null;
      }
    });
    candlestickSeriesRef.current = null;

    const containerWidth = mainChartRef.current.clientWidth;
    
    // 通用图表配置
    const commonOptions = {
      width: containerWidth,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333333',
      },
      localization: {
        locale: 'zh-CN',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#9598a1',
          style: 0,
          labelBackgroundColor: '#4c525e',
          labelVisible: true,
        },
        horzLine: {
          width: 1,
          color: '#9598a1',
          style: 0,
          labelBackgroundColor: '#4c525e',
          labelVisible: true,
        },
      },
      rightPriceScale: {
        borderColor: '#e1e1e1',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        minimumWidth: 80,
        alignLabels: true,
      },
      timeScale: {
        borderColor: '#e1e1e1',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: any) => {
          // 格式化时间轴的刻度标签
          let date: Date;
          if (typeof time === 'string') {
            date = new Date(time);
          } else if (typeof time === 'number') {
            date = new Date(time * 1000);
          } else {
            return '';
          }
          
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}/${month}/${day}`;
        },
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
    };

    // 计算副图数量和高度
    const hasSubChart1 = subChart1Indicator !== 'none';
    const hasSubChart2 = subChart2Indicator !== 'none';
    const subChartHeight = 110;
    const mainChartHeight = 500;

    // 创建主图（固定高度500px）
    const mainChart = createChart(mainChartRef.current, {
      ...commonOptions,
      height: mainChartHeight,
    });

    mainChartInstanceRef.current = mainChart;

    // 转换K线数据格式
    const chartData: CandlestickData<Time>[] = data.map((item) => {
      const dateStr = new Date(item.date).toISOString().split('T')[0];
      return {
        time: dateStr as Time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      };
    });

    // 先添加MA指标（作为背景）
    if (showMA) {
      const maIndicators = indicators.filter((ind) => ind.indicatorType === 'ma');
      if (maIndicators.length > 0) {
        addMAIndicators(mainChart, maIndicators, period);
      }
    }

    // 再添加K线主图（中国股市：红涨绿跌）
    const candlestickSeries = mainChart.addCandlestickSeries({
      upColor: '#ef5350',
      downColor: '#26a69a',
      borderVisible: false,
      wickUpColor: '#ef5350',
      wickDownColor: '#26a69a',
    });

    candlestickSeriesRef.current = candlestickSeries;
    candlestickSeries.setData(chartData);

    // 设置合理的初始可见范围（最近 60 个交易日）
    const visibleLogicalRange = {
      from: Math.max(0, chartData.length - 60),
      to: chartData.length - 1,
    };
    mainChart.timeScale().setVisibleLogicalRange(visibleLogicalRange);

    // 添加52周标注
    if (week52High && week52Low) {
      addWeek52Markers(candlestickSeries, week52High, week52Low);
    }

    // 创建副图1（RSI/KDJ）
    let subChart1: IChartApi | null = null;
    if (subChart1Ref.current && subChart1Indicator !== 'none') {
      subChart1 = createChart(subChart1Ref.current, {
        ...commonOptions,
        height: subChartHeight,
      });
      subChart1InstanceRef.current = subChart1;

      if (subChart1Indicator === 'rsi') {
        const rsiIndicators = indicators.filter((ind) => ind.indicatorType === 'rsi');
        if (rsiIndicators.length > 0) {
          subChart1SeriesRef.current = addRSIIndicator(subChart1, rsiIndicators);
        }
      } else if (subChart1Indicator === 'kdj') {
        const kdjIndicators = indicators.filter((ind) => ind.indicatorType === 'kdj');
        if (kdjIndicators.length > 0) {
          subChart1SeriesRef.current = addKDJIndicator(subChart1, kdjIndicators);
        }
      }

      // 设置初始可见范围（与主图同步）
      subChart1.timeScale().setVisibleLogicalRange(visibleLogicalRange);

      // 同步时间轴变化
      mainChart.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
        if (timeRange) {
          subChart1.timeScale().setVisibleLogicalRange(timeRange);
        }
      });
    }

    // 创建副图2（Volume/Amount）
    let subChart2: IChartApi | null = null;
    if (subChart2Ref.current && subChart2Indicator !== 'none') {
      subChart2 = createChart(subChart2Ref.current, {
        ...commonOptions,
        height: subChartHeight,
      });
      subChart2InstanceRef.current = subChart2;

      if (subChart2Indicator === 'volume') {
        const volumeIndicators = indicators.filter((ind) => ind.indicatorType === 'volume');
        if (volumeIndicators.length > 0) {
          subChart2SeriesRef.current = addVolumeIndicator(subChart2, volumeIndicators, data);
        }
      } else if (subChart2Indicator === 'amount') {
        const amountIndicators = indicators.filter((ind) => ind.indicatorType === 'amount');
        if (amountIndicators.length > 0) {
          subChart2SeriesRef.current = addAmountIndicator(subChart2, amountIndicators, data);
        }
      }

      // 设置初始可见范围（与主图同步）
      subChart2.timeScale().setVisibleLogicalRange(visibleLogicalRange);

      // 同步时间轴变化
      mainChart.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
        if (timeRange) {
          subChart2.timeScale().setVisibleLogicalRange(timeRange);
        }
      });
    }

    // 获取指定系列在某个时间点的数据
    const getDataPoint = (series: ISeriesApi<any> | null, param: any) => {
      if (!param.time || !series) return null;
      const dataPoint = param.seriesData.get(series);
      return dataPoint || null;
    };

    // 单向光标同步：只让主图驱动副图，避免循环触发
    mainChart.subscribeCrosshairMove((param) => {
      const dataPoint = getDataPoint(candlestickSeriesRef.current, param);
      
      // 同步到副图1
      if (subChart1 && subChart1SeriesRef.current) {
        if (dataPoint) {
          subChart1.setCrosshairPosition(dataPoint.close, dataPoint.time, subChart1SeriesRef.current);
        } else {
          subChart1.clearCrosshairPosition();
        }
      }
      
      // 同步到副图2
      if (subChart2 && subChart2SeriesRef.current) {
        if (dataPoint) {
          subChart2.setCrosshairPosition(dataPoint.close, dataPoint.time, subChart2SeriesRef.current);
        } else {
          subChart2.clearCrosshairPosition();
        }
      }

      // 更新副图显示值
      if (param.time) {
        const timeStr = param.time as string;
        const dateStr = timeStr.split('T')[0];
        const currentIndicator = indicators.find(
          (ind) => new Date(ind.date).toISOString().split('T')[0] === dateStr
        );
        
        let chart1Text = '';
        let chart2Text = '';
        
        if (currentIndicator && subChart1Indicator !== 'none') {
          const values = typeof currentIndicator.values === 'string' 
            ? JSON.parse(currentIndicator.values) 
            : currentIndicator.values;
          
          if (subChart1Indicator === 'rsi' && values.rsi !== undefined) {
            chart1Text = `RSI: ${values.rsi.toFixed(2)}`;
          } else if (subChart1Indicator === 'kdj') {
            chart1Text = `K: ${(values.k || 0).toFixed(2)}  D: ${(values.d || 0).toFixed(2)}  J: ${(values.j || 0).toFixed(2)}`;
          }
        }
        
        if (currentIndicator && subChart2Indicator !== 'none') {
          const values = typeof currentIndicator.values === 'string' 
            ? JSON.parse(currentIndicator.values) 
            : currentIndicator.values;
          
          if (subChart2Indicator === 'volume' && values.volume !== undefined) {
            const vol = values.volume / 10000;
            const volMA = values.volumeMA ? (values.volumeMA / 10000).toFixed(0) : '-';
            chart2Text = `成交量: ${vol.toFixed(0)}万  MA: ${volMA}万`;
          } else if (subChart2Indicator === 'amount' && values.amount !== undefined) {
            const amt = values.amount / 10000;
            const amtMA = values.amountMA ? (values.amountMA / 10000).toFixed(0) : '-';
            chart2Text = `成交额: ${amt.toFixed(0)}万  MA: ${amtMA}万`;
          }
        }
        
        setSubChartValues({ chart1: chart1Text, chart2: chart2Text });
      } else {
        setSubChartValues({});
      }

      // 触发数据悬停回调
      if (onDataHover) {
        if (!param.time) {
          onDataHover(undefined);
        } else {
          const timeStr = param.time as string;
          const hoveredData = data.find(
            (item) => new Date(item.date).toISOString().split('T')[0] === timeStr
          );
          onDataHover(hoveredData);
        }
      }
    });

    // 响应式调整
    const handleResize = () => {
      if (mainChartRef.current) {
        const width = mainChartRef.current.clientWidth;
        mainChartInstanceRef.current?.applyOptions({ width });
        subChart1InstanceRef.current?.applyOptions({ width });
        subChart2InstanceRef.current?.applyOptions({ width });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      [mainChartInstanceRef, subChart1InstanceRef, subChart2InstanceRef].forEach(ref => {
        if (ref.current) {
          try {
            ref.current.remove();
          } catch (error) {
            console.warn('Chart cleanup error:', error);
          }
          ref.current = null;
        }
      });
      candlestickSeriesRef.current = null;
    };
  }, [data, indicators, period, showMA, subChart1Indicator, subChart2Indicator, week52High, week52Low, onDataHover]);

  return (
    <div className={styles.container}>
      <div 
        ref={mainChartRef} 
        className={styles.mainChart}
        data-testid="main-chart-container"
      />
      {subChart1Indicator !== 'none' && (
        <div 
          ref={subChart1Ref} 
          className={styles.subChart}
          data-testid="subchart1-container"
        >
          {subChartValues.chart1 && (
            <div className={styles.subChartValue}>
              {subChartValues.chart1}
            </div>
          )}
        </div>
      )}
      {subChart2Indicator !== 'none' && (
        <div 
          ref={subChart2Ref} 
          className={styles.subChart}
          data-testid="subchart2-container"
        >
          {subChartValues.chart2 && (
            <div className={styles.subChartValue}>
              {subChartValues.chart2}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 添加MA均线
 */
function addMAIndicators(
  chart: IChartApi,
  indicators: TechnicalIndicator[],
  period: Period
) {
  const maPeriods = period === 'daily' ? [50, 150, 200] : [10, 30, 40];
  const colors = ['#2196F3', '#FF9800', '#9C27B0'];

  maPeriods.forEach((p, index) => {
    const lineSeries = chart.addLineSeries({
      color: colors[index],
      lineWidth: 2,
      title: `MA${p}`,
    });

    const maData: LineData<Time>[] = [];
    
    indicators.forEach((ind) => {
      // values 已经是对象了，无需 JSON.parse
      const values = typeof ind.values === 'string' ? JSON.parse(ind.values) : ind.values;
      const maValue = values[`ma${p}`];
      if (maValue) {
        const dateStr = new Date(ind.date).toISOString().split('T')[0];
        maData.push({
          time: dateStr as Time,
          value: maValue,
        });
      }
    });

    lineSeries.setData(maData);
  });
}

/**
 * 添加52周高低标注
 */
function addWeek52Markers(
  series: ISeriesApi<'Candlestick'>,
  high: number,
  low: number
) {
  series.createPriceLine({
    price: high,
    color: '#ef5350',
    lineWidth: 1,
    lineStyle: 2,
    axisLabelVisible: true,
    title: '52周最高',
  });

  series.createPriceLine({
    price: low,
    color: '#26a69a',
    lineWidth: 1,
    lineStyle: 2,
    axisLabelVisible: true,
    title: '52周最低',
  });
}

/**
 * 添加 RSI 指标副图
 */
function addRSIIndicator(
  chart: IChartApi,
  indicators: TechnicalIndicator[]
) {
  console.log('[RSI] Total indicators received:', indicators.length);
  console.log('[RSI] Sample indicators:', indicators.slice(0, 3).map(ind => ({
    date: ind.date,
    values: ind.values
  })));
  
  const lineSeries = chart.addLineSeries({
    color: '#2196F3',
    lineWidth: 2,
    title: 'RSI(14)',
  });

  const rsiData: LineData<Time>[] = [];
  
  indicators.forEach((ind, index) => {
    const values = typeof ind.values === 'string' ? JSON.parse(ind.values) : ind.values;
    const dateStr = new Date(ind.date).toISOString().split('T')[0];
    
    // 调试：查看最后几条数据
    if (index >= indicators.length - 10) {
      console.log(`[RSI] Data point ${index}:`, {
        date: dateStr,
        rsi: values.rsi,
        rawValues: values
      });
    }
    
    // 过滤掉无效的 0 值（RSI 计算需要至少 14 天数据）
    if (values.rsi && values.rsi > 0) {
      rsiData.push({
        time: dateStr as Time,
        value: values.rsi,
      });
    }
  });

  console.log('[RSI] Total data points to render:', rsiData.length);
  console.log('[RSI] Last 5 data points:', rsiData.slice(-5));

  lineSeries.setData(rsiData);
  
  return lineSeries;
}

/**
 * 添加 KDJ 指标副图
 */
function addKDJIndicator(
  chart: IChartApi,
  indicators: TechnicalIndicator[]
) {
  const kLine = chart.addLineSeries({
    color: '#2196F3',
    lineWidth: 2,
    title: 'K',
  });

  const dLine = chart.addLineSeries({
    color: '#FF9800',
    lineWidth: 2,
    title: 'D',
  });

  const jLine = chart.addLineSeries({
    color: '#9C27B0',
    lineWidth: 2,
    title: 'J',
  });

  const kData: LineData<Time>[] = [];
  const dData: LineData<Time>[] = [];
  const jData: LineData<Time>[] = [];
  
  indicators.forEach((ind) => {
    const values = typeof ind.values === 'string' ? JSON.parse(ind.values) : ind.values;
    const dateStr = new Date(ind.date).toISOString().split('T')[0];
    
    if (values.k) {
      kData.push({ time: dateStr as Time, value: values.k });
    }
    if (values.d) {
      dData.push({ time: dateStr as Time, value: values.d });
    }
    if (values.j) {
      jData.push({ time: dateStr as Time, value: values.j });
    }
  });

  kLine.setData(kData);
  dLine.setData(dData);
  jLine.setData(jData);
  
  return kLine;
}

/**
 * 添加 Volume 成交量副图
 */
function addVolumeIndicator(
  chart: IChartApi,
  indicators: TechnicalIndicator[],
  klineData: KLineData[]
) {
  const histogramSeries = chart.addHistogramSeries({
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: '',
  });

  // 创建日期到K线数据的映射
  const klineMap = new Map<string, KLineData>();
  klineData.forEach((item) => {
    const dateStr = new Date(item.date).toISOString().split('T')[0];
    klineMap.set(dateStr, item);
  });

  const volumeData: Array<{ time: Time; value: number; color: string }> = [];
  
  indicators.forEach((ind) => {
    const values = typeof ind.values === 'string' ? JSON.parse(ind.values) : ind.values;
    if (values.volume) {
      const dateStr = new Date(ind.date).toISOString().split('T')[0];
      const kline = klineMap.get(dateStr);
      
      // 根据K线涨跌设置颜色：涨红跌绿
      const isUp = kline ? kline.close >= kline.open : true;
      const color = isUp ? '#ef5350' : '#26a69a';
      
      volumeData.push({
        time: dateStr as Time,
        value: values.volume,
        color,
      });
    }
  });

  histogramSeries.setData(volumeData);

  // 添加成交量均线
  const maLineSeries = chart.addLineSeries({
    color: '#FF9800',
    lineWidth: 1,
    title: 'MA',
  });

  const volumeMaData: LineData<Time>[] = [];
  
  indicators.forEach((ind) => {
    const values = typeof ind.values === 'string' ? JSON.parse(ind.values) : ind.values;
    if (values.volumeMA) {
      const dateStr = new Date(ind.date).toISOString().split('T')[0];
      volumeMaData.push({
        time: dateStr as Time,
        value: values.volumeMA,
      });
    }
  });

  maLineSeries.setData(volumeMaData);
  
  return histogramSeries;
}

/**
 * 添加 Amount 成交额副图
 */
function addAmountIndicator(
  chart: IChartApi,
  indicators: TechnicalIndicator[],
  klineData: KLineData[]
) {
  const histogramSeries = chart.addHistogramSeries({
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: '',
  });

  // 创建日期到K线数据的映射
  const klineMap = new Map<string, KLineData>();
  klineData.forEach((item) => {
    const dateStr = new Date(item.date).toISOString().split('T')[0];
    klineMap.set(dateStr, item);
  });

  const amountData: Array<{ time: Time; value: number; color: string }> = [];
  
  indicators.forEach((ind) => {
    const values = typeof ind.values === 'string' ? JSON.parse(ind.values) : ind.values;
    if (values.amount) {
      const dateStr = new Date(ind.date).toISOString().split('T')[0];
      const kline = klineMap.get(dateStr);
      
      // 根据K线涨跌设置颜色：涨红跌绿
      const isUp = kline ? kline.close >= kline.open : true;
      const color = isUp ? '#ef5350' : '#26a69a';
      
      amountData.push({
        time: dateStr as Time,
        value: values.amount,
        color,
      });
    }
  });

  histogramSeries.setData(amountData);

  // 添加成交额均线
  const maLineSeries = chart.addLineSeries({
    color: '#FF9800',
    lineWidth: 1,
    title: 'MA',
  });

  const amountMaData: LineData<Time>[] = [];
  
  indicators.forEach((ind) => {
    const values = typeof ind.values === 'string' ? JSON.parse(ind.values) : ind.values;
    if (values.amountMA) {
      const dateStr = new Date(ind.date).toISOString().split('T')[0];
      amountMaData.push({
        time: dateStr as Time,
        value: values.amountMA,
      });
    }
  });

  maLineSeries.setData(amountMaData);
  
  return histogramSeries;
}
