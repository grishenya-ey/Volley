/**
 * Скрипт для подготовки иконок приложения перед сборкой
 * Копирует favicon.ico в assets/icon.ico для electron-builder
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = path.join(__dirname, '..');
const faviconSource = path.join(rootDir, 'src/renderer/favicon.ico');
const assetsDir = path.join(rootDir, 'assets');
const iconIcoDest = path.join(assetsDir, 'icon.ico');
const iconPngDest = path.join(assetsDir, 'icon.png');

console.log('[prepare-icons] Подготовка иконок для сборки...');

// Создаем папку assets, если её нет
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('[prepare-icons] ✓ Создана папка assets');
}

// Копируем favicon.ico в assets/icon.ico
if (fs.existsSync(faviconSource)) {
  fs.copyFileSync(faviconSource, iconIcoDest);
  console.log('[prepare-icons] ✓ Скопирован favicon.ico → assets/icon.ico');
  
  // Также копируем как icon.png (для macOS и Linux, если нужен PNG)
  // Если favicon.ico содержит несколько размеров, это будет работать
  // Для лучшего качества можно создать отдельный PNG файл
  if (!fs.existsSync(iconPngDest)) {
    // Пробуем скопировать как PNG (некоторые .ico файлы можно использовать как PNG)
    try {
      fs.copyFileSync(faviconSource, iconPngDest);
      console.log('[prepare-icons] ✓ Скопирован favicon.ico → assets/icon.png');
    } catch (error) {
      console.warn('[prepare-icons] ⚠ Не удалось создать icon.png:', error.message);
      console.log('[prepare-icons] ℹ Для macOS и Linux рекомендуется создать отдельный icon.png файл');
    }
  }
} else {
  console.error('[prepare-icons] ✗ Файл favicon.ico не найден:', faviconSource);
  console.error('[prepare-icons] ✗ Убедитесь, что favicon.ico находится в src/renderer/');
  process.exit(1);
}

// Проверяем, что иконка существует и имеет правильный размер
if (fs.existsSync(iconIcoDest)) {
  const stats = fs.statSync(iconIcoDest);
  console.log(`[prepare-icons] ✓ Размер icon.ico: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('[prepare-icons] ℹ Для Windows exe рекомендуется использовать .ico файл с размерами: 16x16, 32x32, 48x48, 256x256');
}

console.log('[prepare-icons] ✓ Иконки подготовлены для сборки');
