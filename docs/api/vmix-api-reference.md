# Справочник HTTP API vMix

> **Актуально для:** vMix Volley Scoreboard v1.0.2

## Обзор

Этот документ описывает HTTP API запросы vMix, используемые в приложении для управления инпутами и оверлеями. vMix предоставляет HTTP API для управления инпутами через GET запросы.

**Поддерживаемые команды:**
- `SetText` - обновление текстовых полей
- `SetColor` - изменение цвета полей (для fill полей)
- `SetTextColour` - изменение цвета текста в текстовых полях
- `SetTextVisibleOn`/`SetTextVisibleOff` - управление видимостью полей
- `SetImage` - установка изображений
- `OverlayInput[N]In`/`Out`/`Toggle` - управление оверлеями

## Базовый URL

```
http://[IP_адрес_vMix]:[порт]/api
```

- **IP адрес vMix**: IP адрес компьютера, на котором запущен vMix (например, `192.168.1.100` или `localhost`)
- **Порт**: По умолчанию `8088` (настраивается в настройках vMix)

## Формат запросов

Все запросы к vMix API выполняются через GET запросы с параметрами в URL.

### Общий формат запроса

```
GET http://[host]:[port]/api?Function=[название_функции]&[параметр1]=[значение1]&[параметр2]=[значение2]...
```

## Команда SetText - обновление текстовых полей

Команда `SetText` используется для обновления текстовых данных в полях инпута.

### Параметры команды SetText

| Параметр        | Тип    | Обязательный | Описание                                                                               |
| --------------- | ------ | ------------ | -------------------------------------------------------------------------------------- |
| `Function`      | string | Да           | Всегда должно быть `SetText`                                                           |
| `Input`         | string | Да           | Имя или номер инпута (например, `Input1`, `Input5` или название инпута)                |
| `SelectedName`  | string | Нет\*        | Имя поля в инпуте для обновления. Используется для выбора конкретного текстового поля. |
| `SelectedIndex` | number | Нет\*        | Индекс поля (0-based). Альтернатива `SelectedName`.                                    |
| `Value`         | string | Да           | Новое значение для поля                                                                |

\* **Важно**: Необходимо указать либо `SelectedName`, либо `SelectedIndex` для выбора конкретного поля. Если не указано ни одно, обновляется выделенное поле в интерфейсе vMix.

### Примеры запросов

#### Пример 1: Обновление поля по имени

```
GET http://localhost:8088/api?Function=SetText&Input=Input5&SelectedName=TeamA&Value=Спартак
```

**Описание**: Обновляет поле с именем `TeamA` в инпуте `Input5` значением "Спартак".

**Параметры**:

- `Function=SetText`
- `Input=Input5` (номер инпута)
- `SelectedName=TeamA` (имя поля, которое мы настроили как `fieldIdentifier`)
- `Value=Спартак` (новое значение)

#### Пример 2: Обновление поля по индексу

```
GET http://localhost:8088/api?Function=SetText&Input=Input5&SelectedIndex=0&Value=Спартак
```

**Описание**: Обновляет первое поле (индекс 0) в инпуте `Input5`.

#### Пример 3: Обновление поля с использованием имени инпута

```
GET http://localhost:8088/api?Function=SetText&Input=Счет%20матча&SelectedName=ScoreA&Value=25
```

**Описание**: Обновляет поле `ScoreA` в инпуте с именем "Счет матча".

**Примечание**: В URL пробелы должны быть закодированы как `%20`.

#### Пример 4: Обновление нескольких полей в одном инпуте

Для обновления нескольких полей необходимо отправлять отдельные запросы:

```javascript
// Обновление поля TeamA
GET http://localhost:8088/api?Function=SetText&Input=Input5&SelectedName=TeamA&Value=Спартак

// Обновление поля TeamB
GET http://localhost:8088/api?Function=SetText&Input=Input5&SelectedName=TeamB&Value=Динамо

// Обновление поля ScoreA
GET http://localhost:8088/api?Function=SetText&Input=Input5&SelectedName=ScoreASet&Value=25
```

## Структура обращения к полям в нашем проекте

В нашем проекте используется следующая структура:

### Формат обращения

```
Input.[fieldIdentifier]
```

Где:

