# Текущий функционал: интеграция с vMix и настройка инпутов

*Последнее обновление: 2026-02-06*

Единое описание текущей реализации взаимодействия приложения с vMix: подключение, настройка инпутов и полей, отправка данных, оверлеи. Документ основан на анализе кода (main, renderer, shared).

**Связанные справочники:** [Карта данных для vMix](vmix-data-map.md), [Справочник HTTP API vMix](../api/vmix-api-reference.md).

---

## 1. Обзор

- Приложение подключается к vMix по HTTP (адрес и порт из настроек). Состояние подключения сохраняется в `settings.json` и восстанавливается при запуске.
- Инпуты vMix настраиваются **динамически**: пользователь добавляет инпуты типа GT из списка, полученного через API vMix, задаёт отображаемое имя и сопоставляет поля GT с данными матча (справочник dataMapCatalog) или с произвольным текстом.
- Данные матча отправляются в vMix по сопоставлениям (SetText, SetColor, SetImage, SetTextVisibleOn/Off). Показ/скрытие плашек — через оверлеи vMix API.
- При переименовании инпута в vMix приложение может автоматически подставить новый title по сохранённому `vmixKey`; при необходимости пользователь вручную выбирает инпут в модальном окне «Повторно сопоставить».

---

## 2. Подключение к vMix

### 2.1. Хранение

Секция `vmix` в `settings.json` (файл в `app.getPath('userData')`):

- `host` — адрес vMix (по умолчанию `localhost`)
- `port` — порт (по умолчанию `8088`)
- `connectionState` — `"connected"` или `"disconnected"`

При «Подключить» выполняется запрос к `http://{host}:{port}/api`; при успехе в настройки записывается `connectionState: "connected"`. При «Отключить» — `"disconnected"`. При запуске приложения, если `connectionState === "connected"`, подключение восстанавливается автоматически.

### 2.2. API и IPC

- **Main:** `vmix-config` (обёртка над settingsManager), `vmix-client` (HTTP к vMix).
- **IPC:** `vmix:get-config`, `vmix:set-config`, `vmix:test-connection`, `vmix:connect`, `vmix:disconnect`.

---

## 3. Структура настроек инпутов (vmix)

В секции `vmix` хранятся:

- `inputOrder` — массив id инпутов (порядок отображения в списке и в кнопках плашек).
- `inputs` — объект вида `{ [inputId]: VMixInputConfig }`.

**Структура одного инпута (VMixInputConfig):**

| Поле | Тип | Описание |
|------|-----|----------|
| `displayName` | string | Имя, отображаемое в приложении (список инпутов, кнопки плашек). |
| `vmixTitle` | string | Имя инпута в vMix (title из API). Используется в запросах как параметр `Input`. |
| `vmixKey` | string | Уникальный ключ инпута в vMix (GUID). Нужен для автоисправления при переименовании в vMix. |
| `vmixNumber` | string | Номер инпута в vMix. |
| `enabled` | boolean | Включён ли инпут (отправка данных и кнопки плашек). |
| `overlay` | number | Номер оверлея (1–8) для показа/скрытия плашки. |
| `fields` | object | Сопоставление полей: ключ — имя поля в vMix (например `Name_Team1.Text`), значение — `{ vmixFieldType?, dataMapKey?, customValue? }`. |

**Поле в `fields`:**

- `vmixFieldType`: `'text'` | `'color'` | `'image'` (тип поля в GT).
- `dataMapKey`: ключ из справочника данных приложения (см. dataMapCatalog / vmix-data-map) — откуда брать значение из матча.
- `customValue`: произвольная строка (для текстовых полей вместо данных матча).

При загрузке настроек остаются только инпуты, у которых есть непустые `displayName` и `vmixTitle`; `inputOrder` очищается от id удалённых инпутов. Валидация секции vmix и каждого инпута — в `settingsValidator.ts`.

---

## 4. Страница «Настройки vMix»

Маршрут: `/vmix/settings`. Компонент: `VMixSettingsPage.jsx`.

### 4.1. Блок «Подключение»

- Поля: IP адрес vMix, Порт.
- Кнопки: «Подключить» / «Отключить», «Тест подключения».
- Состояние подключения отображается и сохраняется в настройки (см. раздел 2).

### 4.2. Блок «Настройка инпутов»

