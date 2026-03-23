/**
 * Сервис для работы с партиями
 * Оркестрация операций с партиями, использование Domain Layer и Validator Layer
 */

import { Match, Set, SET_STATUS } from '../types/Match';
import { SetDomain } from '../domain/SetDomain';
import { SetStateMachine } from '../domain/SetStateMachine';
import { SetValidator } from '../validators/SetValidator';
// @ts-ignore - временно, пока не будет TypeScript версии
import { getRules } from '../volleyballRules';
// @ts-ignore - временно, пока не будет TypeScript версии
import { calculateDuration } from '../timeUtils';

/**
 * Сервис для работы с партиями
 * Предоставляет методы для начала, завершения и обновления партий
 */
export class SetService {
  /**
   * Начинает новую партию
   * 
   * Вычисляет номер следующей партии, устанавливает статус IN_PROGRESS,
   * обнуляет счет и фиксирует время начала.
   * 
   * ВАЖНО: Счет обнуляется именно здесь, а не при завершении предыдущей партии.
   * Это нужно для того, чтобы в vMix плашка с текущим счетом продолжала отображаться
   * до начала следующей партии.
   * 
   * @param match - Текущий матч
   * @returns Новый матч с начатой партией
   * @throws {Error} Если партия уже начата или завершена
   * 
   * @example
   * ```typescript
   * const newMatch = SetService.startSet(match);
   * ```
   */
  static startSet(match: Match): Match {
    // 1. Валидация
    if (match.currentSet.status !== SET_STATUS.PENDING) {
      throw new Error('Партия уже начата или завершена');
    }

    // 2. Вычисление номера партии через Domain Layer
    const nextSetNumber = SetDomain.calculateNextSetNumber(match);

    // 3. Создание нового матча (immutability)
    // ВАЖНО: Счет обнуляется при начале партии, а не при завершении предыдущей
    // Также сбрасываем тайм-ауты для новой партии
    const newMatch: Match = {
      ...match,
      currentSet: {
        ...match.currentSet,
        setNumber: nextSetNumber,
        status: SET_STATUS.IN_PROGRESS,
        scoreA: 0, // Обнуление счета при начале новой партии
        scoreB: 0, // Обнуление счета при начале новой партии
        startTime: Date.now(),
      },
      timeouts: {
        teamA: 0,
        teamB: 0,
        activeTimeout: null,
      },
      updatedAt: new Date().toISOString(),
    };

    return newMatch;
  }

  /**
   * Завершает текущую партию
   * 
   * Проверяет возможность завершения по правилам волейбола,
   * создает завершенную партию в массиве sets и подготавливает
   * новую партию со статусом PENDING.
   * 
   * @param match - Текущий матч
   * @returns Новый матч с завершенной партией
   * @throws {Error} Если партия не начата или не может быть завершена
   * 
   * @example
   * ```typescript
   * const newMatch = SetService.finishSet(match);
   * ```
   */
  static finishSet(match: Match): Match {
    // 1. Валидация
    if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
      throw new Error('Партия не начата');
    }

    // 2. Проверка правил завершения
    const { scoreA, scoreB, setNumber, startTime } = match.currentSet;
    const rules = getRules(match as unknown as import('../volleyballRules').MatchWithVariant);
    if (!rules.canFinishSet(scoreA, scoreB, setNumber)) {
      const cfg = rules.getConfig();
      const threshold = setNumber === cfg.decidingSetNumber ? cfg.pointsToWinDecidingSet : cfg.pointsToWinRegularSet;
      throw new Error(
        `Партия не может быть завершена. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`
      );
    }

    // 3. Фиксируем время завершения
    const endTime = Date.now();

    // 4. Вычисляем продолжительность
    const duration = startTime ? calculateDuration(startTime, endTime) : undefined;

    // 5. Создаем завершенную партию
    const completedSet: Set = {
      setNumber: match.currentSet.setNumber,
      scoreA,
      scoreB,
      completed: true,
      status: SET_STATUS.COMPLETED,
      startTime: startTime || undefined,
      endTime,
      duration: duration || undefined,
    };

    // 6. Определяем победителя для следующей партии (подача)
    const winner = rules.getSetWinner(scoreA, scoreB);
    // Если winner null (не должно происходить при корректном счете), используем команду A по умолчанию
    const servingTeam: 'A' | 'B' = winner || 'A';

    // 7. Создание нового матча (immutability)
    // ВАЖНО: Счет НЕ обнуляется здесь - он будет обнулен при начале следующей партии (startSet)
    // Это нужно для того, чтобы в vMix плашка с текущим счетом продолжала отображаться
    // до начала следующей партии
    const newMatch: Match = {
      ...match,
      sets: [...match.sets, completedSet],
      currentSet: {
        ...match.currentSet,
        servingTeam: servingTeam,
        status: SET_STATUS.PENDING,
        // Счет сохраняется до начала следующей партии
        // scoreA и scoreB остаются с текущими значениями
        startTime: undefined,
        endTime: undefined,
      },
      updatedAt: new Date().toISOString(),
    };

