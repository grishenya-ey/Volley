# Защита Electron приложения от декомпиляции

*Последнее обновление: 2026-01-23*

## Обзор

Electron приложения уязвимы для декомпиляции, так как JavaScript код хранится в открытом виде в ASAR архивах. Полная защита невозможна, но можно значительно усложнить процесс декомпиляции.

## ⚠️ Важные замечания

1. **Полная защита невозможна** - JavaScript код всегда можно извлечь и проанализировать
2. **Защита усложняет отладку** - обфусцированный код сложнее отлаживать
3. **Баланс безопасности и удобства** - выбирайте уровень защиты в зависимости от критичности кода
4. **ASAR архивы легко распаковываются** - `asar extract app.asar output/`

## Доступные варианты защиты

### 1. Обфускация кода (Code Obfuscation)

**Уровень защиты:** ⭐⭐⭐ (Средний)

Обфускация делает код нечитаемым, но не защищает от извлечения.

#### Варианты:

##### A. JavaScript Obfuscator (рекомендуется)

**Пакет:** `javascript-obfuscator`

**Установка:**
```bash
npm install --save-dev javascript-obfuscator
```

**Настройка в Vite:**

Создайте плагин `vite-plugin-obfuscator.js`:
```javascript
import { obfuscate } from 'javascript-obfuscator';
import { createFilter } from 'vite';

export default function obfuscatorPlugin(options = {}) {
  const filter = createFilter(options.include || ['**/*.js'], options.exclude);
  
  return {
    name: 'vite-plugin-obfuscator',
    enforce: 'post',
    generateBundle(options, bundle) {
      for (const fileName in bundle) {
        if (bundle[fileName].type === 'chunk' && filter(fileName)) {
          const chunk = bundle[fileName];
          const obfuscationResult = obfuscate(chunk.code, {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            debugProtection: false, // Может вызывать проблемы в Electron
            debugProtectionInterval: 0,
            disableConsoleOutput: false,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: true,
            renameGlobals: false,
            selfDefending: true,
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 10,
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayEncoding: ['base64'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 2,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 4,
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 0.75,
            transformObjectKeys: true,
            unicodeEscapeSequence: false
          });
          chunk.code = obfuscationResult.getObfuscatedCode();
        }
      }
    }
  };
}
```

**Использование в `vite.config.main.js`:**
```javascript
import obfuscatorPlugin from './vite-plugin-obfuscator.js';

export default defineConfig({
  plugins: [
    obfuscatorPlugin({
      include: ['**/*.js'],
      exclude: ['node_modules/**']
    })
  ],
  // ... остальная конфигурация
});
```

**Плюсы:**
- Хорошая защита от чтения кода
- Настраиваемый уровень обфускации
- Работает с Vite

**Минусы:**
- Увеличивает размер бандла
- Может замедлить выполнение
- Сложнее отлаживать

##### B. Terser (минимальная обфускация)

**Пакет:** `terser` (уже используется Vite для минификации)

**Настройка в `vite.config.js`:**
```javascript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true, // Удаляет console.log
      drop_debugger: true,
      passes: 3 // Множественные проходы для лучшей минификации
    },
    mangle: {
      toplevel: true,
      properties: {
        regex: /^_/ // Обфусцирует свойства, начинающиеся с _
      }
    },
    format: {
      comments: false // Удаляет комментарии
    }
  }
}
```

**Плюсы:**
- Уже встроен в Vite
- Быстрая работа
- Уменьшает размер бандла

**Минусы:**
- Слабая защита (только минификация)
- Легко читается после форматирования

### 2. Компиляция в Bytecode (bytenode)

**Уровень защиты:** ⭐⭐⭐⭐ (Высокий)

Компиляция JavaScript в V8 bytecode делает код практически нечитаемым.

**Пакет:** `bytenode`

**Установка:**
```bash
npm install --save-dev bytenode
```

