#!/usr/bin/env node
/**
 * Скрипт для запуска Electron в dev режиме с Vite для main процесса
 * 
 * В dev режиме:
 * - Vite собирает main процесс в watch режиме
 * - Electron запускается с собранным main.js из dist/
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Определяем путь к Electron
const isWindows = process.platform === 'win32';
const projectRoot = join(__dirname, '..');

// Пробуем найти Electron в разных местах
const electronBinName = isWindows ? 'electron.cmd' : 'electron';
const electronPath = join(projectRoot, 'node_modules', '.bin', electronBinName);

let electronCommand;
let electronArgs;

if (existsSync(electronPath)) {
  electronCommand = electronPath;
  electronArgs = [projectRoot];
  console.log('[run-electron-dev] Используется Electron из node_modules/.bin');
} else {
  electronCommand = isWindows ? 'npx.cmd' : 'npx';
  electronArgs = ['electron', projectRoot];
  console.log('[run-electron-dev] Используется npx для запуска Electron');
}

// Проверяем, что dist/main.js существует
const mainJsPath = join(projectRoot, 'dist', 'main.js');
if (!existsSync(mainJsPath)) {
  console.warn('[run-electron-dev] Предупреждение: dist/main.js не найден. Убедитесь, что Vite собрал main процесс.');
  console.warn('[run-electron-dev] Запустите: npm run build:main');
}

console.log('[run-electron-dev] Запуск Electron в dev режиме...');
console.log('[run-electron-dev] Main процесс собирается через Vite в watch режиме');

// Запускаем Electron
const electron = spawn(electronCommand, electronArgs, {
  stdio: 'inherit',
  shell: isWindows,
  cwd: projectRoot,
});

electron.on('error', (error) => {
  console.error('[run-electron-dev] Ошибка при запуске Electron:', error);
  process.exit(1);
});

electron.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[run-electron-dev] Electron завершился с кодом ${code}`);
  }
  process.exit(code || 0);
});

// Обработка сигналов для корректного завершения
process.on('SIGTERM', () => {
  if (electron && !electron.killed) {
    electron.kill('SIGTERM');
  }
});

process.on('SIGINT', () => {
  if (electron && !electron.killed) {
    electron.kill('SIGINT');
  }
});