- `Input` - значение `inputIdentifier` из настроек (например, `Input5` или название инпута)
- `fieldIdentifier` - значение `fieldIdentifier` из настроек поля (например, `TeamA`, `ScoreASet`)

### Пример из настроек

```json
{
  "currentScore": {
    "inputIdentifier": "Input5",
    "fields": {
      "teamA": {
        "fieldIdentifier": "TeamA"
      }
    }
  }
}
```

**HTTP запрос**:

```
GET http://localhost:8088/api?Function=SetText&Input=Input5&SelectedName=TeamA&Value=Спартак
```

## Обработка различных типов полей

### Текстовые поля (`type: "text"`)

**Формат значения**: строка текста

**Пример**:

```
GET http://localhost:8088/api?Function=SetText&Input=Input5&SelectedName=TeamA&Value=Спартак%20Москва
```

### Поля цвета (`type: "color"`)

**Формат значения**: HEX цвет (например, `#FF0000` для красного)

**Команда**: Для изменения цвета используется команда `SetColor`, а не `SetText`.

**Пример**:

```
GET http://localhost:8088/api?Function=SetColor&Input=ScoreUpVFV2024.gtzip&SelectedName=Color_Team1.Fill.Color&Value=%23FFFFFF
```

**Параметры команды SetColor**:

| Параметр        | Тип    | Обязательный | Описание                                    |
| --------------- | ------ | ------------ | ------------------------------------------- |
| `Function`      | string | Да           | Всегда должно быть `SetColor`               |
| `Input`         | string | Да           | Имя или номер инпута                        |
| `SelectedName`  | string | Да           | Имя поля цвета (fieldIdentifier)            |
| `Value`         | string | Да           | HEX цвет в формате #RRGGBB                  |

**Примечание**: Символ `#` в URL должен быть закодирован как `%23`.

### Поля цвета текста (`SetTextColour`)

**Формат значения**: HEX цвет (например, `#000000` для черного или `#FFFFFF` для белого)

**Команда**: Для изменения цвета текста в текстовых полях используется команда `SetTextColour`.

**Пример**:

```
GET http://localhost:8088/api?Function=SetTextColour&Input=Input5&SelectedName=Libero1Number.Text&Value=%23000000
```

**Параметры команды SetTextColour**:

| Параметр        | Тип    | Обязательный | Описание                                    |
| --------------- | ------ | ------------ | ------------------------------------------- |
| `Function`      | string | Да           | Всегда должно быть `SetTextColour`          |
| `Input`         | string | Да           | Имя или номер инпута                        |
| `SelectedName`  | string | Да           | Имя текстового поля с суффиксом `.Text` (для GT Titles) |
| `Value`         | string | Да           | HEX цвет в формате #RRGGBB                  |

**Важно для GT Titles**:
- Для GT Titles необходимо использовать имя поля с суффиксом `.Text` (например, `Libero1Number.Text`)
- Команда `SetTextColour` должна вызываться **после** команды `SetText`, чтобы цвет применялся к уже установленному тексту
- Символ `#` в URL должен быть закодирован как `%23`

**Использование в приложении**:
- Автоматическая установка контрастного цвета текста для полей номеров либеро
- Цвет текста определяется автоматически на основе цвета подложки либеро
- Используется функция `getContrastTextColor()` для расчета оптимального цвета (черный или белый)

### Поля видимости (`type: "visibility"`)

**Управление видимостью**: Для полей видимости (например, "Поинт А", "Поинт Б") используется отдельная команда управления видимостью текстового поля, а не изменение текста.

**Важно**: 
- По умолчанию в поле должен быть установлен символ ● (bullet point)
- Текст в поле видимости не меняется - только управляется видимость
- Сначала устанавливается символ ● через `SetText`, затем управляется видимость через `SetTextVisibleOn`/`SetTextVisibleOff`

**Команды управления видимостью**:

#### Показать поле (`SetTextVisibleOn`)

```
GET http://[host]:[port]/api?Function=SetTextVisibleOn&Input=[inputIdentifier]&SelectedName=[fieldIdentifier]
```

**Параметры**:

| Параметр      | Тип    | Обязательный | Описание                                    |
| ------------- | ------ | ------------ | ------------------------------------------- |
| `Function`    | string | Да           | `SetTextVisibleOn`                          |
| `Input`       | string | Да           | Имя или номер инпута                        |
| `SelectedName`| string | Да           | Имя поля (`fieldIdentifier`)                |

