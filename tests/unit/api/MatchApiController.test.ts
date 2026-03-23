/**
 * Тесты для MatchApiController
 */

import { MatchApiController } from '../../../src/main/server/api/MatchApiController.ts';
import { SET_STATUS } from '../../../src/shared/types/Match';
import type { Match } from '../../../src/shared/types/Match';
import { HistoryService } from '../../../src/shared/services/HistoryService';

describe('MatchApiController', () => {
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

  beforeEach(() => {
    HistoryService.clearHistory();
  });

  describe('handleChangeScore', () => {
    it('должен успешно изменять счет команды A', () => {
      const match = createTestMatch();
      const result = MatchApiController.handleChangeScore(match, 'A', 1);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.currentSet.scoreA).toBe(11);
      expect(result.data!.currentSet.scoreB).toBe(5);
      expect(result.data!.currentSet.servingTeam).toBe('A');
    });

    it('должен успешно изменять счет команды B', () => {
      const match = createTestMatch();
      const result = MatchApiController.handleChangeScore(match, 'B', 1);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.currentSet.scoreB).toBe(6);
      expect(result.data!.currentSet.servingTeam).toBe('B');
    });

    it('должен возвращать ошибку для некорректной команды', () => {
      const match = createTestMatch();
      const result = MatchApiController.handleChangeScore(match, 'C' as any, 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Некорректная команда');
    });

    it('должен возвращать ошибку для некорректного delta', () => {
      const match = createTestMatch();
      const result = MatchApiController.handleChangeScore(match, 'A', 2);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Некорректное изменение счета');
    });

    it('должен добавлять действие в историю', () => {
      const match = createTestMatch();
      MatchApiController.handleChangeScore(match, 'A', 1);

      const lastAction = HistoryService.getLastAction();
      expect(lastAction).toBeDefined();
      expect(lastAction?.type).toBe('score_change');
      expect(lastAction?.data.team).toBe('A');
      expect(lastAction?.data.delta).toBe(1);
    });
  });

  describe('handleStartSet', () => {
    it('должен успешно начинать партию', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.PENDING;

      const result = MatchApiController.handleStartSet(match);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(result.data!.currentSet.startTime).toBeDefined();
    });

    it('должен возвращать ошибку, если партия уже начата', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.IN_PROGRESS;

      const result = MatchApiController.handleStartSet(match);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Партия уже начата');
    });

    it('должен добавлять действие в историю', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.PENDING;

      MatchApiController.handleStartSet(match);

      const lastAction = HistoryService.getLastAction();
      expect(lastAction).toBeDefined();
      expect(lastAction?.type).toBe('start_set');
    });
  });

  describe('handleFinishSet', () => {
    it('должен успешно завершать партию', () => {
      const match = createTestMatch();
      match.currentSet.scoreA = 25;
      match.currentSet.scoreB = 20;
      match.currentSet.startTime = Date.now() - 60000;

      const result = MatchApiController.handleFinishSet(match);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.sets.length).toBe(1);
      expect(result.data!.sets[0].status).toBe(SET_STATUS.COMPLETED);
      expect(result.data!.currentSet.status).toBe(SET_STATUS.PENDING);
    });

    it('должен возвращать ошибку, если партия не начата', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.PENDING;

      const result = MatchApiController.handleFinishSet(match);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Партия не начата');
    });

    it('должен возвращать ошибку, если счет не соответствует правилам', () => {
      const match = createTestMatch();
      match.currentSet.scoreA = 20;
      match.currentSet.scoreB = 20;

      const result = MatchApiController.handleFinishSet(match);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Партия не может быть завершена');
    });

    it('должен добавлять действие в историю', () => {
      const match = createTestMatch();
      match.currentSet.scoreA = 25;
      match.currentSet.scoreB = 20;
      match.currentSet.startTime = Date.now() - 60000;

      MatchApiController.handleFinishSet(match);

      const lastAction = HistoryService.getLastAction();
      expect(lastAction).toBeDefined();
      expect(lastAction?.type).toBe('finish_set');
    });
  });

  describe('handleChangeServingTeam', () => {
    it('должен успешно изменять команду подачи', () => {
      const match = createTestMatch();
      match.currentSet.servingTeam = 'A';

      const result = MatchApiController.handleChangeServingTeam(match, 'B');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.currentSet.servingTeam).toBe('B');
    });

    it('должен возвращать ошибку для некорректной команды', () => {
      const match = createTestMatch();
      const result = MatchApiController.handleChangeServingTeam(match, 'C' as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Некорректная команда');
    });

    it('не должен добавлять в историю, если подача не изменилась', () => {
      const match = createTestMatch();
      match.currentSet.servingTeam = 'A';

      const historySizeBefore = HistoryService.getHistorySize();
      MatchApiController.handleChangeServingTeam(match, 'A');
      const historySizeAfter = HistoryService.getHistorySize();

      expect(historySizeAfter).toBe(historySizeBefore);
    });
  });

  describe('handleUndo', () => {
    it('должен успешно отменять последнее действие', () => {
      const match = createTestMatch();
      const previousMatch = { ...match, currentSet: { ...match.currentSet, scoreA: 9 } };

      HistoryService.addAction({
        type: 'score_change',
        timestamp: Date.now(),
        data: {},
        previousState: previousMatch,
      });

      const result = MatchApiController.handleUndo(match);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.currentSet.scoreA).toBe(9);
    });

    it('должен возвращать ошибку, если нет действий для отмены', () => {
      const match = createTestMatch();

      const result = MatchApiController.handleUndo(match);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Нет действий для отмены');
    });

    it('должен сохранять логотипы при отмене', () => {
      const match = createTestMatch();
      // Устанавливаем логотипы в текущем match
      match.teamA.logo = 'logoA';
      (match.teamA as any).logoBase64 = 'logoA';
      match.teamB.logo = 'logoB';
      (match.teamB as any).logoBase64 = 'logoB';

      // Создаем предыдущее состояние с другими логотипами
      const previousMatch = {
        ...match,
        currentSet: { ...match.currentSet, scoreA: 9 },
        teamA: { ...match.teamA, logo: 'oldLogoA' },
        teamB: { ...match.teamB, logo: 'oldLogoB' },
      };
      (previousMatch.teamA as any).logoBase64 = 'oldLogoA';
      (previousMatch.teamB as any).logoBase64 = 'oldLogoB';

      HistoryService.addAction({
        type: 'score_change',
        timestamp: Date.now(),
        data: {},
        previousState: previousMatch,
      });

      const result = MatchApiController.handleUndo(match);

      expect(result.success).toBe(true);
      // Логотипы должны быть сохранены из текущего match (logoA, logoB), а не из previousMatch
      expect(result.data!.teamA.logo).toBe('logoA');
      expect((result.data!.teamA as any).logoBase64).toBe('logoA');
      expect(result.data!.teamB.logo).toBe('logoB');
      expect((result.data!.teamB as any).logoBase64).toBe('logoB');
    });
  });

  describe('handleGetMatch', () => {
    it('должен успешно возвращать матч', () => {
      const match = createTestMatch();
      const result = MatchApiController.handleGetMatch(match);

      expect(result.success).toBe(true);
      expect(result.data).toBe(match);
    });

    it('должен возвращать ошибку, если матч не найден', () => {
      const result = MatchApiController.handleGetMatch(null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Матч не найден');
    });
  });
});
