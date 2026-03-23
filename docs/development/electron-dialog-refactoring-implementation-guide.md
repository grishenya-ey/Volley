# Инструкция по рефакторингу: замена alert/confirm на IPC-диалоги (исправление бага с фокусом в полях ввода)

*Последнее обновление: 2026-02-12*

**Статус выполнения:** ✅ Фазы 0–4 выполнены (2026-02-12). Все вызовы `alert`/`confirm` в рендерере заменены на IPC-диалоги; тесты обновлены и проходят.

## 1. Назначение документа

Пошаговая **инструкция для программиста** по устранению бага Electron, при котором после вызова `alert()` или `confirm()` в рендерере текстовые поля перестают принимать ввод. Решение: перенос показа сообщений и подтверждений в main-процесс через `dialog.showMessageBox` и вызов из рендерера по IPC.

**Подход:** TDD (Test-Driven Development) — сначала тесты, затем минимальная реализация, затем замена вызовов по файлам.

**Базовый документ:** [electron-input-focus-bug.md](../troubleshooting/electron-input-focus-bug.md) — анализ проблемы, причины, список затронутых файлов.

---

## 2. Общие принципы

### 2.1. Цикл Red — Green — Refactor

1. **Red:** Написать или дополнить тест под желаемое поведение. Запустить тесты — новый/изменённый тест падает.
2. **Green:** Реализовать минимальный код, чтобы тест прошёл.
3. **Refactor:** При необходимости улучшить код, не ломая тесты.

### 2.2. Рекомендации

- Перед началом: `npm test` — все тесты зелёные.
- После каждого этапа: `npm test`; при работе с конкретным модулем: `npm run test:watch`.
- Не переходить к следующему этапу, пока не пройдены все тесты текущего.

### 2.3. Этапность (обзор)

| Фаза | Содержание |
|------|-------------|
| **Фаза 0** | ✅ Подготовка: ветка, чтение документации, базовые моки в `tests/setup.ts`. |
| **Фаза 1** | ✅ API диалогов в main: IPC-обработчики `dialog:show-message` и `dialog:show-confirm` + юнит-тесты (TDD). |
| **Фаза 2** | ✅ Проброс API в preload и типы для renderer. |
| **Фаза 3** | ✅ Замена вызовов в рендерере по файлам: тесты обновлены, все 8 файлов переведены на `showMessage`/`showConfirm`. |
| **Фаза 4** | ✅ Регрессия: полный прогон тестов выполнен; ручная проверка — на усмотрение пользователя. |

---

## 3. Фаза 0: Подготовка ✅ Выполнено

### 3.1. Ветка и окружение

```bash
git checkout -b refactor/electron-dialog-ipc
npm install
npm test   # убедиться, что всё зелёное
```

### 3.2. Ознакомление

- Прочитать [electron-input-focus-bug.md](../troubleshooting/electron-input-focus-bug.md).
- Убедиться, что понимаете: баг вызывают только нативные `alert`/`confirm` в рендерере; кастомные модалки не трогаем.

### 3.3. Базовые моки в setup (опционально, можно в Фазе 3)

Чтобы существующие тесты рендерера не падали после появления вызовов `showMessage`/`showConfirm`, в `tests/setup.ts` в объект `global.electronAPI` добавить заглушки:

- `showMessage: vi.fn(() => Promise.resolve())`
- `showConfirm: vi.fn(() => Promise.resolve(true))` — по умолчанию «Да»/OK для совместимости с текущими сценариями.

Добавление можно выполнить в начале Фазы 3, перед первой заменой в рендерере; до этого в рендерере по-прежнему вызываются `alert`/`confirm`.

---

## 4. Фаза 1: API диалогов в main-процессе (TDD) ✅ Выполнено

Цель: в main зарегистрировать два IPC-обработчика и покрыть их юнит-тестами. Диалоги показываются через `dialog.showMessageBox`; в тестах `dialog` мокается.

### 4.1. Красный: тесты для IPC-обработчиков диалогов

Рекомендуемый подход: вынести регистрацию обработчиков в отдельный модуль, принимающий `ipcMain`, `dialog` и функцию получения окна. Тогда тесты мокают только эти зависимости и вызывают зарегистрированные обработчики напрямую.

