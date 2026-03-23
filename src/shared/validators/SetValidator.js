import { SET_STATUS } from '../types/Match';
import { getRules } from '../volleyballRules';
export class SetValidator {
    static validateSetUpdate(set, updates, currentSetNumber, match) {
        const errors = [];
        const finalScoreA = updates.scoreA !== undefined ? updates.scoreA : set.scoreA;
        const finalScoreB = updates.scoreB !== undefined ? updates.scoreB : set.scoreB;
        const finalStatus = updates.status !== undefined ? updates.status : set.status;
        const finalStartTime = updates.startTime !== undefined ? updates.startTime : set.startTime;
        const finalEndTime = updates.endTime !== undefined ? updates.endTime : set.endTime;
        if (finalScoreA < 0 || finalScoreB < 0) {
            errors.push('Счет не может быть отрицательным');
        }
        if (updates.status !== undefined) {
            if (!Object.values(SET_STATUS).includes(updates.status)) {
                errors.push('Некорректный статус партии');
            }
        }
        if (finalStartTime && finalEndTime) {
            if (finalEndTime < finalStartTime) {
                errors.push('Время завершения не может быть раньше времени начала');
            }
        }
        if (finalStatus === SET_STATUS.COMPLETED ||
            (set.status === SET_STATUS.COMPLETED && finalStatus !== SET_STATUS.PENDING)) {
            const rules = match ? getRules(match) : getRules({ variant: 'indoor' });
            if (!rules.canFinishSet(finalScoreA, finalScoreB, set.setNumber)) {
                const cfg = rules.getConfig();
                const threshold = set.setNumber === cfg.decidingSetNumber ? cfg.pointsToWinDecidingSet : cfg.pointsToWinRegularSet;
                errors.push(`Счет не соответствует правилам завершения партии. ` +
                    `Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`);
            }
        }
        if (finalStatus === SET_STATUS.COMPLETED) {
            if (!finalStartTime || !finalEndTime) {
                errors.push('Завершенная партия должна иметь время начала и завершения');
            }
        }
        if (set.status === SET_STATUS.COMPLETED && finalStatus === SET_STATUS.IN_PROGRESS) {
            if (finalEndTime !== undefined && finalEndTime !== null) {
                errors.push('Нельзя перевести завершенную партию в статус "В игре" без удаления времени завершения');
            }
        }
        if (finalStatus === SET_STATUS.COMPLETED && finalStartTime && finalEndTime && match) {
            const setNumber = set.setNumber;
            const previousSet = match.sets.find(s => s.setNumber === setNumber - 1);
            if (previousSet && previousSet.startTime && previousSet.endTime) {
                if (finalStartTime < previousSet.endTime) {
                    errors.push(`Время начала партии ${setNumber} пересекается с временем окончания партии ${setNumber - 1}`);
                }
            }
            const nextSetNumber = setNumber + 1;
            const nextSet = match.sets.find(s => s.setNumber === nextSetNumber);
            if (nextSet && nextSet.startTime && nextSet.endTime) {
                if (finalEndTime > nextSet.startTime) {
                    errors.push(`Время окончания партии ${setNumber} пересекается с временем начала партии ${nextSetNumber}`);
                }
            }
            if (match.currentSet && match.currentSet.setNumber === nextSetNumber && match.currentSet.startTime) {
                if (finalEndTime > match.currentSet.startTime) {
                    errors.push(`Время окончания партии ${setNumber} пересекается с временем начала партии ${nextSetNumber}`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    static validateScore(scoreA, scoreB) {
        const errors = [];
        if (scoreA < 0) {
            errors.push('Счет команды A не может быть отрицательным');
        }
        if (scoreB < 0) {
            errors.push('Счет команды B не может быть отрицательным');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    static validateStatus(status) {
        const errors = [];
        if (!Object.values(SET_STATUS).includes(status)) {
            errors.push('Некорректный статус партии');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