    return newMatch;
  }

  /**
   * Обновляет партию
   * 
   * Валидирует обновления, проверяет возможность изменений
   * и применяет их к текущей или завершенной партии.
   * 
   * @param match - Текущий матч
   * @param setNumber - Номер партии для обновления
   * @param updates - Обновления (scoreA, scoreB, status, startTime, endTime и т.д.)
   * @returns Новый матч с обновленной партией
   * @throws {Error} Если валидация не прошла или партия не найдена
   * 
   * @example
   * ```typescript
   * const updates = { scoreA: 26, scoreB: 24 };
   * const newMatch = SetService.updateSet(match, 1, updates);
   * ```
   */
  static updateSet(
    match: Match,
    setNumber: number,
    updates: Partial<Set>
  ): Match {
    // 1. Находим партию через Domain Layer
    const set = SetDomain.findSet(match, setNumber);
    if (!set) {
      throw new Error('Партия не найдена');
    }

    // 2. Валидация через Validator Layer
    const validation = SetValidator.validateSetUpdate(
      set,
      updates,
      match.currentSet.setNumber,
      match
    );

    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // 3. Проверка, является ли партия текущей
    const isCurrentSet = SetDomain.isCurrentSet(setNumber, match.currentSet);

    // 4. Обработка времени при смене статуса через Domain Layer
    let processedUpdates: Partial<Set> = { ...updates };
    if (updates.status !== undefined && updates.status !== set.status) {
      // Используем Domain Layer для обработки времени при смене статуса
      if (SetDomain.isCompleted(set as Set)) {
        const processed = SetDomain.processTimeForStatus(set as Set, updates.status);
        // Объединяем обновления с обработанными значениями времени
        // processed возвращает Set, поэтому все поля доступны
        processedUpdates = {
          ...processedUpdates,
          startTime: processed.startTime,
          endTime: processed.endTime,
          duration: (processed as Set).duration,
          completed: (processed as Set).completed,
        };
      }
    }
    
    // Если явно указан null для endTime, удаляем его
    if (updates.endTime === null) {
      processedUpdates.endTime = undefined;
    }
    if (updates.startTime === null) {
      processedUpdates.startTime = undefined;
    }

    // 5. Обновление партии
    if (isCurrentSet) {
      // Обновляем currentSet
      const updatedCurrentSet = {
        ...match.currentSet,
        ...processedUpdates,
      };

      // Пересчитываем duration, если изменилось время
      if (processedUpdates.startTime !== undefined || processedUpdates.endTime !== undefined) {
        const startTime = updatedCurrentSet.startTime;
        const endTime = (updatedCurrentSet as any).endTime;
        if (startTime && endTime) {
          const duration = calculateDuration(startTime, endTime);
          // Преобразуем null в undefined для соответствия типу
          (updatedCurrentSet as any).duration = duration ?? undefined;
        } else {
          delete (updatedCurrentSet as any).duration;
        }
      }

      return {
        ...match,
        currentSet: updatedCurrentSet,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Обновляем в sets
      const setIndex = match.sets.findIndex(s => s.setNumber === setNumber);
      if (setIndex === -1) {
        throw new Error('Партия не найдена в массиве sets');
      }

      const updatedSet: Set = {
        ...match.sets[setIndex],
        ...processedUpdates,
      };

      // Пересчитываем duration, если изменилось время
      if (processedUpdates.startTime !== undefined || processedUpdates.endTime !== undefined) {
        const startTime = updatedSet.startTime;
        const endTime = updatedSet.endTime;
        if (startTime && endTime) {
          const duration = calculateDuration(startTime, endTime);
          // Преобразуем null в undefined для соответствия типу
          updatedSet.duration = duration ?? undefined;
        } else {
          delete updatedSet.duration;
        }
      }

      // Специальная обработка: если завершенная партия возвращается в игру
      if (SetDomain.isCompleted(set as Set) && updates.status === SET_STATUS.IN_PROGRESS) {
        // Удаляем из sets и перемещаем в currentSet
        const newSets = match.sets.filter(s => s.setNumber !== setNumber);
        return {
          ...match,
          sets: newSets,
          currentSet: {
            setNumber: updatedSet.setNumber,
            scoreA: updatedSet.scoreA,
            scoreB: updatedSet.scoreB,
            servingTeam: match.currentSet.servingTeam, // Сохраняем текущую подачу
            status: SET_STATUS.IN_PROGRESS,
            startTime: updatedSet.startTime,
          },
          updatedAt: new Date().toISOString(),
        };
      }

      // Обычное обновление завершенной партии
      return {
        ...match,
        sets: match.sets.map((s, i) => (i === setIndex ? updatedSet : s)),
        updatedAt: new Date().toISOString(),
      };
    }
  }
}
