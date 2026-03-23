/**
 * Тесты для экспорта настроек
 * TDD подход: сначала тесты (Red), затем реализация (Green)
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';

// Моки для settingsManager
vi.mock('../../../src/main/settingsManager.ts', async () => {
  const actual = await vi.importActual('../../../src/main/settingsManager.ts');
  return {
    ...actual,
    loadSettings: vi.fn(),
  };
});

// Моки для settingsValidator
vi.mock('../../../src/main/utils/settingsValidator.ts', async () => {
  const actual = await vi.importActual('../../../src/main/utils/settingsValidator.ts');
  return {
    ...actual,
    validateSettings: vi.fn(),
  };
});

describe('settingsExport', () => {
  let testExportDir: string;
  let testExportFile: string;

  beforeEach(async () => {
    testExportDir = path.join(process.cwd(), 'tests', 'temp-test-export');
    testExportFile = path.join(testExportDir, 'exported-settings.json');

    // Очищаем тестовую директорию
    try {
      await fs.rm(testExportDir, { recursive: true, force: true });
    } catch {
      // Игнорируем ошибки
    }
  });

  afterEach(async () => {
    // Очищаем тестовую директорию после тестов
    try {
      await fs.rm(testExportDir, { recursive: true, force: true });
    } catch {
      // Игнорируем ошибки
    }
  });

  test('exportSettings должен экспортировать все настройки в указанный файл', async () => {
    // Этот тест будет падать до реализации функции
    // После реализации должен проходить
    const { exportSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const testSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {},
      },
      mobile: {
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      },
    };

    vi.mocked(loadSettings).mockResolvedValue(testSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });

    await exportSettings(testExportFile);

    // Проверяем, что файл создан
    await expect(fs.access(testExportFile)).resolves.not.toThrow();

    // Проверяем содержимое
    const content = await fs.readFile(testExportFile, 'utf-8');
    const exported = JSON.parse(content);
    expect(exported.vmix.host).toBe('localhost');
    expect(exported.vmix.port).toBe(8088);
  });

  test('exportSettings должен создавать файл, если он не существует', async () => {
    const { exportSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const testSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {},
      },
    };

    vi.mocked(loadSettings).mockResolvedValue(testSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });

    // Проверяем, что файл не существует
    await expect(fs.access(testExportFile)).rejects.toThrow();

    await exportSettings(testExportFile);

    // Проверяем, что файл создан
    await expect(fs.access(testExportFile)).resolves.not.toThrow();
  });

  test('exportSettings должен перезаписывать существующий файл', async () => {
    const { exportSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    // Создаем существующий файл
    await fs.mkdir(testExportDir, { recursive: true });
    await fs.writeFile(testExportFile, JSON.stringify({ old: 'data' }), 'utf-8');

    const testSettings = {
      vmix: {
        host: 'newhost',
        port: 9999,
        inputs: {},
      },
    };

    vi.mocked(loadSettings).mockResolvedValue(testSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });

    await exportSettings(testExportFile);

    // Проверяем, что файл перезаписан
    const content = await fs.readFile(testExportFile, 'utf-8');
    const exported = JSON.parse(content);
    expect(exported.vmix.host).toBe('newhost');
    expect(exported.old).toBeUndefined();
  });

  test('exportSettings должен валидировать настройки перед экспортом', async () => {
    const { exportSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const testSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {},
      },
    };

    vi.mocked(loadSettings).mockResolvedValue(testSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });

    await exportSettings(testExportFile);

    // Проверяем, что validateSettings была вызвана
    expect(validateSettings).toHaveBeenCalledWith(testSettings);
  });

  test('exportSettings должен выбрасывать ошибку при некорректных настройках', async () => {
    const { exportSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const testSettings = {
      vmix: {
        host: '', // Некорректные настройки
        port: 70000,
        inputs: {},
      },
    };

    vi.mocked(loadSettings).mockResolvedValue(testSettings);
    vi.mocked(validateSettings).mockReturnValue({
      valid: false,
      errors: ['host должен быть непустой строкой', 'port должен быть числом от 1 до 65535'],
    });

    await expect(exportSettings(testExportFile)).rejects.toThrow();

    // Проверяем, что файл не создан
    await expect(fs.access(testExportFile)).rejects.toThrow();
  });

  test('exportSettings должен сохранять JSON в читаемом формате (с отступами)', async () => {
    const { exportSettings } = await import('../../../src/main/settingsImportExport.ts');
    const { loadSettings } = await import('../../../src/main/settingsManager.ts');
    const { validateSettings } = await import('../../../src/main/utils/settingsValidator.ts');

    const testSettings = {
      vmix: {
        host: 'localhost',
        port: 8088,
        inputs: {
          currentScore: {
            enabled: true,
            inputIdentifier: 'Input7',
            overlay: 1,
            fields: {
              scoreA: {
                type: 'text',
                fieldIdentifier: 'ScoreA',
                enabled: true,
              },
            },
          },
        },
      },
    };

    vi.mocked(loadSettings).mockResolvedValue(testSettings);
    vi.mocked(validateSettings).mockReturnValue({ valid: true, errors: [] });

    await exportSettings(testExportFile);

    // Проверяем, что файл содержит отформатированный JSON
    const content = await fs.readFile(testExportFile, 'utf-8');
    expect(content).toContain('\n'); // Должны быть переносы строк
    expect(content).toContain('  '); // Должны быть отступы

    // Проверяем, что JSON валидный
    const parsed = JSON.parse(content);
    expect(parsed.vmix.host).toBe('localhost');
  });
});
