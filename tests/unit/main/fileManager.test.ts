/**
 * Тесты для модуля fileManager.ts
 * 
 * Проверяем:
 * 1. Сохранение матча (saveMatch) - с путем и без пути
 * 2. Диалог сохранения матча (saveMatchDialog)
 * 3. Создание нового матча (createMatch)
 * 4. Открытие матча из файла (openMatch)
 * 5. Диалог открытия матча (openMatchDialog)
 * 6. Обработка логотипов при сохранении
 * 7. Валидация матча
 * 8. Корректная работа с path модулем (критично для production)
 * 
 * ВАЖНО: Тесты явно проверяют использование path.join(), так как в production
 * была ошибка "path is not defined" из-за отсутствия импорта path в fileManager.ts.
 * Это исправление было внесено, и тесты подтверждают корректную работу.
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';

// Моки должны быть установлены ДО импорта модулей
vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
  },
  app: {
    isPackaged: false, // По умолчанию dev режим
  },
}));

// Мокируем pathUtils
vi.mock('../../../src/main/utils/pathUtils.ts', () => ({
  getMatchesDir: vi.fn(),
}));

// Мокируем logoManager
vi.mock('../../../src/main/logoManager.ts', () => ({
  getLogosDir: vi.fn(),
  cleanupLogosDirectory: vi.fn(),
  processTeamLogoForSave: vi.fn((team, teamLetter) => ({
    ...team,
    logoPath: `logos/logo_${teamLetter.toLowerCase()}_${Date.now()}.png`,
  })),
  processTeamLogoForLoad: vi.fn((team) => team),
}));

// Мокируем errorHandler
vi.mock('../../../src/shared/errorHandler.js', () => ({
  default: {
    handleError: vi.fn((error) => error.message),
  },
}));

describe('fileManager', () => {
  let testMatchesDir;
  let testLogosDir;
  let electronDialog;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Создаем временные директории для тестов
    testMatchesDir = path.join(process.cwd(), 'tests', 'temp-test-matches');
    testLogosDir = path.join(process.cwd(), 'tests', 'temp-test-logos');

    // Очищаем тестовые директории
    try {
      await fs.rm(testMatchesDir, { recursive: true, force: true });
      await fs.rm(testLogosDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки
    }

    // Настраиваем моки
    const { getMatchesDir } = await import('../../../src/main/utils/pathUtils.ts');
    vi.mocked(getMatchesDir).mockReturnValue(testMatchesDir);

    const logoManager = await import('../../../src/main/logoManager.ts');
    vi.mocked(logoManager.getLogosDir).mockReturnValue(testLogosDir);

    const electron = await import('electron');
    electronDialog = electron.dialog;
  });

  afterEach(async () => {
    // Очищаем тестовые директории после тестов
    try {
      await fs.rm(testMatchesDir, { recursive: true, force: true });
      await fs.rm(testLogosDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки
    }
  });

  describe('createMatch', () => {
    test('должен создавать новый матч', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const match = await fileManager.createMatch();

      expect(match).toBeDefined();
      expect(match.matchId).toBeDefined();
      expect(match.teamA).toBeDefined();
      expect(match.teamB).toBeDefined();
      expect(match.currentSet).toBeDefined();
    });
  });

  describe('saveMatch', () => {
    test('должен сохранять матч в файл с указанным путем', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      
      const match = createNewMatch();
      const filePath = path.join(testMatchesDir, 'test-match.json');

      // Создаем директорию
      await fs.mkdir(testMatchesDir, { recursive: true });

      const savedPath = await fileManager.saveMatch(match, filePath);

      expect(savedPath).toBe(filePath);

      // Проверяем, что файл создан
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const savedMatch = JSON.parse(fileContent);

      expect(savedMatch.matchId).toBe(match.matchId);
      expect(savedMatch.updatedAt).toBeDefined();
    });

    test('должен сохранять матч в файл без указанного пути (использует стандартный путь)', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      
      const match = createNewMatch();
      const expectedPath = path.join(testMatchesDir, `match_${match.matchId}.json`);

      // Создаем директорию
      await fs.mkdir(testMatchesDir, { recursive: true });

      const savedPath = await fileManager.saveMatch(match);

      expect(savedPath).toBe(expectedPath);

      // Проверяем, что файл создан
      const fileContent = await fs.readFile(expectedPath, 'utf-8');
      const savedMatch = JSON.parse(fileContent);

      expect(savedMatch.matchId).toBe(match.matchId);
    });

    test('должен создавать папку matches, если она не существует', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      
      const match = createNewMatch();
      const filePath = path.join(testMatchesDir, 'test-match.json');

      // Убеждаемся, что папка не существует
      try {
        await fs.rm(testMatchesDir, { recursive: true, force: true });
      } catch {
        // Игнорируем ошибки
      }

      await fileManager.saveMatch(match, filePath);

      // Проверяем, что папка создана
      await expect(fs.access(testMatchesDir)).resolves.not.toThrow();
    });

    test('должен обновлять updatedAt при сохранении', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      
      const match = createNewMatch();
      const oldUpdatedAt = match.updatedAt;
      const filePath = path.join(testMatchesDir, 'test-match.json');

      // Создаем директорию
      await fs.mkdir(testMatchesDir, { recursive: true });

      // Ждем немного, чтобы время изменилось
      await new Promise(resolve => setTimeout(resolve, 10));

      await fileManager.saveMatch(match, filePath);

      const fileContent = await fs.readFile(filePath, 'utf-8');
      const savedMatch = JSON.parse(fileContent);

      expect(savedMatch.updatedAt).toBeDefined();
      expect(savedMatch.updatedAt).not.toBe(oldUpdatedAt);
    });

    test('должен использовать path.join корректно (критично для production - исправление бага)', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      
      const match = createNewMatch();
      const filePath = path.join(testMatchesDir, 'test-match.json');

      // Создаем директорию
      await fs.mkdir(testMatchesDir, { recursive: true });

      // Проверяем, что path доступен и используется
      // Это критично - в production была ошибка "path is not defined"
      expect(path.join).toBeDefined();
      expect(typeof path.join).toBe('function');

      // Сохранение должно работать без ошибки "path is not defined"
      // Проверяем, что path импортирован в fileManager и используется корректно
      await expect(fileManager.saveMatch(match, filePath)).resolves.toBe(filePath);

      // Проверяем, что файл создан (значит path.join сработал)
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const savedMatch = JSON.parse(fileContent);
      expect(savedMatch.matchId).toBe(match.matchId);
    });

    test('должен выбрасывать ошибку при некорректных данных матча', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      
      const invalidMatch = { invalid: 'data' };
      const filePath = path.join(testMatchesDir, 'test-match.json');

      // Создаем директорию
      await fs.mkdir(testMatchesDir, { recursive: true });

      await expect(fileManager.saveMatch(invalidMatch, filePath)).rejects.toThrow('Некорректные данные матча');
    });

    test('должен обрабатывать логотипы при сохранении (если есть logoBase64)', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      const logoManager = await import('../../../src/main/logoManager.ts');
      
      const match = createNewMatch();
      match.teamA.logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const filePath = path.join(testMatchesDir, 'test-match.json');

      // Создаем директорию
      await fs.mkdir(testMatchesDir, { recursive: true });

      await fileManager.saveMatch(match, filePath);

      // Проверяем, что processTeamLogoForSave был вызван
      expect(logoManager.processTeamLogoForSave).toHaveBeenCalled();
    });

    test('должен использовать существующие logoPath, если файл существует', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      const logoManager = await import('../../../src/main/logoManager.ts');
      
      const match = createNewMatch();
      match.teamA.logoPath = 'logos/logo_a_1234567890.png';
      const filePath = path.join(testMatchesDir, 'test-match.json');

      // Создаем директории
      await fs.mkdir(testMatchesDir, { recursive: true });
      await fs.mkdir(testLogosDir, { recursive: true });

      // Создаем файл логотипа
      const logoPath = path.join(testLogosDir, 'logo_a_1234567890.png');
      await fs.writeFile(logoPath, 'fake-logo-data');

      await fileManager.saveMatch(match, filePath);

      // Проверяем, что processTeamLogoForSave НЕ был вызван (логотип уже существует)
      expect(logoManager.processTeamLogoForSave).not.toHaveBeenCalled();
    });
  });

  describe('saveMatchDialog', () => {
    test('должен показывать диалог сохранения и сохранять матч', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      
      const match = createNewMatch();
      const selectedPath = path.join(testMatchesDir, 'test-match-dialog.json');

      // Настраиваем мок диалога
      vi.mocked(electronDialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: selectedPath,
      });

      // Создаем директорию
      await fs.mkdir(testMatchesDir, { recursive: true });

      const savedPath = await fileManager.saveMatchDialog(match);

      expect(savedPath).toBe(selectedPath);
      expect(electronDialog.showSaveDialog).toHaveBeenCalled();

      // Проверяем, что файл создан
      const fileContent = await fs.readFile(selectedPath, 'utf-8');
      const savedMatch = JSON.parse(fileContent);
      expect(savedMatch.matchId).toBe(match.matchId);
    });

    test('должен возвращать null, если диалог отменен', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      
      const match = createNewMatch();

      // Настраиваем мок диалога (отмена)
      vi.mocked(electronDialog.showSaveDialog).mockResolvedValue({
        canceled: true,
        filePath: undefined,
      });

      const result = await fileManager.saveMatchDialog(match);

      expect(result).toBeNull();
    });

    test('должен использовать path.join для defaultPath в диалоге (критично для production - исправление бага)', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      
      const match = createNewMatch();
      const selectedPath = path.join(testMatchesDir, 'test-match-dialog.json');

      // Настраиваем мок диалога
      vi.mocked(electronDialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: selectedPath,
      });

      // Создаем директорию
      await fs.mkdir(testMatchesDir, { recursive: true });

      // Проверяем, что path доступен
      // Это критично - в production была ошибка "path is not defined" при вызове saveMatchDialog
      expect(path.join).toBeDefined();
      expect(typeof path.join).toBe('function');

      await fileManager.saveMatchDialog(match);

      // Проверяем, что showSaveDialog был вызван с defaultPath, созданным через path.join
      // Если path не импортирован, здесь будет ошибка "path is not defined"
      expect(electronDialog.showSaveDialog).toHaveBeenCalled();
      const callArgs = vi.mocked(electronDialog.showSaveDialog).mock.calls[0][0];
      expect(callArgs.defaultPath).toBeDefined();
      expect(callArgs.defaultPath).toContain('match_');
      expect(callArgs.defaultPath).toContain('.json');
      
      // Проверяем, что файл был сохранен (значит path.join сработал в saveMatch)
      const fileContent = await fs.readFile(selectedPath, 'utf-8');
      const savedMatch = JSON.parse(fileContent);
      expect(savedMatch.matchId).toBe(match.matchId);
    });
  });

  describe('openMatch', () => {
    test('должен открывать матч из файла', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      
      const match = createNewMatch();
      const filePath = path.join(testMatchesDir, 'test-open-match.json');

      // Создаем директорию и сохраняем матч
      await fs.mkdir(testMatchesDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(match, null, 2), 'utf-8');

      const loadedMatch = await fileManager.openMatch(filePath);

      expect(loadedMatch.matchId).toBe(match.matchId);
      expect(loadedMatch.teamA.name).toBe(match.teamA.name);
      expect(loadedMatch.teamB.name).toBe(match.teamB.name);
    });

    test('должен выбрасывать ошибку, если файл не найден', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      
      const nonExistentPath = path.join(testMatchesDir, 'non-existent.json');

      await expect(fileManager.openMatch(nonExistentPath)).rejects.toThrow('Файл не найден');
    });

    test('должен выбрасывать ошибку при некорректном JSON', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      
      const filePath = path.join(testMatchesDir, 'invalid-json.json');

      // Создаем директорию и сохраняем некорректный JSON
      await fs.mkdir(testMatchesDir, { recursive: true });
      await fs.writeFile(filePath, 'invalid json content', 'utf-8');

      await expect(fileManager.openMatch(filePath)).rejects.toThrow('Ошибка чтения JSON файла');
    });

    test('при открытии матча мигрирует позиции игроков: "Другое"/"Не указано"→"", "Нападающий"→"Доигровщик"', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');

      const match = createNewMatch();
      match.teamA.roster = [
        { number: 1, name: 'Игрок 1', position: 'Не указано', isStarter: true },
        { number: 2, name: 'Игрок 2', position: 'Другое', isStarter: true },
        { number: 3, name: 'Игрок 3', position: 'Нападающий', isStarter: false },
      ];
      match.teamB.roster = [
        { number: 10, name: 'Игрок 10', position: 'Не указано', isStarter: true },
      ];

      const filePath = path.join(testMatchesDir, 'test-position-migration.json');
      await fs.mkdir(testMatchesDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(match, null, 2), 'utf-8');

      const loaded = await fileManager.openMatch(filePath);

      expect(loaded.teamA.roster[0].position).toBe('');
      expect(loaded.teamA.roster[1].position).toBe('');
      expect(loaded.teamA.roster[2].position).toBe('Доигровщик'); // "Нападающий" мигрирует в "Доигровщик" (OH)
      expect(loaded.teamB.roster[0].position).toBe('');
    });
  });

  describe('openMatchDialog', () => {
    test('должен показывать диалог открытия и открывать матч', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');
      const { createNewMatch } = await import('../../../src/shared/matchUtils');
      
      const match = createNewMatch();
      const filePath = path.join(testMatchesDir, 'test-open-dialog.json');

      // Создаем директорию и сохраняем матч
      await fs.mkdir(testMatchesDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(match, null, 2), 'utf-8');

      // Настраиваем мок диалога
      vi.mocked(electronDialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: [filePath],
      });

      const openedPath = await fileManager.openMatchDialog();

      expect(openedPath).toBe(filePath);
      expect(electronDialog.showOpenDialog).toHaveBeenCalled();
    });

    test('должен возвращать null, если диалог отменен', async () => {
      const fileManager = await import('../../../src/main/fileManager.ts');

      // Настраиваем мок диалога (отмена)
      vi.mocked(electronDialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      const result = await fileManager.openMatchDialog();

      expect(result).toBeNull();
    });
  });
});
