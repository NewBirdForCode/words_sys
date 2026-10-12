import { ThemeConfig, THEME_PRESETS } from '../types/theme';

const STORAGE_KEY_THEME = 'daily30_theme_settings_v2';

export function getDefaultTheme(): ThemeConfig {
  return THEME_PRESETS[0];
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
  
  root.style.setProperty('--app-page-bg', theme.pageBg);
  root.style.setProperty('--app-card-bg', theme.cardBg);
  root.style.setProperty('--app-text', theme.textColor);
  root.style.setProperty('--app-subtext', theme.subtextColor);
  root.style.setProperty('--app-accent', theme.accentColor);
  root.style.setProperty('--app-accent-text', theme.accentText);
  root.style.setProperty('--app-border', theme.borderColor);
  root.style.setProperty('--app-btn-pos-bg', theme.buttonPositiveBg);
  root.style.setProperty('--app-btn-pos-text', theme.buttonPositiveText);
  root.style.setProperty('--app-btn-neg-bg', theme.buttonNegativeBg);
  root.style.setProperty('--app-btn-neg-text', theme.buttonNegativeText);
  
  document.body.style.backgroundColor = theme.pageBg;
  document.body.style.color = theme.textColor;
}
