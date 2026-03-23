# План миграции на TypeScript

*Последнее обновление: 2026-02-07*

Документ описывает порядок перевода оставшихся исходников (.js / .jsx) на TypeScript с учётом зависимостей и рисков.

---

## 1. Текущее состояние (миграция завершена)

- **src:** весь код на TypeScript (.ts/.tsx). В `src/main/` единственное исключение — `preload.cjs` (намеренно CommonJS для Electron).
- **tests:** все тесты и моки на TypeScript (включая `tests/__mocks__/Match.ts`).
- Импорты везде без расширения или с `.ts`/`.tsx`. Пороги покрытия в `vite.config.js` приведены к `.ts` файлам.

---

## 2. Порядок миграции (по фазам)

Миграцию лучше вести **снизу вверх по зависимостям**: сначала модули без зависимостей от других непереведённых файлов, затем те, кто их использует.

---

### Фаза 1: Shared — конфиги и данные (без сложной логики) ✅ Выполнено

Цель: перевести простые модули с константами и типами. После миграции импорты везде перевести на путь без расширения.

| № | Файл | Зависимости | Сложность | Статус |
|---|------|-------------|-----------|--------|
| 1.1 | `shared/theme/tokens.js` → `.ts` | нет | Низкая | ✅ Типы ThemeColors, light/dark/space/radius/typography. Импорты обновлены (server, renderer/theme/tokens). |
| 1.2 | `shared/volleyballRulesConfig.js` → `.ts` | нет | Низкая | ✅ VARIANTS, RULES_CONFIGS, RulesConfig, VariantId, validateRulesConfig. Импорты в volleyballRules, MatchSettingsPage, тестах. |
| 1.3 | `shared/playerPositions.js` → `.ts` | нет | Низкая | ✅ POSITION_ABBREVIATIONS, POSITION_OPTIONS, getPositionAbbreviation, migratePosition, migrateRosterPositions. Импорты в fileManager, server, getValueByDataMapKey, RosterManagementPage, тестах. |

После фазы 1 обновить импорты в `volleyballRules.js`, `getValueByDataMapKey.js`, `server.ts`, `fileManager.ts`, страницах и тестах. — **сделано**.

---

### Фаза 2: Shared — утилиты и правила ✅ Выполнено

| № | Файл | Зависимости | Сложность | Статус |
|---|------|-------------|-----------|--------|
| 2.1 | `shared/timeUtils.js` → `.ts` | нет | Низкая | ✅ |
| 2.2 | `shared/errorHandler.js` → `.ts` | нет | Низкая | ✅ |
| 2.3 | `shared/volleyballRules.js` → `.ts` | volleyballRulesConfig (TS) | Средняя | ✅ |
| 2.4 | `shared/getValueByDataMapKey.js` → `.ts` | playerPositions (TS) | Средняя | ✅ |
| 2.5 | `shared/matchMigration.js` → `.ts` | types/Match (TS) | Низкая | ✅ |
| 2.6 | `shared/setValidation.js` → `.ts` | volleyballRules, types/Match | Средняя | ✅ |
| 2.7 | `shared/matchUtils.js` → `.ts` | types/Match (TS) | Средняя | ✅ |
| 2.8 | `shared/vmix-field-utils.js` → `.ts` | нет | Низкая | ✅ |
| 2.9 | `shared/setScoreInputsUtils.js` → `.ts` | — | Средняя | ✅ |
| 2.10 | `shared/dataMapCatalog.js` → `.ts` | нет | Средняя | ✅ DataMapGroup, DataMapItem, getDataMapCatalog. |
| 2.11 | `shared/vmixConfigUtils.js` → `.ts` | — | Средняя | ✅ |

После фазы 2 main и renderer не должны импортировать из shared по .js для переведённых модулей. В shared остаются только .ts файлы.

---

### Фаза 3: Renderer — theme и утилиты ✅ Выполнено

| № | Файл | Зависимости | Действия | Статус |
|---|------|-------------|----------|--------|
| 3.1 | `renderer/theme/tokens.js` → `.ts` | shared/theme/tokens | Реэкспорт из shared | ✅ |
| 3.2 | `renderer/theme/applyTheme.js` → `.ts` | ThemeColors из shared | applyTheme(themeObject) типизирован | ✅ |
| 3.3 | `renderer/utils/debounce.js` → `.ts` | нет | debounce, throttle типизированы | ✅ |
| 3.4 | `renderer/utils/colorContrast.js` → `.ts` | нет | getRelativeLuminance, getContrastTextColor | ✅ |
| 3.5 | `renderer/utils/imageResize.js` → `.ts` | нет | resizeImage | ✅ |
| 3.6 | `renderer/utils/vmix-field-utils.js` → `.ts` | shared/vmix-field-utils | Реэкспорт из shared | ✅ |

---

### Фаза 4: Renderer — хуки ✅ Выполнено

| № | Файл | Зависимости | Действия | Статус |
|---|------|-------------|----------|--------|
| 4.1 | `renderer/hooks/useVMix.js` → `.ts` | debounce, vmix-field-utils, colorContrast, timeUtils, getValueByDataMapKey | useVMix(match: Match \| null), типы для connectionStatus, vmixConfig (unknown), (error as Error).message | ✅ |
| 4.2 | `renderer/hooks/useMatch.js` | useMatch.ts уже есть | useMatch.js удалён, импорт в MatchControlPage переведён на useMatch (без .js), useMatch.ts исправлен (getRules вместо isSetball/isMatchball/canFinishSet) | ✅ |

