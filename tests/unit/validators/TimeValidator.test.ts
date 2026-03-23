/**
 * Тесты для TimeValidator
 */

import { TimeValidator } from '../../../src/shared/validators/TimeValidator';

describe('TimeValidator', () => {
  describe('validateTimeOverlap', () => {
    it('должен возвращать true для непересекающихся интервалов', () => {
      const set1 = { startTime: 1000, endTime: 2000 };
      const set2 = { startTime: 2000, endTime: 3000 };
      expect(TimeValidator.validateTimeOverlap(set1, set2)).toBe(true);
    });

    it('должен возвращать false для пересекающихся интервалов', () => {
      const set1 = { startTime: 1000, endTime: 2500 };
      const set2 = { startTime: 2000, endTime: 3000 };
      expect(TimeValidator.validateTimeOverlap(set1, set2)).toBe(false);
    });

    it('должен возвращать true, если первый интервал полностью до второго', () => {
      const set1 = { startTime: 1000, endTime: 1500 };
      const set2 = { startTime: 2000, endTime: 3000 };
      expect(TimeValidator.validateTimeOverlap(set1, set2)).toBe(true);
    });

    it('должен возвращать true, если второй интервал полностью до первого', () => {
      const set1 = { startTime: 2000, endTime: 3000 };
      const set2 = { startTime: 1000, endTime: 1500 };
      expect(TimeValidator.validateTimeOverlap(set1, set2)).toBe(true);
    });

    it('должен возвращать true, если один из интервалов неполный', () => {
      const set1 = { startTime: 1000 };
      const set2 = { startTime: 2000, endTime: 3000 };
      expect(TimeValidator.validateTimeOverlap(set1, set2)).toBe(true);
    });

    it('должен возвращать false для некорректного интервала (endTime < startTime)', () => {
      const set1 = { startTime: 2000, endTime: 1000 }; // Некорректный интервал
      const set2 = { startTime: 3000, endTime: 4000 };
      expect(TimeValidator.validateTimeOverlap(set1, set2)).toBe(false);
    });
  });

  describe('validateTimeInterval', () => {
    it('должен возвращать true для корректного интервала', () => {
      const interval = { startTime: 1000, endTime: 2000 };
      expect(TimeValidator.validateTimeInterval(interval)).toBe(true);
    });

    it('должен возвращать false для некорректного интервала (endTime < startTime)', () => {
      const interval = { startTime: 2000, endTime: 1000 };
      expect(TimeValidator.validateTimeInterval(interval)).toBe(false);
    });

    it('должен возвращать true для интервала без времени начала', () => {
      const interval = { endTime: 2000 };
      expect(TimeValidator.validateTimeInterval(interval)).toBe(true);
    });

    it('должен возвращать true для интервала без времени окончания', () => {
      const interval = { startTime: 1000 };
      expect(TimeValidator.validateTimeInterval(interval)).toBe(true);
    });

    it('должен возвращать true для интервала с равными временами', () => {
      const interval = { startTime: 1000, endTime: 1000 };
      expect(TimeValidator.validateTimeInterval(interval)).toBe(true);
    });
  });

  describe('validateTimeOrder', () => {
    it('должен возвращать true для корректного порядка времени', () => {
      const previousSet = { startTime: 1000, endTime: 2000 };
      const currentSet = { startTime: 2000, endTime: 3000 };
      expect(TimeValidator.validateTimeOrder(currentSet, previousSet)).toBe(true);
    });

    it('должен возвращать false, если текущая партия начинается раньше окончания предыдущей', () => {
      const previousSet = { startTime: 1000, endTime: 2000 };
      const currentSet = { startTime: 1500, endTime: 3000 };
      expect(TimeValidator.validateTimeOrder(currentSet, previousSet)).toBe(false);
    });

    it('должен возвращать true, если у предыдущей партии нет времени окончания', () => {
      const previousSet = { startTime: 1000 };
      const currentSet = { startTime: 2000, endTime: 3000 };
      expect(TimeValidator.validateTimeOrder(currentSet, previousSet)).toBe(true);
    });

    it('должен возвращать true, если у текущей партии нет времени начала', () => {
      const previousSet = { startTime: 1000, endTime: 2000 };
      const currentSet = { endTime: 3000 };
      expect(TimeValidator.validateTimeOrder(currentSet, previousSet)).toBe(true);
    });
  });

  describe('validateTimeOrderReverse', () => {
    it('должен возвращать true для корректного порядка времени', () => {
      const currentSet = { startTime: 1000, endTime: 2000 };
      const nextSet = { startTime: 2000, endTime: 3000 };
      expect(TimeValidator.validateTimeOrderReverse(currentSet, nextSet)).toBe(true);
    });

    it('должен возвращать false, если текущая партия заканчивается позже начала следующей', () => {
      const currentSet = { startTime: 1000, endTime: 2500 };
      const nextSet = { startTime: 2000, endTime: 3000 };
      expect(TimeValidator.validateTimeOrderReverse(currentSet, nextSet)).toBe(false);
    });

    it('должен возвращать true, если у текущей партии нет времени окончания', () => {
      const currentSet = { startTime: 1000 };
      const nextSet = { startTime: 2000, endTime: 3000 };
      expect(TimeValidator.validateTimeOrderReverse(currentSet, nextSet)).toBe(true);
    });

    it('должен возвращать true, если у следующей партии нет времени начала', () => {
      const currentSet = { startTime: 1000, endTime: 2000 };
      const nextSet = { endTime: 3000 };
      expect(TimeValidator.validateTimeOrderReverse(currentSet, nextSet)).toBe(true);
    });
  });
});
