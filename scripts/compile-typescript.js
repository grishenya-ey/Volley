#!/usr/bin/env node
/**
 * Скрипт для компиляции TypeScript файлов в JavaScript перед сборкой
 * 
 * ПРИМЕЧАНИЕ: После миграции на Vite для main процесса, этот скрипт больше не нужен
 * для main процесса. Vite автоматически обрабатывает TypeScript файлы.
 * 
 * Этот скрипт оставлен для обратной совместимости и может быть удален в будущем,
 * если все TypeScript файлы будут обрабатываться через Vite.
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('[compile-typescript] Начало компиляции TypeScript файлов...');
console.log('[compile-typescript] ПРИМЕЧАНИЕ: Main процесс теперь собирается через Vite');
console.log('[compile-typescript] Компилируем только shared файлы (если нужно)...');

try {
  // Компилируем TypeScript файлы
  // Теперь main процесс собирается через Vite, поэтому компилируем только shared
  console.log('[compile-typescript] Запуск tsc...');
  
  execSync('npx tsc --build tsconfig.build.json', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  
  console.log('[compile-typescript] ✓ Компиляция завершена успешно');
  console.log('[compile-typescript] JavaScript файлы созданы рядом с TypeScript файлами');
} catch (error) {
  console.error('[compile-typescript] Ошибка при компиляции TypeScript:', error.message);
  process.exit(1);
}
