# Архитектура приложения vMix Volley Scoreboard

## Общая архитектура

Приложение построено на базе **Electron** и использует архитектуру с разделением на Main Process и Renderer Process.

```
┌─────────────────────────────────────────────────────────┐
│                   Electron Application                  │
├──────────────────────────┬──────────────────────────────┤
│   Main Process           │   Renderer Process           │
│   (Node.js)              │   (React + Vite)             │
│                          │                              │
│  - main.ts               │  - App.tsx                   │
│  - server.ts             │  - pages/                    │
│  - vmix-client.ts        │  - components/               │
│  - settingsManager.ts    │  - hooks/                    │
│  - fileManager.ts        │  - utils/                    │
│  - logoManager.ts        │                              │
│  - preload.cjs           │                              │
└──────────────────────────┴──────────────────────────────┘
```

## Структура проекта

```
vmix-volley-scoreboard/
├── src/
│   ├── main/                    # Main Process (Node.js)
│   │   ├── main.ts               # Точка входа, управление окнами, IPC handlers
│   │   ├── server.ts             # HTTP сервер для мобильного доступа
│   │   ├── vmix-client.ts        # Клиент для работы с vMix API
│   │   ├── vmix-config.ts       # Конфигурация vMix (обертка над settingsManager)
│   │   ├── vmix-overlay-utils.ts # Утилиты оверлеев vMix (URL логотипов, поиск конфига инпута)
│   │   ├── settingsManager.ts   # Менеджер глобальных настроек
│   │   ├── settingsImportExport.ts # Импорт и экспорт настроек
│   │   ├── fileManager.ts        # Управление файлами матчей
│   │   ├── logoManager.ts        # Управление логотипами команд
│   │   ├── utils/
│   │   │   ├── domUtils.ts
│   │   │   ├── pathUtils.ts
│   │   │   └── settingsValidator.ts
│   │   └── preload.cjs           # Preload скрипт для безопасного IPC (CommonJS)
│   │
│   ├── renderer/                 # Renderer Process (React)
│   │   ├── index.html            # HTML шаблон
│   │   ├── index.tsx             # Точка входа React
│   │   ├── App.tsx               # Главный компонент с маршрутизацией
│   │   ├── pages/                # Страницы приложения (.tsx)
│   │   ├── components/           # Переиспользуемые компоненты (.tsx)
│   │   ├── hooks/                # React хуки (useMatch.ts, useVMix.ts)
│   │   └── utils/               # Утилиты (debounce, colorContrast, imageResize, vmix-field-utils)
│   │
│   └── shared/                   # Общий код (TypeScript)
│       ├── types/Match.ts        # Типы для матча
│       ├── domain/               # Доменная логика
│       ├── services/              # Сервисы (Set, Score, History)
│       ├── validators/           # Валидаторы
│       ├── matchUtils.ts         # Утилиты для работы с матчами
│       ├── getValueByDataMapKey.ts # Извлечение значений по ключам dataMapCatalog (для vMix)
│       ├── volleyballRules.ts    # Правила волейбола (getRules, варианты indoor/beach/snow)
│       ├── volleyballRulesConfig.ts
│       ├── theme/tokens.ts
│       └── errorHandler.ts
│
├── docs/                         # Документация
├── matches/                      # Сохраненные матчи (JSON файлы)
├── logos/                        # Логотипы команд (logo_a_<timestamp>.png, logo_b_<timestamp>.png)
├── settings.json                 # Глобальные настройки (не в git)
├── package.json
├── vite.config.js
└── tsconfig.json
```

## Main Process

### Основные модули

#### `main.ts`
- **Назначение:** Точка входа приложения, управление окнами, IPC handlers
- **Основные функции:**
  - Создание и управление главным окном Electron
  - Обработка IPC запросов от renderer процесса
  - Управление меню приложения
  - Обработка закрытия приложения с проверкой несохраненных изменений
  - Автоматическое восстановление мобильного сервера при запуске
  - Отслеживание пути к файлу текущего матча (`currentMatchFilePath`)
  - Функция `scheduleAutoSave()` для автосохранения с debounce
  - Функция `match:swap-teams` для смены команд местами
  - Функция `clearLogosOnNewMatch()` - очистка папки logos при создании нового матча
    - Использует `logoManager.cleanupLogosDirectory()` для удаления всех старых логотипов
- **IPC Handlers для логотипов:**
  - `logo:save-to-file` - сохранение логотипа в файл при загрузке нового логотипа
    - Параметры: `teamLetter` ('A' или 'B'), `logoBase64` (base64 строка)
    - Очищает папку logos перед сохранением
    - Сохраняет логотип с уникальным именем через `logoManager.processTeamLogoForSave()`
    - Возвращает `{ success, logoPath, logoBase64 }`
  - `logo:delete` - удаление логотипа (очистка файлов)
    - Параметры: `teamLetter` ('A' или 'B')
    - Очищает папку logos от всех файлов логотипов
    - Возвращает `{ success }`
