# Пошаговая инструкция по миграции на Vitest

*Последнее обновление: 2026-01-21*

## Обзор

Это руководство описывает пошаговый процесс миграции проекта с Jest на Vitest. Миграция разбита на фазы для безопасного и постепенного перехода.

**Ориентировочное время**: 1-2 дня работы

---

## Фаза 0: Подготовка

### Шаг 0.1: Создание резервной копии

```bash
# Создайте ветку для миграции
git checkout -b feature/vitest-migration

# Убедитесь, что все тесты проходят на Jest
npm test
```

**Чек-лист**:
- [ ] Создана ветка для миграции
- [ ] Все существующие тесты проходят
- [ ] Создан коммит с текущим состоянием

---

## Фаза 1: Установка и базовая настройка

### Шаг 1.1: Установка зависимостей

```bash
# Установите Vitest и необходимые пакеты
npm install --save-dev vitest @vitest/ui @vitest/coverage-v8

# Опционально: для UI интерфейса
npm install --save-dev @vitest/ui
```

**Что устанавливается**:
- `vitest` - основной тестовый фреймворк
- `@vitest/ui` - веб-интерфейс для просмотра тестов (опционально)
- `@vitest/coverage-v8` - провайдер coverage (v8 быстрее чем istanbul)

**Чек-лист**:
- [ ] Vitest установлен
- [ ] Coverage провайдер установлен
- [ ] UI установлен (опционально)

---

### Шаг 1.2: Настройка vite.config.js

Откройте `vite.config.js` и добавьте конфигурацию для тестов:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// ... существующий код ...

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    copyFaviconPlugin(),
  ],
  
  // ... существующие настройки build, resolve, server ...
  
  // Добавьте секцию test для Vitest
  test: {
    // Глобальные переменные (describe, it, expect доступны без импорта)
    globals: true,
    
    // Окружение для тестов (jsdom для React компонентов)
    environment: 'jsdom',
    
    // Файл настройки, который выполняется перед каждым тестом
    setupFiles: ['./tests/setup.js'],
    
    // Паттерны для поиска тестовых файлов
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'release'],
    
    // Настройки coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/__tests__/**',
        'src/renderer/index.jsx',
        'src/main/main.js',
      ],
      // Пороги покрытия (можно скопировать из jest.config.js)
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50,
        },
        'src/shared/volleyballRules.js': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/shared/matchUtils.js': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    
    // Таймаут для тестов (в миллисекундах)
    testTimeout: 10000,
    
    // Настройки для моков
    mockReset: true,
    restoreMocks: true,
  },
});
```

**Важно**: 
- Vitest использует тот же `vite.config.js`, что и сборка
- Все настройки `resolve.alias` автоматически применяются к тестам
- TypeScript поддержка работает из коробки

**Чек-лист**:
- [ ] Добавлена секция `test` в `vite.config.js`
- [ ] Настроен `environment: 'jsdom'`
- [ ] Указан `setupFiles`
- [ ] Настроен coverage

---

### Шаг 1.3: Обновление tests/setup.js

Замените Jest импорты на Vitest:

**Было (Jest)**:
```javascript
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

jest.setTimeout(10000);
```

**Стало (Vitest)**:
```javascript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// В Vitest таймаут настраивается в vite.config.js
// vi.setConfig({ testTimeout: 10000 }) - если нужно переопределить

// Замените jest.fn() на vi.fn()
global.electronAPI = global.electronAPI || {
  getVersion: vi.fn(),
  createMatch: vi.fn(),
  // ... остальные методы
};

// Замените jest.fn() в window объекте
global.window = global.window || {
  electronAPI: global.electronAPI,
  location: {
    hostname: 'localhost',
  },
  history: {
    replaceState: vi.fn(),
  },
};

