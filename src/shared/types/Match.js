export const SET_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
};
export var SET_STATUS_ENUM;
(function (SET_STATUS_ENUM) {
    SET_STATUS_ENUM["PENDING"] = "pending";
    SET_STATUS_ENUM["IN_PROGRESS"] = "in_progress";
    SET_STATUS_ENUM["COMPLETED"] = "completed";
})(SET_STATUS_ENUM || (SET_STATUS_ENUM = {}));
export function createNewMatch() {
    const now = new Date().toISOString();
    const defaultTimezone = typeof Intl !== 'undefined' && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC';
    return {
        matchId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateUUID(),
        variant: 'indoor',
        tournament: '',
        tournamentSubtitle: '',
        location: '',
        venue: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        timezone: defaultTimezone,
        teamA: {
            name: 'Команда А',
            color: '#3498db',
            liberoColor: undefined,
            logo: undefined,
            coach: '',
            roster: [],
        },
        teamB: {
            name: 'Команда Б',
            color: '#e74c3c',
            liberoColor: undefined,
            logo: undefined,
            coach: '',
            roster: [],
        },
        officials: {
            referee1: '',
            referee2: '',
            lineJudge1: '',
            lineJudge2: '',
            scorer: '',
        },
        sets: [],
        currentSet: {
            setNumber: 1,
            scoreA: 0,
            scoreB: 0,
            servingTeam: 'A',
            status: SET_STATUS.PENDING,
        },
        statistics: {
            enabled: false,
            teamA: {
                attack: 0,
                block: 0,
                serve: 0,
                opponentErrors: 0,
            },
            teamB: {
                attack: 0,
                block: 0,
                serve: 0,
                opponentErrors: 0,
            },
        },
        createdAt: now,
        updatedAt: now,
    };
}
export function validateMatch(match) {
    if (!match || typeof match !== 'object') {
        return false;
    }
    if (!match.matchId || typeof match.matchId !== 'string') {
        return false;
    }
    if (!match.teamA || !match.teamB) {
        return false;
    }
    if (!match.teamA.name || !match.teamB.name) {
        return false;
    }
    if (!match.currentSet) {
        return false;
    }
    if (!match.currentSet.status || typeof match.currentSet.status !== 'string') {
        return false;
    }
    if (!Array.isArray(match.sets)) {
        return false;
    }
    for (const set of match.sets) {
        if (!set.status || typeof set.status !== 'string') {
            return false;
        }
    }
    if (!match.statistics) {
        return false;
    }
    return true;
}
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
