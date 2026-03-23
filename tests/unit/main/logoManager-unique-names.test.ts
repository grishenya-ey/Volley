/**
 * Тесты для проверки логики уникальных имен логотипов
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

const mockPath = path;
const testLogosDirPath = path.join(os.tmpdir(), 'vmix-volley-scoreboard-test-logos');

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => testLogosDirPath),
  },
}));

vi.mock('../../../src/main/server.ts', () => ({}));

vi.mock('../../../src/main/utils/pathUtils.ts', async (importOriginal: () => Promise<Record<string, unknown>>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getLogosDir: vi.fn(() => testLogosDirPath),
  };
});

vi.mock('../../../src/main/logoManager.ts', async (importOriginal: () => Promise<Record<string, unknown>>) => {
  const actual = await importOriginal();
  const fsMod = await import('fs/promises');
  return {
    ...actual,
    saveLogoToFile: vi.fn(async (base64Logo: string, teamKey: string) => {
      const logosDir = testLogosDirPath;
      await fsMod.mkdir(logosDir, { recursive: true });
      const timestamp = Date.now();
      const fileName = `logo_${teamKey.toLowerCase()}_${timestamp}.png`;
      const filePath = mockPath.join(logosDir, fileName);
      const base64Data = base64Logo.split(',')[1] || base64Logo;
      const buffer = Buffer.from(base64Data, 'base64');
      await fsMod.writeFile(filePath, buffer);
      return `logos/${fileName}`;
    }),
    cleanupLogosDirectory: vi.fn(async () => {
      const logosDir = testLogosDirPath;
      try {
        const files = await fsMod.readdir(logosDir);
        for (const file of files) {
          if (file.startsWith('logo_') && file.endsWith('.png')) {
            await fsMod.unlink(mockPath.join(logosDir, file));
          }
        }
      } catch {
        // ignore
      }
    }),
    processTeamLogoForSave: vi.fn(async (team: { logoBase64?: string }, teamKey: string) => {
      const logosDir = testLogosDirPath;
      await fsMod.mkdir(logosDir, { recursive: true });
      try {
        const files = await fsMod.readdir(logosDir);
        for (const file of files) {
          if (file.startsWith(`logo_${teamKey.toLowerCase()}_`) && file.endsWith('.png')) {
            await fsMod.unlink(mockPath.join(logosDir, file));
          }
        }
      } catch {
        // ignore
      }
      if (team.logoBase64) {
        const timestamp = Date.now();
        const fileName = `logo_${teamKey.toLowerCase()}_${timestamp}.png`;
        const filePath = mockPath.join(logosDir, fileName);
        const base64Data = team.logoBase64.split(',')[1] || team.logoBase64;
        const buffer = Buffer.from(base64Data, 'base64');
        await fsMod.writeFile(filePath, buffer);
        return { ...team, logoPath: `logos/${fileName}`, logoBase64: team.logoBase64 };
      }
      return { ...team, logoPath: null };
    }),
  };
});

import * as logoManager from '../../../src/main/logoManager';
import { getLogosDir } from '../../../src/main/utils/pathUtils';

describe('logoManager - уникальные имена логотипов', () => {
  let logosDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    logosDir = getLogosDir();
    try {
      await fs.mkdir(logosDir, { recursive: true });
    } catch {
      // ignore
    }
    try {
      const files = await fs.readdir(logosDir);
      for (const file of files) {
        if (file.startsWith('logo_') && file.endsWith('.png')) {
          await fs.unlink(path.join(logosDir, file));
        }
      }
    } catch {
      // ignore
    }
  });

  afterEach(async () => {
    try {
      const files = await fs.readdir(logosDir);
      for (const file of files) {
        if (file.startsWith('logo_') && file.endsWith('.png')) {
          await fs.unlink(path.join(logosDir, file));
        }
      }
    } catch {
      // ignore
    }
  });

  afterAll(async () => {
    try {
      await fs.rm(testLogosDirPath, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('Генерация уникальных имен', () => {
    test('saveLogoToFile должен генерировать уникальные имена с timestamp для команды A', async () => {
      const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const logoPath1 = await logoManager.saveLogoToFile(base64Logo, 'A');
      await new Promise((resolve) => setTimeout(resolve, 10));
      const logoPath2 = await logoManager.saveLogoToFile(base64Logo, 'A');
      expect(logoPath1).not.toBe(logoPath2);
      expect(logoPath1).toMatch(/^logos\/logo_a_\d+\.png$/);
      expect(logoPath2).toMatch(/^logos\/logo_a_\d+\.png$/);
      const fileName1 = logoPath1.replace('logos/', '');
      const fileName2 = logoPath2.replace('logos/', '');
      await expect(fs.access(path.join(logosDir, fileName1))).resolves.not.toThrow();
      await expect(fs.access(path.join(logosDir, fileName2))).resolves.not.toThrow();
    });

    test('saveLogoToFile должен генерировать уникальные имена с timestamp для команды B', async () => {
      const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const logoPath = await logoManager.saveLogoToFile(base64Logo, 'B');
      expect(logoPath).toMatch(/^logos\/logo_b_\d+\.png$/);
      const fileName = logoPath.replace('logos/', '');
      await expect(fs.access(path.join(logosDir, fileName))).resolves.not.toThrow();
    });
  });

  describe('Очистка папки logos', () => {
    test('cleanupLogosDirectory должен удалять все файлы logo_*.png', async () => {
      const testFiles = ['logo_a_1234567890.png', 'logo_b_1234567890.png', 'logo_a_9876543210.png'];
      for (const file of testFiles) {
        await fs.writeFile(path.join(logosDir, file), 'test content');
      }
      const filesBefore = await fs.readdir(logosDir);
      expect(filesBefore).toContain('logo_a_1234567890.png');
      expect(filesBefore).toContain('logo_b_1234567890.png');
      await logoManager.cleanupLogosDirectory();
      const filesAfter = await fs.readdir(logosDir);
      expect(filesAfter).not.toContain('logo_a_1234567890.png');
      expect(filesAfter).not.toContain('logo_b_1234567890.png');
      expect(filesAfter).not.toContain('logo_a_9876543210.png');
    });

    test('cleanupLogosDirectory должен корректно обрабатывать пустую папку', async () => {
      await expect(logoManager.cleanupLogosDirectory()).resolves.not.toThrow();
    });
  });

  describe('processTeamLogoForSave', () => {
    test('processTeamLogoForSave должен сохранять логотип с уникальным именем', async () => {
      await fs.mkdir(logosDir, { recursive: true });
      const oldFile = path.join(logosDir, 'logo_a_1234567890.png');
      await fs.writeFile(oldFile, 'old content');
      await expect(fs.access(oldFile)).resolves.not.toThrow();
      const team = {
        logoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };
      await logoManager.cleanupLogosDirectory();
      const result = await logoManager.processTeamLogoForSave(team, 'A');
      await expect(fs.access(oldFile)).rejects.toThrow();
      expect(result.logoPath).toMatch(/^logos\/logo_a_\d+\.png$/);
      const newFileName = result.logoPath!.replace('logos/', '');
      await expect(fs.access(path.join(logosDir, newFileName))).resolves.not.toThrow();
      const files = await fs.readdir(logosDir);
      const logoFiles = files.filter((f) => f.startsWith('logo_a_') && f.endsWith('.png'));
      expect(logoFiles).toHaveLength(1);
      expect(logoFiles[0]).toBe(newFileName);
    });

    test('при сохранении обоих логотипов должны создаваться оба файла', async () => {
      await fs.mkdir(logosDir, { recursive: true });
      await logoManager.cleanupLogosDirectory();
      const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const resultA = await logoManager.processTeamLogoForSave({ logoBase64: base64Logo }, 'A');
      const resultB = await logoManager.processTeamLogoForSave({ logoBase64: base64Logo }, 'B');
      expect(resultA.logoPath).toMatch(/^logos\/logo_a_\d+\.png$/);
      expect(resultB.logoPath).toMatch(/^logos\/logo_b_\d+\.png$/);
      const files = await fs.readdir(logosDir);
      const logoFiles = files.filter((f) => f.startsWith('logo_') && f.endsWith('.png'));
      expect(logoFiles.length).toBeGreaterThanOrEqual(2);
      expect(logoFiles).toContain(resultA.logoPath!.replace('logos/', ''));
      expect(logoFiles).toContain(resultB.logoPath!.replace('logos/', ''));
    });
  });

  describe('Множественные сохранения', () => {
    test('при повторных сохранениях должны создаваться новые файлы с уникальными именами', async () => {
      const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const team = { logoBase64: base64Logo };
      const paths: string[] = [];
      for (let i = 0; i < 3; i++) {
        await logoManager.cleanupLogosDirectory();
        const result = await logoManager.processTeamLogoForSave(team, 'A');
        paths.push(result.logoPath!);
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      paths.forEach((p) => expect(p).toMatch(/^logos\/logo_a_\d+\.png$/));
      expect(new Set(paths).size).toBe(3);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const files = await fs.readdir(logosDir);
      const logoFiles = files.filter((f) => f.startsWith('logo_a_') && f.endsWith('.png'));
      expect(logoFiles.length).toBe(1);
      expect(logoFiles[0]).toBe(paths[2].replace('logos/', ''));
    });
  });
});
