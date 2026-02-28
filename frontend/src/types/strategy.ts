// frontend/src/types/strategy.ts
// T156 [P] [US2] Strategy interface

import { FilterCondition } from './filter';

export interface StrategyCondition extends FilterCondition {
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
