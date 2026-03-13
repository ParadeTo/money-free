import { api } from './api';

export interface FavoriteWithDetails {
  id: number;
  userId: string;
  stockCode: string;
  groupName?: string;
  sortOrder: number;
  createdAt: string;
  stock?: {
    stockName: string;
    latestPrice?: number;
    priceChange?: number;
    priceChangePercent?: number;
  };
}

export interface GetFavoritesResponse {
  favorites: FavoriteWithDetails[];
  total: number;
}

export interface AddFavoriteRequest {
  stock_code: string;
  group_name?: string;
}

export interface AddFavoriteResponse {
  id: number;
  user_id: string;
  stock_code: string;
  stock_name: string;
  group_name: string | null;
  sort_order: number;
  created_at: string;
}

export interface UpdateSortOrderRequest {
  sort_order: number;
}

export interface UpdateSortOrderResponse {
  message: string;
  favorite_id: number;
  sort_order: number;
}

export interface RemoveFavoriteResponse {
  message: string;
  favorite_id: number;
}

export interface BatchUpdateSortOrderItem {
  id: number;
  sort_order: number;
}

class FavoriteService {
  private transformFavoriteResponse(apiData: any): FavoriteWithDetails {
    return {
      id: apiData.id,
      userId: apiData.user_id,
      stockCode: apiData.stock_code,
      groupName: apiData.group_name || undefined,
      sortOrder: apiData.sort_order,
      createdAt: apiData.created_at,
      stock: {
        stockName: apiData.stock_name,
        latestPrice: apiData.latest_price,
        priceChange: apiData.price_change,
        priceChangePercent: apiData.price_change_percent,
      },
    };
  }

  async getFavorites(groupName?: string): Promise<GetFavoritesResponse> {
    const params = groupName ? { group_name: groupName } : {};
    const response = await api.get<{ favorites: any[]; total: number }>('/favorites', { params });
    return {
      favorites: response.favorites.map(fav => this.transformFavoriteResponse(fav)),
      total: response.total,
    };
  }

  async addFavorite(stockCode: string, groupName?: string): Promise<FavoriteWithDetails> {
    const data: AddFavoriteRequest = { stock_code: stockCode };
    if (groupName) {
      data.group_name = groupName;
    }
    const response = await api.post<any>('/favorites', data);
    return this.transformFavoriteResponse(response);
  }

  async updateSortOrder(favoriteId: number, sortOrder: number): Promise<UpdateSortOrderResponse> {
    const data: UpdateSortOrderRequest = { sort_order: sortOrder };
    return api.put<UpdateSortOrderResponse>(`/favorites/${favoriteId}/sort`, data);
  }

  async batchUpdateSortOrder(items: BatchUpdateSortOrderItem[]): Promise<void> {
    await Promise.all(
      items.map(item => this.updateSortOrder(item.id, item.sort_order))
    );
  }

  async removeFavorite(favoriteId: number): Promise<RemoveFavoriteResponse> {
    return api.delete<RemoveFavoriteResponse>(`/favorites/${favoriteId}`);
  }
}

export const favoriteService = new FavoriteService();
export default favoriteService;
