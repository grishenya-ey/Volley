/**
 * Тесты для MatchDomain
 */

import { MatchDomain } from '../../../src/shared/domain/MatchDomain';
import { SET_STATUS } from '../../../src/shared/types/Match';
import type { Match, Set } from '../../../src/shared/types/Match';

describe('MatchDomain', () => {
  describe('hasMatchStarted', () => {
    it('должен возвращать false для нового матча (партия не начата)', () => {
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
      expect(MatchDomain.hasMatchStarted(match)).toBe(false);
    });

    it('должен возвращать true, если текущая партия в игре', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [],
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 8,
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
      expect(MatchDomain.hasMatchStarted(match)).toBe(true);
    });

    it('должен возвращать true, если хотя бы одна партия завершена', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true, status: SET_STATUS.COMPLETED },
        ],
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
      expect(MatchDomain.hasMatchStarted(match)).toBe(true);
    });

    it('должен возвращать false для null и undefined', () => {
      expect(MatchDomain.hasMatchStarted(null)).toBe(false);
      expect(MatchDomain.hasMatchStarted(undefined)).toBe(false);
    });
  });

  describe('getMaxSetNumber', () => {
    it('должен возвращать максимальный номер партии', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true, status: SET_STATUS.COMPLETED },
          { setNumber: 3, scoreA: 25, scoreB: 23, completed: true, status: SET_STATUS.COMPLETED },
          { setNumber: 2, scoreA: 25, scoreB: 22, completed: true, status: SET_STATUS.COMPLETED },
        ],
        currentSet: {
          setNumber: 4,
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
      expect(MatchDomain.getMaxSetNumber(match)).toBe(3);
    });

    it('должен возвращать 0, если нет завершенных партий', () => {
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
      expect(MatchDomain.getMaxSetNumber(match)).toBe(0);
    });
  });

  describe('getCompletedSets', () => {
    it('должен возвращать только завершенные партии', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true, status: SET_STATUS.COMPLETED },
          { setNumber: 2, scoreA: 15, scoreB: 10, completed: false, status: SET_STATUS.IN_PROGRESS },
          { setNumber: 3, scoreA: 25, scoreB: 23, completed: true, status: SET_STATUS.COMPLETED },
        ],
        currentSet: {
          setNumber: 4,
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
      const result = MatchDomain.getCompletedSets(match);
      expect(result.length).toBe(2);
      expect(result[0].setNumber).toBe(1);
      expect(result[1].setNumber).toBe(3);
    });

    it('должен возвращать пустой массив, если нет завершенных партий', () => {
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
      const result = MatchDomain.getCompletedSets(match);
      expect(result.length).toBe(0);
    });
  });

  describe('getSetsWonByTeam', () => {
    it('должен правильно подсчитывать выигранные партии командой A', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20, completed: true, status: SET_STATUS.COMPLETED }, // A выиграла
          { setNumber: 2, scoreA: 20, scoreB: 25, completed: true, status: SET_STATUS.COMPLETED }, // B выиграла
          { setNumber: 3, scoreA: 25, scoreB: 23, completed: true, status: SET_STATUS.COMPLETED }, // A выиграла
        ],
        currentSet: {
          setNumber: 4,
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
      expect(MatchDomain.getSetsWonByTeam(match, 'A')).toBe(2);
      expect(MatchDomain.getSetsWonByTeam(match, 'B')).toBe(1);
    });

    it('должен возвращать 0, если команда не выиграла ни одной партии', () => {
      const match: Match = {
        matchId: 'test',
        teamA: { name: 'Team A', color: '#000' },
        teamB: { name: 'Team B', color: '#fff' },
        sets: [
          { setNumber: 1, scoreA: 20, scoreB: 25, completed: true, status: SET_STATUS.COMPLETED },
          { setNumber: 2, scoreA: 22, scoreB: 25, completed: true, status: SET_STATUS.COMPLETED },
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
      expect(MatchDomain.getSetsWonByTeam(match, 'A')).toBe(0);
      expect(MatchDomain.getSetsWonByTeam(match, 'B')).toBe(2);
    });
  });
});
