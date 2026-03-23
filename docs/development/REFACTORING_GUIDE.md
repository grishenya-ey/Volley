# Руководство по рефакторингу VolleyScore Master

**Версия:** 1.0  
**Дата:** 2024  
**Основано на:** QA_AUDIT_REPORT.md

---

## Оглавление

1. [Приоритет 1: Критические проблемы безопасности](#приоритет-1-критические-проблемы-безопасности)
2. [Приоритет 2: Производительность](#приоритет-2-производительность)
3. [Приоритет 3: Архитектура и качество кода](#приоритет-3-архитектура-и-качество-кода)
4. [Приоритет 4: Дополнительные улучшения](#приоритет-4-дополнительные-улучшения)
5. [Чек-листы проверки](#чек-листы-проверки)

---

## Приоритет 1: Критические проблемы безопасности

### Задача 1.1: Исправление XSS уязвимости

#### Описание проблемы
В файле `src/main/server.js` используется `innerHTML` для вставки пользовательских данных, что создает XSS уязвимость.

#### Декомпозиция задачи

**Подзадача 1.1.1:** Создание утилиты для безопасной работы с DOM  
**Подзадача 1.1.2:** Замена `innerHTML` на безопасные методы  
**Подзадача 1.1.3:** Тестирование на XSS-векторах

---

#### Инструкция 1.1.1: Создание утилиты для безопасной работы с DOM

**Файл для создания:** `src/main/utils/domUtils.js`

**Шаги:**

1. Создайте файл `src/main/utils/domUtils.js`:

```javascript
/**
 * Утилиты для безопасной работы с DOM
 */

/**
 * Безопасно создает элемент изображения
 * @param {string} src - URL изображения
 * @param {string} alt - Альтернативный текст (санитизируется)
 * @param {Function} onError - Обработчик ошибки загрузки
 * @returns {HTMLElement} - Созданный элемент img
 */
function createSafeImage(src, alt, onError) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = sanitizeText(alt);
  if (onError) {
    img.onerror = onError;
  }
  return img;
}

/**
 * Безопасно создает контейнер для логотипа
 * @param {HTMLElement} container - Контейнер для вставки
 * @param {string} logoUrl - URL логотипа
 * @param {string} teamName - Имя команды (для alt)
 */
function setLogoContainer(container, logoUrl, teamName) {
  // Очищаем контейнер
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  if (logoUrl) {
    const img = createSafeImage(logoUrl, teamName, () => {
      container.style.display = 'none';
    });
    container.appendChild(img);
    container.style.display = 'flex';
  } else {
    container.style.display = 'none';
  }
}

/**
 * Санитизирует текст для безопасного отображения
 * @param {string} text - Текст для санитизации
 * @returns {string} - Санитизированный текст
 */
function sanitizeText(text) {
  if (!text) return '';
  
  // Создаем временный элемент для экранирования HTML
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Безопасно устанавливает текстовое содержимое элемента
 * @param {HTMLElement} element - Элемент
 * @param {string} text - Текст для установки
 */
function setTextContent(element, text) {
  if (element) {
    element.textContent = sanitizeText(text);
  }
}

/**
 * Безопасно создает элемент списка партий
 * @param {Object} set - Данные партии
 * @param {number} currentSetNum - Номер текущей партии
 * @param {Object} currentSet - Данные текущей партии
 * @returns {HTMLElement} - Созданный элемент
 */
function createSetItem(set, currentSetNum, currentSet) {
  const setItem = document.createElement('div');
  setItem.className = 'set-item';
  
  if (set && set.completed) {
    setTextContent(setItem, `Партия ${set.setNumber}: ${set.scoreA} - ${set.scoreB}`);
  } else if (set && set.setNumber === currentSetNum) {
    setItem.className = 'set-item current';
    setTextContent(setItem, `Партия ${set.setNumber}: Текущая (${currentSet.scoreA} - ${currentSet.scoreB})`);
  } else {
    setTextContent(setItem, `Партия ${set.setNumber}: -`);
    setItem.style.color = '#bdc3c7';
  }
  
  return setItem;
}

module.exports = {
  createSafeImage,
  setLogoContainer,
  sanitizeText,
  setTextContent,
  createSetItem,
};
```

2. Протестируйте утилиту:

```javascript
// Пример теста
const { sanitizeText } = require('./domUtils');

// Тест на XSS
const maliciousInput = '<script>alert("XSS")</script>';
const sanitized = sanitizeText(maliciousInput);
console.assert(!sanitized.includes('<script>'), 'XSS не заблокирован');
```

**Чек-лист:**
- [ ] Файл создан
- [ ] Все функции реализованы
- [ ] Добавлены JSDoc комментарии
- [ ] Протестирована санитизация

---

#### Инструкция 1.1.2: Замена innerHTML в server.js

**Файл для изменения:** `src/main/server.js`

**Шаги:**

1. Добавьте импорт утилиты в начало файла:

```javascript
const domUtils = require('./utils/domUtils');
```

2. Найдите функцию `updateUI()` внутри `getMobilePanelHTML()` (примерно строка 758).

3. Замените код работы с логотипами (строки 780-826):

**БЫЛО:**
```javascript
// Логотипы команд
const logoA = document.getElementById('logoA');
const logoB = document.getElementById('logoB');

// Для команды A
let logoAUrl = null;
logoAUrl = `http://${window.location.hostname}:${serverPort}/logos/logo_a.png`;

if (matchData.teamA.logoBase64) {
  logoAUrl = matchData.teamA.logoBase64;
} else if (matchData.teamA.logo) {
  logoAUrl = matchData.teamA.logo;
}

if (logoAUrl) {
  logoA.innerHTML = `<img src="${logoAUrl}" alt="${matchData.teamA.name}" onerror="this.parentElement.style.display='none'" />`;
  logoA.style.display = 'flex';
} else {
  logoA.innerHTML = '';
  logoA.style.display = 'none';
}

// Аналогично для команды B...
```

**СТАЛО:**
```javascript
// Логотипы команд
const logoA = document.getElementById('logoA');
const logoB = document.getElementById('logoB');

// Для команды A
let logoAUrl = null;
logoAUrl = `http://${window.location.hostname}:${serverPort}/logos/logo_a.png`;

if (matchData.teamA.logoBase64) {
  logoAUrl = matchData.teamA.logoBase64;
} else if (matchData.teamA.logo) {
  logoAUrl = matchData.teamA.logo;
}

// Используем безопасную утилиту
domUtils.setLogoContainer(logoA, logoAUrl, matchData.teamA.name);

// Для команды B
let logoBUrl = null;
logoBUrl = `http://${window.location.hostname}:${serverPort}/logos/logo_b.png`;

if (matchData.teamB.logoBase64) {
  logoBUrl = matchData.teamB.logoBase64;
} else if (matchData.teamB.logo) {
  logoBUrl = matchData.teamB.logo;
}

domUtils.setLogoContainer(logoB, logoBUrl, matchData.teamB.name);
```

4. Замените код обновления списка партий (строка 988-1010):

**БЫЛО:**
```javascript
function updateSetsList() {
  const setsList = document.getElementById('setsList');
  setsList.innerHTML = '';
  
  const currentSetNum = matchData.currentSet.setNumber;
  
  for (let i = 1; i <= 5; i++) {
    const set = matchData.sets.find(s => s.setNumber === i);
    const setItem = document.createElement('div');
    setItem.className = 'set-item';
    
    if (set && set.completed) {
      setItem.textContent = `Партия ${i}: ${set.scoreA} - ${set.scoreB}`;
    } else if (i === currentSetNum) {
      setItem.className = 'set-item current';
      setItem.textContent = `Партия ${i}: Текущая (${matchData.currentSet.scoreA} - ${matchData.currentSet.scoreB})`;
    } else {
      setItem.textContent = `Партия ${i}: -`;
      setItem.style.color = '#bdc3c7';
    }
    
    setsList.appendChild(setItem);
  }
}
```

**СТАЛО:**
```javascript
function updateSetsList() {
  const setsList = document.getElementById('setsList');
  
  // Очищаем контейнер безопасно
  while (setsList.firstChild) {
    setsList.removeChild(setsList.firstChild);
  }
  
  const currentSetNum = matchData.currentSet.setNumber;
  
  for (let i = 1; i <= 5; i++) {
    const set = matchData.sets.find(s => s.setNumber === i);
    const setItem = domUtils.createSetItem(set, currentSetNum, matchData.currentSet);
    setsList.appendChild(setItem);
  }
}
```

5. Замените все использования `textContent` с пользовательскими данными на безопасные методы:

**Найдите и замените:**
- `document.getElementById('teamA').textContent = matchData.teamA.name;` 
  → `domUtils.setTextContent(document.getElementById('teamA'), matchData.teamA.name);`

**Чек-лист:**
- [ ] Импорт добавлен
- [ ] Логотипы используют безопасные методы
- [ ] Список партий использует безопасные методы
- [ ] Все `innerHTML` заменены
- [ ] Все `textContent` с пользовательскими данными используют санитизацию

---

#### Инструкция 1.1.3: Тестирование на XSS

**Файл для создания:** `tests/security/xss.test.js`

**Шаги:**

1. Создайте тестовый файл:

```javascript
const { sanitizeText } = require('../../src/main/utils/domUtils');

describe('XSS Protection Tests', () => {
  const xssVectors = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<select onfocus=alert("XSS") autofocus>',
    '<textarea onfocus=alert("XSS") autofocus>',
    '<keygen onfocus=alert("XSS") autofocus>',
    '<video><source onerror="alert(\'XSS\')">',
    '<audio src=x onerror=alert("XSS")>',
  ];

  test.each(xssVectors)('should sanitize XSS vector: %s', (vector) => {
    const sanitized = sanitizeText(vector);
    
    // Проверяем, что скрипты удалены или экранированы
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('onerror=');
    expect(sanitized).not.toContain('onload=');
    expect(sanitized).not.toContain('onfocus=');
    expect(sanitized).not.toContain('javascript:');
  });

  test('should preserve safe text', () => {
    const safeText = 'Команда А';
    const sanitized = sanitizeText(safeText);
    expect(sanitized).toBe('Команда А');
  });

  test('should handle empty string', () => {
    const sanitized = sanitizeText('');
    expect(sanitized).toBe('');
  });

  test('should handle null/undefined', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });
});
```

2. Запустите тесты:
```bash
npm test -- tests/security/xss.test.js
```

3. Ручное тестирование:
   - Откройте мобильный интерфейс
   - Попробуйте ввести XSS-векторы в имена команд через API
   - Убедитесь, что скрипты не выполняются

**Чек-лист:**
- [ ] Тесты созданы
- [ ] Все тесты проходят
- [ ] Ручное тестирование выполнено
- [ ] Документация обновлена

---

### Задача 1.2: Добавление валидации входных данных

#### Описание проблемы
API endpoints не имеют достаточной валидации входных данных, что может привести к некорректным данным или DoS-атакам.

#### Декомпозиция задачи

**Подзадача 1.2.1:** Установка и настройка библиотеки валидации  
**Подзадача 1.2.2:** Создание схем валидации  
**Подзадача 1.2.3:** Создание middleware для валидации  
**Подзадача 1.2.4:** Применение валидации к API endpoints  
**Подзадача 1.2.5:** Добавление rate limiting

---

#### Инструкция 1.2.1: Установка библиотеки валидации

**Шаги:**

1. Установите Joi для валидации:
```bash
npm install joi
```

2. Установите express-rate-limit для rate limiting:
```bash
npm install express-rate-limit
```

**Чек-лист:**
- [ ] Joi установлен
- [ ] express-rate-limit установлен
- [ ] Зависимости добавлены в package.json

---

#### Инструкция 1.2.2: Создание схем валидации

**Файл для создания:** `src/main/validation/schemas.js`

**Шаги:**

1. Создайте файл со схемами валидации:

```javascript
const Joi = require('joi');

/**
 * Схемы валидации для API endpoints
 */

// UUID валидация
const uuidSchema = Joi.string().uuid().required();

// Валидация команды (A или B)
const teamSchema = Joi.string().valid('A', 'B').required();

// Валидация изменения счета
const scoreChangeSchema = Joi.object({
  team: teamSchema,
  delta: Joi.number().integer().min(-100).max(100).required()
    .messages({
      'number.base': 'delta должен быть числом',
      'number.integer': 'delta должен быть целым числом',
      'number.min': 'delta не может быть меньше -100',
      'number.max': 'delta не может быть больше 100',
    }),
});

// Валидация изменения подачи
const serveChangeSchema = Joi.object({
  team: teamSchema.messages({
    'any.only': 'team должен быть "A" или "B"',
    'any.required': 'team обязателен',
  }),
});

// Валидация завершения партии (нет тела запроса, только sessionId)
const finishSetSchema = Joi.object({});

// Валидация отмены действия (нет тела запроса)
const undoActionSchema = Joi.object({});

// Валидация порта для мобильного сервера
const portSchema = Joi.number().integer().min(1024).max(65535)
  .messages({
    'number.base': 'Порт должен быть числом',
    'number.min': 'Порт должен быть не менее 1024',
    'number.max': 'Порт должен быть не более 65535',
  });

// Валидация IP адреса
const ipSchema = Joi.string().ip({ version: ['ipv4'] })
  .messages({
    'string.ip': 'Некорректный IP адрес',
  });

module.exports = {
  uuidSchema,
  teamSchema,
  scoreChangeSchema,
  serveChangeSchema,
  finishSetSchema,
  undoActionSchema,
  portSchema,
  ipSchema,
};
```

**Чек-лист:**
- [ ] Файл создан
- [ ] Все схемы определены
- [ ] Добавлены понятные сообщения об ошибках
- [ ] Протестированы схемы

---

#### Инструкция 1.2.3: Создание middleware для валидации

**Файл для создания:** `src/main/middleware/validation.js`

**Шаги:**

1. Создайте middleware для валидации:

```javascript
const Joi = require('joi');
const errorHandler = require('../../shared/errorHandler');

/**
 * Middleware для валидации запросов
 * @param {Joi.Schema} schema - Схема валидации Joi
 * @param {string} source - Источник данных: 'body', 'params', 'query'
 * @returns {Function} - Express middleware
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Возвращать все ошибки, а не только первую
      stripUnknown: true, // Удалять неизвестные поля
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: errors,
      });
    }

    // Заменяем данные на валидированные
    req[source] = value;
    next();
  };
}

/**
 * Middleware для валидации sessionId в параметрах
 */
function validateSessionId(req, res, next) {
  const { uuidSchema } = require('../validation/schemas');
  return validate(uuidSchema, 'params')(req, res, () => {
    // Переименовываем sessionId для удобства
    req.sessionId = req.params.sessionId;
    next();
  });
}

module.exports = {
  validate,
  validateSessionId,
};
```

**Чек-лист:**
- [ ] Middleware создан
- [ ] Поддерживается валидация body, params, query
- [ ] Возвращаются понятные ошибки
- [ ] Протестирован middleware

---

#### Инструкция 1.2.4: Применение валидации к API endpoints

**Файл для изменения:** `src/main/server.js`

**Шаги:**

1. Добавьте импорты в начало файла:

```javascript
const { validate, validateSessionId } = require('./middleware/validation');
const {
  scoreChangeSchema,
  serveChangeSchema,
  finishSetSchema,
  undoActionSchema,
} = require('./validation/schemas');
```

2. Обновите endpoint `/api/match/:sessionId/score`:

**БЫЛО:**
```javascript
this.app.post('/api/match/:sessionId/score', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { team, delta } = req.body;
    // ...
  }
});
```

**СТАЛО:**
```javascript
this.app.post('/api/match/:sessionId/score',
  validateSessionId,
  validate(scoreChangeSchema, 'body'),
  (req, res) => {
    try {
      const { sessionId } = req.sessionId; // Уже валидирован
      const { team, delta } = req.body; // Уже валидирован
      // ...
    }
  }
);
```

3. Обновите endpoint `/api/match/:sessionId/serve`:

```javascript
this.app.post('/api/match/:sessionId/serve',
  validateSessionId,
  validate(serveChangeSchema, 'body'),
  (req, res) => {
    // ...
  }
);
```

4. Обновите endpoint `/api/match/:sessionId/set`:

```javascript
this.app.post('/api/match/:sessionId/set',
  validateSessionId,
  validate(finishSetSchema, 'body'),
  (req, res) => {
    // ...
  }
);
```

5. Обновите endpoint `/api/match/:sessionId/undo`:

```javascript
this.app.post('/api/match/:sessionId/undo',
  validateSessionId,
  validate(undoActionSchema, 'body'),
  (req, res) => {
    // ...
  }
);
```

6. Обновите endpoint `/api/match/:sessionId` (GET):

```javascript
this.app.get('/api/match/:sessionId',
  validateSessionId,
  (req, res) => {
    // ...
  }
);
```

**Чек-лист:**
- [ ] Все endpoints используют валидацию
- [ ] SessionId валидируется во всех нужных местах
- [ ] Тело запроса валидируется
- [ ] Возвращаются понятные ошибки валидации

---

#### Инструкция 1.2.5: Добавление rate limiting

**Файл для изменения:** `src/main/server.js`

**Шаги:**

1. Добавьте импорт в начало файла:

```javascript
const rateLimit = require('express-rate-limit');
```

2. Создайте конфигурацию rate limiter в конструкторе MobileServer:

```javascript
constructor() {
  // ... существующий код ...
  
  // Настройка rate limiting
  this.setupRateLimiting();
}

setupRateLimiting() {
  // Общий rate limiter для всех API endpoints
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов с одного IP
    message: {
      success: false,
      error: 'Слишком много запросов. Попробуйте позже.',
    },
    standardHeaders: true, // Возвращать информацию о лимитах в заголовках
    legacyHeaders: false,
  });

  // Строгий rate limiter для изменения счета
  const scoreChangeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 60, // максимум 60 изменений счета в минуту
    message: {
      success: false,
      error: 'Слишком много изменений счета. Подождите немного.',
    },
  });

  // Применяем общий лимитер ко всем API endpoints
  this.app.use('/api/', apiLimiter);
  
  // Применяем строгий лимитер к изменению счета
  this.app.use('/api/match/:sessionId/score', scoreChangeLimiter);
}
```

3. Обновите метод `setupRoutes()` чтобы rate limiting применялся автоматически.

**Чек-лист:**
- [ ] Rate limiting настроен
- [ ] Разные лимиты для разных endpoints
- [ ] Возвращаются понятные сообщения
- [ ] Протестирован rate limiting

---

### Задача 1.3: Добавление проверки размера файлов

#### Описание проблемы
Отсутствуют ограничения на размер загружаемых файлов, что может привести к DoS.

#### Декомпозиция задачи

**Подзадача 1.3.1:** Определение констант для лимитов  
**Подзадача 1.3.2:** Добавление проверки размера файлов матчей  
**Подзадача 1.3.3:** Добавление проверки размера логотипов

---

#### Инструкция 1.3.1: Определение констант для лимитов

**Файл для создания:** `src/shared/constants.js`

**Шаги:**

1. Создайте файл с константами:

```javascript
/**
 * Константы приложения
 */

