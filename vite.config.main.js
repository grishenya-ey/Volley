import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Плагин для копирования preload.cjs в dist
const copyPreloadPlugin = () => {
  return {
    name: 'copy-preload',
    writeBundle() {
      const preloadSource = path.resolve(__dirname, 'src/main/preload.cjs');
      const preloadDest = path.resolve(__dirname, 'dist/preload.cjs');
      
      if (fs.existsSync(preloadSource)) {
        fs.copyFileSync(preloadSource, preloadDest);
        console.log('[vite:main] ✓ Скопирован preload.cjs в dist');
      } else {
        console.warn('[vite:main] ⚠ preload.cjs не найден по пути:', preloadSource);
      }
    },
  };
};

/**
 * Конфигурация Vite для сборки Electron main процесса
 * 
 * Преимущества:
 * - Tree-shaking (удаление неиспользуемого кода)
 * - Поддержка TypeScript из коробки
 * - Минификация и оптимизация
 * - Единый инструмент для renderer и main процессов
 */
export default defineConfig({
  plugins: [
    copyPreloadPlugin(),
  ],
  // Точка входа для main процесса
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: false, // Не очищаем dist, так как там также renderer
    lib: {
      entry: path.resolve(__dirname, 'src/main/main.ts'),
      formats: ['es'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      // Внешние зависимости, которые не должны быть включены в бандл
      // Electron и Node.js модули должны оставаться внешними
      external: [
        // Electron модули
        'electron',
        'electron-updater',
        'electron-store',
        // Node.js встроенные модули
        'fs',
        'fs/promises',
        'path',
        'url',
        'http',
        'https',
        'crypto',
        'os',
        'util',
        'stream',
        'events',
        'buffer',
        'querystring',
        'zlib',
        'net',
        'tls',
        'dns',
        'child_process',
        'cluster',
        'worker_threads',
        'perf_hooks',
        'v8',
        'vm',
        'assert',
        'string_decoder',
        'punycode',
        'readline',
        'repl',
        'tty',
        'dgram',
        'http2',
        'inspector',
        'module',
        'process',
        // npm пакеты (не включаем в бандл, они должны быть в node_modules)
        'express',
        'uuid',
        'axios',
        'qrcode',
        'xml2js',
        'marked',
      ],
      output: {
        format: 'es',
        // Сохраняем структуру директорий для source maps
        preserveModules: false,
      },
    },
    // Минификация кода
    minify: 'esbuild',
    // Target для Electron main процесса (Node.js окружение)
    target: 'node18',
    // Source maps для отладки
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Разрешаем импорты без расширений для TypeScript файлов
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  // Оптимизация зависимостей
  optimizeDeps: {
    // Исключаем из оптимизации, так как это Node.js окружение
    exclude: ['electron'],
  },
});
