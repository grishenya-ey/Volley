/**
 * Скрипт для извлечения release notes из CHANGELOG.md для текущей версии
 * Используется electron-builder для автоматического заполнения release notes в GitHub Releases
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Получаем версию из package.json
const packageJson = require(join(__dirname, '../package.json'));
const currentVersion = packageJson.version;

// Читаем CHANGELOG.md
const changelogPath = join(__dirname, '../CHANGELOG.md');
const changelog = readFileSync(changelogPath, 'utf-8');

// Ищем секцию для текущей версии
// Формат: ## [1.0.7] - 2026-01-21
const versionPattern = new RegExp(
  `## \\[${currentVersion.replace(/\./g, '\\.')}\\] - (\\d{4}-\\d{2}-\\d{2})`,
  'i'
);

let match = changelog.match(versionPattern);

// Если версия не найдена, пытаемся использовать [Unreleased]
if (!match) {
  const unreleasedPattern = /^## \[Unreleased\]/m;
  const unreleasedMatch = changelog.match(unreleasedPattern);
  
  if (unreleasedMatch) {
    console.warn(`[extract-release-notes] Версия ${currentVersion} не найдена, используется [Unreleased]`);
    // Используем [Unreleased] как fallback
    const versionStartIndex = unreleasedMatch.index + unreleasedMatch[0].length;
    
    // Находим следующую версию
    const nextVersionPattern = /^## \[[\d.]+\] - \d{4}-\d{2}-\d{2}/m;
    const remainingChangelog = changelog.substring(versionStartIndex);
    const nextVersionMatch = remainingChangelog.match(nextVersionPattern);
    
    let releaseNotes;
    if (nextVersionMatch) {
      releaseNotes = remainingChangelog.substring(0, nextVersionMatch.index).trim();
    } else {
      releaseNotes = remainingChangelog.trim();
    }
    
    releaseNotes = releaseNotes
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n')
      .trim();
    
    if (releaseNotes) {
      console.log(releaseNotes);
      process.exit(0);
    }
  }
  
  console.error(`[extract-release-notes] Версия ${currentVersion} не найдена в CHANGELOG.md и [Unreleased] пуст`);
  process.exit(1);
}

// Находим начало секции текущей версии
const versionStartIndex = match.index + match[0].length;

// Находим следующую версию или конец файла
const nextVersionPattern = /^## \[[\d.]+\] - \d{4}-\d{2}-\d{2}/m;
const remainingChangelog = changelog.substring(versionStartIndex);
const nextVersionMatch = remainingChangelog.match(nextVersionPattern);

let releaseNotes;
if (nextVersionMatch) {
  // Берем текст до следующей версии
  releaseNotes = remainingChangelog.substring(0, nextVersionMatch.index).trim();
} else {
  // Берем весь оставшийся текст
  releaseNotes = remainingChangelog.trim();
}

// Очищаем от лишних пробелов и форматируем
releaseNotes = releaseNotes
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .join('\n')
  .trim();

if (!releaseNotes) {
  console.error(`[extract-release-notes] Release notes для версии ${currentVersion} пусты`);
  process.exit(1);
}

// Выводим release notes (electron-builder читает из stdout)
console.log(releaseNotes);
