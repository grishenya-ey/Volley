# Замена библиотеки QR-кода: qrcode → qrcode.react

*Последнее обновление: 2026-01-23*

## Обзор

Этот документ описывает проблему с библиотекой `qrcode` в production сборке и её решение через замену на `qrcode.react`.

---

## Проблема

### Симптомы

После сборки проекта в production режиме QR-код на странице "Мобильный доступ" не генерировался. В консоли появлялась ошибка:

```
TypeError: g.find_path is not a function
    at Ae.n.fromString (qrcode-DlC8NZwO.js:4:444)
    at b (qrcode-DlC8NZwO.js:4:3184)
    at Re.Z.create (qrcode-DlC8NZwO.js:7:505)
```

### Причина

Библиотека `qrcode` (версия 1.5.4) несовместима с агрессивной минификацией esbuild в production сборке Vite. Минификация нарушает внутреннюю логику библиотеки, что приводит к ошибке `find_path is not a function`.

### Контекст

- **В dev режиме:** QR-код работал корректно
- **В production сборке:** QR-код не работал из-за минификации
- **Библиотека:** `qrcode` версии 1.5.4 (CommonJS модуль)
- **Сборщик:** Vite 7.3.0 с esbuild минификацией

---

## Решение

### Замена библиотеки

Библиотека `qrcode` была заменена на `qrcode.react` версии 4.2.0.

### Преимущества qrcode.react

1. **Совместимость с Vite:** React-компонент, полностью совместимый с Vite и production сборкой
2. **Нет проблем с минификацией:** Работает корректно после минификации esbuild
3. **Браузерная библиотека:** Предназначена для работы в браузере, не требует Node.js API
4. **TypeScript поддержка:** Встроенная поддержка TypeScript
5. **Активная поддержка:** 1150+ зависимых проектов, активно поддерживается

### Изменения в коде

#### package.json

```json
// Удалено
"qrcode": "^1.5.4",
"@types/qrcode": "^1.5.6", // из devDependencies

// Добавлено
"qrcode.react": "^4.2.0"
```

#### src/renderer/pages/MobileAccessPage.jsx

**Было:**
```javascript
import * as QRCode from 'qrcode';

const generateQRCode = async (url) => {
  const dataUrl = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  setQrCodeDataUrl(dataUrl);
};
```

**Стало:**
```javascript
import { QRCodeCanvas } from 'qrcode.react';

// Используем скрытый QRCodeCanvas для генерации data URL
const qrCodeContainerRef = useRef(null);
const [qrCodeUrl, setQrCodeUrl] = useState(null);

useEffect(() => {
  if (qrCodeUrl && qrCodeContainerRef.current) {
    const timer = setTimeout(() => {
      const canvas = qrCodeContainerRef.current?.querySelector('canvas');
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        setQrCodeDataUrl(dataUrl);
      }
    }, 150);
    return () => clearTimeout(timer);
  }
}, [qrCodeUrl]);

const generateQRCode = async (url) => {
  setQrCodeUrl(url);
  setQrCodeDataUrl(null);
};

// В JSX
{qrCodeUrl && (
  <div ref={qrCodeContainerRef} style={{ position: 'absolute', left: '-9999px' }}>
    <QRCodeCanvas
      value={qrCodeUrl}
      size={300}
      level="M"
      marginSize={2}
      bgColor="#FFFFFF"
      fgColor="#000000"
    />
  </div>
)}
```

#### vite.config.js

Удалены упоминания `qrcode` из:
- `commonjsOptions.include`
- `optimizeDeps.include`

---

## Тестирование

### Созданные тесты

Создан файл `tests/unit/renderer/MobileAccessPage.test.jsx` с тестами для:

1. Отображение страницы мобильного доступа
2. Загрузка сетевых интерфейсов
3. Запуск/остановка сервера
4. Генерация QR-кода после запуска сервера
5. Отображение QR-кода из сохраненной сессии
6. Очистка QR-кода при остановке сервера
7. Отображение сетевых интерфейсов
8. Обработка ошибок при генерации QR-кода

### Моки

Тесты используют моки для:
- `qrcode.react` (QRCodeCanvas компонент)
- Electron API
- React Router
- Layout компонентов

---

## Результат

### До исправления

- ❌ QR-код не работал в production сборке
- ❌ Ошибка `g.find_path is not a function`
- ❌ Проблема с минификацией библиотеки

### После исправления

- ✅ QR-код работает в production сборке
- ✅ Нет ошибок минификации
- ✅ Полное покрытие тестами
- ✅ Совместимость с Vite и Electron

---

## Файлы

### Измененные файлы

- `package.json` - замена библиотеки
- `src/renderer/pages/MobileAccessPage.jsx` - обновление кода для работы с qrcode.react
- `vite.config.js` - удаление упоминаний qrcode
- `tests/unit/renderer/MobileAccessPage.test.jsx` - новые тесты

### Удаленные зависимости

- `qrcode` (dependencies)
- `@types/qrcode` (devDependencies)

### Добавленные зависимости

- `qrcode.react` (dependencies)

---

## Связанная документация

- [Архитектура проекта](../architecture/ARCHITECTURE.md)
- [Руководство по тестированию](../testing/TESTING.md)
- [Структура UI](../getting-started/ui-structure.md)

---

## Примечания

- Замена библиотеки была необходима из-за несовместимости с минификацией
- `qrcode.react` - более подходящий выбор для React приложений
- Все тесты проходят успешно
- Функциональность QR-кода полностью сохранена
