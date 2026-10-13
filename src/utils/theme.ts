import { ThemeConfig, DEFAULT_SUNSHINE_THEME } from '../types/theme';
import { getCustomBackgroundFromDB } from './backgroundStorage';
import { userScopedStorageKey } from './userStorage';

const STORAGE_KEY_THEME = userScopedStorageKey('daily30_theme_settings_v3');

export function getDefaultTheme(): ThemeConfig {
  return { ...DEFAULT_SUNSHINE_THEME };
}

export function loadSavedTheme(): ThemeConfig {
  if (typeof window === 'undefined') return getDefaultTheme();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_THEME);
    if (!raw) return getDefaultTheme();
    const parsed = JSON.parse(raw) as ThemeConfig;
    return { ...getDefaultTheme(), ...parsed };
  } catch (e) {
    console.error('Failed to load theme:', e);
    return getDefaultTheme();
  }
}

export function saveTheme(theme: ThemeConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(theme));
    applyThemeToDOM(theme);
  } catch (e) {
    console.error('Failed to save theme:', e);
  }
}

export function resetTheme(): ThemeConfig {
  const def = getDefaultTheme();
  saveTheme(def);
  return def;
}

/**
 * Applies theme CSS variables to :root and document.body
 */
export function applyThemeToDOM(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.style.setProperty('--app-page-bg', theme.pageBg);
  root.style.setProperty('--app-card-bg', theme.cardBg);
  root.style.setProperty('--app-text', theme.textColor);
  root.style.setProperty('--app-subtext', theme.subtextColor);
  root.style.setProperty('--app-border', theme.borderColor);

  document.body.style.color = theme.textColor;
}
