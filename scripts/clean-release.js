#!/usr/bin/env node
/**
 * Скрипт для очистки папки release перед сборкой
 * Решает проблему "Access is denied" при попытке electron-builder удалить файлы
 */

import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const releaseDir = join(projectRoot, 'release');

async function cleanRelease() {
  try {
    if (existsSync(releaseDir)) {
      console.log('[clean-release] Удаление папки release...');
      
      // Пытаемся удалить папку с несколькими попытками
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        try {
          await rm(releaseDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
          console.log('[clean-release] Папка release успешно удалена');
          return;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            console.error('[clean-release] Не удалось удалить папку release после', maxAttempts, 'попыток');
            console.error('[clean-release] Возможные причины:');
            console.error('  1. Запущено приложение Electron из папки release');
            console.error('  2. Файлы заблокированы антивирусом');
            console.error('  3. Файлы открыты в другом приложении');
            console.error('[clean-release] Попробуйте:');
            console.error('  1. Закрыть все окна Electron');
            console.error('  2. Закрыть антивирус на время сборки');
            console.error('  3. Удалить папку release вручную');
            throw error;
          }
          console.warn(`[clean-release] Попытка ${attempts}/${maxAttempts} не удалась, повтор через 1 секунду...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      console.log('[clean-release] Папка release не существует, пропускаем очистку');
    }
  } catch (error) {
    console.error('[clean-release] Ошибка при очистке папки release:', error.message);
    process.exit(1);
  }
}

cleanRelease();
