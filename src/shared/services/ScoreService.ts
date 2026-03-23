/**
 * Сервис для работы со счетом
 * Изменение счета, изменение подачи
 */

import { Match, SET_STATUS } from '../types/Match';

/**
 * Сервис для работы со счетом
 * Предоставляет методы для изменения счета команд
 */
export class ScoreService {
  /**
   * Изменяет счет команды
   * 
   * Увеличивает или уменьшает счет указанной команды на указанное значение.
   * При увеличении счета автоматически передает подачу этой команде.
   * Счет не может быть отрицательным.
   * 
   * @param match - Текущий матч
   * @param team - Команда ('A' или 'B')
   * @param delta - Изменение счета (+1 для увеличения, -1 для уменьшения)
   * @returns Новый матч с обновленным счетом
   * @throws {Error} Если партия не начата
   * 
   * @example
   * ```typescript
   * // Увеличить счет команды A на 1
   * const newMatch = ScoreService.changeScore(match, 'A', 1);
   * 
   * // Уменьшить счет команды B на 1
   * const newMatch = ScoreService.changeScore(match, 'B', -1);
   * ```
   */
  static changeScore(
    match: Match,
    team: 'A' | 'B',
    delta: number
  ): Match {
    // 1. Валидация
    if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
      throw new Error('Партия не начата');
    }

    // 2. Валидация команды
    if (team !== 'A' && team !== 'B') {
      throw new Error('Некорректная команда');
    }

    // 3. Вычисление нового счета
    const currentScore = team === 'A' ? match.currentSet.scoreA : match.currentSet.scoreB;
    const newScore = Math.max(0, currentScore + delta);

    // 4. Определение команды подачи
    // При увеличении счета (delta > 0) подача переходит к команде, которая забила
    const newServingTeam = delta > 0 ? team : match.currentSet.servingTeam;

    // 5. Создание нового матча (immutability)
    const newMatch: Match = {
      ...match,
      currentSet: {
        ...match.currentSet,
        scoreA: team === 'A' ? newScore : match.currentSet.scoreA,
        scoreB: team === 'B' ? newScore : match.currentSet.scoreB,
        servingTeam: newServingTeam,
      },
      updatedAt: new Date().toISOString(),
    };

    return newMatch;
  }

  /**
   * Изменяет команду подачи
   * 
   * Передает подачу указанной команде.
   * 
   * @param match - Текущий матч
   * @param team - Команда, которой передается подача ('A' или 'B')
   * @returns Новый матч с обновленной подачей
   * @throws {Error} Если партия не начата или команда некорректна
   * 
   * @example
   * ```typescript
   * // Передать подачу команде A
   * const newMatch = ScoreService.changeServingTeam(match, 'A');
   * ```
   */
  static changeServingTeam(match: Match, team: 'A' | 'B'): Match {
    // 1. Валидация
    if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
      throw new Error('Партия не начата');
    }

    // 2. Валидация команды
    if (team !== 'A' && team !== 'B') {
      throw new Error('Некорректная команда');
    }

    // 3. Если подача уже у этой команды, ничего не делаем
    if (match.currentSet.servingTeam === team) {
      return match;
    }

    // 4. Создание нового матча (immutability)
    const newMatch: Match = {
      ...match,
      currentSet: {
        ...match.currentSet,
        servingTeam: team,
      },
      updatedAt: new Date().toISOString(),
    };

    return newMatch;
  }
}
