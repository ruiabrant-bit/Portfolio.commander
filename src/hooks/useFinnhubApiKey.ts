import { useCallback, useState } from 'react';
import { getFinnhubApiKey, setFinnhubApiKey, clearFinnhubApiKey } from '../utils/apiKeyStorage';

export function useFinnhubApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(() => getFinnhubApiKey());

  const saveApiKey = useCallback((key: string) => {
    setFinnhubApiKey(key);
    setApiKeyState(key);
  }, []);

  const clearApiKey = useCallback(() => {
    clearFinnhubApiKey();
    setApiKeyState(null);
  }, []);

  return { apiKey, saveApiKey, clearApiKey };
}