// Замените jest.fn() в document
if (typeof document === 'undefined') {
  global.document = {
    createElement: vi.fn(() => ({
      textContent: '',
      innerHTML: '',
      style: {},
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      firstChild: null,
    })),
    getElementById: vi.fn(),
  };
}
```

**Чек-лист**:
- [ ] Заменены импорты `@jest/globals` на `vitest`
- [ ] Заменены все `jest.fn()` на `vi.fn()`
- [ ] Удален `jest.setTimeout()` (настраивается в vite.config.js)

---

### Шаг 1.4: Обновление package.json скриптов

Замените Jest команды на Vitest:

**Было (Jest)**:
```json
{
  "scripts": {
    "test": "cross-env NODE_OPTIONS=--experimental-vm-modules jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:security": "jest tests/security",
    "test:json": "jest --json --outputFile=test-results.json",
    "test:junit": "jest --reporters=default --reporters=jest-junit",
    "test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit --json --outputFile=test-results.json"
  }
}
```

**Стало (Vitest)**:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:security": "vitest run tests/security",
    "test:json": "vitest run --reporter=json --outputFile=test-results.json",
    "test:ci": "vitest run --coverage --reporter=verbose --reporter=json --outputFile=test-results.json"
  }
}
```

**Изменения**:
- `jest` → `vitest run` (для одноразового запуска)
- `jest --watch` → `vitest` (watch mode по умолчанию)
- `jest --coverage` → `vitest run --coverage`
- Убран `cross-env NODE_OPTIONS=--experimental-vm-modules` (не нужен)

**Чек-лист**:
- [ ] Обновлены все скрипты в `package.json`
- [ ] Удален флаг `--experimental-vm-modules`
- [ ] Добавлен скрипт `test:ui` для веб-интерфейса

---

### Шаг 1.5: Тестовый запуск

Попробуйте запустить Vitest:

```bash
# Запустите один простой тест для проверки
npm run test -- tests/unit/shared/volleyballRules.test.js
```

**Если все работает**, переходите к следующей фазе.

**Если есть ошибки**, проверьте:
- Правильность настройки `vite.config.js`
- Обновлен ли `tests/setup.js`
- Установлены ли все зависимости

**Чек-лист**:
- [ ] Vitest запускается без ошибок
- [ ] Один простой тест проходит

---

## Фаза 2: Миграция тестов

### Шаг 2.1: Понимание изменений API

Основные изменения при миграции:

| Jest | Vitest | Примечание |
|------|--------|------------|
| `jest.mock()` | `vi.mock()` | Полностью совместимо |
| `jest.fn()` | `vi.fn()` | Полностью совместимо |
| `jest.spyOn()` | `vi.spyOn()` | Полностью совместимо |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` | Полностью совместимо |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` | Полностью совместимо |
| `jest.restoreAllMocks()` | `vi.restoreAllMocks()` | Полностью совместимо |
| `jest.mocked()` | `vi.mocked()` | Полностью совместимо |
| `import { jest } from '@jest/globals'` | `import { vi } from 'vitest'` | Изменение импорта |
| `import { describe, it, expect } from '@jest/globals'` | `import { describe, it, expect } from 'vitest'` | Или используйте `globals: true` |

**Важно**: 
- Если в `vite.config.js` установлено `globals: true`, то `describe`, `it`, `expect` доступны без импорта
- `vi` (Vitest) - это аналог `jest` в Jest

---

### Шаг 2.2: Миграция простого теста (пример)

Возьмем пример: `tests/unit/renderer/useMatch-set-status.test.js`

**Было (Jest)**:
```javascript
import { SET_STATUS } from '../../../src/shared/types/Match.ts';
import { calculateDuration } from '../../../src/shared/timeUtils.js';
import { canFinishSet, getSetWinner } from '../../../src/shared/volleyballRules.js';

// Мокируем зависимости
jest.mock('../../../src/shared/volleyballRules.js', () => ({
  canFinishSet: jest.fn(),
  getSetWinner: jest.fn(),
  isSetball: jest.fn(),
  isMatchball: jest.fn(),
}));

jest.mock('../../../src/shared/timeUtils.js', () => ({
  calculateDuration: jest.fn(),
}));

describe('useMatch - Set Status Functions', () => {
  // ... тесты
});
```

**Стало (Vitest)**:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SET_STATUS } from '../../../src/shared/types/Match.ts';
import { calculateDuration } from '../../../src/shared/timeUtils.js';
import { canFinishSet, getSetWinner } from '../../../src/shared/volleyballRules.js';

