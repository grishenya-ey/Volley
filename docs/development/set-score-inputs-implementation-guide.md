# Руководство по реализации: Инпуты "Счет после X партии"

## 📋 Обзор

Этот документ содержит подробный план и инструкции для реализации функционала инпутов "Счет после X партии" (где X от 1 до 5). Эти инпуты уже существуют в конфигурации, но не имеют полей и не используются для обновления vMix.

## 🎯 Цель

Добавить функционал для пяти инпутов `set1Score`, `set2Score`, `set3Score`, `set4Score`, `set5Score`, которые будут отображать:
- Названия команд (А и Б)
- Счет по сетам (А и Б)
- Для каждой завершенной партии (до номера инпута): время партии, счет команды А, счет команды Б

## 📐 Архитектура решения

### Структура полей для каждого инпута

Для инпута "Счет после X партии" (например, `set3Score` для X=3):

#### Общие поля (одинаковые для всех инпутов):
1. **teamA** (text) - Название команды А
2. **teamB** (text) - Название команды Б
3. **scoreASets** (text) - Счет по сетам команды А
4. **scoreBSets** (text) - Счет по сетам команды Б

#### Динамические поля (зависят от номера инпута):
Для каждого завершенного сета от 1 до X (где X - номер инпута):
- **setXDuration** (text) - Время партии X в минутах с символом "'" (например, "23'")
- **setXScoreA** (text) - Счет команды А в партии X
- **setXScoreB** (text) - Счет команды Б в партии X

**Пример для `set3Score`:**
- `set1Duration`, `set1ScoreA`, `set1ScoreB`
- `set2Duration`, `set2ScoreA`, `set2ScoreB`
- `set3Duration`, `set3ScoreA`, `set3ScoreB`

### Источники данных

Все данные находятся в объекте `match`:
- `match.teamA.name` → `teamA`
- `match.teamB.name` → `teamB`
- `match.sets[]` → массив завершенных партий
  - `set.scoreA` → счет команды А
  - `set.scoreB` → счет команды Б
  - `set.duration` → время партии в минутах с символом "'" (например, "23'") (вычисляется из `startTime` и `endTime` с использованием `formatDuration`)
- Счет по сетам вычисляется из завершенных партий (`sets` с `status === 'completed'`)

## 🧪 TDD Подход

### Этап 1: Тесты для утилит (JavaScript)

**Файл:** `tests/unit/setScoreInputsUtils.test.js`

**Примечание:** Используем JavaScript для консистентности с существующими утилитами (`vmix-field-utils.js`, `matchUtils.js`, `volleyballRules.js`). Переход на TypeScript для всей группы функций можно выполнить позднее.

#### Тест 1: Вычисление времени партии в минутах

```javascript
const { calculateSetDuration } = require('../../src/shared/setScoreInputsUtils');

describe('calculateSetDuration', () => {
  it('должен вычислять время партии в минутах из startTime и endTime', () => {
    const startTime = 1000000; // timestamp в миллисекундах
    const endTime = 1000000 + (30 * 60 * 1000); // +30 минут
    const duration = calculateSetDuration(startTime, endTime);
    expect(duration).toBe(30);
  });

  it('должен возвращать 0, если endTime отсутствует', () => {
    const startTime = 1000000;
    const duration = calculateSetDuration(startTime, undefined);
    expect(duration).toBe(0);
  });

  it('должен округлять до целых минут', () => {
    const startTime = 1000000;
    const endTime = 1000000 + (30 * 60 * 1000 + 30 * 1000); // 30 минут 30 секунд
    const duration = calculateSetDuration(startTime, endTime);
    expect(duration).toBe(30); // округление вниз
  });
});
```

#### Тест 2: Получение завершенных партий до определенного номера

```javascript
const { getCompletedSetsUpTo } = require('../../src/shared/setScoreInputsUtils');

describe('getCompletedSetsUpTo', () => {
  it('должен возвращать только завершенные партии до указанного номера', () => {
    const sets = [
      { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' },
      { setNumber: 2, scoreA: 20, scoreB: 25, status: 'completed' },
      { setNumber: 3, scoreA: 15, scoreB: 25, status: 'completed' },
      { setNumber: 4, scoreA: 25, scoreB: 23, status: 'in_progress' },
    ];
    const completed = getCompletedSetsUpTo(sets, 3);
    expect(completed).toHaveLength(3);
    expect(completed[0].setNumber).toBe(1);
    expect(completed[1].setNumber).toBe(2);
    expect(completed[2].setNumber).toBe(3);
  });

  it('должен возвращать пустой массив, если нет завершенных партий', () => {
    const sets = [
      { setNumber: 1, scoreA: 10, scoreB: 10, status: 'in_progress' },
    ];
    const completed = getCompletedSetsUpTo(sets, 1);
    expect(completed).toHaveLength(0);
  });
});
```

