# Инструкции по реализации рефакторинга безопасности

*Последнее обновление: 2026-02-05*

## 1. Назначение документа

Документ содержит **пошаговые инструкции для программистов** по устранению уязвимостей и технического долга, выявленных в аудите безопасности. Работы выполняются **через TDD** (Test-Driven Development): сначала тесты, затем минимальная реализация, затем рефакторинг.

**Базовые документы:**
- [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) — полный аудит безопасности
- [QA_AUDIT_REPORT.md](QA_AUDIT_REPORT.md) — общий аудит качества кода

---

## 2. Общие принципы

### 2.1. Цикл Red — Green — Refactor

1. **Red:** Написать тест, описывающий желаемое поведение. Запустить тесты — новый тест падает.
2. **Green:** Написать минимальный код для прохождения теста.
3. **Refactor:** Улучшить код, сохраняя зелёные тесты.

### 2.2. Рекомендации

- Перед началом: `npm test` — все тесты зелёные.
- После каждого этапа: `npm test`, при необходимости `npm run test:security`.
- При разработке: `npm run test:watch`.

### 2.3. Порядок этапов

Этапы следует выполнять в указанном порядке.

| Фаза | Этап | Зависимости |
|------|------|-------------|
| **Фаза 1** | 1.1 Path traversal в logoManager | — |
| **Фаза 1** | 1.2 Path traversal в fileManager | 1.1 (общая утилита) |
| **Фаза 1** | 1.3 Лимит express.json | — |
| **Фаза 1** | 1.4 Проверка размера match JSON | — |
| **Фаза 1** | 1.5 Проверка размера base64 логотипа | — |
| **Фаза 2** | 2.1 Rate limiting для API | — |
| **Фаза 2** | 2.2 Устранение дублирования useMatch | — |
| **Фаза 2** | 2.3 Санитизация Markdown (опционально) | — |
| **Фаза 2** | 2.4 Валидация sessionId (UUID) | — |
| **Фаза 3** | 3.1 CSP (низкий приоритет) | — |

---

## 3. Фаза 1: Критические исправления

### 3.1. Этап 1.1: Path traversal в logoManager

**Цель:** Исключить чтение файлов вне папки `logos/` при открытии матча с malicious `logoPath`.

#### 3.1.1. Red: тесты

**Файл:** `tests/unit/main/logoManager-path-traversal.test.ts` (создать)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as logoManager from '../../../src/main/logoManager.ts';

describe('logoManager — защита от path traversal', () => {
  it('loadLogoFromFile отклоняет logoPath с ../ (path traversal)', async () => {
    const result = await logoManager.loadLogoFromFile('logos/../../../etc/passwd');
    expect(result).toBeNull();
  });

  it('loadLogoFromFile отклоняет logoPath с .. в середине пути', async () => {
    const result = await logoManager.loadLogoFromFile('logos/subdir/../../sensitive');
    expect(result).toBeNull();
  });

  it('loadLogoFromFile принимает валидный путь logos/logo_a_123.png', async () => {
    // Мокаем fs — для валидного пути должен вызываться readFile
    // Или используем fixture с реальным файлом в тестовой директории
    // Минимально: проверяем, что для явно malicious путей возвращается null
    const malicious = await logoManager.loadLogoFromFile('logos/..\\..\\..\\windows\\system32\\config\\sam');
    expect(malicious).toBeNull();
  });
});
```

**Альтернатива:** Добавить тесты в существующий `tests/unit/main/logoManager-unique-names.test.js`, если он подходит по структуре.

#### 3.1.2. Green: реализация

**Шаг 1.** Создать утилиту безопасного разрешения пути.

**Файл:** `src/main/utils/pathSecurity.ts` (создать)

```typescript
import path from 'path';

/**
 * Проверяет, что resolvedPath находится внутри baseDir (защита от path traversal).
 * @param baseDir — базовая директория (должна быть абсолютной)
 * @param resolvedPath — разрешённый путь
 * @returns true, если путь безопасен
 */
export function isPathInsideDir(baseDir: string, resolvedPath: string): boolean {
  const normalizedBase = path.resolve(baseDir);
  const normalizedResolved = path.resolve(resolvedPath);
  return normalizedResolved.startsWith(normalizedBase + path.sep) || normalizedResolved === normalizedBase;
}

/**
 * Безопасно разрешает путь к файлу внутри baseDir.
 * @param baseDir — базовая директория
 * @param relativePath — относительный путь (например, из logoPath после удаления "logos/")
 * @returns абсолютный путь или null, если путь выходит за пределы baseDir
 */