**Пример**:

```
GET http://localhost:8088/api?Function=SetTextVisibleOn&Input=Input5&SelectedName=Point_Team1.Text
```

#### Скрыть поле (`SetTextVisibleOff`)

```
GET http://[host]:[port]/api?Function=SetTextVisibleOff&Input=[inputIdentifier]&SelectedName=[fieldIdentifier]
```

**Параметры**:

| Параметр      | Тип    | Обязательный | Описание                                    |
| ------------- | ------ | ------------ | ------------------------------------------- |
| `Function`    | string | Да           | `SetTextVisibleOff`                         |
| `Input`       | string | Да           | Имя или номер инпута                        |
| `SelectedName`| string | Да           | Имя поля (`fieldIdentifier`)                |

**Пример**:

```
GET http://localhost:8088/api?Function=SetTextVisibleOff&Input=Input5&SelectedName=Point_Team1.Text
```

**Полный пример работы с полем видимости**:

```javascript
// 1. Сначала устанавливаем символ ● в поле
GET http://localhost:8088/api?Function=SetText&Input=Input5&SelectedName=Point_Team1.Text&Value=●

// 2. Затем показываем поле (если нужно)
GET http://localhost:8088/api?Function=SetTextVisibleOn&Input=Input5&SelectedName=Point_Team1.Text

// Или скрываем поле (если нужно)
GET http://localhost:8088/api?Function=SetTextVisibleOff&Input=Input5&SelectedName=Point_Team1.Text
```

**Примечание**: В нашем проекте для полей типа `visibility` (pointA, pointB) автоматически устанавливается символ ● и управляется видимость в зависимости от того, у какой команды подача (значение `match.currentSet.servingTeam`: 'A' или 'B').

### Поля изображений (`type: "image"`)

**Формат значения**: Путь к файлу или URL изображения

**Команда**: Для установки изображения используется команда `SetImage`, а не `SetText`.

**Пример**:

```
GET http://localhost:8088/api?Function=SetImage&Input=Input1&SelectedName=TeamALogo&Value=http%3A%2F%2F192.168.1.100%3A3000%2Flogo_a_1703123456789.png
```

**Примечание**: В примере используется уникальное имя файла `logo_a_1703123456789.png` с timestamp для обхода кэширования vMix. Префикс `logos/` не включается в URL - имя файла извлекается из `logoPath` (удаляется префикс `logos/`).

**Параметры команды SetImage**:

| Параметр        | Тип    | Обязательный | Описание                                    |
| --------------- | ------ | ------------ | ------------------------------------------- |
| `Function`      | string | Да           | Всегда должно быть `SetImage`               |
| `Input`         | string | Да           | Имя или номер инпута                        |
| `SelectedName`  | string | Да           | Имя поля изображения (fieldIdentifier)      |
| `Value`         | string | Да           | Путь к файлу или URL изображения            |

**Примечание**: Символы `:`, `/` должны быть закодированы в URL (`%3A`, `%2F`).

**Использование в проекте**: Поля логотипов команд (`teamALogo`, `teamBLogo`) имеют тип `image` и используют команду `SetImage` для установки изображений.

## Формирование URL для логотипов

Логотипы передаются как URL, указывающий на мобильный HTTP сервер:

**Формат URL**:

```
http://[IP_сервера]:[порт]/logo_a_<timestamp>.png  (для команды А)
http://[IP_сервера]:[порт]/logo_b_<timestamp>.png  (для команды Б)
```

**Где**:

- `[IP_сервера]` - IP адрес выбранного сетевого интерфейса (из настроек `mobile.selectedIP` или автоматически определенный)
  - Пользователь может выбрать конкретный сетевой интерфейс на странице "Мобильный доступ"
  - Если выбранный IP недоступен, используется автоматическое определение по приоритету (игнорирует VPN)
  - Это позволяет работать в разных подсетях (например, сервер в 10.x.x.x, vMix в 192.168.144.x)
- `[порт]` - порт мобильного HTTP сервера (по умолчанию 3000, настраивается в настройках)
- `<timestamp>` - уникальный timestamp, добавляемый к имени файла для обхода кэширования vMix
  - Формат: `logo_a_1703123456789.png` (например)
  - Каждое обновление логотипа создает новый файл с новым timestamp
  - Это гарантирует, что vMix всегда загружает актуальную версию логотипа
