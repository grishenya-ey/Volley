# Руководство по реализации: Состояния партий и тайминг

## Введение

Этот документ содержит пошаговые инструкции для реализации функционала управления состояниями партий, автоматической фиксации времени и коррекции данных через модальное окно.

**Статус:** Основной функционал реализован. Документация актуализирована в соответствии с текущим состоянием кода.

**Важно:** Выполняйте задачи в указанном порядке, так как последующие шаги зависят от предыдущих.

---

## Этап 1: Структура данных и типы

### Шаг 1.1: Обновление типов Match.ts

**Файл:** `src/shared/types/Match.ts`

**Действия:**

1. **Добавьте константы состояний в начало файла (после импортов, если есть):**

```typescript
/**
 * Константы состояний партий
 */
export const SET_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type SetStatus = typeof SET_STATUS[keyof typeof SET_STATUS];
```

2. **Обновите интерфейс `Set`:**

```typescript
export interface Set {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  completed: boolean; // Оставить для обратной совместимости
  status?: SetStatus; // Новое поле: 'pending' | 'in_progress' | 'completed'
  startTime?: number; // Timestamp начала партии (milliseconds)
  endTime?: number; // Timestamp завершения партии (milliseconds)
  duration?: number; // Продолжительность в минутах (вычисляемое поле)
}
```

3. **Обновите интерфейс `CurrentSet`:**

```typescript
export interface CurrentSet {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  servingTeam: 'A' | 'B';
  status?: SetStatus; // Статус текущей партии: 'pending' | 'in_progress'
  startTime?: number; // Timestamp начала текущей партии
}
```

4. **Обновите функцию `createNewMatch()`:**

```typescript
export function createNewMatch(): Match {
  const now = new Date().toISOString();
  
  return {
    // ... существующие поля ...
    sets: [],
    currentSet: {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      servingTeam: 'A',
      status: SET_STATUS.PENDING, // Добавить статус по умолчанию
    },
    // ... остальные поля ...
  };
}
```

**Проверка:** Убедитесь, что TypeScript компилируется без ошибок.

---

### Шаг 1.2: Создание утилит для работы со временем

**Файл:** `src/shared/timeUtils.js` (создать новый)

**Содержимое файла:**

```javascript
/**
 * Утилиты для работы со временем партий
 */

/**
 * Вычисляет продолжительность партии в минутах
 * @param {number} startTime - Timestamp начала (milliseconds)
 * @param {number} endTime - Timestamp завершения (milliseconds)
 * @returns {number|null} Продолжительность в минутах (округленная) или null
 */
export function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) {
    return null;
  }
  
  if (endTime < startTime) {
    console.warn('calculateDuration: endTime раньше startTime');
    return null;
  }
  
  // Конвертируем миллисекунды в минуты и округляем
  return Math.round((endTime - startTime) / 60000);
}

/**
 * Форматирует продолжительность для отображения
 * @param {number|null|undefined} minutes - Продолжительность в минутах
 * @returns {string} Форматированная строка (например, "45'") или пустая строка
 */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return '';
  }
  return `${minutes}'`;
}

/**
 * Конвертирует Date или строку в timestamp (milliseconds)
 * @param {Date|string|number} date - Дата для конвертации
 * @returns {number} Timestamp в миллисекундах
 */
