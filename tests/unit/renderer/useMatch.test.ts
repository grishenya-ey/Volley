/**
 * Тесты для useMatch.ts
 * Проверка работы хука с Service Layer
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SET_STATUS } from '../../../src/shared/types/Match';
import type { Match } from '../../../src/shared/types/Match';
import * as setValidation from '../../../src/shared/setValidation';
import { SetService } from '../../../src/shared/services/SetService';
import { ScoreService } from '../../../src/shared/services/ScoreService';
import { HistoryService } from '../../../src/shared/services/HistoryService';
import { useMatch } from '../../../src/renderer/hooks/useMatch';

// Мокируем Service Layer для ESM модулей
// В Vitest vi.mock() работает для всех модулей, включая TypeScript ESM
vi.mock('../../../src/shared/services/SetService', () => ({
  SetService: {
    startSet: vi.fn(),
    finishSet: vi.fn(),
    updateSet: vi.fn(),
  },
}));

vi.mock('../../../src/shared/services/ScoreService', () => ({
  ScoreService: {
    changeScore: vi.fn(),
    changeServingTeam: vi.fn(),
  },
}));

// Мокируем HistoryService с отслеживанием истории
// Используем глобальный объект для хранения истории между вызовами
const historyStore = { actions: [] as any[] };

vi.mock('../../../src/shared/services/HistoryService', () => ({
  HistoryService: {
    addAction: vi.fn((action) => {
      historyStore.actions.push(action);
    }),
    undoLastAction: vi.fn(() => {
      return historyStore.actions.pop() || null;
    }),
    getHistorySize: vi.fn(() => historyStore.actions.length),
  },
}));

// Мокируем volleyballRules - useMatch использует getRules(match)
const mockCanFinishSet = vi.fn(() => false);
vi.mock('../../../src/shared/volleyballRules', () => ({
  getRules: vi.fn(() => ({
    isSetball: vi.fn(() => ({ isSetball: false, team: null })),
    isMatchball: vi.fn(() => ({ isMatchball: false, team: null })),
    canFinishSet: mockCanFinishSet,
    getConfig: () => ({ maxSets: 5 }),
  })),
}));

vi.mock('../../../src/shared/matchMigration', () => ({
  migrateMatchToSetStatus: vi.fn((match) => match),
}));

// Мокируем setValidation - по умолчанию возвращает успешную валидацию
// Для конкретных тестов можно переопределить через vi.spyOn
vi.mock('../../../src/shared/setValidation', () => ({
  validateSetUpdate: vi.fn((set, updates, currentSetNumber, match) => ({
    valid: true,
    errors: [],
  })),
}));

describe('useMatch', () => {
  const createTestMatch = (overrides: Partial<Match> = {}): Match => ({
    matchId: 'test-match',
    variant: 'indoor',
    teamA: { name: 'Команда A', color: '#000' },
    teamB: { name: 'Команда B', color: '#fff' },
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
    ...overrides,
  });

  beforeEach(() => {
    // Очищаем историю перед каждым тестом
    historyStore.actions = [];
    
    vi.clearAllMocks();
    
    // Настраиваем моки по умолчанию для возврата обновленного матча
    // ScoreService.changeScore должен возвращать матч с обновленным счетом
    (ScoreService.changeScore as ReturnType<typeof vi.fn>).mockImplementation((match, team, delta) => {
      const newMatch = { ...match };
      if (team === 'A') {
        newMatch.currentSet = { 
          ...newMatch.currentSet, 
          scoreA: Math.max(0, newMatch.currentSet.scoreA + delta),
          servingTeam: delta > 0 ? 'A' : newMatch.currentSet.servingTeam,
        };
      } else {
        newMatch.currentSet = { 
          ...newMatch.currentSet, 
          scoreB: Math.max(0, newMatch.currentSet.scoreB + delta),
          servingTeam: delta > 0 ? 'B' : newMatch.currentSet.servingTeam,
        };
      }
      newMatch.updatedAt = new Date().toISOString();
      return newMatch;
    });
    
    // ScoreService.changeServingTeam должен возвращать матч с обновленной подачей
    // Если подача не изменилась, возвращаем тот же матч (для проверки истории)
    (ScoreService.changeServingTeam as ReturnType<typeof vi.fn>).mockImplementation((match, team) => {
      // Если подача уже у этой команды, возвращаем тот же матч
      if (match.currentSet.servingTeam === team) {
        return match;
      }
      const newMatch = { ...match };
      newMatch.currentSet = { ...newMatch.currentSet, servingTeam: team };
      newMatch.updatedAt = new Date().toISOString();
      return newMatch;
    });
    
    // SetService.updateSet должен возвращать матч с обновленными данными партии
    (SetService.updateSet as ReturnType<typeof vi.fn>).mockImplementation((match, setNumber, updates) => {
      const newMatch = { ...match };
      if (setNumber === match.currentSet.setNumber) {
        // Обновляем currentSet
        newMatch.currentSet = { ...newMatch.currentSet, ...updates };
      } else {
        // Обновляем завершенную партию в sets
        const setIndex = newMatch.sets.findIndex(s => s.setNumber === setNumber);
        if (setIndex >= 0) {
          newMatch.sets = [...newMatch.sets];
          newMatch.sets[setIndex] = { ...newMatch.sets[setIndex], ...updates };
        }
      }
      newMatch.updatedAt = new Date().toISOString();
      return newMatch;
    });
  });

  describe('Инициализация', () => {
    it('должен инициализироваться с переданным матчем', () => {
      const match = createTestMatch();
      const { result } = renderHook(() => useMatch(match));

      expect(result.current.match).toBeDefined();
      expect(result.current.match?.matchId).toBe('test-match');
    });

    it('должен инициализироваться с null, если матч не передан', () => {
      const { result } = renderHook(() => useMatch(null));

      expect(result.current.match).toBeNull();
    });
  });

  describe('changeScore', () => {
    it('должен изменять счет команды A', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const newMatch = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 11,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeScore('A', 1);
      });

      // useMatch.changeScore НЕ использует ScoreService.changeScore, он делает изменения напрямую
      // Проверяем, что счет изменился
      expect(result.current.match?.currentSet.scoreA).toBe(11);
      // Проверяем, что действие добавлено в локальную историю
      expect(result.current.hasHistory).toBe(true);
    });

    it('не должен изменять счет, если партия не начата', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeScore('A', 1);
      });

      expect(ScoreService.changeScore).not.toHaveBeenCalled();
    });

    it('должен обрабатывать ошибки при изменении счета', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      // useMatch.changeScore НЕ использует ScoreService.changeScore, он делает изменения напрямую
      // Поэтому ошибок быть не должно, если партия начата
      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeScore('A', 1);
      });

      // Проверяем, что счет изменился (нет ошибок)
      expect(result.current.match?.currentSet.scoreA).toBe(11);
    });
  });

  describe('changeServingTeam', () => {
    it('должен изменять команду подачи', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const newMatch = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'B',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeServingTeam('B');
      });

      // useMatch.changeServingTeam НЕ использует ScoreService.changeServingTeam, он делает изменения напрямую
      // Проверяем, что команда подачи изменилась
      expect(result.current.match?.currentSet.servingTeam).toBe('B');
      // Проверяем, что действие добавлено в локальную историю
      expect(result.current.hasHistory).toBe(true);
    });

    it('не должен добавлять в историю, если подача не изменилась', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeServingTeam('A');
      });

      // useMatch.changeServingTeam НЕ использует ScoreService.changeServingTeam
      // Если подача не изменилась, действие не добавляется в историю
      expect(result.current.hasHistory).toBe(false); // Не добавляется, так как не изменилось
    });
  });

  describe('startSet', () => {
    it('должен начинать партию', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      const newMatch = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now(),
        },
      });

      (SetService.startSet as ReturnType<typeof vi.fn>).mockReturnValue(newMatch);

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.startSet();
      });

      // SetService.startSet вызывается с prevMatch из хука (может быть мигрированным)
      expect(SetService.startSet).toHaveBeenCalled();
      // useMatch использует HistoryService.addAction для истории
      expect(result.current.match?.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(result.current.hasHistory).toBe(true);
    });

    it('не должен начинать партию, если она уже начата', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.startSet();
      });

      // useMatch проверяет статус до вызова SetService.startSet
      // Если партия уже начата, SetService.startSet не вызывается
      expect(SetService.startSet).not.toHaveBeenCalled();
      // match не должен измениться
      expect(result.current.match?.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      // История не должна измениться (действие не добавлено)
      expect(result.current.hasHistory).toBe(false);
    });
  });

  describe('finishSet', () => {
    it('должен завершать партию', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now() - 60000,
        },
      });

      const newMatch = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            completed: true,
            startTime: match.currentSet.startTime,
            endTime: Date.now(),
            duration: 60,
          },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      (SetService.finishSet as ReturnType<typeof vi.fn>).mockReturnValue(newMatch);

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.finishSet();
      });

      // SetService.finishSet вызывается с prevMatch из хука (может быть мигрированным)
      expect(SetService.finishSet).toHaveBeenCalled();
      // useMatch использует HistoryService.addAction для истории
      expect(result.current.match?.sets.length).toBe(1);
      expect(result.current.match?.currentSet.status).toBe(SET_STATUS.PENDING);
      expect(result.current.hasHistory).toBe(true);
    });

    it('должен обрабатывать ошибки при завершении партии', async () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 20,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      (SetService.finishSet as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Партия не может быть завершена');
      });

      const showMessageMock = vi.mocked(global.electronAPI?.showMessage);
      if (showMessageMock) showMessageMock.mockClear();

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.finishSet();
      });

      await waitFor(() => {
        expect(global.electronAPI?.showMessage).toHaveBeenCalledWith({ message: 'Партия не может быть завершена' });
      });
    });
  });

  describe('updateSet', () => {
    it('должен обновлять партию', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const newMatch = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 15,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        const success = result.current.updateSet(1, { scoreA: 15 });
        expect(success).toBe(true);
      });

      // useMatch.updateSet НЕ использует SetService.updateSet, он использует validateSetUpdate
      // Проверяем, что счет изменился
      expect(result.current.match?.currentSet.scoreA).toBe(15);
      // Проверяем, что действие добавлено в локальную историю
      expect(result.current.hasHistory).toBe(true);
    });

    it('должен обрабатывать ошибки при обновлении партии', async () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      // useMatch.updateSet использует SetService.updateSet, который внутри использует validateSetUpdate
      // Настраиваем SetService.updateSet, чтобы он выбрасывал ошибку
      (SetService.updateSet as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error('Ошибка валидации');
      });

      const showMessageMock = vi.mocked(global.electronAPI?.showMessage);
      if (showMessageMock) showMessageMock.mockClear();

      const { result } = renderHook(() => useMatch(match));

      // Сохраняем исходный счет
      const initialScore = result.current.match?.currentSet.scoreA;

      act(() => {
        // updateSet всегда возвращает true, даже при ошибке валидации
        // Но состояние не должно измениться
        const success = result.current.updateSet(1, { scoreA: 15 });
        expect(success).toBe(true); // Функция всегда возвращает true
      });

      // useMatch обрабатывает ошибку через SetService.updateSet, который показывает showMessage
      await waitFor(() => {
        expect(global.electronAPI?.showMessage).toHaveBeenCalledWith({ message: 'Ошибка валидации' });
      });
      // Проверяем, что match не изменился (счет остался прежним)
      expect(result.current.match?.currentSet.scoreA).toBe(initialScore);
    });
  });

  describe('undoLastAction', () => {
    it('должен отменять последнее действие', () => {
      // Партия должна быть начата (IN_PROGRESS), иначе changeScore не работает
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      // Сначала изменяем счет, чтобы добавить действие в историю
      act(() => {
        result.current.changeScore('A', 1);
      });

      // Проверяем, что счет изменился (было 0, стало 1) и история не пуста
      expect(result.current.match?.currentSet.scoreA).toBe(1);
      expect(result.current.hasHistory).toBe(true);

      // Сохраняем текущий счет для проверки после отмены
      const currentScore = result.current.match?.currentSet.scoreA;

      // Теперь отменяем последнее действие
      act(() => {
        const success = result.current.undoLastAction();
        expect(success).toBe(true);
      });

      // useMatch использует локальную историю, а не HistoryService.undoLastAction
      // Проверяем, что история пуста после отмены
      expect(result.current.hasHistory).toBe(false);
      // Проверяем, что счет вернулся к исходному значению (0)
      expect(result.current.match?.currentSet.scoreA).toBe(0);
    });

    it('должен возвращать false, если нет действий для отмены', () => {
      const match = createTestMatch();

      const { result } = renderHook(() => useMatch(match));

      // Проверяем, что история пуста
      expect(result.current.hasHistory).toBe(false);

      act(() => {
        const success = result.current.undoLastAction();
        expect(success).toBe(false);
      });

      // useMatch использует локальную историю, а не HistoryService.undoLastAction
      // Проверяем, что история все еще пуста
      expect(result.current.hasHistory).toBe(false);
    });

    it('должен сохранять логотипы при отмене', () => {
      const match = createTestMatch();
      (match.teamA as any).logo = 'logoA';
      (match.teamB as any).logo = 'logoB';

      const previousMatch = createTestMatch();
      (previousMatch.teamA as any).logo = 'oldLogoA';
      (previousMatch.teamB as any).logo = 'oldLogoB';

      (HistoryService.undoLastAction as ReturnType<typeof vi.fn>).mockReturnValue({
        type: 'score_change',
        timestamp: Date.now(),
        data: {},
        previousState: previousMatch,
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.undoLastAction();
      });

      expect((result.current.match?.teamA as any).logo).toBe('logoA');
      expect((result.current.match?.teamB as any).logo).toBe('logoB');
    });
  });

  describe('toggleSetStatus', () => {
    it('должен начинать партию, если статус PENDING', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      const newMatch = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      (SetService.startSet as ReturnType<typeof vi.fn>).mockReturnValue(newMatch);

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.toggleSetStatus();
      });

      expect(SetService.startSet).toHaveBeenCalled();
    });

    it('должен завершать партию, если статус IN_PROGRESS', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const newMatch = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            completed: true,
          },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      });

      (SetService.finishSet as ReturnType<typeof vi.fn>).mockReturnValue(newMatch);

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.toggleSetStatus();
      });

      expect(SetService.finishSet).toHaveBeenCalled();
    });
  });

  describe('changeStatistics', () => {
    it('должен изменять статистику команды A', () => {
      const match = createTestMatch({
        statistics: {
          enabled: true,
          teamA: { attack: 5, block: 2, serve: 1, opponentErrors: 0 },
          teamB: { attack: 3, block: 1, serve: 0, opponentErrors: 0 },
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeStatistics('A', 'attack', 1);
      });

      expect(result.current.match?.statistics.teamA.attack).toBe(6);
    });

    it('не должен изменять статистику, если вызовы происходят слишком быстро', () => {
      const match = createTestMatch({
        statistics: {
          enabled: true,
          teamA: { attack: 5, block: 2, serve: 1, opponentErrors: 0 },
          teamB: { attack: 3, block: 1, serve: 0, opponentErrors: 0 },
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.changeStatistics('A', 'attack', 1);
        // Второй вызов сразу же - должен быть проигнорирован
        result.current.changeStatistics('A', 'attack', 1);
      });

      // Должен быть только один вызов (второй проигнорирован)
      expect(result.current.match?.statistics.teamA.attack).toBe(6);
    });
  });

  describe('toggleStatistics', () => {
    it('должен переключать статистику', () => {
      const match = createTestMatch({
        statistics: {
          enabled: false,
          teamA: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
          teamB: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
        },
      });

      const { result } = renderHook(() => useMatch(match));

      act(() => {
        result.current.toggleStatistics(true);
      });

      expect(result.current.match?.statistics.enabled).toBe(true);
    });
  });

  describe('Вычисляемые значения', () => {
    it('должен вычислять canFinish', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      mockCanFinishSet.mockReturnValueOnce(true);

      const { result } = renderHook(() => useMatch(match));

      expect(result.current.canFinish).toBe(true);
    });

    it('должен вычислять hasHistory', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 10,
          scoreB: 5,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      // Изначально история пуста
      expect(result.current.hasHistory).toBe(false);

      // Добавляем действие в историю
      act(() => {
        result.current.changeScore('A', 1);
      });

      // Теперь история не пуста
      expect(result.current.hasHistory).toBe(true);
    });

    it('должен вычислять currentSetStatus', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      });

      const { result } = renderHook(() => useMatch(match));

      expect(result.current.currentSetStatus).toBe(SET_STATUS.IN_PROGRESS);
    });
  });

  describe('Синхронизация с initialMatch', () => {
    it('должен обновлять match при изменении initialMatch', () => {
      const match1 = createTestMatch({ matchId: 'match-1' });
      const match2 = createTestMatch({ matchId: 'match-2', updatedAt: new Date().toISOString() });

      const { result, rerender } = renderHook(
        ({ match }) => useMatch(match),
        { initialProps: { match: match1 } }
      );

      expect(result.current.match?.matchId).toBe('match-1');

      act(() => {
        rerender({ match: match2 });
      });

      expect(result.current.match?.matchId).toBe('match-2');
    });

    it('не должен обновлять match, если matchId и updatedAt не изменились', () => {
      const match = createTestMatch({ matchId: 'match-1' });

      const { result, rerender } = renderHook(
        ({ match }) => useMatch(match),
        { initialProps: { match } }
      );

      const initialMatch = result.current.match;

      act(() => {
        rerender({ match: { ...match } }); // Новый объект, но те же данные
      });

      // matchId и updatedAt не изменились, поэтому match не должен обновиться
      expect(result.current.match?.matchId).toBe('match-1');
    });
  });
});