// Лимиты размера файлов (в байтах)
const FILE_SIZE_LIMITS = {
  MATCH: 10 * 1024 * 1024, // 10 MB для файлов матчей
  LOGO: 2 * 1024 * 1024,   // 2 MB для логотипов
  BASE64_LOGO: 3 * 1024 * 1024, // 3 MB для base64 логотипов (с учетом overhead)
};

// Таймауты (в миллисекундах)
const TIMEOUTS = {
  VMIX_CONNECTION: 3000,
  VMIX_COMMAND: 5000,
  FILE_OPERATION: 10000,
  MOBILE_SERVER_START: 5000,
};

// Порты по умолчанию
const DEFAULT_PORTS = {
  VMIX: 8088,
  MOBILE_SERVER: 3000,
  VITE_DEV: 5173,
};

// Пороги для волейбола
const VOLLEYBALL_THRESHOLDS = {
  SETBALL_REGULAR: 24,
  SETBALL_TIEBREAK: 14,
  FINISH_REGULAR: 25,
  FINISH_TIEBREAK: 15,
  TIEBREAK_SET: 5,
};

module.exports = {
  FILE_SIZE_LIMITS,
  TIMEOUTS,
  DEFAULT_PORTS,
  VOLLEYBALL_THRESHOLDS,
};
```

**Чек-лист:**
- [ ] Файл создан
- [ ] Все константы определены
- [ ] Добавлены комментарии

---

#### Инструкция 1.3.2: Добавление проверки размера файлов матчей

**Файл для изменения:** `src/main/fileManager.js`

**Шаги:**

1. Добавьте импорт констант:

```javascript
const { FILE_SIZE_LIMITS } = require('../shared/constants');
```

2. Обновите функцию `openMatch()`:

```javascript
async function openMatch(filePath) {
  try {
    // Проверяем размер файла перед чтением
    const stats = await fs.stat(filePath);
    if (stats.size > FILE_SIZE_LIMITS.MATCH) {
      throw new Error(
        `Файл слишком большой (${(stats.size / 1024 / 1024).toFixed(2)} MB). ` +
        `Максимальный размер: ${(FILE_SIZE_LIMITS.MATCH / 1024 / 1024).toFixed(2)} MB`
      );
    }

    const data = await fs.readFile(filePath, 'utf-8');
    
    // Проверяем размер данных в памяти
    const dataSize = Buffer.byteLength(data, 'utf8');
    if (dataSize > FILE_SIZE_LIMITS.MATCH) {
      throw new Error('Файл слишком большой для обработки');
    }
    
    // ... остальной код ...
  }
}
```

3. Обновите функцию `saveMatch()`:

```javascript
async function saveMatch(match, filePath = null) {
  // ... существующий код валидации ...
  
  // Проверяем размер данных перед сохранением
  const matchString = JSON.stringify(matchToSave, null, 2);
  const dataSize = Buffer.byteLength(matchString, 'utf8');
  
  if (dataSize > FILE_SIZE_LIMITS.MATCH) {
    throw new Error(
      `Размер данных матча слишком большой (${(dataSize / 1024 / 1024).toFixed(2)} MB). ` +
      `Максимальный размер: ${(FILE_SIZE_LIMITS.MATCH / 1024 / 1024).toFixed(2)} MB`
    );
  }
  
  // ... остальной код сохранения ...
}
```

**Чек-лист:**
- [ ] Проверка размера при открытии файла
- [ ] Проверка размера при сохранении файла
- [ ] Понятные сообщения об ошибках
- [ ] Протестирована проверка

---

#### Инструкция 1.3.3: Добавление проверки размера логотипов

**Файл для изменения:** `src/main/logoManager.js`

**Шаги:**

1. Добавьте импорт констант:

```javascript
const { FILE_SIZE_LIMITS } = require('../shared/constants');
```

2. Обновите функцию `saveLogoToFile()`:

```javascript
async function saveLogoToFile(base64String, team) {
  await ensureLogosDir();
  
  // Проверяем размер base64 данных
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const buffer = base64ToBuffer(base64String);
  
  if (buffer.length > FILE_SIZE_LIMITS.LOGO) {
    throw new Error(
      `Логотип слишком большой (${(buffer.length / 1024 / 1024).toFixed(2)} MB). ` +
      `Максимальный размер: ${(FILE_SIZE_LIMITS.LOGO / 1024 / 1024).toFixed(2)} MB`
    );
  }
  
  // ... остальной код ...
}
```

3. Обновите функцию `processTeamLogoForSave()`:

```javascript
async function processTeamLogoForSave(team, teamLetter) {
  // ... существующий код определения logoBase64 ...
  
  if (isBase64) {
    // Проверяем размер перед сохранением
    const base64Data = logoBase64.replace(/^data:image\/\w+;base64,/, '');
    const estimatedSize = (base64Data.length * 3) / 4; // Примерный размер после декодирования
    
    if (estimatedSize > FILE_SIZE_LIMITS.BASE64_LOGO) {
      throw new Error(
        `Логотип команды ${teamLetter} слишком большой. ` +
        `Максимальный размер: ${(FILE_SIZE_LIMITS.LOGO / 1024 / 1024).toFixed(2)} MB`
      );
    }
    
    // ... остальной код ...
  }
}
```

**Чек-лист:**
- [ ] Проверка размера base64 логотипов
- [ ] Проверка размера файлов логотипов
- [ ] Понятные сообщения об ошибках
- [ ] Протестирована проверка

---

## Приоритет 2: Производительность

### Задача 2.1: Оптимизация React компонентов

#### Описание проблемы
Компоненты не используют мемоизацию, что приводит к лишним перерисовкам.

#### Декомпозиция задачи

**Подзадача 2.1.1:** Установка React DevTools Profiler  
**Подзадача 2.1.2:** Анализ производительности  
**Подзадача 2.1.3:** Оптимизация MatchControlPage  
**Подзадача 2.1.4:** Оптимизация компонентов статистики  
**Подзадача 2.1.5:** Измерение улучшений

---

#### Инструкция 2.1.1: Установка React DevTools Profiler

**Шаги:**

1. Установите React DevTools расширение для браузера (если еще не установлено)

2. В режиме разработки откройте DevTools → вкладка "Profiler"

3. Запишите профиль производительности:
   - Нажмите "Record"
   - Выполните типичные действия (изменение счета, статистики)
   - Остановите запись
   - Проанализируйте результаты

**Чек-лист:**
- [ ] DevTools установлены
- [ ] Профиль записан
- [ ] Выявлены проблемные компоненты

---

#### Инструкция 2.1.2: Анализ производительности

**Шаги:**

1. Определите компоненты с наибольшим временем рендеринга
2. Определите компоненты, которые перерисовываются без необходимости
3. Составьте список приоритетных компонентов для оптимизации

**Ожидаемые результаты:**
- `MatchControlPage` - вероятно, перерисовывается часто
- Компоненты статистики - перерисовываются при каждом изменении
- `ScoreDisplay` - может перерисовываться без необходимости

**Чек-лист:**
- [ ] Анализ выполнен
- [ ] Список проблемных компонентов составлен
- [ ] Приоритеты определены

---

#### Инструкция 2.1.3: Оптимизация MatchControlPage

**Файл для изменения:** `src/renderer/pages/MatchControlPage.jsx`

**Шаги:**

1. Оберните компонент в `React.memo`:

```javascript
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// В конце файла, перед export:
const MatchControlPageMemo = React.memo(MatchControlPage);
export default MatchControlPageMemo;
```

2. Мемоизируйте вычисляемые значения:

```javascript
// Внутри компонента, после получения match из useMatch:
const formattedDate = useMemo(() => formatDate(match?.date), [match?.date]);

