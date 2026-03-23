# Быстрый старт тестирования

## Шаг 1: Установка зависимостей

```bash
npm install
```

Это установит все необходимые зависимости для тестирования, включая:
- Jest
- Babel и пресеты
- Supertest
- jsdom
- React Testing Library

## Шаг 2: Запуск тестов

```bash
# Все тесты
npm test

# С покрытием кода
npm run test:coverage

# Только unit тесты
npm run test:unit

# Только интеграционные тесты
npm run test:integration

# Только тесты безопасности
npm run test:security

# Режим watch (автоматический перезапуск при изменениях)
npm run test:watch
```

## Шаг 3: Просмотр покрытия кода

После запуска `npm run test:coverage`:

1. Откройте файл `coverage/index.html` в браузере
2. Изучите детальный отчет по каждому файлу
3. Найдите непокрытые строки и добавьте тесты

## Что уже протестировано

✅ **volleyballRules.js** - ~44 теста
- isSetball()
- isMatchball()
- canFinishSet()
- getSetWinner()
- getMatchWinner()
- isMatchFinished()

✅ **matchUtils.js** - ~23 теста
- createNewMatch()
- validateMatch()
- generateUUID()

✅ **errorHandler.js** - ~18 тестов
- handleError()
- getErrorLog()
- clearErrorLog()

✅ **API мобильного сервера** - ~15 тестов
- GET /api/match/:sessionId
- POST /api/match/:sessionId/score
- POST /api/match/:sessionId/serve
- POST /api/match/:sessionId/set

✅ **Безопасность (XSS)** - ~7 тестов
- Санитизация XSS векторов
- Экранирование специальных символов

**Всего:** ~107 тестов

## Следующие шаги

1. Запустите тесты и убедитесь, что все проходят
2. Изучите примеры тестов в `tests/unit/shared/`
3. Начните писать тесты для main процесса (см. `docs/TESTING_SETUP_GUIDE.md`)

## Проблемы?

Если тесты не запускаются:

1. Убедитесь, что все зависимости установлены: `npm install`
2. Проверьте версию Node.js: `node --version` (должна быть 18+)
3. Очистите кэш: `npm test -- --clearCache`

## Дополнительная документация

- `tests/README.md` - Общее руководство по тестированию
- `docs/TESTING_SETUP_GUIDE.md` - Детальное руководство по настройке
- `docs/TESTING_IMPLEMENTATION_STATUS.md` - Статус внедрения тестов
