/**
 * Конфигурации правил для вариантов волейбола
 * См. volleyball-variants-rules.md
 */

export const VARIANTS = {
  INDOOR: 'indoor',
  BEACH: 'beach',
  SNOW: 'snow',
  INDOOR_3SETS: 'indoor-3sets',
} as const;

export type VariantId = (typeof VARIANTS)[keyof typeof VARIANTS];

/** Конфиг правил для варианта */
export interface RulesConfig {
  setsToWinMatch: number;
  maxSets: number;
  pointsToWinRegularSet: number;
  pointsToWinDecidingSet: number;
  decidingSetNumber: number;
  setballThresholdRegular: number;
  setballThresholdDeciding: number;
}

export const RULES_CONFIGS: Record<string, RulesConfig> = {
  [VARIANTS.INDOOR]: {
    setsToWinMatch: 3,
    maxSets: 5,
    pointsToWinRegularSet: 25,
    pointsToWinDecidingSet: 15,
    decidingSetNumber: 5,
    setballThresholdRegular: 24,
    setballThresholdDeciding: 14,
  },
  [VARIANTS.BEACH]: {
    setsToWinMatch: 2,
    maxSets: 3,
    pointsToWinRegularSet: 21,
    pointsToWinDecidingSet: 15,
    decidingSetNumber: 3,
    setballThresholdRegular: 20,
    setballThresholdDeciding: 14,
  },
  [VARIANTS.SNOW]: {
    setsToWinMatch: 2,
    maxSets: 3,
    pointsToWinRegularSet: 15,
    pointsToWinDecidingSet: 15,
    decidingSetNumber: 3,
    setballThresholdRegular: 14,
    setballThresholdDeciding: 14,
  },
  [VARIANTS.INDOOR_3SETS]: {
    setsToWinMatch: 2,
    maxSets: 3,
    pointsToWinRegularSet: 25,
    pointsToWinDecidingSet: 15,
    decidingSetNumber: 3,
    setballThresholdRegular: 24,
    setballThresholdDeciding: 14,
  },
};

const REQUIRED_CONFIG_KEYS: (keyof RulesConfig)[] = [
  'setsToWinMatch',
  'maxSets',
  'pointsToWinRegularSet',
  'pointsToWinDecidingSet',
  'decidingSetNumber',
  'setballThresholdRegular',
  'setballThresholdDeciding',
];

/**
 * Проверяет, что конфиг полный и валидный
 */
export function validateRulesConfig(config: Partial<RulesConfig> | null | undefined): string[] {
  const errors: string[] = [];
  if (!config || typeof config !== 'object') {
    return ['Конфиг отсутствует или не является объектом'];
  }
  for (const key of REQUIRED_CONFIG_KEYS) {
    const value = config[key];
    if (value === undefined || value === null) {
      errors.push(`Отсутствует ключ: ${key}`);
    } else if (typeof value !== 'number' || value < 1) {
      errors.push(`Некорректное значение для ${key}: ${value}`);
    }
  }
  return errors;
}