- Путь `/logos/` НЕ включается в URL - имя файла извлекается из `logoPath` (удаляется префикс `logos/`)
- Мобильный сервер обслуживает файлы из папки `logos/` как статические файлы:
  - **Dev режим:** файлы из папки `logos/` в корне проекта
  - **Production режим:** файлы из папки `userData/logos/` (доступно для записи)
- Файлы логотипов сохраняются автоматически в папку logos при:
  1. Загрузке нового логотипа (`logo:save-to-file`)
  2. Открытии сохраненного матча (`fileManager.openMatch`)
  3. Смене команд местами (`match:swap-teams`)

**Пример полного запроса**:

```
GET http://localhost:8088/api?Function=SetImage&Input=Input1&SelectedName=TeamALogo&Value=http%3A%2F%2F192.168.144.100%3A3000%2Flogo_a_1703123456789.png
```

**Примечания**:
- В примере используется `SetImage` (а не `SetText`) для установки изображения
- IP адрес `192.168.144.100` соответствует выбранному сетевому интерфейсу в подсети vMix
- Имя файла `logo_a_1703123456789.png` содержит уникальный timestamp для обхода кэширования vMix
- **Обратная совместимость:** Для старых матчей без `logoPath` используется fallback на фиксированное имя `logo_a.png` или `logo_b.png`

**Система уникальных имен файлов**:

- **Проблема:** vMix кэширует изображения по имени файла, что приводило к тому, что обновленные логотипы не отображались в vMix
- **Решение:** Каждое сохранение логотипа создает новый файл с уникальным именем, включающим timestamp
- **Формат в JSON:** `logoPath: "logos/logo_a_1703123456789.png"` (вместо фиксированного `logos/logo_a.png`)
- **Очистка старых файлов:** Автоматически удаляются все файлы `logo_*.png` при:
  - Старте приложения
  - Сохранении матча
  - Смене команд местами
  - Загрузке нового логотипа

## Управление оверлеями

vMix поддерживает 8 оверлеев (overlay 1-8), каждый из которых может отображать один инпут поверх основного видео.

### Показать инпут в оверлее (ON)

**Команда**: `OverlayInput[N]In`

**Формат запроса**:

```
GET http://[host]:[port]/api?Function=OverlayInput[N]In&Input=[inputIdentifier]
```

**Параметры**:

| Параметр   | Тип    | Обязательный | Описание                                             |
| ---------- | ------ | ------------ | ---------------------------------------------------- |
| `Function` | string | Да           | `OverlayInput[N]In`, где `[N]` - номер оверлея (1-8) |
| `Input`    | string | Да           | Имя или номер инпута для отображения в оверлее       |

**Где**:

- `[N]` - номер оверлея (1-8)
- `[inputIdentifier]` - имя или номер инпута

**Примеры**:

```
// Показать Input5 в оверлее 1
GET http://localhost:8088/api?Function=OverlayInput1In&Input=Input5

// Показать инпут "Счет матча" в оверлее 2
GET http://localhost:8088/api?Function=OverlayInput2In&Input=Счет%20матча
```

**Результат**: Инпут отображается в указанном оверлее поверх основного видео.

### Скрыть оверлей (OFF)

**Команда**: `OverlayInput[N]Out`

**Формат запроса**:

```
GET http://[host]:[port]/api?Function=OverlayInput[N]Out
```

**Параметры**:

| Параметр   | Тип    | Обязательный | Описание                                              |
| ---------- | ------ | ------------ | ----------------------------------------------------- |
| `Function` | string | Да           | `OverlayInput[N]Out`, где `[N]` - номер оверлея (1-8) |

**Где**:

- `[N]` - номер оверлея (1-8)

**Примеры**:

```
// Скрыть оверлей 1
GET http://localhost:8088/api?Function=OverlayInput1Out

// Скрыть оверлей 2
GET http://localhost:8088/api?Function=OverlayInput2Out
```

**Результат**: Оверлей скрывается (выходит).

### Переключить состояние оверлея (TOGGLE)

**Команда**: `OverlayInput[N]Toggle`

**Формат запроса**:

```
GET http://[host]:[port]/api?Function=OverlayInput[N]Toggle&Input=[inputIdentifier]
```

