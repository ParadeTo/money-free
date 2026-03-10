import { useState } from 'react';
import { message } from 'antd';
import { FavoriteButton } from './index';
import { favoriteService } from '../../services/favorite.service';
import { useFavoritesStore } from '../../store/favorites.store';

interface FavoriteButtonContainerProps {
  stockCode: string;
  stockName?: string;
}

export function FavoriteButtonContainer({ stockCode, stockName }: FavoriteButtonContainerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { isFavorited, getFavoriteId, addFavorite, removeFavorite } = useFavoritesStore();
  
  const favorited = isFavorited(stockCode);
  const favoriteId = getFavoriteId(stockCode);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      if (favorited && favoriteId !== null) {
        await favoriteService.removeFavorite(favoriteId);
        removeFavorite(favoriteId);
        message.success(`Removed favorite ${stockName || stockCode}`);
      } else {
        const result = await favoriteService.addFavorite(stockCode);
        addFavorite(result);
        message.success(`Added favorite ${stockName || result.stock?.stockName || stockCode}`);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Operation failed';
      message.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FavoriteButton
      stockCode={stockCode}
      isFavorited={favorited}
      onToggle={handleToggle}
      loading={isLoading}
    />
  );
}
