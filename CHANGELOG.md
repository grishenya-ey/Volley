# Changelog

Все значимые изменения в проекте документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

### Добавлено

- **Рефакторинг страницы «Управление составами»**
  - Блок «Внешний вид команды»: название команды, город команды, логотип (превью, загрузка/удаление), цвет формы и цвет либеро. Логотип и цвета в одну строку (flex).
  - Компоненты **TeamLogoEditor** и **TeamColorsEditor** (`src/renderer/components/`) — используются на MatchSettingsPage и RosterManagementPage.
  - В типе `Team` (Match.ts): поля `logoPath?`, `logoBase64?`, `city?`.
  - Экспорт/импорт на странице составов расширен: для выбранной команды в JSON включаются `name`, `city`, `coach`, `roster`, `startingLineupOrder`, `color`, `liberoColor`, при наличии — `logoBase64`. Импорт применяет эти поля к выбранной команде; при наличии логотипа — `saveLogoToFile` и подстановка в match. Сообщение об успешном импорте перечисляет импортированные поля.
  - Тесты: RosterManagementPage — экспорт/импорт с name, city, color, liberoColor, logoBase64; мок `resetImageFieldsCache`.
  - Документация: `docs/getting-started/ui-structure.md` — описание блока «Внешний вид команды» и города; `docs/development/roster-management-refactoring-plan.md` — переписан как описание выполненных изменений (вместо плана).

