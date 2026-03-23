/**
 * Фабрика для создания тестовых матчей
 */

import { createNewMatch } from '../../src/shared/matchUtils';
import { SET_STATUS } from '../../src/shared/types/Match';
import type { Match } from '../../src/shared/types/Match';

export function createTestMatch(): Match {
  return createNewMatch();
}

export function createMatchWithStartedSet(): Match {
  const match = createNewMatch();
  return {
    ...match,
    currentSet: {
      ...match.currentSet,
      status: SET_STATUS.IN_PROGRESS,
      startTime: Date.now(),
    },
  };
}

export function createMatchWithCompletedSet(
  setNumber = 1,
  scoreA = 25,
  scoreB = 20
): Match {
  const match = createNewMatch();
  const now = Date.now();
  return {
    ...match,
    sets: [
      {
        setNumber,
        scoreA,
        scoreB,
        completed: true,
        status: SET_STATUS.COMPLETED,
        startTime: now - 3600000,
        endTime: now,
        duration: 60,
      },
    ],
    currentSet: {
      ...match.currentSet,
      setNumber: setNumber + 1,
      status: SET_STATUS.PENDING,
      scoreA,
      scoreB,
    },
  };
}

export function createMatchWithMultipleSets(completedSetsCount = 2): Match {
  const match = createNewMatch();
  const sets: Match['sets'] = [];
  const now = Date.now();
  for (let i = 1; i <= completedSetsCount; i++) {
    sets.push({
      setNumber: i,
      scoreA: 25,
      scoreB: i % 2 === 0 ? 20 : 23,
      completed: true,
      status: SET_STATUS.COMPLETED,
      startTime: now - (completedSetsCount - i + 1) * 3600000,
      endTime: now - (completedSetsCount - i) * 3600000,
      duration: 60,
    });
  }
  return {
    ...match,
    sets,
    currentSet: {
      ...match.currentSet,
      setNumber: completedSetsCount + 1,
      status: SET_STATUS.PENDING,
    },
  };
}

export function createMatchWithInProgressSet(
  scoreA = 15,
  scoreB = 12,
  setNumber = 1
): Match {
  const match = createNewMatch();
  return {
    ...match,
    currentSet: {
      ...match.currentSet,
      setNumber,
      scoreA,
      scoreB,
      status: SET_STATUS.IN_PROGRESS,
      startTime: Date.now() - 1800000,
      servingTeam: scoreA > scoreB ? 'A' : 'B',
    },
  };
}
