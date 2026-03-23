/**
 * Утилиты для работы с полями vMix
 * Обеспечивают автоматическое добавление суффиксов к именам полей
 */

export const FIELD_SUFFIXES = {
  text: '.Text',
  image: '.Source',
  fill: '.Fill.Color',
} as const;

export type FieldType = keyof typeof FIELD_SUFFIXES;

export function getFullFieldName(fieldIdentifier: string | null | undefined, type: FieldType): string {
  let id = fieldIdentifier ?? '';
  id = String(id);

  const suffix = FIELD_SUFFIXES[type];
  if (!suffix) {
    throw new Error(`Неизвестный тип поля: ${type}`);
  }

  if (id.endsWith(suffix)) {
    return id;
  }

  return id + suffix;
}

export function removeFieldSuffix(fieldIdentifier: string | null | undefined): string {
  if (!fieldIdentifier) {
    return '';
  }

  let id = String(fieldIdentifier);
  const suffixes = Object.values(FIELD_SUFFIXES).sort((a, b) => b.length - a.length);

  for (const suffix of suffixes) {
    if (id.endsWith(suffix)) {
      return id.slice(0, -suffix.length);
    }
  }

  return id;
}

export function hasFieldSuffix(fieldIdentifier: string | null | undefined, type: FieldType): boolean {
  if (!fieldIdentifier || !type) {
    return false;
  }

  const suffix = FIELD_SUFFIXES[type];
  if (!suffix) {
    return false;
  }

  return String(fieldIdentifier).endsWith(suffix);
}
