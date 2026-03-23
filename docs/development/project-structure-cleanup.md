# Очистка структуры проекта и удаление устаревших зависимостей

*Последнее обновление: 2026-01-21*

## Обзор

Этот документ описывает комплексную очистку структуры проекта, включающую:
- Удаление Jest и всех связанных зависимостей
- Удаление дублирующихся корневых папок
- Упрощение структуры сборки

## Проблемы, которые были решены

### 1. Дублирование файлов и папок

В корне проекта находились старые папки, которые дублировали структуру `src/`:
- `services/` - дубликат `src/shared/services/`
- `domain/` - дубликат `src/shared/domain/`
- `main/` - дубликат `src/main/`
- `shared/` - дубликат `src/shared/`
- `types/` - дубликат `src/shared/types/`
- `validators/` - дубликат `src/shared/validators/`

Эти папки содержали старые JavaScript файлы, которые больше не использовались после миграции на TypeScript и Vite.

### 2. Устаревшие зависимости

Проект использовал Jest для тестирования, но был полностью мигрирован на Vitest. Jest и все связанные зависимости оставались в `package.json`, занимая место и создавая путаницу.

### 3. Избыточная структура сборки

Папка `build/` использовалась только для хранения иконок для electron-builder, но те же иконки уже находились в `assets/`. Это создавало дублирование и усложняло структуру проекта.

## Выполненные изменения

### 1. Удаление Jest

**Удаленные зависимости:**
- `jest`
- `jest-environment-jsdom`
- `jest-junit`
- `babel-jest`
- `ts-jest`
- `@types/jest`

**Удаленные файлы:**
- `jest.config.js`

**Оставлено:**
- `@testing-library/jest-dom` - библиотека матчеров, работает с Vitest
- `jsdom` - окружение для тестов React компонентов, используется Vitest

**Обновленные файлы:**
- `package.json` - удалены зависимости Jest
- `vite.config.js` - обновлен комментарий (убран упоминание Jest)
- `tests/setup.js` - обновлен комментарий (добавлено уточнение о Vitest)

### 2. Удаление дублирующихся корневых папок

**Удаленные папки:**
- `services/` - содержала `SetService.js` (дубликат `src/shared/services/SetService.ts`)
- `domain/` - содержала `SetDomain.js`, `SetStateMachine.js` (дубликаты `src/shared/domain/*.ts`)
- `main/` - содержала `main/server/api/*.js` (дубликаты `src/main/server/api/*.ts`)
- `shared/` - содержала старые JS файлы (дубликаты `src/shared/**/*.ts`)
- `types/` - содержала `Match.js` (дубликат `src/shared/types/Match.ts`)
- `validators/` - содержала `SetValidator.js` (дубликат `src/shared/validators/SetValidator.ts`)

**Проверка:**
- Все импорты в `src/` указывают на `src/shared/` (относительные пути `../shared/` или `../../shared/`)
- Все импорты в тестах указывают на `src/shared/`
- Импортов из корневых папок не найдено

### 3. Упрощение структуры сборки

**Изменения в конфигурации:**

1. **package.json:**
   - `"buildResources": "assets"` (вместо `"build"`)
   - `"icon": "icon.ico"` (вместо `"build/icon.ico"`)
   - `"installerIcon": "icon.ico"` (вместо `"build/icon.ico"`)
   - `"uninstallerIcon": "icon.ico"` (вместо `"build/icon.ico"`)
   - `"icon": "icon.icns"` для macOS (вместо `"assets/icon.icns"`)
   - `"icon": "icon.png"` для Linux (вместо `"assets/icon.png"`)

2. **scripts/prepare-icons.js:**
   - Убрано копирование в `build/`
   - Иконка копируется только в `assets/`
   - Упрощена логика скрипта

**Удалено:**
- Папка `build/` (больше не нужна)

**Результат:**
- Все ресурсы сборки находятся в `assets/`
- Упрощена структура проекта
- Убрано дублирование иконок

## Структура проекта после изменений

### Корневые папки (только необходимые)

```
vmix-volley-scoreboard/
├── assets/          # Ресурсы для сборки (иконки)
├── dist/            # Собранные файлы (Vite output)
├── docs/            # Документация
├── logos/           # Логотипы команд
├── matches/          # Сохраненные матчи
├── node_modules/    # Зависимости
├── release/         # Финальные сборки (electron-builder output)
├── rosters/         # Составы команд
├── scripts/         # Скрипты сборки
├── src/             # Исходный код
│   ├── main/        # Main process (Electron)
│   ├── renderer/    # Renderer process (React)
│   └── shared/      # Общий код
└── tests/           # Тесты
```

### Удаленные папки

- ❌ `build/` - заменена на использование `assets/`
- ❌ `services/` - дубликат `src/shared/services/`
- ❌ `domain/` - дубликат `src/shared/domain/`
- ❌ `main/` - дубликат `src/main/`
- ❌ `shared/` - дубликат `src/shared/`
- ❌ `types/` - дубликат `src/shared/types/`
- ❌ `validators/` - дубликат `src/shared/validators/`

## Преимущества изменений

1. **Упрощение структуры:**
   - Убрано дублирование файлов и папок
   - Все исходники находятся в `src/`
   - Все ресурсы сборки в `assets/`

2. **Уменьшение размера проекта:**
   - Удалены неиспользуемые зависимости Jest (~50MB)
   - Удалены дублирующиеся файлы

3. **Улучшение поддерживаемости:**
   - Нет путаницы с путями импорта
   - Четкая структура проекта
   - Легче найти нужные файлы

4. **Оптимизация сборки:**
   - Упрощена конфигурация electron-builder
   - Меньше файлов для копирования
   - Быстрее подготовка к сборке

## Проверка после изменений

### Импорты

Все импорты должны указывать на правильные пути:
- ✅ `src/shared/services/SetService.ts` - используется в коде
- ✅ `src/shared/domain/SetDomain.ts` - используется в коде
- ✅ `src/shared/types/Match.ts` - используется в коде
- ✅ `src/shared/validators/SetValidator.ts` - используется в коде

### Тесты

Все тесты должны использовать правильные пути:
- ✅ `tests/unit/services/SetService.test.ts` - импортирует из `src/shared/services/SetService.ts`
- ✅ `tests/unit/domain/SetDomain.test.ts` - импортирует из `src/shared/domain/SetDomain.ts`
- ✅ Все тесты используют Vitest (не Jest)

### Сборка

Сборка должна работать корректно:
- ✅ `npm run prepare:icons` - создает `assets/icon.ico`
- ✅ `npm run build` - собирает проект в `dist/`
- ✅ `npm run build:electron` - создает установщик в `release/`

## Рекомендации

1. **Перед сборкой:**
   - Убедитесь, что `npm run prepare:icons` выполнен
   - Проверьте наличие `assets/icon.ico`

2. **При добавлении новых файлов:**
   - Размещайте их в соответствующих папках `src/`
   - Не создавайте дубликаты в корне проекта

3. **При работе с иконками:**
   - Используйте только `assets/` для ресурсов сборки
   - Не создавайте папку `build/` вручную

## Связанные документы

- [Vitest Migration Guide](./vitest-migration-guide.md) - миграция на Vitest
- [Vite для Main Process](./webpack-rollup-vs-current-approach.md) - рефакторинг сборки
- [TypeScript в Production](./typescript-in-production-explanation.md) - использование TypeScript

## История изменений

- **2026-01-21**: Первая версия документа, описание всех изменений по очистке структуры проекта
