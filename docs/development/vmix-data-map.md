# Карта данных приложения для vMix

*Последнее обновление: 2026-02-06*

## Описание

Этот документ содержит полную карту всех данных, которые можно извлечь из приложения VolleyScore Master для отправки в vMix. Документ предназначен для использования при рефакторинге системы работы с инпутами vMix.

## Структура документа

Данные организованы по категориям:
1. **Общая информация о матче** - турнир, место, дата, время
2. **Информация о командах** - названия, города, логотипы, цвета
3. **Составы команд** - игроки, номера, имена, позиции
4. **Стартовые составы** - стартовые игроки, либеро
5. **Тренеры** - имена тренеров команд
6. **Судьи** - имена судей и других официальных лиц
7. **Счет** - текущий счет, счет по партиям
8. **Партии** - информация о каждой партии
9. **Статистика** - статистика матча (если включена)
10. **Вычисляемые данные** - данные, которые вычисляются на основе других данных

---

## 1. Общая информация о матче

### 1.1. Турнир

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `tournament` | string | Название турнира (заголовок) | `match.tournament` | "Чемпионат России" |
| `tournamentSubtitle` | string | Подзаголовок турнира | `match.tournamentSubtitle` | "Суперлига" |

**Использование:**
- Инпут `lineup` - поля `title`, `subtitle`
- Инпут `rosterTeamA` - поля `title`, `subtitle`
- Инпут `rosterTeamB` - поля `title`, `subtitle`
- Инпут `startingLineupTeamA` - поля `title`, `subtitle`
- Инпут `startingLineupTeamB` - поля `title`, `subtitle`

### 1.2. Место проведения

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `location` | string | Город, страна | `match.location` | "Москва, Россия" |
| `venue` | string | Место проведения (адрес) | `match.venue` | "Дворец спорта" |

**Использование:**
- Инпут `lineup` - поля `venueLine1` (venue), `venueLine2` (location)

### 1.3. Дата и время

| Поле | Тип | Описание | Источник | Формат в vMix |
|------|-----|----------|----------|----------------|
| `date` | string | Дата проведения | `match.date` (ISO YYYY-MM-DD) | ДД.ММ.ГГГГ (форматируется через `formatMatchDate`) |
| `time` | string | Время проведения | `match.time` | ISO time (HH:MM) |
| `timezone` | string | Часовой пояс | `match.timezone` | IANA timezone (например, "Europe/Moscow") |

**Вычисляемые поля:**
- `matchDate` — дата и время в формате «ДД.ММ.ГГГГ ЧЧ:ММ» (функция `formatMatchDate`, общая с UI и overlay)
  - Используется в инпуте `lineup` — поле `matchDate`

**Использование:**
- Инпут `lineup` — поле `matchDate` (комбинация date + time), поле даты — ключ `date` (отдаётся в формате ДД.ММ.ГГГГ)

---

## 2. Информация о командах

### 2.1. Команда A

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `teamA.name` | string | Название команды A | `match.teamA.name` | "Динамо Москва" |
| `teamA.city` | string | Город команды A | `match.teamA.city` | "Москва" |
| `teamA.color` | string | Цвет формы команды A | `match.teamA.color` | "#3498db" (HEX) |
| `teamA.liberoColor` | string | Цвет формы либеро команды A | `match.teamA.liberoColor` | "#e74c3c" (HEX, опционально) |
| `teamA.logo` | string | Логотип команды A (base64 или путь) | `match.teamA.logo` | base64 строка или путь |
| `teamA.logoPath` | string | Путь к файлу логотипа A | `match.teamA.logoPath` | "logos/logo_a_1234567890.png" |
| `teamA.coach` | string | Имя тренера команды A | `match.teamA.coach` | "Иванов И.И." |

