/**
 * Тесты для модуля volleyballRules
 */

import { createRules, getRules, getSetNumbers, isDecidingSet, RULES_CONFIGS, VARIANTS } from '../../../src/shared/volleyballRules';

const indoorRules = createRules(RULES_CONFIGS[VARIANTS.INDOOR]);
const beachRules = createRules(RULES_CONFIGS[VARIANTS.BEACH]);
const snowRules = createRules(RULES_CONFIGS[VARIANTS.SNOW]);

describe('volleyballRules', () => {
  describe('createRules (indoor)', () => {
    describe('isSetball', () => {
      test('должен возвращать false для низкого счета', () => {
        const result = indoorRules.isSetball(10, 8, 1);
        expect(result.isSetball).toBe(false);
        expect(result.team).toBeNull();
      });

      test('должен определять сетбол в обычном сете (24:23)', () => {
        const result = indoorRules.isSetball(24, 23, 1);
        expect(result.isSetball).toBe(true);
        expect(result.team).toBe('A');
      });

      test('должен определять сетбол в обычном сете (23:24)', () => {
        const result = indoorRules.isSetball(23, 24, 1);
        expect(result.isSetball).toBe(true);
        expect(result.team).toBe('B');
      });

      test('должен определять сетбол в обычном сете (25:24)', () => {
        const result = indoorRules.isSetball(25, 24, 1);
        expect(result.isSetball).toBe(true);
        expect(result.team).toBe('A');
      });

      test('НЕ должен определять сетбол при равном счете (24:24)', () => {
        const result = indoorRules.isSetball(24, 24, 1);
        expect(result.isSetball).toBe(false);
        expect(result.team).toBeNull();
      });

      test('НЕ должен определять сетбол при равном счете (25:25)', () => {
        const result = indoorRules.isSetball(25, 25, 1);
        expect(result.isSetball).toBe(false);
        expect(result.team).toBeNull();
      });

      test('должен определять сетбол в 5-м сете (14:13)', () => {
        const result = indoorRules.isSetball(14, 13, 5);
        expect(result.isSetball).toBe(true);
        expect(result.team).toBe('A');
      });

      test('должен определять сетбол в 5-м сете (13:14)', () => {
        const result = indoorRules.isSetball(13, 14, 5);
        expect(result.isSetball).toBe(true);
        expect(result.team).toBe('B');
      });

      test('НЕ должен определять сетбол в 5-м сете при равном счете (14:14)', () => {
        const result = indoorRules.isSetball(14, 14, 5);
        expect(result.isSetball).toBe(false);
        expect(result.team).toBeNull();
      });

      test('должен определять сетбол при большом отрыве (25:20)', () => {
        const result = indoorRules.isSetball(25, 20, 1);
        expect(result.isSetball).toBe(true);
        expect(result.team).toBe('A');
      });

      test('НЕ должен определять сетбол при недостаточном счете (23:22)', () => {
        const result = indoorRules.isSetball(23, 22, 1);
        expect(result.isSetball).toBe(false);
      });
    });

    describe('isMatchball', () => {
      test('должен возвращать false если нет завершенных сетов', () => {
        const sets: Array<{ setNumber: number; scoreA: number; scoreB: number; completed: boolean }> = [];
        const result = indoorRules.isMatchball(sets, 1, 24, 23);
        expect(result.isMatchball).toBe(false);
        expect(result.team).toBeNull();
      });

      test('должен определять матчбол для команды A (2:0 по сетам, на сетболе)', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
        ];
        const result = indoorRules.isMatchball(sets, 3, 24, 23);
        expect(result.isMatchball).toBe(true);
        expect(result.team).toBe('A');
      });

      test('должен определять матчбол для команды B (0:2 по сетам, на сетболе)', () => {
        const sets = [
          { setNumber: 1, scoreA: 20, scoreB: 25, completed: true },
          { setNumber: 2, scoreA: 22, scoreB: 25, completed: true },
        ];
        const result = indoorRules.isMatchball(sets, 3, 23, 24);
        expect(result.isMatchball).toBe(true);
        expect(result.team).toBe('B');
      });

      test('НЕ должен определять матчбол если команда не на сетболе', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
        ];
        const result = indoorRules.isMatchball(sets, 3, 20, 15);
        expect(result.isMatchball).toBe(false);
      });

      test('НЕ должен определять матчбол если счет по сетам 1:1', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 20, scoreB: 25, completed: true },
        ];
        const result = indoorRules.isMatchball(sets, 3, 24, 23);
        expect(result.isMatchball).toBe(false);
      });

      test('должен определять матчбол для команды A (2:1 по сетам, на сетболе)', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 20, scoreB: 25, completed: true },
          { setNumber: 3, scoreA: 25, scoreB: 22, completed: true },
        ];
        const result = indoorRules.isMatchball(sets, 4, 24, 23);
        expect(result.isMatchball).toBe(true);
        expect(result.team).toBe('A');
      });

      test('НЕ должен определять матчбол если команда на сетболе, но не ведет по сетам', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
        ];
        const result = indoorRules.isMatchball(sets, 3, 23, 24);
        expect(result.isMatchball).toBe(false);
      });
    });

    describe('canFinishSet', () => {
      test('должен возвращать false для низкого счета', () => {
        expect(indoorRules.canFinishSet(10, 8, 1)).toBe(false);
      });

      test('должен возвращать true при 25:23 в обычном сете', () => {
        expect(indoorRules.canFinishSet(25, 23, 1)).toBe(true);
      });

      test('должен возвращать true при 23:25 в обычном сете', () => {
        expect(indoorRules.canFinishSet(23, 25, 1)).toBe(true);
      });

      test('НЕ должен возвращать true при 25:24 (разница меньше 2)', () => {
        expect(indoorRules.canFinishSet(25, 24, 1)).toBe(false);
      });

      test('должен возвращать true при 26:24 в обычном сете', () => {
        expect(indoorRules.canFinishSet(26, 24, 1)).toBe(true);
      });

      test('должен возвращать true при 15:13 в 5-м сете', () => {
        expect(indoorRules.canFinishSet(15, 13, 5)).toBe(true);
      });

      test('НЕ должен возвращать true при 15:14 в 5-м сете (разница меньше 2)', () => {
        expect(indoorRules.canFinishSet(15, 14, 5)).toBe(false);
      });

      test('должен возвращать true при 16:14 в 5-м сете', () => {
        expect(indoorRules.canFinishSet(16, 14, 5)).toBe(true);
      });

      test('должен возвращать true при тай-брейке 26:24', () => {
        expect(indoorRules.canFinishSet(26, 24, 1)).toBe(true);
      });

      test('должен возвращать true при тай-брейке 24:26', () => {
        expect(indoorRules.canFinishSet(24, 26, 1)).toBe(true);
      });

      test('НЕ должен возвращать true при тай-брейке 25:24', () => {
        expect(indoorRules.canFinishSet(25, 24, 1)).toBe(false);
      });

      test('должен возвращать true при тай-брейке в 5-м сете 16:14', () => {
        expect(indoorRules.canFinishSet(16, 14, 5)).toBe(true);
      });

      test('НЕ должен возвращать true при тай-брейке в 5-м сете 15:14', () => {
        expect(indoorRules.canFinishSet(15, 14, 5)).toBe(false);
      });
    });

    describe('getSetWinner', () => {
      test('должен возвращать A если команда A выиграла', () => {
        expect(indoorRules.getSetWinner(25, 20)).toBe('A');
      });

      test('должен возвращать B если команда B выиграла', () => {
        expect(indoorRules.getSetWinner(20, 25)).toBe('B');
      });

      test('должен возвращать null при равном счете', () => {
        expect(indoorRules.getSetWinner(25, 25)).toBeNull();
      });

      test('должен возвращать A при большом отрыве', () => {
        expect(indoorRules.getSetWinner(25, 10)).toBe('A');
      });
    });

    describe('getMatchWinner', () => {
      test('должен возвращать null если матч не завершен', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 20, scoreB: 25, completed: true },
        ];
        expect(indoorRules.getMatchWinner(sets)).toBeNull();
      });

      test('должен возвращать A если команда A выиграла 3 сета', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
          { setNumber: 3, scoreA: 25, scoreB: 23, completed: true },
        ];
        expect(indoorRules.getMatchWinner(sets)).toBe('A');
      });

      test('должен возвращать B если команда B выиграла 3 сета', () => {
        const sets = [
          { setNumber: 1, scoreA: 20, scoreB: 25, completed: true },
          { setNumber: 2, scoreA: 22, scoreB: 25, completed: true },
          { setNumber: 3, scoreA: 23, scoreB: 25, completed: true },
        ];
        expect(indoorRules.getMatchWinner(sets)).toBe('B');
      });

      test('должен игнорировать незавершенные сеты', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
          { setNumber: 3, scoreA: 10, scoreB: 5, completed: false },
          { setNumber: 4, scoreA: 25, scoreB: 23, completed: true },
        ];
        expect(indoorRules.getMatchWinner(sets)).toBe('A');
      });

      test('должен возвращать null при счете 2:2', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 20, scoreB: 25, completed: true },
          { setNumber: 3, scoreA: 25, scoreB: 22, completed: true },
          { setNumber: 4, scoreA: 22, scoreB: 25, completed: true },
        ];
        expect(indoorRules.getMatchWinner(sets)).toBeNull();
      });
    });

    describe('isMatchFinished', () => {
      test('должен возвращать false если матч не завершен', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 20, scoreB: 25, completed: true },
        ];
        expect(indoorRules.isMatchFinished(sets)).toBe(false);
      });

      test('должен возвращать true если матч завершен', () => {
        const sets = [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
          { setNumber: 2, scoreA: 25, scoreB: 22, completed: true },
          { setNumber: 3, scoreA: 25, scoreB: 23, completed: true },
        ];
        expect(indoorRules.isMatchFinished(sets)).toBe(true);
      });
    });
  });

  describe('createRules (beach)', () => {
    test('isSetball(20, 19, 1) — сетбол в 1-й партии', () => {
      const result = beachRules.isSetball(20, 19, 1);
      expect(result.isSetball).toBe(true);
      expect(result.team).toBe('A');
    });

    test('isSetball(14, 13, 3) — сетбол в 3-й партии', () => {
      const result = beachRules.isSetball(14, 13, 3);
      expect(result.isSetball).toBe(true);
      expect(result.team).toBe('A');
    });

    test('canFinishSet(21, 19, 1)', () => {
      expect(beachRules.canFinishSet(21, 19, 1)).toBe(true);
    });

    test('getMatchWinner с 2 победами A', () => {
      const sets = [
        { setNumber: 1, scoreA: 21, scoreB: 19, completed: true },
        { setNumber: 2, scoreA: 21, scoreB: 18, completed: true },
      ];
      expect(beachRules.getMatchWinner(sets)).toBe('A');
    });
  });

  describe('createRules (snow)', () => {
    test('isSetball(14, 13, 1) — сетбол в 1-й партии', () => {
      const result = snowRules.isSetball(14, 13, 1);
      expect(result.isSetball).toBe(true);
      expect(result.team).toBe('A');
    });

    test('canFinishSet(15, 13, 1)', () => {
      expect(snowRules.canFinishSet(15, 13, 1)).toBe(true);
    });

    test('canFinishSet(15, 14, 1) — разница 1, нельзя завершить', () => {
      expect(snowRules.canFinishSet(15, 14, 1)).toBe(false);
    });
  });

  describe('getRules', () => {
    test('возвращает правила зала при match.variant === "indoor"', () => {
      const match = { variant: 'indoor' as const };
      const rules = getRules(match);
      expect(rules.canFinishSet(25, 23, 1)).toBe(true);
      expect(rules.getConfig().maxSets).toBe(5);
    });

    test('возвращает правила пляжа при match.variant === "beach"', () => {
      const match = { variant: 'beach' as const };
      const rules = getRules(match);
      expect(rules.canFinishSet(21, 19, 1)).toBe(true);
      expect(rules.getConfig().maxSets).toBe(3);
    });

    test('возвращает правила снега при match.variant === "snow"', () => {
      const match = { variant: 'snow' as const };
      const rules = getRules(match);
      expect(rules.canFinishSet(15, 13, 1)).toBe(true);
    });
  });

  describe('getSetNumbers', () => {
    test('возвращает [1,2,3,4,5] для indoor', () => {
      expect(getSetNumbers({ variant: 'indoor' })).toEqual([1, 2, 3, 4, 5]);
    });

    test('возвращает [1,2,3] для beach', () => {
      expect(getSetNumbers({ variant: 'beach' })).toEqual([1, 2, 3]);
    });

    test('возвращает [1,2,3] для snow', () => {
      expect(getSetNumbers({ variant: 'snow' })).toEqual([1, 2, 3]);
    });
  });

  describe('isDecidingSet', () => {
    test('возвращает true для 5-й партии при indoor', () => {
      expect(isDecidingSet(5, { variant: 'indoor' })).toBe(true);
    });
    test('возвращает false для 3-й партии при indoor', () => {
      expect(isDecidingSet(3, { variant: 'indoor' })).toBe(false);
    });
    test('возвращает true для 3-й партии при beach', () => {
      expect(isDecidingSet(3, { variant: 'beach' })).toBe(true);
    });
    test('возвращает false для 1-й партии при beach', () => {
      expect(isDecidingSet(1, { variant: 'beach' })).toBe(false);
    });
    test('возвращает true для 3-й партии при snow', () => {
      expect(isDecidingSet(3, { variant: 'snow' })).toBe(true);
    });
  });
});