#### Тест 3: Формирование значений полей для инпута

```javascript
const { formatSetScoreInputData } = require('../../src/shared/setScoreInputsUtils');

describe('formatSetScoreInputData', () => {
  it('должен формировать данные для set1Score', () => {
    const match = {
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets: [
        {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          status: 'completed',
          startTime: 1000000,
          endTime: 1000000 + (30 * 60 * 1000),
        },
      ],
    };
    const result = formatSetScoreInputData(match, 1);
    
    expect(result.fields['TeamA']).toBe('Команда А');
    expect(result.fields['TeamB']).toBe('Команда Б');
    expect(result.fields['ScoreASets']).toBe('1');
    expect(result.fields['ScoreBSets']).toBe('0');
    expect(result.fields['Set1Duration']).toBe('30');
    expect(result.fields['Set1ScoreA']).toBe('25');
    expect(result.fields['Set1ScoreB']).toBe('20');
  });

  it('должен формировать данные для set3Score с тремя завершенными партиями', () => {
    const match = {
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets: [
        {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          status: 'completed',
          startTime: 1000000,
          endTime: 1000000 + (30 * 60 * 1000),
        },
        {
          setNumber: 2,
          scoreA: 20,
          scoreB: 25,
          status: 'completed',
          startTime: 2000000,
          endTime: 2000000 + (35 * 60 * 1000),
        },
        {
          setNumber: 3,
          scoreA: 25,
          scoreB: 23,
          status: 'completed',
          startTime: 3000000,
          endTime: 3000000 + (28 * 60 * 1000),
        },
      ],
    };
    const result = formatSetScoreInputData(match, 3);
    
    // Проверяем общие поля
    expect(result.fields['TeamA']).toBe('Команда А');
    expect(result.fields['TeamB']).toBe('Команда Б');
    expect(result.fields['ScoreASets']).toBe('2'); // Команда А выиграла 1 и 3 партии
    expect(result.fields['ScoreBSets']).toBe('1'); // Команда Б выиграла 2 партию
    
    // Проверяем поля для каждой партии
    expect(result.fields['Set1Duration']).toBe('30');
    expect(result.fields['Set1ScoreA']).toBe('25');
    expect(result.fields['Set1ScoreB']).toBe('20');
    
    expect(result.fields['Set2Duration']).toBe('35');
    expect(result.fields['Set2ScoreA']).toBe('20');
    expect(result.fields['Set2ScoreB']).toBe('25');
    
    expect(result.fields['Set3Duration']).toBe('28');
    expect(result.fields['Set3ScoreA']).toBe('25');
    expect(result.fields['Set3ScoreB']).toBe('23');
  });

  it('должен обрабатывать случай, когда партий меньше, чем номер инпута', () => {
    const match = {
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets: [
        {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          status: 'completed',
          startTime: 1000000,
          endTime: 1000000 + (30 * 60 * 1000),
        },
      ],
    };
    const result = formatSetScoreInputData(match, 3);
    
    // Должны быть только поля для первой партии
    expect(result.fields['Set1Duration']).toBe('30');
    expect(result.fields['Set1ScoreA']).toBe('25');
    expect(result.fields['Set1ScoreB']).toBe('20');
    
    // Поля для второй и третьей партии должны быть пустыми строками
    expect(result.fields['Set2Duration']).toBe('');
    expect(result.fields['Set2ScoreA']).toBe('');
    expect(result.fields['Set2ScoreB']).toBe('');
    expect(result.fields['Set3Duration']).toBe('');
    expect(result.fields['Set3ScoreA']).toBe('');
    expect(result.fields['Set3ScoreB']).toBe('');
  });
});
```

### Этап 2: Реализация утилит (JavaScript)

**Файл:** `src/shared/setScoreInputsUtils.js`