**Шаг 1.** Создать модуль-регистратор (см. п. 4.2): например `src/main/dialogHandlers.ts`, экспортирующий `registerDialogHandlers(ipcMain, dialog, getWindow)`. В `main.ts` при старте вызывать `registerDialogHandlers(ipcMain, dialog, () => BrowserWindow.getFocusedWindow())`.

**Шаг 2.** Создать тесты для логики обработчиков.

**Файл:** `tests/unit/main/dialogHandlers.test.ts` (создать).

```typescript
/**
 * Тесты для регистратора IPC-диалогов (dialog:show-message, dialog:show-confirm).
 * Проверяют вызов dialog.showMessageBox с нужными параметрами и возврат результата.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDialogHandlers } from '../../../src/main/dialogHandlers';

describe('dialogHandlers', () => {
  let mockIpcMain: { handle: ReturnType<typeof vi.fn> };
  let mockDialog: { showMessageBox: ReturnType<typeof vi.fn> };
  let mockGetWindow: ReturnType<typeof vi.fn>;
  let showMessageHandler!: (e: unknown, opts: { title?: string; message: string }) => Promise<void>;
  let showConfirmHandler!: (e: unknown, opts: { title?: string; message: string }) => Promise<boolean>;

  beforeEach(() => {
    const showMessageBox = vi.fn().mockResolvedValue({ response: 0 });
    mockDialog = { showMessageBox };
    mockGetWindow = vi.fn().mockReturnValue({}); // фейковое окно
    mockIpcMain = {
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        if (channel === 'dialog:show-message') showMessageHandler = handler as typeof showMessageHandler;
        if (channel === 'dialog:show-confirm') showConfirmHandler = handler as typeof showConfirmHandler;
      }),
    };
    registerDialogHandlers(mockIpcMain as never, mockDialog as never, mockGetWindow);
  });

  it('dialog:show-message вызывает showMessageBox с type: info', async () => {
    await showMessageHandler(null, { title: 'Заголовок', message: 'Текст' });
    expect(mockDialog.showMessageBox).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ type: 'info', title: 'Заголовок', message: 'Текст', buttons: ['OK'] })
    );
  });

  it('dialog:show-confirm возвращает true при response 0', async () => {
    mockDialog.showMessageBox.mockResolvedValue({ response: 0 });
    const result = await showConfirmHandler(null, { message: 'Продолжить?' });
    expect(result).toBe(true);
    expect(mockDialog.showMessageBox).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ type: 'question', buttons: ['Да', 'Нет'] })
    );
  });

  it('dialog:show-confirm возвращает false при response 1', async () => {
    mockDialog.showMessageBox.mockResolvedValue({ response: 1 });
    const result = await showConfirmHandler(null, { message: 'Продолжить?' });
    expect(result).toBe(false);
  });
});
```

Если обработчики остаются в `main.ts` без выделенного модуля, тестировать их можно через мок `electron.dialog` до импорта main и перехват `ipcMain.handle` для сохранения ссылки на handler с последующим вызовом в тесте; либо ограничиться интеграционной проверкой в Фазе 4 (ручной вызов диалогов в приложении). Для TDD удобнее выделить `dialogHandlers.ts` и тестировать его, как в примере выше.

### 4.2. Зелёный: реализация обработчиков в main

**Вариант А — отдельный модуль (удобно для TDD).**

**Файл:** `src/main/dialogHandlers.ts` (создать).

```typescript
import type { IpcMain } from 'electron';

export interface DialogHandlersDeps {
  showMessageBox: (win: unknown, options: Record<string, unknown>) => Promise<{ response: number }>;
}

export function registerDialogHandlers(
  ipcMain: IpcMain,
  dialog: DialogHandlersDeps,
  getWindow: () => { id?: number } | null
): void {
  ipcMain.handle("dialog:show-message", async (_event, options: { title?: string; message: string }) => {
    const win = getWindow();
    if (!win) return;
    await dialog.showMessageBox(win, {
      type: "info",
      title: options.title ?? "Информация",
      message: options.message,
      buttons: ["OK"],
    });
  });

  ipcMain.handle("dialog:show-confirm", async (_event, options: { title?: string; message: string }) => {
    const win = getWindow();
    if (!win) return false;
    const { response } = await dialog.showMessageBox(win, {
      type: "question",
      title: options.title ?? "Подтверждение",
      message: options.message,
      buttons: ["Да", "Нет"],
      cancelId: 1,
    });
    return response === 0;
  });
}
```