- **Изменения в `match:set-current`:**
  - **ВАЖНО:** НЕ сохраняет логотипы в файлы при обновлении матча
  - Файлы логотипов генерируются только при:
    1. Загрузке нового логотипа (`logo:save-to-file`)
    2. Открытии сохраненного матча (`fileManager.openMatch` → `processTeamLogoForLoad`)
    3. Смене команд местами (`match:swap-teams`)
  - Добавлено логирование для отладки
  - Возвращает обновленный матч из результата
- **Изменения в `match:swap-teams`:**
  - Очистка папки logos ОДИН РАЗ перед сохранением обоих логотипов
  - Сохранение логотипов с новыми уникальными именами

#### `server.ts` - MobileServer
- **Назначение:** HTTP сервер для мобильного доступа
- **Технологии:** Express
- **Основные функции:**
  - Запуск/остановка HTTP сервера
  - Управление сессиями доступа (UUID)
  - API endpoints для мобильного интерфейса:
    - `GET /panel/:sessionId` - HTML страница мобильной панели
    - `GET /api/match/:sessionId` - получение данных матча
    - `POST /api/match/:sessionId/score` - обновление счета
    - `POST /api/match/:sessionId/set` - завершение партии
    - `POST /api/match/:sessionId/serve` - изменение подачи
    - `POST /api/match/:sessionId/undo` - отмена последнего действия
    - `GET /api/logos/check` - проверка доступности логотипов (для отладки)
  - Обслуживание статических файлов (логотипы через `/logos`)
    - **Dev режим:** `logos/` в корне проекта
    - **Production режим:** `userData/logos/` (тот же путь, что и `logoManager.getLogosDir()`)
  - CORS для мобильных устройств
  - Callback механизм для синхронизации изменений матча
  - **Выбор сетевого интерфейса:**
    - `getNetworkInterfaces()` - получение списка всех доступных сетевых интерфейсов
      - Возвращает массив объектов `{ ip, name, interfaceName, isPrivate, isWireless, isVpn }`
      - Фильтрует VPN интерфейсы
      - Сортирует по приоритету: частный IP + Wi-Fi, затем частный IP, затем публичный IP
    - `getLocalIP(selectedIP)` - получение IP адреса для сервера
      - Использует выбранный IP из настроек (`mobile.selectedIP`), если указан
      - Если выбранный IP недоступен, использует автоматическое определение по приоритету
      - Автоматически фильтрует VPN интерфейсы
  - Настройка сохранения выбранного сетевого интерфейса в `mobile.selectedIP`

#### `vmix-client.ts` - VMixClient
- **Назначение:** Клиент для работы с vMix HTTP API
- **Технологии:** axios, xml2js
- **Основные методы:**
  - `testConnection()` - проверка подключения
  - `sendCommand(functionName, params)` - отправка произвольной команды в vMix
  - `updateInputField()` - обновление текстового поля через `SetText`
  - `setColor()` - изменение цвета через `SetColor` (для fill полей)
  - `setTextColour()` - изменение цвета текста через `SetTextColour` (для текстовых полей в GT Titles)
  - `setTextVisibility()` - управление видимостью через `SetTextVisibleOn`/`Off`
  - `setImage()` - установка изображения через `SetImage`
  - `updateInputFields(inputName, fields, colorFields, visibilityFields, imageFields, textColorFields)` - массовое обновление полей разных типов
    - Отправляет отдельные HTTP запросы для каждого поля
    - Порядок отправки: SetText → SetColor → SetTextColour → SetImage → SetTextVisibleOn/Off
    - `textColorFields` - объект с цветами текста для текстовых полей (используется команда `SetTextColour`)
    - Возвращает массив результатов для каждого поля
    - Используется для оптимизированной отправки только измененных полей
  - `showOverlay()` / `hideOverlay()` - управление оверлеями
  - `getOverlayState()` - получение состояния оверлеев из XML
  - `getInputs()` - получение списка инпутов
  - `findInputNumberByIdentifier()` - разрешение имен инпутов в номера

#### `settingsManager.ts`
- **Назначение:** Менеджер глобальных настроек приложения
- **Файл:** `settings.json` в корне проекта
- **Структура настроек:**
  ```json
  {
    "vmix": {
      "host": "localhost",
      "port": 8088,
      "inputs": {
        "currentScore": {
          "enabled": true,
          "inputIdentifier": "Input5",
          "overlay": 1,
          "fields": { ... }
        }
      }
    },
    "mobile": {
      "enabled": false,
      "port": 3000,
      "sessionId": null,
      "selectedIP": null
    },
    "autoSave": {
      "enabled": true
    }
  }
  ```
- **Основные функции:**
  - `loadSettings()` - загрузка настроек с автоматической миграцией
  - `saveSettings()` - сохранение настроек
  - `getVMixSettings()` / `setVMixSettings()` - работа с настройками vMix
  - `getMobileSettings()` / `setMobileSettings()` - работа с настройками мобильного сервера
    - Настройки включают: `enabled`, `port`, `sessionId`, `selectedIP`
    - `selectedIP` - выбранный IP адрес сетевого интерфейса для мобильного сервера (null для автоматического определения)
  - `getAutoSaveSettings()` / `setAutoSaveSettings()` - работа с настройками автосохранения
  - `exportSettingsToFile(filePath)` - экспорт настроек в файл
  - `importSettingsFromFile(filePath)` - импорт настроек из файла