- **Слева:** список инпутов в порядке `inputOrder`. Перетаскивание (DnD) меняет порядок. Кнопка «Добавить инпут».
- **Справа:** при выборе инпута — настройки: отображаемое имя, «Включить инпут», оверлей (1–8), строка «Инпут vMix: **{vmixTitle}**», кнопка «Повторно сопоставить», панель полей (VMixInputFieldsPanel), кнопка «Удалить инпут».

### 4.3. Добавление инпута

- Модальное окно «Добавить инпут»: поле «Название (в приложении)» и выпадающий список «Инпут vMix (GT)». Список GT получается через `getVMixGTInputs()` (при открытии модального окна). При добавлении создаётся запись с `displayName`, `vmixTitle`, `vmixKey`, `vmixNumber` из выбранного GT, `enabled: true`, `overlay: 1`, `fields: {}`; id — UUID; id добавляется в `inputOrder`.

### 4.4. Повторное сопоставление с vMix (remap)

- Если инпут переименован в vMix, при открытии страницы выполняется автоисправление: утилита `tryApplyVMixInputRemapByKey(config, gtInputs)` ищет по сохранённому `vmixKey` в актуальном списке GT и при совпадении обновляет `vmixTitle` и `vmixNumber`. Поиск **только по vmixKey** (vmixNumber не используется).
- Если по key инпут не найден, пользователь нажимает «Повторно сопоставить»: открывается модальное окно с выпадающим списком актуальных GT-инпутов. После выбора и «Применить» у выбранного инпута обновляются `vmixTitle`, `vmixKey`, `vmixNumber`. Сопоставления полей (`fields`) не меняются. После смены сопоставления вызывается сброс кэша полей для этого инпута в main (см. раздел 7).

### 4.5. Панель полей инпута (VMixInputFieldsPanel)

- Для выбранного инпута запрашивается список полей vMix через `getVMixInputFields(vmixNumber | vmixTitle)` (результат кэшируется в main). Поля отображаются в виде раскрывающихся блоков (аккордеон).
- В каждом блоке: выбор источника данных — пункт из справочника `getDataMapCatalog({ fieldType })` (текст / цвет / изображение) или «Произвольный текст» (для text). Выбор записывается в `config.inputs[id].fields[fieldName]` как `{ vmixFieldType, dataMapKey }` или `{ vmixFieldType, customValue }`. Есть возможность очистить сопоставление поля.

Справочник данных приложения: `src/shared/dataMapCatalog.js` (иерархия групп, фильтр по типу поля). Полная карта источников — в [vmix-data-map.md](vmix-data-map.md).

---

## 5. Отправка данных в vMix

### 5.1. Цепочка

- В renderer хук `useVMix` при изменении матча вызывает (с debounce) обновление данных. Для динамических инпутов используется функция `updateDynamicInputs(matchData, forceUpdate)`.
- Она обходит `config.inputOrder` и для каждого включённого инпута собирает по `config.inputs[id].fields` значения: из матча через `getValueByDataMapKey(match, dataMapKey)` (shared) или `customValue`. Поля группируются по типам (text, color, image, visibility). Затем вызывается IPC `vmix:update-input-fields` с параметром инпута `vmixTitle` (или `vmixNumber`) и объектами полей.
- В main обработчик вызывает `vmix-client` и HTTP API vMix: SetText, SetColor, SetImage, SetTextVisibleOn/Off в соответствии с типами полей. Параметр `Input` в запросах — идентификатор инпута (vmixTitle).

### 5.2. Кэширование и оптимизация

- В useVMix хранится кэш последних отправленных значений по каждому инпуту. Отправляются только изменившиеся поля (если не передан `forceUpdate`). При смене матча, переподключении к vMix или изменении конфигурации инпутов кэш сбрасывается.

### 5.3. Получение значений из матча

- Функция `getValueByDataMapKey(match, dataMapKey)` (shared) возвращает значение по ключу справочника: прямые пути (`teamA.name`, `currentSet.scoreA` и т.д.), вычисляемые (счёт по партиям, **дата в формате ДД.ММ.ГГГГ** для ключа `date`, **matchDate** — ДД.ММ.ГГГГ ЧЧ:ММ, видимость индикаторов подачи), данные составов (в т.ч. PositionShort) и т.д. Общая функция форматирования даты `formatMatchDate` экспортируется и используется также на странице «Управление матчем» и в overlay. См. `src/shared/getValueByDataMapKey.js` и [vmix-data-map.md](vmix-data-map.md).

---

## 6. Управление оверлеями (плашки)

