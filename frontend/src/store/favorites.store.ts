import { create } from 'zustand';
import type { FavoriteWithDetails } from '../services/favorite.service';

interface FavoritesState {
  favorites: FavoriteWithDetails[];
  isLoading: boolean;
  error: string | null;
  setFavorites: (favorites: FavoriteWithDetails[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addFavorite: (favorite: FavoriteWithDetails) => void;
  removeFavorite: (favoriteId: number) => void;
  updateFavoriteOrder: (favorites: FavoriteWithDetails[]) => void;
  isFavorited: (stockCode: string) => boolean;
  getFavoriteId: (stockCode: string) => number | null;
  clearError: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  isLoading: false,
  error: null,

  setFavorites: (favorites) => {
    set({ favorites, error: null });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  addFavorite: (favorite) => {
    set((state) => ({
      favorites: [...state.favorites, favorite],
      error: null,
    }));
  },

  removeFavorite: (favoriteId) => {
    set((state) => ({
      favorites: state.favorites.filter((fav) => fav.id !== favoriteId),
      error: null,
    }));
  },

  updateFavoriteOrder: (favorites) => {
    set({ favorites, error: null });
  },

  isFavorited: (stockCode) => {
    const { favorites } = get();
    return favorites.some((fav) => fav.stockCode === stockCode);
  },

  getFavoriteId: (stockCode) => {
    const { favorites } = get();
    const favorite = favorites.find((fav) => fav.stockCode === stockCode);
    return favorite?.id ?? null;
  },

  clearError: () => {
    set({ error: null });
  },
}));
