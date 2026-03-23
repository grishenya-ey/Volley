export function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) {
        return null;
    }
    if (endTime < startTime) {
        console.warn('calculateDuration: endTime раньше startTime');
        return null;
    }
    return Math.round((endTime - startTime) / 60000);
}
export function formatDuration(minutes) {
    if (minutes === null || minutes === undefined || isNaN(minutes)) {
        return '';
    }
    return `${minutes}'`;
}
export function toTimestamp(date) {
    if (typeof date === 'number') {
        return date;
    }
    if (typeof date === 'string') {
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) {
            throw new Error(`Некорректная дата: ${date}`);
        }
        return parsed.getTime();
    }
    if (date instanceof Date) {
        return date.getTime();
    }
    throw new Error('Неподдерживаемый тип данных для конвертации в timestamp');
}
export function formatTimestamp(timestamp, timezone) {
    if (!timestamp)
        return '';
    const date = new Date(timestamp);
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    };
    if (timezone) {
        options.timeZone = timezone;
    }
    return date.toLocaleString('ru-RU', options);
}