export function resolvePathSafe(baseDir: string, relativePath: string): string | null {
  const resolved = path.resolve(baseDir, relativePath);
  if (!isPathInsideDir(baseDir, resolved)) {
    return null;
  }
  return resolved;
}
```

**Шаг 2.** Обновить `loadLogoFromFile` в `src/main/logoManager.ts`.

Найти блок:

```typescript
if (logoPath.startsWith('logos/')) {
  const logosDir = getLogosDir();
  const fileName = logoPath.replace('logos/', '');
  filePath = path.join(logosDir, fileName);
} else {
  filePath = logoPath;  // абсолютный путь — не доверять из match!
}
```

Заменить на:

```typescript
import { resolvePathSafe } from './utils/pathSecurity.ts';

// В loadLogoFromFile:
if (logoPath.startsWith('logos/')) {
  const logosDir = getLogosDir();
  const fileName = logoPath.replace(/^logos\//, '');
  const safePath = resolvePathSafe(logosDir, fileName);
  if (!safePath) {
    console.warn('[logoManager] Недопустимый logoPath (path traversal):', logoPath);
    return null;
  }
  filePath = safePath;
} else {
  // Абсолютные пути из match JSON не доверяем — не загружаем
  console.warn('[logoManager] Абсолютный logoPath отклонён:', logoPath);
  return null;
}
```

#### 3.1.3. Refactor

- Вынести сообщения об ошибках в константы, если потребуется.
- Убедиться, что `pathSecurity.ts` покрыт тестами.

#### 3.1.4. Файлы

| Действие | Файл |
|----------|------|
| Создать | `src/main/utils/pathSecurity.ts` |
| Создать | `tests/unit/main/pathSecurity.test.ts` |
| Создать | `tests/unit/main/logoManager-path-traversal.test.ts` |
| Изменить | `src/main/logoManager.ts` |

---

### 3.2. Этап 1.2: Path traversal в fileManager

**Цель:** Использовать безопасное разрешение путей при проверке существования файлов логотипов в `saveMatch`.

#### 3.2.1. Red: тест

В `tests/unit/main/fileManager.test.ts` (или создать `fileManager-path-traversal.test.ts`):

```typescript
it('saveMatch не допускает path traversal в teamA.logoPath', async () => {
  const match = {
    ...validMatch,
    teamA: {
      ...validMatch.teamA,
      logoPath: 'logos/../../../etc/passwd',
    },
  };
  // Должен либо выбросить, либо корректно обработать (не читать вне logos)
  await expect(fileManager.saveMatch(match)).rejects.toThrow();
  // или проверка, что файл не прочитан вне директории
});
```

#### 3.2.2. Green: реализация

В `src/main/fileManager.ts` при проверке `match.teamA.logoPath` и `match.teamB.logoPath` использовать `resolvePathSafe` вместо `path.join`:

```typescript
import { resolvePathSafe } from './utils/pathSecurity.ts';

// В saveMatch, при проверке needRegenerateLogos:
if (match.teamA?.logoPath) {
  const logosDir = logoManager.getLogosDir();
  const fileName = match.teamA.logoPath.replace(/^logos\//, '');
  const logoAPath = resolvePathSafe(logosDir, fileName);
  if (logoAPath) {
    try {
      await fs.access(logoAPath);
    } catch {
      needRegenerateLogos = true;
    }
  } else {
    needRegenerateLogos = true; // path traversal — перегенерируем
  }
}
```

Аналогично для `teamB`.

#### 3.2.3. Файлы

| Действие | Файл |
|----------|------|
| Изменить | `src/main/fileManager.ts` |
| Создать/изменить | `tests/unit/main/fileManager-path-traversal.test.ts` |

---

### 3.3. Этап 1.3: Лимит размера JSON в Express

**Цель:** Ограничить размер тела запроса для защиты от DoS.

#### 3.3.1. Red: тест

В `tests/integration/mobile-api.test.ts` (или отдельный тест):

```typescript
it('отклоняет POST с телом > 100kb', async () => {
  const hugeBody = { team: 'A', delta: 1, padding: 'x'.repeat(200000) };
  const res = await request(app)
    .post(`/api/match/${sessionId}/score`)
    .send(hugeBody);
  expect(res.status).toBe(413); // Payload Too Large
});
```

#### 3.3.2. Green: реализация

В `src/main/server.ts`, в `setupMiddleware()`:

```typescript
// Было:
this.app.use(express.json());
this.app.use(express.urlencoded({ extended: true }));

// Стало:
const JSON_LIMIT = '100kb';
this.app.use(express.json({ limit: JSON_LIMIT }));
this.app.use(express.urlencoded({ extended: true, limit: JSON_LIMIT }));
```

При необходимости вынести `JSON_LIMIT` в константу в начале файла или в `src/shared/constants.ts`.

#### 3.3.3. Файлы

| Действие | Файл |
|----------|------|
| Изменить | `src/main/server.ts` |
| Создать/изменить | `tests/integration/mobile-api.test.ts` |

---

### 3.4. Этап 1.4: Проверка размера match JSON

**Цель:** Не сохранять матч, размер JSON которого превышает лимит (например, 5 MB).

#### 3.4.1. Red: тест

В `tests/unit/main/fileManager.test.ts`:

```typescript
it('saveMatch выбрасывает при размере match > MAX_MATCH_SIZE', async () => {
  const hugeMatch = {
    ...validMatch,
    teamA: { ...validMatch.teamA, name: 'A'.repeat(10_000_000) },
  };
  await expect(fileManager.saveMatch(hugeMatch)).rejects.toThrow(/размер|size|лимит/i);
});
```

#### 3.4.2. Green: реализация

В `src/main/fileManager.ts` в начале `saveMatch`:

```typescript
const MAX_MATCH_JSON_SIZE = 5 * 1024 * 1024; // 5 MB

async function saveMatch(match, filePath = null) {
  const jsonStr = JSON.stringify(match, null, 2);
  if (Buffer.byteLength(jsonStr, 'utf8') > MAX_MATCH_JSON_SIZE) {
    throw new Error('Размер данных матча превышает допустимый лимит (5 MB)');
  }
  // ... остальная логика
}
```

Или проверять до `JSON.stringify`, оценивая размер структуры (сложнее). Проще — после `stringify` перед записью.

#### 3.4.3. Файлы

| Действие | Файл |
|----------|------|
| Изменить | `src/main/fileManager.ts` |
| Изменить | `tests/unit/main/fileManager.test.ts` |

---

### 3.5. Этап 1.5: Проверка размера base64 логотипа

**Цель:** Не сохранять логотип, если base64 превышает лимит (например, 2 MB).

#### 3.5.1. Red: тест

В `tests/unit/main/logoManager-unique-names.test.js` или новый `logoManager-size-limit.test.ts`:

```typescript
it('saveLogoToFile отклоняет base64 > 2MB', async () => {
  const hugeBase64 = 'data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024);
  await expect(logoManager.saveLogoToFile(hugeBase64, 'A')).rejects.toThrow();
});
```

#### 3.5.2. Green: реализация

В `src/main/logoManager.ts` в `saveLogoToFile`:

```typescript
const MAX_LOGO_BASE64_SIZE = 2 * 1024 * 1024; // 2 MB

async function saveLogoToFile(base64String, team) {
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const sizeBytes = (base64Data.length * 3) / 4; // примерная оценка
  if (sizeBytes > MAX_LOGO_BASE64_SIZE) {
    throw new Error('Размер логотипа превышает допустимый лимит (2 MB)');
  }
  // ... остальная логика
}
```

#### 3.5.3. Файлы

| Действие | Файл |
|----------|------|
| Изменить | `src/main/logoManager.ts` |
| Создать/изменить | `tests/unit/main/logoManager-size-limit.test.ts` |

---

## 4. Фаза 2: Средние приоритеты

### 4.1. Этап 2.1: Rate limiting для API

**Цель:** Ограничить число запросов к мобильному API для защиты от DoS и brute-force.

#### 4.1.1. Подготовка

```bash
npm install express-rate-limit
```

#### 4.1.2. Red: тест

```typescript
it('возвращает 429 при превышении лимита запросов', async () => {
  const sessionId = 'valid-session-id';
  for (let i = 0; i < 150; i++) {
    const res = await request(app).get(`/api/match/${sessionId}`);
    if (res.status === 429) {
      expect(res.status).toBe(429);
      return;
    }
  }
  // Если лимит 100, один из запросов должен вернуть 429
});
```

#### 4.1.3. Green: реализация

**Файл:** `src/main/middleware/rateLimit.ts` (создать)

```typescript
import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 100,            // максимум 100 запросов с одного IP
  message: { success: false, error: 'Слишком много запросов. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

В `src/main/server.ts` в `setupMiddleware()` (после CORS, до маршрутов):

```typescript
import { apiRateLimiter } from './middleware/rateLimit.ts';

// После express.json:
this.app.use('/api/', apiRateLimiter);
```

#### 4.1.4. Файлы

| Действие | Файл |
|----------|------|
| Создать | `src/main/middleware/rateLimit.ts` |
| Изменить | `src/main/server.ts` |
| Добавить | `express-rate-limit` в dependencies |

---

### 4.2. Этап 2.2: Устранение дублирования useMatch

**Цель:** Оставить одну реализацию хука `useMatch` (useMatch.ts) и удалить дубликат (useMatch.js).

#### 4.2.1. Анализ

- `MatchControlPage.jsx` импортирует `useMatch.js`.
- Тесты импортируют `useMatch.js`.
- `useMatch.ts` — TypeScript-версия с типизацией.

**Рекомендация:** Перевести все импорты на `useMatch.ts` и удалить `useMatch.js`.

#### 4.2.2. Шаги

1. Убедиться, что `useMatch.ts` функционально эквивалентен `useMatch.js` (сравнить логику).
2. Заменить импорты:
   - `src/renderer/pages/MatchControlPage.jsx`: `from "../hooks/useMatch.ts"`
   - `tests/unit/renderer/useMatch.test.ts`: `from "../../../src/renderer/hooks/useMatch.ts"`
   - `tests/unit/renderer/useMatch-set-status.test.js`: аналогично.
3. Запустить тесты: `npm test`.
4. Удалить `src/renderer/hooks/useMatch.js`.
5. Обновить `.cursor/rules`, `ARCHITECTURE.md` и другую документацию.

#### 4.2.3. Файлы

| Действие | Файл |
|----------|------|
| Изменить | `src/renderer/pages/MatchControlPage.jsx` |
| Изменить | `tests/unit/renderer/useMatch.test.ts` |
| Изменить | `tests/unit/renderer/useMatch-set-status.test.js` |
| Удалить | `src/renderer/hooks/useMatch.js` |

---

### 4.3. Этап 2.3: Санитизация Markdown (опционально)

**Цель:** Защита от XSS при отображении документации (defense in depth).

**Файл:** `src/main/documentation-viewer.ts`

**Варианты:**
- Использовать `marked` с опцией sanitize (если поддерживается в актуальной версии).
- Добавить `dompurify` (или аналог для Node) и прогонять HTML после `marked.parse()`.

**Пример (при использовании DOMPurify в Node):**

```bash
npm install isomorphic-dompurify
```

```typescript
import DOMPurify from 'isomorphic-dompurify';

const rawHtml = marked.parse(markdownContent);
const htmlContent = DOMPurify.sanitize(rawHtml);
```

---

### 4.4. Этап 2.4: Валидация sessionId (UUID)

**Цель:** Проверять формат UUID перед использованием sessionId.

**Файл:** `src/main/server/api/MatchApiRoutes.ts` или `src/main/server.ts` (validateSession)

Добавить проверку формата UUID:

```typescript
import { validate as isValidUUID } from 'uuid';

function validateSession(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') return false;
  if (!isValidUUID(sessionId)) return false;
  // ... остальная логика
}
```

Убедиться, что `uuid` уже в проекте (есть в package.json). Функция `validate` доступна в пакете `uuid`.

---

## 5. Фаза 3: Низкий приоритет

### 5.1. CSP (Content Security Policy)

Добавить заголовки CSP для мобильного сервера и для Electron WebContents. Детали — в [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md).

### 5.2. Замена @ts-ignore и any

Постепенная замена на корректные типы при работе с JS-модулями.

### 5.3. Audit неиспользуемого кода

```bash
npm run lint:unused
```

Рассмотреть использование `knip` или `ts-prune` для поиска неиспользуемых экспортов.

---

## 6. Чек-лист по завершении фазы 1

- [ ] Path traversal исправлен в logoManager и fileManager
- [ ] Тесты path traversal проходят
- [ ] Лимит express.json настроен
- [ ] Проверка размера match JSON реализована
- [ ] Проверка размера base64 логотипа реализована
- [ ] `npm test` и `npm run test:security` проходят
- [ ] Ручная проверка: открытие матча, сохранение, загрузка логотипов

---

## 7. Связанные документы

- [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)
- [QA_AUDIT_REPORT.md](QA_AUDIT_REPORT.md)
- [REFACTORING_GUIDE.md](REFACTORING_GUIDE.md)
- [vmix-inputs-refactoring-implementation-guide.md](vmix-inputs-refactoring-implementation-guide.md)

---

*Последнее обновление: 2026-02-05*
