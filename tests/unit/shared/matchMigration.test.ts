import { describe, expect, test } from 'vitest';

import { migrateMatchToSetStatus, needsMigration } from '../../../src/shared/matchMigration';
import { createNewMatch } from '../../../src/shared/matchUtils';
import { VARIANTS } from '../../../src/shared/volleyballRulesConfig';

describe('matchMigration', () => {
  test('сохраняет вариант indoor-3sets при миграции', () => {
    const match = createNewMatch();
    match.variant = VARIANTS.INDOOR_3SETS;

    const migratedMatch = migrateMatchToSetStatus(match);

    expect(migratedMatch?.variant).toBe(VARIANTS.INDOOR_3SETS);
  });

  test('сбрасывает неизвестный вариант на indoor', () => {
    const match = {
      ...createNewMatch(),
      variant: 'unknown-variant',
    };

    const migratedMatch = migrateMatchToSetStatus(match);

    expect(migratedMatch?.variant).toBe(VARIANTS.INDOOR);
  });

  test('определяет необходимость миграции по отсутствующему статусу партии', () => {
    const match = {
      ...createNewMatch(),
      sets: [
        {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          completed: true,
        },
      ],
    };

    expect(needsMigration(match)).toBe(true);
  });
});
