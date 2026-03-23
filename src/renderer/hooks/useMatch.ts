/**
 * Хук для управления состоянием матча
 * Использует Service Layer для выполнения операций
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Match } from '../../shared/types/Match';
import { SET_STATUS } from '../../shared/types/Match';
import { getRules, type MatchWithVariant } from '../../shared/volleyballRules';
import { migrateMatchToSetStatus, type MatchForMigration } from '../../shared/matchMigration';
import { SetService } from '../../shared/services/SetService';
import { ScoreService } from '../../shared/services/ScoreService';
import { HistoryService } from '../../shared/services/HistoryService';

/**
 * Синхронизирует матч с localStorage и отправляет событие для ТВ-табло
 */
function syncMatchToTV(match: Match) {
  try {
    localStorage.setItem('currentMatch', JSON.stringify(match));
    window.dispatchEvent(new CustomEvent('matchUpdated', { detail: match }));
  } catch (e) {
    console.error('Ошибка синхронизации матча:', e);
  }
}

/**
 * Хук для управления состоянием матча
 * 
 * @param initialMatch - Начальное состояние матча
 * @returns Объект с состоянием матча и методами для его изменения
 * 
 * @example
 * ```typescript
 * const {
 *   match,
 *   changeScore,
 *   startSet,
 *   finishSet,
 *   updateSet,
 *   undoLastAction,
 * } = useMatch(initialMatch);
 * ```
 */
