import { RULES_CONFIGS, VARIANTS } from './volleyballRulesConfig';
export function createRules(config) {
    const isDecidingSet = (setNumber) => setNumber === config.decidingSetNumber;
    const getSetballThreshold = (setNumber) => isDecidingSet(setNumber) ? config.setballThresholdDeciding : config.setballThresholdRegular;
    const getFinishThreshold = (setNumber) => isDecidingSet(setNumber) ? config.pointsToWinDecidingSet : config.pointsToWinRegularSet;
    return {
        isSetball(scoreA, scoreB, setNumber = 1) {
            const setballThreshold = getSetballThreshold(setNumber);
            const maxScore = Math.max(scoreA, scoreB);
            const minScore = Math.min(scoreA, scoreB);
            if (maxScore >= setballThreshold && maxScore - minScore >= 1 && scoreA !== scoreB) {
                return { isSetball: true, team: scoreA > scoreB ? 'A' : 'B' };
            }
            return { isSetball: false, team: null };
        },
        isMatchball(sets, currentSetNumber, scoreA, scoreB) {
            const winsA = sets.filter(s => (s.completed === true || s.status === 'completed') && s.scoreA > s.scoreB).length;
            const winsB = sets.filter(s => (s.completed === true || s.status === 'completed') && s.scoreB > s.scoreA).length;
            const oneWinAway = config.setsToWinMatch - 1;
            if (winsA === oneWinAway || winsB === oneWinAway) {
                const sb = this.isSetball(scoreA, scoreB, currentSetNumber);
                if (sb.isSetball && ((sb.team === 'A' && winsA === oneWinAway) || (sb.team === 'B' && winsB === oneWinAway))) {
                    return { isMatchball: true, team: sb.team };
                }
            }
            return { isMatchball: false, team: null };
        },
        canFinishSet(scoreA, scoreB, setNumber = 1) {
            const finishThreshold = getFinishThreshold(setNumber);
            const tieThreshold = finishThreshold - 1;
            const maxScore = Math.max(scoreA, scoreB);
            const minScore = Math.min(scoreA, scoreB);
            if (maxScore >= finishThreshold && maxScore - minScore >= 2)
                return true;
            if (maxScore >= tieThreshold && minScore >= tieThreshold && maxScore - minScore >= 2)
                return true;
            return false;
        },
        getSetWinner(scoreA, scoreB) {
            if (scoreA > scoreB)
                return 'A';
            if (scoreB > scoreA)
                return 'B';
            return null;
        },
        getMatchWinner(sets) {
            const completed = sets.filter(s => s.completed === true || s.status === 'completed');
            const winsA = completed.filter(s => s.scoreA > s.scoreB).length;
            const winsB = completed.filter(s => s.scoreB > s.scoreA).length;
            if (winsA >= config.setsToWinMatch)
                return 'A';
            if (winsB >= config.setsToWinMatch)
                return 'B';
            return null;
        },
        isMatchFinished(sets) {
            return this.getMatchWinner(sets) !== null;
        },
        getConfig: () => config,
    };
}
export function getRules(match) {
    const variant = match?.variant ?? VARIANTS.INDOOR;
    const config = RULES_CONFIGS[variant] ?? RULES_CONFIGS[VARIANTS.INDOOR];
    return createRules(config);
}
export function getSetNumbers(match) {
    const config = getRules(match).getConfig();
    return Array.from({ length: config.maxSets }, (_, i) => i + 1);
}
export function isDecidingSet(setNumber, match) {
    return getRules(match).getConfig().decidingSetNumber === setNumber;
}
export { RULES_CONFIGS, VARIANTS };