- На странице «Управление матчем» блок «Управление плашками vMix» (`VMixOverlayButtons`): кнопки строятся по `config.inputOrder` и `config.inputs`; подпись кнопки — `displayName` инпута. По клику вызываются `showVMixOverlay(inputKey)` / `hideVMixOverlay(inputKey)`.
- В main обработчики `vmix:show-overlay` и `vmix:hide-overlay` по `inputKey` находят конфиг инпута (по id из настроек), берут `vmixTitle` (или `vmixNumber`) и номер оверлея (`overlay`), затем вызывают vMix API (OverlayInputN In/Out). Состояние оверлеев периодически опрашивается через vMix API, чтобы синхронизировать подсветку активной кнопки.

### 6.1. API для страниц overlay (Browser Source)

- Страницы scoreboard, intro, rosters отдаются мобильным сервером (GET /overlay/scoreboard, /overlay/intro, /overlay/rosters) и получают данные через **GET /api/overlay/match**. Payload формируется в `server.getOverlayMatchPayload()`: лёгкий JSON с командами (name, city, logoUrl, coach, roster), счётом, setballTeam/matchballTeam, турниром, местом, датой/временем. В ответе: **matchDate** (ДД.ММ.ГГГГ ЧЧ:ММ), **date** в формате ДД.ММ.ГГГГ; в объектах команд — **city**; в элементах roster — **positionShort** (OH, MB, OPP, S, L). Подробности — в [overlay-pages-browser-source-plan.md](overlay-pages-browser-source-plan.md).

---

## 7. Кэш полей инпута и его сброс

- В main в `vmix-client` список полей инпута (результат getInputFields) кэшируется в `fieldsCacheByInput` по ключу — идентификатор инпута (vmixTitle, vmixKey или vmixNumber). Это уменьшает число запросов к vMix при открытии панели полей.
- Функция `clearInputFieldsCache(inputIdentifier)` в main удаляет запись из кэша. Вызывается через IPC `vmix:clearInputFieldsCache` после автоисправления сопоставления по vmixKey и после ручного выбора инпута в модальном окне «Повторно сопоставить». Конфиг полей (`config.inputs[id].fields`) при этом **не изменяется** — инвалидируется только кэш, чтобы при следующем открытии панели полей подтянулась актуальная структура из vMix.

---

## 8. Ключевые файлы

| Назначение | Файлы |
|------------|--------|
| Настройки vmix (файл, загрузка/сохранение) | `src/main/settingsManager.ts`, `src/main/utils/settingsValidator.ts` |
| HTTP клиент vMix, getGTInputs, getInputFields, кэш, clearInputFieldsCache | `src/main/vmix-client.ts` |
| Конфиг vMix (обёртка), IPC handlers | `src/main/vmix-config.ts`, `src/main/main.ts` |
| Утилиты конфига (remap по key, удаление инпута) | `src/shared/vmixConfigUtils.js` |
| Справочник данных приложения (для сопоставления полей) | `src/shared/dataMapCatalog.js` |
| Получение значения из матча по dataMapKey | `src/shared/getValueByDataMapKey.js` |
| Страница настроек vMix | `src/renderer/pages/VMixSettingsPage.jsx` |
| Панель полей инпута | `src/renderer/components/VMixInputFieldsPanel.jsx` |
| Кнопки плашек на странице матча | `src/renderer/components/VMixOverlayButtons.jsx` |
| Логика отправки данных и оверлеи | `src/renderer/hooks/useVMix.js` |
| IPC (preload) | `src/main/preload.cjs` (getVMixConfig, setVMixConfig, vmixConnect, vmixDisconnect, getVMixGTInputs, getVMixInputFields, clearVMixInputFieldsCache, updateVMixInputFields, showVMixOverlay, hideVMixOverlay и др.) |

---

## 9. Связанная документация

- **[vmix-data-map.md](vmix-data-map.md)** — карта данных приложения для vMix (источники, типы, примеры использования).
- **[vmix-api-reference.md](../api/vmix-api-reference.md)** — HTTP API vMix (SetText, SetColor, SetImage, оверлеи, параметры).
- **[overlay-pages-browser-source-plan.md](overlay-pages-browser-source-plan.md)** — план и текущая реализация HTML-страниц оверлеев (scoreboard, intro, rosters) и API GET /api/overlay/match.
- **docs/architecture/ARCHITECTURE.md** — общая архитектура приложения (раздел про vMix при необходимости обновить по этому документу).
