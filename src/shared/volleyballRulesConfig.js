export const VARIANTS = {
    INDOOR: 'indoor',
    BEACH: 'beach',
    SNOW: 'snow',
};
export const RULES_CONFIGS = {
    [VARIANTS.INDOOR]: {
        setsToWinMatch: 3,
        maxSets: 5,
        pointsToWinRegularSet: 25,
        pointsToWinDecidingSet: 15,
        decidingSetNumber: 5,
        setballThresholdRegular: 24,
        setballThresholdDeciding: 14,
    },
    [VARIANTS.BEACH]: {
        setsToWinMatch: 2,
        maxSets: 3,
        pointsToWinRegularSet: 21,
        pointsToWinDecidingSet: 15,
        decidingSetNumber: 3,
        setballThresholdRegular: 20,
        setballThresholdDeciding: 14,
    },
    [VARIANTS.SNOW]: {
        setsToWinMatch: 2,
        maxSets: 3,
        pointsToWinRegularSet: 15,
        pointsToWinDecidingSet: 15,
        decidingSetNumber: 3,
        setballThresholdRegular: 14,
        setballThresholdDeciding: 14,
    },
};
const REQUIRED_CONFIG_KEYS = [
    'setsToWinMatch',
    'maxSets',
    'pointsToWinRegularSet',
    'pointsToWinDecidingSet',
    'decidingSetNumber',
    'setballThresholdRegular',
    'setballThresholdDeciding',
];
export function validateRulesConfig(config) {
    const errors = [];
    if (!config || typeof config !== 'object') {
        return ['Конфиг отсутствует или не является объектом'];
    }
    for (const key of REQUIRED_CONFIG_KEYS) {
        const value = config[key];
        if (value === undefined || value === null) {
            errors.push(`Отсутствует ключ: ${key}`);
        }
        else if (typeof value !== 'number' || value < 1) {
            errors.push(`Некорректное значение для ${key}: ${value}`);
        }
    }
    return errors;
}