**Параметры**:

| Параметр   | Тип    | Обязательный | Описание                                                 |
| ---------- | ------ | ------------ | -------------------------------------------------------- |
| `Function` | string | Да           | `OverlayInput[N]Toggle`, где `[N]` - номер оверлея (1-8) |
| `Input`    | string | Да           | Имя или номер инпута                                     |

**Где**:

- `[N]` - номер оверлея (1-8)
- `[inputIdentifier]` - имя или номер инпута

**Примеры**:

```
// Переключить состояние оверлея 1 с инпутом Input5
GET http://localhost:8088/api?Function=OverlayInput1Toggle&Input=Input5
```

**Результат**:

- Если оверлей скрыт - показывает инпут
- Если оверлей показан - скрывает оверлей

**Примечание**: Toggle работает только если в оверлее уже установлен указанный инпут, иначе просто показывает инпут.

### Включить оверлей (ON) - альтернативный способ

**Команда**: `OverlayInput[N]On`

**Формат запроса**:

```
GET http://[host]:[port]/api?Function=OverlayInput[N]On&Input=[inputIdentifier]
```

**Пример**:

```
GET http://localhost:8088/api?Function=OverlayInput1On&Input=Input5
```

**Результат**: Аналогично `OverlayInput[N]In` - показывает инпут в оверлее.

### Выключить оверлей (OFF) - альтернативный способ

**Команда**: `OverlayInput[N]Off`

**Формат запроса**:

```
GET http://[host]:[port]/api?Function=OverlayInput[N]Off
```

**Пример**:

```
GET http://localhost:8088/api?Function=OverlayInput1Off
```

**Результат**: Аналогично `OverlayInput[N]Out` - скрывает оверлей.

### Сравнение команд для управления оверлеями

| Команда                 | Описание                 | Параметр Input | Когда использовать       |
| ----------------------- | ------------------------ | -------------- | ------------------------ |
| `OverlayInput[N]In`     | Показать инпут в оверлее | Да             | Явное включение оверлея  |
| `OverlayInput[N]Out`    | Скрыть оверлей           | Нет            | Явное выключение оверлея |
| `OverlayInput[N]Toggle` | Переключить состояние    | Да             | Переключение видимости   |
| `OverlayInput[N]On`     | Включить оверлей         | Да             | Альтернатива для In      |
| `OverlayInput[N]Off`    | Выключить оверлей        | Нет            | Альтернатива для Out     |

## Получение информации о состоянии

### Получить состояние vMix (XML)

**Формат запроса**:

```
GET http://[host]:[port]/api
```

**Описание**: Возвращает XML документ с полной информацией о состоянии vMix, включая:

- Список всех инпутов
- Состояние оверлеев (активен/неактивен, какой инпут отображается)
- Текущие значения полей
- Текущий Preview и Program
- И другую информацию

**Пример ответа** (упрощенный):

```xml
<vmix>
  <version>24.0.0.83</version>
  <inputs>
    <input number="1" title="Input1" type="Title">...</input>
    <input number="5" title="Input5" type="Title">...</input>
  </inputs>
  <overlays>
    <overlay number="1" active="true" input="5">...</overlay>
    <overlay number="2" active="false" input="">...</overlay>
    <!-- ... оверлеи 3-8 ... -->
  </overlays>
</vmix>
```

### Получение состояния оверлеев

**Формат запроса**:

```
GET http://[host]:[port]/api
```

**Структура XML ответа для оверлеев**:

```xml
<vmix>
  <overlays>
    <overlay number="1" active="true" input="5"/>
    <overlay number="2" active="false" input=""/>
    <overlay number="3" active="true" input="3"/>
    <!-- ... остальные оверлеи ... -->
    <overlay number="8" active="false" input=""/>
  </overlays>
</vmix>
```

**Атрибуты элемента `<overlay>`**:

| Атрибут  | Тип     | Описание                                                                                    |
| -------- | ------- | ------------------------------------------------------------------------------------------- |
| `number` | number  | Номер оверлея (1-8)                                                                         |
| `active` | boolean | `true` - оверлей активен (видим), `false` - оверлей неактивен (скрыт)                       |
| `input`  | string  | Номер или имя инпута, который отображается в оверлее. Пустая строка, если оверлей неактивен |

