# Руководство по тестированию

Этот документ описывает структуру тестов и как их запускать.

## Структура тестов

```
tests/
  unit/              # Модульные тесты
    shared/          # Тесты для shared модулей
    main/            # Тесты для main процесса
    renderer/        # Тесты для renderer процесса
  integration/       # Интеграционные тесты
    api/             # Тесты API endpoints
    ipc/             # Тесты IPC коммуникации
  e2e/               # End-to-end тесты
    scenarios/       # Пользовательские сценарии
  security/          # Тесты безопасности
  fixtures/          # Тестовые данные
    matches/         # Примеры матчей
    configs/         # Конфигурации для тестов
  setup.js           # Настройка тестового окружения
```

## Установка зависимостей

```bash
npm install
```

Это установит все необходимые зависимости, включая Jest и другие инструменты тестирования.

## Запуск тестов

### Все тесты
```bash
npm test
```

### Только unit тесты
```bash
npm run test:unit
```

### Только интеграционные тесты
```bash
npm run test:integration
```

### Только тесты безопасности
```bash
npm run test:security
```

### С покрытием кода
```bash
npm run test:coverage
```

### В режиме watch (автоматический перезапуск)
```bash
npm run test:watch
```

## Покрытие кода

После запуска тестов с покрытием, отчет будет доступен в папке `coverage/`.

Откройте `coverage/index.html` в браузере для просмотра детального отчета.

### Целевые метрики покрытия:
- **Глобальное покрытие:** минимум 50%
- **Критические модули:** минимум 80%
  - `src/shared/volleyballRules.js`
  - `src/shared/matchUtils.js`

## Написание новых тестов

### Структура теста

```javascript
describe('ModuleName', () => {
  describe('functionName', () => {
    test('должен делать что-то', () => {
      // Arrange (подготовка)
      const input = 'test';
      
      // Act (действие)
      const result = functionName(input);
      
      // Assert (проверка)
      expect(result).toBe('expected');
    });
  });
});
```

### Примеры

См. существующие тесты в `tests/unit/` для примеров.

## Моки и фикстуры

### Использование фикстур

```javascript
const sampleMatch = require('../../fixtures/matches/sampleMatch.json');

test('должен работать с фикстурой', () => {
  const result = processMatch(sampleMatch);
  expect(result).toBeDefined();
});
```

### Моки Electron API

Electron API автоматически мокируется в `tests/setup.js`. Если нужно переопределить мок:

```javascript
global.electronAPI.createMatch = jest.fn().mockResolvedValue(mockMatch);
```

## Отладка тестов

### Запуск одного теста
```bash
npm test -- tests/unit/shared/volleyballRules.test.js
```

### Запуск тестов с определенным паттерном
```bash
npm test -- --testNamePattern="isSetball"
```

### Verbose режим
```bash
npm test -- --verbose
```

## CI/CD интеграция

Тесты автоматически запускаются при:
- Push в основную ветку
- Pull Request
- По расписанию (если настроено)

## Проблемы и решения

### Проблема: Тесты не находят модули
**Решение:** Проверьте `jest.config.js` и настройки `moduleNameMapper`.

### Проблема: Ошибки с ES6 модулями
**Решение:** Убедитесь, что `.babelrc` настроен правильно.

### Проблема: Тесты падают из-за отсутствия Electron
**Решение:** Electron API мокируется автоматически. Проверьте `tests/setup.js`.

## Дополнительные ресурсы

- [Jest документация](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest документация](https://github.com/visionmedia/supertest)
