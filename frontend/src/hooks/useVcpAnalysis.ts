import { useQuery } from '@tanstack/react-query';
import { vcpService } from '../services/vcp.service';
import type { VcpAnalysis } from '../types/vcp';

/**
 * Hook to fetch VCP analysis for a single stock
 * 
 * @param stockCode Stock code (e.g., "605117")
 * @param forceRefresh Force real-time analysis (ignore cache)
 * @returns React Query result with VCP analysis data
 * 
 * @example
 * ```tsx
 * const { data, loading, error } = useVcpAnalysis('605117');
 * ```
 */
export function useVcpAnalysis(stockCode: string, forceRefresh = false) {
  return useQuery<VcpAnalysis, Error>({
    queryKey: ['vcp-analysis', stockCode, forceRefresh],
    queryFn: () => vcpService.generateVcpAnalysis(stockCode, forceRefresh),
    enabled: !!stockCode,
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days - cached data is valid for 7 days
    gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection time
    retry: 1, // Retry once on failure
  });
}
