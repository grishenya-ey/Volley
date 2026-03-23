/**
 * Применяет набор токенов темы к document.documentElement в виде CSS-переменных.
 * Используется для светлой/тёмной темы.
 */
import type { ThemeColors } from '../../shared/theme/tokens';

export function applyTheme(themeObject: ThemeColors | null | undefined): void {
  if (!themeObject || typeof themeObject !== 'object') {
    return;
  }
  const root = document.documentElement;
  for (const [key, value] of Object.entries(themeObject)) {
    const name = '--color-' + key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    root.style.setProperty(name, value);
  }
}