#### `settingsImportExport.ts`
- **Назначение:** Импорт и экспорт настроек приложения
- **Основные функции:**
  - `exportSettings(filePath)` - экспорт всех настроек в JSON файл
    - Валидация настроек перед экспортом
    - Сохранение в читаемом формате (с отступами)
    - Создание директории, если она не существует
  - `importSettings(filePath)` - импорт настроек из JSON файла
    - Валидация импортируемых данных
    - **Merge стратегия:** объединение с существующими настройками (не перезапись)
    - Частичный импорт: можно импортировать только отдельные секции
    - Глубокое объединение полей (fields) в инпутах vMix
    - Обработка невалидных секций с предупреждениями
    - Игнорирование неизвестных секций
  - `mergeSettings(existing, imported)` - объединение настроек
    - Сохраняет существующие настройки, которых нет в импорте
    - Объединяет секции: vmix, mobile, autoSave, autoUpdate
    - Глубокое объединение инпутов и их полей
  - `mergeInputs(existing, imported)` - объединение инпутов с полями
    - Сохраняет существующие поля, которых нет в импорте
    - Обновляет/добавляет импортированные поля
- **Интеграция:**
  - Используется через меню "Файл" → "Экспорт настроек..." / "Импорт настроек..."
  - Доступен через `settingsManager.exportSettingsToFile()` и `settingsManager.importSettingsFromFile()`

#### `utils/settingsValidator.ts`
- **Назначение:** Валидация структуры и типов данных настроек
- **Основные функции:**
  - `validateSettings(settings)` - валидация полной структуры настроек
  - `validateVMixSettings(vmix)` - валидация секции vMix
    - Проверка `host` (непустая строка)
    - Проверка `port` (1-65535)
    - Валидация всех инпутов и их полей
  - `validateVMixInput(inputKey, input)` - валидация отдельного инпута
    - Проверка `enabled` (boolean)
    - Проверка `inputIdentifier` (непустая строка)
    - Проверка `overlay` (число >= 1)
    - Валидация всех полей (fields)
  - `validateInputField(fieldKey, field)` - валидация отдельного поля
    - Проверка `type` (text, image, color, fill, visibility)
    - Проверка `fieldIdentifier` (непустая строка)
    - Проверка `enabled` (boolean)
  - `validateMobileSettings(mobile)` - валидация секции mobile
  - `validateAutoSaveSettings(autoSave)` - валидация секции autoSave
  - `validateAutoUpdateSettings(autoUpdate)` - валидация секции autoUpdate
- **Типы:**
  - `ValidationResult` - результат валидации с флагом `valid` и списком `errors`
  - `Settings`, `VMixSettings`, `MobileSettings`, `AutoSaveSettings`, `AutoUpdateSettings` - интерфейсы для типизации
  - `FIELD_TYPES` - константы типов полей
  - `VALID_INPUT_KEYS` - список валидных имен инпутов

#### `fileManager.ts`
- **Назначение:** Управление файлами матчей
- **Основные функции:**
  - `createMatch()` - создание нового матча
  - `openMatch(filePath)` - открытие матча из файла
    - Проверяет наличие логотипов в исходном JSON **до** обработки
    - Если в открытом проекте нет логотипов, удаляет все файлы `logo_*.png` от предыдущего проекта через `cleanupLogosDirectory()`
    - Это предотвращает использование старых файлов при открытии проекта без логотипов
  - `saveMatch()` - сохранение матча (автоматическое определение пути)
  - `saveMatchDialog()` - сохранение матча через диалог
  - `openMatchDialog()` - открытие матча через диалог
- **Формат файлов:** JSON в папке `matches/`

