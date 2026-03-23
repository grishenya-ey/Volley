/**
 * Тесты для volleyballRulesConfig
 */

import { describe, test, expect } from 'vitest';
import { VARIANTS, RULES_CONFIGS, validateRulesConfig } from '../../../src/shared/volleyballRulesConfig';

describe('volleyballRulesConfig', () => {
  describe('RULES_CONFIGS', () => {
    test('содержит конфиги для indoor, beach, snow', () => {
      expect(RULES_CONFIGS[VARIANTS.INDOOR]).toBeDefined();
      expect(RULES_CONFIGS[VARIANTS.BEACH]).toBeDefined();
      expect(RULES_CONFIGS[VARIANTS.SNOW]).toBeDefined();
    });

    test('все конфиги валидны (validateRulesConfig возвращает пустой массив)', () => {
      for (const variant of Object.values(VARIANTS)) {
        const errors = validateRulesConfig(RULES_CONFIGS[variant]);
        expect(errors).toEqual([]);
      }
    });
  });

  describe('validateRulesConfig', () => {
    test('возвращает ошибку при отсутствующем ключе', () => {
      const errors = validateRulesConfig({ setsToWinMatch: 3 } as Parameters<typeof validateRulesConfig>[0]);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
