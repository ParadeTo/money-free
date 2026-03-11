import { useState, useEffect } from 'react';

const STORAGE_VERSION = '1.0.0';
const STORAGE_PREFIX = 'vcp-early-stage';

interface StoredData<T> {
  version: string;
  timestamp: number;
  data: T;
}

interface UseLocalStoragePersistOptions<T> {
  key: string;
  defaultValue: T;
  version?: string;
}

/**
 * localStorage持久化Hook
 * 支持版本管理，自动忽略版本不匹配的数据
 */
export function useLocalStoragePersist<T>({
  key,
  defaultValue,
  version = STORAGE_VERSION,
}: UseLocalStoragePersistOptions<T>) {
  const storageKey = `${STORAGE_PREFIX}:${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        return defaultValue;
      }

      const parsed: StoredData<T> = JSON.parse(stored);

      if (parsed.version !== version) {
        console.log(`[useLocalStoragePersist] Version mismatch for ${key}, using default value`);
        localStorage.removeItem(storageKey);
        return defaultValue;
      }

      return parsed.data;
    } catch (error) {
      console.error(`[useLocalStoragePersist] Error loading ${key}:`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      const dataToStore: StoredData<T> = {
        version,
        timestamp: Date.now(),
        data: value,
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error(`[useLocalStoragePersist] Error saving ${key}:`, error);
    }
  }, [storageKey, value, version]);

  const reset = () => {
    setValue(defaultValue);
    localStorage.removeItem(storageKey);
  };

  return [value, setValue, reset] as const;
}
