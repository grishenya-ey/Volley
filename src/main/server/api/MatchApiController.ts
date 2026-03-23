/**
 * API контроллер для мобильного интерфейса
 * Обработка HTTP запросов от мобильного интерфейса
 * Использует Service Layer для выполнения операций
 */

import { Match, SET_STATUS } from '../../../shared/types/Match';
import { SetService } from '../../../shared/services/SetService';
import { ScoreService } from '../../../shared/services/ScoreService';
import { HistoryService } from '../../../shared/services/HistoryService';

/**
 * Ответ API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * API контроллер для матча
 * Обрабатывает HTTP запросы от мобильного интерфейса
 * и использует Service Layer для выполнения операций
 */
export class MatchApiController {
  /**
   * Обрабатывает запрос на изменение счета
   * 
   * @param match - Текущий матч
   * @param team - Команда ('A' или 'B')
   * @param delta - Изменение счета (+1 или -1)
   * @returns Результат операции
   * 
   * @example
   * ```typescript
   * const result = MatchApiController.handleChangeScore(match, 'A', 1);
   * if (result.success) {
   *   const newMatch = result.data;
   * }
   * ```
   */
  static handleChangeScore(
    match: Match,
    team: 'A' | 'B',
    delta: number
  ): ApiResponse<Match> {
    try {
      // Валидация входных данных
      if (team !== 'A' && team !== 'B') {
        return {
          success: false,
          error: 'Некорректная команда',
        };
      }

      if (delta !== 1 && delta !== -1) {
        return {
          success: false,
          error: 'Некорректное изменение счета. Ожидается +1 или -1',
        };
      }

      // Используем Service Layer
      const newMatch = ScoreService.changeScore(match, team, delta);

      // Добавляем в историю
      HistoryService.addAction({
        type: 'score_change',
        timestamp: Date.now(),
        data: { team, delta },
        previousState: match,
      });

      return {
        success: true,
        data: newMatch,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

  /**
   * Обрабатывает запрос на начало партии
   * 
   * @param match - Текущий матч
   * @returns Результат операции
   * 
   * @example
   * ```typescript
   * const result = MatchApiController.handleStartSet(match);
   * if (result.success) {
   *   const newMatch = result.data;
   * }
   * ```
   */
  static handleStartSet(match: Match): ApiResponse<Match> {
    try {
      // Используем Service Layer
      const newMatch = SetService.startSet(match);

      // Добавляем в историю
      HistoryService.addAction({
        type: 'start_set',
        timestamp: Date.now(),
        data: {},
        previousState: match,
      });

      return {
        success: true,
        data: newMatch,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

  /**
   * Обрабатывает запрос на завершение партии
   * 
   * @param match - Текущий матч
   * @returns Результат операции
   * 
   * @example
   * ```typescript
   * const result = MatchApiController.handleFinishSet(match);
   * if (result.success) {
   *   const newMatch = result.data;
   * }
   * ```
   */
  static handleFinishSet(match: Match): ApiResponse<Match> {
    try {
      // Используем Service Layer
      const newMatch = SetService.finishSet(match);

      // Добавляем в историю
      HistoryService.addAction({
        type: 'finish_set',
        timestamp: Date.now(),
        data: {},
        previousState: match,
      });

      return {
        success: true,
        data: newMatch,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

  /**
   * Обрабатывает запрос на изменение команды подачи
   * 
   * @param match - Текущий матч
   * @param team - Команда, которой передается подача ('A' или 'B')
   * @returns Результат операции
   * 
   * @example
   * ```typescript
   * const result = MatchApiController.handleChangeServingTeam(match, 'B');
   * if (result.success) {
   *   const newMatch = result.data;
   * }
   * ```
   */
  static handleChangeServingTeam(
    match: Match,
    team: 'A' | 'B'
  ): ApiResponse<Match> {
    try {
      // Валидация входных данных
      if (team !== 'A' && team !== 'B') {
        return {
          success: false,
          error: 'Некорректная команда',
        };
      }

      // Используем Service Layer
      const newMatch = ScoreService.changeServingTeam(match, team);

      // Добавляем в историю только если произошло изменение
      if (newMatch !== match) {
        HistoryService.addAction({
          type: 'serve_change',
          timestamp: Date.now(),
          data: { team },
          previousState: match,
        });
      }

      return {
        success: true,
        data: newMatch,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

  /**
   * Обрабатывает запрос на отмену последнего действия
   * 
   * @param match - Текущий матч
   * @returns Результат операции
   * 
   * @example
   * ```typescript
   * const result = MatchApiController.handleUndo(match);
   * if (result.success && result.data) {
   *   const previousMatch = result.data;
   * }
   * ```
   */
  static handleUndo(match: Match): ApiResponse<Match> {
    try {
      // Получаем последнее действие из истории
      const lastAction = HistoryService.undoLastAction();

      if (!lastAction || !lastAction.previousState) {
        return {
          success: false,
          error: 'Нет действий для отмены',
        };
      }

      // Восстанавливаем предыдущее состояние
      // Сохраняем текущие логотипы (они не должны меняться при отмене)
      const currentLogoA = (match.teamA as any)?.logoBase64 || match.teamA?.logo;
      const currentLogoB = (match.teamB as any)?.logoBase64 || match.teamB?.logo;
      const currentLogoPathA = (match.teamA as any)?.logoPath;
      const currentLogoPathB = (match.teamB as any)?.logoPath;

      const previousMatch = lastAction.previousState as Match;

      // Восстанавливаем логотипы из текущего состояния (они не меняются при отмене)
      if (previousMatch.teamA) {
        if (currentLogoA) {
          previousMatch.teamA.logo = currentLogoA;
          (previousMatch.teamA as any).logoBase64 = currentLogoA;
        }
        if (currentLogoPathA) {
          (previousMatch.teamA as any).logoPath = currentLogoPathA;
        }
      }
      if (previousMatch.teamB) {
        if (currentLogoB) {
          previousMatch.teamB.logo = currentLogoB;
          (previousMatch.teamB as any).logoBase64 = currentLogoB;
        }
        if (currentLogoPathB) {
          (previousMatch.teamB as any).logoPath = currentLogoPathB;
        }
      }

      previousMatch.updatedAt = new Date().toISOString();

      return {
        success: true,
        data: previousMatch,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

  /**
   * Обрабатывает запрос на получение текущего матча
   * 
   * @param match - Текущий матч
   * @returns Результат операции
   * 
   * @example
   * ```typescript
   * const result = MatchApiController.handleGetMatch(match);
   * if (result.success) {
   *   const matchData = result.data;
   * }
   * ```
   */
  static handleGetMatch(match: Match | null): ApiResponse<Match> {
    if (!match) {
      return {
        success: false,
        error: 'Матч не найден',
      };
    }

    return {
      success: true,
      data: match,
    };
  }
}
