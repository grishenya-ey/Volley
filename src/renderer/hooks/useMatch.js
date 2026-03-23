import { useState, useCallback, useEffect, useRef } from 'react';
import { SET_STATUS } from '../../shared/types/Match';
import { getRules } from '../../shared/volleyballRules';
import { migrateMatchToSetStatus } from '../../shared/matchMigration';
import { SetService } from '../../shared/services/SetService';
import { ScoreService } from '../../shared/services/ScoreService';
import { HistoryService } from '../../shared/services/HistoryService';
export function useMatch(initialMatch) {
    const migratedMatch = initialMatch
        ? migrateMatchToSetStatus(initialMatch)
        : null;
    const [match, setMatch] = useState(migratedMatch);
    const prevInitialMatchRef = useRef(initialMatch);
    const lastStatsUpdateRef = useRef({
        team: null,
        category: null,
        timestamp: 0,
    });
    useEffect(() => {
        if (initialMatch) {
            const prevMatch = prevInitialMatchRef.current;
            if (!prevMatch ||
                prevMatch.matchId !== initialMatch.matchId ||
                prevMatch.updatedAt !== initialMatch.updatedAt) {
                const migratedMatch = migrateMatchToSetStatus(initialMatch);
                setMatch(migratedMatch);
                prevInitialMatchRef.current = migratedMatch;
            }
        }
    }, [initialMatch]);
    const undoLastAction = useCallback(() => {
        try {
            const lastAction = HistoryService.undoLastAction();
            if (!lastAction || !lastAction.previousState) {
                return false;
            }
            const currentLogoA = match?.teamA?.logo || match?.teamA?.logoBase64;
            const currentLogoB = match?.teamB?.logo || match?.teamB?.logoBase64;
            const currentLogoPathA = match?.teamA?.logoPath;
            const currentLogoPathB = match?.teamB?.logoPath;
            const previousMatch = lastAction.previousState;
            if (previousMatch.teamA) {
                if (currentLogoA) {
                    previousMatch.teamA.logo = currentLogoA;
                    previousMatch.teamA.logoBase64 = currentLogoA;
                }
                if (currentLogoPathA) {
                    previousMatch.teamA.logoPath = currentLogoPathA;
                }
            }
            if (previousMatch.teamB) {
                if (currentLogoB) {
                    previousMatch.teamB.logo = currentLogoB;
                    previousMatch.teamB.logoBase64 = currentLogoB;
                }
                if (currentLogoPathB) {
                    previousMatch.teamB.logoPath = currentLogoPathB;
                }
            }
            previousMatch.updatedAt = new Date().toISOString();
            setMatch(previousMatch);
            return true;
        }
        catch (error) {
            console.error('Ошибка при отмене действия:', error);
            return false;
        }
    }, [match]);
    const changeScore = useCallback((team, delta) => {
        if (!match)
            return;
        if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
            return;
        }
        setMatch((prevMatch) => {
            if (!prevMatch)
                return prevMatch;
            try {
                HistoryService.addAction({
                    type: 'score_change',
                    timestamp: Date.now(),
                    data: { team, delta },
                    previousState: prevMatch,
                });
                return ScoreService.changeScore(prevMatch, team, delta);
            }
            catch (error) {
                console.error('Ошибка при изменении счета:', error);
                return prevMatch;
            }
        });
    }, [match]);
    const changeServingTeam = useCallback((team) => {
        if (!match)
            return;
        if (team !== 'A' && team !== 'B') {
            console.warn('changeServingTeam: некорректная команда', team);
            return;
        }
        setMatch((prevMatch) => {
            if (!prevMatch)
                return prevMatch;
            try {
                const newMatch = ScoreService.changeServingTeam(prevMatch, team);
                if (newMatch !== prevMatch) {
                    HistoryService.addAction({
                        type: 'serve_change',
                        timestamp: Date.now(),
                        data: { team },
                        previousState: prevMatch,
                    });
                }
                return newMatch;
            }
            catch (error) {
                console.error('Ошибка при изменении подачи:', error);
                return prevMatch;
            }
        });
    }, [match]);
    const startSet = useCallback(() => {
        if (!match)
            return;
        setMatch((prevMatch) => {
            if (!prevMatch)
                return prevMatch;
            if (prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS) {
                console.warn('Партия уже начата');
                return prevMatch;
            }
            try {
                HistoryService.addAction({
                    type: 'start_set',
                    timestamp: Date.now(),
                    data: {},
                    previousState: prevMatch,
                });
                return SetService.startSet(prevMatch);
            }
            catch (error) {
                console.error('Ошибка при начале партии:', error);
                return prevMatch;
            }
        });
    }, [match]);
    const finishSet = useCallback(() => {
        if (!match)
            return;
        setMatch((prevMatch) => {
            if (!prevMatch)
                return prevMatch;
            try {
                HistoryService.addAction({
                    type: 'finish_set',
                    timestamp: Date.now(),
                    data: {},
                    previousState: prevMatch,
                });
                return SetService.finishSet(prevMatch);
            }
            catch (error) {
                console.error('Ошибка при завершении партии:', error);
                if (error instanceof Error && error.message.includes('не может быть завершена')) {
                    void window.electronAPI?.showMessage?.({ message: error.message });
                }
                return prevMatch;
            }
        });
    }, [match]);
    const toggleSetStatus = useCallback(() => {
        if (!match)
            return;
        const currentStatus = match.currentSet.status || SET_STATUS.PENDING;
        if (currentStatus === SET_STATUS.PENDING) {
            startSet();
        }
        else if (currentStatus === SET_STATUS.IN_PROGRESS) {
            finishSet();
        }
    }, [match, startSet, finishSet]);
    const updateSet = useCallback((setNumber, updates) => {
        if (!match)
            return false;
        setMatch((prevMatch) => {
            if (!prevMatch)
                return prevMatch;
            try {
                HistoryService.addAction({
                    type: 'set_update',
                    timestamp: Date.now(),
                    data: { setNumber, updates },
                    previousState: prevMatch,
                });
                return SetService.updateSet(prevMatch, setNumber, updates);
            }
            catch (error) {
                console.error('Ошибка при обновлении партии:', error);
                if (error instanceof Error) {
                    void window.electronAPI?.showMessage?.({ message: error.message });
                }
                return prevMatch;
            }
        });
        return true;
    }, [match]);
    const changeStatistics = useCallback((team, category, delta, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const now = Date.now();
        const lastUpdate = lastStatsUpdateRef.current;
        if (lastUpdate.team === team &&
            lastUpdate.category === category &&
            now - lastUpdate.timestamp < 100) {
            return;
        }
        lastStatsUpdateRef.current = { team, category, timestamp: now };
        setMatch((prevMatch) => {
            if (!prevMatch)
                return prevMatch;
            const teamStats = prevMatch.statistics[team === 'A' ? 'teamA' : 'teamB'];
            const newMatch = {
                ...prevMatch,
                statistics: {
                    ...prevMatch.statistics,
                    [team === 'A' ? 'teamA' : 'teamB']: {
                        ...teamStats,
                        [category]: Math.max(0, (teamStats[category] || 0) + delta),
                    },
                },
                updatedAt: new Date().toISOString(),
            };
            return newMatch;
        });
    }, []);
    const toggleStatistics = useCallback((enabled) => {
        setMatch((prevMatch) => {
            if (!prevMatch)
                return prevMatch;
            return {
                ...prevMatch,
                statistics: {
                    ...prevMatch.statistics,
                    enabled,
                },
                updatedAt: new Date().toISOString(),
            };
        });
    }, []);
    const rules = match ? getRules(match) : null;
    const setballInfo = match?.currentSet && match.currentSet.status === SET_STATUS.IN_PROGRESS && rules
        ? rules.isSetball(match.currentSet.scoreA, match.currentSet.scoreB, match.currentSet.setNumber)
        : { isSetball: false, team: null };
    const matchballInfo = match?.currentSet && match?.sets && match.currentSet.status === SET_STATUS.IN_PROGRESS && rules
        ? rules.isMatchball(match.sets, match.currentSet.setNumber, match.currentSet.scoreA, match.currentSet.scoreB)
        : { isMatchball: false, team: null };
    const canFinish = match?.currentSet && rules
        ? rules.canFinishSet(match.currentSet.scoreA, match.currentSet.scoreB, match.currentSet.setNumber)
        : false;
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
        isSetballNow: setballInfo.isSetball,
        setballTeam: setballInfo.team,
        isMatchballNow: matchballInfo.isMatchball,
        matchballTeam: matchballInfo.team,
        canFinish,
        hasHistory,
        currentSetStatus: match?.currentSet?.status || SET_STATUS.PENDING,
    };
}
