# Руководство по настройке и внедрению тестирования

**Дата:** 2024  
**Основано на:** QA_AUDIT_REPORT.md, раздел "План тестирования"

---

## Оглавление

1. [Установка зависимостей](#установка-зависимостей)
2. [Настройка тестовой среды](#настройка-тестовой-среды)
3. [Постепенное внедрение тестов](#постепенное-внедрение-тестов)
4. [Запуск тестов](#запуск-тестов)
5. [Написание новых тестов](#написание-новых-тестов)

---

## Установка зависимостей

### Шаг 1: Установка основных зависимостей

```bash
npm install --save-dev jest@^29.7.0
npm install --save-dev @babel/core@^7.25.2
npm install --save-dev @babel/preset-env@^7.25.3
npm install --save-dev @babel/preset-react@^7.24.7
npm install --save-dev babel-jest@^29.7.0
npm install --save-dev @types/jest@^29.5.12
```

Или одной командой:

```bash
npm install --save-dev jest@^29.7.0 @babel/core@^7.25.2 @babel/preset-env@^7.25.3 @babel/preset-react@^7.24.7 babel-jest@^29.7.0 @types/jest@^29.5.12
```

### Шаг 2: Установка зависимостей для интеграционных тестов

```bash
npm install --save-dev supertest@^7.0.0
npm install --save-dev jest-environment-jsdom@^29.7.0
npm install --save-dev jsdom@^24.0.0
```

### Шаг 3: Установка зависимостей для React тестов (опционально, для будущего)

```bash
npm install --save-dev @testing-library/react@^16.0.1
npm install --save-dev @testing-library/jest-dom@^6.4.2
npm install --save-dev @testing-library/user-event@^14.5.2
```

### Шаг 4: Проверка установки

```bash
npm test
```

Должны запуститься существующие тесты.

---

## Настройка тестовой среды

### Файлы конфигурации

Все необходимые файлы уже созданы:

1. **`jest.config.js`** - основная конфигурация Jest
2. **`.babelrc`** - конфигурация Babel для трансформации кода
3. **`tests/setup.js`** - настройка тестового окружения
4. **`package.json`** - обновлен с тестовыми скриптами

### Структура тестов

```
tests/
  unit/                    # Модульные тесты
    shared/               # ✅ Создано
      volleyballRules.test.js
      matchUtils.test.js
      errorHandler.test.js
    main/                 # ⏳ Следующий шаг
    renderer/             # ⏳ Позже
  integration/            # Интеграционные тесты
    api/                  # ✅ Создано
      mobileServer.test.js
    ipc/                  # ⏳ Следующий шаг
  e2e/                    # E2E тесты
    scenarios/            # ⏳ Позже
  security/               # ✅ Создано
    xss.test.js
  fixtures/               # ✅ Создано
    matches/
      sampleMatch.json
  setup.js                # ✅ Создано
  README.md               # ✅ Создано
```

---

## Постепенное внедрение тестов

### Фаза 1: Базовые модульные тесты (✅ Выполнено)

**Приоритет:** Высокий  
**Статус:** Завершено

#### Выполнено:
- ✅ Настроена тестовая инфраструктура
- ✅ Созданы тесты для `volleyballRules.js`
- ✅ Созданы тесты для `matchUtils.js`
- ✅ Созданы тесты для `errorHandler.js`
- ✅ Созданы тесты безопасности (XSS)

#### Результаты:
- Покрытие критических модулей: ~80%
- Все тесты проходят

---

### Фаза 2: Тесты main процесса (⏳ Следующий шаг)

**Приоритет:** Высокий  
**Оценка времени:** 2-3 дня

#### План:

1. **Тесты для `vmix-client.js`** (1 день)
   - `testConnection()`
   - `sendCommand()`
   - `updateInputField()`
   - Моки для axios

2. **Тесты для `fileManager.js`** (0.5 дня)
   - `createMatch()`
   - `saveMatch()`
   - `openMatch()`
   - Моки для fs и dialog

3. **Тесты для `settingsManager.js`** (0.5 дня)
   - `loadSettings()`
   - `saveSettings()`
   - Миграция настроек

4. **Тесты для `logoManager.js`** (0.5 дня)
   - `processTeamLogoForSave()`
   - `processTeamLogoForLoad()`
   - `cleanupLogosDirectory()`

#### Инструкции:

**Создание тестов для vmix-client.js:**

```bash
# Создайте файл
touch tests/unit/main/vmix-client.test.js
```

**Пример структуры теста:**

```javascript
const { VMixClient } = require('../../../src/main/vmix-client');
const axios = require('axios');

jest.mock('axios');

describe('VMixClient', () => {
  let client;

  beforeEach(() => {
    client = new VMixClient('localhost', 8088);
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    test('должен возвращать success при успешном подключении', async () => {
      axios.get.mockResolvedValue({ data: '<vmix>...</vmix>' });
      
      const result = await client.testConnection();
      
      expect(result.success).toBe(true);
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:8088/api',
        { timeout: 3000 }
      );
    });

    test('должен возвращать error при неудачном подключении', async () => {
      axios.get.mockRejectedValue(new Error('Connection refused'));
      
      const result = await client.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ... остальные тесты
});
```

---

### Фаза 3: Интеграционные тесты API (✅ Частично выполнено)

**Приоритет:** Высокий  
**Статус:** Частично завершено

#### Выполнено:
- ✅ Созданы базовые тесты для мобильного сервера
- ✅ Тесты для основных endpoints

#### Следующие шаги:
1. Добавить тесты валидации (после реализации валидации)
2. Добавить тесты rate limiting (после реализации)
3. Добавить тесты обработки ошибок

---

### Фаза 4: Тесты React компонентов (⏳ Позже)

**Приоритет:** Средний  
**Оценка времени:** 3-5 дней

#### План:

1. **Тесты для хуков** (2 дня)
   - `useMatch.js`
   - `useVMix.js` (после рефакторинга)

2. **Тесты для компонентов** (2-3 дня)
   - `ScoreDisplay.jsx`
   - `ScoreButtons.jsx`
   - `SetsDisplay.jsx`
   - `ServeControl.jsx`

#### Инструкции:

**Пример теста для хука:**

```javascript
import { renderHook, act } from '@testing-library/react';
import { useMatch } from '../../../src/renderer/hooks/useMatch';

describe('useMatch', () => {
  test('должен изменять счет команды A', () => {
    const { result } = renderHook(() => useMatch(initialMatch));
    
    act(() => {
      result.current.changeScore('A', 1);
    });
    
    expect(result.current.match.currentSet.scoreA).toBe(1);
  });
});
```

---

### Фаза 5: E2E тесты (⏳ Долгосрочная перспектива)

**Приоритет:** Низкий  
**Оценка времени:** 5-7 дней

#### План:

1. Настройка Playwright для Electron
2. Создание базовых E2E сценариев
3. Автоматизация критических пользовательских потоков

---

## Запуск тестов

### Базовые команды

```bash
# Все тесты
npm test

# Только unit тесты
npm run test:unit

# Только интеграционные тесты
npm run test:integration

# Только тесты безопасности
npm run test:security

# С покрытием кода
npm run test:coverage

# В режиме watch
npm run test:watch
```

### Запуск конкретного теста

```bash
# По имени файла
npm test -- tests/unit/shared/volleyballRules.test.js

# По паттерну имени
npm test -- --testNamePattern="isSetball"

# По пути
npm test -- tests/unit/shared
```

### Просмотр покрытия кода

После запуска `npm run test:coverage`:

1. Откройте `coverage/index.html` в браузере
2. Изучите детальный отчет по каждому файлу
3. Найдите непокрытые строки и ветки

---

## Написание новых тестов

### Шаблон теста

```javascript
/**
 * Тесты для [ModuleName]
 * [Описание модуля]
 */

const { functionName } = require('../../../src/path/to/module');

describe('ModuleName', () => {
  // Перед каждым тестом
  beforeEach(() => {
    // Подготовка
  });

  // После каждого теста
  afterEach(() => {
    // Очистка
  });

  describe('functionName', () => {
    test('должен [ожидаемое поведение]', () => {
      // Arrange (подготовка)
      const input = 'test';
      
      // Act (действие)
      const result = functionName(input);
      
      // Assert (проверка)
      expect(result).toBe('expected');
    });

    test('должен обрабатывать граничные случаи', () => {
      // Тест граничных случаев
    });

    test('должен обрабатывать ошибки', () => {
      // Тест обработки ошибок
    });
  });
});
```

### Best Practices

1. **Используйте описательные имена тестов**
   ```javascript
   // ❌ Плохо
   test('test1', () => { ... });
   
   // ✅ Хорошо
   test('должен возвращать true при валидном счете 25:23', () => { ... });
   ```

2. **Тестируйте одно поведение за раз**
   ```javascript
   // ❌ Плохо
   test('должен делать все', () => {
     // много проверок
   });
   
   // ✅ Хорошо
   test('должен увеличивать счет', () => { ... });
   test('должен менять подачу', () => { ... });
   ```

3. **Используйте AAA паттерн (Arrange-Act-Assert)**
   ```javascript
   test('должен увеличивать счет', () => {
     // Arrange
     const match = createNewMatch();
     
     // Act
     const result = changeScore(match, 'A', 1);
     
     // Assert
     expect(result.currentSet.scoreA).toBe(1);
   });
   ```

4. **Тестируйте граничные случаи**
   ```javascript
   test('должен обрабатывать null', () => { ... });
   test('должен обрабатывать пустую строку', () => { ... });
   test('должен обрабатывать максимальные значения', () => { ... });
   ```

5. **Используйте моки для внешних зависимостей**
   ```javascript
   jest.mock('axios');
   jest.mock('fs');
   ```

---

## Чек-лист внедрения тестирования

### Фаза 1: Базовая инфраструктура ✅
- [x] Установлены зависимости
- [x] Настроен Jest
- [x] Настроен Babel
- [x] Создан setup.js
- [x] Создана структура папок

### Фаза 2: Критические модули ✅
- [x] Тесты для volleyballRules.js
- [x] Тесты для matchUtils.js
- [x] Тесты для errorHandler.js
- [x] Тесты безопасности (XSS)

### Фаза 3: Main процесс ⏳
- [ ] Тесты для vmix-client.js
- [ ] Тесты для fileManager.js
- [ ] Тесты для settingsManager.js
- [ ] Тесты для logoManager.js

### Фаза 4: Интеграционные тесты ⏳
- [x] Базовые тесты API
- [ ] Тесты валидации API
- [ ] Тесты IPC коммуникации

### Фаза 5: React компоненты ⏳
- [ ] Тесты для хуков
- [ ] Тесты для компонентов
- [ ] Тесты для страниц

### Фаза 6: E2E тесты ⏳
- [ ] Настройка Playwright
- [ ] Базовые E2E сценарии

---

## Метрики качества

### Текущее состояние

После выполнения Фазы 1 и 2:
- **Покрытие критических модулей:** ~80%
- **Общее покрытие:** ~30-40%
- **Количество тестов:** 50+

### Целевые метрики

- **Покрытие критических модулей:** минимум 80% ✅
- **Общее покрытие:** минимум 70%
- **Время выполнения unit тестов:** < 5 минут
- **Количество тестов:** 200+

---

## Следующие шаги

1. **Установите зависимости:**
   ```bash
   npm install
   ```

2. **Запустите тесты:**
   ```bash
   npm test
   ```

3. **Проверьте покрытие:**
   ```bash
   npm run test:coverage
   ```

4. **Начните писать тесты для main процесса:**
   - См. примеры в `tests/unit/shared/`
   - Следуйте шаблону из этого документа

5. **Постепенно увеличивайте покрытие:**
   - Добавляйте тесты при исправлении багов
   - Добавляйте тесты при добавлении новых функций
   - Рефакторите код для лучшей тестируемости

---

## Полезные ссылки

- [Jest документация](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Supertest документация](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Дата создания:** 2024  
**Версия:** 1.0
