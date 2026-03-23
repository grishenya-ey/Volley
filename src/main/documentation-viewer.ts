import { BrowserWindow, dialog, shell } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { marked } from "marked";
import { getDocumentationPath } from "./utils/pathUtils.ts";

// Получаем __dirname для ES-модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Приватная переменная для хранения окна документации (только одно окно)
let docWindow = null;

/**
 * Получает текущее окно документации (для внешнего доступа)
 * @returns {BrowserWindow|null} Окно документации или null
 */
export function getDocumentationWindow() {
  return docWindow && !docWindow.isDestroyed() ? docWindow : null;
}

/**
 * Генерирует HTML страницу для отображения документации
 * @param {string} htmlContent - HTML контент из Markdown
 * @param {string} title - Заголовок страницы
 * @returns {string} Полный HTML документ
 */
function generateDocumentationHTML(htmlContent, title) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3498db;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #ecf0f1;
    }
    h3 {
      color: #555;
      margin-top: 25px;
      margin-bottom: 12px;
    }
    p {
      margin-bottom: 15px;
    }
    ul, ol {
      margin-left: 30px;
      margin-bottom: 15px;
    }
    li {
      margin-bottom: 8px;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #e74c3c;
    }
    pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      margin-bottom: 15px;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #3498db;
      padding-left: 15px;
      margin-left: 0;
      color: #7f8c8d;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background: #3498db;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    a {
      color: #3498db;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 5px;
      margin: 15px 0;
    }
    strong {
      color: #2c3e50;
      font-weight: 600;
    }
    /* Плавная прокрутка для якорей */
    html {
      scroll-behavior: smooth;
    }
  </style>
