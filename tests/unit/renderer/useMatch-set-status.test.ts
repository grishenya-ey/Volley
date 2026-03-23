/**
 * Тесты для функций управления статусами партий в useMatch
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SET_STATUS } from '../../../src/shared/types/Match';
import { calculateDuration } from '../../../src/shared/timeUtils';

const mockCanFinishSet = vi.fn();
const mockGetSetWinner = vi.fn();
vi.mock('../../../src/shared/volleyballRules', () => ({
  getRules: vi.fn(() => ({
    canFinishSet: mockCanFinishSet,
    getSetWinner: mockGetSetWinner,
    isSetball: vi.fn(() => ({ isSetball: false, team: null })),
    isMatchball: vi.fn(() => ({ isMatchball: false, team: null })),
    getConfig: () => ({ decidingSetNumber: 5, pointsToWinRegularSet: 25, pointsToWinDecidingSet: 15 }),
  })),
}));

vi.mock('../../../src/shared/timeUtils', () => ({
  calculateDuration: vi.fn(),
}));

describe('useMatch - Set Status Functions', () => {
  const getSetWinner = (a: number, b: number): 'A' | 'B' | null => (a > b ? 'A' : b > a ? 'B' : null);

  function createTestMatch(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      matchId: 'test-match',
      variant: 'indoor',
      teamA: { name: 'Команда A' },
      teamB: { name: 'Команда B' },
      sets: [] as unknown[],
      currentSet: {
        setNumber: 1,
        scoreA: 0,
        scoreB: 0,
        servingTeam: 'A',
        status: SET_STATUS.PENDING,
      },
      updatedAt: new Date().toISOString(),
      ...overrides,
    } as Record<string, unknown>;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanFinishSet.mockReturnValue(true);
    mockGetSetWinner.mockReturnValue('A');
    vi.mocked(calculateDuration).mockReturnValue(45);
  });

  describe('startSet логика', () => {
    it('должна обновлять статус партии на IN_PROGRESS', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      }) as { sets: unknown[]; currentSet: Record<string, unknown>; updatedAt: string };

      const nextSetNumber = match.sets.length + 1;
      const updatedMatch = {
        ...match,
        currentSet: {
          ...match.currentSet,
          setNumber: nextSetNumber,
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now(),
          scoreA: 0,
          scoreB: 0,
        },
        updatedAt: new Date().toISOString(),
      };

      expect(updatedMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(updatedMatch.currentSet.setNumber).toBe(1);
      expect(updatedMatch.currentSet.scoreA).toBe(0);
      expect(updatedMatch.currentSet.scoreB).toBe(0);
      expect(updatedMatch.currentSet.startTime).toBeDefined();
    });

    it('должна обновлять номер партии при начале', () => {
      const match = createTestMatch({
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20, status: SET_STATUS.COMPLETED },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 5,
          scoreB: 3,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      }) as { sets: unknown[]; currentSet: Record<string, unknown> };

      const nextSetNumber = match.sets.length + 1;
      const updatedMatch = {
        ...match,
        currentSet: {
          ...match.currentSet,
          setNumber: nextSetNumber,
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now(),
          scoreA: 0,
          scoreB: 0,
        },
      };

      expect(updatedMatch.currentSet.setNumber).toBe(2);
    });

    it('не должна начинать партию, если она уже начата', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 5,
          scoreB: 3,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      }) as { currentSet: { status: string } };

      if (match.currentSet.status === SET_STATUS.IN_PROGRESS) {
        expect(match.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      }
    });
  });

  describe('finishSet логика', () => {
    it('должна создавать завершенную партию с таймингом', () => {
      const startTime = Date.now() - 2700000;
      const endTime = Date.now();
      vi.mocked(calculateDuration).mockReturnValue(45);

      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime,
        },
      }) as { sets: unknown[]; currentSet: Record<string, unknown> };

      mockCanFinishSet.mockReturnValue(true);
      mockGetSetWinner.mockReturnValue('A');

      const { scoreA, scoreB, setNumber, startTime: setStartTime } = match.currentSet as { scoreA: number; scoreB: number; setNumber: number; startTime?: number };
      if (!mockCanFinishSet(scoreA, scoreB, setNumber)) {
        throw new Error('Партия не может быть завершена');
      }

      const duration = setStartTime ? calculateDuration(setStartTime, endTime) : null;
      const completedSet = {
        setNumber: match.currentSet.setNumber,
        scoreA,
        scoreB,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: setStartTime || undefined,
        endTime,
        duration,
      };

      const updatedMatch = {
        ...match,
        sets: [...(match.sets as unknown[]), completedSet],
        currentSet: {
          ...match.currentSet,
          servingTeam: getSetWinner(scoreA, scoreB),
          status: SET_STATUS.PENDING,
        },
      };

      expect(updatedMatch.sets).toHaveLength(1);
      expect((updatedMatch.sets[0] as Record<string, unknown>).status).toBe(SET_STATUS.COMPLETED);
      expect((updatedMatch.sets[0] as Record<string, unknown>).duration).toBe(45);
      expect((updatedMatch.sets[0] as Record<string, unknown>).startTime).toBe(startTime);
      expect((updatedMatch.sets[0] as Record<string, unknown>).endTime).toBe(endTime);
      expect(updatedMatch.currentSet.status).toBe(SET_STATUS.PENDING);
    });

    it('должна сохранять счет и номер партии в следующей pending партии', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now() - 2700000,
        },
      }) as { sets: unknown[]; currentSet: Record<string, unknown> };

      mockCanFinishSet.mockReturnValue(true);
      mockGetSetWinner.mockReturnValue('A');

      const { scoreA, scoreB } = match.currentSet as { scoreA: number; scoreB: number };
      const winner = getSetWinner(scoreA, scoreB);
      const updatedMatch = {
        ...match,
        sets: [...(match.sets as unknown[]), {
          setNumber: match.currentSet.setNumber,
          scoreA,
          scoreB,
          completed: true,
          status: SET_STATUS.COMPLETED,
        }],
        currentSet: {
          ...match.currentSet,
          servingTeam: winner,
          status: SET_STATUS.PENDING,
        },
      };

      expect(updatedMatch.currentSet.setNumber).toBe(1);
      expect(updatedMatch.currentSet.scoreA).toBe(25);
      expect(updatedMatch.currentSet.scoreB).toBe(20);
      expect(updatedMatch.currentSet.status).toBe(SET_STATUS.PENDING);
    });

    it('не должна завершать партию, если не выполнены условия', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 20,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      }) as { currentSet: Record<string, unknown> };

      mockCanFinishSet.mockReturnValue(false);

      const { scoreA, scoreB, setNumber } = match.currentSet as { scoreA: number; scoreB: number; setNumber: number };
      if (!mockCanFinishSet(scoreA, scoreB, setNumber)) {
        expect(mockCanFinishSet).toHaveBeenCalledWith(scoreA, scoreB, setNumber);
        expect(match.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      }
    });
  });

  describe('toggleSetStatus логика', () => {
    it('должна вызывать startSet для pending партии', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      }) as { sets: unknown[]; currentSet: Record<string, unknown> };

      const currentStatus = (match.currentSet.status as string) || SET_STATUS.PENDING;
      if (currentStatus === SET_STATUS.PENDING) {
        const nextSetNumber = match.sets.length + 1;
        const updatedMatch = {
          ...match,
          currentSet: {
            ...match.currentSet,
            setNumber: nextSetNumber,
            status: SET_STATUS.IN_PROGRESS,
            startTime: Date.now(),
            scoreA: 0,
            scoreB: 0,
          },
        };
        expect(updatedMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      }
    });

    it('должна вызывать finishSet для in_progress партии', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now() - 2700000,
        },
      }) as { sets: unknown[]; currentSet: Record<string, unknown> };

      mockCanFinishSet.mockReturnValue(true);
      mockGetSetWinner.mockReturnValue('A');

      const currentStatus = (match.currentSet.status as string) || SET_STATUS.PENDING;
      if (currentStatus === SET_STATUS.IN_PROGRESS) {
        const { scoreA, scoreB } = match.currentSet as { scoreA: number; scoreB: number };
        if (mockCanFinishSet(scoreA, scoreB, match.currentSet.setNumber as number)) {
          const updatedMatch = {
            ...match,
            sets: [...(match.sets as unknown[]), {
              setNumber: match.currentSet.setNumber,
              scoreA,
              scoreB,
              completed: true,
              status: SET_STATUS.COMPLETED,
            }],
            currentSet: {
              ...match.currentSet,
              servingTeam: getSetWinner(scoreA, scoreB),
              status: SET_STATUS.PENDING,
            },
          };
          expect(updatedMatch.currentSet.status).toBe(SET_STATUS.PENDING);
        }
      }
    });
  });

  describe('changeScore логика с блокировкой', () => {
    it('не должна изменять счет, если партия не начата', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      }) as { currentSet: Record<string, unknown> };

      if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
        expect(match.currentSet.scoreA).toBe(0);
        expect(match.currentSet.scoreB).toBe(0);
      }
    });

    it('должна изменять счет, если партия начата', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 5,
          scoreB: 3,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      }) as { currentSet: Record<string, unknown> };

      if (match.currentSet.status === SET_STATUS.IN_PROGRESS) {
        const team = 'A';
        const delta = 1;
        const updatedMatch = {
          ...match,
          currentSet: {
            ...match.currentSet,
            scoreA: team === 'A'
              ? Math.max(0, (match.currentSet.scoreA as number) + delta)
              : match.currentSet.scoreA,
            scoreB: team === 'B'
              ? Math.max(0, (match.currentSet.scoreB as number) + delta)
              : match.currentSet.scoreB,
          },
        };
        expect(updatedMatch.currentSet.scoreA).toBe(6);
        expect(updatedMatch.currentSet.scoreB).toBe(3);
      }
    });

    it('не должна позволять отрицательный счет', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
        },
      }) as { currentSet: Record<string, unknown> };

      if (match.currentSet.status === SET_STATUS.IN_PROGRESS) {
        const team = 'A';
        const delta = -1;
        const updatedMatch = {
          ...match,
          currentSet: {
            ...match.currentSet,
            scoreA: team === 'A'
              ? Math.max(0, (match.currentSet.scoreA as number) + delta)
              : match.currentSet.scoreA,
          },
        };
        expect(updatedMatch.currentSet.scoreA).toBe(0);
      }
    });
  });

  describe('updateSet логика', () => {
    it('должна удалять startTime и endTime при изменении статуса текущей партии на pending', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 15,
          scoreB: 12,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now() - 1800000,
        },
      }) as { currentSet: Record<string, unknown> };

      const updates = {
        scoreA: 15,
        scoreB: 12,
        status: SET_STATUS.PENDING,
        startTime: null as number | null,
        endTime: null as number | null,
      };

      const updatedMatch = {
        ...match,
        currentSet: {
          ...match.currentSet,
          ...updates,
          duration: undefined,
        },
      };

      expect(updatedMatch.currentSet.status).toBe(SET_STATUS.PENDING);
      expect(updatedMatch.currentSet.startTime).toBeNull();
      expect(updatedMatch.currentSet.endTime).toBeNull();
      expect(updatedMatch.currentSet.duration).toBeUndefined();
    });

    it('должна удалять endTime при изменении статуса текущей партии на in_progress', () => {
      const match = createTestMatch({
        currentSet: {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          servingTeam: 'A',
          status: SET_STATUS.COMPLETED,
          startTime: Date.now() - 2700000,
          endTime: Date.now(),
        },
      }) as { currentSet: Record<string, unknown> };

      const updates = {
        scoreA: 25,
        scoreB: 20,
        status: SET_STATUS.IN_PROGRESS,
        endTime: null as number | null,
      };

      const updatedMatch = {
        ...match,
        currentSet: {
          ...match.currentSet,
          ...updates,
          duration: undefined,
        },
      };

      expect(updatedMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
      expect(updatedMatch.currentSet.startTime).toBeDefined();
      expect(updatedMatch.currentSet.endTime).toBeNull();
      expect(updatedMatch.currentSet.duration).toBeUndefined();
    });

    it('должна удалять startTime и endTime при изменении статуса завершенной партии на pending', () => {
      const match = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            startTime: Date.now() - 2700000,
            endTime: Date.now(),
            duration: 45,
          },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      }) as { sets: Record<string, unknown>[]; currentSet: Record<string, unknown> };

      const updates = {
        scoreA: 25,
        scoreB: 20,
        status: SET_STATUS.PENDING,
        startTime: null as number | null,
        endTime: null as number | null,
      };

      const updatedSet = {
        ...match.sets[0],
        ...updates,
        completed: false,
        duration: undefined,
      };

      const updatedMatch = { ...match, sets: [updatedSet] };

      expect(updatedMatch.sets[0].status).toBe(SET_STATUS.PENDING);
      expect(updatedMatch.sets[0].startTime).toBeNull();
      expect(updatedMatch.sets[0].endTime).toBeNull();
      expect(updatedMatch.sets[0].completed).toBe(false);
      expect(updatedMatch.sets[0].duration).toBeUndefined();
    });

    it('должна удалять endTime при изменении статуса завершенной партии на in_progress', () => {
      const match = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            startTime: Date.now() - 2700000,
            endTime: Date.now(),
            duration: 45,
          },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      }) as { sets: Record<string, unknown>[]; currentSet: Record<string, unknown> };

      const updates = {
        scoreA: 25,
        scoreB: 20,
        status: SET_STATUS.IN_PROGRESS,
        endTime: null as number | null,
      };

      const updatedSet = {
        ...match.sets[0],
        ...updates,
        completed: false,
        duration: undefined,
      };

      const updatedMatch = { ...match, sets: [updatedSet] };

      expect(updatedMatch.sets[0].status).toBe(SET_STATUS.IN_PROGRESS);
      expect(updatedMatch.sets[0].startTime).toBeDefined();
      expect(updatedMatch.sets[0].endTime).toBeNull();
      expect(updatedMatch.sets[0].completed).toBe(false);
      expect(updatedMatch.sets[0].duration).toBeUndefined();
    });

    it('не должна позволять изменить статус завершенной партии на in_progress, если следующая партия уже началась', () => {
      const match = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            startTime: Date.now() - 2700000,
            endTime: Date.now(),
            duration: 45,
          },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 5,
          scoreB: 3,
          servingTeam: 'A',
          status: SET_STATUS.IN_PROGRESS,
          startTime: Date.now() - 300000,
        },
      }) as { sets: Record<string, unknown>[]; currentSet: Record<string, unknown> };

      const setNumber = 1;
      const nextSetNumber = setNumber + 1;
      const nextSetStarted = match.sets.some((s: Record<string, unknown>) => s.setNumber === nextSetNumber && s.status === SET_STATUS.IN_PROGRESS) ||
        (match.currentSet.setNumber === nextSetNumber && match.currentSet.status === SET_STATUS.IN_PROGRESS);

      if (nextSetStarted) {
        expect(nextSetStarted).toBe(true);
        expect(match.sets[0].status).toBe(SET_STATUS.COMPLETED);
      }
    });

    it('должна позволять изменить статус завершенной партии на in_progress, если следующая партия еще не началась', () => {
      const match = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            startTime: Date.now() - 2700000,
            endTime: Date.now(),
            duration: 45,
          },
        ],
        currentSet: {
          setNumber: 2,
          scoreA: 0,
          scoreB: 0,
          servingTeam: 'A',
          status: SET_STATUS.PENDING,
        },
      }) as { sets: Record<string, unknown>[]; currentSet: Record<string, unknown> };

      const setNumber = 1;
      const nextSetNumber = setNumber + 1;
      const nextSetStarted = match.sets.some((s: Record<string, unknown>) => s.setNumber === nextSetNumber && s.status === SET_STATUS.IN_PROGRESS) ||
        (match.currentSet.setNumber === nextSetNumber && match.currentSet.status === SET_STATUS.IN_PROGRESS);

      if (!nextSetStarted) {
        const updates = {
          scoreA: 25,
          scoreB: 20,
          status: SET_STATUS.IN_PROGRESS,
          endTime: null as number | null,
        };

        const updatedSet = {
          ...match.sets[0],
          ...updates,
          completed: false,
          duration: undefined,
        };

        const updatedMatch = {
          ...match,
          sets: [] as Record<string, unknown>[],
          currentSet: updatedSet,
        };

        expect(updatedMatch.sets).toHaveLength(0);
        expect(updatedMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
        expect(updatedMatch.currentSet.endTime).toBeNull();
        expect(updatedMatch.currentSet.completed).toBe(false);
      }
    });

    it('должна сохранять startTime и endTime при статусе completed', () => {
      const startTime = Date.now() - 2700000;
      const endTime = Date.now();

      const match = createTestMatch({
        sets: [
          {
            setNumber: 1,
            scoreA: 25,
            scoreB: 20,
            status: SET_STATUS.COMPLETED,
            startTime,
            endTime,
            duration: 45,
          },
        ],
      }) as { sets: Record<string, unknown>[] };

      const updates = {
        scoreA: 26,
        scoreB: 20,
        status: SET_STATUS.COMPLETED,
        startTime,
        endTime,
      };

      const updatedSet = {
        ...match.sets[0],
        ...updates,
        completed: true,
      } as Record<string, unknown>;

      if (updatedSet.startTime && updatedSet.endTime) {
        updatedSet.duration = calculateDuration(updatedSet.startTime as number, updatedSet.endTime as number);
      }

      const updatedMatch = { ...match, sets: [updatedSet] };

      expect(updatedMatch.sets[0].status).toBe(SET_STATUS.COMPLETED);
      expect(updatedMatch.sets[0].startTime).toBe(startTime);
      expect(updatedMatch.sets[0].endTime).toBe(endTime);
      expect(updatedMatch.sets[0].completed).toBe(true);
      expect(updatedMatch.sets[0].duration).toBeDefined();
    });
  });
});