#### `logoManager.ts`
- **Назначение:** Управление логотипами команд
- **Основные функции:**
  - `getLogosDir()` - получение пути к папке logos в зависимости от режима
    - **Dev режим:** `logos/` в корне проекта
    - **Production режим:** `userData/logos/` (доступно для записи, вместо read-only `extraResources`)
    - Использует `app.getPath('userData')` в production для корректной работы с правами доступа
  - `processTeamLogoForSave(team, teamLetter)` - сохранение логотипа в файл PNG
    - Проверяет `logo` и `logoBase64` для определения источника логотипа
    - Конвертация base64 в PNG файлы
    - **ВАЖНО:** Сохранение в файлы с уникальными именами: `logo_a_<timestamp>.png` или `logo_b_<timestamp>.png`
    - Формат имени: `logo_<team>_<timestamp>.png` (например, `logo_a_1703123456789.png`)
    - Цель уникальных имен: обход кэширования vMix при обновлении логотипов
    - Если логотипа нет, удаляет файл и возвращает команду с `undefined` для всех полей логотипов
    - Возвращает объект команды с `logoPath` (с уникальным именем) и `logoBase64` (или `undefined`, если логотипа нет)
    - **ВАЖНО:** Очистка папки должна вызываться ОДИН РАЗ перед сохранением обоих логотипов
  - `processTeamLogoForLoad(team, teamLetter)` - загрузка логотипа из файла или base64
    - Приоритет 1: base64 из JSON (`logoBase64` - сохраняет файл с новым уникальным именем для синхронизации)
    - Приоритет 2: старый формат `logo` (если это base64) - сохраняет файл с новым уникальным именем
    - Приоритет 3: загрузка из файла по `logoPath` (только если в JSON есть `logoPath`)
    - Если в JSON нет логотипов, возвращает команду с явно установленными `undefined` для всех полей логотипов
    - Это обеспечивает корректное отображение отсутствия логотипов в UI
    - **ВАЖНО:** При загрузке создается новый файл с уникальным именем, обновляется `logoPath` в возвращаемом объекте
  - `ensureLogosDir()` - создание папки logos и миграция из extraResources
    - Создает папку `userData/logos/` в production режиме
    - Выполняет миграцию логотипов из `extraResources/logos/` в `userData/logos/` при первом запуске
    - Вызывается автоматически при старте приложения и сохранении логотипов
  - `migrateLogosFromExtraResources()` - миграция логотипов из extraResources в userData
    - Копирует `logo_a.png` и `logo_b.png` из read-only `extraResources` в writable `userData`
    - Выполняется только один раз при первом запуске в production
    - Пропускается, если файлы уже существуют в userData
  - `cleanupLogosDirectory()` - очистка папки logos от устаревших файлов
    - Удаляет все файлы `logo_*.png` (включая старые файлы с timestamp)
    - Сохраняет только `.gitkeep`
    - Вызывается автоматически при:
      - Старте приложения
      - Сохранении матча
      - Смене команд местами (ОДИН РАЗ перед сохранением обоих логотипов)
      - Установке матча для мобильного сервера
      - Загрузке нового логотипа (`logo:save-to-file`)
    - Безопасная обработка ошибок (не прерывает выполнение)
  - `saveLogoToFile(base64String, team)` - сохранение base64 в PNG файл
    - Генерирует уникальное имя файла с timestamp: `${prefix}_${timestamp}.png`
    - Проверяет существование файла перед возвратом (`fs.access`)
    - Возвращает относительный путь: `logos/logo_a_<timestamp>.png`
  - `loadLogoFromFile(logoPath)` - загрузка файла и конвертация в base64
  - `getLogoHttpUrl(logoPath, port)` - формирование HTTP URL для логотипа
    - Удаляет префикс `logos/` из пути
    - Формирует URL: `http://localhost:${port}/${fileName}`
- **Особенности:**
  - **Система уникальных имен файлов:** Каждое сохранение логотипа создает новый файл с уникальным именем (timestamp)
    - Решает проблему кэширования логотипов в vMix
    - Гарантирует обновление логотипов в vMix при каждом изменении
  - В production логотипы хранятся в `userData/logos/` для обеспечения возможности записи
  - Автоматическая миграция из `extraResources` в `userData` при первом запуске
  - Поддержка смены логотипов при смене команд местами
  - Автоматическая очистка устаревших файлов для предотвращения накопления мусора
  - **Формат logoPath в JSON:** `logos/logo_a_<timestamp>.png` (вместо фиксированного `logos/logo_a.png`)

#### Конфигурация полей vMix (vmix-config.ts)
- **Назначение:** Конфигурации полей по умолчанию для инпутов vMix
- **Основные функции:**
  - `getDefaultFieldsForInput()` - получение полей по умолчанию для инпута
  - `migrateInputToNewFormat()` - миграция старых настроек в новый формат

#### `preload.cjs`
- **Назначение:** Preload скрипт для безопасного IPC
- **Функциональность:**
  - Предоставляет `window.electronAPI` для renderer процесса
  - Безопасная обертка над IPC вызовами
  - Context isolation для безопасности

## Renderer Process

### Утилиты

#### `colorContrast.ts`
- **Назначение:** Утилиты для работы с контрастностью цветов
- **Основные функции:**
  - `getRelativeLuminance(hex)` - вычисляет относительную яркость цвета по формуле WCAG 2.1
  - `getContrastTextColor(backgroundColor)` - определяет оптимальный цвет текста (черный или белый) для заданного фона
  - `getContrastTextColorSimple(backgroundColor)` - упрощенная версия для быстрого определения
  - `hexToRgb(hex)` - конвертирует hex цвет в RGB значения
  - `sRGBToLinear(value)` - конвертирует sRGB значение в линейное пространство
- **Использование:**
  - Автоматическое определение цвета текста на цветном фоне для обеспечения читаемости
  - Используется на страницах "Управление матчем" и "Управление составами" для адаптации цвета текста названий команд к цвету фона
  - Используется для автоматической установки контрастного цвета текста для полей номеров либеро в стартовых составах
  - Решает проблему нечитаемого текста при белой или черной форме игроков

### Структура React приложения

#### Маршрутизация (`App.tsx`)
- Использует React Router DOM v7
- Маршруты:
  - `/` - WelcomePage
  - `/match` - MatchControlPage
  - `/match/settings` - MatchSettingsPage
  - `/match/roster` - RosterManagementPage
  - `/vmix/settings` - VMixSettingsPage
  - `/mobile/access` - MobileAccessPage
  - `/about` - AboutPage

