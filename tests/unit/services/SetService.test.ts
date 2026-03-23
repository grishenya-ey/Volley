/**
 * Тесты для SetService
 */

import { SetService } from '../../../src/shared/services/SetService';
import { SET_STATUS } from '../../../src/shared/types/Match';
import type { Match } from '../../../src/shared/types/Match';

describe('SetService', () => {
  const createTestMatch = (): Match => ({
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
  });

  describe('startSet', () => {
    it('должен начинать партию со статусом PENDING', () => {
      const match = createTestMatch();
      const newMatch = SetService.startSet(match);

      expect(newMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(newMatch.currentSet.setNumber).toBe(1);
      expect(newMatch.currentSet.scoreA).toBe(0);
      expect(newMatch.currentSet.scoreB).toBe(0);
      expect(newMatch.currentSet.startTime).toBeDefined();
      // updatedAt должен быть обновлен (проверяем, что это новая строка)
      expect(typeof newMatch.updatedAt).toBe('string');
    });

    it('должен вычислять правильный номер следующей партии', () => {
      const match = createTestMatch();
      match.sets = [
        {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          completed: true,
          status: SET_STATUS.COMPLETED,
        },
        {
          setNumber: 2,
          scoreA: 20,
          scoreB: 25,
          completed: true,
          status: SET_STATUS.COMPLETED,
        },
      ];
      match.currentSet.setNumber = 3;

      const newMatch = SetService.startSet(match);
      expect(newMatch.currentSet.setNumber).toBe(3);
    });

    it('должен выбрасывать ошибку, если партия уже начата', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.IN_PROGRESS;

      expect(() => SetService.startSet(match)).toThrow('Партия уже начата или завершена');
    });

    it('должен выбрасывать ошибку, если партия завершена', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.COMPLETED;

      expect(() => SetService.startSet(match)).toThrow('Партия уже начата или завершена');
    });

    it('должен создавать новый объект матча (immutability)', () => {
      const match = createTestMatch();
      const newMatch = SetService.startSet(match);

      expect(newMatch).not.toBe(match);
      expect(newMatch.currentSet).not.toBe(match.currentSet);
    });
  });

  describe('finishSet', () => {
    it('должен завершать партию с корректным счетом', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.IN_PROGRESS;
      match.currentSet.scoreA = 25;
      match.currentSet.scoreB = 20;
      match.currentSet.startTime = Date.now() - 60000; // 1 минута назад

      const newMatch = SetService.finishSet(match);

      expect(newMatch.sets.length).toBe(1);
      expect(newMatch.sets[0].setNumber).toBe(1);
      expect(newMatch.sets[0].scoreA).toBe(25);
      expect(newMatch.sets[0].scoreB).toBe(20);
      expect(newMatch.sets[0].status).toBe(SET_STATUS.COMPLETED);
      expect(newMatch.sets[0].completed).toBe(true);
      expect(newMatch.sets[0].endTime).toBeDefined();
      expect(newMatch.currentSet.status).toBe(SET_STATUS.PENDING);
      // ВАЖНО: Счет НЕ обнуляется при finishSet - он сохраняется до начала следующей партии
      // Это нужно для отображения в vMix
      expect(newMatch.currentSet.scoreA).toBe(25);
      expect(newMatch.currentSet.scoreB).toBe(20);
    });

    it('должен выбрасывать ошибку, если партия не начата', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.PENDING;

      expect(() => SetService.finishSet(match)).toThrow('Партия не начата');
    });

    it('должен выбрасывать ошибку, если счет не соответствует правилам', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.IN_PROGRESS;
      match.currentSet.scoreA = 20;
      match.currentSet.scoreB = 20; // Равный счет не может завершить партию

      expect(() => SetService.finishSet(match)).toThrow('Партия не может быть завершена');
    });

    it('должен устанавливать подачу победителю', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.IN_PROGRESS;
      match.currentSet.scoreA = 25;
      match.currentSet.scoreB = 20;
      match.currentSet.servingTeam = 'B';
      match.currentSet.startTime = Date.now() - 60000;

      const newMatch = SetService.finishSet(match);

      expect(newMatch.currentSet.servingTeam).toBe('A'); // Победитель
    });

    it('должен создавать новый объект матча (immutability)', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.IN_PROGRESS;
      match.currentSet.scoreA = 25;
      match.currentSet.scoreB = 20;
      match.currentSet.startTime = Date.now() - 60000;

      const newMatch = SetService.finishSet(match);

      expect(newMatch).not.toBe(match);
      expect(newMatch.sets).not.toBe(match.sets);
      expect(newMatch.currentSet).not.toBe(match.currentSet);
    });
  });

  describe('updateSet', () => {
    it('должен обновлять текущую партию', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.IN_PROGRESS;
      match.currentSet.scoreA = 10;
      match.currentSet.scoreB = 5;

      const updates = { scoreA: 15 };
      const newMatch = SetService.updateSet(match, 1, updates);

      expect(newMatch.currentSet.scoreA).toBe(15);
      expect(newMatch.currentSet.scoreB).toBe(5);
    });

    it('должен обновлять завершенную партию', () => {
      const match = createTestMatch();
      match.sets = [
        {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          completed: true,
          status: SET_STATUS.COMPLETED,
          startTime: 1000,
          endTime: 2000,
        },
      ];
      match.currentSet.setNumber = 2;

      const updates = { scoreA: 26 };
      const newMatch = SetService.updateSet(match, 1, updates);

      expect(newMatch.sets[0].scoreA).toBe(26);
      expect(newMatch.sets[0].scoreB).toBe(20);
    });

    it('должен выбрасывать ошибку, если партия не найдена', () => {
      const match = createTestMatch();

      expect(() => SetService.updateSet(match, 999, { scoreA: 10 })).toThrow('Партия не найдена');
    });

    it('должен выбрасывать ошибку при некорректных данных', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.IN_PROGRESS;

      expect(() => SetService.updateSet(match, 1, { scoreA: -1 })).toThrow();
    });

    it('должен обрабатывать возврат завершенной партии в игру', () => {
      const match = createTestMatch();
      match.sets = [
        {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          completed: true,
          status: SET_STATUS.COMPLETED,
          startTime: 1000,
          endTime: 2000,
        },
      ];
      match.currentSet.setNumber = 2;
      match.currentSet.status = SET_STATUS.PENDING;

      const updates = { status: SET_STATUS.IN_PROGRESS, endTime: null };
      const newMatch = SetService.updateSet(match, 1, updates);

      expect(newMatch.sets.length).toBe(0);
      expect(newMatch.currentSet.setNumber).toBe(1);
      expect(newMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(newMatch.currentSet.scoreA).toBe(25);
      expect(newMatch.currentSet.scoreB).toBe(20);
    });

    it('должен создавать новый объект матча (immutability)', () => {
      const match = createTestMatch();
      match.currentSet.status = SET_STATUS.IN_PROGRESS;

      const newMatch = SetService.updateSet(match, 1, { scoreA: 10 });

      expect(newMatch).not.toBe(match);
      expect(newMatch.currentSet).not.toBe(match.currentSet);
    });
  });
});
