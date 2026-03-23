/**
 * Интеграционные тесты для мобильного API
 * Тестирование API контроллера и синхронизации
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchApiController } from '../../src/main/server/api/MatchApiController.ts';
import { SetService } from '../../src/shared/services/SetService';
import { ScoreService } from '../../src/shared/services/ScoreService';
import { HistoryService } from '../../src/shared/services/HistoryService';
import { SET_STATUS } from '../../src/shared/types/Match';
import {
  createTestMatch,
  createMatchWithStartedSet,
  createMatchWithInProgressSet,
} from '../fixtures/matchFactory';

describe('Mobile API Integration', () => {
  beforeEach(() => {
    // Очищаем историю перед каждым тестом
    HistoryService.clearHistory();
  });

  describe('Обработка изменения счета через API', () => {
    it('должен обрабатывать изменение счета команды A', () => {
      const match = createMatchWithStartedSet();
      const result = MatchApiController.handleChangeScore(match, 'A', 1);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.currentSet.scoreA).toBe(1);
      expect(result.data?.currentSet.scoreB).toBe(0);
    });

    it('должен обрабатывать изменение счета команды B', () => {
      const match = createMatchWithStartedSet();
      const result = MatchApiController.handleChangeScore(match, 'B', 1);

      expect(result.success).toBe(true);
      expect(result.data?.currentSet.scoreA).toBe(0);
      expect(result.data?.currentSet.scoreB).toBe(1);
    });

    it('должен обрабатывать уменьшение счета', () => {
      let match = createMatchWithInProgressSet(5, 3, 1);
      const result = MatchApiController.handleChangeScore(match, 'A', -1);

      expect(result.success).toBe(true);
      expect(result.data?.currentSet.scoreA).toBe(4);
      expect(result.data?.currentSet.scoreB).toBe(3);
    });

    it('должен возвращать ошибку при некорректной команде', () => {
      const match = createMatchWithStartedSet();
      const result = MatchApiController.handleChangeScore(match, 'C', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Некорректная команда');
    });

    it('должен возвращать ошибку при некорректном изменении счета', () => {
      const match = createMatchWithStartedSet();
      const result = MatchApiController.handleChangeScore(match, 'A', 2);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Некорректное изменение счета');
    });

    it('должен добавлять действие в историю при изменении счета', () => {
      const match = createMatchWithStartedSet();
      const historyBefore = HistoryService.getHistory().length;

      MatchApiController.handleChangeScore(match, 'A', 1);

      const historyAfter = HistoryService.getHistory().length;
      expect(historyAfter).toBe(historyBefore + 1);
    });
  });

  describe('Обработка начала партии через API', () => {
    it('должен обрабатывать начало партии', () => {
      const match = createTestMatch();
      const result = MatchApiController.handleStartSet(match);

      expect(result.success).toBe(true);
      expect(result.data?.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(result.data?.currentSet.scoreA).toBe(0);
      expect(result.data?.currentSet.scoreB).toBe(0);
      expect(result.data?.currentSet.startTime).toBeDefined();
    });

    it('должен возвращать ошибку при попытке начать уже начатую партию', () => {
      const match = createMatchWithStartedSet();
      const result = MatchApiController.handleStartSet(match);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('должен добавлять действие в историю при начале партии', () => {
      const match = createTestMatch();
      const historyBefore = HistoryService.getHistory().length;

      MatchApiController.handleStartSet(match);

      const historyAfter = HistoryService.getHistory().length;
      expect(historyAfter).toBe(historyBefore + 1);
    });
  });

  describe('Обработка завершения партии через API', () => {
    it('должен обрабатывать завершение партии с достаточным счетом', () => {
      let match = createMatchWithInProgressSet(25, 23, 1);
      const result = MatchApiController.handleFinishSet(match);

      expect(result.success).toBe(true);
      expect(result.data?.sets.length).toBe(1);
      expect(result.data?.sets[0].scoreA).toBe(25);
      expect(result.data?.sets[0].scoreB).toBe(23);
      expect(result.data?.sets[0].completed).toBe(true);
      expect(result.data?.currentSet.status).toBe(SET_STATUS.PENDING);
      // Проверяем, что счет сохранился (не обнулился)
      expect(result.data?.currentSet.scoreA).toBe(25);
      expect(result.data?.currentSet.scoreB).toBe(23);
    });

    it('должен возвращать ошибку при попытке завершить партию с недостаточным счетом', () => {
      const match = createMatchWithInProgressSet(20, 18, 1);
      const result = MatchApiController.handleFinishSet(match);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Партия не может быть завершена');
    });

    it('должен возвращать ошибку при попытке завершить не начатую партию', () => {
      const match = createTestMatch();
      const result = MatchApiController.handleFinishSet(match);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('должен добавлять действие в историю при завершении партии', () => {
      let match = createMatchWithInProgressSet(25, 23, 1);
      const historyBefore = HistoryService.getHistory().length;

      MatchApiController.handleFinishSet(match);

      const historyAfter = HistoryService.getHistory().length;
      expect(historyAfter).toBe(historyBefore + 1);
    });
  });

  describe('Обработка изменения подачи через API', () => {
    it('должен обрабатывать изменение подачи на команду A', () => {
      let match = createMatchWithInProgressSet(15, 12, 1);
      match = ScoreService.changeServingTeam(match, 'B'); // Устанавливаем подачу команде B
      
      const result = MatchApiController.handleChangeServingTeam(match, 'A');

      expect(result.success).toBe(true);
      expect(result.data?.currentSet.servingTeam).toBe('A');
    });

    it('должен обрабатывать изменение подачи на команду B', () => {
      let match = createMatchWithInProgressSet(15, 12, 1);
      match = ScoreService.changeServingTeam(match, 'A'); // Устанавливаем подачу команде A
      
      const result = MatchApiController.handleChangeServingTeam(match, 'B');

      expect(result.success).toBe(true);
      expect(result.data?.currentSet.servingTeam).toBe('B');
    });

    it('должен возвращать ошибку при некорректной команде', () => {
      const match = createMatchWithStartedSet();
      const result = MatchApiController.handleChangeServingTeam(match, 'C');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Некорректная команда');
    });

    it('не должен добавлять в историю, если подача не изменилась', () => {
      let match = createMatchWithInProgressSet(15, 12, 1);
      const servingTeam = match.currentSet.servingTeam;
      const historyBefore = HistoryService.getHistory().length;

      const result = MatchApiController.handleChangeServingTeam(match, servingTeam);

      expect(result.success).toBe(true);
      const historyAfter = HistoryService.getHistory().length;
      expect(historyAfter).toBe(historyBefore); // История не должна измениться
    });
  });

  describe('Обработка отмены действия через API', () => {
    it('должен обрабатывать отмену последнего действия', () => {
      let match = createMatchWithStartedSet();
      const initialState = { ...match };

      // Выполняем действие
      match = ScoreService.changeScore(match, 'A', 1);
      HistoryService.addAction({
        type: 'score_change',
        timestamp: Date.now(),
        data: { team: 'A', delta: 1 },
        previousState: initialState,
      });

      const result = MatchApiController.handleUndo(match);

      expect(result.success).toBe(true);
      expect(result.data?.currentSet.scoreA).toBe(0);
    });

    it('должен возвращать ошибку, если нет действий для отмены', () => {
      const match = createMatchWithStartedSet();
      const result = MatchApiController.handleUndo(match);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Нет действий для отмены');
    });

    it('должен сохранять логотипы при отмене действия', () => {
      let match = createMatchWithStartedSet();
      match.teamA.logo = 'data:image/png;base64,test-logo-a';
      match.teamB.logo = 'data:image/png;base64,test-logo-b';
      match.teamA.logoPath = 'logos/logo_a_123.png';
      match.teamB.logoPath = 'logos/logo_b_123.png';

      const initialState = { ...match };

      // Выполняем действие
      match = ScoreService.changeScore(match, 'A', 1);
      HistoryService.addAction({
        type: 'score_change',
        timestamp: Date.now(),
        data: { team: 'A', delta: 1 },
        previousState: initialState,
      });

      const result = MatchApiController.handleUndo(match);

      expect(result.success).toBe(true);
      expect(result.data?.teamA.logo).toBe('data:image/png;base64,test-logo-a');
      expect(result.data?.teamB.logo).toBe('data:image/png;base64,test-logo-b');
      expect(result.data?.teamA.logoPath).toBe('logos/logo_a_123.png');
      expect(result.data?.teamB.logoPath).toBe('logos/logo_b_123.png');
    });
  });

  describe('Обработка получения матча через API', () => {
    it('должен возвращать текущий матч', () => {
      const match = createMatchWithInProgressSet(15, 12, 1);
      const result = MatchApiController.handleGetMatch(match);

      expect(result.success).toBe(true);
      expect(result.data).toBe(match);
    });

    it('должен возвращать ошибку, если матч не найден', () => {
      const result = MatchApiController.handleGetMatch(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Матч не найден');
    });
  });

  describe('Синхронизация между основным приложением и мобильным', () => {
    it('должен синхронизировать изменения счета', () => {
      let mainMatch = createMatchWithStartedSet();
      let mobileMatch = { ...mainMatch };

      // Изменение в мобильном интерфейсе
      const mobileResult = MatchApiController.handleChangeScore(
        mobileMatch,
        'A',
        1
      );
      mobileMatch = mobileResult.data!;

      // Синхронизация с основным приложением
      mainMatch = mobileMatch;

      // Проверка синхронизации
      expect(mainMatch.currentSet.scoreA).toBe(1);
      expect(mainMatch.currentSet.scoreB).toBe(0);
      expect(mainMatch.updatedAt).toBe(mobileMatch.updatedAt);
    });

    it('должен синхронизировать начало партии', () => {
      let mainMatch = createTestMatch();
      let mobileMatch = { ...mainMatch };

      // Начало партии в мобильном интерфейсе
      const mobileResult = MatchApiController.handleStartSet(mobileMatch);
      mobileMatch = mobileResult.data!;

      // Синхронизация с основным приложением
      mainMatch = mobileMatch;

      // Проверка синхронизации
      expect(mainMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(mainMatch.currentSet.startTime).toBeDefined();
      expect(mainMatch.updatedAt).toBe(mobileMatch.updatedAt);
    });

    it('должен синхронизировать завершение партии', () => {
      let mainMatch = createMatchWithInProgressSet(25, 23, 1);
      let mobileMatch = { ...mainMatch };

      // Завершение партии в мобильном интерфейсе
      const mobileResult = MatchApiController.handleFinishSet(mobileMatch);
      mobileMatch = mobileResult.data!;

      // Синхронизация с основным приложением
      mainMatch = mobileMatch;

      // Проверка синхронизации
      expect(mainMatch.sets.length).toBe(1);
      expect(mainMatch.currentSet.status).toBe(SET_STATUS.PENDING);
      expect(mainMatch.currentSet.scoreA).toBe(25); // Счет сохраняется
      expect(mainMatch.updatedAt).toBe(mobileMatch.updatedAt);
    });

    it('должен синхронизировать изменение подачи', () => {
      let mainMatch = createMatchWithInProgressSet(15, 12, 1);
      let mobileMatch = { ...mainMatch };
      const initialServingTeam = mobileMatch.currentSet.servingTeam;
      const newServingTeam = initialServingTeam === 'A' ? 'B' : 'A';

      // Изменение подачи в мобильном интерфейсе
      const mobileResult = MatchApiController.handleChangeServingTeam(
        mobileMatch,
        newServingTeam
      );
      mobileMatch = mobileResult.data!;

      // Синхронизация с основным приложением
      mainMatch = mobileMatch;

      // Проверка синхронизации
      expect(mainMatch.currentSet.servingTeam).toBe(newServingTeam);
      expect(mainMatch.updatedAt).toBe(mobileMatch.updatedAt);
    });

    it('должен синхронизировать отмену действия', () => {
      let mainMatch = createMatchWithStartedSet();
      let mobileMatch = { ...mainMatch };
      const initialState = { ...mobileMatch };

      // Выполняем действие в мобильном интерфейсе
      mobileMatch = ScoreService.changeScore(mobileMatch, 'A', 1);
      HistoryService.addAction({
        type: 'score_change',
        timestamp: Date.now(),
        data: { team: 'A', delta: 1 },
        previousState: initialState,
      });

      // Отменяем действие в мобильном интерфейсе
      const mobileResult = MatchApiController.handleUndo(mobileMatch);
      mobileMatch = mobileResult.data!;

      // Синхронизация с основным приложением
      mainMatch = mobileMatch;

      // Проверка синхронизации
      expect(mainMatch.currentSet.scoreA).toBe(0);
      expect(mainMatch.updatedAt).toBe(mobileMatch.updatedAt);
    });
  });

  describe('Обработка ошибок в API', () => {
    it('должен корректно обрабатывать ошибки Service Layer', () => {
      const match = createTestMatch();
      
      // Попытка завершить не начатую партию должна вернуть ошибку
      const result = MatchApiController.handleFinishSet(match);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('должен корректно обрабатывать неизвестные ошибки', () => {
      // Создаем ситуацию, которая может вызвать ошибку
      const match = createMatchWithStartedSet();
      
      // Передаем некорректные данные
      const result = MatchApiController.handleChangeScore(match, 'A', 999);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
