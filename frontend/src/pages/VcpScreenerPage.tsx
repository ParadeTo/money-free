import { useEffect, useState, useCallback } from 'react';
import { Typography, Alert, Space } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { vcpService } from '../services/vcp.service';
import { favoriteService } from '../services/favorite.service';
import { useFavoritesStore } from '../store/favorites.store';
import { VcpResultTable } from '../components/VcpResultTable';
import { VcpDetailPanel } from '../components/VcpDetailPanel';
import { FavoriteButtonContainer } from '../components/FavoriteButton/FavoriteButtonContainer';
import type { VcpScanItem, VcpScanQuery, VcpScanResponse } from '../types/vcp';
import styles from './VcpScreenerPage.module.css';

const { Title, Text } = Typography;

export function VcpScreenerPage() {
  const [data, setData] = useState<VcpScanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<VcpScanQuery['sortBy']>('lastContractionPct');
  const [sortOrder, setSortOrder] = useState<VcpScanQuery['sortOrder']>('asc');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const setFavorites = useFavoritesStore(s => s.setFavorites);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, favResult] = await Promise.all([
        vcpService.getVcpScanResults({ sortBy, sortOrder }),
        favoriteService.getFavorites(),
      ]);
      setData(result);
      setFavorites(favResult.favorites);
    } catch (err: any) {
      setError(err.message || 'Failed to load VCP screening results');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, setFavorites]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSortChange = (newSortBy: VcpScanQuery['sortBy'], newSortOrder: VcpScanQuery['sortOrder']) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleExpand = (expanded: boolean, record: VcpScanItem) => {
    setExpandedKey(expanded ? record.stockCode : null);
  };

  const favoriteColumn = {
    title: 'Favorite',
    key: 'favorite',
    width: 60,
    align: 'center' as const,
    render: (_: unknown, record: VcpScanItem) => (
      <FavoriteButtonContainer stockCode={record.stockCode} stockName={record.stockName} />
    ),
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Space align="center">
          <ThunderboltOutlined className={styles.headerIcon} />
          <Title level={4} style={{ margin: 0 }}>VCP Breakout Screener</Title>
        </Space>
        {data?.scanDate && (
          <Text type="secondary">Date: {data.scanDate} | Total: {data.totalCount} stocks</Text>
        )}
      </div>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} closable />}

      <VcpResultTable
        data={data?.stocks ?? []}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        expandedRowRender={(record) => <VcpDetailPanel stockCode={record.stockCode} />}
        expandedRowKeys={expandedKey ? [expandedKey] : []}
        onExpand={handleExpand}
        actionColumn={favoriteColumn}
      />
    </div>
  );
}