</head>
<body>
  <div class="container">
    ${htmlContent}
  </div>
  <script>
    // Обработка навигации по якорям внутри документации
    (function() {
      // Функция для создания id из текста заголовка (как в GitHub)
      // Преобразует "Начало работы" в "начало-работы"
      // Использует тот же алгоритм, что и GitHub для совместимости
      function slugify(text) {
        if (!text) return '';
        return text
          .toLowerCase()
          .trim()
          // Заменяем пробелы, подчеркивания и другие пробельные символы на дефисы
          .replace(/[\s_]+/g, '-')
          // Удаляем все символы кроме букв (включая кириллицу), цифр и дефисов
          // Используем Unicode категории для поддержки всех букв
          .replace(/[^\p{L}\p{N}-]/gu, '')
          // Заменяем множественные дефисы на один
          .replace(/-+/g, '-')
          // Удаляем дефисы в начале и конце
          .replace(/^-+|-+$/g, '');
      }
      
      // Кэш для хранения id заголовков
      let headingsInitialized = false;
      
      // Автоматически добавляем id к заголовкам
      function addIdsToHeadings() {
        if (headingsInitialized) return; // Уже инициализировано
        
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let addedCount = 0;
        headings.forEach(function(heading) {
          // Если у заголовка еще нет id, создаем его из текста
          if (!heading.id) {
            const text = heading.textContent || heading.innerText;
            const slug = slugify(text);
            if (slug) {
              heading.id = slug;
              addedCount++;
            }
          }
        });
        
        if (addedCount > 0) {
          console.log('[Anchor] Добавлено id к', addedCount, 'заголовкам из', headings.length);
        }
        
        headingsInitialized = true;
      }
      
      // Инициализация якорей - вызываем сразу и при загрузке
      function initAnchors() {
        addIdsToHeadings();
      }
      
      // Вызываем сразу, если DOM готов
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          initAnchors();
          // Обрабатываем hash после инициализации
          setTimeout(handleInitialHash, 50);
        });
      } else {
        // Если DOM уже загружен, вызываем сразу
        initAnchors();
        setTimeout(handleInitialHash, 50);
      }
      
      // Также вызываем после полной загрузки страницы (на случай, если контент загружается асинхронно)
      window.addEventListener('load', function() {
        initAnchors();
        handleInitialHash();
      });
      
      // Функция для поиска элемента по якорю
      function findElementByAnchor(anchorId) {
        if (!anchorId) return null;
        
        // Декодируем якорь
        let decodedId;
        try {
          decodedId = decodeURIComponent(anchorId);
        } catch (e) {
          decodedId = anchorId;
        }
        
        // Убеждаемся, что id добавлены к заголовкам
        addIdsToHeadings();
        
        // Пробуем найти элемент по id
        let targetElement = document.getElementById(decodedId);
        
        // Если не нашли, пробуем найти по slug (на случай, если id отличается)
        if (!targetElement) {
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            const headingSlug = slugify(heading.textContent || heading.innerText);
            if (headingSlug === decodedId) {
              targetElement = heading;
              break;
            }
          }
        }
        
        // Также пробуем найти по атрибуту name
        if (!targetElement) {
          targetElement = document.querySelector('[name="' + decodedId + '"]');
        }
        
        if (!targetElement) {
          console.warn('[Anchor] Элемент не найден для якоря:', decodedId);
          // Выводим список доступных id для отладки
          const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          const availableIds = Array.from(allHeadings).map(function(h) {
            return h.id || slugify(h.textContent || h.innerText);
          }).filter(function(id) { return id; });
          console.log('[Anchor] Доступные id:', availableIds.slice(0, 10).join(', '), availableIds.length > 10 ? '...' : '');
        }
        
        return targetElement;
      }
      
      // Функция для прокрутки к элементу
      function scrollToElement(element, offset) {
        if (!element) return false;
        
        try {
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - (offset || 20);
          
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
          
          return true;
        } catch (e) {
          console.error('[Anchor] Ошибка при прокрутке:', e);
          return false;
        }
      }
      
      // Обработка начального hash при загрузке страницы
      function handleInitialHash() {
        // В data: URL hash может быть в самом URL или в window.location.hash
        let hash = window.location.hash;
        
        // Если hash нет в location, пробуем получить из URL
        if (!hash) {
          try {
            const url = new URL(window.location.href);
            hash = url.hash;
          } catch (e) {
            // Игнорируем ошибки парсинга URL
          }
        }
        
        if (hash && hash.length > 1) {
          const targetId = hash.substring(1);
          const targetElement = findElementByAnchor(targetId);
          
          if (targetElement) {
            // Небольшая задержка для полной загрузки контента
            setTimeout(function() {
              scrollToElement(targetElement, 20);
            }, 200);
          }
        }
      }
      
      // Обрабатываем клики по ссылкам с якорями
      // Используем capture phase для перехвата всех кликов до их обработки браузером
      document.addEventListener('click', function(e) {
        // Ищем ближайшую ссылку (может быть вложена в другие элементы)
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Если это якорь (начинается с #)
        if (href.startsWith('#')) {
          // Всегда предотвращаем стандартное поведение для якорей
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          const targetId = href.substring(1);
          if (!targetId) {
            // Пустой якорь - просто прокручиваем вверх
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          
          console.log('[Anchor] Клик по якорю:', targetId);
          
          // Убеждаемся, что id добавлены к заголовкам
          addIdsToHeadings();
          
          const targetElement = findElementByAnchor(targetId);
          
          if (targetElement) {
            console.log('[Anchor] Элемент найден, прокручиваем к нему');
            // Прокручиваем к элементу
            setTimeout(function() {
              scrollToElement(targetElement, 20);
            }, 10);
            
            // Обновляем URL для визуальной обратной связи
            try {
              // В data: URL мы не можем изменить hash через history.pushState
              // Но можем обновить window.location.hash для визуальной обратной связи
              window.location.hash = href;
            } catch (err) {
              // Игнорируем ошибки
              console.warn('[Anchor] Не удалось обновить hash:', err);
            }
          } else {
            console.warn('[Anchor] Не удалось найти элемент для якоря:', targetId);
            // Пробуем еще раз через небольшую задержку (на случай, если контент еще загружается)
            setTimeout(function() {
              addIdsToHeadings();
              const retryElement = findElementByAnchor(targetId);
              if (retryElement) {
                console.log('[Anchor] Элемент найден при повторной попытке');
                scrollToElement(retryElement, 20);
              }
            }, 100);
          }
        } else if (href.startsWith('http://') || href.startsWith('https://') || 
                   href.startsWith('mailto:') || href.startsWith('tel:')) {
          // Внешние ссылки - открываем в системном браузере через Electron API
          e.preventDefault();
          e.stopPropagation();
          // Попробуем открыть через window.open, но это будет перехвачено Electron
          window.open(href, '_blank');
        }
        // Относительные ссылки (без протокола) оставляем как есть
      }, true); // Используем capture phase для раннего перехвата
      
      // Обрабатываем изменение hash в URL (для случаев, когда hash меняется программно)
      window.addEventListener('hashchange', function() {
        handleInitialHash();
      });
    })();
  </script>
