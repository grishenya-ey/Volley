/**
 * Скрипт для ожидания запуска Vite dev server
 * Пробует подключиться к портам 5173, 5174, 5175, 5176
 */

import http from 'http';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// Получаем __dirname для ES-модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ports = [5173, 5174, 5175, 5176];
const maxAttempts = 120; // 120 попыток по 500ms = 60 секунд
let attempts = 0;

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      // Если получили ответ (любой статус), значит сервер работает
      // Vite может возвращать 200, 304, 404 и т.д. - главное, что отвечает
      resolve(true);
      req.destroy(); // Прерываем запрос, нам не нужны данные
    });
    
    req.on('error', (err) => {
      // ECONNREFUSED означает, что порт не слушается
      // Другие ошибки тоже означают, что сервер недоступен
      resolve(false);
    });
    
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForVite() {
  console.log('Ожидание запуска Vite dev server...');
  
  while (attempts < maxAttempts) {
    // Проверяем все порты параллельно
    const checks = ports.map(port => 
      checkPort(port).then(available => ({ port, available }))
        .catch(() => ({ port, available: false }))
    );
    const results = await Promise.all(checks);
    
    // Выводим статус для отладки (только первые несколько попыток)
    if (attempts < 3) {
      const status = results.map(r => `${r.port}:${r.available ? '✓' : '✗'}`).join(' ');
      console.log(`Попытка ${attempts + 1}: ${status}`);
    }
    
    const availablePort = results.find(r => r.available);
    if (availablePort) {
      console.log(`✓ Vite dev server найден на порту ${availablePort.port}`);
      // Сохраняем порт в файл для Electron
      const portFile = path.join(__dirname, '..', '.vite-port');
      fs.writeFileSync(portFile, availablePort.port.toString(), 'utf8');
      process.exit(0);
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.error('✗ Не удалось найти Vite dev server после', maxAttempts, 'попыток');
  console.error('Проверьте, что Vite запущен и доступен на одном из портов:', ports.join(', '));
  process.exit(1);
}

// Ждем немного перед началом проверки, чтобы дать Vite время запуститься
setTimeout(() => {
  waitForVite();
}, 1000);