#### React Hooks

##### `useMatch.ts`
- **Назначение:** Логика управления матчем
- **Основные функции:**
  - `changeScore()` - изменение счета
  - `changeServingTeam()` - изменение подачи
  - `finishSet()` - завершение партии
  - `changeStatistics()` - изменение статистики
  - `toggleStatistics()` - включение/выключение статистики
  - `undoLastAction()` - отмена последнего действия
  - `isSetballNow()` / `setballTeam()` - определение сетбола
  - `isMatchballNow()` / `matchballTeam()` - определение матчбола
  - `canFinish()` - проверка возможности завершения партии
- **Автосохранение:**
  - Автоматическое сохранение при изменениях матча через `match:set-current`
  - Debounce механизм (2 секунды) для оптимизации частоты сохранений
  - Работает только если файл уже был сохранен ранее

##### `useVMix.ts`
- **Назначение:** Интеграция с vMix
- **Основные функции:**
  - `updateMatchData(match, forceUpdate)` - обновление данных матча в vMix (debounced, с поддержкой принудительного обновления)
  - `showOverlay(inputKey, buttonKey)` / `hideOverlay(inputKey)` - управление оверлеями
  - `isOverlayActive(inputKey, buttonKey)` - проверка активности оверлея с поддержкой отслеживания активной кнопки
  - `resetImageFieldsCache()` - сброс кэша логотипов для принудительного обновления
  - `updateCoachData()`, `updateReferee1Data()`, `updateReferee2ShowData()`, `updateReferee2Data()` - обновление данных для специальных плашек
  - Автоматическое обновление инпутов при изменении матча
  - **Оптимизация отправки команд:**
    - Кэширование последних отправленных значений для каждого инпута
    - Отправка только измененных полей (фильтрация по текстовым полям, цветам, видимости, изображениям)
    - Автоматический сброс кэша при смене матча, переподключении к vMix, изменении конфигурации
    - Параметр `forceUpdate` для исключительных случаев (создание/открытие матча, сохранение настроек)
  - **Отслеживание состояния оверлеев и активных кнопок:**
    - Периодический опрос состояния оверлеев из vMix API каждые 2 секунды (`OVERLAY_POLL_INTERVAL`)
    - Использование `activeButtonRef` (useRef) для отслеживания активной кнопки каждого инпута
    - Механизм определения внешней активации через маркер `'__EXTERNAL__'` для инпутов, активированных через vMix напрямую
    - Автоматическое определение активной кнопки при обнаружении внешней активации инпута
    - Защита от гонки условий при одновременной проверке нескольких кнопок через двойную проверку (double-check)
    - Точная проверка активности инпутов через сравнение номеров инпутов из `inputsMap`
  - Форматирование данных для vMix:
    - `formatCurrentScoreData()` - форматирование текущего счета
    - `formatLineupData(match, forceUpdate)` - форматирование заявки
    - `formatRosterData(match, teamKey, forceUpdate)` - форматирование состава
    - `formatStartingLineupData(match, teamKey, forceUpdate)` - форматирование стартового состава
      - Обработка текстовых полей либеро (text тип): номер, имя, номер на карте
        - **ВАЖНО**: Всегда отправляются значения в vMix, даже если либеро не указан (пустые строки для очистки)
        - Это необходимо для очистки вывода в vMix при удалении либеро из состава
      - Обработка полей подложек либеро (fill тип): установка цвета подложки на основе `liberoColor` или `color` команды
        - Если конкретный либеро указан (например, Либеро 1 для поля `libero1Background`): устанавливается цвет из настроек
        - Если конкретный либеро не указан: устанавливается прозрачный цвет `#00000000`
        - Каждое поле подложки проверяет свой конкретный либеро
      - Обработка полей номеров либеро (text тип): автоматическая установка контрастного цвета текста
        - Используется функция `getContrastTextColor()` для расчета оптимального цвета (черный или белый)
        - Цвет текста определяется на основе цвета подложки либеро из настроек матча
        - Если конкретный либеро указан: устанавливается контрастный цвет для его номеров
        - Если конкретный либеро не указан: цвет текста не устанавливается (остается по умолчанию)
        - Работает для полей номеров: `Libero1Number.Text`, `Libero1NumberOnCard.Text`, `Libero2Number.Text`, `Libero2NumberOnCard.Text`
        - Используется команда `SetTextColour` в vMix API для установки цвета текста в GT Titles
  - **Обработка логотипов с уникальными именами:**
    - `getFieldValue()` для `TEAM_A_LOGO` и `TEAM_B_LOGO`:
      - Использует `logoPath` из матча (с уникальным именем, например `logos/logo_a_1703123456789.png`)
      - Извлекает имя файла из `logoPath` (удаляет префикс `logos/`)
      - Формирует URL с уникальным именем файла: `http://[IP]:[port]/logo_a_1703123456789.png`
      - Fallback на фиксированное имя (`logo_a.png`) для обратной совместимости со старыми матчами
    - `getRosterFieldValue()` для `teamLogo` в составах команд:
      - Аналогичная логика с использованием `logoPath` из команды
      - Логирование для отладки
    - `getStartingLineupFieldValue()` для `teamLogo` в стартовых составах:
      - Аналогичная логика с использованием `logoPath` из команды