В `main.ts` при старте приложения (после создания окна): импортировать `registerDialogHandlers`, импортировать `dialog` и `BrowserWindow` из `electron`, вызвать `registerDialogHandlers(ipcMain, dialog, () => BrowserWindow.getFocusedWindow())`.

**Вариант Б — всё в main.ts.** Те же два вызова `ipcMain.handle("dialog:show-message", ...)` и `ipcMain.handle("dialog:show-confirm", ...)` добавить прямо в `main.ts`, используя `dialog` и `BrowserWindow.getFocusedWindow()`. Тогда юнит-тесты Фазы 1 либо мокают `electron` до импорта main и перехватывают зарегистрированные обработчики, либо пропускаются с пометкой «интеграционно проверяется в Фазе 4».

Убедиться, что в коде импортированы `dialog` и `BrowserWindow` из `electron`. Запустить тесты; при варианте А — `tests/unit/main/dialogHandlers.test.ts` должны стать зелёными.

### 4.3. Стабилизация тестов Фазы 1

- Если тесты вызывают обработчики напрямую: передавать мок `dialog` или мокать `dialog` глобально до импорта main.
- Критерий готовности: тесты в `tests/unit/main/dialog-ipc.test.ts` (или аналог) зелёные и проверяют вызов `showMessageBox` и возврат результата для `show-confirm`.

---

## 5. Фаза 2: Preload и типы для renderer ✅ Выполнено

### 5.1. Preload

**Файл:** `src/main/preload.cjs`.

В `contextBridge.exposeInMainWorld('electronAPI', { ... })` добавить:

```javascript
showMessage: (options) => ipcRenderer.invoke('dialog:show-message', options),
showConfirm: (options) => ipcRenderer.invoke('dialog:show-confirm', options),
```

`options` — объект с полями `title` (опционально) и `message` (строка).

### 5.2. Типы для renderer (если есть)

Если в проекте есть глобальный тип для `window.electronAPI` (например, в `src/renderer/global.d.ts` или в типах preload), добавить:

```ts
showMessage: (options: { title?: string; message: string }) => Promise<void>;
showConfirm: (options: { title?: string; message: string }) => Promise<boolean>;
```

### 5.3. Тесты

После Фазы 2 новые обработчики уже вызываются из кода не будут, пока не заменим alert/confirm. Достаточно убедиться, что `npm test` проходит (в том числе если в setup уже добавлены моки `showMessage`/`showConfirm`).

---

## 6. Фаза 3: Замена вызовов в рендерере (TDD по файлам) ✅ Выполнено

Порядок замены рекомендуется по «риску» и зависимостям: сначала страницы с формами и частыми диалогами, затем остальные.

### 6.1. Порядок файлов для замены

| № | Файл | alert | confirm | Примечание |
|---|------|-------|---------|------------|
| 1 | `src/renderer/pages/MatchSettingsPage.tsx` | да | да | ✅ Заменено |
| 2 | `src/renderer/pages/RosterManagementPage.tsx` | да | — | ✅ Заменено |
| 3 | `src/renderer/pages/MatchControlPage.tsx` | да | да | ✅ Заменено |
| 4 | `src/renderer/pages/VMixSettingsPage.tsx` | да | да | ✅ Заменено |
| 5 | `src/renderer/pages/WelcomePage.tsx` | да | — | ✅ Заменено |
| 6 | `src/renderer/components/Layout.tsx` | да | — | ✅ Заменено |
| 7 | `src/renderer/pages/MobileAccessPage.tsx` | да | — | ✅ Заменено |
| 8 | `src/renderer/hooks/useMatch.ts` | да | — | ✅ Заменено |

Для каждого файла: сначала обновить/добавить тесты (моки `showMessage`/`showConfirm` и ожидания вызовов), затем заменить вызовы в коде.