```javascript
/**
 * Утилиты для работы с инпутами "Счет после X партии"
 */

/**
 * Вычисляет продолжительность партии в минутах
 * @param {number} startTime - timestamp начала партии в миллисекундах
 * @param {number} endTime - timestamp завершения партии в миллисекундах
 * @returns {number} продолжительность в минутах (округление вниз)
 */
function calculateSetDuration(startTime, endTime) {
  if (!startTime || !endTime) {
    return 0;
  }
  const durationMs = endTime - startTime;
  const durationMinutes = Math.floor(durationMs / (60 * 1000));
  return durationMinutes;
}

/**
 * Получает завершенные партии до указанного номера включительно
 * @param {Array} sets - массив всех партий
 * @param {number} maxSetNumber - максимальный номер партии (включительно)
 * @returns {Array} массив завершенных партий
 */
function getCompletedSetsUpTo(sets, maxSetNumber) {
  if (!sets || !Array.isArray(sets)) {
    return [];
  }
  return sets
    .filter(
      (set) =>
        set.setNumber <= maxSetNumber &&
        (set.status === 'completed' || set.completed === true)
    )
    .sort((a, b) => a.setNumber - b.setNumber);
}

/**
 * Вычисляет счет по сетам для команды
 * @param {Array} sets - массив завершенных партий
 * @param {string} team - 'A' или 'B'
 * @returns {number} количество выигранных партий
 */
function calculateSetsScore(sets, team) {
  if (!sets || !Array.isArray(sets)) {
    return 0;
  }
  return sets.filter((set) => {
    return team === 'A' ? set.scoreA > set.scoreB : set.scoreB > set.scoreA;
  }).length;
}

/**
 * Формирует данные для инпута "Счет после X партии"
 * @param {Object} match - данные матча
 * @param {number} setNumber - номер инпута (1-5)
 * @returns {Object} объект с полями для отправки в vMix
 */
function formatSetScoreInputData(match, setNumber) {
  if (!match) {
    return { fields: {} };
  }

  const fields = {};

  // Общие поля
  fields['TeamA'] = match.teamA?.name || '';
  fields['TeamB'] = match.teamB?.name || '';

  // Получаем завершенные партии до указанного номера
  const completedSets = getCompletedSetsUpTo(match.sets || [], setNumber);

  // Вычисляем счет по сетам
  const scoreASets = calculateSetsScore(completedSets, 'A');
  const scoreBSets = calculateSetsScore(completedSets, 'B');
  fields['ScoreASets'] = String(scoreASets);
  fields['ScoreBSets'] = String(scoreBSets);

  // Поля для каждой завершенной партии
  completedSets.forEach((set) => {
    const duration = calculateSetDuration(set.startTime, set.endTime);
    const setNum = set.setNumber;

    // Используем пустую строку для duration, если время отсутствует
    fields[`Set${setNum}Duration`] = duration > 0 ? String(duration) : '';
    fields[`Set${setNum}ScoreA`] = String(set.scoreA || 0);
    fields[`Set${setNum}ScoreB`] = String(set.scoreB || 0);
  });

  // Для партий, которые еще не завершены (до setNumber), отправляем пустые строки
  for (let i = 1; i <= setNumber; i++) {
    const setExists = completedSets.some(set => set.setNumber === i);
    if (!setExists) {
      // Отправляем пустые строки для несуществующих партий
      fields[`Set${i}Duration`] = '';
      fields[`Set${i}ScoreA`] = '';
      fields[`Set${i}ScoreB`] = '';
    }
  }

  return { fields };
}

export {
  calculateSetDuration,
  getCompletedSetsUpTo,
  calculateSetsScore,
  formatSetScoreInputData,
};
```

### Этап 3: Тесты для конфигурации полей

**Файл:** `tests/unit/vmixInputConfigs.test.js`

```javascript
const { getDefaultFieldsForInput } = require('../../src/main/vmix-input-configs');

describe('getDefaultFieldsForInput - setScore inputs', () => {
  it('должен возвращать правильные поля для set1Score', () => {
    const fields = getDefaultFieldsForInput('set1Score');
    expect(fields).toBeDefined();
    expect(fields.teamA).toBeDefined();
    expect(fields.teamB).toBeDefined();
    expect(fields.scoreASets).toBeDefined();
    expect(fields.scoreBSets).toBeDefined();
    expect(fields.set1Duration).toBeDefined();
    expect(fields.set1ScoreA).toBeDefined();
    expect(fields.set1ScoreB).toBeDefined();
  });

  it('должен возвращать правильные поля для set3Score', () => {
    const fields = getDefaultFieldsForInput('set3Score');
    expect(fields).toBeDefined();
    // Проверяем наличие полей для всех трех партий
    expect(fields.set1Duration).toBeDefined();
    expect(fields.set2Duration).toBeDefined();
    expect(fields.set3Duration).toBeDefined();
  });

  it('должен возвращать правильные поля для set5Score', () => {
    const fields = getDefaultFieldsForInput('set5Score');
    expect(fields).toBeDefined();
    // Проверяем наличие полей для всех пяти партий
    for (let i = 1; i <= 5; i++) {
      expect(fields[`set${i}Duration`]).toBeDefined();
      expect(fields[`set${i}ScoreA`]).toBeDefined();
      expect(fields[`set${i}ScoreB`]).toBeDefined();
    }
  });
});
```

### Этап 4: Обновление конфигурации полей по умолчанию

**Файл:** `src/main/vmix-input-configs.js`

Добавить конфигурации для каждого инпута:

