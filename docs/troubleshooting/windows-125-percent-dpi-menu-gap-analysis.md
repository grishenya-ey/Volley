# Анализ: белая полоска под главным меню при 125% масштабировании Windows

*Последнее обновление: 2026-02-16*

## Суть проблемы

При запуске собранного приложения на Windows с разрешением 1920×1080 и масштабом страницы **125%** наблюдается следующий визуальный дефект:

1. **Белая полоса** высотой примерно 1–2 пикселя появляется сразу под главным меню приложения (нативное меню Electron: Файл, Правка и т.д.) и над основной областью контента.
2. При нажатии на пункты меню создаётся впечатление, что **высота элементов меню больше**, чем высота подложки (фона) главного меню.
3. Визуально зазор выглядит как щель между «подложкой» нативного меню и страницей приложения (React-контентом).

---

## Причины возникновения

### 1. Известный баг Chromium/Electron при нестандартном DPI

Это **системная проблема**, связанная с тем, как Chromium (на базе которого работает Electron) рассчитывает размеры окна и область контента при масштабировании, отличном от 100%.

**Основные источники:**
- [electron/electron#8332](https://github.com/electron/electron/issues/8332) — Maximized/fullscreen window leaves 1px space on right/bottom borders  
- [electron/electron#10862](https://github.com/electron/electron/issues/10862) — Per monitor DPI awareness causes issues with window positioning and sizing  
- [binaryfunt/electron-seamless-titlebar-tutorial#14](https://github.com/binaryfunt/electron-seamless-titlebar-tutorial/issues/14) — CSS window border workaround - high DPI scaling issues  

### 2. Округление при переводе DIP в физические пиксели

При масштабировании 125%:

- 1 логический пиксель (DIP) = 1,25 физических пикселей
- Округляя до целых пикселей, система может «терять» или «добавлять» 1 пиксель при расчёте:
  - высоты панели нативного меню (non-client area);
  - начала области контента (client area).

В результате между non-client area (меню) и client area (веб-контент) возникает **зазор в 1–2 пикселя**, который отображается как белая полоса (фон окна/страницы).

### 3. Несогласованность non-client и client area

В Electron/Chromium:

- **Non-client area** — заголовок, меню, рамки — рисуется Windows/Chromium.
- **Client area** — область, где отображается веб-контент (React-приложение).

При 125% масштабировании:

- Высота меню может вычисляться с округлением в одну сторону
- Начало client area — в другую  
→ между ними появляется разрыв.

### 4. Специфика 125% масштабирования

Проблема проявляется именно при **не кратных 100%** масштабах (125%, 150%, 175%):

> *«It happens on any scaling that isn't a multiple of 100»*  
> — binaryfunt/electron-seamless-titlebar-tutorial#14

> *«At 125% scaling, when the border is still 1 physical px thick, the bottom & right borders sometimes don't show depending on the size of the window... This seems to be a Chromium bug»*  
> — там же

### 5. Связь с VS Code и другими Electron-приложениями

Тот же эффект наблюдался в VS Code и других Electron-приложениях (Atom, Discord, Slack и др.), что подтверждает, что причина — в Chromium/Electron, а не в логике конкретного приложения.

---

## Технические детали по проекту

- **Окно:** обычный `BrowserWindow` с нативным меню (`Menu.setApplicationMenu`)
- **Окно не frameless** — используется стандартная панель заголовка и меню Windows
- **Версия Electron:** ^39.2.7 (из `package.json`)
- **Структура UI:** Layout с `<header>` (кастомный заголовок страницы) и `<main>` (контент)

Белая полоска появляется **между нативным меню Electron** и **верхней границей веб-контента** (React-дерева), то есть в области, управляемой Chromium, а не приложением.

---

## Возможные обходные пути

### 1. Визуальная маскировка (рекомендуется)

- Убедиться, что цвет фона `body` и `#root` совпадает с цветом заголовка страницы или подложки меню.
- При тёмной теме — использовать тёмный фон, чтобы зазор был менее заметен.

### 2. Использование `autoHideMenuBar`

В [electron/electron#8789](https://github.com/electron/electron/issues/8789) описано, что комбинация `autoHideMenuBar: true` и `win.setMenu(null)` может корректно учитывать высоту меню. Однако это скрывает панель меню и убирает функциональность Alt+меню, что неприемлемо для приложения с меню.

### 3. Отслеживание и исправление размеров окна

В issue [#10862](https://github.com/electron/electron/issues/10862) предлагают повторно вызывать `setBounds` / `setPosition` после создания окна — это может улучшить позиционирование, но не устраняет сам зазор между меню и контентом.

### 4. Ожидание исправления в Chromium/Electron

Проблема давно известна и связана с Chromium. Исправление должно происходить на уровне Chromium/Electron, а не в коде приложения.

---

## Рекомендации

1. **Не пытаться «починить» зазор в коде приложения** — он возникает на уровне Chromium между non-client и client area.
2. **Минимизировать визуальный эффект** — подобрать фон так, чтобы зазор был менее заметен.
3. **Следить за обновлениями Electron** — в будущих версиях возможны улучшения DPI-поведения.
4. **Документировать для пользователей** — при необходимости указывать в справке, что при 125% масштабировании Windows возможен небольшой визуальный артефакт.

---

## Ссылки

| Ресурс | Описание |
|--------|----------|
| [electron/electron#8332](https://github.com/electron/electron/issues/8332) | 1px зазор при fullscreen/maximized, связь с DPI |
| [electron/electron#10862](https://github.com/electron/electron/issues/10862) | Проблемы DPI: позиционирование и размеры окна |
| [electron/electron#8350](https://github.com/electron/electron/issues/8350) | 1px зазор между frameless-окном и панелью задач |
| [binaryfunt/electron-seamless-titlebar-tutorial#14](https://github.com/binaryfunt/electron-seamless-titlebar-tutorial/issues/14) | CSS borders и DPI 125%, bottom/right границы |
| [ electron/electron#8789](https://github.com/electron/electron/issues/8789) | Высота окна при `setMenu(null)` |