### 6.2. Обновление `tests/setup.ts`

В объект `global.electronAPI` добавить (если ещё не добавлены):

```ts
showMessage: vi.fn(() => Promise.resolve()),
showConfirm: vi.fn(() => Promise.resolve(true)),
```

Так все существующие тесты рендерера, где не проверяется явно `confirm`/`alert`, по умолчанию будут получать «подтверждение» и не падать.

### 6.3. Шаблон замены в коде

- Вместо `alert(text)`:
  - `await window.electronAPI?.showMessage?.({ message: text });`  
  - при необходимости передать `title: '…'`. Проверять наличие API перед вызовом, если приложение может запускаться без Electron (например, в тестах или веб-режиме).
- Вместо `window.confirm(text)`:
  - `const ok = await window.electronAPI?.showConfirm?.({ message: text });`  
  - при необходимости `title: 'Подтверждение'`. Использовать `ok` в условиях так же, как результат `confirm`.

Если `electronAPI` недоступен, можно зарезервировать fallback на старый `alert`/`confirm` только для не-Electron окружения (например, в тестах или dev без Electron), но в production Electron лучше всегда использовать IPC.

### 6.4. Пример по файлу: MatchSettingsPage.tsx

**Шаг 1 — тесты (Red).**

В `tests/unit/renderer/MatchSettingsPage.test.tsx`:

- В мок `electronAPI` добавить `showMessage: vi.fn(() => Promise.resolve())` и `showConfirm: vi.fn(() => Promise.resolve(true))`.
- В тесте «не должен вызывать swapTeams, если пользователь отменил подтверждение»:
  - убрать установку `global.window.confirm = vi.fn(() => false)`;
  - задать `mockElectronAPI.showConfirm.mockResolvedValue(false)`;
  - после клика по кнопке смены команд проверять `expect(mockElectronAPI.showConfirm).toHaveBeenCalled()` и `expect(mockElectronAPI.swapTeams).not.toHaveBeenCalled()`.
- В тесте, где swapTeams должен вызываться, оставить `showConfirm.mockResolvedValue(true)` (или по умолчанию из setup) и при необходимости проверять вызов `showConfirm` с ожидаемым текстом.

Запустить тесты — они упадут, пока в компоненте всё ещё вызывается `window.confirm`.

**Шаг 2 — замена в коде (Green).**

В `MatchSettingsPage.tsx`:

- Найти вызов `window.confirm('Вы уверены…')` и заменить на:
  `const confirmed = await window.electronAPI?.showConfirm?.({ title: 'Подтверждение', message: '...' }); if (!confirmed) return;`
- Все `alert(...)` заменить на `await window.electronAPI?.showMessage?.({ message: '...' });` (и при необходимости `title`). Учесть, что обработчики могут быть async — вызывать в async-обработчике события.

Запустить тесты — должны стать зелёными.

**Шаг 3 — Refactor.**

При необходимости вынести строки сообщений в константы или i18n; убедиться, что дублирующиеся тексты не разъехались.

### 6.5. Остальные файлы (кратко)

- **RosterManagementPage.tsx:** заменить все `alert(...)` на `showMessage`. В тестах добавить мок `showMessage` и при необходимости проверять вызов с ожидаемым текстом при импорте (успех/ошибка).
- **MatchControlPage.tsx:** `alert` → `showMessage`, `confirm` → `showConfirm` с сохранением логики (например, завершение партии только при `confirmed === true`). В тестах — моки и ожидания вызовов.
- **VMixSettingsPage.tsx:** аналогично; для удаления инпута — `showConfirm` с кнопками «Да»/«Нет».
- **WelcomePage.tsx, Layout.tsx, MobileAccessPage.tsx, useMatch.ts:** заменить только `alert` на `showMessage`; в тестах при необходимости добавить проверки вызова `showMessage` с нужным текстом.

После каждого файла: `npm test` и при необходимости `npm run test:watch` для этого файла.

### 6.6. Удаление зависимости от window.confirm / window.alert в тестах

