/**
 * Валидирует изменения партии
 */

import { getRules } from './volleyballRules';
import { SET_STATUS } from './types/Match';
import type { Set as SetType, CurrentSet } from './types/Match';

export interface SetUpdateValidation {
  valid: boolean;
  errors: string[];
}

/** Набор полей для обновления партии */
export interface SetUpdates {
  scoreA?: number;
  scoreB?: number;
  status?: string;
  startTime?: number;
  endTime?: number;
}

/** Матч с sets и currentSet для проверки пересечений */
interface MatchForValidation {
  variant?: string;
  sets?: { setNumber: number; startTime?: number; endTime?: number }[];
  currentSet?: { setNumber: number; startTime?: number };
}

export function validateSetUpdate(
  set: SetType | CurrentSet,
  updates: SetUpdates,
  currentSetNumber: number,
  match: MatchForValidation | null = null
): SetUpdateValidation {
  const errors: string[] = [];

  const finalScoreA = updates.scoreA !== undefined ? updates.scoreA : set.scoreA;
  const finalScoreB = updates.scoreB !== undefined ? updates.scoreB : set.scoreB;
  const finalStatus = updates.status !== undefined ? updates.status : set.status;
  const finalStartTime = updates.startTime !== undefined ? updates.startTime : set.startTime;
  const finalEndTime = updates.endTime !== undefined ? updates.endTime : set.endTime;

  if (finalStartTime && finalEndTime && finalEndTime < finalStartTime) {
    errors.push('Время завершения не может быть раньше времени начала');
  }

  if (
    finalStatus === SET_STATUS.COMPLETED ||
    (set.status === SET_STATUS.COMPLETED && finalStatus !== SET_STATUS.PENDING)
  ) {
    const rules = match ? getRules(match) : getRules({ variant: 'indoor' });
    if (!rules.canFinishSet(finalScoreA, finalScoreB, set.setNumber)) {
      const cfg = rules.getConfig();
      const threshold =
        set.setNumber === cfg.decidingSetNumber ? cfg.pointsToWinDecidingSet : cfg.pointsToWinRegularSet;
      errors.push(
        `Счет не соответствует правилам завершения партии. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`
      );
    }
  }

  if (finalStatus === SET_STATUS.COMPLETED) {
    if (!finalStartTime || !finalEndTime) {
      errors.push('Завершенная партия должна иметь время начала и завершения');
    }
  }

  if (set.status === SET_STATUS.COMPLETED && finalStatus === SET_STATUS.IN_PROGRESS) {
    if (finalEndTime !== undefined && finalEndTime !== null) {
      errors.push('Нельзя перевести завершенную партию в статус "В игре" без удаления времени завершения');
    }
  }

  if (finalScoreA < 0 || finalScoreB < 0) {
    errors.push('Счет не может быть отрицательным');
  }

  if (finalStatus === SET_STATUS.COMPLETED && finalStartTime && finalEndTime && match?.sets) {
    const setNumber = set.setNumber;
    const previousSet = match.sets.find((s) => s.setNumber === setNumber - 1);
    if (previousSet?.startTime && previousSet?.endTime && finalStartTime < previousSet.endTime) {
      errors.push(`Время начала партии ${setNumber} пересекается с временем окончания партии ${setNumber - 1}`);
    }
    const nextSetNumber = setNumber + 1;
    const nextSet = match.sets.find((s) => s.setNumber === nextSetNumber);
    if (nextSet?.startTime && nextSet?.endTime && finalEndTime > nextSet.startTime) {
      errors.push(`Время окончания партии ${setNumber} пересекается с временем начала партии ${nextSetNumber}`);
    }
    if (match.currentSet?.setNumber === nextSetNumber && match.currentSet?.startTime && finalEndTime > match.currentSet.startTime) {
      errors.push(`Время окончания партии ${setNumber} пересекается с временем начала партии ${nextSetNumber}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
