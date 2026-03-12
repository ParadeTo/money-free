import { useState, useCallback } from 'react';
import { message } from 'antd';
import { vcpService } from '../services/vcp.service';
import { useLocalStoragePersist } from './useLocalStoragePersist';
import type {
  FilterConditions,
  FilterEarlyStageResponse,
  DEFAULT_FILTER_CONDITIONS,
} from '../types/vcp';

const VALIDATION_RULES = {
  distFrom52WeekLow: { min: 20, max: 60 },
  distFrom52WeekHigh: { min: 10, max: 50 },
  contractionCountMin: { min: 2, max: 8 },
  contractionCountMax: { min: 2, max: 8 },
};

export function useVcpEarlyFilter() {
  const [conditions, setConditions, resetConditions] = useLocalStoragePersist<FilterConditions>({
    key: 'filter-conditions',
    defaultValue: {
      distFrom52WeekLow: 50,   // Increased to 50% to include more early-stage stocks
      distFrom52WeekHigh: 10,  // Decreased from 30% to 10%, matching actual VCP characteristics
      contractionCountMin: 3,
      contractionCountMax: 4,
    },
  });

  const [result, setResult] = useState<FilterEarlyStageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateConditions = useCallback((cond: FilterConditions): string | null => {
    if (cond.distFrom52WeekLow < VALIDATION_RULES.distFrom52WeekLow.min || 
        cond.distFrom52WeekLow > VALIDATION_RULES.distFrom52WeekLow.max) {
      return `From 52W Low must be between ${VALIDATION_RULES.distFrom52WeekLow.min}-${VALIDATION_RULES.distFrom52WeekLow.max}`;
    }

    if (cond.distFrom52WeekHigh < VALIDATION_RULES.distFrom52WeekHigh.min || 
        cond.distFrom52WeekHigh > VALIDATION_RULES.distFrom52WeekHigh.max) {
      return `From 52W High must be between ${VALIDATION_RULES.distFrom52WeekHigh.min}-${VALIDATION_RULES.distFrom52WeekHigh.max}`;
    }

    if (cond.contractionCountMin < VALIDATION_RULES.contractionCountMin.min || 
        cond.contractionCountMin > VALIDATION_RULES.contractionCountMin.max) {
      return `Min contraction count must be between ${VALIDATION_RULES.contractionCountMin.min}-${VALIDATION_RULES.contractionCountMin.max}`;
    }

    if (cond.contractionCountMax < VALIDATION_RULES.contractionCountMax.min || 
        cond.contractionCountMax > VALIDATION_RULES.contractionCountMax.max) {
      return `Max contraction count must be between ${VALIDATION_RULES.contractionCountMax.min}-${VALIDATION_RULES.contractionCountMax.max}`;
    }

    if (cond.contractionCountMin > cond.contractionCountMax) {
      return 'Min contraction count cannot be greater than max';
    }

    return null;
  }, []);

  const filter = useCallback(async () => {
    const validationError = validateConditions(conditions);
    if (validationError) {
      message.error(validationError);
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await vcpService.filterEarlyStage(conditions);
      setResult(response);

      if (response.tip) {
        if (response.tip.type === 'error') {
          message.error(response.tip.message);
        } else if (response.tip.type === 'warning') {
          message.warning(response.tip.message);
        } else {
          message.info(response.tip.message);
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Filter failed';
      setError(errorMsg);
      message.error(errorMsg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [conditions, validateConditions]);

  const updateConditions = useCallback((partial: Partial<FilterConditions>) => {
    setConditions((prev) => ({ ...prev, ...partial }));
  }, [setConditions]);

  const adjustLowThreshold = useCallback((delta: number) => {
    setConditions((prev) => ({
      ...prev,
      distFrom52WeekLow: Math.max(
        VALIDATION_RULES.distFrom52WeekLow.min,
        Math.min(VALIDATION_RULES.distFrom52WeekLow.max, prev.distFrom52WeekLow + delta)
      ),
    }));
  }, [setConditions]);

  const adjustHighThreshold = useCallback((delta: number) => {
    setConditions((prev) => ({
      ...prev,
      distFrom52WeekHigh: Math.max(
        VALIDATION_RULES.distFrom52WeekHigh.min,
        Math.min(VALIDATION_RULES.distFrom52WeekHigh.max, prev.distFrom52WeekHigh + delta)
      ),
    }));
  }, [setConditions]);

  const applyQuickAction = useCallback((adjustments: Partial<FilterConditions>) => {
    updateConditions(adjustments);
  }, [updateConditions]);

  const reset = useCallback(() => {
    resetConditions();
    setResult(null);
    setError(null);
  }, [resetConditions]);

  return {
    conditions,
    result,
    loading,
    error,
    filter,
    updateConditions,
    adjustLowThreshold,
    adjustHighThreshold,
    applyQuickAction,
    reset,
  };
}