---

### Фаза 5: Renderer — компоненты и страницы (.jsx → .tsx) ✅ Выполнено

| Группа | Статус |
|--------|--------|
| Кнопки и базовая UI | Button.tsx, ErrorBoundary.tsx, StatusIndicators.tsx, ScoreDisplay.tsx, ServeControl.tsx, ScoreButtons.tsx, VMixOverlayButtons.tsx — типы пропсов добавлены |
| Layout | Layout.tsx — LayoutProps, Match, useHeaderButtons |
| Панели и модалки | VMixInputFieldsPanel.tsx, SetEditModal.tsx, SetsDisplay.tsx — типы из shared (Match, Set, DataMapGroup) |
| Страницы | WelcomePage, AboutPage, MobileAccessPage, VMixSettingsPage, RosterManagementPage, MatchSettingsPage, MatchControlPage — переведены в .tsx, добавлены props (Match \| null, onMatchChange) где нужно |
| Точки входа | App.tsx, index.tsx — entry в index.html и vite.config обновлены на index.tsx |

---

### Фаза 6: Main — оставшееся ✅ Проверено

- **preload.cjs** — намеренно CommonJS для Electron, не переводить в TS.
- Импорты в main: проверено — в `src/main` нет импортов с расширением `.js` для модулей shared; все точки входа уже .ts.

---

### Фаза 7: Тесты ✅ Завершено

- **Unit shared:** ✅ Все тесты в tests/unit/shared/ и setScoreInputsUtils.test.ts, getSetScoreFieldValue.test.ts переведены в .ts, старые .js удалены.
- **Unit renderer:** ✅ theme (tokens.test.ts, applyTheme.test.ts), useMatch-set-status.test.ts, useVMix-*.test.ts; все тесты компонентов/страниц переведены в .tsx (импорты без .jsx), старые .jsx удалены.
- **Unit main:** ✅ logoManager-unique-names.test.ts, logoManager-ensureLogosDir.test.ts, swap-teams-logo.test.ts, vmix-client-logo-api.test.ts, vmix-client-text-color.test.ts, updater.test.ts, autoUpdateSettings.test.ts; старые .js удалены.
- **Прочее:** ✅ getSetScoreFieldValue.test.ts, useVMixSetScore.test.ts; integration (match-open-vmix-update.test.ts, api/mobileServer.test.ts); security (xss.test.ts); fixtures (matchFactory.ts); setup.ts (vite.config.js обновлён на setup.ts).
- **Моки:** ✅ tests/__mocks__/Match.js и Match.mjs заменены на Match.ts.

---

## 3. Общие правила при миграции

1. **Импорты:** после перевода модуля в .ts везде использовать путь **без расширения** (или .ts), чтобы резолвился TypeScript.
2. **Типы в shared:** по возможности использовать уже существующие типы из `shared/types/Match.ts` и доменного слоя; при необходимости вынести общие типы в `shared/types/` (например `VariantId`, `RulesConfig` из volleyballRulesConfig).
3. **Строгость:** не снижать `strict` в tsconfig; при необходимости использовать `unknown` и type guards вместо `any`.
4. **Тесты:** после перевода модуля запускать связанные тесты (`npm test` или точечно); при миграции теста обновлять моки и импорты.
5. **Коммиты:** делать коммиты по фазам или по 1–2 файлам внутри фазы, чтобы упростить откат.

---

## 4. Риски и особенности

- **matchUtils.js vs types/Match.ts:** в Match.ts уже есть createNewMatch и validateMatch; fileManager импортирует их из matchUtils.js. При миграции избежать дублирования: либо matchUtils.ts реэкспортирует из types/Match и добавляет остальные функции, либо fileManager переводится на импорт createNewMatch/validateMatch из types/Match, а matchUtils содержит только прочее.
- **useMatch.js и useMatch.ts:** оба существуют; в коде используется useMatch.js. Нужно оставить один вариант (предпочтительно .ts) и обновить все импорты, затем удалить второй файл.
- **preload.cjs:** не трогать формат (CommonJS) без отдельного плана для preload.
- **Ретро-совместиость:** при изменении сигнатур (например, добавлении обязательных параметров) проверить все вызовы в main, renderer и тестах.

---

## 5. Чек-лист готовности к завершению миграции

- [x] В `src/shared/` нет .js файлов (кроме явно оставленных, если будут).
- [x] В `src/renderer/` нет .js/.jsx (все .ts/.tsx).
- [x] В `src/main/` все исходники .ts, кроме preload.cjs.
- [x] Импорты из shared везде без расширения или с .ts.
- [x] `npm run build` и `npm run build:main` проходят.
- [x] `npm test` проходит.
- [x] В .cursor/rules и документации отражено, что проект на TypeScript (с оговоркой про preload при необходимости).

Миграция завершена. Весь код в тестах переведён на TypeScript (включая tests/__mocks__/Match.ts). При необходимости документ можно сократить до краткого отчёта о завершении миграции и ссылки на коммиты.
