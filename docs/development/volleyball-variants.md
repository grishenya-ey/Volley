# Варианты волейбола: зал, пляж, снежный (Россия)

Описание правил и текущей реализации поддержки зального, пляжного и снежного волейбола в приложении.

*Последнее обновление: 2026-02-06*

---

## Сводная таблица параметров

| Параметр | Зал (ВФВ) | Пляж (Россия / ФИВБ) | Снежный (Россия / ФИВБ) |
|----------|-----------|----------------------|--------------------------|
| **Партий в матче** | до 5 (максимум) | до 3 (максимум) | до 3 (максимум) |
| **Партий для победы в матче** | 3 | 2 | 2 |
| **Очков в обычных партиях** | 25 | 21 | 15 |
| **Очков в решающей партии** | 15 (5-я партия) | 15 (3-я партия) | 15 (3-я партия) |
| **Разница для победы в партии** | 2 очка | 2 очка | 2 очка |
| **Порог сетбола (обычные партии)** | 24 | 20 | 14 |
| **Порог сетбола (решающая партия)** | 14 | 14 | 14 |
| **Номер решающей партии** | 5 | 3 | 3 |

Общее для всех вариантов: система rally-point, при равном счёте на пороге сетбола нет — игра до разницы в 2 очка.

---

## Архитектура реализации

### Файлы

| Файл | Назначение |
|------|------------|
| `src/shared/volleyballRulesConfig.js` | Константы VARIANTS, RULES_CONFIGS, validateRulesConfig |
| `src/shared/volleyballRules.js` | createRules(config), getRules(match), getSetNumbers(match), isDecidingSet(setNumber, match) |
| `src/shared/domain/MatchDomain.ts` | hasMatchStarted(match) — определение, начат ли матч |
| `src/shared/types/Match.ts` | Поле variant в интерфейсе Match |

### Поле variant в матче

Матч содержит обязательное поле `variant: 'indoor' | 'beach' | 'snow'`. По умолчанию — `'indoor'`. Потребители получают правила через `getRules(match)`.

### Фабрика правил

```javascript
const rules = getRules(match);
rules.isSetball(scoreA, scoreB, setNumber);
rules.canFinishSet(scoreA, scoreB, setNumber);
rules.getMatchWinner(sets);
rules.getConfig();  // { maxSets, decidingSetNumber, pointsToWinRegularSet, ... }
```

- **getSetNumbers(match)** — массив номеров партий (5 для зала, 3 для пляжа/снега)
- **isDecidingSet(setNumber, match)** — true для 5-й партии при зале, для 3-й при пляже/снеге

### Ограничение смены варианта

Тип матча (indoor/beach/snow) **нельзя изменить после начала игры**. Функция `MatchDomain.hasMatchStarted(match)` возвращает `true`, если:
- есть завершённые партии (`match.sets.length > 0`), или
- текущая партия в статусе `IN_PROGRESS`.

В `MatchSettingsPage` поле «Вариант волейбола» блокируется при `hasMatchStarted(match) === true`.

### UI

- Выбор варианта: страница «Настройки матча» → поле «Вариант волейбола» (Зал / Пляж / Снежный)
- При смене команд местами поле `variant` сохраняется
- При создании нового матча — `variant: 'indoor'` по умолчанию

---

## Потребители правил

| Модуль | Использование |
|--------|---------------|
| `useMatch.js` | getRules(match).isSetball, isMatchball, canFinishSet |
| `SetValidator.ts` | getRules(match).canFinishSet, getConfig |
| `SetService.ts` | getRules(match).canFinishSet, getSetWinner |
| `server.js` (мобильный) | getRules(matchData).isSetball, isMatchball, canFinishSet, getSetNumbers |
| `SetsDisplay.jsx` | getSetNumbers(match), isDecidingSet(setNumber, match) |

---

## Ссылки на официальные правила

- Зал: [ВФВ — официальные правила волейбола](https://volley.ru/federation/documents/official-volleyball-rules/)
- Пляж: [пляжный волейбол ВФВ](https://beach.volley.ru/)
- Снежный: [Волейбол на снегу ВФВ](https://snow.volley.ru/)
