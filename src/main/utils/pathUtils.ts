/**
 * Утилита для единообразного определения путей к файлам и директориям
 * 
 * Решает проблему с различными путями в dev и production режимах после сборки через Vite.
 * 
 * Структура путей:
 * 
 * DEV режим:
 * - Корень проекта: определяется автоматически (dist/.. или src/main/../..)
 * - settings.json: <корень>/settings.json
 * - logos: <корень>/logos (для записи)
 * - matches: <корень>/matches
 * - assets: <корень>/assets
 * - preload.cjs: dist/preload.cjs (после сборки) или src/main/preload.cjs (исходный)
 * 
 * PRODUCTION режим:
 * - Корень приложения: app.getAppPath() (ASAR архив)
 * - settings.json: app.getPath('userData')/settings.json (для записи)
 * - logos: app.getPath('userData')/logos (для записи)
 * - matches: process.resourcesPath/matches (extraResources, только чтение)
 * - public: process.resourcesPath/public (extraResources, overlay-страницы и статика сервера)
 * - assets: process.resourcesPath/assets (extraResources)
 * - preload.cjs: app.getAppPath()/src/main/preload.cjs (в ASAR)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { app } from 'electron';
import fs from 'fs';

// Получаем __dirname текущего модуля
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Определяет, находится ли код в production режиме
 */
function isProduction() {
  try {
    return app && app.isPackaged;
  } catch {
    return false;
  }
}

/**
 * Определяет, находится ли код в dev режиме после сборки через Vite
 * (т.е. __dirname указывает на dist/)
 */
function isViteBuild() {
  return __dirname.includes('dist') || __dirname.endsWith('dist');
}

/**
 * Определяет корень проекта
 * 
 * В dev режиме:
 * - Если код собран через Vite (__dirname = dist/): возвращает dist/..
 * - Если исходный код (__dirname = src/main/): возвращает src/main/../..
 * 
 * В production: возвращает app.getAppPath()
 */
export function getProjectRoot() {
  if (isProduction()) {
    return app.getAppPath();
  }
  
  // В dev режиме определяем корень проекта
  if (isViteBuild()) {
    // После сборки через Vite __dirname = dist/
    return path.resolve(__dirname, '..');
  }
  
  // Исходный код в src/main/
  return path.resolve(__dirname, '../..');
}

/**
 * Получает путь к файлу настроек
 * 
 * В dev: <корень проекта>/settings.json
 * В production: app.getPath('userData')/settings.json (для записи)
 */
export function getSettingsPath() {
  if (isProduction()) {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'settings.json');
  }
  
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, 'settings.json');
}

/**
 * Получает путь к файлу настроек по умолчанию из extraResources
 * (используется для первого запуска в production)
 */
export function getDefaultSettingsPath() {
  if (isProduction() && process.resourcesPath) {
    return path.join(process.resourcesPath, 'settings.json');
  }
  
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, 'settings.json');
}

/**
 * Получает путь к папке logos
 * 
 * В dev: <корень проекта>/logos
 * В production: app.getPath('userData')/logos (для записи)
 */
export function getLogosDir() {
  if (isProduction()) {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'logos');
  }
  
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, 'logos');
}

/**
 * Получает путь к папке logos в extraResources (только для чтения, для миграции)
 */
export function getExtraResourcesLogosDir() {
  if (isProduction() && process.resourcesPath) {
    return path.join(process.resourcesPath, 'logos');
  }
  return null;
}

/**
 * Получает путь к папке matches
 * 
 * В dev: <корень проекта>/matches
 * В production: process.resourcesPath/matches (extraResources, только чтение)
 */
export function getMatchesDir() {
  if (isProduction() && process.resourcesPath) {
    return path.join(process.resourcesPath, 'matches');
  }
  
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, 'matches');
}

/**
 * Получает путь к папке public (overlay-страницы, статика мобильного сервера)
 *
 * В dev: <корень проекта>/public
 * В production: process.resourcesPath/public (extraResources, рядом с logos)
 */
export function getPublicDir() {
  if (isProduction() && process.resourcesPath) {
    return path.join(process.resourcesPath, 'public');
  }
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, 'public');
}

/**
 * Получает путь к папке assets
 * 
 * В dev: <корень проекта>/assets
 * В production: process.resourcesPath/assets (extraResources)
 */
export function getAssetsDir() {
  if (isProduction() && process.resourcesPath) {
    return path.join(process.resourcesPath, 'assets');
  }
  
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, 'assets');
}

/**
 * Получает путь к файлу иконки
 * 
 * В dev: <корень проекта>/assets/icon.ico (или .png)
 * В production: process.resourcesPath/assets/icon.ico (или .png)
 */
export function getIconPath() {
  const assetsDir = getAssetsDir();
  const icoPath = path.join(assetsDir, 'icon.ico');
  const pngPath = path.join(assetsDir, 'icon.png');
  
  // Проверяем существование файлов (синхронно, так как это может вызываться до async операций)
  if (fs.existsSync(icoPath)) {
    return icoPath;
  }
  if (fs.existsSync(pngPath)) {
    return pngPath;
  }
  
  // Возвращаем .ico по умолчанию, даже если файл не существует
  return icoPath;
}

/**
 * Получает путь к preload.cjs
 * 
 * В dev после сборки: dist/preload.cjs
 * В dev с исходным кодом: src/main/preload.cjs
 * В production: app.getAppPath()/src/main/preload.cjs (в ASAR)
 */
export function getPreloadPath() {
  if (isProduction()) {
    const appPath = app.getAppPath();
    return path.join(appPath, 'src/main/preload.cjs');
  }
  
  // В dev режиме
  if (isViteBuild()) {
    // После сборки через Vite preload.cjs копируется в dist/
    const preloadPath = path.join(__dirname, '..', 'preload.cjs');
    if (fs.existsSync(preloadPath)) {
      return preloadPath;
    }
    // Если не найден в dist, пробуем исходный путь
    const sourcePath = path.join(__dirname, '..', 'src/main/preload.cjs');
    if (fs.existsSync(sourcePath)) {
      return sourcePath;
    }
    return preloadPath; // Возвращаем путь к dist/preload.cjs по умолчанию
  }
  
  // Исходный код в src/main/
  return path.join(__dirname, '..', 'preload.cjs');
}

/**
 * Получает путь к файлу документации
 * 
 * В dev: <корень проекта>/<fileName>
 * В production: process.resourcesPath/<fileName> (extraResources)
 */
export function getDocumentationPath(fileName) {
  if (isProduction() && process.resourcesPath) {
    return path.join(process.resourcesPath, fileName);
  }
  
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, fileName);
}

/**
 * Получает путь к файлу .vite-port (для dev режима)
 */
export function getVitePortFilePath() {
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, '.vite-port');
}
