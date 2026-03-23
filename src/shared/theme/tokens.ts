/**
 * Design tokens: цвета, отступы, радиусы, типографика.
 * Общий модуль для renderer и main (десктоп и мобильная панель).
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryHover: string;
  success: string;
  successHover: string;
  danger: string;
  dangerHover: string;
  warning: string;
  neutral: string;
  neutralHover: string;
  accent: string;
  accentHover: string;
  border: string;
  borderStrong: string;
  headerBg: string;
  disabled: string;
  overlay: string;
  primaryLight: string;
  servingBorder: string;
  servingBadge: string;
}

/** Светлая тема */
export const light: ThemeColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  surfaceMuted: '#ecf0f1',
  text: '#2c3e50',
  textSecondary: '#7f8c8d',
  primary: '#3498db',
  primaryHover: '#2980b9',
  success: '#27ae60',
  successHover: '#229954',
  danger: '#e74c3c',
  dangerHover: '#c0392b',
  warning: '#f39c12',
  neutral: '#95a5a6',
  neutralHover: '#7f8c8d',
  accent: '#9b59b6',
  accentHover: '#8e44ad',
  border: '#bdc3c7',
  borderStrong: '#3498db',
  headerBg: '#2c3e50',
  disabled: '#bdc3c7',
  overlay: 'rgba(0,0,0,0.5)',
  primaryLight: '#e8f4f8',
  servingBorder: '#3498db',
  servingBadge: '#3498db',
};

/** Тёмная тема (градации серого для подложек) */
export const dark: ThemeColors = {
  background: '#121212',
  surface: '#252525',
  surfaceMuted: '#383838',
  text: '#e8e8e8',
  textSecondary: '#b0b0b0',
  primary: '#3498db',
  primaryHover: '#5dade2',
  success: '#27ae60',
  successHover: '#2ecc71',
  danger: '#e74c3c',
  dangerHover: '#ec7063',
  warning: '#f39c12',
  neutral: '#7f8c8d',
  neutralHover: '#95a5a6',
  accent: '#9b59b6',
  accentHover: '#a569bd',
  border: '#404040',
  borderStrong: '#3498db',
  headerBg: '#1a1a1a',
  disabled: '#4a4a4a',
  overlay: 'rgba(0,0,0,0.6)',
  primaryLight: '#3a3a3a',
  servingBorder: '#5dade2',
  servingBadge: '#3498db',
};

export const space = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
} as const;

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
} as const;

export const typography = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  h1: '2.5rem',
  h2: '1.5rem',
  h3: '1.25rem',
  h4: '1rem',
  body: '1rem',
  small: '0.9rem',
  caption: '0.85rem',
} as const;