export function useMatch(initialMatch: Match | null) {
  // Применяем миграцию при инициализации (приведение типов для совместимости Match с MatchForMigration)
  const migratedMatch = initialMatch
    ? (migrateMatchToSetStatus(initialMatch as unknown as MatchForMigration) as Match | null)
    : null;
  const [match, setMatch] = useState<Match | null>(migratedMatch);
  const prevInitialMatchRef = useRef<Match | null>(initialMatch);
  const lastStatsUpdateRef = useRef<{ team: string | null; category: string | null; timestamp: number }>({
    team: null,
    category: null,
    timestamp: 0,
  });

  // Обновляем match при изменении initialMatch (например, при синхронизации с мобильного)
  useEffect(() => {
    if (initialMatch) {
      const prevMatch = prevInitialMatchRef.current;
      // Обновляем только если изменился matchId или updatedAt
      if (
        !prevMatch ||
        prevMatch.matchId !== initialMatch.matchId ||
        prevMatch.updatedAt !== initialMatch.updatedAt
      ) {
        // Применяем миграцию при обновлении (приведение типов для совместимости Match с MatchForMigration)
        const migratedMatch = migrateMatchToSetStatus(initialMatch as unknown as MatchForMigration) as Match | null;
        setMatch(migratedMatch);
        prevInitialMatchRef.current = migratedMatch;
      }
    }
  }, [initialMatch]);

  /**
   * Отменяет последнее действие
   */
  const undoLastAction = useCallback(() => {
    try {
      const lastAction = HistoryService.undoLastAction();
      if (!lastAction || !lastAction.previousState) {
        return false;
      }

      // Восстанавливаем предыдущее состояние
      // Сохраняем текущие логотипы (они не должны меняться при отмене)
      const currentLogoA = match?.teamA?.logo || (match?.teamA as any)?.logoBase64;
      const currentLogoB = match?.teamB?.logo || (match?.teamB as any)?.logoBase64;
      const currentLogoPathA = (match?.teamA as any)?.logoPath;
      const currentLogoPathB = (match?.teamB as any)?.logoPath;

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
      setMatch(previousMatch);
      
      // Синхронизация с localStorage для ТВ-табло
      syncMatchToTV(previousMatch);
      
      return true;
    } catch (error) {
      console.error('Ошибка при отмене действия:', error);
      return false;
    }
  }, [match]);

  /**
   * Изменяет счет команды
   *
   * @param team - Команда ('A' или 'B')
   * @param delta - Изменение счета (+1 или -1)
   */
  const changeScore = useCallback(
    (team: 'A' | 'B', delta: number) => {
      if (!match) return;

      // Проверяем, что партия начата
      if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
        return; // Не изменяем счет, если партия не начата
      }

      setMatch((prevMatch) => {
        if (!prevMatch) return prevMatch;

        try {
          // Сохраняем в историю
          HistoryService.addAction({
            type: 'score_change',
            timestamp: Date.now(),
            data: { team, delta },
            previousState: prevMatch,
          });

          // Используем Service Layer
          const newMatch = ScoreService.changeScore(prevMatch, team, delta);
          
          // Синхронизация с localStorage для ТВ-табло
          syncMatchToTV(newMatch);
          
          return newMatch;
        } catch (error) {
          console.error('Ошибка при изменении счета:', error);
          return prevMatch;
        }
      });
    },
    [match]
  );

  /**
   * Ручная коррекция подачи
   *
   * @param team - Команда, которой передается подача ('A' или 'B')
   */
  const changeServingTeam = useCallback(
    (team: 'A' | 'B') => {
      if (!match) return;

      // Проверяем, что передана корректная команда
      if (team !== 'A' && team !== 'B') {
        console.warn('changeServingTeam: некорректная команда', team);
        return;
      }

      setMatch((prevMatch) => {
        if (!prevMatch) return prevMatch;

        try {
          // Используем Service Layer
          const newMatch = ScoreService.changeServingTeam(prevMatch, team);

          // Добавляем в историю только если произошло изменение
          if (newMatch !== prevMatch) {
            HistoryService.addAction({
              type: 'serve_change',
              timestamp: Date.now(),
              data: { team },
              previousState: prevMatch,
            });
            
            // Синхронизация с localStorage для ТВ-табло
            syncMatchToTV(newMatch);
          }

          return newMatch;
        } catch (error) {
          console.error('Ошибка при изменении подачи:', error);
          return prevMatch;
        }
      });
    },
    [match]
  );

  /**
   * Начинает текущую партию
   */
  const startSet = useCallback(() => {
    if (!match) return;

    setMatch((prevMatch) => {
      if (!prevMatch) return prevMatch;

      // Проверяем, что партия еще не начата
      if (prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS) {
        console.warn('Партия уже начата');
        return prevMatch;
      }

      try {
        // Сохраняем в историю
        HistoryService.addAction({
          type: 'start_set',
          timestamp: Date.now(),
          data: {},
          previousState: prevMatch,
        });

        // Используем Service Layer
        const newMatch = SetService.startSet(prevMatch);
        
        // Синхронизация с localStorage для ТВ-табло
        syncMatchToTV(newMatch);
        
        return newMatch;
      } catch (error) {
        console.error('Ошибка при начале партии:', error);
        return prevMatch;
      }
    });
  }, [match]);

  /**
   * Завершает текущую партию
   */
  const finishSet = useCallback(() => {
    if (!match) return;

    setMatch((prevMatch) => {
      if (!prevMatch) return prevMatch;

      try {
        // Сохраняем в историю
        HistoryService.addAction({
          type: 'finish_set',
          timestamp: Date.now(),
          data: {},
          previousState: prevMatch,
        });

        // Используем Service Layer
        const newMatch = SetService.finishSet(prevMatch);
        
        // Синхронизация с localStorage для ТВ-табло
        syncMatchToTV(newMatch);
        
        return newMatch;
      } catch (error) {
        console.error('Ошибка при завершении партии:', error);
        // Показываем сообщение об ошибке, если это ошибка валидации
        if (error instanceof Error && error.message.includes('не может быть завершена')) {
          void (window as Window & { electronAPI?: { showMessage?: (o: { message: string }) => Promise<void> } }).electronAPI?.showMessage?.({ message: error.message });
        }
        return prevMatch;
      }
    });
  }, [match]);

  /**
   * Переключает статус партии (для toggle-кнопки)
   */
  const toggleSetStatus = useCallback(() => {
    if (!match) return;

    const currentStatus = match.currentSet.status || SET_STATUS.PENDING;

    if (currentStatus === SET_STATUS.PENDING) {
      startSet();
    } else if (currentStatus === SET_STATUS.IN_PROGRESS) {
      finishSet();
    }
  }, [match, startSet, finishSet]);

  /**
   * Обновляет данные партии (для модального окна редактирования)
   *
   * @param setNumber - Номер партии для обновления
   * @param updates - Обновления (scoreA, scoreB, status, startTime, endTime)
   * @returns true, если обновление успешно, false в противном случае
   */
  const updateSet = useCallback(
    (setNumber: number, updates: Partial<import('../../shared/types/Match').Set>) => {
      if (!match) return false;

      setMatch((prevMatch) => {
        if (!prevMatch) return prevMatch;

        try {
          // Сохраняем в историю
          HistoryService.addAction({
            type: 'set_update',
            timestamp: Date.now(),
            data: { setNumber, updates },
            previousState: prevMatch,
          });

          // Используем Service Layer
          const newMatch = SetService.updateSet(prevMatch, setNumber, updates);
          
          // Синхронизация с localStorage для ТВ-табло
          syncMatchToTV(newMatch);
          
          return newMatch;
        } catch (error) {
          console.error('Ошибка при обновлении партии:', error);
          // Показываем сообщение об ошибке, если это ошибка валидации
          if (error instanceof Error) {
            void (window as Window & { electronAPI?: { showMessage?: (o: { message: string }) => Promise<void> } }).electronAPI?.showMessage?.({ message: error.message });
          }
          return prevMatch;
        }
      });

      return true;
    },
    [match]
  );

  /**
   * Изменяет статистику
   */
  const changeStatistics = useCallback(
    (team: 'A' | 'B', category: string, delta: number, event?: Event) => {
      // Предотвращаем множественные вызовы
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Защита от множественных вызовов в течение 100мс
      const now = Date.now();
      const lastUpdate = lastStatsUpdateRef.current;
      if (
        lastUpdate.team === team &&
        lastUpdate.category === category &&
        now - lastUpdate.timestamp < 100
      ) {
        return; // Игнорируем повторный вызов
      }

      lastStatsUpdateRef.current = { team, category, timestamp: now };

      setMatch((prevMatch) => {
        if (!prevMatch) return prevMatch;

        // Глубокое копирование для избежания мутаций
        const teamStats = prevMatch.statistics[team === 'A' ? 'teamA' : 'teamB'];
        const newMatch: Match = {
          ...prevMatch,
          statistics: {
            ...prevMatch.statistics,
            [team === 'A' ? 'teamA' : 'teamB']: {
              ...teamStats,
              [category]: Math.max(
                0,
                ((teamStats as any)[category] || 0) + delta
              ),
            },
          },
          updatedAt: new Date().toISOString(),
        };

        // Синхронизация с localStorage для ТВ-табло
        try {
          localStorage.setItem('currentMatch', JSON.stringify(newMatch));
          window.dispatchEvent(new CustomEvent('matchUpdated', { detail: newMatch }));
        } catch (e) {
          console.error('Ошибка синхронизации матча:', e);
        }

        return newMatch;
      });
    },
    []
  );

  /**
   * Переключает расширенную статистику
   */
  const toggleStatistics = useCallback((enabled: boolean) => {
    setMatch((prevMatch) => {
      if (!prevMatch) return prevMatch;

      const newMatch = {
        ...prevMatch,
        statistics: {
          ...prevMatch.statistics,
          enabled,
        },
        updatedAt: new Date().toISOString(),
      };

      // Синхронизация с localStorage для ТВ-табло
      syncMatchToTV(newMatch);

      return newMatch;
    });
  }, []);

  /**
   * Взять тайм-аут для команды
   */
  const takeTimeout = useCallback((team: 'A' | 'B') => {
    setMatch((prevMatch) => {
      if (!prevMatch) return prevMatch;

      // Проверяем, что партия начата
      if (prevMatch.currentSet.status !== SET_STATUS.IN_PROGRESS) {
        return prevMatch;
      }

      // Проверяем, что команда еще не использовала все тайм-ауты (максимум 2 на партию)
      const currentTimeouts = prevMatch.timeouts[team === 'A' ? 'teamA' : 'teamB'];
      if (currentTimeouts >= 2) {
        void window.electronAPI?.showMessage?.({ message: `Команда ${team === 'A' ? 'А' : 'Б'} уже использовала все тайм-ауты в этой партии` });
        return prevMatch;
      }

      // Проверяем, нет ли уже активного тайм-аута
      if (prevMatch.timeouts.activeTimeout) {
        void window.electronAPI?.showMessage?.({ message: 'Тайм-аут уже идет' });
        return prevMatch;
      }

      const newMatch = {
        ...prevMatch,
        timeouts: {
          ...prevMatch.timeouts,
          [team === 'A' ? 'teamA' : 'teamB']: currentTimeouts + 1,
          activeTimeout: {
            team,
            startTime: Date.now(),
            duration: 30000, // 30 секунд
          },
        },
        updatedAt: new Date().toISOString(),
      };

      // Сохраняем в историю
      HistoryService.addAction({
        type: 'timeout',
        timestamp: Date.now(),
        data: { team },
        previousState: prevMatch,
      });

      // Синхронизация с localStorage для ТВ-табло
      syncMatchToTV(newMatch);

      return newMatch;
    });
  }, []);

  /**
   * Сбросить тайм-аут для команды (отмена последнего тайм-аута)
   */
  const resetTimeout = useCallback((team: 'A' | 'B') => {
    setMatch((prevMatch) => {
      if (!prevMatch) return prevMatch;

      const currentTimeouts = prevMatch.timeouts[team === 'A' ? 'teamA' : 'teamB'];
      if (currentTimeouts <= 0) {
        return prevMatch;
      }

      const newMatch = {
        ...prevMatch,
        timeouts: {
          ...prevMatch.timeouts,
          [team === 'A' ? 'teamA' : 'teamB']: currentTimeouts - 1,
          activeTimeout: prevMatch.timeouts.activeTimeout?.team === team ? null : prevMatch.timeouts.activeTimeout,
        },
        updatedAt: new Date().toISOString(),
      };

      // Синхронизация с localStorage для ТВ-табло
      syncMatchToTV(newMatch);

      return newMatch;
    });
  }, []);

  /**
   * Завершить активный тайм-аут
   */
  const endActiveTimeout = useCallback(() => {
    setMatch((prevMatch) => {
      if (!prevMatch || !prevMatch.timeouts.activeTimeout) return prevMatch;

      const newMatch = {
        ...prevMatch,
        timeouts: {
          ...prevMatch.timeouts,
          activeTimeout: null,
        },
        updatedAt: new Date().toISOString(),
      };

      // Синхронизация с localStorage для ТВ-табло
      syncMatchToTV(newMatch);

      return newMatch;
    });
  }, []);

  // Вычисляемые значения (с проверкой на null)
  const rules = match ? getRules(match as unknown as MatchWithVariant) : null;
  const setballInfo =
    match?.currentSet && match.currentSet.status === SET_STATUS.IN_PROGRESS && rules
      ? rules.isSetball(match.currentSet.scoreA, match.currentSet.scoreB, match.currentSet.setNumber)
      : { isSetball: false, team: null };
  const matchballInfo =
    match?.currentSet && match?.sets && match.currentSet.status === SET_STATUS.IN_PROGRESS && rules
      ? rules.isMatchball(
          match.sets,
          match.currentSet.setNumber,
          match.currentSet.scoreA,
          match.currentSet.scoreB
        )
      : { isMatchball: false, team: null };
  const canFinish = match?.currentSet && rules
    ? rules.canFinishSet(match.currentSet.scoreA, match.currentSet.scoreB, match.currentSet.setNumber)
    : false;

  // Получаем размер истории
  const hasHistory = HistoryService.getHistorySize() > 0;

  return {
    match,
    setMatch,
    changeScore,
    changeServingTeam,
    finishSet,
    startSet,
    toggleSetStatus,
    updateSet,
    changeStatistics,
    toggleStatistics,
    undoLastAction,
    takeTimeout,
    resetTimeout,
    endActiveTimeout,
    isSetballNow: setballInfo.isSetball,
    setballTeam: setballInfo.team,
    isMatchballNow: matchballInfo.isMatchball,
    matchballTeam: matchballInfo.team,
    canFinish,
    hasHistory,
    currentSetStatus: match?.currentSet?.status || SET_STATUS.PENDING,
  };
}
