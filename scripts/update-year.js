/**
 * Скрипт для автоматического обновления года в документации
 * Заменяет плейсхолдеры {CURRENT_YEAR} на текущий год
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const currentYear = new Date().getFullYear();
const rootDir = path.join(__dirname, '..');

// Файлы, в которых нужно обновить год
const filesToUpdate = [
  'USER_GUIDE.md',
  'README.md',
];

// Паттерны для замены
const patterns = [
  // {CURRENT_YEAR} плейсхолдер
  /\{CURRENT_YEAR\}/g,
  // Старые фиксированные годы (только если это не исторические даты в CHANGELOG)
  // Не трогаем CHANGELOG.md, так как там исторические даты должны оставаться
];

console.log(`[update-year] Обновление года на ${currentYear}...`);

let totalReplacements = 0;

for (const file of filesToUpdate) {
  const filePath = path.join(rootDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`[update-year] Файл не найден: ${file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let fileReplacements = 0;
  const originalContent = content;

  // Заменяем плейсхолдеры
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, currentYear.toString());
      fileReplacements += matches.length;
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[update-year] ✓ Обновлен ${file} (${fileReplacements} замен)`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`[update-year] - ${file} не требует обновления`);
  }
}

if (totalReplacements > 0) {
  console.log(`[update-year] ✓ Всего заменено: ${totalReplacements}`);
} else {
  console.log(`[update-year] ✓ Год уже актуален во всех файлах`);
}
