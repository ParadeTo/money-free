import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, message, Space, Alert, Button } from 'antd';
import { ReloadOutlined, StarOutlined } from '@ant-design/icons';
import { FavoriteList } from '../components/FavoriteList';
import { favoriteService } from '../services/favorite.service';
import { useFavoritesStore } from '../store/favorites.store';
import type { FavoriteWithDetails } from '../services/favorite.service';
import type { CSSProperties } from 'react';

const { Title, Text } = Typography;

export function FavoritePage() {
  const navigate = useNavigate();
  const { favorites, isLoading, error, setFavorites, setLoading, setError, removeFavorite: removeFromStore, updateFavoriteOrder } = useFavoritesStore();
  const [retrying, setRetrying] = useState(false);

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await favoriteService.getFavorites();
      setFavorites(response.favorites);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to load favorites';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (id: number) => {
    try {
      await favoriteService.removeFavorite(id);
      removeFromStore(id);
      message.success('Favorite removed');
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to remove';
      message.error(errorMsg);
    }
  };

  const handleReorder = async (newFavorites: FavoriteWithDetails[]) => {
    const oldFavorites = [...favorites];
    updateFavoriteOrder(newFavorites);

    try {
      const updates = newFavorites.map((fav, idx) => ({
        id: fav.id,
        sort_order: idx,
      }));
      await favoriteService.batchUpdateSortOrder(updates);
    } catch (err: any) {
      updateFavoriteOrder(oldFavorites);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to update order';
      message.error(errorMsg);
    }
  };

  const handleItemClick = (stockCode: string) => {
    navigate(`/chart/${stockCode}`);
  };

  const handleRetry = async () => {
    setRetrying(true);
    await loadFavorites();
    setRetrying(false);
  };

  const containerStyle: CSSProperties = {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  };

  const headerStyle: CSSProperties = {
    padding: '0 0 24px 0',
    borderBottom: '1px solid #e1e8ed',
  };

  const contentStyle: CSSProperties = {
    marginTop: '24px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '24px',
    fontWeight: 600,
    color: '#2c3e50',
    margin: 0,
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space size="middle" align="center">
            <StarOutlined style={{ fontSize: '24px', color: '#faad14' }} />
            <Title level={1} style={titleStyle}>
              My Favorites
            </Title>
          </Space>
          
          <Text style={{ fontSize: '14px', color: 'rgba(44, 62, 80, 0.65)' }}>
            Manage your watched stocks, quick access and comparison analysis
          </Text>

          {favorites && favorites.length > 0 && (
            <Text style={{ fontSize: '13px', color: 'rgba(44, 62, 80, 0.55)', marginTop: '12px' }}>
              Total {favorites.length} stocks · Drag to reorder
            </Text>
          )}
        </Space>
      </div>

      <div style={contentStyle}>
        {error && (
          <div style={{ marginBottom: '24px' }}>
            <Alert
              message="Load Failed"
              description={error}
              type="error"
              showIcon
              action={
                <Button
                  size="small"
                  danger
                  icon={<ReloadOutlined />}
                  onClick={handleRetry}
                  loading={retrying}
                >
                  Retry
                </Button>
              }
              style={{
                background: 'rgba(255, 77, 79, 0.1)',
                border: '1px solid rgba(255, 77, 79, 0.3)',
              }}
            />
          </div>
        )}

        <FavoriteList
          favorites={favorites}
          loading={isLoading}
          onRemove={handleRemove}
          onReorder={handleReorder}
          onItemClick={handleItemClick}
        />
      </div>
    </div>
  );
}
