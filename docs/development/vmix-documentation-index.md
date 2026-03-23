# Индекс документации по vMix и настройке инпутов

*Последнее обновление: 2026-02-06*

Документ помогает найти всю документацию по взаимодействию с vMix и настройке инпутов/полей, а также определить, какие файлы можно удалить после создания единого описания текущего функционала.

---

## 1. Файлы в docs/development, начинающиеся с `vmix-input`

| Файл | Назначение | Статус |
|------|------------|--------|
| **vmix-inputs-refactoring-plan.md** | План рефакторинга: переход к динамической настройке инпутов (подключение, getGTInputs, inputOrder, сопоставление полей с vmix-data-map) | Рефакторинг **выполнен** (2026-02-04). Документ — план «как было → как стало». |
| **vmix-inputs-refactoring-implementation-guide.md** | Пошаговые инструкции по реализации того рефакторинга (TDD, этапы 1–9, тесты, файлы) | Рефакторинг **выполнен**. Все этапы помечены как выполненные. |
| **vmix-input-remap-edit-plan.md** | План: редактирование сопоставления инпута с vMix (переименование в vMix → авто по vmixKey + кнопка «Повторно сопоставить») | Реализация **выполнена** (2026-02-06). |
| **vmix-input-remap-edit-implementation-guide.md** | Инструкции по реализации remap (tryApplyVMixInputRemapByKey, автоприменение, модальное окно, сброс кэша) | Реализация **выполнена**. |

**Вывод:** Все четыре файла относятся к **уже проведённым** рефакторингам. После появления единого описания **текущего** функционала их можно считать лишними и удалить (или перенести в архив/историю).

---

## 2. Где описывается взаимодействие с vMix и настройка инпутов/полей

### 2.1. Описание текущего состояния и архитектуры

| Расположение | Содержание | Актуальность |
|--------------|------------|--------------|
| **docs/architecture/ARCHITECTURE.md** | Раздел про vMix: vmix-client, vmix-config, useVMix, IPC, кэш, оверлеи. Упоминаются `vmix-input-configs.js`, фиксированные ключи инпутов (currentScore и т.д.), структура настроек. | Частично устарел: в коде уже динамическая модель (inputOrder, inputs с displayName/vmixTitle/vmixKey, dataMapCatalog, getGTInputs). Рекомендуется обновить после создания единого описания. |
| **docs/architecture/vmix-settings-redesign-plan.md** | План переработки страницы настроек vMix. В начале помечен как «уже реализованная функциональность», историческая справка. Описывает старую структуру (inputIdentifier, fields с fieldName/fieldIdentifier). | Устарел для текущей динамической модели (сейчас: vmixTitle, vmixKey, vmixNumber, fields с dataMapKey/customValue). Полезен как история. |

### 2.2. Справочники (оставить)

| Расположение | Содержание | Актуальность |
|--------------|------------|--------------|
| **docs/development/vmix-data-map.md** | Карта данных приложения для vMix: источники данных (match.*), типы полей, использование в инпутах. | Актуален: используется dataMapCatalog и при настройке полей. |
| **docs/api/vmix-api-reference.md** | HTTP API vMix: SetText, SetColor, SetImage, оверлеи, параметры. | Актуален. |
| **docs/api/** (если есть) | Пример ответа vMix API (XML) | Справочный материал. |

### 2.3. Ссылки на планы рефакторинга

- **docs/development/README.md** — разделы «Планирование и аудит» и «Структура» ссылаются на все четыре файла `vmix-input*` и на vmix-data-map.
- **docs/README.md** — возможно, есть ссылки на vMix-документацию.

---

## 3. Единое описание текущего функционала (создано)

**Документ:** [Текущий функционал: интеграция с vMix и настройка инпутов](vmix-current-functionality.md) (`docs/development/vmix-current-functionality.md`).

В нём описаны: подключение (connectionState, Подключить/Отключить), структура настроек (inputOrder, inputs, fields), страница «Настройки vMix» (добавление/удаление/порядок, «Повторно сопоставить», панель полей), отправка данных (useVMix, updateDynamicInputs), оверлеи, кэш полей и его сброс, ключевые файлы и ссылки на vmix-data-map и vmix-api-reference.

## 4. Рекомендуемые шаги (далее)

1. **Обновить ссылки:** в docs/development/README.md и docs/architecture/ARCHITECTURE.md заменить ссылки на планы рефакторинга на ссылку на [vmix-current-functionality.md](vmix-current-functionality.md).

2. **Удалить лишние файлы** (после появления единого описания):
   - docs/development/vmix-inputs-refactoring-plan.md
   - docs/development/vmix-inputs-refactoring-implementation-guide.md
   - docs/development/vmix-input-remap-edit-plan.md
   - docs/development/vmix-input-remap-edit-implementation-guide.md

3. **Опционально:** обновить docs/architecture/vmix-settings-redesign-plan.md пометкой «полностью superseded by vmix-current-functionality.md» или удалить; обновить ARCHITECTURE.md под текущую динамическую модель (убрать упор на vmix-input-configs и фиксированные ключи).

---

## 5. Итоговая таблица: что оставить, что удалить

| Действие | Файл |
|----------|------|
| **Оставить** | vmix-data-map.md, vmix-api-reference.md, vmix-current-functionality.md |
| **Удалить (при желании)** | vmix-inputs-refactoring-plan.md, vmix-inputs-refactoring-implementation-guide.md, vmix-input-remap-edit-plan.md, vmix-input-remap-edit-implementation-guide.md |
| **Обновить** | README.md (development) — ссылка на vmix-current-functionality добавлена; при необходимости ARCHITECTURE.md и vmix-settings-redesign-plan.md |

Этот индекс можно удалить после выполнения шагов или оставить как краткий указатель на актуальный документ по vMix.