const teamAColor = useMemo(() => match?.teamA?.color || "#3498db", [match?.teamA?.color]);
const teamBColor = useMemo(() => match?.teamB?.color || "#e74c3c", [match?.teamB?.color]);
```

3. Мемоизируйте обработчики событий:

```javascript
const handleFinishSet = useCallback(() => {
  if (!canFinish) {
    const threshold = match?.currentSet?.setNumber === 5 ? 15 : 25;
    alert(
      `Партия не может быть завершена. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`
    );
    return;
  }

  if (window.confirm("Завершить текущую партию?")) {
    finishSet();
  }
}, [canFinish, match?.currentSet?.setNumber, finishSet]);
```

4. Разбейте большой компонент на меньшие:

```javascript
// Создайте отдельный компонент для статистики
const StatisticsSection = React.memo(({ match, changeStatistics, toggleStatistics }) => {
  // ... код статистики ...
});

// Используйте в MatchControlPage:
<StatisticsSection 
  match={match} 
  changeStatistics={changeStatistics}
  toggleStatistics={toggleStatistics}
/>
```

**Чек-лист:**
- [ ] Компонент обернут в React.memo
- [ ] Вычисляемые значения мемоизированы
- [ ] Обработчики мемоизированы
- [ ] Компонент разбит на меньшие части

---

#### Инструкция 2.1.4: Оптимизация компонентов статистики

**Файл для создания:** `src/renderer/components/StatisticsSection.jsx`

**Шаги:**

1. Создайте отдельный компонент для статистики:

```javascript
import React, { useMemo, useCallback } from 'react';

