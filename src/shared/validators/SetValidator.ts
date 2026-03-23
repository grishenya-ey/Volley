/**
 * Валидатор для партий
 * Валидация данных партий и бизнес-правил
 */

import { Set, CurrentSet, SET_STATUS } from '../types/Match';
import { getRules } from '../volleyballRules';

/**
 * Результат валидации
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Валидатор для партий
 * Проверяет корректность данных партий и соблюдение бизнес-правил
 */
export class SetValidator {
  /**
   * Валидирует обновление партии
   * 
   * Проверяет:
   * - Корректность счета (не отрицательный)
   * - Корректность статуса
   * - Соответствие счета правилам завершения партии
   * - Корректность временных интервалов
   * - Переходы между статусами
   * 
   * @param set - Текущие данные партии (Set или CurrentSet)
   * @param updates - Предлагаемые изменения
   * @param currentSetNumber - Номер текущей партии (для проверки, является ли редактируемая партия текущей)
   * @param match - Полный объект матча для проверки пересечений времени (опционально)
   * @returns Результат валидации с массивом ошибок
   * 
   * @example
   * ```typescript
   * const set = { setNumber: 1, scoreA: 25, scoreB: 20, status: SET_STATUS.COMPLETED };
   * const updates = { scoreA: 26 };
   * const result = SetValidator.validateSetUpdate(set, updates, 2);
   * if (!result.valid) {
   *   console.error(result.errors);
   * }
   * ```
   */
  static validateSetUpdate(
    set: Set | CurrentSet,
    updates: Partial<Set>,
    currentSetNumber?: number,
    match?: { sets: Set[]; currentSet: CurrentSet } | null
  ): ValidationResult {
    const errors: string[] = [];

    // Получаем финальные значения (обновленные или текущие)
    const finalScoreA = updates.scoreA !== undefined ? updates.scoreA : set.scoreA;
    const finalScoreB = updates.scoreB !== undefined ? updates.scoreB : set.scoreB;
    const finalStatus = updates.status !== undefined ? updates.status : set.status;
    const finalStartTime = updates.startTime !== undefined ? updates.startTime : set.startTime;
    const finalEndTime = updates.endTime !== undefined ? updates.endTime : (set as Set).endTime;

    // Проверка 1: Счет не может быть отрицательным
    if (finalScoreA < 0 || finalScoreB < 0) {
      errors.push('Счет не может быть отрицательным');
    }

    // Проверка 2: Валидация статуса
    if (updates.status !== undefined) {
      if (!Object.values(SET_STATUS).includes(updates.status)) {
        errors.push('Некорректный статус партии');
      }
    }

    // Проверка 3: Время завершения не может быть раньше времени начала
    if (finalStartTime && finalEndTime) {
      if (finalEndTime < finalStartTime) {
        errors.push('Время завершения не может быть раньше времени начала');
      }
    }

    // Проверка 4: Счет для завершенных партий должен соответствовать правилам
    if (finalStatus === SET_STATUS.COMPLETED ||
        (set.status === SET_STATUS.COMPLETED && finalStatus !== SET_STATUS.PENDING)) {
      const rules = match ? getRules(match) : getRules({ variant: 'indoor' });
      if (!rules.canFinishSet(finalScoreA, finalScoreB, set.setNumber)) {
        const cfg = rules.getConfig();
        const threshold = set.setNumber === cfg.decidingSetNumber ? cfg.pointsToWinDecidingSet : cfg.pointsToWinRegularSet;
        errors.push(
          `Счет не соответствует правилам завершения партии. ` +
          `Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`
        );
      }
    }

    // Проверка 5: Завершенная партия должна иметь время начала и завершения
    if (finalStatus === SET_STATUS.COMPLETED) {
      if (!finalStartTime || !finalEndTime) {
        errors.push('Завершенная партия должна иметь время начала и завершения');
      }
    }

    // Проверка 6: Нельзя перевести завершенную партию в статус "В игре" без удаления времени завершения
    if (set.status === SET_STATUS.COMPLETED && finalStatus === SET_STATUS.IN_PROGRESS) {
      if (finalEndTime !== undefined && finalEndTime !== null) {
        errors.push('Нельзя перевести завершенную партию в статус "В игре" без удаления времени завершения');
      }
    }

    // Проверка 7: Пересечение времени с другими партиями (только для завершенных партий)
    if (finalStatus === SET_STATUS.COMPLETED && finalStartTime && finalEndTime && match) {
      const setNumber = set.setNumber;

      // Проверяем пересечение с предыдущей партией
      const previousSet = match.sets.find(s => s.setNumber === setNumber - 1);
      if (previousSet && previousSet.startTime && previousSet.endTime) {
        if (finalStartTime < previousSet.endTime) {
          errors.push(
            `Время начала партии ${setNumber} пересекается с временем окончания партии ${setNumber - 1}`
          );
        }
      }

      // Проверяем пересечение со следующей партией
      const nextSetNumber = setNumber + 1;
      const nextSet = match.sets.find(s => s.setNumber === nextSetNumber);
      if (nextSet && nextSet.startTime && nextSet.endTime) {
        if (finalEndTime > nextSet.startTime) {
          errors.push(
            `Время окончания партии ${setNumber} пересекается с временем начала партии ${nextSetNumber}`
          );
        }
      }

      // Проверяем пересечение с текущей партией (если она не является редактируемой)
      if (match.currentSet && match.currentSet.setNumber === nextSetNumber && match.currentSet.startTime) {
        if (finalEndTime > match.currentSet.startTime) {
          errors.push(
            `Время окончания партии ${setNumber} пересекается с временем начала партии ${nextSetNumber}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Валидирует счет партии
   * 
   * @param scoreA - Счет команды A
   * @param scoreB - Счет команды B
   * @returns Результат валидации
   * 
   * @example
   * ```typescript
   * const result = SetValidator.validateScore(25, 20);
   * if (!result.valid) {
   *   console.error(result.errors);
   * }
   * ```
   */
  static validateScore(scoreA: number, scoreB: number): ValidationResult {
    const errors: string[] = [];

    if (scoreA < 0) {
      errors.push('Счет команды A не может быть отрицательным');
    }

    if (scoreB < 0) {
      errors.push('Счет команды B не может быть отрицательным');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Валидирует статус партии
   * 
   * @param status - Статус для проверки
   * @returns Результат валидации
   * 
   * @example
   * ```typescript
   * const result = SetValidator.validateStatus('pending');
   * if (!result.valid) {
   *   console.error(result.errors);
   * }
   * ```
   */
  static validateStatus(status: string): ValidationResult {
    const errors: string[] = [];

    if (!Object.values(SET_STATUS).includes(status as typeof SET_STATUS[keyof typeof SET_STATUS])) {
      errors.push('Некорректный статус партии');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
