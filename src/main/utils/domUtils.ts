/**
 * Утилиты для безопасной работы с DOM
 * Эти функции будут встроены в HTML для выполнения в браузере
 */

/**
 * Возвращает JavaScript код функций санитизации для встраивания в HTML
 * @returns {string} - JavaScript код функций
 */
function getSanitizationFunctions() {
  return `
    // Утилиты для безопасной работы с DOM
    function sanitizeText(text) {
      if (!text) return '';
      
      // Создаем временный элемент для экранирования HTML
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function createSafeImage(src, alt, onError) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = sanitizeText(alt);
      if (onError) {
        img.onerror = onError;
      }
      return img;
    }

    function setLogoContainer(container, logoUrl, teamName) {
      // Очищаем контейнер
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      if (logoUrl) {
        const img = createSafeImage(logoUrl, teamName, () => {
          // При ошибке загрузки скрываем контейнер (файл удалён, 404 и т.д.)
          container.style.display = 'none';
        });
        container.appendChild(img);
        container.style.display = 'flex';
      } else {
        container.style.display = 'none';
      }
    }

    function setTextContentSafe(element, text) {
      if (element) {
        element.textContent = sanitizeText(text);
      }
    }

    function createSetItem(set, currentSetNum, currentSet) {
      const setItem = document.createElement('div');
      setItem.className = 'set-item';
      
      if (set && set.completed) {
        setTextContentSafe(setItem, \`Партия \${set.setNumber}: \${set.scoreA} - \${set.scoreB}\`);
      } else if (set && set.setNumber === currentSetNum) {
        setItem.className = 'set-item current';
        setTextContentSafe(setItem, \`Партия \${set.setNumber}: Текущая (\${currentSet.scoreA} - \${currentSet.scoreB})\`);
      } else {
        setTextContentSafe(setItem, \`Партия \${set.setNumber}: -\`);
        setItem.style.color = '#bdc3c7';
      }
      
      return setItem;
    }
  `;
}

export {
  getSanitizationFunctions,
};
