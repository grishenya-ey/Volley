import { SET_STATUS } from '../types/Match';
export class SetDomain {
    static isCurrentSet(setNumber, currentSet) {
        return currentSet.setNumber === setNumber &&
            currentSet.status === SET_STATUS.IN_PROGRESS;
    }
    static isCompleted(set) {
        return set.completed === true || set.status === SET_STATUS.COMPLETED;
    }
    static calculateNextSetNumber(match) {
        if (match.sets.length > 0) {
            const maxSetNumberInSets = Math.max(...match.sets.map(s => s.setNumber));
            return maxSetNumberInSets + 1;
        }
        else {
            if (match.currentSet.setNumber && match.currentSet.status === SET_STATUS.PENDING) {
                return match.currentSet.setNumber;
            }
            else {
                return 1;
            }
        }
    }
    static processTimeForStatus(set, newStatus) {
        const updatedSet = { ...set };
        if (newStatus === SET_STATUS.PENDING) {
            updatedSet.startTime = undefined;
            updatedSet.endTime = undefined;
            if ('duration' in updatedSet) {
                updatedSet.duration = undefined;
            }
            if ('completed' in updatedSet) {
                updatedSet.completed = false;
            }
        }
        else if (newStatus === SET_STATUS.IN_PROGRESS) {
            updatedSet.endTime = undefined;
            if ('duration' in updatedSet) {
                updatedSet.duration = undefined;
            }
            if ('completed' in updatedSet) {
                updatedSet.completed = false;
            }
        }
        else if (newStatus === SET_STATUS.COMPLETED) {
            if ('completed' in updatedSet) {
                updatedSet.completed = true;
            }
        }
        return updatedSet;
    }
    static protectCurrentSet(currentSet) {
        if (currentSet.status === SET_STATUS.IN_PROGRESS) {
            return { ...currentSet };
        }
        if (currentSet.status !== SET_STATUS.PENDING) {
            return {
                ...currentSet,
                status: SET_STATUS.PENDING,
                scoreA: currentSet.scoreA,
                scoreB: currentSet.scoreB,
            };
        }
        return {
            ...currentSet,
            scoreA: currentSet.scoreA,
            scoreB: currentSet.scoreB,
        };
    }
    static findSet(match, setNumber) {
        if (match.currentSet.setNumber === setNumber) {
            return match.currentSet;
        }
        const set = match.sets.find(s => s.setNumber === setNumber);
        return set || null;
    }
}