```javascript
function getDefaultFieldsForInput(inputKey) {
  const configs = {
    // ... существующие конфигурации ...

    set1Score: {
      teamA: { enabled: true, type: 'text', fieldName: 'Команда А', fieldIdentifier: 'TeamA' },
      teamB: { enabled: true, type: 'text', fieldName: 'Команда Б', fieldIdentifier: 'TeamB' },
      scoreASets: { enabled: true, type: 'text', fieldName: 'Счет по сетам А', fieldIdentifier: 'ScoreASets' },
      scoreBSets: { enabled: true, type: 'text', fieldName: 'Счет по сетам Б', fieldIdentifier: 'ScoreBSets' },
      set1Duration: { enabled: true, type: 'text', fieldName: 'Время партии 1', fieldIdentifier: 'Set1Duration' },
      set1ScoreA: { enabled: true, type: 'text', fieldName: 'Команда А партия 1', fieldIdentifier: 'Set1ScoreA' },
      set1ScoreB: { enabled: true, type: 'text', fieldName: 'Команда Б партия 1', fieldIdentifier: 'Set1ScoreB' },
    },

    set2Score: {
      teamA: { enabled: true, type: 'text', fieldName: 'Команда А', fieldIdentifier: 'TeamA' },
      teamB: { enabled: true, type: 'text', fieldName: 'Команда Б', fieldIdentifier: 'TeamB' },
      scoreASets: { enabled: true, type: 'text', fieldName: 'Счет по сетам А', fieldIdentifier: 'ScoreASets' },
      scoreBSets: { enabled: true, type: 'text', fieldName: 'Счет по сетам Б', fieldIdentifier: 'ScoreBSets' },
      set1Duration: { enabled: true, type: 'text', fieldName: 'Время партии 1', fieldIdentifier: 'Set1Duration' },
      set1ScoreA: { enabled: true, type: 'text', fieldName: 'Команда А партия 1', fieldIdentifier: 'Set1ScoreA' },
      set1ScoreB: { enabled: true, type: 'text', fieldName: 'Команда Б партия 1', fieldIdentifier: 'Set1ScoreB' },
      set2Duration: { enabled: true, type: 'text', fieldName: 'Время партии 2', fieldIdentifier: 'Set2Duration' },
      set2ScoreA: { enabled: true, type: 'text', fieldName: 'Команда А партия 2', fieldIdentifier: 'Set2ScoreA' },
      set2ScoreB: { enabled: true, type: 'text', fieldName: 'Команда Б партия 2', fieldIdentifier: 'Set2ScoreB' },
    },

    // Аналогично для set3Score, set4Score, set5Score
    // (для set5Score будет 5 групп полей set1-set5)
  };

  return configs[inputKey] || null;
}
```

**Важно:** Можно использовать функцию-генератор для создания конфигураций:

```javascript
function generateSetScoreFields(setNumber) {
  const fields = {
    teamA: { enabled: true, type: 'text', fieldName: 'Команда А', fieldIdentifier: 'TeamA' },
    teamB: { enabled: true, type: 'text', fieldName: 'Команда Б', fieldIdentifier: 'TeamB' },
    scoreASets: { enabled: true, type: 'text', fieldName: 'Счет по сетам А', fieldIdentifier: 'ScoreASets' },
    scoreBSets: { enabled: true, type: 'text', fieldName: 'Счет по сетам Б', fieldIdentifier: 'ScoreBSets' },
  };

  // Добавляем поля для каждой партии от 1 до setNumber
  for (let i = 1; i <= setNumber; i++) {
    fields[`set${i}Duration`] = {
      enabled: true,
      type: 'text',
      fieldName: `Время партии ${i}`,
      fieldIdentifier: `Set${i}Duration`,
    };
    fields[`set${i}ScoreA`] = {
      enabled: true,
      type: 'text',
      fieldName: `Команда А партия ${i}`,
      fieldIdentifier: `Set${i}ScoreA`,
    };
    fields[`set${i}ScoreB`] = {
      enabled: true,
      type: 'text',
      fieldName: `Команда Б партия ${i}`,
      fieldIdentifier: `Set${i}ScoreB`,
    };
  }

  return fields;
}

// В getDefaultFieldsForInput:
set1Score: generateSetScoreFields(1),
set2Score: generateSetScoreFields(2),
set3Score: generateSetScoreFields(3),
set4Score: generateSetScoreFields(4),
set5Score: generateSetScoreFields(5),
```

### Этап 5: Интеграция в useVMix hook

**Файл:** `src/renderer/hooks/useVMix.js`

#### 5.1. Добавить импорт утилит

```javascript
import { formatSetScoreInputData } from '../../shared/setScoreInputsUtils';
```

#### 5.2. Добавить кэш для новых инпутов

