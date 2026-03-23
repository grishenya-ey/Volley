/**
 * Тесты для HistoryService
 */

import { HistoryService, Action } from '../../../src/shared/services/HistoryService';

describe('HistoryService', () => {
  beforeEach(() => {
    HistoryService.clearHistory();
  });

  describe('addAction', () => {
    it('должен добавлять действие в историю', () => {
      const action: Action = {
        type: 'score_change',
        timestamp: Date.now(),
        data: { team: 'A', delta: 1 },
      };

      HistoryService.addAction(action);

      expect(HistoryService.getHistorySize()).toBe(1);
      expect(HistoryService.getLastAction()).toEqual(action);
    });

    it('должен ограничивать размер истории', () => {
      HistoryService.setMaxHistorySize(5);

      for (let i = 0; i < 10; i++) {
        HistoryService.addAction({
          type: 'test',
          timestamp: Date.now(),
          data: { index: i },
        });
      }

      expect(HistoryService.getHistorySize()).toBe(5);
      expect(HistoryService.getLastAction()?.data.index).toBe(9);
    });
  });

  describe('undoLastAction', () => {
    it('должен возвращать последнее действие и удалять его', () => {
      const action1: Action = {
        type: 'score_change',
        timestamp: Date.now(),
        data: { team: 'A', delta: 1 },
      };
      const action2: Action = {
        type: 'score_change',
        timestamp: Date.now(),
        data: { team: 'B', delta: 1 },
      };

      HistoryService.addAction(action1);
      HistoryService.addAction(action2);

      const undone = HistoryService.undoLastAction();

      expect(undone).toEqual(action2);
      expect(HistoryService.getHistorySize()).toBe(1);
      expect(HistoryService.getLastAction()).toEqual(action1);
    });

    it('должен возвращать null, если история пуста', () => {
      const undone = HistoryService.undoLastAction();

      expect(undone).toBeNull();
    });
  });

  describe('getLastAction', () => {
    it('должен возвращать последнее действие без удаления', () => {
      const action: Action = {
        type: 'score_change',
        timestamp: Date.now(),
        data: { team: 'A', delta: 1 },
      };

      HistoryService.addAction(action);

      const lastAction = HistoryService.getLastAction();

      expect(lastAction).toEqual(action);
      expect(HistoryService.getHistorySize()).toBe(1); // Размер не изменился
    });

    it('должен возвращать null, если история пуста', () => {
      const lastAction = HistoryService.getLastAction();

      expect(lastAction).toBeNull();
    });
  });

  describe('clearHistory', () => {
    it('должен очищать всю историю', () => {
      HistoryService.addAction({
        type: 'test',
        timestamp: Date.now(),
        data: {},
      });
      HistoryService.addAction({
        type: 'test',
        timestamp: Date.now(),
        data: {},
      });

      HistoryService.clearHistory();

      expect(HistoryService.getHistorySize()).toBe(0);
      expect(HistoryService.getLastAction()).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('должен возвращать копию истории', () => {
      const action: Action = {
        type: 'test',
        timestamp: Date.now(),
        data: {},
      };

      HistoryService.addAction(action);

      const history = HistoryService.getHistory();
      const history2 = HistoryService.getHistory();

      expect(history).toEqual(history2);
      expect(history).not.toBe(history2); // Разные объекты
    });
  });

  describe('setMaxHistorySize', () => {
    it('должен устанавливать максимальный размер истории', () => {
      HistoryService.setMaxHistorySize(10);

      for (let i = 0; i < 15; i++) {
        HistoryService.addAction({
          type: 'test',
          timestamp: Date.now(),
          data: { index: i },
        });
      }

      expect(HistoryService.getHistorySize()).toBe(10);
    });

    it('должен обрезать историю при уменьшении размера', () => {
      for (let i = 0; i < 10; i++) {
        HistoryService.addAction({
          type: 'test',
          timestamp: Date.now(),
          data: { index: i },
        });
      }

      HistoryService.setMaxHistorySize(5);

      expect(HistoryService.getHistorySize()).toBe(5);
      expect(HistoryService.getLastAction()?.data.index).toBe(9);
    });

    it('должен выбрасывать ошибку для некорректного размера', () => {
      expect(() => HistoryService.setMaxHistorySize(0)).toThrow();
      expect(() => HistoryService.setMaxHistorySize(-1)).toThrow();
    });
  });
});
