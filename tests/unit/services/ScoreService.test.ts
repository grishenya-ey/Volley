/**
 * Тесты для ScoreService
 */

import { ScoreService } from '../../../src/shared/services/ScoreService';
import { SET_STATUS } from '../../../src/shared/types/Match';
import type { Match } from '../../../src/shared/types/Match';

describe('ScoreService', () => {
  const createTestMatch = (): Match => ({
    matchId: 'test',
    teamA: { name: 'Team A', color: '#000' },
    teamB: { name: 'Team B', color: '#fff' },
    sets: [],
    currentSet: {
      setNumber: 1,
      scoreA: 10,
      scoreB: 5,
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
  });

  describe('changeScore', () => {
    it('должен увеличивать счет команды A', () => {
      const match = createTestMatch();
      const newMatch = ScoreService.changeScore(match, 'A', 1);

      expect(newMatch.currentSet.scoreA).toBe(11);
      expect(newMatch.currentSet.scoreB).toBe(5);
      expect(newMatch.currentSet.servingTeam).toBe('A');
    });

    it('должен увеличивать счет команды B', () => {
      const match = createTestMatch();
      const newMatch = ScoreService.changeScore(match, 'B', 1);

      expect(newMatch.currentSet.scoreA).toBe(10);
      expect(newMatch.currentSet.scoreB).toBe(6);
      expect(newMatch.currentSet.servingTeam).toBe('B');
    });

    it('должен уменьшать счет команды A', () => {
      const match = createTestMatch();
      const newMatch = ScoreService.changeScore(match, 'A', -1);

      expect(newMatch.currentSet.scoreA).toBe(9);
      expect(newMatch.currentSet.scoreB).toBe(5);
      expect(newMatch.currentSet.servingTeam).toBe('A'); // Подача не меняется при уменьшении
    });

    it('должен уменьшать счет команды B', () => {
      const match = createTestMatch();
      const newMatch = ScoreService.changeScore(match, 'B', -1);

      expect(newMatch.currentSet.scoreA).toBe(10);
      expect(newMatch.currentSet.scoreB).toBe(4);
      expect(newMatch.currentSet.servingTeam).toBe('A'); // Подача не меняется при уменьшении
    });

    it('не должен позволять отрицательный счет', () => {
      const match = createTestMatch();
      match.currentSet.scoreA = 0;

      const newMatch = ScoreService.changeScore(match, 'A', -1);

      expect(newMatch.currentSet.scoreA).toBe(0);
    });

    it('должен выбрасывать ошибку, если партия не начата', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.PENDING;

      expect(() => ScoreService.changeScore(match, 'A', 1)).toThrow('Партия не начата');
    });

    it('должен выбрасывать ошибку для некорректной команды', () => {
      const match = createTestMatch();

      expect(() => ScoreService.changeScore(match, 'C' as any, 1)).toThrow('Некорректная команда');
    });

    it('должен создавать новый объект матча (immutability)', () => {
      const match = createTestMatch();
      const newMatch = ScoreService.changeScore(match, 'A', 1);

      expect(newMatch).not.toBe(match);
      expect(newMatch.currentSet).not.toBe(match.currentSet);
    });
  });

  describe('changeServingTeam', () => {
    it('должен изменять команду подачи', () => {
      const match = createTestMatch();
      match.currentSet.servingTeam = 'A';

      const newMatch = ScoreService.changeServingTeam(match, 'B');

      expect(newMatch.currentSet.servingTeam).toBe('B');
    });

    it('не должен изменять, если подача уже у указанной команды', () => {
      const match = createTestMatch();
      match.currentSet.servingTeam = 'A';

      const newMatch = ScoreService.changeServingTeam(match, 'A');

      expect(newMatch).toBe(match); // Должен вернуть тот же объект
    });

    it('должен выбрасывать ошибку, если партия не начата', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.PENDING;

      expect(() => ScoreService.changeServingTeam(match, 'B')).toThrow('Партия не начата');
    });

    it('должен выбрасывать ошибку для некорректной команды', () => {
      const match = createTestMatch();

      expect(() => ScoreService.changeServingTeam(match, 'C' as any)).toThrow('Некорректная команда');
    });

    it('должен создавать новый объект матча (immutability)', () => {
      const match = createTestMatch();
      const newMatch = ScoreService.changeServingTeam(match, 'B');

      expect(newMatch).not.toBe(match);
      expect(newMatch.currentSet).not.toBe(match.currentSet);
    });
  });
});
