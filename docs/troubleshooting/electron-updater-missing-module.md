# Ошибка "Cannot find package 'electron-updater'" в production сборке

## Проблема

После переноса папки `win-unpacked` на другой компьютер (или переименования) возникает ошибка:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'electron-updater' 
imported from D:\...\resources\app.asar\dist\main.js
```

## Причина

`electron-updater` находился в `devDependencies` вместо `dependencies`. 

**Как это работает:**
1. Vite при сборке main процесса помечает `electron-updater` как external (не включается в бандл)
2. Пакет должен быть доступен в `node_modules` во время выполнения
3. `electron-builder` по умолчанию **не включает** `devDependencies` в production сборку
4. В результате `electron-updater` отсутствует в `node_modules` внутри ASAR архива

## Решение

Переместить `electron-updater` из `devDependencies` в `dependencies` в `package.json`.

### Изменения в package.json

**Было:**
```json
{
  "devDependencies": {
    "electron-updater": "^6.7.3",
    ...
  },
  "dependencies": {
    ...
  }
}
```

**Стало:**
```json
{
  "devDependencies": {
    ...
  },
  "dependencies": {
    "electron-updater": "^6.7.3",
    ...
  }
}
```

## Проверка решения

После перемещения зависимости:

1. **Установите зависимости:**
   ```bash
   npm install
   ```

2. **Пересоберите приложение:**
   ```bash
   npm run build:electron
   ```

3. **Проверьте наличие пакета в сборке:**
   - В папке `release/win-unpacked/resources/app.asar` должен быть `node_modules/electron-updater`
   - Или распакуйте ASAR и проверьте: `npx asar extract app.asar app-asar-extracted`

## Важно

**Все пакеты, которые используются в production коде (main или renderer процесс), должны быть в `dependencies`, а не в `devDependencies`.**

### Какие пакеты должны быть в dependencies:

- ✅ `electron-updater` - используется в `src/main/updater.ts`
- ✅ `electron-store` - используется в production коде
- ✅ `express` - используется в мобильном сервере
- ✅ Все остальные пакеты, импортируемые в `src/main/` или `src/renderer/`

### Какие пакеты могут быть в devDependencies:

- ✅ `electron` - используется только для разработки
- ✅ `electron-builder` - используется только для сборки
- ✅ `vite`, `vitest` - инструменты разработки
- ✅ `typescript`, `eslint` - инструменты разработки

## Технические детали

### Как Vite обрабатывает зависимости

В `vite.config.main.js` пакет помечен как external:
```javascript
external: [
  'electron-updater',  // Не включается в бандл
  ...
]
```

Это означает, что пакет должен быть доступен в `node_modules` во время выполнения.

### Как electron-builder обрабатывает зависимости

По умолчанию `electron-builder`:
- ✅ Включает все пакеты из `dependencies` в `node_modules`
- ❌ **НЕ включает** пакеты из `devDependencies` в production сборку

Это правильное поведение для оптимизации размера приложения, но требует правильного размещения зависимостей.

## Связанные документы

- [Требования к версиям зависимостей](../development/dependencies-version-requirements.md)
- [Архитектура проекта](../architecture/ARCHITECTURE.md)

---

**Дата создания:** 2026-01-21  
**Версия:** 1.0.7