const StatisticsSection = React.memo(({ 
  match, 
  changeStatistics, 
  toggleStatistics 
}) => {
  const teamAStats = useMemo(() => match?.statistics?.teamA || {}, [match?.statistics?.teamA]);
  const teamBStats = useMemo(() => match?.statistics?.teamB || {}, [match?.statistics?.teamB]);
  
  const handleStatChange = useCallback((team, category, delta, event) => {
    changeStatistics(team, category, delta, event);
  }, [changeStatistics]);
  
  // ... остальной код ...
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для оптимизации
  return (
    prevProps.match?.statistics === nextProps.match?.statistics &&
    prevProps.match?.teamA?.name === nextProps.match?.teamA?.name &&
    prevProps.match?.teamB?.name === nextProps.match?.teamB?.name
  );
});

export default StatisticsSection;
```

2. Создайте отдельный компонент для кнопок статистики:

```javascript
// src/renderer/components/StatButton.jsx
import React, { useCallback } from 'react';

const StatButton = React.memo(({ 
  label, 
  value, 
  onIncrement, 
  onDecrement 
}) => {
  const handleIncrement = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onIncrement();
  }, [onIncrement]);
  
  const handleDecrement = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onDecrement();
  }, [onDecrement]);
  
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
        <button onClick={handleDecrement} style={{ /* стили */ }}>
          -1
        </button>
        <button onClick={handleIncrement} style={{ /* стили */ }}>
          +1
        </button>
      </div>
      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
        {label}: {value}
      </div>
    </div>
  );
});