### Компоненты

#### `Layout.tsx`
- Общий layout для всех страниц
- Навигация между страницами

#### `ScoreDisplay.tsx`
- Отображение текущего счета матча

#### `SetsDisplay.tsx`
- Отображение счета по партиям

#### `ScoreButtons.tsx`
- Кнопки управления счетом (+1, -1 для каждой команды)

#### `ServeControl.tsx`
- Управление подачей (отображение и ручная коррекция)

#### `StatusIndicators.tsx`
- Индикаторы сетбола и матчбола

#### `VMixOverlayButtons.tsx`
- Кнопки управления оверлеями vMix
- State-dependent кнопки с синхронизацией состояния

## Коммуникация между процессами

### IPC (Inter-Process Communication)

**Main Process → Renderer Process:**
- `navigate` - навигация на страницу
- `load-match` - загрузка матча
- `refresh-vmix` - обновление vMix
- `match-saved` - уведомление о сохранении матча

**Renderer Process → Main Process (через `window.electronAPI`):**
- `match:create` - создание матча
  - Вызывает `clearLogosOnNewMatch()` → `logoManager.cleanupLogosDirectory()` для удаления всех старых логотипов
  - Это обеспечивает, что при создании нового матча не остаются логотипы от предыдущего проекта
- `match:open-dialog` - открытие матча
- `match:save` - сохранение матча (первый раз - диалог, повторно - в тот же файл)
- `match:save-dialog` - сохранение матча как...
- `match:set-current` - установка текущего матча
  - **ВАЖНО:** НЕ сохраняет логотипы в файлы (только обновляет матч в памяти)
  - Возвращает обновленный матч из результата
- `match:swap-teams` - смена команд местами
  - Очищает папку logos ОДИН РАЗ перед сохранением обоих логотипов
  - Сохраняет логотипы с новыми уникальными именами
- `logo:save-to-file` - сохранение логотипа в файл при загрузке нового логотипа
  - Параметры: `teamLetter` ('A' или 'B'), `logoBase64` (base64 строка)
  - Очищает папку logos перед сохранением
  - Сохраняет логотип с уникальным именем
  - Возвращает `{ success, logoPath, logoBase64 }`
- `logo:delete` - удаление логотипа (очистка файлов)
  - Параметры: `teamLetter` ('A' или 'B')
  - Очищает папку logos от всех файлов логотипов
  - Возвращает `{ success }`
- `autosave:get-settings` - получение настроек автосохранения
- `autosave:set-settings` - установка настроек автосохранения
- `vmix:get-config` - получение настроек vMix
- `vmix:set-config` - сохранение настроек vMix
- `vmix:test-connection` - тест подключения к vMix
- `vmix:update-input-fields` - обновление полей инпута
- `vmix:show-overlay` / `vmix:hide-overlay` - управление оверлеями
- `vmix:get-overlay-state` - получение состояния оверлеев
- `mobile:start-server` / `mobile:stop-server` - управление мобильным сервером
- `mobile:get-server-info` - получение информации о сервере
- `mobile:generate-session` - генерация сессии
- `mobile:get-saved-session` - получение сохраненной сессии
- `mobile:set-match` - установка матча для мобильного сервера
- `onAutoSaveSettingsChanged` - событие изменения настроек автосохранения

## Потоки данных

### Обновление матча → vMix (оптимизированное)

```
MatchControlPage (useMatch)
  ↓ изменение матча
useVMix (updateMatchData(match, forceUpdate))
  ↓
  ├─ Если forceUpdate = false (обычное изменение):
  │  ├─ formatCurrentScoreData() → сравнивается с кэшем → фильтруются измененные поля
  │  ├─ formatLineupData() → сравнивается с кэшем → фильтруются измененные поля
  │  ├─ formatRosterData() → сравнивается с кэшем → фильтруются измененные поля
  │  └─ Отправляются ТОЛЬКО измененные поля
  │
  └─ Если forceUpdate = true (принудительное обновление):
     ├─ Отправляются ВСЕ поля независимо от кэша
     ├─ Для логотипов используются уникальные имена файлов: logo_a_<timestamp>.png
     └─ Кэш обновляется после успешной отправки
  ↓ debounce (300ms)
window.electronAPI.updateInputFields
  ↓ IPC
main.ts (vmix:update-input-fields handler)
  ↓
vmix-client.ts (updateInputFields)
  ↓ HTTP GET (только для измененных полей или всех при forceUpdate)
vMix API
```