**Использование:**
- Инпут `currentScore` - поля `teamA`, `colorA` (fill)
- Инпут `lineup` - поля `teamAName`, `teamACity`, `teamALogo` (image)
- Инпут `rosterTeamA` - поля `teamName`, `teamCity`, `teamLogo` (image)
- Инпут `startingLineupTeamA` - поля `teamName`, `teamCity`, `teamLogo` (image), `libero1Background`, `libero2Background` (fill)
- Инпут `referee1` - поле `name` (тренер команды A)
- Инпут `set1Score`, `set2Score`, ..., `set5Score` - поле `teamA`

### 2.2. Команда B

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `teamB.name` | string | Название команды B | `match.teamB.name` | "Зенит Казань" |
| `teamB.city` | string | Город команды B | `match.teamB.city` | "Казань" |
| `teamB.color` | string | Цвет формы команды B | `match.teamB.color` | "#e74c3c" (HEX) |
| `teamB.liberoColor` | string | Цвет формы либеро команды B | `match.teamB.liberoColor` | "#3498db" (HEX, опционально) |
| `teamB.logo` | string | Логотип команды B (base64 или путь) | `match.teamB.logo` | base64 строка или путь |
| `teamB.logoPath` | string | Путь к файлу логотипа B | `match.teamB.logoPath` | "logos/logo_b_1234567890.png" |
| `teamB.coach` | string | Имя тренера команды B | `match.teamB.coach` | "Петров П.П." |

**Использование:**
- Инпут `currentScore` - поля `teamB`, `colorB` (fill)
- Инпут `lineup` - поля `teamBName`, `teamBCity`, `teamBLogo` (image)
- Инпут `rosterTeamB` - поля `teamName`, `teamCity`, `teamLogo` (image)
- Инпут `startingLineupTeamB` - поля `teamName`, `teamCity`, `teamLogo` (image), `libero1Background`, `libero2Background` (fill)
- Инпут `referee1` - поле `name` (тренер команды B)
- Инпут `set1Score`, `set2Score`, ..., `set5Score` - поле `teamB`

---

## 3. Составы команд

### 3.1. Структура игрока

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `player.number` | number | Номер игрока | `match.teamA.roster[i].number` | 1 |
| `player.name` | string | Имя игрока | `match.teamA.roster[i].name` | "Иванов Иван" |
| `player.position` | string | Позиция игрока (полное название) | `match.teamA.roster[i].position` | "Доигровщик" |
| `player.isStarter` | boolean | Является ли игрок стартовым | `match.teamA.roster[i].isStarter` | true/false |
| `player.numberOnCard` | string | Номер игрока на карте | `match.teamA.roster[i].numberOnCard` | "1" (опционально) |

**Позиции игроков (международный стандарт):**

| Полное название | Сокращение (PositionShort) |
|-----------------|----------------------------|
| Доигровщик | OH |
| Центральный блокирующий | MB |
| Диагональный | OPP |
| Связующий | S |
| Либеро | L |

В настройках полей инпутов vMix доступны два варианта для позиции каждого игрока:
- **Position** — полное название (например, «Доигровщик»)
- **PositionShort** — сокращённое международное обозначение (OH, MB, OPP, S, L)

### 3.2. Полный состав команды A (rosterTeamA)

**Доступные поля:**
- `title` - название турнира
- `subtitle` - подзаголовок турнира
- `teamName` - название команды A
- `teamCity` - город команды A
- `teamLogo` - логотип команды A (image)
- `player1Number` до `player14Number` - номера игроков (1-14)
- `player1Name` до `player14Name` - имена игроков (1-14)
- `player1Position` до `player14Position` - позиции игроков (полное название): Доигровщик, Центральный блокирующий, Диагональный, Связующий, Либеро
- `player1PositionShort` до `player14PositionShort` - позиции игроков (сокращение): OH, MB, OPP, S, L

**Источник данных:**
- Игроки берутся из `match.teamA.roster[]` в порядке их появления в массиве
- Позиция — из `match.teamA.roster[i].position`
- Максимум 14 игроков

### 3.3. Полный состав команды B (rosterTeamB)