- **Исправление бага с фокусом в полях ввода (Electron alert/confirm)**
  - Все вызовы `alert()` и `window.confirm()` в рендерере заменены на IPC-диалоги main-процесса: `window.electronAPI.showMessage()` и `window.electronAPI.showConfirm()` (см. [Electron #20821](https://github.com/electron/electron/issues/20821)). После закрытия диалога поля ввода снова принимают ввод с клавиатуры.
  - Main: модуль `src/main/dialogHandlers.ts` с `registerDialogHandlers(ipcMain, dialog, getWindow)`; обработчики `dialog:show-message` и `dialog:show-confirm`; вызов из `main.ts`.
  - Preload: в `electronAPI` добавлены `showMessage` и `showConfirm`.
  - Затронуты страницы и компоненты: MatchSettingsPage, RosterManagementPage, MatchControlPage, VMixSettingsPage, WelcomePage, Layout, MobileAccessPage, useMatch.
  - Тесты: `tests/unit/main/dialogHandlers.test.ts`; моки `showMessage`/`showConfirm` в `tests/setup.ts`; обновлены MatchSettingsPage, RosterManagementPage, useMatch (проверки вызовов диалогов).
  - Документация: `docs/troubleshooting/electron-input-focus-bug.md` (анализ), `docs/development/electron-dialog-refactoring-implementation-guide.md` (инструкция по рефакторингу, TDD, этапы отмечены выполненными).

- **Блокировка кнопок плашек при одной плашке в эфире (один vMix-инпут)**
  - В useVMix добавлена функция `isAnotherOverlayOnAirForSameInput(inputKey)`: возвращает true, если другая плашка из той же группы (тот же оверлей и тот же vMix-инпут) в эфире. Недоступными делаются только кнопки, ссылающиеся на тот же vMix-инпут; кнопки плашек на другие инпуты остаются доступными.
  - VMixOverlayButtons: опциональный проп `isAnotherOverlayOnAirForSameInput`; кнопка отключается при «другая плашка в эфире» и неактивной текущей; подсказка «Другая плашка этого инпута в эфире».
  - Тесты: в useVMix-overlay-same-input — проверки isAnotherOverlayOnAirForSameInput (в т.ч. кейс с тремя плашками и разными инпутами); в VMixOverlayButtons — кнопка disabled и tooltip при моке «другая в эфире».

- **Overlay-страницы (intro, rosters): дизайн и API**
  - Intro: центрированный синий прямоугольник с градиентной полоской сверху (как scoreboard); турнир, подзаголовок, блок команд (логотипы слева/справа от названий, под названием — город), место проведения, дата/время (ДД.ММ.ГГГГ ЧЧ:ММ, без часового пояса). Фон страницы прозрачный.
  - Rosters: центрированный синий прямоугольник с градиентной полоской; две симметричные колонки, таблица **№ / Поз. / Имя**; колонка «Поз.» — международные сокращения (OH, MB, OPP, S, L) из `positionShort` в API. Размеры без `transform: scale`, до 14 игроков в 1080px; увеличенная ширина блоков и колонок с именами; неразрывный пробел перед * у стартовых.
  - API GET /api/overlay/match: в ответ добавлены `matchDate` (ДД.ММ.ГГГГ ЧЧ:ММ), поле `date` в формате ДД.ММ.ГГГГ; в объектах команд — `city`; в элементах `roster[]` — `positionShort` (getPositionAbbreviation из shared/playerPositions.js).

- **Форматирование даты для vMix и UI**
  - В vMix и на странице «Управление матчем» дата отображается в формате ДД.ММ.ГГГГ. Функция `formatMatchDate` экспортирована из `getValueByDataMapKey.js` и используется для ключа `date` (vMix) и в MatchControlPage (подпись «Не указана» при пустой дате). Единая логика без дублирования.

- **MatchDomain.hasMatchStarted** — функция определения, начат ли матч (есть завершённые партии или текущая партия в игре)
- **Блокировка смены варианта волейбола** — поле «Вариант волейбола» в настройках матча блокируется после начала игры с подсказкой

- **Система дизайна (design tokens) и тёмная тема**
  - Design tokens: `src/shared/theme/tokens.js` (цвета светлой/тёмной темы, отступы, радиусы, типографика), реэкспорт в `src/renderer/theme/tokens.js`
  - Применение темы: `src/renderer/theme/applyTheme.js` — запись токенов в CSS-переменные на `document.documentElement`
  - Настройка темы: секция `ui.theme` в settings.json (`'light' | 'dark' | 'system'`), валидация в settingsValidator, IPC ui:get-settings / ui:set-settings, событие ui-theme-changed
  - Переключение темы через меню **Вид → «Переключить тему (светлая ↔ тёмная)»** (кнопка в header убрана)
  - Тёмная тема на градациях серого (background, surface, surfaceMuted, headerBg); мобильная панель получает тему из настроек и подставляет токены в HTML
  - Компонент **Button** (`src/renderer/components/Button.jsx`) с вариантами primary, secondary, success, danger, warning, accent; тесты в `tests/unit/renderer/Button.test.jsx`
  - Глобальные стили полей ввода в `index.html`: input/select/textarea — фон, цвет текста и рамка из CSS-переменных темы (тёмная подложка в тёмной теме)
  - Токены подающей команды: `servingBorder`, `servingBadge` — фиксированные цвета для рамки и бейджа «Подача» (видимы на любом фоне)
  - Доступность: стили `:focus-visible` в index.html для button, input, select, textarea, a

- **Тесты для рефакторинга инпутов vMix**
  - `tests/unit/shared/getValueByDataMapKey.test.js` — покрытие getValueByDataMapKey (прямые пути, видимость, вычисляемые, ростер, партии)
  - `src/main/vmix-overlay-utils.ts` — вынесены из main.ts: resolveLogoUrlsInImageFields, findInputConfig (для тестирования)
  - `tests/unit/main/vmix-overlay-utils.test.ts` — тесты преобразования URL логотипов и поиска конфига инпута
  - `tests/unit/renderer/VMixOverlayButtons.test.jsx` — динамические кнопки из inputOrder, показ/скрытие оверлеев
  - `tests/unit/renderer/VMixInputFieldsPanel.test.jsx` — аккордеон полей, сопоставление, выбор «Не сопоставлено»
  - `tests/unit/renderer/useVMix-dynamic-inputs.test.js` — showOverlay (vmixTitle/vmixNumber), updateMatchData с forceUpdate, смена matchId
  - `tests/unit/renderer/VMixSettingsPage.test.jsx` — handleSave и navigate с forceUpdateVMix, список инпутов с draggable

### Завершено

- **Миграция на TypeScript**
  - Тесты: исправлен путь к `App.tsx` в `App-loadMatch.test.tsx` (APP_FILE с расширением); моки `tests/__mocks__/Match.js` и `Match.mjs` заменены на `Match.ts`; импорт в `useMatch.test.ts` — без расширения `.js`.
  - Конфигурация: в `vite.config.js` пороги покрытия переведены на `volleyballRules.ts` и `matchUtils.ts`, из `optimizeDeps.include` убран устаревший `vmix-field-utils.js`.
  - Итог: весь код в `src/` и тестах на TypeScript (.ts/.tsx); в main единственное исключение — `preload.cjs` (CommonJS для Electron).

### Исправлено

- **Поля «Старт А»/«Старт Б» при пустом стартовом составе**
  - В `getValueByDataMapKey` исправлена логика для ключей `startingA.*` / `startingB.*`: при отсутствии отмеченных стартовых игроков (нет `isStarter`, пустой `startingLineupOrder`) в поля сопоставления vMix больше не подставляются данные из полного состава (Roster); возвращается пустая строка.
  - Изменён только блок для позиций player1–player6: игрок берётся по `startingLineupOrder[i]` или как i-й среди `roster.filter(isStarter)`, без запасного варианта `roster[i]`.
  - Тест в `getValueByDataMapKey.test.ts`: при пустом стартовом составе для `startingA.player1Number/Name`, `startingB.player1Number/Name` и т.п. ожидается `''`.
  - Документация: `docs/troubleshooting/starting-lineup-empty-vs-roster-analysis.md` — добавлен раздел о внесённом исправлении.

- **Редактор цветов формы при пустом значении («Не указан»)**
  - В `TeamColorsEditor` при пустом цвете в `input type="color"` больше не передаётся `value=""` (формат HTML5 требует `#rrggbb`). Для отображения пикера используется fallback `#ffffff`; в состоянии и в `onChange` по-прежнему передаётся пустая строка. Устранены предупреждения в консоли и некорректное отображение после «Поменять цвета», когда цвет либеро не указан.
  - Для поля «Цвет формы игроков» задан placeholder «Не указан»; для пикеров добавлены `aria-label`. Документация: `docs/development/roster-page-import-export-and-swap-colors-plan.md` (история изменений), `roster-management-refactoring-plan.md` (описание TeamColorsEditor).

- **Логотип команды A на overlay/intro (мобильный сервер)**
  - В `getOverlayMatchPayload()` (server.ts) при формировании `logoUrl` добавлена проверка существования файла по `team.logoPath` (`existsSync`). Если файл отсутствует (например, после cleanup при сохранении матча текущий матч в памяти не обновлён новыми путями), в ответ не отдаётся битая ссылка; используется fallback на `team.logoBase64` или `team.logo` (data URL). Импорт `existsSync` из `fs`.

- **Ошибки компиляции TypeScript после рефакторинга диалогов**
  - В `useMatch.ts`: приведение типа для `window.electronAPI` (Window не объявляет electronAPI в проекте); приведение `Match` к `MatchForMigration` при вызове `migrateMatchToSetStatus` и результата к `Match | null`; приведение `match` к `MatchWithVariant` при вызове `getRules`.
  - В `SetService.ts`: приведение `match` к `MatchWithVariant` при вызове `getRules(match)` для совместимости с интерфейсом (индексная сигнатура). Сборка `npm run compile:typescript` и `npm run build:electron` проходит успешно.

- **Потеря данных в форме настроек матча** — добавлен `formDataRef` в MatchSettingsPage для корректного сохранения; кнопка «Сохранить» в хедере читает актуальные данные из ref
- **Перезапись formData при обновлении match** — зависимость useEffect изменена с `[match, navigate]` на `[match?.matchId, navigate]`
- **Переход на страницу матча после сохранения настроек** — порядок `effectiveInitialMatch` изменён на `matchFromState || initialMatch` для использования `finalMatch` из `location.state`
- **Смена команд местами** — при swap teams сохраняется поле `variant` в formData

- **Тесты MobileAccessPage**
  - Поиск кнопок через getByRole('button', { name: /запустить сервер/i }) и /остановить сервер/i вместо getByText (избежание множественных совпадений)
  - Мок getMobileServerInfo с полем `running: true`/`running: false` (компонент проверяет serverInfo.running)
  - Синхронизация моков с global.window.electronAPI в тестах «ошибки при генерации QR-кода», «QR из сохраненной сессии», «остановить сервер», «очищать QR-код»
  - Мок QRCodeCanvas без вызова getContext('2d') (в jsdom не реализован)

### Документация

- **Плашки vMix (несколько конфигов на один инпут):** в docs/development/vmix-overlay-same-input-refactoring.md зафиксированы изменения по блокировке кнопок (isAnotherOverlayOnAirForSameInput, VMixOverlayButtons, только тот же vMix-инпут); удалена инструкция vmix-overlay-disable-same-input-instruction.md.

- **Overlay и vMix:** в docs/development/overlay-pages-browser-source-plan.md добавлен раздел «Текущая реализация» (intro, rosters, API), обновлены разделы 6.2–6.3 и чек-лист. В vmix-current-functionality.md — подраздел 6.1 (API для страниц overlay), уточнён 5.3 (дата ДД.ММ.ГГГГ, formatMatchDate), ссылка на overlay-pages-browser-source-plan в разделе 9. В vmix-data-map.md ранее обновлено описание поля date (формат в vMix — ДД.ММ.ГГГГ).

- **Консолидация документации по вариантам волейбола** — создан единый документ `docs/development/volleyball-variants.md` (правила, архитектура, hasMatchStarted)
- Удалены устаревшие: `volleyball-variants-implementation-guide.md`, `volleyball-variants-refactoring-plan.md`, `volleyball-variants-rules.md`
- Обновлены ссылки в docs/README.md, development/README.md, app-description.md, score-and-set-status-logic-documentation.md
- Обновлены cursor_rules.mdc — добавлен MatchDomain, ссылка на volleyball-variants.md

- **Дизайн:** добавлен единый документ **docs/development/DESIGN.md** — актуальное описание системы дизайна (токены, темы, компоненты, оформление страниц)
- **Структура UI:** обновлён docs/getting-started/ui-structure.md — меню «Вид» с пунктом «Переключить тему», ссылка на DESIGN.md
- **Аудит и рефакторинг:** в docs/development/ui-ux-audit-report.md и design-refactoring-implementation-guide.md добавлены статус и ссылки на DESIGN.md
- Удалены устаревшие docs/development/design-theme-and-score-fixes-plan.md и dark-theme-inputs-analysis.md (содержимое учтено в DESIGN.md)
- Обновлены docs/README.md и docs/development/README.md — ссылки на DESIGN.md и актуальный список документов
- Обновлены docs/development/README.md — раздел «Тесты рефакторинга инпутов vMix»
- Обновлены docs/development/vmix-inputs-refactoring-implementation-guide.md — раздел 12.4 «Добавленные тесты»
- Обновлены docs/testing/README.md — таблица новых и обновлённых тестов
- Обновлены docs/architecture/ARCHITECTURE.md — vmix-overlay-utils.ts в main, getValueByDataMapKey.js в shared
- Обновлён docs/README.md — дата последнего обновления 2026-02-06

- **Миграция на TypeScript и актуализация docs (2026-02-07):**
  - План миграции: `docs/development/typescript-migration-plan.md` — раздел 1 «Текущее состояние» обновлён (миграция завершена), в фазе 7 добавлен пункт про моки, чек-лист отмечен выполненным.
  - Архитектура: `docs/architecture/ARCHITECTURE.md` — диаграмма и дерево структуры проекта приведены к .ts/.tsx; все ссылки на модули (main.ts, server.ts, App.tsx, useMatch.ts, fileManager.ts, logoManager.ts и др.) и preload.cjs обновлены; раздел конфигурации полей vMix — vmix-config.ts.
  - Навигация: в `docs/README.md` добавлена ссылка на план миграции TypeScript, дата обновления 2026-02-07; в `docs/development/README.md` план миграции отмечен как завершённый, расширения файлов тестов в разделе «Тесты рефакторинга инпутов vMix» приведены к .ts/.tsx.

### Изменено

- **Оформление интерфейса под тему**
  - Все основные компоненты и страницы переведены на CSS-переменные (`var(--color-text)`, `var(--color-surface)` и т.д.) и токены (space, radius)
  - **ScoreDisplay:** фиксированная ширина блоков команд (200px), подающая команда выделяется только рамкой (плашка «Подача» в блоке счёта убрана), плашки «Сетбол»/«Матчбол» под цифрой счёта с фиксированной высотой блока, уменьшен шрифт названия команды (0.875rem), обрезка длинных имён с ellipsis, логотипы с minWidth/minHeight и flexShrink: 0
  - **MatchControlPage:** блок «Расширенная статистика» раскрывается только по галочке (кнопка «Развернуть/Свернуть» убрана), левая колонка с minWidth: 790px
  - **WelcomePage:** блок «Быстрый старт» — surface-muted, border, цвет текста из темы
  - **MobileAccessPage:** блоки ссылки и QR-кода, блок инструкции — оформление как на Welcome (surface-muted, border), единый стиль с темой
  - **MatchSettingsPage:** выпадающий список «Часовой пояс» без захардкоженного белого фона — глобальные стили темы
  - **RosterManagementPage:** таблица состава и сетка расстановки — surface и color из темы
  - **VMixSettingsPage:** панели «Настройка инпутов» (список инпутов и настройки выбранного), модальное окно «Добавить инпут», VMixInputFieldsPanel — surface, цвет текста и подписей из темы
  - **Button:** явный opacity: 1 в baseStyle для обычного состояния; при disabled — opacity: 0.7 (тесты ScoreButtons приведены в соответствие)

## [1.0.9] - 2026-01-23

### Исправлено

- **Критическое исправление: QR-код не работал в production сборке**
  - Заменена библиотека `qrcode` на `qrcode.react` для решения проблемы с минификацией
  - Исправлена ошибка `TypeError: g.find_path is not a function` в production сборке
  - QR-код теперь работает корректно как в dev, так и в production режиме
  - Удалена зависимость `@types/qrcode` из devDependencies
  - Обновлена конфигурация Vite: удалены упоминания `qrcode` из настроек CommonJS

### Добавлено

- **Тесты для MobileAccessPage**
  - Создан файл `tests/unit/renderer/MobileAccessPage.test.jsx`
  - Покрытие тестами функционала генерации QR-кода
  - Тесты для запуска/остановки мобильного сервера
  - Тесты для работы с сетевыми интерфейсами
  - Моки для `qrcode.react` и Electron API

### Изменено

- **Реализация генерации QR-кода**
  - Переход с асинхронного API `QRCode.toDataURL()` на React-компонент `QRCodeCanvas`
  - Использование скрытого canvas элемента для генерации data URL
  - Улучшена обработка ошибок при генерации QR-кода

### Документация

- Создан документ `docs/troubleshooting/qrcode-library-replacement.md` с описанием проблемы и решения
- Обновлен `docs/troubleshooting/README.md` с информацией о новой документации

## [1.0.8] - 2026-01-23

### Добавлено

- **Импорт и экспорт настроек**
  - Добавлены пункты меню "Импорт настроек..." и "Экспорт настроек..." в главное меню приложения
  - Реализован экспорт всех настроек в JSON файл, выбранный пользователем
  - Реализован импорт настроек из JSON файла с валидацией данных
  - Стратегия глубокого слияния (merge) при импорте: сохраняются существующие настройки, которых нет в импортируемом файле
  - Полная валидация импортируемых данных с детальными сообщениями об ошибках
  - Поддержка частичного импорта: импортируются только валидные секции, невалидные игнорируются с предупреждениями
  - Глубокое слияние полей (fields) внутри инпутов vMix при импорте

- **Валидатор настроек**
  - Создан модуль `src/main/utils/settingsValidator.ts` для валидации структуры настроек
  - Валидация всех секций настроек: vmix, mobile, autoSave, autoUpdate
  - Валидация инпутов vMix и их полей (fields)
  - Детальные сообщения об ошибках валидации

- **Тесты для импорта/экспорта настроек**
  - Юнит-тесты для валидатора настроек (`tests/unit/main/settings-validator.test.ts`)
  - Юнит-тесты для экспорта настроек (`tests/unit/main/settings-export.test.ts`)
  - Юнит-тесты для импорта настроек (`tests/unit/main/settings-import.test.ts`)
  - Интеграционные тесты для полного цикла импорта/экспорта (`tests/integration/settings-import-export.test.ts`)

### Изменено

- **Улучшение UX при сохранении настроек**
  - Убрано модальное окно "Настройки сохранены!" со страницы "Мобильный доступ"
  - Убрано модальное окно "Настройки сохранены!" со страницы "Настройки подключения к vMix"
  - Страницы автоматически закрываются после успешного сохранения настроек
  - Улучшена консистентность поведения кнопок "Сохранить" на разных страницах

- **Исправление проблемы с QR-кодом**
  - Переход с внешнего API (`api.qrserver.com`) на клиентскую библиотеку `qrcode`
  - Решена проблема с Content Security Policy (CSP), блокировавшей внешние запросы
  - QR-код теперь генерируется локально на клиенте без внешних зависимостей
  - Добавлена библиотека `qrcode` в `vite.config.js` для корректной обработки CommonJS модуля

- **Очистка проекта от скомпилированных файлов**
  - Удалены все скомпилированные `.js` файлы из `src/renderer/pages/` (16 файлов)
  - Удалены все скомпилированные `.js` файлы из `src/renderer/components/` (11 файлов)
  - Удалены скомпилированные файлы `App.js` и `index.js` из `src/renderer/`
  - Vite теперь использует только исходные `.jsx` файлы, что устраняет конфликты и проблемы с кэшированием

- **Оптимизация импортов**
  - Исправлен двойной импорт (статический + динамический) в `settingsImportExport.ts`
  - Все функции валидации теперь импортируются статически
  - Устранено предупреждение Vite о динамическом импорте модуля, который также статически импортирован

- **Обновление .gitignore**
  - Добавлены правила для игнорирования скомпилированных `.js` файлов в `src/renderer/pages/` и `src/renderer/components/`
  - Предотвращение попадания скомпилированных файлов в репозиторий в будущем

### Исправлено

- **Исправление ошибок сборки**
  - Исправлена ошибка `app is undefined` в `logoManager.ts` (добавлен импорт `app` из `electron`)
  - Исправлена проблема с обновлением vMix при открытии матча из файла (добавлен флаг `forceUpdateVMix: true`)
  - Добавлены тесты для проверки создания папки `logos` в production режиме
  - Добавлены тесты для проверки обновления vMix при загрузке матча

### Технические детали

- **Новые файлы:**
  - `src/main/settingsImportExport.ts` - модуль импорта/экспорта настроек
  - `src/main/utils/settingsValidator.ts` - валидатор настроек
  - `tests/unit/main/settings-validator.test.ts` - тесты валидатора
  - `tests/unit/main/settings-export.test.ts` - тесты экспорта
  - `tests/unit/main/settings-import.test.ts` - тесты импорта
  - `tests/integration/settings-import-export.test.ts` - интеграционные тесты
  - `docs/development/settings-import-export-plan.md` - план реализации функционала

- **Обновленные файлы:**
  - `src/main/main.ts` - добавлены пункты меню для импорта/экспорта настроек
  - `src/main/settingsManager.ts` - добавлены обертки для импорта/экспорта
  - `src/renderer/pages/MobileAccessPage.jsx` - убрано модальное окно, добавлено автоматическое закрытие
  - `src/renderer/pages/VMixSettingsPage.jsx` - убрано модальное окно, добавлено автоматическое закрытие
  - `src/main/settingsImportExport.ts` - исправлен двойной импорт валидатора
  - `vite.config.js` - добавлена библиотека `qrcode` в `optimizeDeps` и `commonjsOptions`
  - `.gitignore` - добавлены правила для скомпилированных файлов
  - `docs/README.md` - добавлена ссылка на план импорта/экспорта настроек
  - `docs/architecture/ARCHITECTURE.md` - обновлена документация с новыми модулями
  - `docs/getting-started/app-description.md` - добавлено описание функционала импорта/экспорта
  - `.cursor/rules/cursor_rules.mdc` - добавлена инструкция по систематическому подходу к исправлению ошибок

- **Удаленные файлы:**
  - Все скомпилированные `.js` файлы из `src/renderer/` (28 файлов, ~4183 строк кода)

- **Новые зависимости:**
  - `qrcode` - для клиентской генерации QR-кодов (уже была в проекте, теперь используется)

## [1.0.7] - 2026-01-21

### Добавлено

- **Система автоматических обновлений**
  - Реализована автоматическая проверка обновлений при запуске приложения
  - Интеграция с GitHub Releases через `electron-updater`
  - Возможность отключения автоматических обновлений через настройки
  - Ручная проверка обновлений на странице "О программе"
  - Автоматическое извлечение release notes из CHANGELOG.md при публикации

- **Настройки автоматических обновлений**
  - Переключатель "Автоматическая проверка при запуске" на странице "О программе"
  - Сохранение настроек в `settings.json`
  - Отображение статуса обновлений (проверка, доступно, загрузка, установлено)

- **Публикация релизов**
  - Скрипт `build:electron:publish` для автоматической публикации на GitHub
  - Автоматическое создание файла `latest.yml` для работы обновлений
  - Интеграция с `dotenv-cli` для безопасного хранения GitHub токена
  - Автоматическое извлечение release notes из CHANGELOG.md

### Изменено

- **Конфигурация electron-builder**
  - Добавлена конфигурация для публикации на GitHub Releases
  - Настроен автоматический экспорт release notes из CHANGELOG.md

- **Документация**
  - Добавлено руководство `docs/development/auto-updates-setup.md` по настройке автоматических обновлений
  - Обновлена документация с инструкциями по публикации релизов

### Технические детали

- **Новые зависимости:**
  - `electron-updater` (перемещен в `dependencies` для production)
  - `dotenv-cli` (для загрузки переменных окружения из `.env`)

- **Новые файлы:**
  - `src/main/updater.ts` - модуль управления обновлениями
  - `scripts/extract-release-notes.js` - скрипт извлечения release notes из CHANGELOG.md
  - `docs/development/auto-updates-setup.md` - документация по автоматическим обновлениям
  - `.env` - файл для хранения GitHub токена (в `.gitignore`)

- **Обновленные файлы:**
  - `src/main/main.ts` - добавлена инициализация системы обновлений
  - `src/main/preload.cjs` - добавлены IPC каналы для обновлений
  - `src/main/settingsManager.ts` - добавлены настройки автоматических обновлений
  - `src/renderer/pages/AboutPage.jsx` - добавлен UI для управления обновлениями
  - `package.json` - добавлены скрипты для публикации и извлечения release notes

## [1.0.6] - 2026-01-20

### Добавлено

- **Информация об авторстве приложения**
  - Добавлена информация об авторе на страницу "О программе":
    - Илья Моисеев
    - Волгоград, Россия
    - Email: ilyamoiseev@inbox.ru
    - Сайт: webcastmaster.ru
  - Добавлено поле `author` в `package.json` с полной информацией об авторе
  - Год в копирайте обновляется автоматически через `new Date().getFullYear()`

- **Favicon для приложения**
  - Добавлен `favicon.ico` в `src/renderer/` для отображения в окне приложения
  - Настроено автоматическое копирование favicon в `dist/` при сборке через Vite плагин
  - Добавлены ссылки на favicon в `index.html`

- **Иконка для Electron приложения**
  - Создан скрипт `scripts/prepare-icons.js` для автоматической подготовки иконок перед сборкой
  - Иконка копируется в `assets/icon.ico` (для extraResources) и `build/icon.ico` (для electron-builder)
  - Настроена иконка для окна приложения в dev и production режимах
  - Настроена иконка для Windows exe файла через electron-builder
  - Добавлены иконки для NSIS установщика (`installerIcon` и `uninstallerIcon`)
  - Обновлены пути к иконкам в `main.js` с поддержкой production режима
  - Добавлена иконка в `extraResources` для доступа в production
  - Настроен `buildResources: "build"` в конфигурации electron-builder
  - Включен `signAndEditExecutable: true` для встраивания иконки в exe файл

### Изменено

- **Обновление года в документации**
  - В `USER_GUIDE.md` заменен плейсхолдер `{CURRENT_YEAR}` на актуальный год (2026)
  - В `AboutPage.jsx` год обновляется динамически через `new Date().getFullYear()`

### Технические детали

- **Новые файлы**:
  - `src/renderer/favicon.ico` - favicon приложения
  - `scripts/prepare-icons.js` - скрипт подготовки иконок для сборки
  - `assets/icon.ico` - иконка для extraResources
  - `build/icon.ico` - иконка для electron-builder

- **Обновленные файлы**:
  - `src/renderer/index.html` - добавлены ссылки на favicon
  - `src/renderer/pages/AboutPage.jsx` - добавлена информация об авторе
  - `src/main/main.js` - обновлены пути к иконкам для окна приложения
  - `package.json` - добавлено поле `author`, обновлена конфигурация electron-builder
  - `vite.config.js` - добавлен плагин для копирования favicon
  - `USER_GUIDE.md` - обновлен год

- **Обновленные скрипты сборки**:
  - Добавлен скрипт `prepare:icons` в `package.json`
  - Скрипты `build:electron` и `build:electron:all` теперь включают подготовку иконок

## [Unreleased]

### Добавлено

- **Документация по использованию TypeScript в production**
  - Создан документ `docs/development/typescript-in-production-explanation.md` с подробным объяснением, почему TypeScript нельзя использовать напрямую в production сборке Electron
  - Описаны проблемы с ASAR архивами, нативными бинарниками (esbuild) и решения через предварительную компиляцию
  - Документация включает сравнение подходов (tsx vs tsc) и рекомендации

- **Документация по сравнению Webpack/Rollup с текущим подходом**
  - Создан документ `docs/development/webpack-rollup-vs-current-approach.md` с детальным сравнением инструментов сборки
  - Описаны преимущества и недостатки каждого подхода
  - Приведены рекомендации для текущего проекта и критерии, когда стоит переходить на бандлеры
  - Включены примеры конфигураций и метрики производительности

- **Отчет об аудите автономности функций при недоступности vMix**
  - Создан документ `docs/troubleshooting/vmix-connection-audit-report.md` с результатами аудита
  - Документированы функции, которые работают автономно, и функции, которые блокируются при недоступности vMix
  - Описана обработка ошибок и механизмы восстановления подключения

- **Документация по исправлению ошибки TypeScript в production**
  - Обновлен документ `docs/troubleshooting/typescript-production-fix.md` с полным описанием решения
  - Описаны все этапы исправления: от удаления расширений `.ts` до предварительной компиляции через `tsc`
  - Включены технические детали и рекомендации

### Завершено

- **Реализован функционал инпутов "Счет после X партии" (set1Score - set5Score)**
  - Добавлены поля для отображения названий команд, счета по сетам и данных по завершенным партиям
  - Реализована функция `getSetScoreFieldValue` в `useVMix.js` для получения значений полей по `fieldKey` (аналогично другим инпутам)
  - Интегрирована функция `calculateDuration` из `timeUtils` для правильного округления длительности партий (Math.round) - совпадает с отображением на основной странице
  - Использована функция `formatDuration` из `timeUtils` для форматирования времени партии с символом "'" (например, "23'")
  - Добавлена поддержка динамических полей для каждой завершенной партии (время, счет команды А, счет команды Б)
  - Реализована логика фильтрации завершенных партий до указанного номера инпута
  - Добавлена обработка незавершенных партий (возврат пустых строк)
  - Обновлена конфигурация инпутов в `vmix-input-configs.js` с использованием `generateSetScoreFields`
  - Обновлен компонент `VMixOverlayButtons.jsx` для отключения плашек незавершенных партий
  - Добавлены тесты для нового функционала:
    - `tests/unit/setScoreInputsUtils.test.js` - тесты утилит
    - `tests/unit/getSetScoreFieldValue.test.js` - тесты логики получения значений полей
    - `tests/unit/useVMixSetScore.test.js` - тесты интеграции с useVMix
    - `tests/unit/vmixInputConfigs.test.js` - обновлены тесты конфигурации
  - Обновлена документация:
    - `docs/development/set-score-inputs-implementation-guide.md` - добавлен раздел о завершении реализации
    - `docs/README.md` - добавлена ссылка на руководство
    - `CHANGELOG.md` - добавлена запись о новом функционале

- **Завершен рефакторинг управления счетом и состояниями партий (Этап 9)**
  - Все 9 этапов рефакторинга успешно завершены
  - Исправлены все ошибки в тестах (импорты TypeScript, моки Jest, логика тестов)
  - Все тесты проходят успешно
  - Исправлены проблемы с `import.meta` в тестах через Babel плагин `babel-plugin-transform-import-meta`
  - Исправлены моки для работы с ESM модулями (использование переменных с префиксом `mock`)
  - Обновлены тесты для соответствия реальной логике (локальная история вместо HistoryService)
  - Исправлены импорты TypeScript файлов в компонентах (SetEditModal.jsx, SetsDisplay.jsx)
  - Исправлены импорты в тестах (добавлены расширения `.ts` для TypeScript файлов)
  - Убраны проблемные моки из jest.config.js (мокирование Match.ts вызывало ошибки)
  - Обновлена документация: этап 9 помечен как завершенный

### Исправлено

- **Исправлена передача данных для полей либеро в стартовых составах**
  - Исправлена проблема с текстовыми полями либеро (номер, имя, номер на карте): теперь всегда отправляются значения в vMix, даже если либеро не указан (пустые строки для очистки вывода)
  - Исправлена логика установки цвета подложек либеро: каждое поле подложки проверяет свой конкретный либеро (libero1Background проверяет Либеро 1, libero2Background проверяет Либеро 2)
    - Если конкретный либеро указан: устанавливается цвет из настроек (`team.liberoColor` или `team.color`)
    - Если конкретный либеро не указан: устанавливается прозрачный цвет `#00000000`
  - Исправлена логика установки контрастного цвета текста для номеров либеро: цвет устанавливается только если конкретный либеро указан
  - Обновлен файл `src/renderer/hooks/useVMix.js` в функции `formatStartingLineupData`

- **Критическое исправление логики редактирования завершенных партий**
  - Исправлена проблема, когда при редактировании завершенной партии неправильно определялась текущая партия
  - Добавлена проверка статуса партии при определении `isCurrentSet`: теперь проверяется не только `setNumber`, но и статус `IN_PROGRESS`
  - Исправлена проблема, когда при редактировании завершенной партии счет обновлялся в `currentSet` вместо массива `sets`
  - Исправлена проблема, когда при редактировании завершенной партии `currentSet.status` неправильно менялся на `COMPLETED`
  - Добавлена защита от изменения `currentSet` при редактировании завершенной партии, когда следующая партия уже идет (`IN_PROGRESS`)
  - Исправлена проблема с сохранением счета: счет теперь корректно сохраняется в массиве `sets` при редактировании завершенной партии
  - Улучшена функция сравнения `areEqual` в `SetsDisplay.jsx` для корректного обновления компонента при изменении счета завершенных партий

- **Устранение бесконечных ре-рендеров модального окна редактирования партии**
  - Убрана IIFE (Immediately Invoked Function Expression) для рендеринга `SetEditModal` в `MatchControlPage.jsx`
  - Добавлен `useMemo` для вычисления `modalData` после получения `match` из хука `useMatch`
  - Добавлен `useCallback` для `handleSetSave` для предотвращения ненужных ре-рендеров
  - Исправлена ошибка `ReferenceError: Cannot access 'match' before initialization`

### Добавлено

- **Модальное окно редактирования партий (`SetEditModal.jsx`)**
  - Полнофункциональное модальное окно для редактирования завершенных и текущих партий
  - Редактирование счета партии (scoreA, scoreB)
  - Редактирование статуса партии с учетом контекста (завершена ли следующая партия)
  - Редактирование времени начала и завершения партии с учетом часового пояса
  - Валидация изменений (пересечение времени с другими партиями, корректность статусов)
  - Автоматическое удаление времени при изменении статуса (например, при переходе в PENDING удаляется время начала и завершения)
  - Поддержка возврата завершенной партии в статус "В игре" (если следующая партия еще не начата)
  - Блокировка изменения статуса, если следующая партия уже начата

- **Утилиты для работы со временем (`timeUtils.js`)**
  - `calculateDuration()` - вычисление продолжительности партии в минутах
  - `formatDuration()` - форматирование продолжительности для отображения
  - `toTimestamp()` - конвертация Date/string в timestamp
  - `formatTimestamp()` - форматирование timestamp с учетом часового пояса
  - `timestampToDateTimeLocal()` - конвертация timestamp в формат datetime-local для input элементов

- **Валидация изменений партий (`setValidation.js`)**
  - `validateSetUpdate()` - валидация изменений партии (счет, статус, время)
  - Проверка пересечения времени с другими партиями
  - Проверка корректности статусов в зависимости от контекста

- **Миграция старых матчей (`matchMigration.js`)**
  - `migrateMatchToSetStatus()` - миграция старых матчей без поля `status` в новую структуру
  - Автоматическое определение статуса партий на основе `completed` флага и наличия времени

- **Улучшения компонента `SetsDisplay.jsx`**
  - Улучшена функция сравнения `areEqual` для `memo`: теперь сравниваются все важные поля партий (scoreA, scoreB, status, completed)
  - Добавлено логирование для диагностики (временно)
  - Компонент теперь корректно обновляется при изменении счета завершенных партий

- **Тесты для нового функционала**
  - `tests/unit/renderer/SetEditModal.test.js` - тесты для модального окна редактирования партий
  - `tests/unit/renderer/SetsDisplay.test.js` - тесты для компонента отображения партий
  - `tests/unit/renderer/useMatch-set-status.test.js` - тесты для логики управления состояниями партий
  - `tests/unit/shared/timeUtils.test.js` - тесты для утилит работы со временем

### Изменено

- **Логика обновления партий в `useMatch.js`**
  - Функция `updateSet()` теперь корректно определяет, обновляется ли текущая партия или завершенная
  - При обновлении завершенной партии `currentSet` не изменяется (сохраняется статус и счет)
  - При обновлении завершенной партии, когда следующая уже идет, `currentSet` остается без изменений
  - Добавлено подробное логирование для диагностики проблем

- **Структура компонента `MatchControlPage.jsx`**
  - Убрана IIFE для рендеринга модального окна
  - `modalData` вычисляется через `useMemo` после получения `match`
  - `handleSetSave` обернут в `useCallback` для оптимизации

### Технические детали

- **Изменения в `useMatch.js`**:
  - Улучшена проверка `isCurrentSet`: теперь проверяется `setNumber === currentSet.setNumber && currentSet.status === IN_PROGRESS`
  - При обновлении завершенной партии счет преобразуется в число (если приходит строка)
  - Добавлена защита от изменения `currentSet` при редактировании завершенной партии, когда следующая уже идет
  - Добавлено подробное логирование для диагностики

- **Новые файлы**:
  - `src/renderer/components/SetEditModal.jsx` - модальное окно редактирования партий
  - `src/shared/timeUtils.js` - утилиты для работы со временем
  - `src/shared/setValidation.js` - валидация изменений партий
  - `src/shared/matchMigration.js` - миграция старых матчей
  - `tests/unit/renderer/SetEditModal.test.js` - тесты для модального окна
  - `tests/unit/renderer/SetsDisplay.test.js` - тесты для компонента отображения партий
  - `tests/unit/renderer/useMatch-set-status.test.js` - тесты для логики состояний
  - `tests/unit/shared/timeUtils.test.js` - тесты для утилит времени

- **Документация**:
  - Обновлен `docs/development/README.md` с ссылками на новую документацию
  - Обновлен `docs/README.md` с информацией о функционале состояний партий
  - Создан `docs/development/set-status-and-timing-implementation-guide.md` с подробным руководством

## [1.0.2] - 2024-12-XX

### Добавлено

- **Контрастный цвет текста для полей номеров либеро**
  - Автоматическая установка контрастного цвета текста для полей "Номер либеро X" и "Номер либеро X на карте"
  - Цвет текста определяется автоматически на основе цвета подложки либеро из настроек матча
  - Используется функция `getContrastTextColor()` для расчета оптимального цвета (черный или белый)
  - Поддержка команды `SetTextColour` в vMix API для установки цвета текста в GT Titles
  - Цвет текста устанавливается только если либеро указан в стартовом составе
  - Работает для всех полей: `Libero1Number.Text`, `Libero1NumberOnCard.Text`, `Libero2Number.Text`, `Libero2NumberOnCard.Text`
  - Добавлен новый параметр `textColorFields` в `updateInputFields` для передачи цветов текста
  - Обновлены IPC handlers для поддержки нового параметра

- **Тесты для контрастного цвета текста либеро**
  - Добавлен файл `tests/unit/main/vmix-client-text-color.test.js` с тестами для команды `SetTextColour`
  - Тесты проверяют формирование правильного URL для команды `SetTextColour` с суффиксом `.Text`
  - Тесты проверяют кодирование символа `#` в цвете
  - Тесты проверяют работу с разными цветами (черный, белый, красный)
  - Обновлены тесты в `tests/unit/renderer/useVMix-libero-background.test.js` для проверки логики контрастного цвета

### Исправлено

- **Критическое исправление: Система уникальных имен файлов логотипов для обхода кэширования vMix**
  - Файлы логотипов теперь создаются с уникальными именами, включающими timestamp
  - Формат: `logo_a_<timestamp>.png` или `logo_b_<timestamp>.png` вместо фиксированных `logo_a.png` и `logo_b.png`
  - Каждое обновление логотипа создает новый файл, что гарантирует обновление в vMix
  - Решена проблема, когда vMix кэшировал логотипы по имени файла и не отображал обновленные версии
  - Обновлена функция `saveLogoToFile()` в `logoManager.js` для генерации уникальных имен
  - Обновлены функции `processTeamLogoForSave()` и `processTeamLogoForLoad()` для работы с уникальными именами
  - Обновлена функция `getFieldValue()` в `useVMix.js` для использования `logoPath` с уникальными именами
  - Добавлен fallback на фиксированное имя для обратной совместимости со старыми матчами
  - Формат `logoPath` в JSON изменен: `logos/logo_a_<timestamp>.png` вместо `logos/logo_a.png`

- **Оптимизация сохранения логотипов**
  - Логотипы сохраняются в файлы только в трех случаях:
    1. При загрузке нового логотипа (`logo:save-to-file`)
    2. При открытии сохраненного матча (`fileManager.openMatch`)
    3. При смене команд местами (`match:swap-teams`)
  - Удалено автоматическое сохранение логотипов при обновлении матча через `match:set-current`
  - Улучшена производительность за счет уменьшения количества операций записи файлов
  - Упрощена логика управления логотипами

- **Улучшение обработки смены команд местами**
  - Исправлена проблема с некорректным обновлением логотипов в vMix после смены команд
  - Очистка папки logos выполняется ОДИН РАЗ перед сохранением обоих логотипов
  - Используется обновленный матч из результата `setCurrentMatch` после swap-teams
  - Обновление данных в vMix с использованием актуальных `logoPath` с уникальными именами
  - Добавлено подробное логирование для отладки

- **Улучшена очистка логотипов при создании нового матча**
  - Заменена ручная очистка файлов на вызов `logoManager.cleanupLogosDirectory()`
  - Удаляются все файлы `logo_*.png`, а не только фиксированные имена
  - Упрощена логика обработки ошибок

- **Единообразные отступы в header на всех страницах**
  - Добавлены отступы слева и справа в header на всех страницах (кроме главной)
  - Используется `maxWidth: '1600px'` и `margin: '0 auto'` для центрирования контента
  - Теперь все страницы имеют одинаковые отступы, как на странице "Управление матчем"

### Добавлено

- **Инфраструктура тестирования**
  - Полная настройка Jest для unit и integration тестов
  - Конфигурация Babel для транспиляции тестов
  - Тестовые утилиты для React (@testing-library/jest-dom, @testing-library/react, @testing-library/user-event)
  - Поддержка jsdom для DOM окружения в тестах
  - Supertest для тестирования HTTP серверов
  - Новые npm скрипты:
    - `test` - запуск всех тестов
    - `test:watch` - тесты в режиме наблюдения
    - `test:coverage` - генерация отчета о покрытии
    - `test:unit` - только unit тесты
    - `test:integration` - только интеграционные тесты
    - `test:security` - тесты безопасности
    - `test:json` - вывод результатов в JSON
    - `test:junit` - вывод результатов в JUnit XML
    - `test:ci` - конфигурация для CI/CD
    - `test:analyze` - анализ результатов тестов
  - Структура тестов: `tests/unit/`, `tests/integration/`, `tests/security/`, `tests/fixtures/`

- **Инфраструктура линтинга**
  - Настройка ESLint с поддержкой React и React Hooks
  - Плагин для проверки неиспользуемых импортов
  - Новые npm скрипты:
    - `lint` - проверка кода
    - `lint:fix` - автоматическое исправление ошибок
    - `lint:unused` - проверка неиспользуемых импортов
  - Конфигурационные файлы: `eslint.config.js`, `.babelrc`

- **Новые IPC handlers для управления логотипами**
  - `logo:save-to-file` - сохранение логотипа в файл при загрузке нового логотипа
    - Параметры: `teamLetter` ('A' или 'B'), `logoBase64` (base64 строка)
    - Очищает папку logos перед сохранением
    - Сохраняет логотип с уникальным именем
    - Возвращает `{ success, logoPath, logoBase64 }`
  - `logo:delete` - удаление логотипа (очистка файлов)
    - Параметры: `teamLetter` ('A' или 'B')
    - Очищает папку logos от всех файлов логотипов
    - Возвращает `{ success }`

- **Реорганизация документации**
  - Структурирована документация по категориям:
    - `docs/getting-started/` - начало работы
    - `docs/architecture/` - архитектура проекта
    - `docs/api/` - API документация
    - `docs/testing/` - тестирование
    - `docs/development/` - документация для разработчиков
    - `docs/troubleshooting/` - решение проблем
  - Добавлены навигационные файлы README в каждой категории
  - Обновлен главный `docs/README.md` с полной навигацией
  - Обновлен `README.md` в корне проекта с новыми ссылками на документацию

- **Обновление документации**
  - Обновлен `docs/architecture/ARCHITECTURE.md`:
    - Описание системы уникальных имен файлов логотипов
    - Обновлены IPC handlers
    - Обновлены потоки данных с новым форматом имен файлов
  - Обновлен `docs/api/vmix-api-reference.md`:
    - Описание формирования URL для логотипов с уникальными именами
    - Обновлены примеры запросов
    - Добавлен раздел о системе уникальных имен файлов

### Изменено

- **Формат хранения logoPath в JSON файлах матчей**
  - Старый формат: `logos/logo_a.png` (фиксированное имя)
  - Новый формат: `logos/logo_a_<timestamp>.png` (уникальное имя с timestamp)
  - Обеспечена обратная совместимость через fallback на фиксированное имя

- **Логика обработки логотипов в `useVMix.js`**
  - Функции `getFieldValue()`, `getRosterFieldValue()`, `getStartingLineupFieldValue()` обновлены для использования `logoPath` с уникальными именами
  - Извлечение имени файла из `logoPath` (удаление префикса `logos/`)
  - Формирование URL с уникальным именем файла
  - Добавлено логирование для отладки

- **Обработка загрузки логотипов в `MatchSettingsPage.jsx`**
  - При загрузке нового логотипа сразу сохраняется в файл через `saveLogoToFile`
  - Обновляется матч с новыми `logoPath` и `logoBase64` из результата
  - Обновляется матч в Electron API через `setCurrentMatch`
  - Добавлен fallback для обратной совместимости

- **Обработка сохранения матча в `MatchSettingsPage.jsx`**
  - Используются актуальные `logoPath` из матча (после swap-teams они уже обновлены)
  - Используется обновленный матч из результата `setCurrentMatch` (с правильными `logoPath`)
  - Обновление данных в vMix с использованием `finalMatch` с актуальными `logoPath`
  - Добавлено подробное логирование для отладки

### Технические детали

- **Изменения в `logoManager.js`**:
  - Функция `saveLogoToFile()` генерирует уникальное имя файла с timestamp
  - Добавлена проверка существования файла перед возвратом (`fs.access`)
  - Функция `processTeamLogoForSave()` обновлена для работы с уникальными именами файлов
  - Функция `processTeamLogoForLoad()` возвращает обновленный `logoPath` с уникальным именем
  - Функция `cleanupLogosDirectory()` удаляет все файлы `logo_*.png` (включая старые файлы с timestamp)
  - Функция `getLogoHttpUrl()` исправлена для корректной обработки пути

- **Изменения в `main.js`**:
  - Удалено автоматическое сохранение логотипов из обработчика `match:set-current`
  - Добавлены новые IPC handlers: `logo:save-to-file` и `logo:delete`
  - Улучшена функция `clearLogosOnNewMatch()` - использует `logoManager.cleanupLogosDirectory()`
  - Обновлена функция `match:swap-teams` - очистка папки ОДИН РАЗ перед сохранением обоих логотипов
  - Добавлено логирование для отладки

- **Изменения в `preload.js`**:
  - Добавлены методы `saveLogoToFile(teamLetter, logoBase64)` и `deleteLogo(teamLetter)` в `window.electronAPI`

- **Изменения в `.gitignore`**:
  - Расширен стандартный шаблон для Node.js проектов
  - Добавлены правила для логов, кэшей, покрытия тестами, результатов тестирования
  - Улучшена организация правил по категориям

- **Новые файлы**:
  - `.babelrc` - конфигурация Babel для транспиляции
  - `eslint.config.js` - конфигурация ESLint
  - `jest.config.js` - конфигурация Jest
  - `scripts/analyze-test-results.js` - скрипт для анализа результатов тестов
  - `src/main/utils/domUtils.js` - утилиты для работы с DOM
  - Полная структура тестов в `tests/`

### Потенциальные проблемы и рекомендации

- **Накопление старых файлов логотипов**
  - Система уникальных имен файлов может привести к накоплению большого количества старых файлов
  - Рекомендуется регулярная очистка старых файлов (уже реализована через `cleanupLogosDirectory()`)
  - Мониторинг размера папки `logos/`

- **Миграция старых матчей**
  - Старые сохраненные матчи могут содержать `logoPath` в старом формате (`logos/logo_a.png`)
  - Обеспечена обратная совместимость через fallback на фиксированное имя
  - Рекомендуется реализовать миграцию старых матчей при их открытии (будущее улучшение)

- **Логирование в production**
  - Добавлено много `console.log` для отладки, которые могут влиять на производительность
  - Рекомендуется использовать систему логирования с уровнями (debug, info, warn, error)
  - Отключать debug логирование в production режиме (будущее улучшение)

## [Unreleased]

### Добавлено

- **Добавлено поле "Цвет формы либеро" для команд**
  - Добавлено опциональное поле `liberoColor` в структуру `Team`
  - На странице "Настройки матча" переименовано "Цвет формы" на "Цвет формы игроков"
  - Добавлено новое поле "Цвет формы либеро" ниже поля "Цвет формы игроков" для обеих команд
  - Поле сохраняется в структуре данных матча и готово к использованию в будущем

- **Автоматическое определение контрастного цвета текста**
  - Создана утилита `colorContrast.js` для автоматического определения оптимального цвета текста на цветном фоне
  - Используется формула относительной яркости (relative luminance) из WCAG 2.1 для точного определения контрастности
  - На странице "Управление матчем" цвет текста названий команд автоматически адаптируется к цвету фона
  - На странице "Управление составами" цвет текста кнопок выбора команды автоматически адаптируется к цвету фона
  - Решена проблема с нечитаемым текстом при белой или черной форме игроков

### Исправлено

- **Исправлена очистка логотипов при открытии проекта без логотипов**
  - При открытии проекта без логотипов файлы `logo_a.png` и `logo_b.png` от предыдущего проекта теперь удаляются
  - Функция `processTeamLogoForLoad` явно обнуляет поля логотипов (`logo`, `logoPath`, `logoBase64`) при их отсутствии в JSON
  - Функция `processTeamLogoForSave` удаляет файлы логотипов при сохранении проекта без логотипов
  - Добавлена функция `clearLogosOnNewMatch()` для удаления логотипов при создании нового матча
  - Исправлена ошибка с повторным объявлением `fs` и `path` в `fileManager.js`
  - Логотипы корректно обнуляются в интерфейсе при открытии пустого проекта
  - Старые логотипы не сохраняются в новый проект при автосохранении

- **Исправлена передача команд в vMix при открытии проекта**
  - При открытии проекта из файла команды на обновление инпутов теперь всегда отправляются, даже если поля пустые
  - Изменена проверка `hasFields` в функциях обновления: при `forceUpdate=true` команды отправляются всегда
  - Функция `formatCurrentScoreData` теперь отправляет все текстовые поля, включая пустые
  - Функции `formatLineupData`, `formatRosterData`, `formatStartingLineupData` отправляют пустые изображения при `forceUpdate=true`
  - Это позволяет очистить данные в vMix при открытии пустого проекта
  - vMix корректно синхронизируется с состоянием приложения при открытии проекта

- **Исправлена передача логотипов в vMix через API команды**
  - Исправлена проверка наличия логотипов: теперь проверяются `logo`, `logoPath` и `logoBase64` вместо только `logo`
  - Исправлено формирование URL для логотипов в функциях `getLineupFieldValue`, `getRosterFieldValue` и `getStartingLineupFieldValue`
  - Исправлен двойной путь `/logos/logos/` в функциях для составов команд - теперь `logoBaseUrl` всегда включает `/logos`, и добавляется только имя файла
  - Исправлена функция `processTeamLogoForSave`: теперь проверяет и `logo`, и `logoBase64` для сохранения логотипов в файлы
  - Логотипы теперь корректно передаются в vMix через команду `SetImage` во всех случаях

- **Исправлена работа логотипов в production режиме**
  - Логотипы теперь сохраняются в `userData/logos/` вместо `extraResources/logos/` в production (доступно для записи)
  - Добавлена автоматическая миграция логотипов из `extraResources` в `userData` при первом запуске в production
  - Сервер мобильного доступа обслуживает логотипы из `userData/logos/` в production режиме
  - Исправлены пути к логотипам в production для корректной работы с Electron app.getPath('userData')
  - Добавлена обработка ошибок при определении путей в случае, если `app` еще не готов

### Добавлено

- **Выбор сетевого интерфейса для мобильного сервера**
  - Добавлена функция `getNetworkInterfaces()` для получения списка всех доступных сетевых интерфейсов
  - Добавлен выпадающий список выбора сетевого интерфейса на странице "Мобильный доступ"
  - Выбранный сетевой интерфейс сохраняется в настройках мобильного сервера (`mobile.selectedIP`)
  - Мобильный сервер использует выбранный IP адрес вместо автоматического определения
  - Решена проблема, когда сервер запускался в другой подсети, чем vMix (например, 10.x.x.x vs 192.168.144.x)
  - Добавлены IPC handlers: `mobile:get-network-interfaces` и `mobile:set-selected-ip`
  - Выбор интерфейса блокируется при запущенном сервере (требуется перезапуск для применения изменений)
  - Обновлены инструкции на странице мобильного доступа с информацией о выборе интерфейса

### Технические детали

- **Изменения в `logoManager.js`**:
  - Функция `getLogosDir()` теперь использует `app.getPath('userData')` в production вместо `process.resourcesPath`
  - Добавлены функции `ensureLogosDir()` и `migrateLogosFromExtraResources()` для миграции логотипов
  - Функция `processTeamLogoForSave()` теперь проверяет и `logo`, и `logoBase64` для определения источника логотипа
  - Логотипы в production сохраняются в `userData/logos/` (доступно для записи)

- **Изменения в `server.js`**:
  - Добавлена функция `getLogosPath()` для динамического определения пути к логотипам
  - Обновлен `setupMiddleware()` для обслуживания логотипов из `userData/logos/` в production
  - Добавлена функция `getNetworkInterfaces()` для получения списка всех сетевых интерфейсов
  - Обновлена функция `getLocalIP(selectedIP)` для использования выбранного IP из настроек
  - Обновлен endpoint `/api/logos/check` для использования правильного пути к логотипам

- **Изменения в `useVMix.js`**:
  - Исправлена проверка наличия логотипов в `getLineupFieldValue()`, `getRosterFieldValue()` и `getStartingLineupFieldValue()`
  - Теперь проверяются все возможные источники: `logo`, `logoPath`, `logoBase64`
  - Исправлено формирование URL для логотипов (удален двойной `/logos/`)
  - `logoBaseUrl` всегда включает `/logos`, к нему добавляется только имя файла

- **Изменения в `main.js`**:
  - Добавлен вызов `ensureLogosDir()` при старте приложения для инициализации папки и миграции
  - Добавлены IPC handlers: `mobile:get-network-interfaces` и `mobile:set-selected-ip`

- **Изменения в `settingsManager.js`**:
  - Добавлено поле `selectedIP: null` в настройки мобильного сервера (`mobile.selectedIP`)

- **Изменения в `preload.js`**:
  - Добавлены методы `getNetworkInterfaces()` и `setSelectedMobileIP()` в `window.electronAPI`

- **Изменения в `MobileAccessPage.jsx`**:
  - Добавлен выпадающий список выбора сетевого интерфейса
  - Добавлена логика сохранения выбранного IP в настройки
  - Обновлены инструкции с информацией о выборе интерфейса
  - Выбор интерфейса блокируется при запущенном сервере

- **Документация**:
  - Обновлен `docs/ARCHITECTURE.md` с информацией о logoManager, server.js и выборе сетевого интерфейса
  - Обновлен `docs/ui-structure.md` с описанием выбора сетевого интерфейса на странице "Мобильный доступ"
  - Обновлен `docs/vmix-api-reference.md` с информацией о формировании URL логотипов с учетом выбора сетевого интерфейса
  - Создан новый документ `docs/logo-fixes-and-network-selection.md` с подробным описанием всех исправлений

### Исправлено

- **Исправлена работа приложения в production режиме после компиляции**
  - Исправлены пути к файлам для работы с ASAR архивом в Electron
  - Обновлены пути к `dist/index.html`, `preload.js`, иконкам в `main.js`
  - Исправлены пути к `logos` и `matches` для использования `process.resourcesPath` в production
  - Исправлены пути в `logoManager.js` и `fileManager.js` для корректной работы с extraResources
  - Приложение теперь корректно загружается и находит все необходимые файлы в production режиме

- **Исправлена проблема с маршрутизацией в production режиме**
  - Заменен `BrowserRouter` на `HashRouter` в production для корректной работы с `file://` протоколом
  - `BrowserRouter` продолжает использоваться в dev режиме для чистых URL
  - Добавлена автоматическая нормализация начального пути при загрузке без хэша
  - Решена проблема "No routes matched location" при запуске скомпилированного приложения

- **Исправлена конфигурация сборки Electron**
  - Добавлена конфигурация `electron-builder` в `package.json`
  - Исправлена ошибка с deprecated `directories` в корне `package.json`
  - Удалено недопустимое свойство `doc` из конфигурации `directories`
  - Отключена подпись кода для Windows через `signAndEditExecutable: false` и переменную окружения `CSC_IDENTITY_AUTO_DISCOVERY=false`
  - Добавлен `cross-env` для кроссплатформенной установки переменных окружения
  - Исправлена проблема с символическими ссылками winCodeSign при сборке для Windows

- **Исправлена проблема с загрузкой настроек в production**
  - Обновлена логика `settingsManager.js` для работы с настройками в production режиме
  - Настройки копируются из `extraResources` в `userData` при первом запуске
  - В production настройки читаются и сохраняются в пользовательской директории Electron
  - В dev режиме настройки работают как раньше (из корня проекта)

- **Обновлена видимость полей подачи при переключении команды**
  - Добавлен автоматический вызов `updateMatchData` при изменении `servingTeam`
  - Поля `pointA` и `pointB` теперь обновляют свою видимость в vMix при переключении подачи
  - Работает аналогично обновлению при начислении очков

### Добавлено

- **Инструменты разработчика для production режима**
  - Добавлена горячая клавиша `F12` для открытия/закрытия DevTools
  - Добавлена альтернативная комбинация `Ctrl+Shift+I` (или `Cmd+Shift+I` на macOS)
  - Добавлен пункт меню "Вид" → "Инструменты разработчика"
  - DevTools теперь доступны в production режиме для отладки

- **Автоматическое включение настроек в сборку**
  - Файл `settings.json` из корня проекта автоматически включается в сборку через `extraResources`
  - Настройки из проекта используются при первом запуске приложения
  - Пользовательские изменения настроек сохраняются в пользовательской директории

### Исправлено

- **Исправлена проблема с отображением вкладок стартовых составов в настройках vMix**
  - Добавлена автоматическая проверка и дополнение недостающих инпутов из конфигурации по умолчанию
  - При загрузке настроек автоматически добавляются все недостающие инпуты и их поля
  - Вкладки "Стартовый состав команды А" и "Стартовый состав команды Б" теперь отображаются корректно

- **Исправлена ошибка с двойным объявлением переменной в settingsManager.js**
  - Исправлена ошибка `SyntaxError: Identifier 'needsMigration' has already been declared`
  - Вторая переменная переименована в `needsFieldsMigration` для избежания конфликта имен

- **Исправлена ошибка errorHandler в main.js**
  - Исправлена ошибка `ReferenceError: errorHandler is not defined` при открытии матча
  - Импорт `errorHandler` перенесен в начало файла `main.js` для глобальной доступности
  - Ошибка возникала в IPC handler `match:open-dialog` и других обработчиках

- **Исправлена логика перетаскивания игроков в основном списке**
  - Исправлена проблема с неправильной позицией вставки при перетаскивании вниз
  - Теперь элемент попадает точно на целевую позицию при перетаскивании в обоих направлениях
  - Использована правильная логика расчета индекса вставки: `insertIndex = targetIndex` для обоих случаев

- **Исправлена проблема с реакцией кнопок на активацию инпутов через vMix**
  - Исправлена проблема, когда кнопки в блоке "Управление плашками vMix" не обновляли свое состояние при активации инпутов через сам vMix (вручную)
  - Улучшена функция `updateOverlayStates()` для точной проверки активности инпутов при периодическом опросе vMix API
  - Добавлен механизм определения внешней активации через специальный маркер `'__EXTERNAL__'`
  - Улучшена функция `isOverlayActive()` для автоматического определения активной кнопки при обнаружении внешней активации инпута
  - Добавлена проверка соответствия активного инпута в оверлее с инпутом из конфигурации (сравнение по номерам)
  - Реализована защита от гонки условий при одновременной проверке нескольких кнопок одного инпута
  - Кнопки теперь корректно отражают состояние инпутов в vMix независимо от способа их активации (через приложение или через vMix напрямую)
  - Первая доступная кнопка автоматически становится активной при обнаружении внешней активации инпута

### Добавлено

- **Drag-and-drop для основного списка игроков**
  - Добавлена возможность перетаскивать игроков для изменения порядка в основном списке команды
  - Добавлен специальный символ (три горизонтальные линии) с краю каждой строки для перетаскивания
  - Визуальная обратная связь: строка становится полупрозрачной при перетаскивании, целевая строка подсвечивается зеленым
  - Автоматическое обновление `startingLineupOrder` при изменении порядка игроков в основном списке
  - Порядок игроков в основном списке теперь можно изменять независимо от стартового состава

- **Отправка данных стартовых составов в vMix**
  - Реализована автоматическая отправка данных стартовых составов команд в vMix
  - Функции `updateStartingLineupTeamAInput()` и `updateStartingLineupTeamBInput()` для обновления инпутов стартовых составов
  - Функция `getStartingLineup()` для получения стартового состава с учетом порядка из `startingLineupOrder`
  - Функция `getStartingLineupFieldValue()` для получения значений полей стартового состава
  - Функция `formatStartingLineupData()` для форматирования данных стартового состава
  - Общие поля (заголовок, подзаголовок, логотип, название, город) совпадают с полными составами
  - Данные игроков берутся из компонента "Стартовый состав" со страницы "Управление составами"
  - Поддержка 8 позиций в стартовом составе: 6 основных игроков (индексы 0-5) + 2 либеро (индексы 6-7)
  - Поддержка полей для двух либеро (libero1Number, libero1Name, libero1NumberOnCard, libero2Number, libero2Name, libero2NumberOnCard)
  - Либеро берутся из стартового состава (индексы 6 и 7), а не из всего состава команды
  - Автоматическое обновление стартовых составов при изменении данных матча
  - Кэширование отправленных значений для оптимизации

- **Обновлена конфигурация полей для стартовых составов**
  - Удалены лишние поля player9-player14 из конфигураций startingLineupTeamA и startingLineupTeamB
  - Переименованы поля player7/8 в libero1/2 для стартовых составов (последние 2 позиции теперь предназначены для либеро)
  - Добавлены поля "Номер игрока X на карте" для всех 6 основных игроков (player1NumberOnCard - player6NumberOnCard)
  - Добавлены поля "Номер либеро X на карте" для обоих либеро (libero1NumberOnCard, libero2NumberOnCard)
  - Логика обработки либеро обновлена: теперь они берутся из стартового состава (индексы 6 и 7), а не из всего состава команды

- **Автоматическое дополнение полей из конфигурации по умолчанию**
  - Реализована логика автоматического добавления всех недостающих полей при загрузке настроек
  - При загрузке настроек проверяются все инпуты и все их поля
  - Недостающие поля автоматически добавляются из конфигурации по умолчанию (`vmix-input-configs.js`)
  - Пользовательские настройки (например, кастомные `fieldIdentifier`) сохраняются при дополнении
  - Обновленный конфиг автоматически сохраняется в файл

- **Логика отправки номеров на карте в vMix**
  - Обновлена логика для полей "Номер игрока X на карте" и "Номер либеро X на карте"
  - Если специальный номер на карте не указан, автоматически используется обычный номер игрока/либеро
  - Обеспечивает синхронизацию: по умолчанию номер на карте совпадает с обычным номером

- **Улучшен интерфейс стартового состава**
  - Добавлены подписи "Либеро 1" и "Либеро 2" для пустых прямоугольников в компоненте "Стартовый состав"
  - Ячейки 0-5 подписаны римскими цифрами I-VI для основных игроков
  - Ячейки 6-7 подписаны как "Либеро 1" и "Либеро 2" для либеро

- **Оптимизация отправки команд в vMix**
  - Реализована система отслеживания изменений полей для минимизации обращений к vMix API
  - Кэширование последних отправленных значений для каждого инпута и поля
  - Отправка только измененных полей вместо всех полей при каждом обновлении
  - Параметр `forceUpdate` для принудительного обновления всех полей (используется при создании/открытии матча, сохранении настроек)
  - Автоматический сброс кэша при смене матча, переподключении к vMix и изменении конфигурации инпутов
  - Значительное снижение нагрузки на vMix API и улучшение производительности

- **Автоматическая очистка папки logos**
  - Функция `cleanupLogosDirectory()` для удаления устаревших файлов логотипов
  - Очистка выполняется автоматически при старте приложения, сохранении матча, смене команд и установке матча для мобильного сервера
  - В папке logos остаются только актуальные файлы: `logo_a.png`, `logo_b.png` и `.gitkeep`

- **Функция смены команд местами**

  - Добавлена кнопка "Поменять команды местами" на странице настроек матча
  - При смене команд местами автоматически меняются:
    - Названия команд (teamA ↔ teamB)
    - Цвета команд
    - Логотипы команд (включая файлы `logo_a.png` и `logo_b.png`)
    - Счет в текущей партии (scoreA ↔ scoreB)
    - Подача (A ↔ B)
    - Счет во всех завершенных партиях
    - Статистика команд
  - Функция доступна через IPC handler `match:swap-teams`
  - Перед выполнением запрашивается подтверждение пользователя
  - Автоматическое обновление формы после смены команд

- **Система автосохранения матча**

  - Автосохранение включено по умолчанию
  - Настройка автосохранения сохраняется в глобальных настройках (`settings.json`)
  - Галочка "Автосохранение" в главном окне приложения (слева от кнопки "Сохранить")
  - Галочка "Автосохранение" в меню "Файл" (под пунктом "Сохранить как...")
  - Автоматическое сохранение при изменениях матча с задержкой 2 секунды (debounce)
  - Логика сохранения:
    - При первом сохранении (Ctrl+S) - показывается диалог выбора файла
    - При повторном сохранении - сохраняется в тот же файл
    - При открытии из файла - все изменения сохраняются в этот же файл
    - "Сохранить как..." - всегда показывает диалог для выбора нового имени
  - Автосохранение работает только если файл уже был сохранен ранее
  - IPC handlers: `autosave:get-settings`, `autosave:set-settings`
  - Событие `autosave-settings-changed` для синхронизации UI

- **Разделение инпутов составов на команды A и B**

  - Добавлены отдельные инпуты для составов команд:
    - `rosterTeamA` - Состав команды A (полный)
    - `rosterTeamB` - Состав команды B (полный)
    - `startingLineupTeamA` - Стартовый состав команды A
    - `startingLineupTeamB` - Стартовый состав команды B
  - Каждый инпут состава поддерживает до 14 игроков с полями номер и имя
  - Добавлены кнопки управления новыми инпутами в компоненте `VMixOverlayButtons`
  - Автоматическая миграция старых инпутов `roster` и `startingLineup` в новый формат
  - Функции `getRosterFieldValue()` и `formatRosterData()` для форматирования данных составов
  - Функции `updateRosterTeamAInput()` и `updateRosterTeamBInput()` для передачи данных в vMix
  - Автоматическое обновление инпутов составов при изменении данных матча

- **Поддержка игроков без номера**

  - Разрешено значение `null` для номера игрока
  - Пустое поле для номера игрока теперь допустимо
  - При генерации следующего номера учитываются только игроки с номерами
  - В стартовом составе игроки без номера отображаются как "Без номера {имя}"
  - Пустые номера корректно передаются в vMix как пустые строки

- **Улучшенная идентификация инпутов vMix**

  - Расширен `inputsMap` для хранения полной информации об инпутах (number, key, title, shortTitle, type)
  - Новая функция `findInputInMap()` для поиска инпутов по номеру, ID (key), названию или короткому названию
  - Улучшена функция `isOverlayActive()` для корректного сравнения инпутов на основе данных из vMix API
  - Исправлена проблема с некорректной идентификацией инпутов при сравнении

- **Система глобальных настроек приложения**

  - Создан модуль `settingsManager.js` для управления глобальными настройками
  - Настройки сохраняются в файл `settings.json` в корне проекта
  - Автоматическое создание файла настроек с дефолтными значениями при первом запуске
  - Поддержка миграции настроек при обновлении структуры данных

- **Улучшенная система настроек vMix**

  - Каждый инпут теперь имеет свой собственный оверлей (1-8)
  - Удален общий блок "Выбор оверлея"
  - Добавлены выпадающие списки для выбора оверлея для каждого инпута
  - Настройки vMix сохраняются в глобальный файл настроек
  - Поддержка передачи цветов команд в vMix из настроек матча

- **Полная переработка страницы настроек vMix**

  - Новая структура интерфейса: вертикальные вкладки инпутов слева, панель редактирования справа
  - Каждый инпут настраивается индивидуально с возможностью включения/выключения
  - Поддержка настройки `inputIdentifier` (имя или номер инпута в vMix)
  - Детальная настройка полей для каждого инпута
  - Каждое поле имеет свой `fieldIdentifier` (кастомное имя для обращения к vMix)
  - Поддержка четырех типов полей: "Текст", "Видимость", "Цвет", "Изображение"
  - Возможность включения/выключения каждого поля для экономии ресурсов

- **Система типов полей для vMix инпутов**

  - **Текстовые поля** (`type: "text"`): для передачи текстовых данных (названия команд, счет, имена и т.д.)
  - **Поля видимости** (`type: "visibility"`): для управления видимостью элементов (например, индикатор подачи)
  - **Поля цвета** (`type: "color"`): для изменения цвета элементов (цвет формы команды)
  - **Поля изображений** (`type: "image"`): для установки изображений (логотипы команд) через команду `SetImage`
  - Автоматическая обработка каждого типа полей соответствующими командами vMix API

- **Функции обмена данными с vMix**

  - Метод `updateInputField()` для обновления отдельных полей через команду `SetText`
  - Метод `setColor()` для изменения цвета полей через команду `SetColor`
  - Метод `setTextVisibility()` для управления видимостью полей через `SetTextVisibleOn`/`SetTextVisibleOff`
  - Метод `setImage()` для установки изображений в поля через команду `SetImage`
  - Метод `updateInputFields()` для массового обновления полей разных типов (текст, цвет, видимость, изображения)
  - Автоматическое разделение полей по типам при отправке команд в vMix
  - Функция `formatCurrentScoreData()` для форматирования данных матча в формат vMix полей
  - Функция `formatLineupData()` для форматирования данных заявки с поддержкой логотипов через HTTP URL
  - Автоматическое формирование URL логотипов на основе IP и порта мобильного сервера

- **Синхронизация данных с vMix в реальном времени**

  - Автоматическое обновление инпута текущего счета при изменении данных матча
  - Автоматическое обновление инпута "Заявка" при изменении настроек матча (включая логотипы)
  - Автоматическое сохранение логотипов в файлы при обновлении матча для доступа через HTTP
  - Debounce механизм для оптимизации частоты обновлений
  - Поддержка кнопок управления оверлеями с отслеживанием состояния через vMix API
  - Получение состояния оверлеев из vMix XML для визуальной индикации активных оверлеев
  - Автоматическое разрешение имен инпутов в номера через vMix API

- **Автоматическое восстановление мобильного сервера**

  - Состояние мобильного сервера (включен/выключен) сохраняется в настройках
  - Порт сервера сохраняется в настройках
  - При перезапуске приложения сервер автоматически запускается, если был включен
  - Сохраненная ссылка для мобильного доступа восстанавливается при запуске

- **Улучшенная система управления статистикой**

  - Добавлены кнопки для уменьшения значений статистики (-1)
  - Исправлена проблема множественных инкрементов при клике
  - Улучшенное отображение статистики с подписями
  - Автоматическое сохранение статистики при изменении

- **Улучшения интерфейса настроек vMix**
  - Добавлено отображение типа поля "Изображение" с соответствующим цветовым индикатором
  - Улучшена визуальная индикация типов полей (Текст, Цвет, Видимость, Изображение)

### Изменено

- **Структура инпутов составов**

  - Старые ключи `roster` и `startingLineup` заменены на `rosterTeamA`, `rosterTeamB`, `startingLineupTeamA`, `startingLineupTeamB`
  - Изменен тип поля `teamLogo` с `text` на `image` для всех инпутов составов
  - Добавлены поля для 14 игроков в каждом инпуте состава (player1Number, player1Name, ... player14Number, player14Name)
  - При миграции старых настроек создаются два инпута для каждой команды, для команды B к `inputIdentifier` добавляется суффикс `_B`

- **Идентификация инпутов vMix**

  - Переименована функция `normalizeInputIdentifier()` → `findInputInMap()`
  - Функция теперь использует расширенную карту инпутов вместо строковых преобразований
  - Логика сравнения инпутов основана на данных из vMix API, а не на эвристических преобразованиях
  - Исправлена проблема, когда инпут с именем "Input3" некорректно сравнивался с инпутом по номеру 3

- **Управление составами команд**

  - Номер игрока может быть `null` (без номера) вместо обязательного числа
  - При генерации следующего номера игнорируются игроки без номера
  - Улучшена валидация номера игрока: отрицательные числа преобразуются в `null`
  - Расширена ширина поля ввода номера до 80px и добавлен placeholder "Без номера"

### Изменено

- **Структура настроек vMix**

  - Старая структура: `inputs.lineup = 'Input1'`, общий `overlay: 1`
  - Новая структура: `inputs.lineup = { enabled: true, inputIdentifier: 'Input1', overlay: 1, fields: {...} }`
  - Каждое поле инпута имеет структуру: `{ enabled: true, type: 'text|color|visibility|image', fieldName: '...', fieldIdentifier: '...' }`
  - Автоматическая миграция старых настроек в новый формат
  - Поддержка `fieldIdentifier` для каждого поля (кастомное имя для обращения к vMix)

- **Интерфейс настроек vMix**

  - Полная переработка интерфейса: новый split-panel layout (вкладки слева, редактор справа)
  - Удален блок "Выбор оверлея" с радио-кнопками
  - Добавлены выпадающие списки справа от каждого инпута для выбора оверлея
  - Увеличена ширина выпадающего списка оверлеев (150px) для корректного отображения текста
  - Добавлены компоненты `InputTabsList` и `InputEditPanel` для новой структуры интерфейса
  - Добавлен компонент `FieldsList` для отображения и редактирования полей инпута
  - Каждое поле отображается с чекбоксом включения/выключения и полем для `fieldIdentifier`

- **Логика обработки данных для vMix**

  - Разделение полей по типам при форматировании данных (`fields`, `colorFields`, `visibilityFields`, `imageFields`)
  - Использование разных команд vMix API для разных типов полей (`SetText`, `SetColor`, `SetTextVisibleOn/Off`, `SetImage`)
  - Логика управления видимостью полей типа "visibility" (например, индикатор подачи)
  - Автоматическое получение цветов из настроек матча (`match.teamA.color`, `match.teamB.color`)
  - Тип полей логотипов изменен с "text" на "image" для использования команды `SetImage`
  - Формирование URL логотипов на основе IP и порта мобильного сервера вместо hardcoded значений

- **Страница мобильного доступа**

  - Ссылка генерируется один раз при первом запуске сервера (если нет сохраненной)
  - Сохраненная ссылка автоматически загружается и отображается при перезапуске
  - QR-код автоматически генерируется для сохраненной ссылки

- **Страница "Настройки матча"**

  - Добавлено поле "Заголовок (название турнира)" вместо "Название турнира"
  - Добавлено поле "Подзаголовок (название турнира)"
  - Добавлено поле "Город, страна" перед полем "Место проведения"
  - Поля настроек матча автоматически синхронизируются с инпутом "Заявка" в vMix
  - Дата и время форматируются в формат "ДД.ММ.ГГГГ ЧЧ:ММ" для передачи в vMix

- **Логика работы с логотипами**
  - Логотипы сохраняются в гибридном формате: base64 в JSON + PNG файлы в `logos/`
  - Используются фиксированные имена файлов (`logo_a.png`, `logo_b.png`) для предотвращения накопления мусора
  - Автоматическое перезаписывание файлов при сохранении/загрузке матча

### Исправлено

- **Исправлена критическая ошибка идентификации инпутов vMix**
  - Исправлена функция `normalizeInputIdentifier`, которая некорректно извлекала номер из строк типа "Input3"
  - Теперь идентификация инпутов происходит через vMix API с использованием полной информации об инпутах
  - Исправлена проблема, когда кнопка "Заявка" неправильно активировала кнопку "Состав" из-за ошибок сравнения

- **Исправлена валидация номеров игроков**
  - Отрицательные номера игроков теперь корректно обрабатываются (преобразуются в `null`)
  - Пустые номера игроков теперь допустимы и корректно отображаются в интерфейсе

### Исправлено

- Исправлена проблема множественных инкрементов статистики при клике (теперь инкрементируется ровно на 1)
- Исправлена проблема с сохранением статистики (теперь автоматически сохраняется при изменении)
- Исправлена проблема с отображением сохраненной ссылки после перезапуска приложения
- Исправлена проблема с импортом `settingsManager` в `server.js`
- **Исправлена критическая ошибка передачи цветов в vMix**: теперь используется правильная команда `SetColor` вместо `SetText` для изменения цвета полей в vMix инпутах
- Исправлено соответствие полей в инпуте "Заявка": `venueLine1` теперь содержит место проведения (адрес), `venueLine2` содержит город и страну
- Исправлено сохранение логотипов в файлы: логотипы теперь автоматически сохраняются при обновлении матча через `setCurrentMatch` и `setMobileMatch`, а не только при сохранении матча в файл
- Исправлено формирование URL для команды SetImage: используется правильный формат `/api/?` вместо `/api?` для совместимости с vMix API

### Технические детали

- **Расширение `vmix-client.js`**:
  - Метод `getOverlayState()` теперь заполняет `inputsMap` с полной информацией об инпутах (number, key, title, shortTitle, type)
  - Обновлены комментарии для уточнения назначения `inputsMap`

- **Рефакторинг `useVMix.js`**:
  - Удалена функция `normalizeInputIdentifier()`
  - Добавлена функция `findInputInMap(identifier)` для поиска инпутов по различным идентификаторам
  - Полностью переработана функция `isOverlayActive()` для корректного сравнения инпутов
  - Добавлена функция `getRosterFieldValue()` для извлечения значений полей состава команды
  - Добавлена функция `formatRosterData()` для форматирования данных состава команды
  - Добавлены функции `updateRosterTeamAInput()` и `updateRosterTeamBInput()` для обновления инпутов составов
  - Интегрированы функции обновления составов в debounce механизм

- **Обновление конфигураций инпутов** (`src/main/vmix-input-configs.js`):
  - Переименованы конфигурации `roster` → `rosterTeamA` и `startingLineup` → `startingLineupTeamA`
  - Добавлены конфигурации `rosterTeamB` и `startingLineupTeamB`
  - Изменен тип поля `teamLogo` с `text` на `image` для всех инпутов составов

- **Обновление миграции настроек** (`src/main/settingsManager.js`):
  - Добавлена логика миграции ключей `roster` и `startingLineup` в новые форматы
  - При миграции создаются два инпута для каждой команды с соответствующими `inputIdentifier`
  - Добавлена дополнительная миграция для существующих ключей в новом формате

- **Обновление интерфейса управления составами** (`src/renderer/pages/RosterManagementPage.jsx`):
  - Обновлена функция `handleAddPlayer()` для учета игроков без номера при генерации следующего номера
  - Обновлена функция `handlePlayerChange()` для поддержки `null` в номере игрока
  - Обновлен input для номера игрока с поддержкой пустых значений и улучшенной валидацией
  - Обновлено отображение стартового состава для корректного отображения игроков без номера

- **Документация**:
  - Создан документ `docs/roster-inputs-split-and-improvements.md` с полным описанием изменений
  - Документация включает технические детали, структуру данных и влияние на другие компоненты

### Технические детали

- Создан модуль `src/main/settingsManager.js` для работы с глобальными настройками
- Обновлен `src/main/vmix-config.js` для использования нового менеджера настроек
- Обновлены все IPC handlers для работы с async функциями
- Добавлена поддержка миграции настроек при обновлении структуры
- Файл `settings.json` добавлен в `.gitignore`

- **Реализация функции смены команд местами**:
  - IPC handler `match:swap-teams` в `src/main/main.js`
  - Метод `swapTeams()` в `src/main/preload.js`
  - Кнопка смены команд в `src/renderer/pages/MatchSettingsPage.jsx`
  - Функция корректно обрабатывает все данные команд, включая логотипы
  - Автоматическое сохранение логотипов в правильные файлы (`logo_a.png`, `logo_b.png`)

- **Реализация системы автосохранения**:
  - Переменная `currentMatchFilePath` в `src/main/main.js` для отслеживания пути к файлу
  - Функция `scheduleAutoSave()` с debounce механизмом (2 секунды)
  - Настройка `autoSave.enabled` в `settings.json` (по умолчанию `true`)
  - Методы `getAutoSaveSettings()` и `setAutoSaveSettings()` в `src/main/settingsManager.js`
  - IPC handlers: `autosave:get-settings`, `autosave:set-settings`
  - Событие `autosave-settings-changed` для синхронизации UI
  - Галочка автосохранения в `src/renderer/pages/MatchControlPage.jsx`
  - Галочка автосохранения в меню приложения (`src/main/main.js`)
  - Обновлена логика сохранения: первый раз - диалог, повторно - в тот же файл
  - При открытии матча из файла путь запоминается для последующего автосохранения

- **Переработка страницы настроек vMix** (`src/renderer/pages/VMixSettingsPage.jsx`):

  - Реализован split-panel layout с вкладками инпутов слева и панелью редактирования справа
  - Компонент `InputTabsList` для отображения списка инпутов с чекбоксами включения/выключения
  - Компонент `InputEditPanel` для редактирования настроек выбранного инпута
  - Компонент `FieldsList` для отображения и редактирования полей инпута
  - Поддержка редактирования `inputIdentifier`, `overlay`, `enabled` для каждого инпута
  - Поддержка редактирования `fieldIdentifier`, `enabled` для каждого поля

- **Расширение функционала vMix клиента** (`src/main/vmix-client.js`):

  - Метод `updateInputField()` для обновления текстовых полей через `SetText`
  - Метод `setColor()` для изменения цвета полей через `SetColor`
  - Метод `setTextVisibility()` для управления видимостью через `SetTextVisibleOn`/`SetTextVisibleOff`
  - Метод `setImage()` для установки изображений в поля через `SetImage`
  - Метод `updateInputFields()` для массового обновления с поддержкой четырех типов полей (текст, цвет, видимость, изображения)
  - Метод `getOverlayState()` для получения состояния оверлеев из vMix XML
  - Метод `getInputs()` для получения списка инпутов и их номеров
  - Метод `findInputNumberByIdentifier()` для разрешения имен инпутов в номера
  - Логирование полной строки HTTP запроса для команды `SetImage` для отладки

- **Интеграция vMix с приложением** (`src/renderer/hooks/useVMix.js`):

  - Функция `formatCurrentScoreData()` для форматирования данных матча в формат vMix полей
  - Разделение данных на `fields` (текст), `colorFields` (цвет), `visibilityFields` (видимость)
  - Функция `formatLineupData()` для форматирования данных заявки с разделением на `fields` (текст) и `imageFields` (изображения)
  - Логика управления видимостью полей "Point A" и "Point B" на основе `servingTeam`
  - Автоматическое получение цветов из `match.teamA.color` и `match.teamB.color`
  - Автоматическое формирование URL логотипов на основе IP и порта мобильного сервера
  - Функция `formatDateTime()` для форматирования даты и времени в формат "ДД.ММ.ГГГГ ЧЧ:ММ"
  - Debounce механизм для оптимизации частоты обновлений
  - Функция `updateCurrentScoreInput()` для автоматического обновления инпута текущего счета
  - Функция `updateLineupInput()` для автоматического обновления инпута "Заявка" с поддержкой логотипов
  - Функция `isOverlayActive()` для проверки активности оверлея через vMix API
  - Автоматическое обновление состояния оверлеев для синхронизации UI с vMix
  - Проведен рефакторинг: вынесены константы, вспомогательные функции, улучшена читаемость кода

- **IPC handlers** (`src/main/main.js`):

  - Handler `vmix:update-input-fields` для обновления множественных полей с поддержкой типов (текст, цвет, видимость, изображения)
  - Обновлены handlers для работы с новым форматом настроек инпутов
  - Автоматическое сохранение логотипов в файлы при обновлении матча через `match:set-current` и `mobile:set-match`

- **Конфигурация полей по умолчанию** (`src/main/vmix-input-configs.js`):

  - Предопределенные конфигурации полей для всех инпутов (`currentScore`, `roster`, `lineup`, `referee1`, `referee2`)
  - Настройки по умолчанию для `fieldIdentifier` каждого поля
  - Функция миграции для обновления существующих конфигураций
  - Тип полей `teamALogo` и `teamBLogo` изменен на `image` вместо `text`

- **Документация**:
  - Создан документ `docs/vmix-settings-redesign-plan.md` с полным планом переработки
  - Создан документ `docs/vmix-api-reference.md` со справочником HTTP API vMix
  - Документация включает описание всех типов полей и способов их обработки
  - Примеры использования команд `SetText`, `SetColor`, `SetTextVisibleOn`/`Off`, `SetImage`
  - Описание управления оверлеями через `OverlayInput[N]In`/`Out`/`Toggle`
  - Обновлена документация для типа поля "image" и команды `SetImage`
  - Описание формирования URL логотипов через мобильный HTTP сервер

## [0.1.0] - 2024-XX-XX

### Добавлено

- Базовая структура приложения Electron + React
- Система управления матчами (создание, открытие, сохранение)
- Основной интерфейс управления матчем
- Интеграция с vMix
- Мобильный HTTP сервер
- Мобильный интерфейс для удаленного управления
- Система управления составами команд
- Расширенная статистика
- Управление логотипами команд
