import { SET_STATUS } from './types/Match';
export function migrateMatchToSetStatus(match) {
    if (!match) {
        return match;
    }
    const migrated = { ...match };
    if (!migrated.variant || !['indoor', 'beach', 'snow'].includes(migrated.variant)) {
        migrated.variant = 'indoor';
    }
    if (Array.isArray(match.sets)) {
        migrated.sets = match.sets.map((set) => {
            const migratedSet = { ...set };
            if (set.completed && !set.status) {
                migratedSet.status = SET_STATUS.COMPLETED;
            }
            if (!set.completed && !set.status) {
                migratedSet.status = SET_STATUS.PENDING;
            }
            if (migratedSet.startTime && migratedSet.endTime) {
                migratedSet.duration = Math.round((migratedSet.endTime - migratedSet.startTime) / 60000);
            }
            return migratedSet;
        });
    }
    if (match.currentSet) {
        const currentSet = { ...match.currentSet };
        if (!currentSet.status) {
            if ((currentSet.scoreA ?? 0) > 0 || (currentSet.scoreB ?? 0) > 0) {
                currentSet.status = SET_STATUS.IN_PROGRESS;
                if (!currentSet.startTime && match.updatedAt) {
                    try {
                        currentSet.startTime = new Date(match.updatedAt).getTime();
                    }
                    catch (e) {
                        console.warn('Ошибка при установке startTime из updatedAt:', e);
                    }
                }
            }
            else {
                currentSet.status = SET_STATUS.PENDING;
            }
        }
        migrated.currentSet = currentSet;
    }
    return migrated;
}
export function needsMigration(match) {
    if (!match)
        return false;
    if (Array.isArray(match.sets)) {
        const hasUnmigratedSet = match.sets.some((set) => set.completed !== undefined && set.status === undefined);
        if (hasUnmigratedSet)
            return true;
    }
    if (match.currentSet && match.currentSet.status === undefined) {
        return true;
    }
    return false;
}
export { SET_STATUS };