**Доступные поля:**
- `title` - название турнира
- `subtitle` - подзаголовок турнира
- `teamName` - название команды B
- `teamCity` - город команды B
- `teamLogo` - логотип команды B (image)
- `player1Number` до `player14Number` - номера игроков (1-14)
- `player1Name` до `player14Name` - имена игроков (1-14)
- `player1Position` до `player14Position` - позиции (полное название); `player1PositionShort` до `player14PositionShort` - позиции (сокращение OH/MB/OPP/S/L)

**Источник данных:**
- Игроки берутся из `match.teamB.roster[]` в порядке их появления в массиве
- Позиция — из `match.teamB.roster[i].position`
- Максимум 14 игроков

---

## 4. Стартовые составы

### 4.1. Структура стартового состава

Стартовый состав состоит из:
- **6 основных игроков** (индексы 0-5 в массиве стартовых)
- **2 либеро** (индексы 6-7 в массиве стартовых)

**Порядок определения стартовых:**
1. Если указан `team.startingLineupOrder[]` - используется этот порядок
2. Иначе берутся все игроки с `isStarter === true` в порядке их появления в `roster[]`

### 4.2. Стартовый состав команды A (startingLineupTeamA)

**Доступные поля:**
- `title` - название турнира
- `subtitle` - подзаголовок турнира
- `teamName` - название команды A
- `teamCity` - город команды A
- `teamLogo` - логотип команды A (image)
- `player1Number` до `player6Number` - номера основных игроков (1-6)
- `player1Name` до `player6Name` - имена основных игроков (1-6)
- `player1Position` до `player6Position` - позиции основных игроков (полное название)
- `player1PositionShort` до `player6PositionShort` - позиции основных игроков (сокращение OH/MB/OPP/S/L)
- `player1NumberOnCard` до `player6NumberOnCard` - номера на карте (1-6)
- `libero1Number` - номер либеро 1
- `libero1Name` - имя либеро 1
- `libero1Position` - позиция либеро 1 (полное название)
- `libero1PositionShort` - позиция либеро 1 (сокращение)
- `libero1NumberOnCard` - номер либеро 1 на карте
- `libero1Background` - цвет подложки либеро 1 (fill)
- `libero1BackgroundOnCard` - цвет подложки либеро 1 на карте (fill)
- `libero2Number` - номер либеро 2
- `libero2Name` - имя либеро 2
- `libero2Position` - позиция либеро 2 (полное название)
- `libero2PositionShort` - позиция либеро 2 (сокращение)
- `libero2NumberOnCard` - номер либеро 2 на карте
- `libero2Background` - цвет подложки либеро 2 (fill)
- `libero2BackgroundOnCard` - цвет подложки либеро 2 на карте (fill)