**Создайте скрипт `scripts/compile-bytecode.js`:**
```javascript
import bytenode from 'bytenode';
import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join, dirname, extname } from 'path';

async function compileFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const compiled = bytenode.compileCode(content);
  const outputPath = filePath.replace('.js', '.jsc');
  await writeFile(outputPath, compiled);
  console.log(`Compiled: ${filePath} -> ${outputPath}`);
}

async function compileDirectory(dir) {
  const files = await readdir(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      await compileDirectory(filePath);
    } else if (file.endsWith('.js') && !file.endsWith('.jsc')) {
      await compileFile(filePath);
    }
  }
}

// Компилируем dist/main.js и другие критические файлы
await compileDirectory('./dist');
```

**Изменения в `src/main/main.ts`:**
```typescript
// В начале файла
import bytenode from 'bytenode';
bytenode.runBytecodeFile('./dist/main.jsc');
```

**Плюсы:**
- Очень высокая защита
- Код практически нечитаем
- Работает с Node.js

**Минусы:**
- Требует изменения кода для загрузки .jsc файлов
- Может быть несовместим с некоторыми модулями
- Сложнее отлаживать
- Зависит от версии Node.js

### 3. Нативные модули для критических частей

**Уровень защиты:** ⭐⭐⭐⭐⭐ (Очень высокий)

Критические части кода (алгоритмы, ключи API) можно вынести в нативные модули (C++).

**Пример структуры:**
```
src/
  native/
    binding.gyp
    src/
      encryption.cpp
      validation.cpp
```

**Создание нативного модуля:**

1. Установите `node-gyp`:
```bash
npm install -g node-gyp
```

2. Создайте `binding.gyp`:
```json
{
  "targets": [
    {
      "target_name": "native_module",
      "sources": [ "src/encryption.cpp" ],
      "include_dirs": ["<!(node -e \"require('nan')\")"]
    }
  ]
}
```

3. Используйте в коде:
```javascript
const native = require('./native/build/Release/native_module.node');
const encrypted = native.encryptData(data);
```

**Плюсы:**
- Максимальная защита
- Высокая производительность
- Невозможно декомпилировать без специальных инструментов

**Минусы:**
- Требует знания C++
- Сложнее поддерживать
- Нужна компиляция для каждой платформы
- Увеличивает размер приложения

### 4. Шифрование ASAR архива

**Уровень защиты:** ⭐⭐ (Низкий-Средний)

Шифрование ASAR архива с расшифровкой при запуске.

**Пакет:** `asar-encrypt` (неофициальный) или кастомное решение

**Принцип работы:**
1. Шифруете ASAR архив перед упаковкой
2. При запуске расшифровываете в памяти
3. Electron загружает расшифрованный архив

**Плюсы:**
- Усложняет извлечение ASAR
- Работает с существующим кодом

**Минусы:**
- Ключ расшифровки должен быть в приложении
- Можно извлечь ключ из кода
- Может замедлить запуск

### 5. Vite с дополнительными настройками

**Уровень защиты:** ⭐⭐ (Низкий)

Оптимизация сборки для усложнения анализа.

**Настройки в `vite.config.js`:**
```javascript
build: {
  // Минификация
  minify: 'terser',
  
  // Удаление source maps в production
  sourcemap: false,
  
  // Разделение кода на чанки
  rollupOptions: {
    output: {
      // Именование файлов без информации о содержимом
      entryFileNames: 'assets/[hash].js',
      chunkFileNames: 'assets/[hash].js',
      assetFileNames: 'assets/[hash].[ext]',
      
      // Удаление комментариев
      compact: true
    }
  },
  
  // Удаление console.log в production
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true
    }
  }
}
```

**Плюсы:**
- Простая настройка
- Уменьшает размер бандла
- Удаляет отладочную информацию

**Минусы:**
- Слабая защита
- Легко обходится

### 6. Динамическая загрузка критичных компонентов

**Уровень защиты:** ⭐⭐⭐⭐ (Высокий)

Критичные компоненты загружаются динамически только после успешной авторизации или проверки лицензии.

#### Принцип работы

1. **Разделение кода:**
   - Базовый код (UI, общие компоненты) - в основном бандле
   - Критичный код (бизнес-логика, API клиенты) - в отдельных файлах
   - Критичные файлы хранятся отдельно или зашифрованы