### Парсинг состояния оверлеев

**Пример структуры данных после парсинга XML**:

```javascript
{
  1: { active: true, input: "Input5" },
  2: { active: false, input: null },
  3: { active: true, input: "Input3" },
  4: { active: false, input: null },
  5: { active: false, input: null },
  6: { active: false, input: null },
  7: { active: false, input: null },
  8: { active: false, input: null }
}
```

**Где**:

- Ключ - номер оверлея (1-8)
- `active` - boolean, активен ли оверлей
- `input` - строка с именем/номером инпута или `null`, если оверлей неактивен

### Проверка активности оверлея для конкретного инпута

Для реализации state-dependent кнопок нужно проверить:

1. Активен ли указанный оверлей (`active === true`)
2. Совпадает ли инпут в оверлее с нужным инпутом (`input === inputIdentifier`)

**Пример логики проверки**:

```javascript
function isOverlayActive(overlayState, overlayNumber, inputIdentifier) {
  const overlay = overlayState[overlayNumber];
  if (!overlay) {
    return false;
  }
  return overlay.active === true && overlay.input === inputIdentifier;
}

// Использование
const overlayStates = {
  1: { active: true, input: "Input5" },
  2: { active: false, input: null },
};

// Проверка для Input5 в оверлее 1
const isActive = isOverlayActive(overlayStates, 1, "Input5"); // true

// Проверка для Input3 в оверлее 2
const isActive2 = isOverlayActive(overlayStates, 2, "Input3"); // false
```

### Реализация state-dependent кнопок

**Алгоритм работы кнопки управления оверлеем**:

1. При загрузке страницы и периодически (каждые 1-2 секунды):

   - Запрашивать состояние vMix через `GET /api`
   - Парсить XML и извлекать состояние оверлеев
   - Обновлять состояние кнопок

2. При отображении кнопки:

   - Проверять `isOverlayActive(overlayStates, overlayNumber, inputIdentifier)`
   - Если `true` - показывать кнопку как активную (например, зеленым цветом)
   - Если `false` - показывать кнопку как неактивную (например, серым цветом)

3. При клике на кнопку:
   - Если оверлей активен - отправлять `OverlayInput[N]Out` (скрыть)
   - Если оверлей неактивен - отправлять `OverlayInput[N]In` с параметром `Input` (показать)
   - Или использовать `OverlayInput[N]Toggle` для автоматического переключения

**Пример реализации**:

```javascript
// Получение состояния оверлеев
async function getOverlayStates() {
  const response = await fetch("http://localhost:8088/api");
  const xmlText = await response.text();
  // Парсинг XML (нужен XML парсер, например xml2js или DOMParser)
  const overlayStates = parseOverlayStates(xmlText);
  return overlayStates;
}

// Проверка активности оверлея для инпута
function isOverlayActive(overlayStates, inputConfig) {
  const overlayNumber = inputConfig.overlay;
  const inputIdentifier = inputConfig.inputIdentifier;
  const overlay = overlayStates[overlayNumber];

  return (
    overlay && overlay.active === true && overlay.input === inputIdentifier
  );
}

// Обработчик клика кнопки
async function handleOverlayToggle(inputKey, inputConfig, overlayStates) {
  const overlayNumber = inputConfig.overlay;
  const inputIdentifier = inputConfig.inputIdentifier;
  const isActive = isOverlayActive(overlayStates, inputConfig);

  const functionName = isActive
    ? `OverlayInput${overlayNumber}Out`
    : `OverlayInput${overlayNumber}In`;

  const params = isActive ? {} : { Input: inputIdentifier };

  const url = `http://localhost:8088/api?Function=${functionName}${
    params.Input ? "&Input=" + encodeURIComponent(params.Input) : ""
  }`;
  await fetch(url);
}
```

## Кодирование URL

При формировании запросов необходимо правильно кодировать специальные символы:

| Символ | URL-кодирование |
| ------ | --------------- |
| Пробел | `%20`           |
| `#`    | `%23`           |
| `:`    | `%3A`           |
| `/`    | `%2F`           |
| `&`    | `%26`           |
| `?`    | `%3F`           |
| `=`    | `%3D`           |
| `%`    | `%25`           |

### Пример кодирования

**Оригинальное значение**: `http://192.168.1.100:3000/logo_a_1703123456789.png`