</body>
</html>`;
}

/**
 * Настраивает обработчики безопасности для окна документации
 * @param {BrowserWindow} window - Окно документации
 */
function setupSecurityHandlers(window) {
  // Безопасность: контролируем навигацию
  // Запрещаем переходы на внешние сайты, открываем их в системном браузере
  window.webContents.on("will-navigate", (event, navigationUrl) => {
    try {
      // Для data: URL разрешаем навигацию (включая переходы по якорям)
      // Якори внутри data: URL работают через JavaScript, а не через навигацию
      if (navigationUrl.startsWith("data:")) {
        // Разрешаем навигацию внутри data: URL
        return;
      }
    } catch (e) {
      // Если не удалось распарсить URL, возможно это относительный путь - разрешаем
      if (navigationUrl.startsWith("#") || navigationUrl.startsWith("data:")) {
        return;
      }
    }
    // Для всех остальных URL - открываем в системном браузере
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });

  // Безопасность: контролируем открытие новых окон (window.open, target="_blank")
  window.webContents.setWindowOpenHandler(({ url }) => {
    // Все внешние ссылки открываем в системном браузере
    shell.openExternal(url);
    return { action: "deny" }; // Запрещаем открытие в окне Electron
  });
}

/**
 * Открывает документацию в новом окне с рендерингом Markdown
 * @param {string} fileName - Имя файла документации (USER_GUIDE.md, INSTALLATION.md, README.md)
 * @param {string} title - Заголовок окна
 * @param {BrowserWindow} mainWindow - Главное окно приложения (для parent)
 * @param {boolean} isDev - Флаг режима разработки
 */
export function openDocumentationWindow(fileName, title, mainWindow, isDev) {
  try {
    // Закрываем предыдущее окно документации, если оно открыто
    if (docWindow && !docWindow.isDestroyed()) {
      docWindow.close();
    }

    // Используем единую утилиту для определения путей
    const docPath = getDocumentationPath(fileName);

    console.log(`[Help] Открытие документации: ${docPath}`);

    // Проверяем существование файла
    if (!fs.existsSync(docPath)) {
      console.error(`[Help] Файл не найден: ${docPath}`);
      if (mainWindow) {
        dialog.showErrorBox("Ошибка", `Файл не найден:\n${docPath}`);
      }
      return;
    }

    // Читаем содержимое файла
    let markdownContent = fs.readFileSync(docPath, "utf-8");

    // Заменяем плейсхолдер {CURRENT_YEAR} на текущий год
    const currentYear = new Date().getFullYear();
    markdownContent = markdownContent.replace(/\{CURRENT_YEAR\}/g, currentYear.toString());

    // Настраиваем marked для генерации id заголовков
    // В marked v4+ опции устанавливаются через marked.setOptions
    try {
      // Отключаем встроенную генерацию id, так как мы используем свою функцию slugify
      // для совместимости с форматом GitHub
      marked.setOptions({
        headerIds: false, // Отключаем встроенную генерацию id, используем свою
        mangle: false
      });
    } catch (e) {
      // Игнорируем ошибки, если опции не поддерживаются
      console.warn('[Help] Не удалось установить опции marked:', e.message);
    }

    // Конвертируем Markdown в HTML
    const htmlContent = marked.parse(markdownContent);

    // Генерируем полную HTML страницу
    const htmlPage = generateDocumentationHTML(htmlContent, title);

    // Создаем новое окно для документации
    docWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      title: title,
      parent: mainWindow, // Делаем окно дочерним
      modal: false, // Не модальное, чтобы можно было работать с основным окном
      autoHideMenuBar: true, // Скрываем меню (на Windows/Linux)
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // Отключаем возможность открытия новых окон через window.open
        nativeWindowOpen: false,
      },
    });

    // Полностью скрываем меню у окна документации (не влияет на основное окно)
    docWindow.setMenuBarVisibility(false);
    // Устанавливаем пустое меню для этого окна (на macOS меню в верхней панели)
    docWindow.setMenu(null);

    // Настраиваем обработчики безопасности
    setupSecurityHandlers(docWindow);

    // Очищаем ссылку на окно при его закрытии
    docWindow.on("closed", () => {
      docWindow = null;
    });

    // Загружаем HTML контент
    docWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlPage)}`);

    // Ждем полной загрузки страницы перед логированием
    docWindow.webContents.once("did-finish-load", () => {
      console.log(`[Help] Окно документации открыто: ${title}`);
      // В dev режиме автоматически открываем DevTools для отладки
      if (isDev) {
        docWindow.webContents.openDevTools();
      }
    });
  } catch (error) {
    console.error(`Ошибка при открытии документации ${fileName}:`, error);
    if (mainWindow) {
      dialog.showErrorBox(
        "Ошибка",
        `Не удалось открыть документацию:\n${error.message}`
      );
    }
  }
}