export function toTimestamp(date) {
  if (typeof date === 'number') {
    return date; // Уже timestamp
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

/**
 * Форматирует timestamp в читаемую дату/время
 * @param {number} timestamp - Timestamp в миллисекундах
 * @returns {string} Форматированная строка даты/времени
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

**Проверка:** Создайте простой тест в консоли браузера для проверки функций.

---

### Шаг 1.3: Создание функций миграции данных

**Файл:** `src/shared/matchMigration.js` (создать новый)

**Содержимое файла:**

```javascript
import { SET_STATUS } from './types/Match';

/**
 * Мигрирует старые данные матча к новой структуре с состояниями партий
 * @param {Object} match - Матч для миграции
 * @returns {Object} Мигрированный матч
 */
export function migrateMatchToSetStatus(match) {
  if (!match) {
    return match;
  }
  
  const migrated = { ...match };
  
  // Миграция завершенных партий
  if (Array.isArray(match.sets)) {
    migrated.sets = match.sets.map(set => {
      const migratedSet = { ...set };
      
      // Если партия завершена, но нет статуса
      if (set.completed && !set.status) {
        migratedSet.status = SET_STATUS.COMPLETED;
      }
      
      // Если партия не завершена и нет статуса
      if (!set.completed && !set.status) {
        migratedSet.status = SET_STATUS.PENDING;
      }
      
      // Вычисляем duration, если есть время
      if (migratedSet.startTime && migratedSet.endTime) {
        const duration = Math.round((migratedSet.endTime - migratedSet.startTime) / 60000);
        migratedSet.duration = duration;
      }
      
      return migratedSet;
    });
  }
  
  // Миграция текущей партии
  if (match.currentSet) {
    const currentSet = { ...match.currentSet };
    
    // Если статус не установлен
    if (!currentSet.status) {
      // Если счет > 0, считаем партию начатой
      if (currentSet.scoreA > 0 || currentSet.scoreB > 0) {
        currentSet.status = SET_STATUS.IN_PROGRESS;
        
        // Если нет startTime, используем updatedAt как приблизительное время начала
        if (!currentSet.startTime && match.updatedAt) {
          try {
            currentSet.startTime = new Date(match.updatedAt).getTime();
          } catch (e) {
            console.warn('Ошибка при установке startTime из updatedAt:', e);
          }
        }
      } else {
        currentSet.status = SET_STATUS.PENDING;
      }
    }
    
    migrated.currentSet = currentSet;
  }
  
  return migrated;
}

/**
 * Проверяет, нужна ли миграция матча
 * @param {Object} match - Матч для проверки
 * @returns {boolean} true, если миграция необходима
 */
export function needsMigration(match) {
  if (!match) return false;
  
  // Проверяем завершенные партии
  if (Array.isArray(match.sets)) {
    const hasUnmigratedSet = match.sets.some(set => 
      set.completed !== undefined && set.status === undefined
    );
    if (hasUnmigratedSet) return true;
  }
  
  // Проверяем текущую партию
  if (match.currentSet && match.currentSet.status === undefined) {
    return true;
  }
  
  return false;
}
```

**Проверка:** Убедитесь, что функции корректно обрабатывают старые данные.

---

### Шаг 1.4: Применение миграции при загрузке матча

**Файл:** `src/main/fileManager.js`

**Действия:**

1. **Импортируйте функции миграции в начало файла:**

```javascript
import { migrateMatchToSetStatus, needsMigration } from '../shared/matchMigration';
```

2. **Найдите функцию загрузки матча (например, `loadMatch` или `openMatch`) и добавьте миграцию:**

```javascript
// Пример (адаптируйте под вашу структуру):
async function loadMatch(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    let match = JSON.parse(data);
    
    // Применяем миграцию, если необходимо
    if (needsMigration(match)) {
      match = migrateMatchToSetStatus(match);
      // Опционально: сохранить мигрированный матч обратно
      // await saveMatch(filePath, match);
    }
    
    return match;
  } catch (error) {
    // обработка ошибок
  }
}
```

**Проверка:** Загрузите старый матч и убедитесь, что миграция применяется корректно.

---

## Этап 2: Логика управления состояниями

### Шаг 2.1: Создание функций валидации

**Файл:** `src/shared/setValidation.js` (создать новый)

**Содержимое файла:**

```javascript
import { canFinishSet } from './volleyballRules';
import { SET_STATUS } from './types/Match';

/**
 * Валидирует изменения партии
 * @param {Object} set - Текущие данные партии (Set или CurrentSet)
 * @param {Object} updates - Предлагаемые изменения
 * @param {number} currentSetNumber - Номер текущей партии
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateSetUpdate(set, updates, currentSetNumber) {
  const errors = [];
  
  // Получаем финальные значения (обновленные или текущие)
  const finalScoreA = updates.scoreA !== undefined ? updates.scoreA : set.scoreA;
  const finalScoreB = updates.scoreB !== undefined ? updates.scoreB : set.scoreB;
  const finalStatus = updates.status !== undefined ? updates.status : set.status;
  const finalStartTime = updates.startTime !== undefined ? updates.startTime : set.startTime;
  const finalEndTime = updates.endTime !== undefined ? updates.endTime : set.endTime;
  
  // Проверка 1: Время завершения не может быть раньше времени начала
  if (finalStartTime && finalEndTime) {
    if (finalEndTime < finalStartTime) {
      errors.push('Время завершения не может быть раньше времени начала');
    }
  }
  
  // Проверка 2: Счет для завершенных партий должен соответствовать правилам
  if (finalStatus === SET_STATUS.COMPLETED || 
      (set.status === SET_STATUS.COMPLETED && finalStatus !== SET_STATUS.PENDING)) {
    if (!canFinishSet(finalScoreA, finalScoreB, set.setNumber)) {
      const threshold = set.setNumber === 5 ? 15 : 25;
      errors.push(
        `Счет не соответствует правилам завершения партии. ` +
        `Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`
      );
    }
  }
  
  // Проверка 3: Завершенная партия должна иметь время начала и завершения
  if (finalStatus === SET_STATUS.COMPLETED) {
    if (!finalStartTime || !finalEndTime) {
      errors.push('Завершенная партия должна иметь время начала и завершения');
    }
  }
  
  // Проверка 4: Нельзя перейти из completed в in_progress без корректировки времени
  if (set.status === SET_STATUS.COMPLETED && finalStatus === SET_STATUS.IN_PROGRESS) {
    if (finalEndTime !== undefined && finalEndTime !== null) {
      errors.push('Нельзя перевести завершенную партию в статус "В игре" без удаления времени завершения');
    }
  }
  
  // Проверка 5: Счет не может быть отрицательным
  if (finalScoreA < 0 || finalScoreB < 0) {
    errors.push('Счет не может быть отрицательным');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Проверка:** Создайте простые тесты для проверки валидации.

---

### Шаг 2.2: Обновление useMatch hook

**Файл:** `src/renderer/hooks/useMatch.js`

**Действия:**

1. **Добавьте импорты в начало файла:**

```javascript
import { SET_STATUS } from '../../shared/types/Match';
import { calculateDuration } from '../../shared/timeUtils';
import { validateSetUpdate } from '../../shared/setValidation';
import { migrateMatchToSetStatus } from '../../shared/matchMigration';
```

2. **Обновите инициализацию состояния для применения миграции:**

```javascript
export function useMatch(initialMatch) {
  // Применяем миграцию при инициализации
  const migratedMatch = initialMatch && migrateMatchToSetStatus(initialMatch);
  const [match, setMatch] = useState(migratedMatch);
  // ... остальной код ...
}
```

3. **Добавьте функцию `startSet()` перед `finishSet()`:**

```javascript
/**
 * Начинает текущую партию
 */
const startSet = useCallback(() => {
  if (!match) return;
  
  setMatch(prevMatch => {
    if (!prevMatch) return prevMatch;
    
    // Проверяем, что партия еще не начата
    if (prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS) {
      console.warn('Партия уже начата');
      return prevMatch;
    }
    
    const previousState = { ...prevMatch };
    const newMatch = { ...prevMatch };
    
    // Вычисляем номер следующей партии (если партия еще не начата)
    const nextSetNumber = prevMatch.sets.length + 1;
    
    // Устанавливаем статус и время начала, обнуляем счет, обновляем номер партии
    newMatch.currentSet = {
      ...newMatch.currentSet,
      setNumber: nextSetNumber, // Обновляем номер партии при начале
      status: SET_STATUS.IN_PROGRESS,
      startTime: Date.now(),
      scoreA: 0, // Обнуляем счет при начале партии
      scoreB: 0, // Обнуляем счет при начале партии
    };
    
    newMatch.updatedAt = new Date().toISOString();
    
    addToHistory({
      type: 'set_start',
      previousState,
    });
    
    return newMatch;
  });
}, [addToHistory, match]);
```

**Важно:** Функция `startSet()` обнуляет счет и обновляет номер партии. Это сделано для того, чтобы счет обнулялся только при явном начале партии, а не при завершении предыдущей.

4. **Обновите функцию `finishSet()` для работы с таймингом:**

```javascript
/**
 * Завершает текущую партию
 */
const finishSet = useCallback(() => {
  if (!match) return;
  
  setMatch(prevMatch => {
    if (!prevMatch) return prevMatch;
    
    const previousState = { ...prevMatch };
    const newMatch = { ...prevMatch };
    
    const { scoreA, scoreB, setNumber, startTime } = newMatch.currentSet;
    
    // Проверяем, можно ли завершить партию
    if (!canFinishSet(scoreA, scoreB, setNumber)) {
      const threshold = setNumber === 5 ? 15 : 25;
      alert(`Партия не может быть завершена. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`);
      return prevMatch;
    }
    
    // Фиксируем время завершения
    const endTime = Date.now();
    
    // Вычисляем продолжительность
    const duration = startTime 
      ? calculateDuration(startTime, endTime)
      : null;
    
    // Сохраняем завершенную партию
    const completedSet = {
      setNumber: newMatch.currentSet.setNumber,
      scoreA,
      scoreB,
      completed: true,
      status: SET_STATUS.COMPLETED,
      startTime: startTime || undefined,
      endTime,
      duration,
    };
    
    newMatch.sets = [...newMatch.sets, completedSet];
    
    // Создаем новую партию со статусом PENDING
    // Номер партии и счет сохраняются - обновятся при начале новой партии
    // Это позволяет не обнулять счет сразу после завершения партии
    const winner = getSetWinner(scoreA, scoreB);
    newMatch.currentSet = {
      ...newMatch.currentSet, // Сохраняем текущий номер партии и счет
      servingTeam: winner,
      status: SET_STATUS.PENDING,
    };
    
    newMatch.updatedAt = new Date().toISOString();
```

**Важно:** Функция `finishSet()` сохраняет текущий номер партии и счет в следующей pending партии. Счет обнуляется и номер партии обновляется только при вызове `startSet()` для следующей партии. Это позволяет видеть счет завершенной партии до начала следующей.
    
    addToHistory({
      type: 'set_finish',
      previousState,
    });
    
    return newMatch;
  });
}, [addToHistory, match]);
```

5. **Добавьте функцию `toggleSetStatus()`:**

```javascript
/**
 * Переключает статус партии (для toggle-кнопки)
 */
const toggleSetStatus = useCallback(() => {
  if (!match) return;
  
  const currentStatus = match.currentSet.status || SET_STATUS.PENDING;
  
  if (currentStatus === SET_STATUS.PENDING) {
    startSet();
  } else if (currentStatus === SET_STATUS.IN_PROGRESS) {
    finishSet();
  }
}, [match, startSet, finishSet]);
```

6. **Обновите функцию `changeScore()` для блокировки при неактивной партии:**

```javascript
/**
 * Изменяет счет команды
 */
const changeScore = useCallback((team, delta) => {
  if (!match) return;
  
  // Проверяем, что партия начата
  if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
    return; // Не изменяем счет, если партия не начата
  }
  
  // ... остальной код функции ...
}, [addToHistory, match]);
```

**Важно:** Добавлена проверка статуса партии, чтобы предотвратить изменение счета, когда партия не начата.

7. **Добавьте функцию `updateSet()` для модального окна:**

```javascript
/**
 * Обновляет данные партии (для модального окна редактирования)
 * @param {number} setNumber - Номер партии для обновления
 * @param {Object} updates - Обновления (scoreA, scoreB, status, startTime, endTime)
 */
const updateSet = useCallback((setNumber, updates) => {
  if (!match) return false;
  
  setMatch(prevMatch => {
    if (!prevMatch) return prevMatch;
    
    const previousState = { ...prevMatch };
    const newMatch = { ...prevMatch };
    
    // Определяем, обновляем ли мы текущую партию или завершенную
    const isCurrentSet = setNumber === prevMatch.currentSet.setNumber;
    
    if (isCurrentSet) {
      // Обновляем текущую партию
      const set = prevMatch.currentSet;
      const validation = validateSetUpdate(set, updates, setNumber);
      
      if (!validation.valid) {
        alert(validation.errors.join('\n'));
        return prevMatch;
      }
      
      // Применяем обновления
      const updatedSet = {
        ...prevMatch.currentSet,
        ...updates,
      };
      
      // Пересчитываем duration, если изменилось время
      if (updates.startTime !== undefined || updates.endTime !== undefined) {
        const startTime = updatedSet.startTime;
        const endTime = updatedSet.endTime;
        if (startTime && endTime) {
          updatedSet.duration = calculateDuration(startTime, endTime);
        } else {
          updatedSet.duration = undefined;
        }
      }
      
      newMatch.currentSet = updatedSet;
    } else {
      // Обновляем завершенную партию
      const setIndex = prevMatch.sets.findIndex(s => s.setNumber === setNumber);
      if (setIndex === -1) {
        console.error(`Партия ${setNumber} не найдена`);
        return prevMatch;
      }
      
      const set = prevMatch.sets[setIndex];
      const validation = validateSetUpdate(set, updates, setNumber);
      
      if (!validation.valid) {
        alert(validation.errors.join('\n'));
        return prevMatch;
      }
      
      // Применяем обновления
      const updatedSet = {
        ...set,
        ...updates,
      };
      
      // Пересчитываем duration
      if (updates.startTime !== undefined || updates.endTime !== undefined) {
        const startTime = updatedSet.startTime;
        const endTime = updatedSet.endTime;
        if (startTime && endTime) {
          updatedSet.duration = calculateDuration(startTime, endTime);
        } else {
          updatedSet.duration = undefined;
        }
      }
      
      // Обновляем completed в зависимости от status
      if (updates.status !== undefined) {
        updatedSet.completed = updates.status === SET_STATUS.COMPLETED;
      }
      
      // Обновляем массив партий
      const newSets = [...prevMatch.sets];
      newSets[setIndex] = updatedSet;
      newMatch.sets = newSets;
    }
    
    newMatch.updatedAt = new Date().toISOString();
    
    addToHistory({
      type: 'set_update',
      setNumber,
      updates,
      previousState,
    });
    
    return newMatch;
  });
  
  return true;
}, [addToHistory, match]);
```

7. **Обновите возвращаемые значения hook:**

```javascript
return {
  match,
  setMatch,
  changeScore,
  changeServingTeam,
  finishSet,
  startSet, // Добавить
  toggleSetStatus, // Добавить
  updateSet, // Добавить
  changeStatistics,
  toggleStatistics,
  undoLastAction,
  isSetballNow: setballInfo.isSetball,
  setballTeam: setballInfo.team,
  isMatchballNow: matchballInfo.isMatchball,
  matchballTeam: matchballInfo.team,
  canFinish,
  hasHistory: actionHistory.length > 0,
  currentSetStatus: match?.currentSet?.status || SET_STATUS.PENDING, // Добавить для удобства
};
```

**Проверка:** Убедитесь, что все функции работают корректно. Протестируйте в консоли браузера.

---

## Этап 3: UI компоненты (основная версия)

### Шаг 3.1: Обновление SetsDisplay компонента

**Файл:** `src/renderer/components/SetsDisplay.jsx`

**Действия:**

1. **Добавьте импорты:**

```javascript
import { memo } from 'react';
import { SET_STATUS } from '../../shared/types/Match';
import { formatDuration } from '../../shared/timeUtils';
```

2. **Обновите пропсы компонента:**

```javascript
const SetsDisplay = memo(function SetsDisplay({ 
  sets, 
  currentSet, // Изменить с currentSetNumber на currentSet
  onSetClick // Новый пропс для обработки клика
}) {
```

3. **Обновите логику отображения:**

```javascript
return (
  <div style={{
    backgroundColor: '#ecf0f1',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
  }}>
    <h3 style={{ marginTop: 0 }}>Счет по партиям:</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
      {[1, 2, 3, 4, 5].map((setNum) => {
        const set = sets.find(s => s.setNumber === setNum);
        const isCurrent = setNum === currentSet.setNumber;
        const status = isCurrent 
          ? (currentSet.status || SET_STATUS.PENDING)
          : (set?.status || SET_STATUS.PENDING);
        
        // Определяем стили в зависимости от статуса
        let backgroundColor, color, content;
        
        if (status === SET_STATUS.COMPLETED && set) {
          // Завершенная партия
          backgroundColor = '#27ae60';
          color = 'white';
          const duration = set.duration ? formatDuration(set.duration) : '';
          content = (
            <>
              <div style={{ fontSize: '0.8rem' }}>Партия {setNum}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                {set.scoreA} - {set.scoreB}
              </div>
              {duration && (
                <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                  {duration}
                </div>
              )}
            </>
          );
        } else if (status === SET_STATUS.IN_PROGRESS && isCurrent) {
          // Текущая партия в игре
          backgroundColor = '#3498db';
          color = 'white';
          content = (
            <>
              <div style={{ fontSize: '0.8rem' }}>Партия {setNum}</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>В игре</div>
              <div style={{ fontSize: '1rem' }}>
                {currentSet.scoreA} - {currentSet.scoreB}
              </div>
            </>
          );
        } else {
          // Партия не начата
          backgroundColor = '#bdc3c7';
          color = '#7f8c8d';
          content = (
            <>
              <div style={{ fontSize: '0.8rem' }}>Партия {setNum}</div>
              <div style={{ fontSize: '1.2rem' }}>-</div>
            </>
          );
        }
        
        return (
          <div
            key={setNum}
            onClick={() => onSetClick && onSetClick(setNum)}
            style={{
              padding: '0.5rem',
              backgroundColor,
              color,
              borderRadius: '4px',
              textAlign: 'center',
              cursor: onSetClick ? 'pointer' : 'default',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => {
              if (onSetClick) {
                e.currentTarget.style.opacity = '0.8';
              }
            }}
            onMouseLeave={(e) => {
              if (onSetClick) {
                e.currentTarget.style.opacity = '1';
              }
            }}
          >
            {content}
          </div>
        );
      })}
    </div>
  </div>
);
```

**Проверка:** Убедитесь, что компонент корректно отображает все состояния.

---

### Шаг 3.2: Создание SetEditModal компонента

**Файл:** `src/renderer/components/SetEditModal.jsx` (создать новый)

**Содержимое файла:**

```javascript
import { useState, useEffect } from 'react';
import { SET_STATUS } from '../../shared/types/Match';
import { formatTimestamp, toTimestamp, calculateDuration, formatDuration } from '../../shared/timeUtils';

/**
 * Модальное окно для редактирования партии
 */
export default function SetEditModal({ 
  isOpen, 
  onClose, 
  set, 
  isCurrentSet, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    scoreA: 0,
    scoreB: 0,
    status: SET_STATUS.PENDING,
    startTime: null,
    endTime: null,
  });
  const [errors, setErrors] = useState([]);
  
  // Инициализация формы при открытии модального окна
  useEffect(() => {
    if (isOpen && set) {
      setFormData({
        scoreA: set.scoreA || 0,
        scoreB: set.scoreB || 0,
        status: set.status || SET_STATUS.PENDING,
        startTime: set.startTime || null,
        endTime: set.endTime || null,
      });
      setErrors([]);
    }
  }, [isOpen, set]);
  
  // Вычисляем продолжительность
  const duration = formData.startTime && formData.endTime
    ? calculateDuration(formData.startTime, formData.endTime)
    : null;
  
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setErrors([]);
  };
  
  const handleDateTimeChange = (field, value) => {
    if (!value) {
      handleChange(field, null);
      return;
    }
    
    try {
      // Конвертируем datetime-local в timestamp
      const timestamp = new Date(value).getTime();
      handleChange(field, timestamp);
    } catch (e) {
      console.error('Ошибка при парсинге даты:', e);
      setErrors(['Некорректный формат даты/времени']);
    }
  };
  
  const handleSave = () => {
    const updates = {
      scoreA: parseInt(formData.scoreA, 10),
      scoreB: parseInt(formData.scoreB, 10),
      status: formData.status,
    };
    
    if (formData.startTime) {
      updates.startTime = formData.startTime;
    }
    
    if (formData.endTime) {
      updates.endTime = formData.endTime;
    }
    
    // Вызываем onSave, который должен выполнить валидацию
    if (onSave) {
      const result = onSave(updates);
      if (result) {
        onClose();
      }
    }
  };
  
  if (!isOpen) return null;
  
  // Конвертируем timestamp в datetime-local формат для input
  const startDateTime = formData.startTime 
    ? new Date(formData.startTime).toISOString().slice(0, 16)
    : '';
  const endDateTime = formData.endTime 
    ? new Date(formData.endTime).toISOString().slice(0, 16)
    : '';
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Редактирование партии {set?.setNumber}</h2>
        
        {errors.length > 0 && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}>
            {errors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </div>
        )}
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Счет команды A:
          </label>
          <input
            type="number"
            min="0"
            value={formData.scoreA}
            onChange={(e) => handleChange('scoreA', e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Счет команды B:
          </label>
          <input
            type="number"
            min="0"
            value={formData.scoreB}
            onChange={(e) => handleChange('scoreB', e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Статус:
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            disabled={isCurrentSet && formData.status === SET_STATUS.IN_PROGRESS}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            <option value={SET_STATUS.PENDING}>Не начата</option>
            <option value={SET_STATUS.IN_PROGRESS}>В игре</option>
            <option value={SET_STATUS.COMPLETED}>Завершена</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Время начала:
          </label>
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => handleDateTimeChange('startTime', e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          {formData.startTime && (
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              {formatTimestamp(formData.startTime)}
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Время завершения:
          </label>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => handleDateTimeChange('endTime', e.target.value)}
            disabled={formData.status !== SET_STATUS.COMPLETED}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              opacity: formData.status !== SET_STATUS.COMPLETED ? 0.5 : 1,
            }}
          />
          {formData.endTime && (
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              {formatTimestamp(formData.endTime)}
            </div>
          )}
        </div>
        
        {duration !== null && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            <strong>Продолжительность:</strong> {formatDuration(duration)}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Проверка:** Убедитесь, что модальное окно открывается и корректно отображает данные.

---

### Шаг 3.3: Обновление MatchControlPage

**Файл:** `src/renderer/pages/MatchControlPage.jsx`

**Действия:**

1. **Добавьте импорты:**

```javascript
import SetEditModal from '../components/SetEditModal';
import { SET_STATUS } from '../../shared/types/Match';
```

2. **Добавьте состояние для модального окна:**

```javascript
const [editingSetNumber, setEditingSetNumber] = useState(null);
```

3. **Обновите использование SetsDisplay:**

```javascript
<SetsDisplay
  sets={match.sets}
  currentSet={match.currentSet}
  onSetClick={(setNumber) => setEditingSetNumber(setNumber)}
/>
```

4. **Замените кнопку "Завершить партию" на toggle-кнопку:**

```javascript
// Найти существующую кнопку и заменить на:
<button
  onClick={toggleSetStatus}
  style={{
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    backgroundColor: currentSetStatus === SET_STATUS.PENDING 
      ? "#3498db" 
      : "#27ae60",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  }}
>
  {currentSetStatus === SET_STATUS.PENDING 
    ? "Начать партию" 
    : "Завершить партию"}
</button>
```

5. **Добавьте блокировку кнопок управления счетом при неактивной партии:**

```javascript
// Обновите использование ScoreButtons:
<ScoreButtons
  teamAName={match.teamA.name}
  teamBName={match.teamB.name}
  onScoreChange={changeScore}
  disabled={currentSetStatus !== SET_STATUS.IN_PROGRESS} // Блокируем при неактивной партии
/>

// Обновите кнопку "Отменить последнее действие":
<button
  onClick={undoLastAction}
  disabled={!hasHistory || currentSetStatus !== SET_STATUS.IN_PROGRESS}
  style={{
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    backgroundColor: (hasHistory && currentSetStatus === SET_STATUS.IN_PROGRESS) 
      ? "#e74c3c" 
      : "#95a5a6",
    // ... остальные стили
  }}
>
  Отменить последнее действие
</button>
```

**Важно:** Кнопки изменения счета и отмены действий блокируются, когда партия не начата. Это предотвращает случайные изменения счета до начала партии.

6. **Добавьте модальное окно в конец компонента:**

```javascript
{editingSetNumber && (
  <SetEditModal
    isOpen={true}
    onClose={() => setEditingSetNumber(null)}
    set={
      editingSetNumber === match.currentSet.setNumber
        ? match.currentSet
        : match.sets.find(s => s.setNumber === editingSetNumber)
    }
    isCurrentSet={editingSetNumber === match.currentSet.setNumber}
    onSave={(updates) => {
      const success = updateSet(editingSetNumber, updates);
      if (success) {
        setEditingSetNumber(null);
      }
      return success;
    }}
  />
)}
```

6. **Обновите деструктуризацию useMatch:**

```javascript
const {
  match,
  setMatch,
  changeScore,
  changeServingTeam,
  finishSet,
  startSet,
  toggleSetStatus, // Добавить
  updateSet, // Добавить
  changeStatistics,
  toggleStatistics,
  undoLastAction,
  isSetballNow,
  setballTeam,
  isMatchballNow,
  matchballTeam,
  canFinish,
  hasHistory,
  currentSetStatus, // Добавить
} = useMatch(initialMatch);
```

**Проверка:** Протестируйте все функции: начало партии, завершение, редактирование через модальное окно.

---

## Этап 4: Мобильная версия

### Шаг 4.1: Обновление API мобильного сервера

**Файл:** `src/main/server.js`

**Действия:**

1. **Найдите API завершения партии и обновите его:**

```javascript
// API: Завершение партии
this.app.post('/api/match/:sessionId/set', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!this.validateSession(sessionId)) {
      return res.status(403).json({ error: 'Неверная или истекшая сессия' });
    }

    if (!this.currentMatch) {
      return res.status(404).json({ error: 'Матч не найден' });
    }

    const { scoreA, scoreB, setNumber, startTime } = this.currentMatch.currentSet;
    
    // Проверяем, можно ли завершить партию
    const maxScore = Math.max(scoreA, scoreB);
    const minScore = Math.min(scoreA, scoreB);
    const finishThreshold = setNumber === 5 ? 15 : 25;
    
    if (maxScore < finishThreshold || (maxScore - minScore) < 2) {
      return res.status(400).json({ 
        error: `Партия не может быть завершена. Необходимо набрать ${finishThreshold} очков с разницей минимум 2 очка.` 
      });
    }
    
    // Фиксируем время завершения
    const endTime = Date.now();
    const duration = startTime ? Math.round((endTime - startTime) / 60000) : null;
    
    // Сохраняем завершенную партию
    const completedSet = {
      setNumber: this.currentMatch.currentSet.setNumber,
      scoreA,
      scoreB,
      completed: true,
      status: 'completed',
      startTime: startTime || undefined,
      endTime,
      duration,
    };
    
    this.currentMatch.sets = [...this.currentMatch.sets, completedSet];
    
    // Создаем новую партию со статусом PENDING
    // Номер партии и счет сохраняются - обновятся при начале новой партии
    const winner = scoreA > scoreB ? 'A' : 'B';
    this.currentMatch.currentSet = {
      ...this.currentMatch.currentSet, // Сохраняем текущий номер партии и счет
      servingTeam: winner,
      status: 'pending',
    };
    
    this.currentMatch.updatedAt = new Date().toISOString();
```

**Важно:** При завершении партии счет и номер партии сохраняются в следующей pending партии. Они обновятся только при вызове API начала партии.

    // Уведомляем основное приложение об изменении матча
    if (this.onMatchUpdate) {
      this.onMatchUpdate(this.currentMatch);
    }

    res.json({ success: true, match: this.currentMatch });
  } catch (error) {
    const friendlyError = errorHandler.handleError(error, 'API: finish set');
    res.status(500).json({ error: friendlyError });
  }
});
```

2. **Добавьте новый API для начала партии:**

```javascript
// API: Начало партии
this.app.post('/api/match/:sessionId/set/start', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!this.validateSession(sessionId)) {
      return res.status(403).json({ error: 'Неверная или истекшая сессия' });
    }

    if (!this.currentMatch) {
      return res.status(404).json({ error: 'Матч не найден' });
    }

    // Проверяем, что партия еще не начата
    if (this.currentMatch.currentSet.status === 'in_progress') {
      return res.status(400).json({ error: 'Партия уже начата' });
    }

    // Вычисляем номер следующей партии (если партия еще не начата)
    const nextSetNumber = this.currentMatch.sets.length + 1;

    // Устанавливаем статус и время начала, обнуляем счет, обновляем номер партии
    this.currentMatch.currentSet.setNumber = nextSetNumber; // Обновляем номер партии при начале
    this.currentMatch.currentSet.status = 'in_progress';
    this.currentMatch.currentSet.startTime = Date.now();
    this.currentMatch.currentSet.scoreA = 0; // Обнуляем счет при начале партии
    this.currentMatch.currentSet.scoreB = 0; // Обнуляем счет при начале партии
    this.currentMatch.updatedAt = new Date().toISOString();

    // Уведомляем основное приложение об изменении матча
    if (this.onMatchUpdate) {
      this.onMatchUpdate(this.currentMatch);
    }

    res.json({ success: true, match: this.currentMatch });
  } catch (error) {
    const friendlyError = errorHandler.handleError(error, 'API: start set');
    res.status(500).json({ error: friendlyError });
  }
});
```

3. **Обновите функцию `updateSetsList()` в HTML мобильной панели:**

Найдите функцию `updateSetsList()` в методе `getMobilePanelHTML()` и обновите её:

```javascript
function updateSetsList() {
  const setsList = document.getElementById('setsList');
  if (!setsList) return;
  
  setsList.innerHTML = '';
  
  // Показываем все 5 партий
  for (let i = 1; i <= 5; i++) {
    const set = matchData.sets.find(s => s.setNumber === i);
    const isCurrent = i === matchData.currentSet.setNumber;
    const currentSet = matchData.currentSet;
    
    const setItem = document.createElement('div');
    setItem.className = 'set-item';
    
    let content = '';
    
    if (isCurrent) {
      // Текущая партия
      const status = currentSet.status || 'pending';
      setItem.classList.add('current');
      
      if (status === 'in_progress') {
        content = \`Партия \${i}: В игре (\${currentSet.scoreA}:\${currentSet.scoreB})\`;
      } else {
        content = \`Партия \${i}: Не начата\`;
      }
    } else if (set && set.status === 'completed') {
      // Завершенная партия
      const duration = set.duration ? \` (\${set.duration}')\` : '';
      content = \`Партия \${i}: \${set.scoreA}:\${set.scoreB}\${duration}\`;
    } else {
      // Партия не начата
      content = \`Партия \${i}: -\`;
    }
    
    setItem.textContent = content;
    setsList.appendChild(setItem);
  }
}
```

4. **Обновите кнопку "Завершить партию" в HTML:**

Найдите кнопку с id `finishBtn` и обновите её обработчик:

```javascript
// В функции updateMatchData():
const finishBtn = document.getElementById('finishBtn');
if (finishBtn) {
  const currentStatus = matchData.currentSet.status || 'pending';
  
  if (currentStatus === 'pending') {
    finishBtn.textContent = 'Начать партию';
    finishBtn.onclick = () => startSet();
    finishBtn.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
  } else {
    finishBtn.textContent = 'Завершить партию';
    finishBtn.onclick = () => finishSet();
    finishBtn.style.background = 'linear-gradient(135deg, #27ae60 0%, #229954 100%)';
  }
  
  // Для завершения партии проверяем canFinish
  if (currentStatus === 'in_progress') {
    const canFinish = canFinishSet(
      matchData.currentSet.scoreA, 
      matchData.currentSet.scoreB, 
      matchData.currentSet.setNumber
    );
    finishBtn.disabled = !canFinish;
  } else {
    finishBtn.disabled = false;
  }
}
```

5. **Добавьте функцию `startSet()` в JavaScript мобильной панели:**

```javascript
async function startSet() {
  updateStatus('syncing', 'Синхронизация...', true); // Локальное обновление
  
  try {
    const response = await fetch(\`/api/match/\${sessionId}/set/start\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const result = await response.json();
      matchData = result.match;
      updateUI();
      updateStatus('connected', null, false); // Обновление с сервера
    } else {
      const error = await response.json();
      alert('Ошибка: ' + (error.error || 'Не удалось начать партию'));
      updateStatus('disconnected', 'Ошибка');
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка подключения');
    updateStatus('disconnected', 'Ошибка');
  }
}
```

**Важно:** Используйте `sessionId` напрямую (он доступен в области видимости скрипта), а не функцию `getSessionId()`.

6. **Добавьте блокировку кнопок управления счетом при неактивной партии:**

В функции `updateUI()` добавьте:

```javascript
// Блокируем кнопки изменения счета и "Отменить", если партия не начата
const isSetInProgress = matchData.currentSet.status === 'in_progress';

// Кнопки изменения счета
const scoreButtons = document.querySelectorAll('.button.button-minus, .button.button-plus');
scoreButtons.forEach(btn => {
  btn.disabled = !isSetInProgress;
  btn.style.opacity = isSetInProgress ? '1' : '0.6';
  btn.style.cursor = isSetInProgress ? 'pointer' : 'not-allowed';
});

// Кнопка "Отменить"
const undoBtn = document.getElementById('undoBtn');
if (undoBtn) {
  const hasHistory = actionHistory.length > 0;
  undoBtn.disabled = !hasHistory || !isSetInProgress;
  if (!isSetInProgress) {
    undoBtn.style.opacity = '0.6';
    undoBtn.style.cursor = 'not-allowed';
  } else if (!hasHistory) {
    undoBtn.style.opacity = '0.6';
    undoBtn.style.cursor = 'not-allowed';
  } else {
    undoBtn.style.opacity = '1';
    undoBtn.style.cursor = 'pointer';
  }
}
```

Также обновите функцию `changeScore()`:

```javascript
async function changeScore(team, delta) {
  // Проверяем, что партия начата
  if (!matchData || matchData.currentSet.status !== 'in_progress') {
    return; // Не изменяем счет, если партия не начата
  }
  
  // ... остальной код функции ...
}
```

7. **Добавьте API endpoint для отмены действий:**

В `setupRoutes()` добавьте:

```javascript
// API: Отмена последнего действия
this.app.post('/api/match/:sessionId/undo', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { previousState } = req.body;
    
    if (!this.validateSession(sessionId)) {
      return res.status(403).json({ error: 'Неверная или истекшая сессия' });
    }

    if (!this.currentMatch) {
      return res.status(404).json({ error: 'Матч не найден' });
    }

    if (!previousState) {
      return res.status(400).json({ error: 'Предыдущее состояние не предоставлено' });
    }

    // Восстанавливаем предыдущее состояние
    // Сохраняем текущие логотипы (они не должны меняться при отмене)
    const currentLogoA = this.currentMatch.teamA?.logo || this.currentMatch.teamA?.logoBase64;
    const currentLogoB = this.currentMatch.teamB?.logo || this.currentMatch.teamB?.logoBase64;
    const currentLogoPathA = this.currentMatch.teamA?.logoPath;
    const currentLogoPathB = this.currentMatch.teamB?.logoPath;
    
    this.currentMatch = previousState;
    this.currentMatch.updatedAt = new Date().toISOString();
    
    // Восстанавливаем логотипы из текущего состояния (они не меняются при отмене)
    if (this.currentMatch.teamA) {
      if (currentLogoA) {
        this.currentMatch.teamA.logo = currentLogoA;
        this.currentMatch.teamA.logoBase64 = currentLogoA;
      }
      if (currentLogoPathA) {
        this.currentMatch.teamA.logoPath = currentLogoPathA;
      }
    }
    if (this.currentMatch.teamB) {
      if (currentLogoB) {
        this.currentMatch.teamB.logo = currentLogoB;
        this.currentMatch.teamB.logoBase64 = currentLogoB;
      }
      if (currentLogoPathB) {
        this.currentMatch.teamB.logoPath = currentLogoPathB;
      }
    }

    // Уведомляем основное приложение об изменении матча
    if (this.onMatchUpdate) {
      this.onMatchUpdate(this.currentMatch);
    }

    res.json({ success: true, match: this.currentMatch });
  } catch (error) {
    const friendlyError = errorHandler.handleError(error, 'API: undo action');
    res.status(500).json({ error: friendlyError });
  }
});
```

8. **Добавьте оптимизацию истории действий:**

В JavaScript мобильной панели добавьте функцию для создания облегченной копии матча:

```javascript
// Функция для создания облегченной копии матча (без логотипов в base64)
function createLightweightMatchCopy(match) {
  const copy = JSON.parse(JSON.stringify(match));
  
  // Удаляем base64 логотипы из копии (они не меняются при изменении счета/подачи)
  // Оставляем только logoPath для ссылки
  if (copy.teamA) {
    delete copy.teamA.logo;
    delete copy.teamA.logoBase64;
  }
  if (copy.teamB) {
    delete copy.teamB.logo;
    delete copy.teamB.logoBase64;
  }
  
  return copy;
}
```

Используйте эту функцию при сохранении истории действий:

```javascript
// В функции changeScore():
actionHistory.push({
  type: 'score',
  team,
  delta,
  previousState: createLightweightMatchCopy(matchData), // Используем облегченную копию
});

// В функции changeServingTeam():
actionHistory.push({
  type: 'serve',
  team,
  previousState: createLightweightMatchCopy(matchData), // Используем облегченную копию
});
```

9. **Добавьте функцию `undoAction()` в JavaScript мобильной панели:**

```javascript
async function undoAction() {
  if (actionHistory.length === 0) return;
  
  // Проверяем, что партия начата
  if (!matchData || matchData.currentSet.status !== 'in_progress') {
    return; // Не отменяем действия, если партия не начата
  }

  const lastAction = actionHistory.pop();
  
  if (!lastAction || !lastAction.previousState) {
    // Если нет предыдущего состояния, просто обновляем UI
    if (actionHistory.length === 0) {
      document.getElementById('undoBtn').disabled = true;
    }
    return;
  }

  updateStatus('syncing', 'Синхронизация...', true); // Локальное обновление
  
  try {
    const response = await fetch(\`/api/match/\${sessionId}/undo\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previousState: lastAction.previousState }),
    });
    
    if (response.ok) {
      const result = await response.json();
      matchData = result.match;
      updateUI();
      updateStatus('connected', null, false); // Обновление с сервера
      
      if (actionHistory.length === 0) {
        document.getElementById('undoBtn').disabled = true;
      }
    } else {
      const error = await response.json();
      alert('Ошибка: ' + (error.error || 'Не удалось отменить действие'));
      updateStatus('disconnected', 'Ошибка');
      // Возвращаем действие в историю при ошибке
      actionHistory.push(lastAction);
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка подключения');
    updateStatus('disconnected', 'Ошибка');
    // Возвращаем действие в историю при ошибке
    actionHistory.push(lastAction);
  }
}
```

**Проверка:** Протестируйте мобильную версию: начало партии, завершение, отображение статуса и продолжительности, блокировку кнопок, отмену действий.

---

## Этап 5: Тестирование

### Шаг 5.1: Создание тестов

Создайте тесты согласно плану в разделе 8 основного документа. Примеры тестов:

1. **`tests/unit/shared/timeUtils.test.js`**
2. **`tests/unit/shared/setValidation.test.js`**
3. **`tests/unit/renderer/useMatch-set-status.test.js`**

### Шаг 5.2: Ручное тестирование

**Чеклист для тестирования:**

1. ✅ Создание нового матча - текущая партия должна быть в статусе "pending"
2. ✅ Нажатие "Начать партию" - статус меняется на "in_progress", фиксируется startTime
3. ✅ Изменение счета - счет обновляется корректно
4. ✅ Нажатие "Завершить партию" - партия завершается, фиксируется endTime, вычисляется duration
5. ✅ Переход к следующей партии - новая партия в статусе "pending"
6. ✅ Клик на партию в SetsDisplay - открывается модальное окно
7. ✅ Редактирование завершенной партии - можно изменить счет, время, статус
8. ✅ Валидация - некорректные изменения отклоняются с сообщениями об ошибках
9. ✅ Мобильная версия - все функции работают через API
10. ✅ Загрузка старого матча - миграция применяется корректно

---

## Важные замечания

### Обратная совместимость

- Поле `completed` остается для обратной совместимости
- При сохранении матча оба поля (`completed` и `status`) должны быть синхронизированы
- Старые матчи автоматически мигрируются при загрузке

### Производительность

- Продолжительность вычисляется только при необходимости
- Используйте мемоизацию для компонентов, которые часто перерисовываются

### Безопасность

- Все пользовательские данные в модальном окне должны валидироваться
- Используйте `domUtils.js` для безопасного отображения данных в мобильной версии

### Ошибки

- Все ошибки должны логироваться в консоль
- Пользователю показываются понятные сообщения об ошибках
- Валидация предотвращает некорректные изменения

### Дополнительные реализованные функции

#### Блокировка управления счетом при неактивной партии

- Кнопки изменения счета (+1, -1) блокируются, когда партия не начата
- Кнопка "Отменить последнее действие" блокируется при неактивной партии
- Реализовано в основной версии (`MatchControlPage.jsx`, `ScoreButtons.jsx`)
- Реализовано в мобильной версии (`server.js`)

#### Оптимизация истории действий в мобильной версии

- Создана функция `createLightweightMatchCopy()` для исключения логотипов из истории
- Уменьшен объем данных при отмене действий (с нескольких МБ до десятков КБ)
- Логотипы сохраняются при восстановлении состояния

#### Отображение длительности "0'"

- Длительность показывается даже если она равна 0 (для тестирования)
- Реализовано в основной версии (`SetsDisplay.jsx`)
- Реализовано в мобильной версии (`server.js`)

#### Улучшения логики отображения статусов

- Компонент "Счет по партиям" обновляется сразу после завершения партии
- Текущий счет показывает "Партия #X - завершена" после завершения
- Номер партии обновляется только при нажатии "Начать партию"
- Счет обнуляется при нажатии "Начать партию", а не при "Завершить партию"

#### Исправления логики сетбола/матчбола

- Индикаторы "Сетбол" и "Матчбол" показываются только когда партия в статусе `in_progress`
- Исправлена проблема с неправильным отображением после завершения партии

---

## Заключение

Основной функционал реализован и работает. Дополнительно реализованы:

- ✅ Блокировка управления счетом при неактивной партии
- ✅ Оптимизация истории действий в мобильной версии
- ✅ API для отмены действий в мобильной версии
- ✅ Улучшения логики отображения статусов
- ✅ Исправления логики сетбола/матчбола

Если возникают проблемы:

1. Проверьте консоль браузера на ошибки
2. Убедитесь, что все импорты корректны
3. Проверьте, что миграция применяется при загрузке матчей
4. Убедитесь, что все функции экспортированы и импортированы правильно
5. Проверьте, что блокировка кнопок работает корректно
6. Убедитесь, что история действий оптимизирована (без логотипов в base64)

См. также `set-status-and-timing-plan.md` для полного списка реализованных функций.
