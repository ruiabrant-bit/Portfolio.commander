import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'pc:theme';

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Theme setting (PRD v1.1 Settings). Dark is the default per the SFS's
 * explicit trading-terminal direction; light is offered as an
 * alternative, not a redesign of the visual identity.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
