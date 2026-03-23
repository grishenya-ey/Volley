/**
 * Утилиты для работы с матчем (main процесс и общие хелперы).
 * createNewMatch и validateMatch реэкспортируются из types/Match.
 */

import { createNewMatch, validateMatch } from './types/Match';
import type { CurrentSet, Set as SetType } from './types/Match';

export { createNewMatch, validateMatch };

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Создает объект завершенной партии на основе текущей партии */
export function createCompletedSet(
  currentSet: CurrentSet,
  endTime: number,
  calculateDuration: (startTime: number, endTime: number) => number | null
): SetType & { completed: boolean; status: 'completed'; startTime?: number; endTime: number; duration?: number | null } {
  const { setNumber, scoreA, scoreB, startTime } = currentSet;
  const duration = startTime && calculateDuration ? calculateDuration(startTime, endTime) : null;
  return {
    setNumber,
    scoreA,
    scoreB,
    completed: true,
    status: 'completed',
    startTime: startTime ?? undefined,
    endTime,
    duration: duration ?? undefined,
  };
}

/** Создает новую партию со статусом PENDING (после завершения предыдущей) */
export function createPendingSet(currentSet: CurrentSet, winner: 'A' | 'B'): CurrentSet {
  return {
    ...currentSet,
    servingTeam: winner,
    status: 'pending',
  };
}
