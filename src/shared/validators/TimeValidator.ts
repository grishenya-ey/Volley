/**
 * Валидатор для времени
 * Валидация временных интервалов партий
 */

/**
 * Интерфейс для временного интервала
 */
export interface TimeInterval {
  startTime?: number;
  endTime?: number;
}

/**
 * Валидатор для времени
 * Проверяет корректность временных интервалов и их пересечения
 */
export class TimeValidator {
  /**
   * Проверяет, не пересекаются ли временные интервалы партий
   * 
   * Два интервала пересекаются, если:
   * - Начало первого интервала находится внутри второго интервала, или
   * - Конец первого интервала находится внутри второго интервала, или
   * - Первый интервал полностью содержит второй интервал
   * 
   * @param set1 - Первая партия с временными метками
   * @param set2 - Вторая партия с временными метками
   * @returns true, если интервалы не пересекаются (валидно), false если пересекаются (невалидно)
   * 
   * @example
   * ```typescript
   * const set1 = { startTime: 1000, endTime: 2000 };
   * const set2 = { startTime: 2000, endTime: 3000 };
   * const isValid = TimeValidator.validateTimeOverlap(set1, set2);
   * // true - интервалы не пересекаются (конец первого совпадает с началом второго)
   * ```
   */
  static validateTimeOverlap(
    set1: TimeInterval,
    set2: TimeInterval
  ): boolean {
    // Если у одного из интервалов нет времени, пересечения быть не может
    if (!set1.startTime || !set1.endTime || !set2.startTime || !set2.endTime) {
      return true;
    }

    // Проверяем корректность интервалов
    if (set1.endTime < set1.startTime || set2.endTime < set2.startTime) {
      return false; // Некорректный интервал
    }

    // Интервалы не пересекаются, если:
    // - Первый интервал полностью заканчивается до начала второго, или
    // - Второй интервал полностью заканчивается до начала первого
    return set1.endTime <= set2.startTime || set2.endTime <= set1.startTime;
  }

  /**
   * Проверяет корректность временного интервала
   * 
   * @param interval - Временной интервал для проверки
   * @returns true, если интервал корректен (endTime >= startTime), false в противном случае
   * 
   * @example
   * ```typescript
   * const isValid = TimeValidator.validateTimeInterval({ startTime: 1000, endTime: 2000 });
   * // true - интервал корректен
   * ```
   */
  static validateTimeInterval(interval: TimeInterval): boolean {
    // Если нет времени начала или окончания, интервал считается валидным (неполный интервал)
    if (!interval.startTime || !interval.endTime) {
      return true;
    }

    // Время окончания должно быть больше или равно времени начала
    return interval.endTime >= interval.startTime;
  }

  /**
   * Проверяет, что время начала партии не раньше времени окончания предыдущей партии
   * 
   * @param currentSet - Текущая партия
   * @param previousSet - Предыдущая партия
   * @returns true, если порядок времени корректен, false в противном случае
   * 
   * @example
   * ```typescript
   * const previous = { startTime: 1000, endTime: 2000 };
   * const current = { startTime: 2000, endTime: 3000 };
   * const isValid = TimeValidator.validateTimeOrder(current, previous);
   * // true - порядок корректен
   * ```
   */
  static validateTimeOrder(
    currentSet: TimeInterval,
    previousSet: TimeInterval
  ): boolean {
    // Если у предыдущей партии нет времени окончания, проверка не требуется
    if (!previousSet.endTime) {
      return true;
    }

    // Если у текущей партии нет времени начала, проверка не требуется
    if (!currentSet.startTime) {
      return true;
    }

    // Время начала текущей партии должно быть >= времени окончания предыдущей
    return currentSet.startTime >= previousSet.endTime;
  }

  /**
   * Проверяет, что время окончания партии не позже времени начала следующей партии
   * 
   * @param currentSet - Текущая партия
   * @param nextSet - Следующая партия
   * @returns true, если порядок времени корректен, false в противном случае
   * 
   * @example
   * ```typescript
   * const current = { startTime: 1000, endTime: 2000 };
   * const next = { startTime: 2000, endTime: 3000 };
   * const isValid = TimeValidator.validateTimeOrderReverse(current, next);
   * // true - порядок корректен
   * ```
   */
  static validateTimeOrderReverse(
    currentSet: TimeInterval,
    nextSet: TimeInterval
  ): boolean {
    // Если у текущей партии нет времени окончания, проверка не требуется
    if (!currentSet.endTime) {
      return true;
    }

    // Если у следующей партии нет времени начала, проверка не требуется
    if (!nextSet.startTime) {
      return true;
    }

    // Время окончания текущей партии должно быть <= времени начала следующей
    return currentSet.endTime <= nextSet.startTime;
  }
}
