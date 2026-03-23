/**
 * Позиции игроков в волейболе (международный стандарт).
 * Полное название хранится в match.team.roster[].position.
 * Сокращение используется в vMix для компактного отображения.
 */

/** Соответствие полного названия позиции → сокращение (международное) */
export const POSITION_ABBREVIATIONS: Record<string, string> = {
  'Доигровщик': 'OH',
  'Центральный блокирующий': 'MB',
  'Диагональный': 'OPP',
  'Связующий': 'S',
  'Либеро': 'L',
};

export interface PositionOption {
  value: string;
  label: string;
}

/** Варианты позиций для выбора на странице «Управление составами» */
export const POSITION_OPTIONS: PositionOption[] = [
  { value: '', label: '— Не указано —' },
  { value: 'Доигровщик', label: 'Доигровщик (OH)' },
  { value: 'Центральный блокирующий', label: 'Центральный блокирующий (MB)' },
  { value: 'Диагональный', label: 'Диагональный (OPP)' },
  { value: 'Связующий', label: 'Связующий (S)' },
  { value: 'Либеро', label: 'Либеро (L)' },
];

/**
 * Возвращает сокращение позиции по полному названию.
 */
export function getPositionAbbreviation(fullPosition: string | null | undefined): string {
  if (!fullPosition || fullPosition === 'Не указано') return '';
  return POSITION_ABBREVIATIONS[fullPosition] ?? '';
}

/**
 * Мигрирует позицию игрока: старые/неизвестные значения → международный стандарт или пустая строка.
 * Используется при открытии матча (fileManager) и импорте состава (RosterManagementPage).
 */
export function migratePosition(pos: string | null | undefined): string {
  if (pos == null || pos === '') return '';
  if (pos === 'Другое' || pos === 'Не указано') return '';
  if (pos === 'Нападающий') return 'Доигровщик';
  return pos;
}

export interface PlayerWithPosition {
  position?: string | null;
  [key: string]: unknown;
}

/**
 * Мигрирует позиции всех игроков в ростре.
 */
export function migrateRosterPositions<T extends PlayerWithPosition>(roster: T[] | null | undefined): T[] | null | undefined {
  if (!roster || !Array.isArray(roster)) return roster;
  return roster.map((player) => ({
    ...player,
    position: migratePosition(player?.position),
  }));
}