2. **Загрузка после авторизации:**
   - При запуске загружается только базовый функционал
   - После успешной авторизации/проверки лицензии загружаются критичные модули
   - Критичные модули могут быть зашифрованы и расшифровываться при загрузке

3. **Варианты реализации:**
   - Загрузка с удаленного сервера (требует интернет)
   - Загрузка из зашифрованных локальных файлов
   - Загрузка из отдельного ASAR архива, защищенного паролем

#### Пример реализации для Electron

**Структура проекта:**
```
dist/
  main.js (базовый код)
  app.asar (UI и общие компоненты)
  protected/
    vmix-client.encrypted (зашифрованный критичный модуль)
    business-logic.encrypted
```

**1. Создание защищенного модуля:**

```javascript
// src/main/protected/vmix-client-protected.js
// Этот файл НЕ включается в основной бандл

export class ProtectedVMixClient {
  constructor() {
    // Критичная логика работы с vMix API
    this.apiKey = this.decryptApiKey();
  }

  async sendCommand(command) {
    // Защищенная логика отправки команд
  }

  decryptApiKey() {
    // Логика расшифровки ключа
  }
}
```

**2. Шифрование модуля перед сборкой:**

Создайте скрипт `scripts/encrypt-protected-modules.js`:
```javascript
import { createCipheriv, randomBytes } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const algorithm = 'aes-256-gcm';
const password = process.env.ENCRYPTION_KEY || 'your-secret-key';

async function encryptFile(inputPath, outputPath) {
  const data = await readFile(inputPath, 'utf-8');
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = randomBytes(16);
  
  const cipher = createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  await writeFile(outputPath, JSON.stringify({
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  }));
}

// Шифруем критичные модули
await encryptFile(
  './src/main/protected/vmix-client-protected.js',
  './dist/protected/vmix-client.encrypted'
);
```

**3. Загрузка и расшифровка в runtime:**

```typescript
// src/main/protected-module-loader.ts
import { createDecipheriv } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';

export class ProtectedModuleLoader {
  private encryptionKey: string;
  private isAuthorized: boolean = false;

  constructor() {
    // Ключ может быть получен после авторизации
    this.encryptionKey = this.getEncryptionKey();
  }

  async authorize(credentials: any): Promise<boolean> {
    // Проверка авторизации (лицензия, API ключ и т.д.)
    const isValid = await this.validateCredentials(credentials);
    
    if (isValid) {
      this.isAuthorized = true;
      // Получаем ключ расшифровки после успешной авторизации
      this.encryptionKey = await this.fetchDecryptionKey(credentials);
      return true;
    }
    
    return false;
  }

  async loadProtectedModule(moduleName: string): Promise<any> {
    if (!this.isAuthorized) {
      throw new Error('Not authorized to load protected modules');
    }

    const encryptedPath = join(
      app.isPackaged 
        ? process.resourcesPath 
        : __dirname,
      'protected',
      `${moduleName}.encrypted`
    );

    const encryptedData = JSON.parse(
      await readFile(encryptedPath, 'utf-8')
    );

    // Расшифровка
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Выполнение расшифрованного кода
    const moduleExports = {};
    const module = { exports: moduleExports };
    const exports = moduleExports;
    
    // Безопасное выполнение кода
    const fn = new Function('module', 'exports', 'require', decrypted);
    fn(module, exports, require);

    return module.exports;
  }

  private getEncryptionKey(): string {
    // Ключ может быть:
    // 1. Получен с сервера после авторизации
    // 2. Вычислен на основе лицензионного ключа
    // 3. Храниться в зашифрованном виде в настройках
    return process.env.ENCRYPTION_KEY || '';
  }

  private async validateCredentials(credentials: any): Promise<boolean> {
    // Проверка лицензии, API ключа и т.д.
    // Может быть локальной или удаленной
    return true; // Заглушка
  }

  private async fetchDecryptionKey(credentials: any): Promise<string> {
    // Получение ключа с сервера или вычисление на основе credentials
    return 'decryption-key-from-server';
  }
}
```