В `lastSentValuesRef.current` добавить:

```javascript
const lastSentValuesRef = useRef({
  // ... существующие инпуты ...
  set1Score: {
    fields: {},
    colorFields: {},
    visibilityFields: {},
    imageFields: {},
  },
  set2Score: {
    fields: {},
    colorFields: {},
    visibilityFields: {},
    imageFields: {},
  },
  // ... аналогично для set3Score, set4Score, set5Score ...
});
```

#### 5.3. Создать функцию форматирования данных

```javascript
import { formatSetScoreInputData } from '../../shared/setScoreInputsUtils';

/**
 * Форматирует данные для инпута "Счет после X партии" для отправки в vMix
 * @param {Object} match - данные матча
 * @param {string} inputKey - ключ инпута ('set1Score', 'set2Score', и т.д.)
 * @returns {Object} - объект с полями для отправки в vMix
 */
const formatSetScoreInputDataForVMix = useCallback((match, inputKey) => {
  if (!match) return { fields: {} };

  const inputConfig = vmixConfigRef.current?.inputs?.[inputKey];
  if (!inputConfig?.fields) {
    return { fields: {} };
  }

  // Извлекаем номер инпута из ключа (set1Score -> 1, set2Score -> 2, и т.д.)
  const setNumber = parseInt(inputKey.replace('set', '').replace('Score', ''), 10);
  if (isNaN(setNumber) || setNumber < 1 || setNumber > 5) {
    console.error(`[useVMix] Неверный номер инпута: ${inputKey}`);
    return { fields: {} };
  }

  // Используем утилиту для форматирования данных
  const formatted = formatSetScoreInputData(match, setNumber);
  const fields = {};

  // Маппим значения на fieldIdentifier из конфигурации
  Object.entries(inputConfig.fields).forEach(([fieldKey, fieldConfig]) => {
    if (fieldConfig.enabled === false || !fieldConfig.fieldIdentifier) {
      return;
    }

    const fieldIdentifier = fieldConfig.fieldIdentifier;
    const fullFieldName = getFullFieldName(fieldIdentifier, fieldConfig.type);
    
    // Прямой маппинг по fieldIdentifier
    const value = formatted.fields[fieldIdentifier] || '';
    
    if (fullFieldName && value !== undefined) {
      fields[fullFieldName] = value;
    }
  });

  return { fields };
}, []);
```

**Примечание:** Используем прямой маппинг по fieldIdentifier:

```javascript
import { formatSetScoreInputData } from '../../shared/setScoreInputsUtils';

const formatSetScoreInputDataForVMix = useCallback((match, inputKey) => {
  if (!match) return { fields: {} };

  const inputConfig = vmixConfigRef.current?.inputs?.[inputKey];
  if (!inputConfig?.fields) {
    return { fields: {} };
  }

  const setNumber = parseInt(inputKey.replace('set', '').replace('Score', ''), 10);
  if (isNaN(setNumber) || setNumber < 1 || setNumber > 5) {
    return { fields: {} };
  }

  // Используем утилиту из shared
  const formatted = formatSetScoreInputData(match, setNumber);
  const fields = {};

  Object.entries(inputConfig.fields).forEach(([fieldKey, fieldConfig]) => {
    if (fieldConfig.enabled === false || !fieldConfig.fieldIdentifier) {
      return;
    }

    const fieldIdentifier = fieldConfig.fieldIdentifier;
    const fullFieldName = getFullFieldName(fieldIdentifier, fieldConfig.type);
    
    // Прямой маппинг по fieldIdentifier
    const value = formatted.fields[fieldIdentifier] || '';
    
    if (fullFieldName && value !== undefined) {
      fields[fullFieldName] = value;
    }
  });

  return { fields };
}, []);
```

#### 5.4. Создать функцию обновления инпута

```javascript
/**
 * Обновляет инпут "Счет после X партии" в vMix
 * @param {Object} match - данные матча
 * @param {string} inputKey - ключ инпута ('set1Score', 'set2Score', и т.д.)
 * @param {boolean} forceUpdate - принудительное обновление всех полей
 */
const updateSetScoreInput = useCallback(
  async (match, inputKey, forceUpdate = false) => {
    if (!isVMixReady()) {
      return { success: false, error: 'vMix не подключен' };
    }

    try {
      const inputConfig = vmixConfigRef.current.inputs?.[inputKey];
      const validation = validateInputConfig(inputConfig);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const { fields } = formatSetScoreInputDataForVMix(match, inputKey);

      // Фильтруем только измененные поля, если не forceUpdate
      let fieldsToSend = fields;
      if (!forceUpdate) {
        const lastSent = lastSentValuesRef.current[inputKey];
        fieldsToSend = filterChangedFields(fields, lastSent.fields);
      }

      const hasFields = Object.keys(fieldsToSend).length > 0;
      if (!hasFields && !forceUpdate) {
        return {
          success: true,
          skipped: true,
          message: 'Нет измененных полей для обновления',
        };
      }

      const result = await window.electronAPI.updateVMixInputFields(
        validation.inputIdentifier,
        fieldsToSend,
        {}, // colorFields
        {}  // visibilityFields
      );

      // Обновляем кэш только при успешной отправке
      if (result.success) {
        updateLastSentValues(
          inputKey,
          fieldsToSend,
          {},
          {},
          {}
        );
      }

      return result;
    } catch (error) {
      console.error(`[useVMix] Ошибка при обновлении ${inputKey}:`, error);
      return { success: false, error: error.message };
    }
  },
  [
    isVMixReady,
    validateInputConfig,
    formatSetScoreInputDataForVMix,
    filterChangedFields,
    updateLastSentValues,
  ]
);
```

