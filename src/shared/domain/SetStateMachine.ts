/**
 * Машина состояний для партий
 * Управление переходами между состояниями партий
 */

import { SET_STATUS } from '../types/Match';

/**
 * Контекст для переходов состояний
 */
export interface TransitionContext {
  /** Есть ли следующая партия */
  hasNextSet?: boolean;
  /** Является ли партия завершенной */
  isCompleted?: boolean;
  /** Номер следующей партии */
  nextSetNumber?: number;
}

/**
 * Машина состояний для партий
 */
export class SetStateMachine {
  /**
   * Проверяет, возможен ли переход между состояниями
   * 
   * Правила переходов:
   * - PENDING → IN_PROGRESS: всегда возможен
   * - IN_PROGRESS → COMPLETED: всегда возможен
   * - IN_PROGRESS → PENDING: возможен (отмена начала партии)
   * - COMPLETED → IN_PROGRESS: возможен только если следующая партия еще не началась
   * - COMPLETED → PENDING: невозможен (завершенная партия не может стать не начатой)
   * - PENDING → COMPLETED: невозможен (не начатая партия не может быть завершена)
   * 
   * @param from - Текущее состояние
   * @param to - Целевое состояние
   * @param context - Контекст перехода
   * @returns true, если переход возможен
   * 
   * @example
   * ```typescript
   * const canTransition = SetStateMachine.canTransition(
   *   SET_STATUS.PENDING,
   *   SET_STATUS.IN_PROGRESS
   * );
   * // Вернет true
   * ```
   */
  static canTransition(
    from: typeof SET_STATUS[keyof typeof SET_STATUS],
    to: typeof SET_STATUS[keyof typeof SET_STATUS],
    context?: TransitionContext
  ): boolean {
    // PENDING → IN_PROGRESS: всегда возможен
    if (from === SET_STATUS.PENDING && to === SET_STATUS.IN_PROGRESS) {
      return true;
    }

    // IN_PROGRESS → COMPLETED: всегда возможен
    if (from === SET_STATUS.IN_PROGRESS && to === SET_STATUS.COMPLETED) {
      return true;
    }

    // IN_PROGRESS → PENDING: возможен (отмена начала партии)
    if (from === SET_STATUS.IN_PROGRESS && to === SET_STATUS.PENDING) {
      return true;
    }

    // COMPLETED → IN_PROGRESS: возможен только если следующая партия еще не началась
    if (from === SET_STATUS.COMPLETED && to === SET_STATUS.IN_PROGRESS) {
      return context?.hasNextSet === false;
    }

    // Остальные переходы невозможны
    return false;
  }

  /**
   * Получает список доступных переходов из текущего состояния
   * 
   * @param currentStatus - Текущее состояние
   * @param context - Контекст (матч, партия)
   * @returns Массив доступных состояний
   * 
   * @example
   * ```typescript
   * const available = SetStateMachine.getAvailableTransitions(
   *   SET_STATUS.PENDING,
   *   { hasNextSet: false }
   * );
   * // Вернет [SET_STATUS.IN_PROGRESS]
   * ```
   */
  static getAvailableTransitions(
    currentStatus: typeof SET_STATUS[keyof typeof SET_STATUS],
    context?: TransitionContext
  ): Array<typeof SET_STATUS[keyof typeof SET_STATUS]> {
    const available: Array<typeof SET_STATUS[keyof typeof SET_STATUS]> = [];

    if (currentStatus === SET_STATUS.PENDING) {
      // Из PENDING можно перейти только в IN_PROGRESS
      available.push(SET_STATUS.IN_PROGRESS);
    } else if (currentStatus === SET_STATUS.IN_PROGRESS) {
      // Из IN_PROGRESS можно перейти в COMPLETED или обратно в PENDING
      available.push(SET_STATUS.COMPLETED);
      available.push(SET_STATUS.PENDING);
    } else if (currentStatus === SET_STATUS.COMPLETED) {
      // Из COMPLETED можно перейти в IN_PROGRESS только если следующая партия еще не началась
      if (context?.hasNextSet === false) {
        available.push(SET_STATUS.IN_PROGRESS);
      }
      // COMPLETED остается доступным (можно оставить завершенной)
      available.push(SET_STATUS.COMPLETED);
    }

    return available;
  }
}