export default StatButton;
```

**Чек-лист:**
- [ ] Компонент статистики создан
- [ ] Компонент оптимизирован с React.memo
- [ ] Кнопки статистики вынесены в отдельный компонент
- [ ] Кастомная функция сравнения реализована

---

#### Инструкция 2.1.5: Измерение улучшений

**Шаги:**

1. Запишите профиль производительности ДО оптимизации
2. Запишите профиль производительности ПОСЛЕ оптимизации
3. Сравните результаты:
   - Время рендеринга
   - Количество перерисовок
   - Время выполнения операций

**Метрики для отслеживания:**
- Время рендеринга MatchControlPage
- Количество перерисовок при изменении счета
- Время обновления статистики

**Чек-лист:**
- [ ] Профиль ДО записан
- [ ] Профиль ПОСЛЕ записан
- [ ] Результаты сравнены
- [ ] Улучшения задокументированы

---

### Задача 2.2: Оптимизация работы с данными

#### Описание проблемы
Использование `JSON.parse(JSON.stringify())` для глубокого копирования неэффективно.

#### Декомпозиция задачи

**Подзадача 2.2.1:** Установка Immer  
**Подзадача 2.2.2:** Замена глубокого копирования на Immer  
**Подзадача 2.2.3:** Мемоизация тяжелых вычислений

---

#### Инструкция 2.2.1: Установка Immer

**Шаги:**

1. Установите Immer:
```bash
npm install immer
```

**Чек-лист:**
- [ ] Immer установлен
- [ ] Зависимость добавлена в package.json

---

#### Инструкция 2.2.2: Замена глубокого копирования на Immer

**Файл для изменения:** `src/renderer/hooks/useMatch.js`

**Шаги:**

1. Добавьте импорт:

```javascript
import { produce } from 'immer';
```

2. Замените использование `JSON.parse(JSON.stringify())`:

**БЫЛО:**
```javascript
const changeScore = useCallback((team, delta) => {
  setMatch(prevMatch => {
    const previousState = { ...prevMatch };
    const newMatch = { ...prevMatch };
    // ...
  });
}, []);
```

**СТАЛО:**
```javascript
const changeScore = useCallback((team, delta) => {
  setMatch(prevMatch => {
    // Сохраняем предыдущее состояние для истории
    const previousState = produce(prevMatch, draft => draft);
    
    // Создаем новое состояние с помощью Immer
    return produce(prevMatch, draft => {
      if (team === 'A') {
        const newScore = Math.max(0, draft.currentSet.scoreA + delta);
        draft.currentSet.scoreA = newScore;
        
        if (delta > 0) {
          draft.currentSet.servingTeam = 'A';
        }
      } else {
        const newScore = Math.max(0, draft.currentSet.scoreB + delta);
        draft.currentSet.scoreB = newScore;
        
        if (delta > 0) {
          draft.currentSet.servingTeam = 'B';
        }
      }
      
      draft.updatedAt = new Date().toISOString();
    });
  });
}, []);
```

3. Примените аналогичные изменения к другим функциям:
   - `changeServingTeam`
   - `finishSet`
   - `changeStatistics`

**Чек-лист:**
- [ ] Immer импортирован
- [ ] Все глубокие копирования заменены
- [ ] Код протестирован
- [ ] Производительность улучшена

---

#### Инструкция 2.2.3: Мемоизация тяжелых вычислений

**Файл для изменения:** `src/renderer/hooks/useMatch.js`

**Шаги:**

1. Мемоизируйте вычисления сетбола и матчбола:

```javascript
import { useMemo } from 'react';
import { isSetball, isMatchball, canFinishSet } from '../../shared/volleyballRules';

