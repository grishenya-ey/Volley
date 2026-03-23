const js = require('@eslint/js');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const unusedImports = require('eslint-plugin-unused-imports');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: react,
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Правила для обнаружения неиспользуемого кода
      'no-unused-vars': 'off', // Отключаем стандартное правило, используем более продвинутое
      'unused-imports/no-unused-imports': 'error', // Обнаруживает неиспользуемые импорты
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all', // Проверяем все переменные
          varsIgnorePattern: '^_', // Игнорируем переменные, начинающиеся с _
          args: 'after-used', // Проверяем аргументы после использованных
          argsIgnorePattern: '^_', // Игнорируем аргументы, начинающиеся с _
          ignoreRestSiblings: true, // Игнорируем оставшиеся свойства в деструктуризации
        },
      ],
      'no-unused-expressions': 'warn', // Предупреждает о неиспользуемых выражениях
      
      // React правила
      'react/prop-types': 'off', // Отключаем, так как используем TypeScript/JSDoc
      'react/react-in-jsx-scope': 'off', // Не нужно в React 17+
      'react/jsx-uses-vars': 'error', // Помечает переменные, используемые в JSX, как использованные
      'react/jsx-uses-react': 'off', // Не нужно в React 17+
      'react-hooks/rules-of-hooks': 'error', // Проверяем правила хуков
      'react-hooks/exhaustive-deps': 'warn', // Предупреждаем о зависимостях в useEffect
      
      // Общие правила
      'no-console': ['warn', { allow: ['warn', 'error'] }], // Разрешаем console.warn и console.error
      'no-debugger': 'warn', // Предупреждаем о debugger
      'no-alert': 'warn', // Предупреждаем об alert
    },
  },
  {
    // Для тестовых файлов более мягкие правила
    files: ['**/*.test.js', '**/*.test.jsx', '**/tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-expressions': 'off', // В тестах могут быть неиспользуемые выражения
      'unused-imports/no-unused-vars': 'off', // В тестах могут быть неиспользуемые переменные для моков
    },
  },
  {
    // Игнорируем файлы
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'release/**',
      'coverage/**',
      '*.config.js',
      'eslint.config.js', // Исключаем сам файл конфигурации
      '.babelrc',
      'vite.config.js',
      'jest.config.js',
      'docs/**',
      '*.log',
      '*.tmp',
      '.git/**',
      '.DS_Store',
      'package-lock.json',
      'tests/**', // Исключаем тесты из проверки неиспользуемого кода
    ],
  },
];