// Мокируем зависимости
vi.mock('../../../src/shared/volleyballRules.js', () => ({
  canFinishSet: vi.fn(),
  getSetWinner: vi.fn(),
  isSetball: vi.fn(),
  isMatchball: vi.fn(),
}));

vi.mock('../../../src/shared/timeUtils.js', () => ({
  calculateDuration: vi.fn(),
}));

describe('useMatch - Set Status Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  // ... тесты
});
```

**Изменения**:
1. Добавлен импорт из `vitest` (или используйте `globals: true`)
2. `jest.mock` → `vi.mock`
3. `jest.fn` → `vi.fn`
4. `jest.clearAllMocks` → `vi.clearAllMocks` (в `beforeEach`)

---

### Шаг 2.3: Миграция TypeScript тестов

Для TypeScript тестов изменения аналогичны:

**Было (Jest)**:
```typescript
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { SetService } from '../../../src/shared/services/SetService.ts';

jest.mock('../../../src/shared/services/SetService.ts', () => ({
  SetService: {
    startSet: jest.fn(),
  },
}));

describe('SetService', () => {
  it('should work', () => {
    expect(SetService.startSet).toBeDefined();
  });
});
```

**Стало (Vitest)**:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetService } from '../../../src/shared/services/SetService.ts';

vi.mock('../../../src/shared/services/SetService.ts', () => ({
  SetService: {
    startSet: vi.fn(),
  },
}));

describe('SetService', () => {
  it('should work', () => {
    expect(SetService.startSet).toBeDefined();
  });
});
```

**Важно**: 
- В Vitest не нужно использовать `jest.unstable_mockModule()` для ESM модулей
- `vi.mock()` работает с ESM модулями из коробки
- TypeScript файлы обрабатываются автоматически

---

### Шаг 2.4: Миграция тестов с React Testing Library

Тесты с React Testing Library работают без изменений:

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest'; // или используйте globals: true
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

**Никаких изменений не требуется!**

---

### Шаг 2.5: План постепенной миграции

Рекомендуется мигрировать по папкам:

1. **Начните с простых тестов** (без моков):
   ```
   tests/unit/shared/volleyballRules.test.js
   tests/unit/shared/timeUtils.test.js
   tests/unit/shared/errorHandler.test.js
   ```

2. **Затем тесты с простыми моками**:
   ```
   tests/unit/renderer/SetEditModal.test.js
   tests/unit/renderer/SetsDisplay.test.js
   ```

3. **Затем TypeScript тесты**:
   ```
   tests/unit/services/SetService.test.ts
   tests/unit/services/ScoreService.test.ts
   tests/unit/services/HistoryService.test.ts
   ```

4. **Затем сложные тесты**:
   ```
   tests/unit/renderer/useMatch.test.ts
   tests/unit/renderer/useVMix-*.test.js
   ```

5. **Интеграционные тесты**:
   ```
   tests/integration/*.test.ts
   ```

6. **Тесты безопасности**:
   ```
   tests/security/*.test.js
   ```

**Для каждой папки**:
1. Мигрируйте все тесты в папке
2. Запустите тесты: `npm run test -- tests/unit/shared/`
3. Убедитесь, что все проходят
4. Создайте коммит

**Чек-лист для каждой папки**:
- [ ] Заменены все `jest.*` на `vi.*`
- [ ] Обновлены импорты
- [ ] Все тесты проходят
- [ ] Создан коммит

---

## Фаза 3: Обновление CI/CD

### Шаг 3.1: Обновление GitHub Actions

Если используется GitHub Actions, обновите workflow файлы:

**Было (Jest)**:
```yaml
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

**Стало (Vitest)**:
```yaml
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

**Изменения минимальны** - команды остаются теми же благодаря обновленным скриптам в `package.json`.

---

### Шаг 3.2: Обновление других CI систем

Для других CI систем (GitLab CI, Jenkins, etc.) обновите команды аналогично.

**Чек-лист**:
- [ ] Обновлены GitHub Actions workflows
- [ ] Обновлены другие CI конфигурации
- [ ] Проверена работа в CI

---

## Фаза 4: Очистка

### Шаг 4.1: Удаление Jest зависимостей

После успешной миграции всех тестов:

