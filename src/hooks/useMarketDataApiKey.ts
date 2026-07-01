import { useCallback, useState } from 'react';
import { getTwelveDataApiKey, setTwelveDataApiKey, clearTwelveDataApiKey } from '../utils/apiKeyStorage';

export function useMarketDataApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(() => getTwelveDataApiKey());

  const saveApiKey = useCallback((key: string) => {
    setTwelveDataApiKey(key);
    setApiKeyState(key);
  }, []);

  const clearApiKey = useCallback(() => {
    clearTwelveDataApiKey();
    setApiKeyState(null);
  }, []);

  return { apiKey, saveApiKey, clearApiKey };
}
