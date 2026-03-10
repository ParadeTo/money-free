/**
 * 数据更新状态管理
 * 
 * 使用 Zustand 管理更新任务状态和轮询
 */

import { create } from 'zustand';
import type { UpdateStatusResponse, UpdateHistoryItem } from '../types/update';

interface UpdateState {
  currentTask: UpdateStatusResponse | null;
  isPolling: boolean;
  history: UpdateHistoryItem[];
  lastUpdateTime: string | null;
  
  setCurrentTask: (task: UpdateStatusResponse | null) => void;
  setIsPolling: (isPolling: boolean) => void;
  setHistory: (history: UpdateHistoryItem[]) => void;
  setLastUpdateTime: (time: string | null) => void;
  updateProgress: (task: UpdateStatusResponse) => void;
  reset: () => void;
}

const initialState = {
  currentTask: null,
  isPolling: false,
  history: [],
  lastUpdateTime: null,
};

export const useUpdateStore = create<UpdateState>((set) => ({
  ...initialState,

  setCurrentTask: (task) => set({ currentTask: task }),

  setIsPolling: (isPolling) => set({ isPolling }),

  setHistory: (history) => {
    const lastUpdate = history.length > 0 ? history[0] : null;
    set({
      history,
      lastUpdateTime: lastUpdate?.completedAt || lastUpdate?.startedAt || null,
    });
  },

  setLastUpdateTime: (time) => set({ lastUpdateTime: time }),

  updateProgress: (task) => set({ currentTask: task }),

  reset: () => set(initialState),
}));
