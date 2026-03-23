/**
 * Мок для shared/types/Match (константы состояний партий)
 */

export const SET_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;