**Закодированное значение**: `http%3A%2F%2F192.168.1.100%3A3000%2Flogo_a_1703123456789.png`

## Примеры использования в нашем проекте

### Управление оверлеями

Для управления оверлеями в нашем проекте используется структура из настроек:

```javascript
// Настройки из settings.json
const inputConfig = {
  inputIdentifier: "Input5",
  overlay: 1, // Номер оверлея
  enabled: true,
};

// Базовый URL vMix API
const baseURL = `http://localhost:8088/api`;

// Показать инпут в оверлее (ON)
const showOverlay = async (overlayNumber, inputIdentifier) => {
  const url = `${baseURL}?Function=OverlayInput${overlayNumber}In&Input=${encodeURIComponent(
    inputIdentifier
  )}`;
  await fetch(url);
};

// Скрыть оверлей (OFF)
const hideOverlay = async (overlayNumber) => {
  const url = `${baseURL}?Function=OverlayInput${overlayNumber}Out`;
  await fetch(url);
};

// Переключить состояние оверлея (TOGGLE)
const toggleOverlay = async (overlayNumber, inputIdentifier) => {
  const url = `${baseURL}?Function=OverlayInput${overlayNumber}Toggle&Input=${encodeURIComponent(
    inputIdentifier
  )}`;
  await fetch(url);
};

// Использование
await showOverlay(1, "Input5"); // Показать Input5 в оверлее 1
await hideOverlay(1); // Скрыть оверлей 1
await toggleOverlay(1, "Input5"); // Переключить состояние
```

### Получение состояния оверлеев для state-dependent кнопок

```javascript
// Получение состояния оверлеев из XML
async function getOverlayStates() {
  const response = await fetch("http://localhost:8088/api");
  const xmlText = await response.text();

  // Парсинг XML (пример с использованием DOMParser)
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const overlayStates = {};
  const overlayElements = xmlDoc.getElementsByTagName("overlay");

  for (let overlayEl of overlayElements) {
    const number = parseInt(overlayEl.getAttribute("number"));
    const active = overlayEl.getAttribute("active") === "true";
    const input = overlayEl.getAttribute("input") || null;

    overlayStates[number] = {
      active,
      input,
    };
  }

  return overlayStates;
}

// Проверка активности оверлея для конкретного инпута
function isOverlayActive(overlayStates, inputConfig) {
  const overlayNumber = inputConfig.overlay;
  const inputIdentifier = inputConfig.inputIdentifier;
  const overlay = overlayStates[overlayNumber];

  if (!overlay) {
    return false;
  }

  return overlay.active === true && overlay.input === inputIdentifier;
}

// Пример использования для кнопки
async function updateOverlayButton(inputKey, inputConfig) {
  const overlayStates = await getOverlayStates();
  const isActive = isOverlayActive(overlayStates, inputConfig);

  // Обновляем визуальное состояние кнопки
  buttonElement.style.backgroundColor = isActive ? "#27ae60" : "#95a5a6";
  buttonElement.textContent = isActive ? "Скрыть" : "Показать";
}

// Обработчик клика на кнопку оверлея
async function handleOverlayButtonClick(inputKey, inputConfig) {
  const overlayStates = await getOverlayStates();
  const isActive = isOverlayActive(overlayStates, inputConfig);
  const overlayNumber = inputConfig.overlay;
  const inputIdentifier = inputConfig.inputIdentifier;

  if (isActive) {
    // Скрываем оверлей
    await fetch(`${baseURL}?Function=OverlayInput${overlayNumber}Out`);
  } else {
    // Показываем оверлей
    await fetch(
      `${baseURL}?Function=OverlayInput${overlayNumber}In&Input=${encodeURIComponent(
        inputIdentifier
      )}`
    );
  }

  // Или используем toggle
  // await fetch(`${baseURL}?Function=OverlayInput${overlayNumber}Toggle&Input=${encodeURIComponent(inputIdentifier)}`);
}
```

### Обновление текущего счета

Для инпута "Текущий счет (во время партии)" (`currentScore`):

```javascript
// Настройки из settings.json
const inputConfig = {
  inputIdentifier: "Input5",
  fields: {
    teamA: { fieldIdentifier: "TeamA" },
    teamB: { fieldIdentifier: "TeamB" },
    scoreASet: { fieldIdentifier: "ScoreASet" },
    scoreBSet: { fieldIdentifier: "ScoreBSet" },
  },
};