// Внутри компонента:
const setballInfo = useMemo(() => {
  if (!match?.currentSet) {
    return { isSetball: false, team: null };
  }
  return isSetball(
    match.currentSet.scoreA,
    match.currentSet.scoreB,
    match.currentSet.setNumber
  );
}, [match?.currentSet?.scoreA, match?.currentSet?.scoreB, match?.currentSet?.setNumber]);

const matchballInfo = useMemo(() => {
  if (!match?.currentSet || !match?.sets) {
    return { isMatchball: false, team: null };
  }
  return isMatchball(
    match.sets,
    match.currentSet.setNumber,
    match.currentSet.scoreA,
    match.currentSet.scoreB
  );
}, [
  match?.sets,
  match?.currentSet?.setNumber,
  match?.currentSet?.scoreA,
  match?.currentSet?.scoreB
]);

const canFinish = useMemo(() => {
  if (!match?.currentSet) return false;
  return canFinishSet(
    match.currentSet.scoreA,
    match.currentSet.scoreB,
    match.currentSet.setNumber
  );
}, [match?.currentSet?.scoreA, match?.currentSet?.scoreB, match?.currentSet?.setNumber]);
```

**Чек-лист:**
- [ ] Вычисления мемоизированы
- [ ] Зависимости правильно указаны
- [ ] Производительность улучшена

---

## Приоритет 3: Архитектура и качество кода

### Задача 3.1: Рефакторинг useVMix

#### Описание проблемы
Файл `useVMix.js` содержит 2693 строки и слишком много ответственности.

#### Декомпозиция задачи

**Подзадача 3.1.1:** Анализ структуры useVMix  
**Подзадача 3.1.2:** Создание хука useVMixConnection  
**Подзадача 3.1.3:** Создание хука useVMixOverlays  
**Подзадача 3.1.4:** Вынос форматирования данных  
**Подзадача 3.1.5:** Создание модулей для инпутов

---

#### Инструкция 3.1.1: Анализ структуры useVMix

**Шаги:**

1. Проанализируйте файл `src/renderer/hooks/useVMix.js`
2. Определите логические группы функций:
   - **Подключение:** `loadConfig`, `checkConnection`, `isVMixReady`
   - **Оверлеи:** `showOverlay`, `hideOverlay`, `updateOverlayStates`, `isOverlayActive`
   - **Форматирование:** `formatCurrentScoreData`, `formatLineupData`, `formatRosterData`
   - **Обновление инпутов:** `updateCurrentScoreInput`, `updateLineupInput`, `updateRosterTeamAInput`, etc.

3. Составьте план разделения

**Чек-лист:**
- [ ] Анализ выполнен
- [ ] Группы функций определены
- [ ] План разделения составлен

---

#### Инструкция 3.1.2: Создание хука useVMixConnection

**Файл для создания:** `src/renderer/hooks/useVMixConnection.js`

**Шаги:**

1. Создайте новый хук:

```javascript
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Хук для управления подключением к vMix
 */
