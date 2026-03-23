import { SET_STATUS } from '../types/Match';
export class ScoreService {
    static changeScore(match, team, delta) {
        if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
            throw new Error('Партия не начата');
        }
        if (team !== 'A' && team !== 'B') {
            throw new Error('Некорректная команда');
        }
        const currentScore = team === 'A' ? match.currentSet.scoreA : match.currentSet.scoreB;
        const newScore = Math.max(0, currentScore + delta);
        const newServingTeam = delta > 0 ? team : match.currentSet.servingTeam;
        const newMatch = {
            ...match,
            currentSet: {
                ...match.currentSet,
                scoreA: team === 'A' ? newScore : match.currentSet.scoreA,
                scoreB: team === 'B' ? newScore : match.currentSet.scoreB,
                servingTeam: newServingTeam,
            },
            updatedAt: new Date().toISOString(),
        };
        return newMatch;
    }
    static changeServingTeam(match, team) {
        if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
            throw new Error('Партия не начата');
        }
        if (team !== 'A' && team !== 'B') {
            throw new Error('Некорректная команда');
        }
        if (match.currentSet.servingTeam === team) {
            return match;
        }
        const newMatch = {
            ...match,
            currentSet: {
                ...match.currentSet,
                servingTeam: team,
            },
            updatedAt: new Date().toISOString(),
        };
        return newMatch;
    }
}
