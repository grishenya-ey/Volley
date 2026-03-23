/**
 * Domain Layer для работы с матчем
 * Чистая бизнес-логика без зависимостей от UI
 */

import type { Match, Set } from '../types/Match';
import { SET_STATUS } from '../types/Match';

/**
 * Domain класс для работы с матчем
 */
export class MatchDomain {
  /**
   * Проверяет, начался ли матч (первая партия активна или хотя бы одна партия завершена)
   *
   * @param match - Матч
   * @returns true, если матч уже идёт или хотя бы одна партия сыграна
   *
   * @example
   * ```typescript
   * if (MatchDomain.hasMatchStarted(match)) {
   *   // Блокировать смену типа матча
   * }
   * ```
   */
  static hasMatchStarted(match: Match | null | undefined): boolean {
    if (!match?.currentSet) return false;
    return (
      (match.sets?.length ?? 0) > 0 ||
      match.currentSet.status === SET_STATUS.IN_PROGRESS
    );
  }

  /**
   * Получает максимальный номер партии из завершенных партий
   * 
   * @param match - Матч
   * @returns Максимальный номер партии или 0, если нет завершенных партий
   * 
   * @example
   * ```typescript
   * const maxNumber = MatchDomain.getMaxSetNumber(match);
   * // Если sets = [{setNumber: 1}, {setNumber: 2}], вернет 2
   * // Если sets = [], вернет 0
   * ```
   */
  static getMaxSetNumber(match: Match): number {
    if (match.sets.length === 0) return 0;
    return Math.max(...match.sets.map(s => s.setNumber));
  }

  /**
   * Получает все завершенные партии
   * 
   * @param match - Матч
   * @returns Массив завершенных партий
   * 
   * @example
   * ```typescript
   * const completedSets = MatchDomain.getCompletedSets(match);
   * // Вернет все партии, где completed === true || status === 'completed'
   * ```
   */
  static getCompletedSets(match: Match): Set[] {
    return match.sets.filter(set => 
      set.completed === true || set.status === 'completed'
    );
  }

  /**
   * Подсчитывает количество выигранных партий командой
   * 
   * @param match - Матч
   * @param team - Команда ('A' или 'B')
   * @returns Количество выигранных партий
   * 
   * @example
   * ```typescript
   * const winsA = MatchDomain.getSetsWonByTeam(match, 'A');
   * // Вернет количество партий, где команда A выиграла (scoreA > scoreB)
   * ```
   */
  static getSetsWonByTeam(match: Match, team: 'A' | 'B'): number {
    const completedSets = this.getCompletedSets(match);
    
    return completedSets.filter(set => {
      if (team === 'A') {
        return set.scoreA > set.scoreB;
      } else {
        return set.scoreB > set.scoreA;
      }
    }).length;
  }
}