#### 5.5. Добавить вызовы обновления в updateMatchData

В функции `updateMatchData` добавить:

```javascript
// Обновляем инпуты "Счет после X партии"
const setScoreInputs = ['set1Score', 'set2Score', 'set3Score', 'set4Score', 'set5Score'];
for (const inputKey of setScoreInputs) {
  await updateSetScoreInput(match, inputKey, forceUpdate);
}
```

#### 5.6. Реализация блокировки плашек для незавершенных партий

**Файл:** `src/renderer/components/VMixOverlayButtons.jsx`

В компоненте `VMixOverlayButtons` добавить логику блокировки плашек для инпутов "Счет после X партии":

```javascript
{OVERLAY_BUTTONS.map((buttonConfig) => {
  const { key, label, usesInput } = buttonConfig;
  const buttonKey = key;
  const actualInputKey = usesInput || key;
  
  // Проверяем активность кнопки
  const active = isOverlayActive(actualInputKey, buttonKey);
  
  const inputConfig = vmixConfig?.inputs?.[actualInputKey];
  const isInputEnabled = inputConfig && inputConfig.enabled !== false;
  const isVMixConnected = connectionStatus.connected;

  // Для инпутов "Счет после X партии" проверяем, завершена ли партия
  let isButtonDisabled = false;
  if (key.startsWith('set') && key.endsWith('Score')) {
    const setNumber = parseInt(key.replace('set', '').replace('Score', ''), 10);
    if (!isNaN(setNumber)) {
      // Проверяем, завершена ли партия с этим номером
      const completedSets = match?.sets?.filter(
        set => set.setNumber <= setNumber && 
        (set.status === 'completed' || set.completed === true)
      ) || [];
      const isSetCompleted = completedSets.some(set => set.setNumber === setNumber);
      isButtonDisabled = !isSetCompleted;
    }
  }

  // Для кнопок тренера и судей проверяем наличие данных
  let isDataAvailable = true;
  if (key === "coachTeamA") {
    isDataAvailable = !!match?.teamA?.coach;
  } else if (key === "coachTeamB") {
    isDataAvailable = !!match?.teamB?.coach;
  } else if (key === "referee1Show") {
    isDataAvailable = !!match?.officials?.referee1;
  } else if (key === "referee2Show") {
    isDataAvailable = !!match?.officials?.referee2;
  }

  // Кнопка недоступна, если:
  // - Инпут отключен
  // - vMix не подключен
  // - Нет данных (для тренеров/судей)
  // - Партия не завершена (для инпутов "Счет после X партии")
  const isDisabled = !isInputEnabled || !isVMixConnected || !isDataAvailable || isButtonDisabled;

  return (
    <button
      key={buttonKey}
      onClick={() => !isDisabled && handleButtonClick(buttonConfig)}
      disabled={isDisabled}
      style={{
        // ... существующие стили ...
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
})}
```

**Важно:**
- Плашки для незавершенных партий должны быть визуально отличимы (сниженная прозрачность)
- Курсор должен быть `not-allowed` для заблокированных кнопок
- Обработчик клика не должен вызываться для заблокированных кнопок


## 📝 Чек-лист реализации

### Фаза 1: Подготовка (TDD)
- [x] Создать `tests/unit/setScoreInputsUtils.test.js` с тестами
- [x] Создать `src/shared/setScoreInputsUtils.js` с реализацией
- [x] Запустить тесты, убедиться, что они проходят

### Фаза 2: Конфигурация полей
- [x] Обновить `src/main/vmix-input-configs.js`:
  - [x] Добавить функцию `generateSetScoreFields`
  - [x] Добавить конфигурации для `set1Score` - `set5Score`
- [x] Создать тесты для конфигураций
- [x] Проверить миграцию существующих настроек (автоматически через migrateInputToNewFormat)

