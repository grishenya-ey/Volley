import { SET_STATUS } from '../types/Match';
export class SetStateMachine {
    static canTransition(from, to, context) {
        if (from === SET_STATUS.PENDING && to === SET_STATUS.IN_PROGRESS) {
            return true;
        }
        if (from === SET_STATUS.IN_PROGRESS && to === SET_STATUS.COMPLETED) {
            return true;
        }
        if (from === SET_STATUS.IN_PROGRESS && to === SET_STATUS.PENDING) {
            return true;
        }
        if (from === SET_STATUS.COMPLETED && to === SET_STATUS.IN_PROGRESS) {
            return context?.hasNextSet === false;
        }
        return false;
    }
    static getAvailableTransitions(currentStatus, context) {
        const available = [];
        if (currentStatus === SET_STATUS.PENDING) {
            available.push(SET_STATUS.IN_PROGRESS);
        }
        else if (currentStatus === SET_STATUS.IN_PROGRESS) {
            available.push(SET_STATUS.COMPLETED);
            available.push(SET_STATUS.PENDING);
        }
        else if (currentStatus === SET_STATUS.COMPLETED) {
            if (context?.hasNextSet === false) {
                available.push(SET_STATUS.IN_PROGRESS);
            }
            available.push(SET_STATUS.COMPLETED);
        }
        return available;
    }
}
