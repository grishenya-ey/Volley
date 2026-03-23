/**
 * Domain Layer для работы с партиями
 * Чистая бизнес-логика без зависимостей от UI
 */

import type { Set, CurrentSet, Match } from '../types/Match';
import { SET_STATUS } from '../types/Match';

/**
 * Domain класс для работы с партиями
 */
export class SetDomain {
  /**
   * Определяет, является ли партия текущей (активно играющей)
   * 
   * @param setNumber - Номер партии для проверки
   * @param currentSet - Текущая партия из match
   * @returns true, если партия является текущей и в игре
   * 
   * @example
   * ```typescript
   * const isCurrent = SetDomain.isCurrentSet(1, match.currentSet);
   * // true, если currentSet.setNumber === 1 && currentSet.status === 'in_progress'
   * ```
   */
  static isCurrentSet(setNumber: number, currentSet: CurrentSet): boolean {
    return currentSet.setNumber === setNumber && 
           currentSet.status === SET_STATUS.IN_PROGRESS;
  }

  /**
   * Определяет, завершена ли партия
   * 
   * @param set - Партия для проверки
   * @returns true, если партия завершена
   * 
   * @example
   * ```typescript
   * const isCompleted = SetDomain.isCompleted(set);
   * // true, если set.completed === true || set.status === 'completed'
   * ```
   */
  static isCompleted(set: Set): boolean {
    return set.completed === true || set.status === SET_STATUS.COMPLETED;
  }

  /**
   * Вычисляет номер следующей партии
   * 
   * Логика:
   * 1. Если есть завершенные партии в sets, берем максимальный номер + 1
   * 2. Если завершенных партий нет, но currentSet.setNumber установлен и партия еще не начата (PENDING),
   *    используем этот номер (для начала матча)
   * 3. Иначе начинаем с партии 1
   * 
   * @param match - Матч
   * @returns Номер следующей партии
   * 
   * @example
   * ```typescript
   * const nextNumber = SetDomain.calculateNextSetNumber(match);
   * // Если есть завершенные партии [1, 2], вернет 3
   * // Если нет завершенных партий и currentSet.setNumber === 1, status === 'pending', вернет 1
   * // Иначе вернет 1
   * ```
   */
  static calculateNextSetNumber(match: Match): number {
    if (match.sets.length > 0) {
      // Есть завершенные партии - берем максимальный номер + 1
      const maxSetNumberInSets = Math.max(...match.sets.map(s => s.setNumber));
      return maxSetNumberInSets + 1;
    } else {
      // Нет завершенных партий - используем номер текущей партии (если она еще не начата)
      // или начинаем с 1
      if (match.currentSet.setNumber && match.currentSet.status === SET_STATUS.PENDING) {
        return match.currentSet.setNumber;
      } else {
        return 1;
      }
    }
  }

  /**
   * Обрабатывает время партии в зависимости от статуса
   * 
   * Правила:
   * - При переходе в PENDING: удаляет startTime, endTime, duration, устанавливает completed = false
   * - При переходе в IN_PROGRESS: удаляет endTime, duration, устанавливает completed = false
   * - При статусе COMPLETED: устанавливает completed = true
   * 
   * @param set - Партия для обработки
   * @param newStatus - Новый статус
   * @returns Новая партия с обработанным временем
   * 
   * @example
   * ```typescript
   * const updatedSet = SetDomain.processTimeForStatus(set, SET_STATUS.PENDING);
   * // startTime и endTime будут null, duration undefined, completed = false
   * ```
   */
  static processTimeForStatus(set: Set | CurrentSet, newStatus: typeof SET_STATUS[keyof typeof SET_STATUS]): Set | CurrentSet {
    const updatedSet = { ...set };

    if (newStatus === SET_STATUS.PENDING) {
      // При переходе в pending удаляем время начала и завершения
      updatedSet.startTime = undefined;
      updatedSet.endTime = undefined;
      if ('duration' in updatedSet) {
        updatedSet.duration = undefined;
      }
      if ('completed' in updatedSet) {
        updatedSet.completed = false;
      }
    } else if (newStatus === SET_STATUS.IN_PROGRESS) {
      // При переходе в in_progress удаляем время завершения
      updatedSet.endTime = undefined;
      if ('duration' in updatedSet) {
        updatedSet.duration = undefined;
      }
      if ('completed' in updatedSet) {
        updatedSet.completed = false;
      }
    } else if (newStatus === SET_STATUS.COMPLETED) {
      // При статусе completed устанавливаем completed = true
      if ('completed' in updatedSet) {
        updatedSet.completed = true;
      }
    }

    return updatedSet;
  }

  /**
   * Защищает currentSet при редактировании завершенной партии
   * 
   * Создает защищенную копию currentSet, которая не будет изменена при редактировании
   * завершенной партии. Если currentSet уже в игре (IN_PROGRESS), просто создает копию.
   * Если currentSet имеет неправильный статус, исправляет его на PENDING.
   * 
   * @param currentSet - Текущая партия для защиты
   * @returns Защищенная копия currentSet
   * 
   * @example
   * ```typescript
   * const protectedSet = SetDomain.protectCurrentSet(match.currentSet);
   * // Возвращает копию currentSet с сохранением scoreA и scoreB
   * ```
   */
  static protectCurrentSet(currentSet: CurrentSet): CurrentSet {
    // Если currentSet уже в игре, просто создаем копию
    if (currentSet.status === SET_STATUS.IN_PROGRESS) {
      return { ...currentSet };
    }

    // Если currentSet имеет неправильный статус, исправляем его на PENDING
    // и сохраняем текущие значения счета
    if (currentSet.status !== SET_STATUS.PENDING) {
      return {
        ...currentSet,
        status: SET_STATUS.PENDING,
        scoreA: currentSet.scoreA,
        scoreB: currentSet.scoreB,
      };
    }

    // Если currentSet уже PENDING, просто создаем копию с сохранением счета
    return {
      ...currentSet,
      scoreA: currentSet.scoreA,
      scoreB: currentSet.scoreB,
    };
  }

  /**
   * Находит партию в матче (в sets или currentSet)
   * 
   * @param match - Матч
   * @param setNumber - Номер партии для поиска
   * @returns Партия или null, если не найдена
   */
  static findSet(match: Match, setNumber: number): Set | CurrentSet | null {
    // Сначала проверяем currentSet
    if (match.currentSet.setNumber === setNumber) {
      return match.currentSet;
    }

    // Затем ищем в sets
    const set = match.sets.find(s => s.setNumber === setNumber);
    return set || null;
  }
}
