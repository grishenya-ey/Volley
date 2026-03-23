# Документация: Логика управления счетом и состояниями партий

**Статус:** Актуальная документация текущей реализации  
**Цель:** Подробное описание логики управления счётом и состояниями партий

*Последнее обновление: 2026-02-06*

---

## Оглавление

1. [Структура данных](#структура-данных)
2. [Хранение счета](#хранение-счета)
3. [Начисление счета](#начисление-счета)
4. [Логика смены состояний партий](#логика-смены-состояний-партий)
5. [Логика кнопок управления партией](#логика-кнопок-управления-партией)
6. [Управление текущим счетом](#управление-текущим-счетом)
7. [Отмена последнего действия](#отмена-последнего-действия)
8. [Состояние модальных окон](#состояние-модальных-окон)
9. [Редактирование партий](#редактирование-партий)
10. [Связанные функции и методы](#связанные-функции-и-методы)
11. [Потоки данных](#потоки-данных)
12. [Проблемные места и рекомендации](#проблемные-места-и-рекомендации)

---

## Структура данных

### Основные типы

#### `Match` (src/shared/types/Match.ts)

```typescript
interface Match {
  matchId: string;
  // ... другие поля ...
  sets: Set[];              // Массив завершенных партий
  currentSet: CurrentSet;  // Текущая партия
  statistics: Statistics;
  createdAt: string;
  updatedAt: string;       // Используется для триггера обновлений
}
```

**Ключевые особенности:**
- `sets` - массив завершенных партий (только `status === COMPLETED`)
- `currentSet` - текущая партия (может быть `PENDING` или `IN_PROGRESS`)
- `updatedAt` - обновляется при каждом изменении для триггера синхронизации

#### `Set` (завершенная партия)

```typescript
interface Set {
  setNumber: number;        // Номер партии (1-5)
  scoreA: number;           // Финальный счет команды A
  scoreB: number;           // Финальный счет команды B
  completed: boolean;       // Флаг завершенности (для обратной совместимости)
  status: SetStatus;        // 'completed' (обязательно для завершенных)
  startTime?: number;       // Timestamp начала (milliseconds)
  endTime?: number;         // Timestamp завершения (milliseconds)
  duration?: number;        // Продолжительность в минутах (вычисляемое)
}
```

**Важно:**
- Завершенные партии хранятся только в `match.sets[]`
- `completed === true` и `status === 'completed'` должны совпадать
- `duration` вычисляется автоматически при наличии обоих времен

#### `CurrentSet` (текущая партия)

```typescript
interface CurrentSet {
  setNumber: number;        // Номер текущей партии
  scoreA: number;           // Текущий счет команды A
  scoreB: number;           // Текущий счет команды B
  servingTeam: 'A' | 'B';  // Команда, которая подает
  status: SetStatus;        // 'pending' | 'in_progress' (НЕ 'completed')
  startTime?: number;       // Timestamp начала (только для IN_PROGRESS)
}
```

**Критически важно:**
- `currentSet` НИКОГДА не имеет `status === 'completed'`
- При завершении партии она перемещается из `currentSet` в `sets[]`
- `currentSet.setNumber` может совпадать с номером завершенной партии (если следующая еще не начата)

### Состояния партий (SET_STATUS)

```typescript
const SET_STATUS = {
  PENDING: 'pending',       // Партия не начата
  IN_PROGRESS: 'in_progress', // Партия идет
  COMPLETED: 'completed',    // Партия завершена
}
```

**Правила переходов:**
- `PENDING` → `IN_PROGRESS` (через `startSet()`)
- `IN_PROGRESS` → `COMPLETED` (через `finishSet()`)
- `COMPLETED` → `IN_PROGRESS` (через `updateSet()` - только если следующая не начата)
- `IN_PROGRESS` → `PENDING` (через `updateSet()` - сброс текущей партии)
- `COMPLETED` → `PENDING` (через `updateSet()` - удаление завершенной партии)

---

## Хранение счета

### Где хранится счет

1. **Текущая партия:**
   - `match.currentSet.scoreA` - счет команды A
   - `match.currentSet.scoreB` - счет команды B
   - Обновляется через `changeScore()` при начислении очков

2. **Завершенные партии:**
   - `match.sets[].scoreA` - финальный счет команды A в партии
   - `match.sets[].scoreB` - финальный счет команды B в партии
   - Обновляется через `finishSet()` при завершении партии
   - Может быть изменен через `updateSet()` при редактировании

3. **Счет по партиям (для vMix):**
   - Вычисляется функцией `calculateSetsScore(match, team)` в `useVMix.js`
   - Подсчитывает количество выигранных партий для команды
   - Учитывает только завершенные партии (`completed === true` или `status === 'completed'`)

### Инициализация счета

**При создании нового матча:**
```javascript
currentSet: {
  setNumber: 1,
  scoreA: 0,
  scoreB: 0,
  servingTeam: 'A',
  status: SET_STATUS.PENDING,
}
```

**При начале партии (`startSet()`):**
```javascript
currentSet: {
  ...currentSet,
  scoreA: 0,  // Обнуляется
  scoreB: 0,  // Обнуляется
  status: SET_STATUS.IN_PROGRESS,
  startTime: Date.now(),
}
```

**При завершении партии (`finishSet()`):**
```javascript
// Завершенная партия добавляется в sets[]
sets: [...sets, {
  setNumber: currentSet.setNumber,
  scoreA: currentSet.scoreA,  // Финальный счет
  scoreB: currentSet.scoreB,  // Финальный счет
  completed: true,
  status: SET_STATUS.COMPLETED,
  startTime: currentSet.startTime,
  endTime: Date.now(),
  duration: calculateDuration(startTime, endTime),
}]

// currentSet сбрасывается для следующей партии
currentSet: {
  ...currentSet,
  scoreA: 0,  // Обнуляется
  scoreB: 0,  // Обнуляется
  status: SET_STATUS.PENDING,
  startTime: null,
  endTime: null,
}
```

---

## Начисление счета

### Функция `changeScore(team, delta)`

**Файл:** `src/renderer/hooks/useMatch.js` (строки 58-108)

**Параметры:**
- `team: 'A' | 'B'` - команда, для которой изменяется счет
- `delta: number` - изменение счета (+1 или -1)

**Логика работы:**

1. **Проверка состояния партии:**
   ```javascript
   if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
     return; // Не изменяем счет, если партия не начата
   }
   ```

2. **Обновление счета:**
   ```javascript
   if (team === 'A') {
     const newScore = Math.max(0, newMatch.currentSet.scoreA + delta);
     newMatch.currentSet = {
       ...newMatch.currentSet,
       scoreA: newScore,
     };
   }
   // Аналогично для команды B
   ```

3. **Автоматический переход подачи:**
   ```javascript
   // При начислении очка (delta > 0) подача переходит к команде, которая забила
   if (delta > 0) {
     newMatch.currentSet.servingTeam = team;
   }
   ```

4. **Сохранение в историю:**
   ```javascript
   addToHistory({
     type: 'score_change',
     team,
     delta,
     previousState,  // Полная копия match до изменения
   });
   ```

**Важные особенности:**
- Счет не может быть отрицательным (`Math.max(0, ...)`)
- Подача меняется только при начислении очка (delta > 0)
- Каждое изменение сохраняется в `actionHistory` для возможности отмены
- Обновляется `match.updatedAt` для триггера синхронизации

### Компонент `ScoreButtons`

**Файл:** `src/renderer/components/ScoreButtons.jsx`

**Функциональность:**
- Отображает кнопки `+1` и `-1` для каждой команды
- Вызывает `onScoreChange(team, delta)` при клике
- Блокируется, если `disabled === true`

**Использование в `MatchControlPage`:**
```javascript
<ScoreButtons
  teamAName={match.teamA.name}
  teamBName={match.teamB.name}
  onScoreChange={changeScore}
  disabled={currentSetStatus !== SET_STATUS.IN_PROGRESS}
/>
```

**Логика блокировки:**
- Кнопки активны только когда `currentSetStatus === IN_PROGRESS`
- При `PENDING` или `COMPLETED` кнопки заблокированы

---

## Логика смены состояний партий

### 1. Начало партии: `startSet()`

**Файл:** `src/renderer/hooks/useMatch.js` (строки 153-231)

**Условия выполнения:**
- Партия еще не начата: `currentSet.status !== IN_PROGRESS`
- Если партия уже начата, функция возвращает `prevMatch` без изменений

**Логика определения номера партии:**

```javascript
let nextSetNumber;
if (prevMatch.sets.length > 0) {
  // Есть завершенные партии - берем максимальный номер + 1
  const maxSetNumberInSets = Math.max(...prevMatch.sets.map(s => s.setNumber));
  nextSetNumber = maxSetNumberInSets + 1;
} else {
  // Нет завершенных партий
  if (prevMatch.currentSet.setNumber && prevMatch.currentSet.status === SET_STATUS.PENDING) {
    // Используем номер текущей партии (для начала матча)
    nextSetNumber = prevMatch.currentSet.setNumber;
  } else {
    // Начинаем с партии 1
    nextSetNumber = 1;
  }
}
```

**Действия при начале партии:**

1. Обновление `currentSet`:
   ```javascript
   currentSet: {
     ...currentSet,
     setNumber: nextSetNumber,
     status: SET_STATUS.IN_PROGRESS,
     startTime: Date.now(),
     scoreA: 0,
     scoreB: 0,
   }
   ```

2. Обновление `updatedAt`:
   ```javascript
   updatedAt: new Date().toISOString()
   ```

3. Сохранение в историю:
   ```javascript
   addToHistory({
     type: 'set_start',
     previousState,
   });
   ```

**Критически важно:**
- Счет обнуляется при начале партии
- Номер партии может измениться (если были завершенные партии)
- Время начала фиксируется автоматически

### 2. Завершение партии: `finishSet()`

**Файл:** `src/renderer/hooks/useMatch.js` (строки 236-310)

**Условия выполнения:**
- Партия должна быть в статусе `IN_PROGRESS`
- Счет должен соответствовать правилам завершения (`canFinishSet()`)

**Валидация завершения:**

```javascript
if (!canFinishSet(scoreA, scoreB, setNumber)) {
  const threshold = setNumber === 5 ? 15 : 25;
  alert(`Партия не может быть завершена. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`);
  return prevMatch;
}
```

**Правила завершения (`canFinishSet()` из `volleyballRules.js`):**
- Обычные партии (1-4): минимум 25 очков с разницей 2
- 5-я партия: минимум 15 очков с разницей 2
- При счете 24:24 (или 14:14) игра продолжается до разницы в 2 очка

**Действия при завершении партии:**

1. Создание завершенной партии:
   ```javascript
   const completedSet = {
     setNumber: currentSet.setNumber,
     scoreA: currentSet.scoreA,
     scoreB: currentSet.scoreB,
     completed: true,
     status: SET_STATUS.COMPLETED,
     startTime: currentSet.startTime || undefined,
     endTime: Date.now(),
     duration: calculateDuration(startTime, endTime),
   };
   ```

2. Добавление в массив `sets`:
   ```javascript
   newMatch.sets = [...prevMatch.sets, completedSet];
   ```

3. Сброс `currentSet` для следующей партии:
   ```javascript
   const winner = getSetWinner(scoreA, scoreB);
   newMatch.currentSet = {
     ...newMatch.currentSet,
     servingTeam: winner,  // Победитель получает подачу в следующей партии
     status: SET_STATUS.PENDING,
     scoreA: 0,           // Обнуляем счет
     scoreB: 0,           // Обнуляем счет
     startTime: null,     // Сбрасываем время начала
     endTime: null,       // Сбрасываем время завершения
   };
   ```

**Критически важно:**
- Завершенная партия перемещается из `currentSet` в `sets[]`
- `currentSet` сбрасывается для следующей партии
- Победитель получает подачу в следующей партии
- Номер следующей партии определяется при `startSet()`

### 3. Обновление партии: `updateSet(setNumber, updates)`

**Файл:** `src/renderer/hooks/useMatch.js` (строки 332-686)

**Параметры:**
- `setNumber: number` - номер партии для обновления
- `updates: Object` - объект с изменениями:
  ```javascript
  {
    scoreA?: number,
    scoreB?: number,
    status?: SetStatus,
    startTime?: number | null,
    endTime?: number | null,
  }
  ```

**Критически важная проверка:**

```javascript
// Определяем, обновляем ли мы текущую партию или завершенную
const isCurrentSet = setNumber === prevMatch.currentSet.setNumber && 
                     prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS;
```

**Почему это важно:**
- Если `currentSet.setNumber === setNumber`, но `status === PENDING`, это следующая партия
- Мы обновляем завершенную партию, а не текущую
- Без проверки статуса может произойти неправильное обновление

#### 3.1. Обновление текущей партии (`isCurrentSet === true`)

**Логика:**

1. Валидация изменений:
   ```javascript
   const validation = validateSetUpdate(set, updates, setNumber, prevMatch);
   if (!validation.valid) {
     alert(validation.errors.join('\n'));
     return prevMatch;
   }
   ```

2. Применение обновлений:
   ```javascript
   const updatedSet = {
     ...prevMatch.currentSet,
     ...updates,
   };
   ```

3. Обработка изменения статуса:
   ```javascript
   if (updates.status === SET_STATUS.PENDING) {
     // Удаляем время начала и завершения
     updatedSet.startTime = null;
     updatedSet.endTime = null;
     updatedSet.duration = undefined;
   } else if (updates.status === SET_STATUS.IN_PROGRESS) {
     // Удаляем время завершения
     updatedSet.endTime = null;
     updatedSet.duration = undefined;
   }
   ```

4. Пересчет продолжительности:
   ```javascript
   if (updates.startTime !== undefined || updates.endTime !== undefined) {
     const startTime = updatedSet.startTime;
     const endTime = updatedSet.endTime;
     if (startTime && endTime) {
       updatedSet.duration = calculateDuration(startTime, endTime);
     } else {
       updatedSet.duration = undefined;
     }
   }
   ```

5. Обновление `currentSet`:
   ```javascript
   newMatch.currentSet = updatedSet;
   ```

#### 3.2. Обновление завершенной партии (`isCurrentSet === false`)

**Специальный случай: Возврат завершенной партии в игру**

Если `updates.status === IN_PROGRESS` и `set.status === COMPLETED`:

1. Проверка, не началась ли следующая партия:
   ```javascript
   const nextSetNumber = setNumber + 1;
   const nextSetStarted = prevMatch.sets.some(s => 
     s.setNumber === nextSetNumber && s.status === SET_STATUS.IN_PROGRESS
   ) || (
     prevMatch.currentSet.setNumber === nextSetNumber && 
     prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS
   );
   
   if (nextSetStarted) {
     alert(`Нельзя вернуть партию ${setNumber} в статус "В игре", так как партия ${nextSetNumber} уже началась.`);
     return prevMatch;
   }
   ```

2. Если следующая партия не началась:
   - Партия удаляется из `sets[]`
   - Партия становится `currentSet`
   - Удаляется время завершения
   - Статус меняется на `IN_PROGRESS`

**Обычное обновление завершенной партии:**

1. Применение обновлений:
   ```javascript
   const updatedSet = {
     ...set,
     scoreA: updates.scoreA !== undefined ? 
       (typeof updates.scoreA === 'string' ? parseInt(updates.scoreA, 10) : updates.scoreA) : 
       set.scoreA,
     scoreB: updates.scoreB !== undefined ? 
       (typeof updates.scoreB === 'string' ? parseInt(updates.scoreB, 10) : updates.scoreB) : 
       set.scoreB,
     status: updates.status !== undefined ? updates.status : set.status,
     startTime: updates.startTime !== undefined ? updates.startTime : set.startTime,
     endTime: updates.endTime !== undefined ? updates.endTime : set.endTime,
   };
   ```

2. Обработка изменения статуса:
   ```javascript
   if (updates.status === SET_STATUS.PENDING) {
     updatedSet.startTime = null;
     updatedSet.endTime = null;
     updatedSet.duration = undefined;
     updatedSet.completed = false;
   } else if (updates.status === SET_STATUS.IN_PROGRESS) {
     updatedSet.endTime = null;
     updatedSet.duration = undefined;
     updatedSet.completed = false;
   } else if (updates.status === SET_STATUS.COMPLETED) {
     updatedSet.completed = true;
   }
   ```

3. Обновление массива `sets`:
   ```javascript
   const newSets = [...prevMatch.sets];
   newSets[setIndex] = updatedSet;
   newMatch.sets = newSets;
   ```

4. **КРИТИЧЕСКИ ВАЖНО: Защита `currentSet`**

   ```javascript
   const isActuallyCurrentSet = prevMatch.currentSet.setNumber === setNumber && 
                                prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS;
   
   if (!isActuallyCurrentSet) {
     // Это не текущая партия - currentSet не должен изменяться
     
     if (prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS) {
       // Следующая партия уже идет - не трогаем её
       newMatch.currentSet = { ...prevMatch.currentSet };
     } else if (prevMatch.currentSet.status !== SET_STATUS.PENDING) {
       // Исправляем статус на PENDING
       newMatch.currentSet = {
         ...prevMatch.currentSet,
         status: SET_STATUS.PENDING,
         scoreA: prevMatch.currentSet.scoreA,
         scoreB: prevMatch.currentSet.scoreB,
       };
     } else {
       // currentSet в статусе PENDING - просто создаем новый объект
       newMatch.currentSet = { 
         ...prevMatch.currentSet,
         scoreA: prevMatch.currentSet.scoreA,
         scoreB: prevMatch.currentSet.scoreB,
       };
     }
   }
   ```

**Почему это критично:**
- При редактировании завершенной партии `currentSet` не должен наследовать изменения
- Если следующая партия уже идет (`IN_PROGRESS`), её нельзя трогать
- Счет `currentSet` не должен изменяться при редактировании завершенной партии

---

## Логика кнопок управления партией

### Кнопка "Начать партию" / "Завершить партию"

**Компонент:** `MatchControlPage.jsx` (строки 478-500)

**Логика отображения:**

```javascript
<button
  onClick={toggleSetStatus}
  disabled={currentSetStatus === SET_STATUS.IN_PROGRESS && !canFinish}
>
  {currentSetStatus === SET_STATUS.PENDING 
    ? "Начать партию" 
    : "Завершить партию"}
</button>
```

**Условия блокировки:**
- Кнопка заблокирована, если `currentSetStatus === IN_PROGRESS && !canFinish`
- `canFinish` вычисляется через `canFinishSet()` из `volleyballRules.js`

**Функция `toggleSetStatus()`:**

**Файл:** `src/renderer/hooks/useMatch.js` (строки 315-325)

```javascript
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

**Логика работы:**
- Если `PENDING` → вызывает `startSet()`
- Если `IN_PROGRESS` → вызывает `finishSet()`
- `COMPLETED` не может быть в `currentSet`, поэтому не обрабатывается

**Визуальное состояние кнопки:**

```javascript
backgroundColor: currentSetStatus === SET_STATUS.PENDING 
  ? "#3498db"  // Синий - "Начать партию"
  : (canFinish ? "#27ae60" : "#95a5a6"),  // Зеленый или серый
opacity: (currentSetStatus === SET_STATUS.IN_PROGRESS && !canFinish) ? 0.6 : 1,
```

### Кнопка "Отменить последнее действие"

**Компонент:** `MatchControlPage.jsx` (строки 501-515)

**Логика отображения:**

```javascript
<button
  onClick={undoLastAction}
  disabled={!hasHistory || currentSetStatus !== SET_STATUS.IN_PROGRESS}
>
  Отменить последнее действие
</button>
```

**Условия блокировки:**
- `!hasHistory` - нет действий для отмены
- `currentSetStatus !== IN_PROGRESS` - можно отменять только во время игры

**Функция `undoLastAction()`:**

**Файл:** `src/renderer/hooks/useMatch.js` (строки 44-53)

```javascript
const undoLastAction = useCallback(() => {
  if (actionHistory.length === 0) {
    return false;
  }

  const lastAction = actionHistory[actionHistory.length - 1];
  setMatch(lastAction.previousState);  // Восстанавливаем предыдущее состояние
  setActionHistory(prev => prev.slice(0, -1));  // Удаляем последнее действие
  return true;
}, [actionHistory]);
```

**Типы действий в истории:**
- `score_change` - изменение счета
- `serve_change` - изменение подачи
- `set_start` - начало партии
- `set_finish` - завершение партии
- `set_update` - обновление партии
- `set_resume` - возврат завершенной партии в игру

**Важно:**
- Отмена восстанавливает полное состояние `match` из `previousState`
- История хранится в массиве `actionHistory` в хуке `useMatch`
- Каждое действие сохраняет полную копию `match` до изменения

---

## Управление текущим счетом

### Отображение текущего счета

**Компонент:** `ScoreDisplay` (используется в `MatchControlPage.jsx`)

**Данные:**
```javascript
<ScoreDisplay
  teamA={match.teamA.name}
  teamB={match.teamB.name}
  scoreA={match.currentSet.scoreA}  // Из currentSet
  scoreB={match.currentSet.scoreB}  // Из currentSet
  servingTeam={match.currentSet.servingTeam}
  isSetball={isSetballNow}
  setballTeam={setballTeam}
  isMatchball={isMatchballNow}
  matchballTeam={matchballTeam}
/>
```

### Вычисляемые значения

**Файл:** `src/renderer/hooks/useMatch.js` (строки 746-763)

```javascript
// Сетбол (только для партии в игре)
const setballInfo = match?.currentSet && match.currentSet.status === SET_STATUS.IN_PROGRESS
  ? isSetball(match.currentSet.scoreA, match.currentSet.scoreB, match.currentSet.setNumber)
  : { isSetball: false, team: null };

// Матчбол (только для партии в игре)
const matchballInfo = match?.currentSet && match?.sets && match.currentSet.status === SET_STATUS.IN_PROGRESS
  ? isMatchball(
      match.sets,
      match.currentSet.setNumber,
      match.currentSet.scoreA,
      match.currentSet.scoreB
    )
  : { isMatchball: false, team: null };

// Можно ли завершить партию
const canFinish = match?.currentSet
  ? canFinishSet(match.currentSet.scoreA, match.currentSet.scoreB, match.currentSet.setNumber)
  : false;
```

**Важно:**
- Сетбол и матчбол вычисляются только для партии в статусе `IN_PROGRESS`
- `canFinish` проверяет правила завершения партии

### Управление подачей

**Функция `changeServingTeam(team)`:**

**Файл:** `src/renderer/hooks/useMatch.js` (строки 114-148)

**Логика:**
1. Проверка корректности команды
2. Если подача уже у этой команды, ничего не делаем
3. Обновление `currentSet.servingTeam`
4. Сохранение в историю

**Компонент `ServeControl`:**

**Файл:** `src/renderer/components/ServeControl.jsx`

- Отображает текущую команду с подачей
- Кнопки для переключения подачи между командами
- Кнопка текущей команды неактивна

---

## Отмена последнего действия

### История действий (`actionHistory`)

**Хранение:**
- Массив в состоянии хука `useMatch`
- Каждое действие сохраняет полную копию `match` до изменения

**Структура действия:**
```javascript
{
  type: 'score_change' | 'serve_change' | 'set_start' | 'set_finish' | 'set_update' | 'set_resume',
  previousState: Match,  // Полная копия match до изменения
  // Дополнительные поля в зависимости от типа:
  team?: 'A' | 'B',
  delta?: number,
  setNumber?: number,
  updates?: Object,
}
```

### Добавление в историю

**Функция `addToHistory(action)`:**
```javascript
const addToHistory = useCallback((action) => {
  setActionHistory(prev => [...prev, action]);
}, []);
```

**Вызывается в:**
- `changeScore()` - при изменении счета
- `changeServingTeam()` - при изменении подачи
- `startSet()` - при начале партии
- `finishSet()` - при завершении партии
- `updateSet()` - при обновлении партии

### Отмена действия

**Функция `undoLastAction()`:**
```javascript
const undoLastAction = useCallback(() => {
  if (actionHistory.length === 0) {
    return false;
  }

  const lastAction = actionHistory[actionHistory.length - 1];
  setMatch(lastAction.previousState);  // Восстанавливаем состояние
  setActionHistory(prev => prev.slice(0, -1));  // Удаляем из истории
  return true;
}, [actionHistory]);
```

**Ограничения:**
- Можно отменять только во время игры (`currentSetStatus === IN_PROGRESS`)
- Отменяется только последнее действие
- Нет возможности отменить несколько действий подряд

---

## Состояние модальных окон

### Модальное окно редактирования партии

**Состояние в `MatchControlPage.jsx`:**

```javascript
const [editingSetNumber, setEditingSetNumber] = useState(null);
```

**Логика открытия:**
- При клике на партию в `SetsDisplay` вызывается `onSetClick(setNumber)`
- Устанавливается `editingSetNumber = setNumber`
- Модальное окно открывается, если `editingSetNumber !== null`

**Вычисление данных для модального окна:**

```javascript
const modalData = useMemo(() => {
  if (!editingSetNumber || !match) return null;
  
  // Сначала ищем завершенную партию в sets
  const completedSet = match.sets.find(s => s.setNumber === editingSetNumber);
  // Если не нашли в sets, проверяем currentSet
  const setToEdit = completedSet || 
    (editingSetNumber === match.currentSet.setNumber ? match.currentSet : null);
  // Определяем, является ли это текущей партией
  const isCurrentSet = !completedSet && editingSetNumber === match.currentSet.setNumber;
  
  if (!setToEdit) {
    return null;
  }
  
  return { setToEdit, isCurrentSet };
}, [editingSetNumber, match?.currentSet?.setNumber, match?.sets]);
```

**Важно:**
- `useMemo` предотвращает бесконечные ре-рендеры
- Приоритет: завершенная партия в `sets` над `currentSet`
- `isCurrentSet` определяется только если партия не завершена

**Callback для сохранения:**

```javascript
const handleSetSave = useCallback((updates) => {
  if (!editingSetNumber || !match) return false;
  
  const wasCompletedSet = match.sets.find(s => s.setNumber === editingSetNumber);
  const success = updateSet(editingSetNumber, updates);
  if (success) {
    setEditingSetNumber(null);  // Закрываем модальное окно
    if (updates.status === SET_STATUS.IN_PROGRESS && wasCompletedSet) {
      // Партия возвращена в игру - ожидаем автоматического обновления vMix
    }
  }
  return success;
}, [editingSetNumber, match, updateSet]);
```

**Рендеринг модального окна:**

```javascript
{modalData && (
  <SetEditModal
    key={editingSetNumber}  // key для предотвращения проблем с ре-рендерами
    isOpen={true}
    onClose={() => setEditingSetNumber(null)}
    set={modalData.setToEdit}
    isCurrentSet={modalData.isCurrentSet}
    timezone={match.timezone}
    match={match}
    onSave={handleSetSave}
  />
)}
```

---

## Редактирование партий

### Компонент `SetEditModal`

**Файл:** `src/renderer/components/SetEditModal.jsx`

**Параметры:**
- `isOpen: boolean` - открыто ли модальное окно
- `onClose: () => void` - функция закрытия
- `set: Set | CurrentSet` - партия для редактирования
- `isCurrentSet: boolean` - является ли это текущей партией
- `timezone: string` - часовой пояс матча
- `match: Match` - полный объект матча
- `onSave: (updates) => boolean` - функция сохранения

### Состояние формы

```javascript
const [formData, setFormData] = useState({
  scoreA: 0,
  scoreB: 0,
  status: SET_STATUS.PENDING,
  startTime: null,
  endTime: null,
});
const [errors, setErrors] = useState([]);
```

### Инициализация формы

**useEffect при открытии:**

```javascript
useEffect(() => {
  if (!isOpen || !set) return;
  
  // Определяем статус партии
  let status = determineSetStatus(set);
  
  // Дополнительная проверка завершенности
  const isActuallyCompleted = set.completed === true || 
                               set.status === SET_STATUS.COMPLETED || 
                               (set.startTime && set.endTime);
  
  if (isActuallyCompleted) {
    status = SET_STATUS.COMPLETED;
  }
  
  setFormData({
    scoreA: set.scoreA || 0,
    scoreB: set.scoreB || 0,
    status: status,
    startTime: set.startTime || null,
    endTime: set.endTime || null,
  });
  setErrors([]);
}, [isOpen, set?.setNumber]);
```

**Функция `determineSetStatus(set)`:**
- Приоритет 1: `completed === true` → `COMPLETED`
- Приоритет 2: явный `status` → используется как есть
- Приоритет 3: наличие обоих времен → `COMPLETED`
- Приоритет 4: наличие `startTime` → `IN_PROGRESS`
- Иначе: `PENDING`

### Определение доступных опций статуса

**Функция `getStatusOptions()`:**

**Логика:**

1. **Текущая партия в игре:**
   ```javascript
   if (isCurrentSet && formData.status === SET_STATUS.IN_PROGRESS) {
     return [
       { value: SET_STATUS.IN_PROGRESS, label: 'В игре' },
       { value: SET_STATUS.PENDING, label: 'Не начата' },
     ];
   }
   ```

2. **Завершенная партия:**
   ```javascript
   const isCompletedSet = getIsCompletedSet();
   const subsequentSetStarted = isAnySubsequentSetStarted();
   
   if (isCompletedSet) {
     if (!subsequentSetStarted) {
       // Последующая партия не началась - можно вернуть в игру
       return [
         { value: SET_STATUS.COMPLETED, label: 'Завершена' },
         { value: SET_STATUS.IN_PROGRESS, label: 'В игре' },
       ];
     } else {
       // Последующая партия началась - только "Завершена"
       return [
         { value: SET_STATUS.COMPLETED, label: 'Завершена' },
       ];
     }
   }
   ```

3. **Другие случаи:**
   ```javascript
   return [
     { value: SET_STATUS.PENDING, label: 'Не начата' },
     { value: SET_STATUS.IN_PROGRESS, label: 'В игре' },
     { value: SET_STATUS.COMPLETED, label: 'Завершена' },
   ];
   ```

**Функция `isAnySubsequentSetStarted()`:**
- Проверяет, есть ли завершенные партии с номером больше текущей
- Проверяет, началась ли текущая партия с номером больше редактируемой

**Функция `getIsCompletedSet()`:**
- Проверяет `isCurrentSet` (текущая партия не может быть завершенной)
- Проверяет `set.status === COMPLETED`
- Проверяет `set.completed === true`
- Проверяет наличие обоих времен

### Обработка изменений формы

**Функция `handleChange(field, value)`:**
```javascript
const handleChange = (field, value) => {
  setFormData(prev => {
    const newFormData = { ...prev, [field]: value };
    
    // При изменении статуса автоматически очищаем время
    if (field === 'status') {
      if (value === SET_STATUS.PENDING) {
        newFormData.startTime = null;
        newFormData.endTime = null;
      } else if (value === SET_STATUS.IN_PROGRESS) {
        newFormData.endTime = null;
      }
    }
    
    return newFormData;
  });
  setErrors([]);
};
```

**Функция `handleDateTimeChange(field, value)`:**
- Конвертирует `datetime-local` в timestamp с учетом часового пояса
- Сложная логика конвертации для правильной работы с часовыми поясами

### Валидация времени

**Функция `validateTimeOverlap(startTime, endTime)`:**
- Проверяет пересечение времени с предыдущей партией
- Проверяет пересечение времени со следующей партией
- Проверяет пересечение с текущей партией (если она не редактируемая)

### Сохранение изменений

**Функция `handleSave()`:**

1. Проверка блокировки изменения статуса:
   ```javascript
   if (isStatusChangeBlocked && formData.status !== SET_STATUS.COMPLETED) {
     setErrors(['Нельзя изменить статус: следующая партия уже началась']);
     return;
   }
   ```

2. Формирование объекта `updates`:
   ```javascript
   const updates = {
     scoreA: parseInt(formData.scoreA, 10),
     scoreB: parseInt(formData.scoreB, 10),
     status: formData.status,
   };
   ```

3. Обработка времени в зависимости от статуса:
   ```javascript
   if (formData.status === SET_STATUS.PENDING) {
     updates.startTime = null;
     updates.endTime = null;
   } else if (formData.status === SET_STATUS.IN_PROGRESS) {
     if (formData.startTime) {
       updates.startTime = formData.startTime;
     }
     updates.endTime = null;
   } else if (formData.status === SET_STATUS.COMPLETED) {
     if (formData.startTime) {
       updates.startTime = formData.startTime;
     }
     if (formData.endTime) {
       updates.endTime = formData.endTime;
     }
     
     // Валидация пересечения времени
     if (formData.startTime && formData.endTime) {
       const timeErrors = validateTimeOverlap(formData.startTime, formData.endTime);
       if (timeErrors) {
         setErrors(timeErrors);
         return;
       }
     }
   }
   ```

4. Вызов `onSave(updates)`:
   ```javascript
   if (onSave) {
     const result = onSave(updates);
     if (result) {
       onClose();  // Закрываем модальное окно
     }
   }
   ```

---

## Связанные функции и методы

### Правила волейбола (`volleyballRules.js`)

**Файлы:** `src/shared/volleyballRules.js`, `src/shared/volleyballRulesConfig.js`

#### Фабрика правил и getRules(match)
- **`createRules(config)`** — создает объект правил на основе конфигурации.
- **`getRules(match)`** — возвращает правила для матча по полю `match.variant` (`'indoor' | 'beach' | 'snow'`). По умолчанию — правила зала.
- **`getSetNumbers(match)`** — возвращает массив номеров партий (5 для зала, 3 для пляжа/снега).
- **`isDecidingSet(setNumber, match)`** — проверяет, является ли партия решающей (5-я для зала, 3-я для пляжа/снега).

#### Методы объекта правил (получаемого через `getRules(match)` или `createRules(config)`)

**`rules.isSetball(scoreA, scoreB, setNumber)`**
- Определяет, является ли ситуация сетболом
- Порог зависит от варианта: из `config.setballThresholdRegular` / `config.setballThresholdDeciding`
- Сетбол: команда набрала порог и ведет минимум на 1 очко
- Нет сетбола при равном счете

**`rules.isMatchball(sets, currentSetNumber, scoreA, scoreB)`**
- Определяет, является ли ситуация матчболом
- Матчбол: команда в одном очке от победы и на сетболе
- Учитывает только завершенные партии (`completed === true` или `status === 'completed'`)

**`rules.canFinishSet(scoreA, scoreB, setNumber)`**
- Проверяет, можно ли завершить партию
- Пороги зависят от варианта (например: зал 25/15, пляж 21/15, снег 15/15)
- Игра до разницы в 2 очка

**`rules.getSetWinner(scoreA, scoreB)`**
- Определяет победителя партии
- Возвращает `'A'`, `'B'` или `null`

**`rules.getConfig()`**
- Возвращает конфигурацию (maxSets, decidingSetNumber, pointsToWinRegularSet и т.д.)

#### Варианты (indoor, beach, snow)
- Поддержка **зального** (indoor), **пляжного** (beach) и **снежного** (snow) волейбола.
- См. [Варианты волейбола: зал, пляж, снежный](./volleyball-variants.md).

### Валидация изменений (`setValidation.js`)

**Файл:** `src/shared/setValidation.js`

**Функция `validateSetUpdate(set, updates, currentSetNumber, match)`:**
- Проверяет корректность изменений партии
- Проверки:
  1. Время завершения не раньше времени начала
  2. Счет для завершенных партий соответствует правилам
  3. Завершенная партия должна иметь оба времени
  4. Нельзя перейти из `completed` в `in_progress` без удаления `endTime`
  5. Счет не может быть отрицательным
  6. Пересечение времени с другими партиями

### Миграция старых матчей (`matchMigration.js`)

**Файл:** `src/shared/matchMigration.js`

**Функция `migrateMatchToSetStatus(match)`:**
- Мигрирует старые матчи без поля `status`
- Определяет статус на основе `completed` и наличия времени
- Вычисляет `duration` для завершенных партий

### Утилиты времени (`timeUtils.js`)

**Файл:** `src/shared/timeUtils.js`

**Функции:**
- `calculateDuration(startTime, endTime)` - вычисление продолжительности в минутах
- `formatDuration(minutes)` - форматирование для отображения
- `toTimestamp(date)` - конвертация в timestamp
- `formatTimestamp(timestamp, timezone)` - форматирование с учетом часового пояса
- `timestampToDateTimeLocal(timestamp, timezone)` - конвертация для input элементов

### Отображение партий (`SetsDisplay.jsx`)

**Файл:** `src/renderer/components/SetsDisplay.jsx`

**Логика отображения:**

1. **Определение статуса партии:**
   ```javascript
   const set = sets.find(s => s.setNumber === setNum);
   const isCurrent = setNum === currentSet.setNumber;
   const isCompleted = set && set.status === SET_STATUS.COMPLETED;
   const isInProgress = isCurrent && currentSet.status === SET_STATUS.IN_PROGRESS && !isCompleted;
   ```

2. **Приоритет отображения:**
   - Завершенная партия (в `sets`) имеет приоритет над `currentSet`
   - Если партия завершена, показывается как завершенная, даже если `currentSet` имеет тот же номер

3. **Определение возможности редактирования:**
   ```javascript
   const canEdit = isCompleted || isInProgress;
   ```

4. **Мемоизация для оптимизации:**
   - Используется `memo` с кастомной функцией сравнения `areEqual`
   - Сравниваются все важные поля партий и `currentSet`

### Синхронизация с vMix

**Файл:** `src/renderer/hooks/useVMix.js`

**Функция `calculateSetsScore(match, team)`:**
```javascript
const calculateSetsScore = useCallback((match, team) => {
  if (!match?.sets) {
    return 0;
  }

  const score = match.sets.filter((set) => {
    const isCompleted = set.completed === true || set.status === 'completed';
    if (team === 'A') {
      return isCompleted && set.scoreA > set.scoreB;
    } else {
      return isCompleted && set.scoreB > set.scoreA;
    }
  }).length;

  return score;
}, []);
```

**Важно:**
- Учитываются только завершенные партии
- Проверяется и `completed`, и `status` для обратной совместимости

---

## Потоки данных

### Поток начисления счета

```
Пользователь кликает кнопку +1/-1
  ↓
ScoreButtons.onClick()
  ↓
MatchControlPage.changeScore(team, delta)
  ↓
useMatch.changeScore(team, delta)
  ↓
Проверка: currentSet.status === IN_PROGRESS?
  ↓ (да)
Обновление currentSet.scoreA/B
  ↓
Автоматический переход подачи (если delta > 0)
  ↓
addToHistory({ type: 'score_change', ... })
  ↓
Обновление match.updatedAt
  ↓
setMatch(newMatch)
  ↓
Триггер useEffect в MatchControlPage
  ↓
updateMatchData(match) → синхронизация с vMix
```

### Поток начала партии

```
Пользователь кликает "Начать партию"
  ↓
MatchControlPage.toggleSetStatus()
  ↓
useMatch.toggleSetStatus()
  ↓
useMatch.startSet()
  ↓
Определение номера следующей партии
  ↓
Обновление currentSet:
  - setNumber = nextSetNumber
  - status = IN_PROGRESS
  - startTime = Date.now()
  - scoreA = 0
  - scoreB = 0
  ↓
addToHistory({ type: 'set_start', ... })
  ↓
Обновление match.updatedAt
  ↓
setMatch(newMatch)
  ↓
Триггер useEffect → синхронизация с vMix
```

### Поток завершения партии

```
Пользователь кликает "Завершить партию"
  ↓
MatchControlPage.toggleSetStatus()
  ↓
useMatch.toggleSetStatus()
  ↓
useMatch.finishSet()
  ↓
Валидация: canFinishSet()?
  ↓ (да)
Создание completedSet
  ↓
Добавление в match.sets[]
  ↓
Сброс currentSet:
  - status = PENDING
  - scoreA = 0
  - scoreB = 0
  - startTime = null
  - servingTeam = winner
  ↓
addToHistory({ type: 'set_finish', ... })
  ↓
Обновление match.updatedAt
  ↓
setMatch(newMatch)
  ↓
Триггер useEffect → синхронизация с vMix
```

### Поток редактирования партии

```
Пользователь кликает на партию в SetsDisplay
  ↓
SetsDisplay.onSetClick(setNumber)
  ↓
MatchControlPage.setEditingSetNumber(setNumber)
  ↓
useMemo вычисляет modalData
  ↓
Рендеринг SetEditModal
  ↓
Пользователь изменяет данные в форме
  ↓
SetEditModal.handleSave()
  ↓
Валидация изменений
  ↓
Формирование объекта updates
  ↓
MatchControlPage.handleSetSave(updates)
  ↓
useMatch.updateSet(setNumber, updates)
  ↓
Определение: isCurrentSet?
  ↓
Обновление currentSet или sets[]
  ↓
Защита currentSet (если редактируется завершенная партия)
  ↓
addToHistory({ type: 'set_update', ... })
  ↓
Обновление match.updatedAt
  ↓
setMatch(newMatch)
  ↓
Закрытие модального окна (setEditingSetNumber(null))
  ↓
Триггер useEffect → синхронизация с vMix
```

### Поток отмены действия

```
Пользователь кликает "Отменить последнее действие"
  ↓
MatchControlPage.undoLastAction()
  ↓
useMatch.undoLastAction()
  ↓
Проверка: actionHistory.length > 0?
  ↓ (да)
Получение lastAction.previousState
  ↓
setMatch(lastAction.previousState)
  ↓
setActionHistory(prev => prev.slice(0, -1))
  ↓
Триггер useEffect → синхронизация с vMix
```

---

## Проблемные места и рекомендации

### Выявленные проблемы

1. **Сложная логика определения текущей партии в `updateSet()`**
   - Проверка `isCurrentSet` требует проверки и `setNumber`, и `status`
   - Легко ошибиться и неправильно определить, какая партия редактируется
   - **Рекомендация:** Вынести в отдельную функцию `isCurrentSet(setNumber, match)`

2. **Дублирование логики обработки времени**
   - Логика удаления времени при изменении статуса дублируется в `updateSet()` и `SetEditModal`
   - **Рекомендация:** Вынести в отдельную функцию `processTimeForStatus(status, updates)`

3. **Сложная логика определения номера следующей партии в `startSet()`**
   - Множественные условия для определения номера
   - **Рекомендация:** Вынести в отдельную функцию `calculateNextSetNumber(match)`

4. **Защита `currentSet` при редактировании завершенной партии**
   - Сложная логика с множественными проверками
   - **Рекомендация:** Вынести в отдельную функцию `protectCurrentSet(match, setNumber)`

5. **Множественные проверки завершенности партии**
   - Проверки `completed`, `status`, наличия времени дублируются в разных местах
   - **Рекомендация:** Создать единую функцию `isSetCompleted(set)`

6. **Логика определения доступных опций статуса**
   - Сложная логика в `SetEditModal.getStatusOptions()`
   - **Рекомендация:** Вынести в отдельный модуль или хук

7. **История действий хранит полные копии `match`**
   - Может занимать много памяти при длительных матчах
   - **Рекомендация:** Рассмотреть хранение только изменений (diff)

8. **Отмена действия работает только для последнего действия**
   - Нет возможности отменить несколько действий
   - **Рекомендация:** Рассмотреть реализацию стека отмены/повтора

### Рекомендации по рефакторингу

1. **Разделение ответственности:**
   - Вынести логику определения состояний в отдельные функции
   - Создать модуль для работы с партиями (`setUtils.js`)
   - Создать модуль для работы с историей (`historyUtils.js`)

2. **Упрощение условий:**
   - Использовать ранние возвраты для упрощения вложенных условий
   - Создать константы для часто используемых проверок

3. **Улучшение типизации:**
   - Добавить JSDoc комментарии для всех функций
   - Использовать TypeScript для строгой типизации

4. **Тестирование:**
   - Добавить unit-тесты для всех функций логики
   - Добавить интеграционные тесты для потоков данных

5. **Документирование:**
   - Добавить диаграммы состояний партий
   - Добавить диаграммы потоков данных

---

## Заключение

Данная документация описывает всю логику управления счетом и состояниями партий в текущей реализации. Все функции и методы задокументированы с указанием файлов, строк кода и логики работы.

**Следующие шаги:**
1. Анализ выявленных проблемных мест
2. Разработка плана рефакторинга
3. Постепенная реализация улучшений с сохранением функциональности
4. Добавление тестов для проверки корректности работы

---

**Дата последнего обновления:** 2025-01-XX  
**Версия документации:** 1.0