```bash
# Удалите Jest зависимости
npm uninstall jest jest-environment-jsdom @types/jest ts-jest babel-jest jest-junit

# Опционально: удалите jest.config.js
rm jest.config.js
```

**Чек-лист**:
- [ ] Удалены Jest зависимости
- [ ] Удален `jest.config.js`
- [ ] Проверено, что проект собирается

---

### Шаг 4.2: Обновление документации

Обновите документацию:

1. **docs/testing/README.md** - обновите инструкции по запуску тестов
2. **README.md** - обновите секцию о тестировании
3. **docs/development/README.md** - добавьте ссылку на это руководство

**Чек-лист**:
- [ ] Обновлена документация по тестированию
- [ ] Обновлен главный README
- [ ] Обновлена документация разработки

---

## Часто встречающиеся проблемы и решения

### Проблема 1: "Cannot find module"

**Симптомы**: Ошибка при импорте модулей

**Решение**: 
- Убедитесь, что в `vite.config.js` правильно настроен `resolve.alias`
- Проверьте, что пути к модулям корректны
- Vitest использует те же настройки разрешения модулей, что и Vite

---

### Проблема 2: Моки не работают

**Симптомы**: Моки не применяются к модулям

**Решение**:
- Убедитесь, что используете `vi.mock()` вместо `jest.mock()`
- Проверьте, что моки объявлены до импорта модуля
- Для ESM модулей `vi.mock()` работает из коробки (не нужен `unstable_mockModule`)

---

### Проблема 3: TypeScript ошибки в тестах

**Симптомы**: Ошибки типов в тестах

**Решение**:
- Убедитесь, что `tsconfig.json` включает папку `tests`
- Проверьте, что типы Vitest установлены (входят в пакет `vitest`)
- Используйте `import type` для типов

---

### Проблема 4: Медленные тесты

**Симптомы**: Тесты работают медленнее чем ожидалось

**Решение**:
- Проверьте настройки `test.include` и `test.exclude`
- Убедитесь, что не включены лишние файлы
- Используйте `test.threads: false` для отладки (по умолчанию параллельно)

---

### Проблема 5: Coverage не генерируется

**Симптомы**: Coverage отчеты не создаются

**Решение**:
- Убедитесь, что установлен `@vitest/coverage-v8`
- Проверьте настройки `coverage` в `vite.config.js`
- Запустите с флагом: `vitest run --coverage`

---

## Проверочный чек-лист финальной миграции

### Конфигурация
- [ ] `vite.config.js` содержит секцию `test`
- [ ] `tests/setup.js` обновлен для Vitest
- [ ] `package.json` скрипты обновлены

### Тесты
- [ ] Все тесты мигрированы
- [ ] Все тесты проходят: `npm test`
- [ ] Coverage работает: `npm run test:coverage`
- [ ] Watch mode работает: `npm run test:watch`

### Очистка
- [ ] Jest зависимости удалены
- [ ] `jest.config.js` удален
- [ ] Документация обновлена

### CI/CD
- [ ] CI конфигурация обновлена
- [ ] Тесты проходят в CI

---

## Полезные команды Vitest

```bash
# Запуск всех тестов один раз
npm test

# Watch mode (по умолчанию)
npm run test:watch

# Запуск конкретного теста
npm test -- tests/unit/shared/volleyballRules.test.js

# Запуск тестов в папке
npm test -- tests/unit/shared/

# Запуск с coverage
npm run test:coverage

# Запуск UI интерфейса
npm run test:ui

# Запуск в режиме отладки
npm test -- --inspect-brk

# Запуск одного теста в watch mode
npm test -- -t "test name"
```

---

## Дополнительные ресурсы

- [Vitest документация](https://vitest.dev/)
- [Vitest миграция с Jest](https://vitest.dev/guide/migration.html)
- [Vitest конфигурация](https://vitest.dev/config/)
- [Vitest API](https://vitest.dev/api/)

---

## Поддержка

Если возникли проблемы при миграции:

1. Проверьте [документацию Vitest](https://vitest.dev/)
2. Посмотрите [примеры миграции](https://vitest.dev/guide/migration.html)
3. Проверьте настройки в `vite.config.js`
4. Убедитесь, что все зависимости установлены

---

*Удачи с миграцией! 🚀*