export function useVMixConnection() {
  const [vmixConfig, setVMixConfig] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    message: 'Не подключено',
  });
  
  const vmixConfigRef = useRef(vmixConfig);
  const connectionStatusRef = useRef(connectionStatus);

  useEffect(() => {
    vmixConfigRef.current = vmixConfig;
  }, [vmixConfig]);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  const isVMixReady = useCallback(() => {
    return (
      window.electronAPI &&
      vmixConfigRef.current &&
      connectionStatusRef.current.connected
    );
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const config = await window.electronAPI.getVMixConfig();
      if (config) {
        setVMixConfig(config);
        checkConnection(config.host, config.port);
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек vMix:', error);
    }
  }, []);

  const checkConnection = useCallback(async (host, port) => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const result = await window.electronAPI.testVMixConnection(host, port);
      setConnectionStatus({
        connected: result.success,
        message: result.success
          ? 'Подключено'
          : result.error || 'Не подключено',
      });
    } catch (error) {
      setConnectionStatus({
        connected: false,
        message: 'Ошибка подключения',
      });
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    vmixConfig,
    connectionStatus,
    isVMixReady,
    loadConfig,
    checkConnection,
    vmixConfigRef,
    connectionStatusRef,
  };
}
```

2. Обновите `useVMix.js` чтобы использовать новый хук:

```javascript
import { useVMixConnection } from './useVMixConnection';

export function useVMix(match) {
  const {
    vmixConfig,
    connectionStatus,
    isVMixReady,
    vmixConfigRef,
    connectionStatusRef,
  } = useVMixConnection();
  
  // ... остальной код ...
}
```

**Чек-лист:**
- [ ] Хук создан
- [ ] Логика подключения вынесена
- [ ] useVMix обновлен
- [ ] Код протестирован

---

#### Инструкция 3.1.3: Создание хука useVMixOverlays

**Файл для создания:** `src/renderer/hooks/useVMixOverlays.js`

**Шаги:**

1. Создайте хук для управления оверлеями:

```javascript
import { useState, useEffect, useCallback, useRef } from 'react';

const OVERLAY_UPDATE_DELAY = 300;
const OVERLAY_POLL_INTERVAL = 2000;

/**
 * Хук для управления оверлеями vMix
 */
