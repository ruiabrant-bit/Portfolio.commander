import { useQuery } from '@tanstack/react-query';
import { fetchTimeSeries } from '../services/marketdata/twelveDataClient';

export function useAssetTimeSeries(ticker: string | undefined, apiKey: string | null) {
  return useQuery({
    queryKey: ['timeSeries', ticker, apiKey],
    queryFn: () => fetchTimeSeries(ticker as string, apiKey as string),
    enabled: Boolean(ticker) && Boolean(apiKey),
    staleTime: 5 * 60 * 1000, // 5 minutes — avoid refetching on every tab switch
    retry: false,
  });
}
