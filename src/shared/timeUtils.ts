/**
 * Утилиты для работы со временем партий
 */

/**
 * Вычисляет продолжительность партии в минутах
 */
export function calculateDuration(startTime: number | null | undefined, endTime: number | null | undefined): number | null {
  if (!startTime || !endTime) {
    return null;
  }

  if (endTime < startTime) {
    console.warn('calculateDuration: endTime раньше startTime');
    return null;
  }

  return Math.round((endTime - startTime) / 60000);
}

/**
 * Форматирует продолжительность для отображения
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return '';
  }
  return `${minutes}'`;
}

/**
 * Конвертирует Date или строку в timestamp (milliseconds)
 */
export function toTimestamp(date: Date | string | number): number {
  if (typeof date === 'number') {
    return date;
  }

  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Некорректная дата: ${date}`);
    }
    return parsed.getTime();
  }

  if (date instanceof Date) {
    return date.getTime();
  }

  throw new Error('Неподдерживаемый тип данных для конвертации в timestamp');
}

/**
 * Форматирует timestamp в читаемую дату/время
 */
export function formatTimestamp(timestamp: number | null | undefined, timezone?: string): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };

  if (timezone) {
    options.timeZone = timezone;
  }

  return date.toLocaleString('ru-RU', options);
}
