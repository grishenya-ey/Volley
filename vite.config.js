import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Плагин для копирования favicon.ico в корень dist
const copyFaviconPlugin = () => {
  return {
    name: 'copy-favicon',
    writeBundle() {
      const faviconSource = path.resolve(__dirname, 'src/renderer/favicon.ico');
      const faviconDest = path.resolve(__dirname, 'dist/favicon.ico');
      
      if (fs.existsSync(faviconSource)) {
        fs.copyFileSync(faviconSource, faviconDest);
        console.log('[vite] ✓ Скопирован favicon.ico в корень dist');
      }
    },
  };
};

export default defineConfig({
  plugins: [
    react({
      // Включаем поддержку React 18
      jsxRuntime: 'automatic',
    }),
    copyFaviconPlugin(),
  ],
  base: './',
  root: path.resolve(__dirname, './src/renderer'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // Для Electron используем относительные пути
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Используем относительные пути для корректной работы в Electron
        format: 'es',
        // Убеждаемся, что все модули правильно обработаны
        generatedCode: {
          constBindings: true,
        },
      },
    },
    commonjsOptions: {
      // Включаем обработку CommonJS модулей, включая React, React Router и все их зависимости
      include: [
        /src\/shared\/.*/,
        /node_modules\/react/,
        /node_modules\/react-dom/,
        /node_modules\/react-router/,
        /node_modules\/react-router-dom/,
        /node_modules\/scheduler/,
      ],
      transformMixedEsModules: true,
      // Принудительно преобразуем все CommonJS в ESM
      strictRequires: true,
      // Обрабатываем все require() вызовы
      requireReturnsDefault: 'auto',
    },
    // Убеждаемся, что все зависимости правильно обработаны
    target: 'esnext',
    minify: 'esbuild',
  },
  optimizeDeps: {
    // Включаем обработку CommonJS модулей в зависимостях
    include: ['react', 'react-dom', 'react-router-dom'],
    esbuildOptions: {
      // Поддержка React 18 и JSX в тестах
      jsx: 'automatic',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Принудительно используем ESM версию React
    dedupe: ['react', 'react-dom'],
    // Разрешаем импорты TypeScript файлов без расширений (для Vitest и Vite)
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  server: {
    port: 5173,
    // strictPort: false - позволяет переключиться на другой порт, если 5173 занят
  },
  
  // Конфигурация для Vitest
  test: {
    // Корневая директория для тестов (переопределяет root из build)
    root: __dirname,
    
    // Глобальные переменные (describe, it, expect доступны без импорта)
    globals: true,
    
    // Окружение для тестов (jsdom для React компонентов, node для main процесса)
    environment: 'jsdom',
    
    // Файл настройки, который выполняется перед каждым тестом
    setupFiles: ['./tests/setup.ts'],
    
    // Паттерны для поиска тестовых файлов
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'release'],
    
    // Настройки для работы с TypeScript
    typecheck: {
      enabled: false, // Отключаем typecheck, так как TypeScript обрабатывается через Vite
    },
    
    // Настройки esbuild для тестов (обработка JSX)
    esbuild: {
      jsx: 'automatic', // Автоматическая обработка JSX для тестов
    },
    
    // Настройки coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/__tests__/**',
        'src/renderer/index.tsx',
        'src/main/main.ts', // Точка входа, собирается через Vite отдельно
        'dist/**', // Игнорируем собранные файлы
      ],
      // Пороги покрытия кода
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50,
        },
        'src/shared/volleyballRules.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/shared/matchUtils.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Пороги для TypeScript файлов main процесса
        'src/main/**/*.ts': {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50,
        },
      },
    },
    
    // Таймаут для тестов (в миллисекундах)
    testTimeout: 10000,
    
    // Настройки для моков
    mockReset: true,
    restoreMocks: true,
  },
});

