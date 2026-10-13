/**
 * Theme, Appearance, and Background Presets for RanCi App
 */

export interface BaseColorPreset {
  id: string;
  name: string;
  color: string;
  isDark?: boolean;
}

export interface GradientPreset {
  id: string;
  name: string;
  gradient: string;
  isDark?: boolean;
}

export interface ThemeConfig {
  id: string;
  name: string;
  type: 'sunshine' | 'base_color' | 'gradient' | 'custom_image';
  pageBg: string;
  cardBg: string;
  textColor: string;
  subtextColor: string;
  borderColor: string;
  isDark?: boolean;
  bgImageUrl?: string;
  overlayOpacity: number; // 0 - 80 (%) mask
  accentColor?: string;
  accentText?: string;
  buttonPositiveBg?: string;
  buttonPositiveText?: string;
  buttonNegativeBg?: string;
  buttonNegativeText?: string;
}

// ① 基础色：8 个圆形色块 (低饱和浅色 + 深蓝护眼)
export const BASE_COLOR_PRESETS: BaseColorPreset[] = [
  { id: 'base_white', name: '白', color: '#FFFFFF' },
  { id: 'base_mint_white', name: '薄荷白', color: '#F3FAF6' },
  { id: 'base_sky_white', name: '天蓝白', color: '#F0F6FC' },
  { id: 'base_warm_apricot', name: '暖杏', color: '#FCF8F2' },
  { id: 'base_lavender', name: '淡紫', color: '#F7F3FB' },
  { id: 'base_sakura_pink', name: '樱粉', color: '#FAF2F5' },
  { id: 'base_cyan_green', name: '青绿', color: '#EDF8F4' },
  { id: 'base_deep_blue', name: '深蓝 (护眼)', color: '#131B26', isDark: true },
];

// ② 预设渐变：8 个方形预览 (2 行 × 4 个)
export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'grad_dawn', name: '晨光', gradient: 'linear-gradient(135deg, #FFF7EB 0%, #FFE8D6 100%)' },
  { id: 'grad_mint', name: '薄荷', gradient: 'linear-gradient(135deg, #E8F8F1 0%, #D4F2E4 100%)' },
  { id: 'grad_grapefruit', name: '蜜柚', gradient: 'linear-gradient(135deg, #FFF2E8 0%, #FEE0CE 100%)' },
  { id: 'grad_lavender', name: '薰衣', gradient: 'linear-gradient(135deg, #F4EEFC 0%, #E8DCF9 100%)' },
  { id: 'grad_sea_salt', name: '海盐', gradient: 'linear-gradient(135deg, #EBF5FC 0%, #D8ECF9 100%)' },
  { id: 'grad_sakura', name: '樱花', gradient: 'linear-gradient(135deg, #FDF0F4 0%, #FBDDE7 100%)' },
  { id: 'grad_night_flight', name: '夜航', gradient: 'linear-gradient(135deg, #182230 0%, #0F1622 100%)', isDark: true },
  { id: 'grad_starry_night', name: '星夜', gradient: 'linear-gradient(135deg, #141525 0%, #0C0D17 100%)', isDark: true },
];

// 默认阳光风主题
export const DEFAULT_SUNSHINE_THEME: ThemeConfig = {
  id: 'sunshine_default',
  name: '清爽阳光风',
  type: 'sunshine',
  pageBg: 'linear-gradient(160deg, #F7FBFF 0%, #F4F9F7 50%, #FDF9F4 100%)',
  cardBg: '#FFFFFF',
  textColor: '#2C3E46',
  subtextColor: '#768B94',
  borderColor: '#E6EEF1',
  overlayOpacity: 40,
  isDark: false,
};

export const THEME_PRESETS: ThemeConfig[] = [
  DEFAULT_SUNSHINE_THEME,
  {
    id: 'base_mint_white',
    name: '薄荷白',
    type: 'base_color',
    pageBg: '#F3FAF6',
    cardBg: '#FFFFFF',
    textColor: '#2C3E46',
    subtextColor: '#768B94',
    borderColor: '#E6EEF1',
    overlayOpacity: 40,
    isDark: false,
  },
  {
    id: 'base_sky_white',
    name: '天蓝白',
    type: 'base_color',
    pageBg: '#F0F6FC',
    cardBg: '#FFFFFF',
    textColor: '#2C3E46',
    subtextColor: '#768B94',
    borderColor: '#E6EEF1',
    overlayOpacity: 40,
    isDark: false,
  },
  {
    id: 'base_warm_apricot',
    name: '暖杏',
    type: 'base_color',
    pageBg: '#FCF8F2',
    cardBg: '#FFFFFF',
    textColor: '#2C3E46',
    subtextColor: '#768B94',
    borderColor: '#E6EEF1',
    overlayOpacity: 40,
    isDark: false,
  },
  {
    id: 'base_deep_blue',
    name: '暗蓝 (护眼)',
    type: 'base_color',
    pageBg: '#131B26',
    cardBg: '#1C2633',
    textColor: '#F0F4F8',
    subtextColor: '#98AAB3',
    borderColor: '#2C3847',
    overlayOpacity: 40,
    isDark: true,
  },
];

export function getDefaultTheme(): ThemeConfig {
  return { ...DEFAULT_SUNSHINE_THEME };
}