**Особенности:**
- Цвет подложки либеро берется из `teamA.liberoColor` или `teamA.color`
- Цвет текста номеров либеро вычисляется автоматически (контрастный к цвету подложки)
- Если либеро не указан, подложка становится прозрачной (#00000000)
- Позиции игроков и либеро берутся из `roster[].position`

### 4.3. Стартовый состав команды B (startingLineupTeamB)

**Доступные поля:** (аналогично команде A)
- Все те же поля, но для команды B (в т.ч. `player1Position`–`player6Position`, `player1PositionShort`–`player6PositionShort`, `libero1Position`, `libero1PositionShort`, `libero2Position`, `libero2PositionShort`)

---

## 5. Тренеры

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `teamA.coach` | string | Имя тренера команды A | `match.teamA.coach` | "Иванов И.И." |
| `teamB.coach` | string | Имя тренера команды B | `match.teamB.coach` | "Петров П.П." |

**Использование:**
- Инпут `referee1` (Плашка общая) - поля `name` (имя тренера), `position` ("Тренер")
- Обновляется вручную через функцию `updateCoachData(match, team, inputKey)`

---

## 6. Судьи и официальные лица

### 6.1. Структура Officials

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `officials.referee1` | string | Имя первого судьи | `match.officials.referee1` | "Сидоров С.С." |
| `officials.referee2` | string | Имя второго судьи | `match.officials.referee2` | "Кузнецов К.К." |
| `officials.lineJudge1` | string | Имя линейного судьи 1 | `match.officials.lineJudge1` | "Смирнов С.С." |
| `officials.lineJudge2` | string | Имя линейного судьи 2 | `match.officials.lineJudge2` | "Попов П.П." |
| `officials.scorer` | string | Имя секретаря | `match.officials.scorer` | "Новиков Н.Н." |

### 6.2. Использование судей

**Инпут `referee1` (Плашка общая):**
- Используется для отображения одного судьи/тренера
- Поля: `name` (имя), `position` (должность)
- Функции:
  - `updateReferee1Data(match)` - первый судья (position: "Первый судья")
  - `updateReferee2ShowData(match)` - второй судья (position: "Второй судья")
  - `updateCoachData(match, team)` - тренер (position: "Тренер")

**Инпут `referee2` (Плашка 2 судьи):**
- Используется для отображения обоих судей одновременно
- Поля: `referee1Name`, `referee2Name`
- Функция: `updateReferee2Data(match)`

**Примечание:** В текущей реализации используются только `referee1` и `referee2`. Остальные поля (`lineJudge1`, `lineJudge2`, `scorer`) доступны в структуре данных, но не используются в инпутах vMix.

---

## 7. Счет

### 7.1. Текущий счет (currentScore)

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `teamA` | string | Название команды A | `match.teamA.name` | "Динамо Москва" |
| `teamB` | string | Название команды B | `match.teamB.name` | "Зенит Казань" |
| `scoreASet` | string | Счет команды A в текущей партии | `match.currentSet.scoreA` | "25" |
| `scoreBSet` | string | Счет команды B в текущей партии | `match.currentSet.scoreB` | "23" |
| `scoreASets` | string | Счет по партиям команды A | Вычисляется | "2" |
| `scoreBSets` | string | Счет по партиям команды B | Вычисляется | "1" |
| `colorA` | string | Цвет команды A (fill) | `match.teamA.color` | "#3498db" |
| `colorB` | string | Цвет команды B (fill) | `match.teamB.color` | "#e74c3c" |
| `pointA` | boolean | Видимость индикатора подачи A | Вычисляется | true/false |
| `pointB` | boolean | Видимость индикатора подачи B | Вычисляется | true/false |

**Вычисляемые поля:**
- `scoreASets` / `scoreBSets` - количество выигранных завершенных партий
- `pointA` / `pointB` - видимость индикатора подачи (зависит от `currentSet.servingTeam`)

**Особенности:**
- Индикаторы подачи (`pointA`, `pointB`) управляются через поля видимости (visibility)
- Видимость определяется по `match.currentSet.servingTeam` ('A' или 'B')

### 7.2. Счет после партии (set1Score, set2Score, ..., set5Score)

**Доступные поля для каждого инпута (set1Score - set5Score):**
- `teamA` - название команды A
- `teamB` - название команды B
- `scoreASets` - счет по партиям команды A (до указанного номера партии)
- `scoreBSets` - счет по партиям команды B (до указанного номера партии)
- `set1Duration` до `setNDuration` - длительность партии N (формат: "23'")
- `set1ScoreA` до `setNScoreA` - счет команды A в партии N
- `set1ScoreB` до `setNScoreB` - счет команды B в партии N

**Особенности:**
- Для инпута `set1Score` доступны только поля для партии 1
- Для инпута `set2Score` доступны поля для партий 1 и 2
- И так далее до `set5Score`
- Поля для незавершенных партий возвращают пустую строку
- Длительность партии вычисляется из `set.startTime` и `set.endTime`

---

## 8. Партии (Sets)

### 8.1. Структура партии

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `set.setNumber` | number | Номер партии (1-5) | `match.sets[i].setNumber` | 1 |
| `set.scoreA` | number | Счет команды A в партии | `match.sets[i].scoreA` | 25 |
| `set.scoreB` | number | Счет команды B в партии | `match.sets[i].scoreB` | 23 |
| `set.status` | string | Статус партии | `match.sets[i].status` | "completed" |
| `set.completed` | boolean | Завершена ли партия | `match.sets[i].completed` | true |
| `set.startTime` | number | Время начала партии (timestamp) | `match.sets[i].startTime` | 1234567890 |
| `set.endTime` | number | Время завершения партии (timestamp) | `match.sets[i].endTime` | 1234569999 |
| `set.duration` | number | Продолжительность партии (минуты) | Вычисляется | 23 |

**Статусы партии:**
- `"pending"` - ожидает начала
- `"in_progress"` - идет
- `"completed"` - завершена

### 8.2. Текущая партия (currentSet)

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `currentSet.setNumber` | number | Номер текущей партии | `match.currentSet.setNumber` | 3 |
| `currentSet.scoreA` | number | Счет команды A | `match.currentSet.scoreA` | 15 |
| `currentSet.scoreB` | number | Счет команды B | `match.currentSet.scoreB` | 12 |
| `currentSet.servingTeam` | string | Команда на подаче | `match.currentSet.servingTeam` | "A" или "B" |
| `currentSet.status` | string | Статус текущей партии | `match.currentSet.status` | "in_progress" |
| `currentSet.startTime` | number | Время начала (timestamp) | `match.currentSet.startTime` | 1234567890 |
| `currentSet.endTime` | number | Время завершения (timestamp) | `match.currentSet.endTime` | null |

**Использование:**
- Инпут `currentScore` - поля `scoreASet`, `scoreBSet`, `pointA`, `pointB`

### 8.3. Вычисляемые данные партий

**Длительность партии:**
- Вычисляется из `startTime` и `endTime`
- Формат отображения: "23'" (минуты с символом минуты)
- Функция: `formatDuration(durationMinutes)`

**Счет по партиям:**
- Вычисляется как количество выигранных завершенных партий
- Учитываются только партии со статусом `"completed"` или `completed === true`
- Функция: `calculateSetsScore(match, team)`

---

## 9. Статистика

### 9.1. Структура статистики

| Поле | Тип | Описание | Источник | Пример |
|------|-----|----------|----------|--------|
| `statistics.enabled` | boolean | Включена ли статистика | `match.statistics.enabled` | true/false |
| `statistics.teamA.attack` | number | Атаки команды A | `match.statistics.teamA.attack` | 45 |
| `statistics.teamA.block` | number | Блоки команды A | `match.statistics.teamA.block` | 8 |
| `statistics.teamA.serve` | number | Подачи команды A | `match.statistics.teamA.serve` | 5 |
| `statistics.teamA.opponentErrors` | number | Ошибки соперника команды A | `match.statistics.teamA.opponentErrors` | 12 |
| `statistics.teamB.attack` | number | Атаки команды B | `match.statistics.teamB.attack` | 38 |
| `statistics.teamB.block` | number | Блоки команды B | `match.statistics.teamB.block` | 6 |
| `statistics.teamB.serve` | number | Подачи команды B | `match.statistics.teamB.serve` | 4 |
| `statistics.teamB.opponentErrors` | number | Ошибки соперника команды B | `match.statistics.teamB.opponentErrors` | 10 |

**Использование:** Поля доступны в сопоставлении полей инпутов на странице «Настройки подключения к vMix» (раздел «Расширенная статистика» в выпадающем списке «Данные приложения»). Значения выводятся как текст (числа).

---

## 10. Вычисляемые данные

### 10.1. Сетбол и матчбол

**Сетбол:**
- Определяется функцией `isSetball(scoreA, scoreB, setNumber)`
- Сетбол - когда команде осталось выиграть одно очко для победы в партии
- В обычных сетах (1-4): при счете >= 24:23
- В 5-м сете: при счете >= 14:13
- Если счет равный (24:24 или 14:14), то сетбола нет

**Матчбол:**
- Определяется функцией `isMatchball(sets, currentSetNumber, scoreA, scoreB)`
- Матчбол - когда команде осталось выиграть одно очко для победы во всем матче
- Происходит, когда команда уже ведет по сетам (2:0, 2:1) и находится на сетболе в текущем сете

**Примечание:** В текущей реализации сетбол и матчбол вычисляются, но не отправляются в vMix. Могут быть использованы в будущем для отображения специальных индикаторов.

### 10.2. Форматирование данных

**Форматирование даты и времени:**
- Функция: `formatDateTime(dateStr, timeStr)`
- Вход: `date` (YYYY-MM-DD), `time` (HH:MM)
- Выход: "ДД.ММ.ГГГГ ЧЧ:ММ"
- Используется в инпуте `lineup` для поля `matchDate`

**Форматирование длительности:**
- Функция: `formatDuration(durationMinutes)`
- Вход: число минут (number)
- Выход: "23'" (минуты с символом минуты)
- Используется в инпутах `set1Score` - `set5Score` для полей `setNDuration`

**Нормализация цвета:**
- Функция: `normalizeColor(color, defaultColor)`
- Вход: цвет (string, может быть в разных форматах), цвет по умолчанию
- Выход: HEX цвет (#RRGGBB)
- Используется для полей типа `fill` (цвета команд, подложки либеро)

**Контрастный цвет текста:**
- Функция: `getContrastTextColor(backgroundColor)`
- Вход: цвет фона (HEX)
- Выход: цвет текста (HEX, черный или белый в зависимости от контраста)
- Используется для автоматического определения цвета текста номеров либеро

---

## 11. Типы полей vMix

### 11.1. Типы полей

| Тип | Описание | Использование |
|-----|----------|---------------|
| `text` | Текстовое поле | Все текстовые данные (названия, имена, счет, и т.д.) |
| `fill` | Поле заливки (цвет) | Цвета команд, подложки либеро |
| `image` | Поле изображения | Логотипы команд |

### 11.2. Специальные атрибуты полей

**Видимость (visibility):**
- Используется для индикаторов подачи (`pointA`, `pointB`)
- Управляется через отдельный параметр `visibilityFields` в API vMix
- Видимость определяется динамически на основе `currentSet.servingTeam`

**Цвет текста (textColor):**
- Используется для автоматического определения цвета текста номеров либеро
- Управляется через отдельный параметр `textColorFields` в API vMix
- Цвет вычисляется автоматически на основе цвета подложки либеро

---

## 12. Инпуты vMix

### 12.1. Список инпутов

| Ключ инпута | Название | Описание |
|-------------|----------|----------|
| `currentScore` | Текущий счет | Отображает текущий счет матча и счет по партиям |
| `lineup` | Заявка | Отображает общую информацию о матче и командах |
| `rosterTeamA` | Состав команды A | Полный состав команды A (до 14 игроков) |
| `rosterTeamB` | Состав команды B | Полный состав команды B (до 14 игроков) |
| `startingLineupTeamA` | Стартовый состав A | Стартовый состав команды A (6 игроков + 2 либеро) |
| `startingLineupTeamB` | Стартовый состав B | Стартовый состав команды B (6 игроков + 2 либеро) |
| `referee1` | Плашка общая | Используется для отображения одного судьи/тренера |
| `referee2` | Плашка 2 судьи | Отображает обоих судей одновременно |
| `set1Score` | Счет после 1 партии | Информация о счете после первой партии |
| `set2Score` | Счет после 2 партий | Информация о счете после первых двух партий |
| `set3Score` | Счет после 3 партий | Информация о счете после первых трех партий |
| `set4Score` | Счет после 4 партий | Информация о счете после первых четырех партий |
| `set5Score` | Счет после 5 партий | Информация о счете после всех пяти партий |

### 12.2. Конфигурация инпутов

Каждый инпут имеет конфигурацию, которая включает:
- `enabled` - включен ли инпут
- `inputIdentifier` - идентификатор инпута в vMix (например, "Input1")
- `overlay` - номер оверлея (1-8)
- `fields` - объект с конфигурацией полей

Каждое поле в конфигурации имеет:
- `enabled` - включено ли поле
- `type` - тип поля (`text`, `fill`, `image`)
- `fieldName` - название поля (для отображения в UI)
- `fieldIdentifier` - идентификатор поля в vMix (например, "TeamA")
- `visible` - атрибут видимости (для индикаторов подачи)

---

## 13. Источники данных

### 13.1. Основной источник

Все данные берутся из объекта `match` типа `Match` (определен в `src/shared/types/Match.ts`).

### 13.2. Функции извлечения данных

Данные извлекаются и форматируются в хуке `useVMix` (`src/renderer/hooks/useVMix.js`):

- `getCurrentScoreFieldValue()` - значения полей текущего счета
- `getLineupFieldValue()` - значения полей заявки
- `getRosterFieldValue()` - значения полей состава команды
- `getStartingLineupFieldValue()` - значения полей стартового состава
- `getSetScoreFieldValue()` - значения полей счета после партии
- `formatCurrentScoreData()` - форматирование данных текущего счета
- `formatLineupData()` - форматирование данных заявки
- `formatRosterData()` - форматирование данных состава
- `formatStartingLineupData()` - форматирование данных стартового состава
- `formatSetScoreInputDataForVMix()` - форматирование данных счета после партии

### 13.3. Вспомогательные функции

- `calculateSetsScore()` - вычисление счета по партиям
- `calculateDuration()` - вычисление длительности партии
- `formatDuration()` - форматирование длительности
- `formatDateTime()` - форматирование даты и времени
- `normalizeColor()` - нормализация цвета
- `getContrastTextColor()` - вычисление контрастного цвета текста

---

## 14. Особенности реализации

### 14.1. Кэширование

- Все отправленные значения кэшируются для оптимизации
- Отправляются только измененные поля (если не `forceUpdate`)
- Кэш сбрасывается при смене матча (по `matchId`)

### 14.2. Логотипы

- Логотипы отправляются как URL через мобильный сервер
- Формат URL: `http://{ip}:{port}/logos/{filename}`
- При `forceUpdate` к URL добавляется timestamp для обхода кэша vMix
- Поддерживаются два формата хранения: `logoPath` (новый) и `logo`/`logoBase64` (старый)

### 14.3. Цвета либеро

- Цвет подложки либеро берется из `team.liberoColor` или `team.color`
- Цвет текста номеров либеро вычисляется автоматически (контрастный)
- Если либеро не указан, подложка становится прозрачной

### 14.4. Индикаторы подачи

- Управляются через поля видимости (visibility)
- Видимость определяется по `currentSet.servingTeam`
- Отправляются только при изменении

---

## 15. Планы на будущее

### 15.1. Неиспользуемые данные

Следующие данные доступны в структуре матча, но не используются в инпутах vMix:
- `officials.lineJudge1`, `officials.lineJudge2`, `officials.scorer` - линейные судьи и секретарь
- `statistics` - статистика матча
- `player.position` - позиция игрока
- Вычисляемые данные: сетбол, матчбол

### 15.2. Возможные улучшения

- Добавление инпутов для отображения статистики
- Добавление индикаторов сетбола и матчбола
- Использование позиций игроков в отображении составов
- Добавление инпутов для линейных судей и секретаря

---

## Примечания

- Все данные извлекаются из объекта `match` типа `Match`
- Форматирование данных происходит в хуке `useVMix`
- Конфигурация полей хранится в `src/main/vmix-input-configs.ts`
- Типы данных определены в `src/shared/types/Match.ts`
- Правила волейбола (сетбол, матчбол) определены в `src/shared/volleyballRules.js`

---

*Документ создан для подготовки рефакторинга системы работы с инпутами vMix*
