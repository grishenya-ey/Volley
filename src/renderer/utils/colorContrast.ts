/**
 * Утилиты для работы с контрастностью цветов
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Конвертирует hex цвет в RGB значения
 */
function hexToRgb(hex: string): Rgb {
  hex = hex.replace('#', '');

  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Конвертирует sRGB значение в линейное пространство для расчета яркости
 */
function sRGBToLinear(value: number): number {
  const normalized = value / 255;
  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }
  return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * Вычисляет относительную яркость цвета по формуле WCAG
 */
export function getRelativeLuminance(hex: string | null | undefined): number {
  if (!hex) return 0;

  const { r, g, b } = hexToRgb(hex);

  const rLinear = sRGBToLinear(r);
  const gLinear = sRGBToLinear(g);
  const bLinear = sRGBToLinear(b);

  const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;

  return luminance;
}

/**
 * Определяет, какой цвет текста (черный или белый) будет лучше виден на заданном фоне
 */
export function getContrastTextColor(backgroundColor: string | null | undefined): string {
  if (!backgroundColor) {
    return '#ffffff';
  }

  const luminance = getRelativeLuminance(backgroundColor);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Упрощенная версия для быстрого определения (использует простую формулу яркости)
 */
export function getContrastTextColorSimple(backgroundColor: string | null | undefined): string {
  if (!backgroundColor) {
    return '#ffffff';
  }

  const { r, g, b } = hexToRgb(backgroundColor);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}