// Формирование запросов
const baseURL = `http://localhost:8088/api`;

// Обновление названия команды А
fetch(
  `${baseURL}?Function=SetText&Input=Input5&SelectedName=TeamA&Value=${encodeURIComponent(
    "Спартак"
  )}`
);

// Обновление счета команды А
fetch(
  `${baseURL}?Function=SetText&Input=Input5&SelectedName=ScoreASet&Value=25`
);
```

### Обновление состава команды

Для инпута "Состав команды (полный)" (`roster`):

```javascript
// Обновление названия команды
fetch(
  `${baseURL}?Function=SetText&Input=Input3&SelectedName=TeamName&Value=${encodeURIComponent(
    "Спартак Москва"
  )}`
);

// Обновление города команды
fetch(
  `${baseURL}?Function=SetText&Input=Input3&SelectedName=TeamCity&Value=${encodeURIComponent(
    "Москва"
  )}`
);

// Обновление логотипа команды (если это поле типа image)
// Используется уникальное имя файла с timestamp для обхода кэширования vMix
const logoURL = `http://192.168.1.100:3000/logo_a_1703123456789.png`;
fetch(
  `${baseURL}?Function=SetImage&Input=Input3&SelectedName=TeamLogo&Value=${encodeURIComponent(
    logoURL
  )}`
);

// Обновление данных игрока 1
fetch(
  `${baseURL}?Function=SetText&Input=Input3&SelectedName=Player1Number&Value=10`
);
fetch(
  `${baseURL}?Function=SetText&Input=Input3&SelectedName=Player1Name&Value=${encodeURIComponent(
    "Иванов И.И."
  )}`
);
```

### Обновление заявки

Для инпута "Заявка (TeamA vs TeamB)" (`lineup`):

```javascript
// Обновление заголовка турнира
fetch(
  `${baseURL}?Function=SetText&Input=Input1&SelectedName=Title&Value=${encodeURIComponent(
    "Чемпионат России"
  )}`
);

// Обновление названия команды А
fetch(
  `${baseURL}?Function=SetText&Input=Input1&SelectedName=TeamAName&Value=${encodeURIComponent(
    "Спартак"
  )}`
);

// Обновление логотипа команды А
// Используется уникальное имя файла с timestamp для обхода кэширования vMix
const logoAURL = `http://192.168.1.100:3000/logo_a_1703123456789.png`;
fetch(
  `${baseURL}?Function=SetImage&Input=Input1&SelectedName=TeamALogo&Value=${encodeURIComponent(
    logoAURL
  )}`
);
```

## Обработка ошибок

vMix API возвращает XML ответ. В случае ошибки ответ может содержать информацию об ошибке.

### Пример успешного ответа

```xml
<vmix>
  <version>24.0.0.83</version>
  ...
</vmix>
```

### Пример ошибки

Если инпут не найден или поле не существует, vMix может вернуть ошибку. В этом случае проверьте:

- Корректность имени/номера инпута
- Корректность имени поля (`SelectedName`)
- Доступность vMix сервера

## Рекомендации по использованию

1. **Кодирование URL**: Всегда кодируйте значения параметров с помощью `encodeURIComponent()` в JavaScript
2. **Таймауты**: Устанавливайте разумные таймауты для запросов (обычно 3-5 секунд)
3. **Обработка ошибок**: Проверяйте ответы vMix на наличие ошибок
4. **Debounce**: Используйте debounce для частых обновлений, чтобы не перегружать vMix
5. **Порядок обновлений**: При обновлении множества полей, отправляйте запросы последовательно или с небольшими задержками

## Дополнительные ресурсы

- Официальная документация vMix: https://www.vmix.com/help24/
- Shortcut Function Reference: https://www.vmix.com/help24/index.htm?ShortcutFunctionReference.html

## Примечания

- В нашем проекте используется структура с `inputIdentifier` и `fieldIdentifier` для гибкой настройки имен
- Имена полей (`fieldIdentifier`) настраиваются пользователем в интерфейсе настроек vMix
- Все настройки сохраняются в глобальном файле `settings.json`
- При отправке команд проверяются флаги `enabled` - отключенные инпуты и поля пропускаются
