import { describe, it, expect } from 'vitest';
import { calculateDuration } from '../../src/shared/timeUtils';

/**
 * Тесты для функционала "Счет после X партии" в useVMix
 */

interface SetLike {
  setNumber: number;
  scoreA?: number;
  scoreB?: number;
  status?: string;
  completed?: boolean;
}

describe('useVMix - Set Score Inputs', () => {
  describe('calculateDuration integration', () => {
    it('должен использовать Math.round() для округления длительности (как в timeUtils)', () => {
      const startTime = 1000000;
      const endTime = 1000000 + (30 * 60 * 1000 + 30 * 1000);
      const duration = calculateDuration(startTime, endTime);
      expect(duration).toBe(31);
    });

    it('должен возвращать null, если startTime или endTime отсутствуют', () => {
      expect(calculateDuration(null, 1000000)).toBeNull();
      expect(calculateDuration(1000000, null)).toBeNull();
      expect(calculateDuration(undefined, 1000000)).toBeNull();
      expect(calculateDuration(1000000, undefined)).toBeNull();
    });

    it('должен возвращать null, если endTime раньше startTime', () => {
      const startTime = 2000000;
      const endTime = 1000000;
      const duration = calculateDuration(startTime, endTime);
      expect(duration).toBeNull();
    });

    it('должен правильно округлять длительность для различных значений', () => {
      const startTime = 1000000;
      expect(calculateDuration(startTime, startTime + (30 * 60 * 1000 + 29 * 1000))).toBe(30);
      expect(calculateDuration(startTime, startTime + (30 * 60 * 1000 + 30 * 1000))).toBe(31);
      expect(calculateDuration(startTime, startTime + (30 * 60 * 1000 + 31 * 1000))).toBe(31);
    });
  });

  describe('Field value logic', () => {
    const createMatch = (sets: SetLike[] = []) => ({
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets,
    });

    it('должен правильно определять завершенные партии', () => {
      const match = createMatch([
        { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' },
        { setNumber: 2, scoreA: 20, scoreB: 25, status: 'in_progress' },
        { setNumber: 3, scoreA: 15, scoreB: 25, completed: true },
      ]);
      const completedSets = match.sets.filter(
        (set) =>
          set.setNumber <= 3 &&
          (set.status === 'completed' || set.completed === true)
      );
      expect(completedSets).toHaveLength(2);
      expect(completedSets[0].setNumber).toBe(1);
      expect(completedSets[1].setNumber).toBe(3);
    });

    it('должен правильно вычислять счет по сетам для частично завершенных партий', () => {
      const match = createMatch([
        { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' },
        { setNumber: 2, scoreA: 20, scoreB: 25, status: 'completed' },
      ]);
      const setNumber = 3;
      const completedSets = match.sets.filter(
        (set) =>
          set.setNumber <= setNumber &&
          (set.status === 'completed' || set.completed === true)
      );
      const scoreASets = completedSets.filter((set) => set.scoreA! > set.scoreB!).length;
      const scoreBSets = completedSets.filter((set) => set.scoreB! > set.scoreA!).length;
      expect(scoreASets).toBe(1);
      expect(scoreBSets).toBe(1);
    });

    it('должен возвращать пустые значения для незавершенных партий', () => {
      const match = createMatch([
        { setNumber: 1, scoreA: 15, scoreB: 10, status: 'in_progress' },
      ]);
      const set = match.sets.find((s) => s.setNumber === 1);
      const isCompleted = set && (set.status === 'completed' || set.completed === true);
      expect(isCompleted).toBe(false);
    });

    it('должен возвращать пустые значения для партий, номер которых превышает setNumber', () => {
      const match = createMatch([
        { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' },
        { setNumber: 2, scoreA: 20, scoreB: 25, status: 'completed' },
      ]);
      const setNumber = 1;
      const completedSets = match.sets.filter(
        (set) =>
          set.setNumber <= setNumber &&
          (set.status === 'completed' || set.completed === true)
      );
      expect(completedSets).toHaveLength(1);
      expect(completedSets[0].setNumber).toBe(1);
    });
  });

  describe('Field key matching', () => {
    it('должен правильно парсить fieldKey для полей партий', () => {
      const fieldKey = 'set1Duration';
      const match = fieldKey.match(/^set(\d+)(Duration|ScoreA|ScoreB)$/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('1');
      expect(match![2]).toBe('Duration');
    });

    it('должен правильно парсить fieldKey для счетов партий', () => {
      const fieldKey = 'set2ScoreA';
      const match = fieldKey.match(/^set(\d+)(Duration|ScoreA|ScoreB)$/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('2');
      expect(match![2]).toBe('ScoreA');
    });

    it('должен правильно парсить fieldKey для всех типов полей', () => {
      const testCases = [
        { key: 'set1Duration', expected: { num: '1', type: 'Duration' } },
        { key: 'set2ScoreA', expected: { num: '2', type: 'ScoreA' } },
        { key: 'set3ScoreB', expected: { num: '3', type: 'ScoreB' } },
        { key: 'set5Duration', expected: { num: '5', type: 'Duration' } },
      ];
      testCases.forEach(({ key, expected }) => {
        const match = key.match(/^set(\d+)(Duration|ScoreA|ScoreB)$/);
        expect(match).not.toBeNull();
        expect(match![1]).toBe(expected.num);
        expect(match![2]).toBe(expected.type);
      });
    });
  });
});
