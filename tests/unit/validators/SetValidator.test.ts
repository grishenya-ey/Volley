/**
 * Тесты для SetValidator
 */

import { SetValidator } from '../../../src/shared/validators/SetValidator';
import { SET_STATUS } from '../../../src/shared/types/Match';
import type { Set, CurrentSet, Match } from '../../../src/shared/types/Match';

describe('SetValidator', () => {
  describe('validateSetUpdate', () => {
    it('должен возвращать valid: true для корректных данных', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: 1000,
        endTime: 2000,
      };
      const updates = { scoreA: 26 };
      const result = SetValidator.validateSetUpdate(set, updates);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('должен возвращать ошибку для отрицательного счета', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
      };
      const updates = { scoreA: -1 };
      const result = SetValidator.validateSetUpdate(set, updates);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Счет не может быть отрицательным');
    });

    it('должен возвращать ошибку для некорректного статуса', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
      };
      const updates = { status: 'invalid_status' as any };
      const result = SetValidator.validateSetUpdate(set, updates);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Некорректный статус партии');
    });

    it('должен возвращать ошибку, если время окончания раньше времени начала', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: 2000,
        endTime: 3000,
      };
      const updates = { endTime: 1000 };
      const result = SetValidator.validateSetUpdate(set, updates);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Время завершения не может быть раньше времени начала');
    });

    it('должен возвращать ошибку для завершенной партии без времени', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
      };
      const updates = { status: SET_STATUS.COMPLETED };
      const result = SetValidator.validateSetUpdate(set, updates);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Завершенная партия должна иметь время начала и завершения');
    });

    it('должен возвращать ошибку для некорректного счета завершенной партии', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: 1000,
        endTime: 2000,
      };
      const updates = { scoreA: 20, scoreB: 20 }; // Равный счет не может завершить партию
      const result = SetValidator.validateSetUpdate(set, updates);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Счет не соответствует правилам завершения партии'))).toBe(true);
    });

    it('должен возвращать ошибку при переводе завершенной партии в игру без удаления времени окончания', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: 1000,
        endTime: 2000,
      };
      const updates = { status: SET_STATUS.IN_PROGRESS };
      const result = SetValidator.validateSetUpdate(set, updates);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Нельзя перевести завершенную партию в статус "В игре" без удаления времени завершения'
      );
    });

    it('должен проверять пересечение времени с предыдущей партией', () => {
      const set: Set = {
        setNumber: 2,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: 1000,
        endTime: 2000,
      };
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            completed: true,
            status: SET_STATUS.COMPLETED,
            startTime: 500,
            endTime: 1500, // Пересекается с началом второй партии
          },
        ],
        currentSet: {
          setNumber: 3,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
        statistics: {
          enabled: false,
          teamA: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
          teamB: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updates = { startTime: 1000 };
      const result = SetValidator.validateSetUpdate(set, updates, 3, match);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('пересекается'))).toBe(true);
    });

    it('должен проверять пересечение времени со следующей партией', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: 1000,
        endTime: 2000,
      };
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [
          {
            setNumber: 2,
            scoreA: 25,
            scoreB: 20,
            completed: true,
            status: SET_STATUS.COMPLETED,
            startTime: 1500, // Пересекается с окончанием первой партии
            endTime: 2500,
          },
        ],
        currentSet: {
          setNumber: 3,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
        statistics: {
          enabled: false,
          teamA: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
          teamB: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updates = { endTime: 2000 };
      const result = SetValidator.validateSetUpdate(set, updates, 3, match);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('пересекается'))).toBe(true);
    });
  });

  describe('validateScore', () => {
    it('должен возвращать valid: true для корректного счета', () => {
      const result = SetValidator.validateScore(25, 20);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('должен возвращать ошибку для отрицательного счета команды A', () => {
      const result = SetValidator.validateScore(-1, 20);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Счет команды A не может быть отрицательным');
    });

    it('должен возвращать ошибку для отрицательного счета команды B', () => {
      const result = SetValidator.validateScore(25, -1);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Счет команды B не может быть отрицательным');
    });
  });

  describe('validateStatus', () => {
    it('должен возвращать valid: true для корректного статуса', () => {
      const result = SetValidator.validateStatus(SET_STATUS.PENDING);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('должен возвращать ошибку для некорректного статуса', () => {
      const result = SetValidator.validateStatus('invalid_status');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Некорректный статус партии');
    });
  });
});
