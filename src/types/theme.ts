/**
 * Theme and Custom Background definitions
 */

export interface ThemeConfig {
  id: string;
  name: string;
  pageBg: string;
  cardBg: string;
  textColor: string;
  subtextColor: string;
  accentColor: string;
  accentText: string;
  buttonPositiveBg: string;
  buttonPositiveText: string;
  buttonNegativeBg: string;
  buttonNegativeText: string;
  borderColor: string;
  bgImageUrl?: string;
  overlayOpacity: number; // 0 - 100 (%)
  overlayBlur: number; // 0 - 20 (px)
  isDark?: boolean;
}

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'eye_care_beige',
    name: '护眼米色 (默认)',
    pageBg: '#FFFDF8',
    cardBg: '#FFFFFF',
    textColor: '#2C2C2C',
    subtextColor: '#666666',
    accentColor: '#2C2C2C',
    accentText: '#FFFFFF',
    buttonPositiveBg: '#D7E8DD',
    buttonPositiveText: '#234E35',
    buttonNegativeBg: '#F7E2E2',
    buttonNegativeText: '#7A2828',
    borderColor: '#EAE6DD',
    overlayOpacity: 75,
    overlayBlur: 4,
  },
  {
    id: 'fresh_grassland',
    name: '清新草原绿',
    pageBg: '#F3F9F4',
    cardBg: '#FFFFFF',
    textColor: '#1A3324',
    subtextColor: '#4B6B57',
    accentColor: '#2A6F4A',
    accentText: '#FFFFFF',
    buttonPositiveBg: '#CDEFD6',
    buttonPositiveText: '#18542B',
    buttonNegativeBg: '#FCE0E0',
    buttonNegativeText: '#822727',
    borderColor: '#D4E8DA',
    overlayOpacity: 75,
    overlayBlur: 4,
  },
  {
    id: 'sky_blue',
    name: '天空蓝',
    pageBg: '#F0F6FC',
    cardBg: '#FFFFFF',
    textColor: '#162C42',
    subtextColor: '#4E6A85',
    accentColor: '#20639B',
    accentText: '#FFFFFF',
    buttonPositiveBg: '#D2EDF8',
    buttonPositiveText: '#134D66',
    buttonNegativeBg: '#FCE0E4',
    buttonNegativeText: '#872332',
    borderColor: '#D2E3F3',
    overlayOpacity: 75,
    overlayBlur: 4,
  },
  {
    id: 'sakura_pink',
    name: '樱花粉',
    pageBg: '#FFF5F7',
    cardBg: '#FFFFFF',
    textColor: '#3D1C24',
    subtextColor: '#7A4D57',
    accentColor: '#8E384D',
    accentText: '#FFFFFF',
    buttonPositiveBg: '#DFF1E4',
    buttonPositiveText: '#235934',
    buttonNegativeBg: '#FCD8DF',
    buttonNegativeText: '#842639',
    borderColor: '#F5D7DF',
    overlayOpacity: 75,
    overlayBlur: 4,
  },
  {
    id: 'minimal_monochrome',
    name: '简约灰白',
    pageBg: '#F7F7F8',
    cardBg: '#FFFFFF',
    textColor: '#1E1E20',
    subtextColor: '#5E5E66',
    accentColor: '#1E1E20',
    accentText: '#FFFFFF',
    buttonPositiveBg: '#E2EBE4',
    buttonPositiveText: '#264D32',
    buttonNegativeBg: '#F3DFDF',
    buttonNegativeText: '#6B2B2B',
    borderColor: '#E2E2E6',
    overlayOpacity: 75,
    overlayBlur: 4,
  },
  {
    id: 'dark_night',
    name: '深色夜间模式',
    pageBg: '#18181A',
    cardBg: '#242428',
    textColor: '#EEEEEE',
    subtextColor: '#A0A0AA',
    accentColor: '#E0E0E6',
    accentText: '#18181A',
    buttonPositiveBg: '#214D32',
    buttonPositiveText: '#A1E6B8',
    buttonNegativeBg: '#592025',
    buttonNegativeText: '#F7B0B5',
    borderColor: '#383840',
    overlayOpacity: 85,
    overlayBlur: 6,
    isDark: true,
  },
];