export function useVMixOverlays(vmixConfig, connectionStatus, isVMixReady) {
  const [overlayStates, setOverlayStates] = useState({});
  const [inputsMap, setInputsMap] = useState({});
  const activeButtonRef = useRef({});

  const updateOverlayStates = useCallback(async () => {
    try {
      if (!isVMixReady()) {
        return;
      }
      const result = await window.electronAPI.getVMixOverlayState();
      if (result.success && result.overlays) {
        setOverlayStates(result.overlays);
        if (result.inputsMap) {
          setInputsMap(result.inputsMap);
        }
        // ... логика обновления activeButtonRef ...
      }
    } catch (error) {
      console.error('Ошибка при обновлении состояния оверлеев:', error);
    }
  }, [isVMixReady]);

  const scheduleOverlayUpdate = useCallback(() => {
    setTimeout(() => {
      updateOverlayStates();
    }, OVERLAY_UPDATE_DELAY);
  }, [updateOverlayStates]);

  useEffect(() => {
    if (vmixConfig && connectionStatus.connected) {
      const interval = setInterval(() => {
        updateOverlayStates();
      }, OVERLAY_POLL_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [vmixConfig, connectionStatus.connected, updateOverlayStates]);

  const showOverlay = useCallback(async (inputKey, buttonKey = null) => {
    // ... логика показа оверлея ...
  }, [vmixConfig, isVMixReady]);

  const hideOverlay = useCallback(async (inputKey) => {
    // ... логика скрытия оверлея ...
  }, [isVMixReady, scheduleOverlayUpdate]);

  const isOverlayActive = useCallback((inputKey, buttonKey = null) => {
    // ... логика проверки активности ...
  }, [vmixConfig, overlayStates, inputsMap]);

  return {
    overlayStates,
    inputsMap,
    showOverlay,
    hideOverlay,
    isOverlayActive,
    scheduleOverlayUpdate,
    activeButtonRef,
  };
}
```

**Чек-лист:**
- [ ] Хук создан
- [ ] Логика оверлеев вынесена
- [ ] useVMix обновлен
- [ ] Код протестирован

---

#### Инструкция 3.1.4: Вынос форматирования данных

**Файл для создания:** `src/renderer/utils/vmix/formatters.js`

**Шаги:**

1. Создайте модуль для форматирования:

```javascript
/**
 * Утилиты для форматирования данных для vMix
 */

const FIELD_TYPES = {
  TEXT: 'text',
  COLOR: 'color',
  VISIBILITY: 'visibility',
  IMAGE: 'image',
};

/**
 * Форматирует данные текущего счета для vMix
 */
export function formatCurrentScoreData(match, inputConfig, calculateSetsScore, normalizeColor) {
  if (!match || !inputConfig?.fields) {
    return { fields: {}, colorFields: {}, visibilityFields: {} };
  }

  const fields = {};
  const colorFields = {};
  const visibilityFields = {};
  const setsScoreA = calculateSetsScore(match, 'A');
  const setsScoreB = calculateSetsScore(match, 'B');
  const servingTeam = match.currentSet?.servingTeam || null;

  Object.entries(inputConfig.fields).forEach(([fieldKey, fieldConfig]) => {
    if (fieldConfig.enabled === false || !fieldConfig.fieldIdentifier) {
      return;
    }

    const fieldIdentifier = fieldConfig.fieldIdentifier;

    // ... логика форматирования ...
  });

  return { fields, colorFields, visibilityFields };
}

/**
 * Форматирует данные заявки для vMix
 */
export async function formatLineupData(match, inputConfig, logoBaseUrl, forceUpdate = false) {
  // ... логика форматирования ...
}

// Экспортируйте другие функции форматирования
```

2. Обновите `useVMix.js` чтобы использовать эти функции

**Чек-лист:**
- [ ] Модуль создан
- [ ] Функции форматирования вынесены
- [ ] useVMix обновлен
- [ ] Код протестирован

---

## Чек-листы проверки

### Общий чек-лист рефакторинга

#### Безопасность
- [ ] Все XSS уязвимости исправлены
- [ ] Валидация входных данных добавлена
- [ ] Rate limiting настроен
- [ ] Проверка размера файлов реализована
- [ ] Тесты безопасности пройдены

#### Производительность
- [ ] React компоненты оптимизированы
- [ ] Мемоизация применена где необходимо
- [ ] Immer используется вместо JSON.parse(JSON.stringify())
- [ ] Профилирование выполнено
- [ ] Метрики улучшены

#### Архитектура
- [ ] useVMix разбит на меньшие хуки
- [ ] Форматирование вынесено в отдельные модули
- [ ] Константы вынесены
- [ ] Код структурирован

#### Качество кода
- [ ] ESLint настроен
- [ ] Prettier настроен
- [ ] Тесты написаны
- [ ] Документация обновлена

---

### Чек-лист перед коммитом

- [ ] Все тесты проходят
- [ ] Линтер не выдает ошибок
- [ ] Код отформатирован
- [ ] Документация обновлена
- [ ] Изменения протестированы вручную
- [ ] Нет console.log в production коде
- [ ] Нет закомментированного кода

---

## Порядок выполнения рефакторинга

### Фаза 1: Критические исправления (1-2 недели)
1. Задача 1.1: Исправление XSS
2. Задача 1.2: Валидация входных данных
3. Задача 1.3: Проверка размера файлов

### Фаза 2: Производительность (2-3 недели)
1. Задача 2.1: Оптимизация React компонентов
2. Задача 2.2: Оптимизация работы с данными

### Фаза 3: Архитектура (3-4 недели)
1. Задача 3.1: Рефакторинг useVMix
2. Задача 3.2: Унификация модулей
3. Задача 3.3: Добавление типизации

### Фаза 4: Дополнительные улучшения (1-2 недели)
1. Задача 4.1: Lazy loading
2. Задача 4.2: Удаление неиспользуемого кода
3. Задача 4.3: Настройка форматирования

---

## Рекомендации

1. **Выполняйте рефакторинг постепенно** - не пытайтесь исправить все сразу
2. **Пишите тесты перед рефакторингом** - это поможет убедиться, что функциональность не сломалась
3. **Коммитьте часто** - небольшие коммиты легче откатывать
4. **Тестируйте после каждого изменения** - не накапливайте проблемы
5. **Документируйте изменения** - обновляйте CHANGELOG.md

---

**Дата создания:** 2024  
**Версия:** 1.0