### Фаза 3: Интеграция в useVMix
- [x] Добавить импорт утилит в `useVMix.js`
- [x] Добавить кэш для новых инпутов в `lastSentValuesRef`
- [x] Создать функцию `formatSetScoreInputDataForVMix` в `useVMix.js`
- [x] Создать функцию `updateSetScoreInput` в `useVMix.js`
- [x] Добавить вызовы обновления в `updateMatchData`
- [x] Добавить обработку ошибок и логирование
- [x] Реализовать блокировку плашек для незавершенных партий в `VMixOverlayButtons`

### Фаза 4: Тестирование
- [ ] Протестировать с матчем без завершенных партий
- [ ] Протестировать с матчем с 1 завершенной партией
- [ ] Протестировать с матчем с 3 завершенными партиями
- [ ] Протестировать с матчем с 5 завершенными партиями
- [ ] Проверить обновление при завершении новой партии
- [ ] Проверить работу с отключенными инпутами
- [ ] Проверить работу с кастомными fieldIdentifier
- [ ] Проверить блокировку плашек для незавершенных партий:
  - [ ] Плашки для незавершенных партий должны быть недоступны
  - [ ] Плашки должны разблокироваться при завершении соответствующей партии
  - [ ] Визуальное отображение заблокированных плашек (прозрачность, курсор)

### Фаза 5: Документация и финализация
- [ ] Обновить документацию по API (если необходимо)
- [ ] Добавить комментарии в код
- [ ] Проверить соответствие стилю кода проекта
- [ ] Обновить CHANGELOG.md

## 🔍 Важные замечания

### Обработка отсутствующих данных

1. **Если партий меньше, чем номер инпута:**
   - Поля для несуществующих партий должны отправляться в vMix как **пустые строки** (`''`)
   - Это позволяет очистить данные в vMix при открытии нового матча или когда партии еще не завершены
   - **Важно:** Всегда отправлять пустые строки вместо `undefined` или `null`

2. **Если партия не завершена:**
   - Партия не должна учитываться в полях
   - Счет по сетам должен учитывать только завершенные партии
   - Поля для незавершенной партии должны быть пустыми строками

3. **Если отсутствует время партии:**
   - `duration` должен быть **пустой строкой** (`''`), а не `0`
   - Это позволяет различать "партия еще не завершена" и "партия длилась 0 минут"

### Производительность

- Используется кэширование для отправки только измененных полей
- Обновление происходит с debounce через `updateMatchData`
- При `forceUpdate` отправляются все поля (для очистки при открытии нового матча)

### Совместимость

- Конфигурации полей должны быть совместимы с существующей системой миграции
- При обновлении настроек существующие кастомные `fieldIdentifier` должны сохраняться
- Новые поля добавляются только если их нет в существующей конфигурации

### Управление плашками (оверлеями)

1. **Включение плашек и отслеживание состояния:**
   - Плашки для инпутов "Счет после X партии" работают аналогично существующим инпутам на основной странице
   - Используются функции `showOverlay()` и `hideOverlay()` из `useVMix` hook
   - Состояние плашек отслеживается через `overlayStates` и периодический опрос vMix API (каждые 2 секунды)
   - Кнопки плашек находятся в компоненте `VMixOverlayButtons` на странице управления матчем

2. **Блокировка плашек для незавершенных партий:**
   - Плашки для инпутов, где номер инпута больше количества завершенных партий, должны быть **недоступны (disabled)**
   - Например, если завершена только 1 партия, то плашки для `set2Score`, `set3Score`, `set4Score`, `set5Score` должны быть заблокированы
   - Это предотвращает случайное нажатие на плашки, для которых еще нет данных
   - Проверка доступности должна выполняться в компоненте `VMixOverlayButtons`:
     ```javascript
     // Проверяем, завершена ли партия для данного инпута
     const setNumber = parseInt(buttonConfig.key.replace('set', '').replace('Score', ''), 10);
     const completedSets = match?.sets?.filter(
       set => set.setNumber <= setNumber && 
       (set.status === 'completed' || set.completed === true)
     ) || [];
     const isSetCompleted = completedSets.some(set => set.setNumber === setNumber);
     const isButtonDisabled = !isSetCompleted;
     ```
   - Визуально заблокированные кнопки должны иметь:
     - Сниженную прозрачность (`opacity: 0.5`)
     - Курсор `not-allowed`
     - Отключенный обработчик клика

## 🐛 Типичные проблемы и решения

### Проблема 1: Поля не обновляются в vMix

**Причины:**
- Неправильный `fieldIdentifier` в конфигурации
- Инпут отключен (`enabled: false`)
- Неправильный `inputIdentifier` (имя/номер инпута)

