import { useEffect, useState, useCallback } from 'react';
import { Typography, Alert, Space, Checkbox, Tabs, Card, InputNumber } from 'antd';
import { ThunderboltOutlined, RocketOutlined } from '@ant-design/icons';
import { vcpService } from '../services/vcp.service';
import { favoriteService } from '../services/favorite.service';
import { useFavoritesStore } from '../store/favorites.store';
import { VcpResultTable } from '../components/VcpResultTable';
import { VcpDetailPanel } from '../components/VcpDetailPanel';
import { FavoriteButtonContainer } from '../components/FavoriteButton/FavoriteButtonContainer';
import { VcpEarlyStageFilter } from '../components/VcpEarlyStageFilter';
import { useVcpEarlyFilter } from '../hooks/useVcpEarlyFilter';
import { MarketFilter, type MarketFilterValue } from '../components/MarketFilter';
import { VcpStage } from '../types/vcp';
import type { VcpScanItem, VcpScanQuery, VcpScanResponse, EarlyStageStock } from '../types/vcp';
import styles from './VcpScreenerPage.module.css';

const { Title, Text } = Typography;

export function VcpScreenerPage() {
  const [data, setData] = useState<VcpScanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<VcpScanQuery['sortBy']>('lastContractionPct');
  const [sortOrder, setSortOrder] = useState<VcpScanQuery['sortOrder']>('asc');
  const [inPullbackOnly, setInPullbackOnly] = useState(false);
  const [maxPullbackPct, setMaxPullbackPct] = useState<number | undefined>(10);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'standard' | 'early'>('standard');
  const [selectedMarket, setSelectedMarket] = useState<MarketFilterValue>('all');
  const setFavorites = useFavoritesStore(s => s.setFavorites);
  
  // Early stage filter hook
  const earlyFilter = useVcpEarlyFilter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, favResult] = await Promise.all([
        vcpService.getVcpScanResults({ sortBy, sortOrder, inPullbackOnly, maxPullbackPct }),
        favoriteService.getFavorites(),
      ]);
      setData(result);
      setFavorites(favResult.favorites);
    } catch (err: any) {
      setError(err.message || 'Failed to load VCP screening results');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, inPullbackOnly, maxPullbackPct, setFavorites]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset expanded row when market filter changes
  useEffect(() => {
    setExpandedKey(null);
  }, [selectedMarket]);

  const handleSortChange = (newSortBy: VcpScanQuery['sortBy'], newSortOrder: VcpScanQuery['sortOrder']) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleExpand = (expanded: boolean, record: VcpScanItem | EarlyStageStock) => {
    setExpandedKey(expanded ? record.stockCode : null);
  };

  // Filter data by selected market
  const filteredStocks = data?.stocks.filter(stock => {
    if (selectedMarket === 'all') return true;
    if (selectedMarket === 'A-SHARE') return stock.market === 'SH' || stock.market === 'SZ';
    return stock.market === selectedMarket;
  }) ?? [];

  const favoriteColumn = {
    title: 'Favorite',
    key: 'favorite',
    width: 60,
    align: 'center' as const,
    render: (_: unknown, record: VcpScanItem | EarlyStageStock) => (
      <FavoriteButtonContainer stockCode={record.stockCode} stockName={record.stockName} />
    ),
  };

  const earlyFavoriteColumn = favoriteColumn;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Space align="center">
          <ThunderboltOutlined className={styles.headerIcon} />
          <Title level={4} style={{ margin: 0 }}>VCP Scanner</Title>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'standard' | 'early')}
        items={[
          {
            key: 'standard',
            label: (
              <span>
                <ThunderboltOutlined /> Standard VCP Scan
              </span>
            ),
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Space align="center" wrap>
                      <Text strong>Market:</Text>
                      <MarketFilter value={selectedMarket} onChange={setSelectedMarket} />
                    </Space>
                    <Space align="center" wrap>
                      <Checkbox 
                        checked={inPullbackOnly}
                        onChange={(e) => setInPullbackOnly(e.target.checked)}
                      >
                        <span className={styles.checkboxLabel}>
                          🎯 In Pullback Only
                        </span>
                      </Checkbox>
                    <Space align="center" size="small">
                      <Text>Max Pullback:</Text>
                      <InputNumber
                        min={1}
                        max={50}
                        step={1}
                        value={maxPullbackPct}
                        onChange={(value) => setMaxPullbackPct(value ?? undefined)}
                        addonAfter="%"
                        style={{ width: 100 }}
                      />
                      <Checkbox
                        checked={maxPullbackPct === undefined}
                        onChange={(e) => setMaxPullbackPct(e.target.checked ? undefined : 10)}
                      >
                        No Limit
                      </Checkbox>
                    </Space>
                    {data?.scanDate && (
                      <Text type="secondary">
                        Scan Date: {data.scanDate} | 
                        {selectedMarket !== 'all' ? ` Filtered: ${filteredStocks.length} / ` : ' Total: '}
                        {data.totalCount} stocks
                      </Text>
                    )}
                    </Space>
                  </Space>
                </div>

                {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} closable />}

                <VcpResultTable
                  data={filteredStocks}
                  loading={loading}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                  expandedRowRender={(record) => <VcpDetailPanel stockCode={record.stockCode} />}
                  expandedRowKeys={expandedKey ? [expandedKey] : []}
                  onExpand={handleExpand}
                  actionColumn={favoriteColumn}
                />
              </>
            ),
          },
          {
            key: 'early',
            label: (
              <span>
                <RocketOutlined /> Early Stage Filter
              </span>
            ),
            children: (
              <>
                <VcpEarlyStageFilter
                  conditions={earlyFilter.conditions}
                  onChange={earlyFilter.updateConditions}
                  onFilter={earlyFilter.filter}
                  onReset={earlyFilter.reset}
                  loading={earlyFilter.loading}
                  tip={earlyFilter.result?.tip}
                  onApplyQuickAction={earlyFilter.applyQuickAction}
                />

                {earlyFilter.result && (
                  <Card 
                    style={{ marginTop: 24 }}
                    title={
                      <Space>
                        <Text strong>Filter Results</Text>
                        <Text type="secondary">
                          Total {earlyFilter.result.total} stocks
                        </Text>
                      </Space>
                    }
                  >
                    <VcpResultTable
                      data={earlyFilter.result.stocks}
                      loading={earlyFilter.loading}
                      expandedRowRender={(record) => <VcpDetailPanel stockCode={record.stockCode} />}
                      expandedRowKeys={expandedKey ? [expandedKey] : []}
                      onExpand={handleExpand}
                      actionColumn={earlyFavoriteColumn}
                      highlightStage={VcpStage.CONTRACTION}
                      sortByStage={true}
                      showVcpStage={true}
                    />
                  </Card>
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
