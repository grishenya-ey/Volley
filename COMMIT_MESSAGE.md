fix(ui): поля Старт А/Б при пустом составе, редактор цветов и тесты

- getValueByDataMapKey: при отсутствии стартовых игроков поля startingA/B
  возвращают пустую строку, а не данные из Roster. Тест на пустой стартовый состав.
- SetEditModal: мок timeUtils в тестах по пути без .js (резолв к .ts).
- Управление составами: кнопки Импорт/Экспорт перенесены в заголовок блока
  «Внешний вид команды»; в блоке «Состав команды» только «Добавить игрока».
- TeamColorsEditor: кнопка «Поменять цвета», aria-label для пикеров и кнопки.
- TeamColorsEditor: при пустом цвете для input type="color" используется
  fallback #ffffff (устранены предупреждения в консоли и некорректный вид после обмена).
- Тесты: RosterManagementPage (расположение кнопок), TeamColorsEditor (обмен, пустой liberoColor).
- Документация: ui-structure, roster-management-refactoring-plan,
  roster-page-import-export-and-swap-colors-plan (история изменений),
  starting-lineup-empty-vs-roster-analysis, CHANGELOG.
