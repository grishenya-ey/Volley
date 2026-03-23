/**
 * Тесты для SetDomain
 */

import { SetDomain } from '../../../src/shared/domain/SetDomain';
import { SET_STATUS } from '../../../src/shared/types/Match';
import type { Set, CurrentSet, Match } from '../../../src/shared/types/Match';

describe('SetDomain', () => {
  describe('isCurrentSet', () => {
    it('должен возвращать true для текущей партии в игре', () => {
      const currentSet: CurrentSet = {
        setNumber: 1,
        scoreA: 5,
        scoreB: 3,
        servingTeam: 'A',
        status: SET_STATUS.IN_PROGRESS,
      };
      expect(SetDomain.isCurrentSet(1, currentSet)).toBe(true);
    });

    it('должен возвращать false для партии со статусом PENDING', () => {
      const currentSet: CurrentSet = {
        setNumber: 1,
        scoreA: 0,
        scoreB: 0,
        servingTeam: 'A',
        status: SET_STATUS.PENDING,
      };
      expect(SetDomain.isCurrentSet(1, currentSet)).toBe(false);
    });

    it('должен возвращать false для партии с другим номером', () => {
      const currentSet: CurrentSet = {
        setNumber: 2,
        scoreA: 5,
        scoreB: 3,
        servingTeam: 'A',
        status: SET_STATUS.IN_PROGRESS,
      };
      expect(SetDomain.isCurrentSet(1, currentSet)).toBe(false);
    });

    it('должен возвращать false для завершенной партии', () => {
      const currentSet: CurrentSet = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        servingTeam: 'A',
        status: SET_STATUS.COMPLETED,
      };
      expect(SetDomain.isCurrentSet(1, currentSet)).toBe(false);
    });
  });

  describe('isCompleted', () => {
    it('должен возвращать true для партии с completed === true', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
      };
      expect(SetDomain.isCompleted(set)).toBe(true);
    });

    it('должен возвращать true для партии со статусом COMPLETED', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: false,
        status: SET_STATUS.COMPLETED,
      };
      expect(SetDomain.isCompleted(set)).toBe(true);
    });

    it('должен возвращать false для партии в игре', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 15,
        scoreB: 10,
        completed: false,
        status: SET_STATUS.IN_PROGRESS,
      };
      expect(SetDomain.isCompleted(set)).toBe(false);
    });

    it('должен возвращать false для не начатой партии', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 0,
        scoreB: 0,
        completed: false,
        status: SET_STATUS.PENDING,
      };
      expect(SetDomain.isCompleted(set)).toBe(false);
    });
  });

  describe('calculateNextSetNumber', () => {
    it('должен возвращать maxSetNumber + 1, если есть завершенные партии', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true, status: SET_STATUS.COMPLETED },
          { setNumber: 2, scoreA: 25, scoreB: 23, completed: true, status: SET_STATUS.COMPLETED },
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
      expect(SetDomain.calculateNextSetNumber(match)).toBe(3);
    });

    it('должен возвращать currentSet.setNumber, если нет завершенных партий и currentSet PENDING', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [],
        currentSet: {
          setNumber: 1,
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
      expect(SetDomain.calculateNextSetNumber(match)).toBe(1);
    });

    it('должен возвращать 1, если нет завершенных партий и currentSet не PENDING', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [],
        currentSet: {
          setNumber: 1,
          scoreA: 5,
          scoreB: 3,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
        statistics: {
          enabled: false,
          teamA: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
          teamB: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(SetDomain.calculateNextSetNumber(match)).toBe(1);
    });
  });

  describe('processTimeForStatus', () => {
    it('должен удалять время при переходе в PENDING', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: 1000,
        endTime: 2000,
        duration: 1,
      };
      const result = SetDomain.processTimeForStatus(set, SET_STATUS.PENDING);
      expect(result.startTime).toBeUndefined();
      expect(result.endTime).toBeUndefined();
      expect(result.duration).toBeUndefined();
      expect(result.completed).toBe(false);
    });

    it('должен удалять endTime при переходе в IN_PROGRESS', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 15,
        scoreB: 10,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: 1000,
        endTime: 2000,
        duration: 1,
      };
      const result = SetDomain.processTimeForStatus(set, SET_STATUS.IN_PROGRESS);
      expect(result.startTime).toBe(1000);
      expect(result.endTime).toBeUndefined();
      expect(result.duration).toBeUndefined();
      expect(result.completed).toBe(false);
    });

    it('должен устанавливать completed = true при статусе COMPLETED', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 15,
        scoreB: 10,
        completed: false,
        status: SET_STATUS.IN_PROGRESS,
        startTime: 1000,
      };
      const result = SetDomain.processTimeForStatus(set, SET_STATUS.COMPLETED);
      expect(result.completed).toBe(true);
    });
  });

  describe('protectCurrentSet', () => {
    it('должен создавать копию для currentSet в статусе IN_PROGRESS', () => {
      const currentSet: CurrentSet = {
        setNumber: 2,
        scoreA: 5,
        scoreB: 3,
        servingTeam: 'A',
        status: SET_STATUS.IN_PROGRESS,
        startTime: 1000,
      };
      const result = SetDomain.protectCurrentSet(currentSet);
      expect(result).toEqual(currentSet);
      expect(result).not.toBe(currentSet); // Должна быть копия
    });

    it('должен исправлять статус на PENDING и сохранять счет', () => {
      const currentSet: CurrentSet = {
        setNumber: 2,
        scoreA: 5,
        scoreB: 3,
        servingTeam: 'A',
        status: SET_STATUS.COMPLETED, // Неправильный статус
      };
      const result = SetDomain.protectCurrentSet(currentSet);
      expect(result.status).toBe(SET_STATUS.PENDING);
      expect(result.scoreA).toBe(5);
      expect(result.scoreB).toBe(3);
    });

    it('должен сохранять счет для currentSet в статусе PENDING', () => {
      const currentSet: CurrentSet = {
        setNumber: 2,
        scoreA: 0,
        scoreB: 0,
        servingTeam: 'A',
        status: SET_STATUS.PENDING,
      };
      const result = SetDomain.protectCurrentSet(currentSet);
      expect(result.status).toBe(SET_STATUS.PENDING);
      expect(result.scoreA).toBe(0);
      expect(result.scoreB).toBe(0);
    });
  });

  describe('findSet', () => {
    it('должен находить партию в currentSet', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [],
        currentSet: {
          setNumber: 1,
          scoreA: 5,
          scoreB: 3,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
        statistics: {
          enabled: false,
          teamA: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
          teamB: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = SetDomain.findSet(match, 1);
      expect(result).toBe(match.currentSet);
    });

    it('должен находить партию в sets', () => {
      const set: Set = {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
      };
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [set],
        currentSet: {
          setNumber: 2,
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
      const result = SetDomain.findSet(match, 1);
      expect(result).toBe(set);
    });

    it('должен возвращать null, если партия не найдена', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [],
        currentSet: {
          setNumber: 1,
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
      const result = SetDomain.findSet(match, 5);
      expect(result).toBeNull();
    });
  });
});