**Механизм оптимизации:**
- **Кэширование**: Хранятся последние отправленные значения для каждого инпута (currentScore, lineup, rosterTeamA, rosterTeamB)
- **Сравнение значений**: Новые значения сравниваются со старыми через функции `filterChangedFields()`, `filterChangedColorFields()`, `filterChangedVisibilityFields()`, `filterChangedImageFields()`
- **Цвета текста**: `textColorFields` всегда отправляются (не кэшируются), так как они управляют визуальным отображением
- **Фильтрация**: Отправляются только поля, значения которых изменились
- **Принудительное обновление**: При `forceUpdate=true` (создание/открытие матча, сохранение настроек/составов, смена команд, F5) отправляются все поля, **включая пустые**
- **Очистка данных в vMix**: При `forceUpdate=true` пустые поля отправляются как пустые строки `""` для очистки данных в vMix при открытии пустого проекта
- **Проверка hasFields**: При `forceUpdate=true` проверка `hasFields` не блокирует отправку, даже если все поля пустые
- **Сброс кэша**: Автоматически при смене матча (по `matchId`), переподключении к vMix, изменении конфигурации инпутов
- **Логотипы**: При `forceUpdate=true` используются уникальные имена файлов для гарантированного обновления: `logo_a_<timestamp>.png`

**Исключения (всегда используется forceUpdate=true):**
- Создание нового матча
- Открытие матча из файла
- Сохранение настроек матча
- Сохранение списков команд
- Смена команд местами
- Ручное обновление через F5 (меню "Вид" → "Обновить данные в vMix")

### Мобильный доступ → Main Process

```
Mobile Device (Browser)
  ↓ HTTP POST /api/match/:sessionId/score
server.ts (MobileServer)
  ↓ callback
main.ts (onMatchUpdate callback)
  ↓ IPC send
Renderer Process (load-match event)
  ↓
MatchControlPage (обновление матча)
```

### Сохранение матча

```
MatchControlPage
  ↓ Ctrl+S или кнопка
window.electronAPI.saveMatch
  ↓ IPC
main.ts (match:save handler)
  ↓ проверка currentMatchFilePath
  ├─ Если файл существует → fileManager.saveMatch(match, filePath)
  └─ Если файла нет → fileManager.saveMatchDialog(match)
  ↓
fileManager.ts (saveMatch)
  ↓
logoManager.ts (processTeamLogoForSave) - сохранение логотипов в файлы с уникальными именами
  ↓
logoManager.ts (cleanupLogosDirectory) - очистка устаревших файлов
  ↓
File System (matches/*.json, logos/logo_a_<timestamp>.png, logos/logo_b_<timestamp>.png)
```

### Автосохранение матча

```
MatchControlPage (useMatch)
  ↓ изменение матча
match:set-current (IPC)
  ↓
main.ts (scheduleAutoSave)
  ↓ проверка автосохранения и currentMatchFilePath
  ↓ debounce (2 секунды)
  ↓
fileManager.saveMatch(match, currentMatchFilePath)
  ↓
logoManager.ts (processTeamLogoForSave) - сохранение логотипов с уникальными именами
  ↓
logoManager.ts (cleanupLogosDirectory) - очистка устаревших файлов
  ↓
File System (matches/*.json, logos/logo_a_<timestamp>.png, logos/logo_b_<timestamp>.png)
```

### Смена команд местами

```
MatchSettingsPage
  ↓ кнопка "Поменять команды местами"
window.electronAPI.swapTeams(match)
  ↓ IPC
main.ts (match:swap-teams handler)
  ↓
  ├─ Меняем команды местами (teamA ↔ teamB)
  ├─ Меняем счет (scoreA ↔ scoreB)
  ├─ Инвертируем подачу (A ↔ B)
  ├─ Меняем счет в партиях
  ├─ Меняем статистику
  ├─ cleanupLogosDirectory() - очистка устаревших файлов (ОДИН РАЗ перед сохранением обоих)
  ├─ Сохраняем логотипы в файлы с новыми уникальными именами (logo_a_<timestamp>.png, logo_b_<timestamp>.png)
  └─ Обновляем объекты команд с новыми logoPath
  ↓
Возврат обновленного матча
  ↓
MatchSettingsPage (обновление формы и UI)
  ↓
useVMix.resetImageFieldsCache() - сброс кэша логотипов
  ↓
useVMix.updateMatchData(swappedMatch, true) - принудительное обновление всех данных
  ↓
Форматирование данных с уникальными именами файлов: logo_a_<timestamp>.png
  ↓
Отправка всех полей в vMix (включая обновленные логотипы с уникальными именами)
```

## Хранение данных

### Матчи
- **Формат:** JSON файлы
- **Расположение:** `matches/` (создается автоматически)
- **Структура:** См. `src/shared/types/Match.ts`
- **Поле `variant`:** Тип игры — `'indoor' | 'beach' | 'snow'` (зал, пляж, снежный). Определяет, какие правила применяются к матчу (количество партий, очки для победы, решающая партия). По умолчанию `'indoor'`.
- **Структура команды (Team):**
  - `name: string` - название команды
  - `color: string` - цвет формы игроков (hex формат, например `#3498db`)
  - `liberoColor?: string` - цвет формы либеро (hex формат, опционально)
  - `logo?: string` - логотип команды (base64 или путь к файлу)
  - `logoPath?: string` - путь к файлу логотипа
  - `logoBase64?: string` - base64 данные логотипа
  - `coach?: string` - тренер команды
  - `roster?: Player[]` - состав команды
  - `startingLineupOrder?: number[]` - порядок игроков в стартовом составе

