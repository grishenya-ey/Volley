/**
 * Миграция данных матча к структуре с состояниями партий (SET_STATUS).
 */

import { SET_STATUS } from './types/Match';

/** Объект партии при миграции (частичная структура) */
interface SetLike {
  completed?: boolean;
  status?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  [key: string]: unknown;
}

/** Текущая партия при миграции */
interface CurrentSetLike {
  scoreA?: number;
  scoreB?: number;
  status?: string;
  startTime?: number;
  [key: string]: unknown;
}

/** Матч для миграции (частичная структура) */
export interface MatchForMigration {
  variant?: string;
  sets?: SetLike[];
  currentSet?: CurrentSetLike;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Мигрирует старые данные матча к новой структуре с состояниями партий.
 */
export function migrateMatchToSetStatus<T extends MatchForMigration>(match: T | null | undefined): T | null | undefined {
  if (!match) {
    return match;
  }

  const migrated = { ...match } as MatchForMigration & T;

  if (!migrated.variant || !['indoor', 'beach', 'snow'].includes(migrated.variant)) {
    migrated.variant = 'indoor';
  }

  if (Array.isArray(match.sets)) {
    migrated.sets = match.sets.map((set) => {
      const migratedSet = { ...set };
      if (set.completed && !set.status) {
        migratedSet.status = SET_STATUS.COMPLETED;
      }
      if (!set.completed && !set.status) {
        migratedSet.status = SET_STATUS.PENDING;
      }
      if (migratedSet.startTime && migratedSet.endTime) {
        migratedSet.duration = Math.round((migratedSet.endTime - migratedSet.startTime) / 60000);
      }
      return migratedSet;
    });
  }

  if (match.currentSet) {
    const currentSet = { ...match.currentSet };
    if (!currentSet.status) {
      if ((currentSet.scoreA ?? 0) > 0 || (currentSet.scoreB ?? 0) > 0) {
        currentSet.status = SET_STATUS.IN_PROGRESS;
        if (!currentSet.startTime && match.updatedAt) {
          try {
            currentSet.startTime = new Date(match.updatedAt).getTime();
          } catch (e) {
            console.warn('Ошибка при установке startTime из updatedAt:', e);
          }
        }
      } else {
        currentSet.status = SET_STATUS.PENDING;
      }
    }
    migrated.currentSet = currentSet;
  }

  return migrated as T;
}

/**
 * Проверяет, нужна ли миграция матча.
 */
export function needsMigration(match: MatchForMigration | null | undefined): boolean {
  if (!match) return false;

  if (Array.isArray(match.sets)) {
    const hasUnmigratedSet = match.sets.some(
      (set) => set.completed !== undefined && set.status === undefined
    );
    if (hasUnmigratedSet) return true;
  }

  if (match.currentSet && match.currentSet.status === undefined) {
    return true;
  }

  return false;
}

export { SET_STATUS };
