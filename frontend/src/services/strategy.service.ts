import { api } from './api';

export interface StrategyCondition {
  conditionType: string;
  indicatorName?: string;
  operator?: string;
  targetValue?: number;
  pattern?: string;
  ma1Period?: string;
  ma2Period?: string;
  sortOrder: number;
}

export interface Strategy {
  strategyId: string;
  userId: string;
  strategyName: string;
  description?: string;
  conditions: StrategyCondition[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyRequest {
  strategyName: string;
  description?: string;
  conditions: StrategyCondition[];
}

export interface UpdateStrategyRequest {
  strategyName?: string;
  description?: string;
  conditions?: StrategyCondition[];
}

export const strategyService = {
  /**
   * 创建新策略
   */
  async create(data: CreateStrategyRequest): Promise<Strategy> {
    return api.post<Strategy>('/strategies', data);
  },

  /**
   * 获取所有策略
   */
  async getAll(): Promise<Strategy[]> {
    return api.get<Strategy[]>('/strategies');
  },

  /**
   * 获取单个策略
   */
  async getOne(strategyId: string): Promise<Strategy> {
    return api.get<Strategy>(`/strategies/${strategyId}`);
  },

  /**
   * 更新策略
   */
  async update(strategyId: string, data: UpdateStrategyRequest): Promise<Strategy> {
    return api.put<Strategy>(`/strategies/${strategyId}`, data);
  },

  /**
   * 删除策略
   */
  async delete(strategyId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/strategies/${strategyId}`);
  },

  /**
   * 执行策略
   */
  async execute(strategyId: string): Promise<any> {
    return api.post<any>(`/strategies/${strategyId}/execute`, {});
  },
};