### Настройки
- **Формат:** JSON файл
- **Расположение:** `settings.json` (в корне проекта, не в git)
- **Структура:** См. `settingsManager.ts`

### Логотипы
- **Формат:** PNG файлы
- **Расположение:**
  - **Dev режим:** `logos/` в корне проекта
  - **Production режим:** `userData/logos/` (например, `%APPDATA%/VolleyScore Master/logos/` на Windows)
  - **Причина:** В production `extraResources` доступна только для чтения, поэтому логотипы хранятся в `userData` для возможности записи
- **Имена файлов:** **Система уникальных имен с timestamp**
  - Формат: `logo_a_<timestamp>.png` или `logo_b_<timestamp>.png`
  - Пример: `logo_a_1703123456789.png`, `logo_b_1703123456789.png`
  - **Цель:** Обход кэширования vMix при обновлении логотипов
  - Каждое сохранение логотипа создает новый файл с уникальным именем
  - Старые файлы автоматически удаляются через `cleanupLogosDirectory()`
- **Миграция:** При первом запуске в production логотипы автоматически копируются из `extraResources/logos/` в `userData/logos/`
- **Доступ:** Через HTTP сервер по URL `http://[выбранный_IP]:[порт]/logo_a_<timestamp>.png`
  - Имя файла извлекается из `logoPath` (удаляется префикс `logos/`)
- **Передача в vMix:** URL логотипов формируется с учетом выбранного сетевого интерфейса мобильного сервера и уникального имени файла
- **Хранение в JSON:** Логотипы сохраняются в формате `{ logoPath: "logos/logo_a_1703123456789.png", logoBase64: "data:image/png;base64,..." }`
  - `logoPath` - относительный путь с уникальным именем файла для HTTP доступа
  - `logoBase64` - base64 данные для портативности и восстановления файла
- **Когда создаются файлы логотипов:**
  1. При загрузке нового логотипа (`logo:save-to-file`)
  2. При открытии сохраненного матча (`fileManager.openMatch` → `processTeamLogoForLoad`)
  3. При смене команд местами (`match:swap-teams`)
- **Очистка старых файлов:**
  - Автоматически при старте приложения
  - При сохранении матча
  - При смене команд местами (ОДИН РАЗ перед сохранением обоих логотипов)
  - При загрузке нового логотипа
  - Удаляются все файлы `logo_*.png`, сохраняется только `.gitkeep`

## Безопасность

### Context Isolation
- Renderer процесс изолирован от Node.js API
- Доступ к Node.js только через IPC через `preload.cjs`

### Мобильный доступ
- Уникальные сессии (UUID)
- Валидация сессий при каждом запросе
- Доступ только в локальной сети

## Технологии и зависимости

### Основные зависимости
- **electron** (^39.2.7) - фреймворк
- **react** (^19.2.3) - UI библиотека
- **react-dom** (^19.2.3) - рендеринг React
- **react-router-dom** (^7.11.0) - маршрутизация
- **vite** (^7.3.0) - сборщик и dev-сервер
- **express** (^5.2.1) - HTTP сервер
- **axios** (^1.13.2) - HTTP клиент
- **xml2js** (^0.6.2) - парсинг XML
- **qrcode** (^1.5.4) - генерация QR-кодов
- **uuid** (^13.0.0) - генерация UUID
- **electron-store** (^11.0.2) - хранение настроек (используется через кастомный менеджер)

### Dev зависимости
- **@vitejs/plugin-react** (^5.1.2) - плагин React для Vite
- **typescript** (^5.9.3) - TypeScript (для типов)
- **electron-builder** (^26.0.12) - сборка Electron приложения
- **concurrently** (^9.2.1) - параллельный запуск команд
- **wait-on** (^9.0.3) - ожидание готовности сервера

## Сборка и разработка

### Режим разработки
```bash
npm run dev
```
- Запускает Vite dev server (порт 5173 или следующий свободный)
- Запускает Electron приложение
- Автоматически находит правильный порт Vite

### Сборка
```bash
npm run build        # Сборка React приложения
npm run build:electron # Сборка Electron приложения
```

### Структура сборки
- React приложение собирается в `dist/`
- Electron использует `dist/` для production сборки

## Расширяемость

### Добавление нового инпута vMix
1. Добавить конфигурацию полей в `vmix-config.ts`
2. Добавить ключ инпута в `settingsManager.ts` (getDefaultSettings)
3. Добавить label в `VMixSettingsPage.tsx` (inputLabels)
4. Добавить форматирование данных в `useVMix.ts` (если нужно)

### Добавление новой страницы
1. Создать компонент в `src/renderer/pages/`
2. Добавить маршрут в `App.tsx`
3. Добавить пункт меню в `main.ts` (если нужно)

### Добавление нового типа поля
1. Добавить тип в `vmix-config.ts`
2. Добавить обработку в `vmix-client.ts` (новый метод или расширение существующего)
3. Добавить форматирование в `useVMix.ts`
4. Обновить UI в `VMixSettingsPage.tsx` (визуальный индикатор типа)
