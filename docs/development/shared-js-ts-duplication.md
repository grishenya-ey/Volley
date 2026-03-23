# Shared: один источник истины (TypeScript)

*Последнее обновление: 2026-02-07*

## Текущее состояние (после миграции)

В `src/shared/` для модулей с типами и доменной/сервисной логикой используется **только TypeScript** (.ts). Ручные дубликаты .js удалены.

### Модули только на TypeScript

- `types/Match.ts` — типы матча, SET_STATUS, createNewMatch(), validateMatch()
- `domain/MatchDomain.ts`, `domain/SetDomain.ts`, `domain/SetStateMachine.ts`
- `services/SetService.ts`, `services/ScoreService.ts`, `services/HistoryService.ts`
- `validators/SetValidator.ts`, `validators/TimeValidator.ts`

### Модули только на JavaScript (без дублирования)

- `volleyballRules.js`, `volleyballRulesConfig.js`, `matchUtils.js`, `errorHandler.js`
- `playerPositions.js`, `matchMigration.js`, `getValueByDataMapKey.js`, `timeUtils.js`
- `vmix-field-utils.js`, `theme/tokens.js` и др.

## Импорты из shared

- Импорты из **TypeScript-модулей** shared указывайте **без расширения** или с `.ts` (например `from '../../shared/types/Match'` или `from '../../shared/domain/SetDomain'`). Vite резолвит их в .ts (`resolve.extensions`: `.ts` идёт перед `.js`).
- Импорты из **JavaScript-модулей** shared оставляйте с `.js` (например `from '../../shared/volleyballRules.js'`).

## История

Ранее часть модулей (Match, domain, services, validators) существовала и в .js, и в .ts; это создавало риск расхождений. В феврале 2026 выполнена миграция по варианту A: оставлены только .ts исходники, все импорты переведены на путь без расширения, дубликаты .js удалены. Подробности и альтернативные варианты можно найти в истории коммитов и в старых версиях этого файла.