- В тех тестах, где явно задаётся `global.window.confirm`, убрать это и использовать только `mockElectronAPI.showConfirm.mockResolvedValue(true|false)`.
- Вызовы `alert` в тестируемом коде больше не должны происходить — везде только `showMessage`; при необходимости проверять `showMessage` в тестах.

---

## 7. Фаза 4: Регрессия и проверка ✅ Автотесты выполнены

### 7.1. Автотесты

```bash
npm test
npm run test:unit
npm run test:integration
```

Все должны быть зелёными.

### 7.2. Ручные сценарии

- **Настройки матча:** смена команд местами — подтверждение и отмена; сообщения об успехе/ошибке; загрузка логотипа с ошибкой. После каждого диалога проверить ввод в текстовые поля.
- **Управление составами:** импорт состава (успех, ошибка формата, ошибка чтения). После диалога проверить редактирование полей игроков.
- **Управление матчем:** завершение партии (подтверждение/отмена); предупреждение о несохранённых данных.
- **Настройки vMix:** удаление инпута (подтверждение); сохранение с ошибкой.
- **Главная страница:** создание/открытие матча с ошибкой.
- **Layout:** автосохранение, сохранение матча (успех/ошибка).
- **Мобильный доступ:** запуск/остановка сервера, копирование ссылки и т.д.

Критерий: после закрытия любого диалога поля ввода снова принимают ввод с клавиатуры (баг фокуса не воспроизводится).

---

## 8. Чек-лист готовности

- [x] Фаза 1: В main зарегистрированы `dialog:show-message` и `dialog:show-confirm`, есть юнит-тесты (`tests/unit/main/dialogHandlers.test.ts`), тесты зелёные.
- [x] Фаза 2: В preload добавлены `showMessage` и `showConfirm`; типы для renderer при необходимости можно добавить в глобальные типы.
- [x] Фаза 3: Во всех перечисленных файлах рендерера нет вызовов `alert()` и `window.confirm()`; используются только `window.electronAPI.showMessage` и `window.electronAPI.showConfirm`.
- [x] В `tests/setup.ts` в `electronAPI` есть моки `showMessage` и `showConfirm`.
- [x] Существующие тесты рендерера обновлены: MatchSettingsPage (showConfirm), RosterManagementPage и useMatch (showMessage).
- [x] Фаза 4: Полный прогон тестов выполнен (`npm test`); ручная проверка сценариев с диалогами и вводом в поля — на усмотрение пользователя.

---

## 10. Исправление ошибок компиляции TypeScript (после рефакторинга)

После внедрения рефакторинга при сборке (`npm run compile:typescript`, `npm run build:electron`) могли возникать ошибки TypeScript. Внесённые исправления:

- **`window.electronAPI` не в типе Window:** в `useMatch.ts` при вызове `showMessage` используется приведение типа: `(window as Window & { electronAPI?: { showMessage?: (o: { message: string }) => Promise<void> } }).electronAPI?.showMessage?.({ message: … })`, чтобы компилятор не требовал глобального объявления `electronAPI`.
- **Match и MatchForMigration:** тип `Match` не совместим с `MatchForMigration` (интерфейс `Set` без индексной сигнатуры). При вызове `migrateMatchToSetStatus` используется приведение: `initialMatch as unknown as MatchForMigration`, результат приводится к `Match | null`.
- **Match и MatchWithVariant:** тип `Match` не имеет индексной сигнатуры `[key: string]: unknown`, требуемой интерфейсом `MatchWithVariant` в `volleyballRules.ts`. При вызове `getRules(match)` в `useMatch.ts` и в `SetService.ts` используется приведение: `match as unknown as MatchWithVariant` (в SetService — `match as unknown as import('../volleyballRules').MatchWithVariant`).

После этих правок `npm run compile:typescript` и полная сборка проходят успешно.

---

## 9. Ссылки

- [Недоступные поля ввода в Electron (анализ)](../troubleshooting/electron-input-focus-bug.md)
- [Electron Issue #20821](https://github.com/electron/electron/issues/20821) — Keyboard focus lost after alert/confirm
- [Руководство по тестированию](../testing/TESTING.md)
- [Инструкции по рефакторингу безопасности (TDD)](./security-refactoring-implementation-guide.md) — образец этапности и Red/Green/Refactor
