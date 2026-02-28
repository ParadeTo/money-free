/**
 * 数据更新轮询 Hook
 */

import { useEffect, useRef, useCallback } from 'react';
import { updateService } from '../services/update.service';
import type { UpdateStatusResponse } from '../types/update';

interface UseUpdatePollingOptions {
  taskId: string | null;
  onUpdate: (status: UpdateStatusResponse) => void;
  onComplete?: (status: UpdateStatusResponse) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
  interval?: number;
}

export function useUpdatePolling({
  taskId,
  onUpdate,
  onComplete,
  onError,
  enabled = true,
  interval = 2000,
}: UseUpdatePollingOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!taskId || !enabled || !isMountedRef.current) {
      return;
    }

    try {
      const status = await updateService.getUpdateStatus(taskId);
      
      if (!isMountedRef.current) {
        return;
      }

      onUpdate(status);

      if (status.status === 'completed' || status.status === 'failed') {
        stopPolling();
        onComplete?.(status);
      } else {
        timerRef.current = setTimeout(poll, interval);
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      onError?.(error as Error);
      stopPolling();
    }
  }, [taskId, enabled, interval, onUpdate, onComplete, onError, stopPolling]);

  useEffect(() => {
    isMountedRef.current = true;

    if (taskId && enabled) {
      poll();
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [taskId, enabled, poll, stopPolling]);

  return { stopPolling };
}
