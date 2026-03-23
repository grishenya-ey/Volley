/**
 * Тесты для SetStateMachine
 */

import { SetStateMachine } from '../../../src/shared/domain/SetStateMachine';
import { SET_STATUS } from '../../../src/shared/types/Match';
import type { TransitionContext } from '../../../src/shared/domain/SetStateMachine';

describe('SetStateMachine', () => {
  describe('canTransition', () => {
    it('должен разрешать переход PENDING → IN_PROGRESS', () => {
      expect(
        SetStateMachine.canTransition(SET_STATUS.PENDING, SET_STATUS.IN_PROGRESS)
      ).toBe(true);
    });

    it('должен разрешать переход IN_PROGRESS → COMPLETED', () => {
      expect(
        SetStateMachine.canTransition(SET_STATUS.IN_PROGRESS, SET_STATUS.COMPLETED)
      ).toBe(true);
    });

    it('должен разрешать переход IN_PROGRESS → PENDING', () => {
      expect(
        SetStateMachine.canTransition(SET_STATUS.IN_PROGRESS, SET_STATUS.PENDING)
      ).toBe(true);
    });

    it('должен разрешать переход COMPLETED → IN_PROGRESS, если следующая партия не началась', () => {
      const context: TransitionContext = { hasNextSet: false };
      expect(
        SetStateMachine.canTransition(SET_STATUS.COMPLETED, SET_STATUS.IN_PROGRESS, context)
      ).toBe(true);
    });

    it('должен запрещать переход COMPLETED → IN_PROGRESS, если следующая партия уже началась', () => {
      const context: TransitionContext = { hasNextSet: true };
      expect(
        SetStateMachine.canTransition(SET_STATUS.COMPLETED, SET_STATUS.IN_PROGRESS, context)
      ).toBe(false);
    });

    it('должен запрещать переход PENDING → COMPLETED', () => {
      expect(
        SetStateMachine.canTransition(SET_STATUS.PENDING, SET_STATUS.COMPLETED)
      ).toBe(false);
    });

    it('должен запрещать переход COMPLETED → PENDING', () => {
      expect(
        SetStateMachine.canTransition(SET_STATUS.COMPLETED, SET_STATUS.PENDING)
      ).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('должен возвращать [IN_PROGRESS] для PENDING', () => {
      const result = SetStateMachine.getAvailableTransitions(SET_STATUS.PENDING);
      expect(result).toEqual([SET_STATUS.IN_PROGRESS]);
    });

    it('должен возвращать [COMPLETED, PENDING] для IN_PROGRESS', () => {
      const result = SetStateMachine.getAvailableTransitions(SET_STATUS.IN_PROGRESS);
      expect(result).toContain(SET_STATUS.COMPLETED);
      expect(result).toContain(SET_STATUS.PENDING);
      expect(result.length).toBe(2);
    });

    it('должен возвращать [IN_PROGRESS, COMPLETED] для COMPLETED, если следующая партия не началась', () => {
      const context: TransitionContext = { hasNextSet: false };
      const result = SetStateMachine.getAvailableTransitions(SET_STATUS.COMPLETED, context);
      expect(result).toContain(SET_STATUS.IN_PROGRESS);
      expect(result).toContain(SET_STATUS.COMPLETED);
      expect(result.length).toBe(2);
    });

    it('должен возвращать только [COMPLETED] для COMPLETED, если следующая партия уже началась', () => {
      const context: TransitionContext = { hasNextSet: true };
      const result = SetStateMachine.getAvailableTransitions(SET_STATUS.COMPLETED, context);
      expect(result).toEqual([SET_STATUS.COMPLETED]);
    });
  });
});