**4. Использование в main процессе:**

```typescript
// src/main/main.ts
import { ProtectedModuleLoader } from './protected-module-loader';

const loader = new ProtectedModuleLoader();

// При запуске приложения
app.whenReady().then(async () => {
  // Создаем окно
  const mainWindow = createWindow();

  // Показываем экран авторизации
  mainWindow.loadFile('auth.html');

  // Ждем авторизации
  ipcMain.handle('authorize', async (event, credentials) => {
    const authorized = await loader.authorize(credentials);
    
    if (authorized) {
      // Загружаем критичные модули
      const vmixClient = await loader.loadProtectedModule('vmix-client');
      
      // Инициализируем защищенный функционал
      initializeProtectedFeatures(vmixClient);
      
      // Переходим к основному интерфейсу
      mainWindow.loadFile('index.html');
    }
    
    return authorized;
  });
});
```

#### Альтернатива: Загрузка с удаленного сервера

**Преимущества:**
- Критичный код не хранится локально
- Можно обновлять без пересборки приложения
- Полный контроль доступа

**Недостатки:**
- Требует интернет-соединение
- Зависимость от сервера
- Возможны проблемы с производительностью

**Реализация:**

```typescript
async function loadProtectedModuleFromServer(moduleName: string, authToken: string) {
  const response = await fetch(`https://api.example.com/modules/${moduleName}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to load protected module');
  }

  const encryptedModule = await response.text();
  // Расшифровка и выполнение
  return decryptAndExecute(encryptedModule);
}
```

#### Плюсы динамической загрузки

- **Высокая защита** - критичный код не доступен без авторизации
- **Гибкость** - можно обновлять модули без пересборки
- **Контроль доступа** - полный контроль над тем, кто может использовать функционал
- **Разделение ответственности** - базовый код отделен от критичного

#### Минусы динамической загрузки

- **Сложность реализации** - требует дополнительной инфраструктуры
- **Зависимость от авторизации** - приложение не работает без авторизации
- **Производительность** - загрузка модулей может замедлить запуск
- **Уязвимость ключа** - ключ расшифровки все равно должен быть доступен
- **Опытные реверс-инженеры** - могут перехватить модуль при загрузке

#### Рекомендации

1. **Комбинируйте с другими методами:**
   - Обфускация загружаемых модулей
   - Шифрование с ключом, полученным с сервера
   - Проверка целостности модулей

2. **Используйте для критичных частей:**
   - API клиенты
   - Алгоритмы расчета
   - Логика валидации
   - Интеграции с внешними сервисами

3. **Не используйте для:**
   - UI компонентов
   - Общих утилит
   - Кода, который должен работать офлайн

4. **Безопасность ключа:**
   - Не храните ключ в коде
   - Получайте ключ с сервера после авторизации
   - Используйте временные ключи (токены)
   - Проверяйте целостность модулей

### 7. Комбинированный подход (рекомендуется)

**Уровень защиты:** ⭐⭐⭐⭐⭐ (Очень высокий)

Комбинация нескольких методов для максимальной защиты.

**Рекомендуемая стратегия:**

1. **Базовый уровень:**
   - Vite с минификацией и удалением source maps
   - Terser с агрессивными настройками
   - Удаление console.log и комментариев

2. **Средний уровень:**
   - JavaScript Obfuscator для критических модулей
   - Шифрование чувствительных данных (API ключи, пароли)
   - Динамическая загрузка критичных компонентов после авторизации

3. **Высокий уровень:**
   - Нативные модули для критических алгоритмов
   - bytenode для main процесса
   - Обфускация renderer процесса
   - Загрузка критичных модулей с сервера с проверкой лицензии

## Рекомендации для вашего проекта

### Текущая ситуация

Ваше приложение использует:
- Electron + Vite
- ASAR архивы (`"asar": true`)
- JavaScript/TypeScript код
- electron-builder для сборки

### Рекомендуемый план защиты

#### Этап 1: Базовая защита (быстро, легко)

1. **Включить агрессивную минификацию в Vite:**
```javascript
// vite.config.js
build: {
  minify: 'terser',
  sourcemap: false,
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true,
      passes: 3
    },
    mangle: {
      toplevel: true
    }
  }
}
```

2. **Удалить source maps из production:**
```javascript
// Убедитесь, что sourcemap: false в production
```

#### Этап 2: Обфускация (средняя сложность)

1. **Установить javascript-obfuscator:**
```bash
npm install --save-dev javascript-obfuscator
```

2. **Создать плагин для Vite** (см. пример выше)

3. **Применить только к критическим файлам:**
   - `src/main/main.ts` - главный процесс
   - `src/main/settingsManager.ts` - управление настройками
   - `src/main/vmix-client.ts` - работа с vMix API

#### Этап 3: Динамическая загрузка критичных компонентов (опционально, для высокого уровня защиты)

1. **Разделение кода:**
   - Выделить критичные модули (vmix-client, бизнес-логика)
   - Создать систему авторизации/проверки лицензии
   - Реализовать загрузку модулей после авторизации

2. **Шифрование модулей:**
   - Шифровать критичные модули перед сборкой
   - Расшифровывать при загрузке после авторизации
   - Использовать ключ, полученный с сервера или вычисленный на основе лицензии

3. **Преимущества для вашего проекта:**
   - Защита логики работы с vMix API
   - Контроль доступа к функционалу
   - Возможность обновления модулей без пересборки

#### Этап 4: Дополнительные меры (опционально)

1. **Шифрование чувствительных данных:**
   - API ключи (если будут)
   - Пароли (если будут)
   - Используйте `crypto` модуль Node.js

2. **Нативные модули для критических алгоритмов:**
   - Только если есть действительно критичные алгоритмы
   - Для вашего проекта, вероятно, не требуется

## Практические советы

### Что защищать в первую очередь

1. **Критический бизнес-логика:**
   - Алгоритмы расчета счета
   - Логика валидации
   - Интеграция с vMix API

2. **Чувствительные данные:**
   - API ключи (если есть)
   - Конфигурация серверов
   - Логика авторизации

3. **Main процесс:**
   - Код main процесса более критичен, чем renderer
   - Renderer процесс можно анализировать через DevTools

### Что НЕ нужно защищать

1. **UI компоненты** - они все равно видны пользователю
2. **Стандартные библиотеки** - их код открыт
3. **Конфигурационные файлы** - они не критичны

### Тестирование защиты

После применения защиты:

1. **Проверьте работоспособность:**
   ```bash
   npm run build:electron
   # Запустите собранное приложение
   ```

2. **Попробуйте извлечь ASAR:**
   ```bash
   npx asar extract app.asar extracted/
   # Проверьте, насколько сложно читать код
   ```

3. **Проверьте размер и производительность:**
   - Убедитесь, что размер не увеличился критично
   - Проверьте скорость запуска

## Ограничения и реалистичные ожидания

### Что защита НЕ может сделать

1. **Полностью скрыть код** - JavaScript всегда можно извлечь
2. **Защитить от опытных реверс-инженеров** - они все равно извлекут код
3. **Защитить от модификации** - приложение можно патчить

### Что защита МОЖЕТ сделать

1. **Усложнить анализ** - новичкам будет сложно
2. **Замедлить реверс-инжиниринг** - потребуется больше времени
3. **Защитить от автоматических инструментов** - простые скрипты не сработают
4. **Скрыть бизнес-логику** - алгоритмы будут неочевидны

## Заключение

Для вашего проекта рекомендуется:

1. **Начать с базовой защиты** (минификация, удаление source maps)
2. **Добавить обфускацию** для критических модулей
3. **Не переусердствовать** - баланс между защитой и удобством разработки

Помните: **полная защита невозможна**, но можно значительно усложнить процесс декомпиляции для большинства пользователей.

## Полезные ссылки

- [JavaScript Obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator)
- [bytenode](https://github.com/OsamaAbbas/bytenode)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [Vite Build Options](https://vitejs.dev/config/build-options.html)