**Решение:**
- Проверить конфигурацию в настройках vMix
- Проверить логи в консоли браузера
- Использовать тест подключения в настройках

### Проблема 2: Неправильный счет по сетам

**Причины:**
- Партия не помечена как завершенная (`status !== 'completed'`)
- Неправильная логика вычисления победителя

**Решение:**
- Проверить статус партий в данных матча
- Убедиться, что используется правильная функция `calculateSetsScore`

### Проблема 3: Время партии равно 0

**Причины:**
- Отсутствует `startTime` или `endTime`
- Партия еще не завершена

**Решение:**
- Проверить наличие временных меток в данных партии
- Убедиться, что партия завершена перед вычислением времени

## ✅ Статус реализации

### Завершено (2024)

**Фаза 1: Утилиты (JavaScript)**
- ✅ Создан файл `src/shared/setScoreInputsUtils.js` с функциями:
  - `calculateSetDuration` - вычисление длительности партии (используется в утилитах)
  - `getCompletedSetsUpTo` - получение завершенных партий до указанного номера
  - `calculateSetsScore` - вычисление счета по сетам для команды
  - `formatSetScoreInputData` - форматирование данных для инпута

**Фаза 2: Тесты для утилит**
- ✅ Создан файл `tests/unit/setScoreInputsUtils.test.js`
- ✅ Покрыты все функции утилит тестами
- ✅ Добавлены тесты для граничных случаев (незавершенные партии, отсутствующие данные)

**Фаза 3: Конфигурация инпутов**
- ✅ Обновлен `src/main/vmix-input-configs.js`
- ✅ Добавлена функция `generateSetScoreFields` для генерации полей
- ✅ Интегрированы конфигурации для `set1Score` - `set5Score`
- ✅ Создан файл `tests/unit/vmixInputConfigs.test.js` с тестами конфигурации

**Фаза 4: Интеграция в useVMix**
- ✅ Создана функция `getSetScoreFieldValue` для получения значений полей по `fieldKey`
- ✅ Создана функция `formatSetScoreInputDataForVMix` для форматирования данных
- ✅ Создана функция `updateSetScoreInput` для обновления инпутов в vMix
- ✅ Интегрировано в `updateMatchData` для автоматического обновления
- ✅ Использована функция `calculateDuration` из `timeUtils` для правильного округления (Math.round)
- ✅ Использована функция `formatDuration` из `timeUtils` для форматирования времени с символом "'" (например, "23'")
- ✅ Добавлена инициализация кэша для новых инпутов в `lastSentValuesRef`
- ✅ Добавлены тесты: `tests/unit/getSetScoreFieldValue.test.js`, `tests/unit/useVMixSetScore.test.js`

**Фаза 5: UI - Отключение плашек для незавершенных партий**
- ✅ Обновлен `src/renderer/components/VMixOverlayButtons.jsx`
- ✅ Добавлена логика отключения кнопок для незавершенных партий
- ✅ Добавлены визуальные индикаторы (opacity, cursor) для заблокированных кнопок

**Фаза 6: Тестирование и отладка**
- ✅ Исправлена проблема с маппингом полей (использование `fieldKey` вместо `fieldIdentifier`)
- ✅ Исправлена проблема с округлением длительности (использование `calculateDuration` с Math.round)
- ✅ Добавлено форматирование времени партии с символом "'" (использование `formatDuration`)
- ✅ Убрано лишнее логирование
- ✅ Все тесты проходят успешно

### Реализованные функции

1. **Отображение данных в инпутах "Счет после X партии":**
   - Названия команд (А и Б)
   - Счет по сетам (А и Б) - вычисляется из завершенных партий
   - Для каждой завершенной партии (до номера инпута):
     - Время партии в минутах с символом "'" (например, "23'") (округление до ближайшего целого)
     - Счет команды А
     - Счет команды Б

2. **Автоматическое обновление:**
   - Данные обновляются автоматически при изменении матча
   - Используется кэширование для оптимизации (отправка только измененных полей)
   - Поддержка `forceUpdate` для принудительного обновления всех полей

3. **Обработка граничных случаев:**
   - Незавершенные партии - возвращаются пустые строки
   - Отсутствующие данные - возвращаются пустые строки
   - Партии, номер которых превышает номер инпута - не отображаются

4. **UI улучшения:**
   - Кнопки плашек отключены для незавершенных партий
   - Визуальные индикаторы для заблокированных кнопок

## 📚 Связанные документы

- [Архитектура проекта](../architecture/ARCHITECTURE.md)
- [Руководство по рефакторингу](REFACTORING_GUIDE.md)
- [Состояния партий и тайминг - Руководство](set-status-and-timing-implementation-guide.md)
- [Логика управления счетом и состояниями партий](score-and-set-status-logic-documentation.md)
