import { SET_STATUS } from '../types/Match';
import { SetDomain } from '../domain/SetDomain';
import { SetValidator } from '../validators/SetValidator';
import { getRules } from '../volleyballRules';
import { calculateDuration } from '../timeUtils';
export class SetService {
    static startSet(match) {
        if (match.currentSet.status !== SET_STATUS.PENDING) {
            throw new Error('Партия уже начата или завершена');
        }
        const nextSetNumber = SetDomain.calculateNextSetNumber(match);
        const newMatch = {
            ...match,
            currentSet: {
                ...match.currentSet,
                setNumber: nextSetNumber,
                status: SET_STATUS.IN_PROGRESS,
                scoreA: 0,
                scoreB: 0,
                startTime: Date.now(),
            },
            updatedAt: new Date().toISOString(),
        };
        return newMatch;
    }
    static finishSet(match) {
        if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
            throw new Error('Партия не начата');
        }
        const { scoreA, scoreB, setNumber, startTime } = match.currentSet;
        const rules = getRules(match);
        if (!rules.canFinishSet(scoreA, scoreB, setNumber)) {
            const cfg = rules.getConfig();
            const threshold = setNumber === cfg.decidingSetNumber ? cfg.pointsToWinDecidingSet : cfg.pointsToWinRegularSet;
            throw new Error(`Партия не может быть завершена. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`);
        }
        const endTime = Date.now();
        const duration = startTime ? calculateDuration(startTime, endTime) : undefined;
        const completedSet = {
            setNumber: match.currentSet.setNumber,
            scoreA,
            scoreB,
            completed: true,
            status: SET_STATUS.COMPLETED,
            startTime: startTime || undefined,
            endTime,
            duration: duration || undefined,
        };
        const winner = rules.getSetWinner(scoreA, scoreB);
        const servingTeam = winner || 'A';
        const newMatch = {
            ...match,
            sets: [...match.sets, completedSet],
            currentSet: {
                ...match.currentSet,
                servingTeam: servingTeam,
                status: SET_STATUS.PENDING,
                startTime: undefined,
                endTime: undefined,
            },
            updatedAt: new Date().toISOString(),
        };
        return newMatch;
    }
    static updateSet(match, setNumber, updates) {
        const set = SetDomain.findSet(match, setNumber);
        if (!set) {
            throw new Error('Партия не найдена');
        }
        const validation = SetValidator.validateSetUpdate(set, updates, match.currentSet.setNumber, match);
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }
        const isCurrentSet = SetDomain.isCurrentSet(setNumber, match.currentSet);
        let processedUpdates = { ...updates };
        if (updates.status !== undefined && updates.status !== set.status) {
            if (SetDomain.isCompleted(set)) {
                const processed = SetDomain.processTimeForStatus(set, updates.status);
                processedUpdates = {
                    ...processedUpdates,
                    startTime: processed.startTime,
                    endTime: processed.endTime,
                    duration: processed.duration,
                    completed: processed.completed,
                };
            }
        }
        if (updates.endTime === null) {
            processedUpdates.endTime = undefined;
        }
        if (updates.startTime === null) {
            processedUpdates.startTime = undefined;
        }
        if (isCurrentSet) {
            const updatedCurrentSet = {
                ...match.currentSet,
                ...processedUpdates,
            };
            if (processedUpdates.startTime !== undefined || processedUpdates.endTime !== undefined) {
                const startTime = updatedCurrentSet.startTime;
                const endTime = updatedCurrentSet.endTime;
                if (startTime && endTime) {
                    const duration = calculateDuration(startTime, endTime);
                    updatedCurrentSet.duration = duration ?? undefined;
                }
                else {
                    delete updatedCurrentSet.duration;
                }
            }
            return {
                ...match,
                currentSet: updatedCurrentSet,
                updatedAt: new Date().toISOString(),
            };
        }
        else {
            const setIndex = match.sets.findIndex(s => s.setNumber === setNumber);
            if (setIndex === -1) {
                throw new Error('Партия не найдена в массиве sets');
            }
            const updatedSet = {
                ...match.sets[setIndex],
                ...processedUpdates,
            };
            if (processedUpdates.startTime !== undefined || processedUpdates.endTime !== undefined) {
                const startTime = updatedSet.startTime;
                const endTime = updatedSet.endTime;
                if (startTime && endTime) {
                    const duration = calculateDuration(startTime, endTime);
                    updatedSet.duration = duration ?? undefined;
                }
                else {
                    delete updatedSet.duration;
                }
            }
            if (SetDomain.isCompleted(set) && updates.status === SET_STATUS.IN_PROGRESS) {
                const newSets = match.sets.filter(s => s.setNumber !== setNumber);
                return {
                    ...match,
                    sets: newSets,
                    currentSet: {
                        setNumber: updatedSet.setNumber,
                        scoreA: updatedSet.scoreA,
                        scoreB: updatedSet.scoreB,
                        servingTeam: match.currentSet.servingTeam,
                        status: SET_STATUS.IN_PROGRESS,
                        startTime: updatedSet.startTime,
                    },
                    updatedAt: new Date().toISOString(),
                };
            }
            return {
                ...match,
                sets: match.sets.map((s, i) => (i === setIndex ? updatedSet : s)),
                updatedAt: new Date().toISOString(),
            };
        }
    }
}
