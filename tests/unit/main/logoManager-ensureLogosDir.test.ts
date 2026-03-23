/**
 * Тесты для проверки создания папки logos и миграции в production режиме
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';

const mockPath = path;

vi.mock('electron', () => ({
  app: { isPackaged: false },
}));

vi.mock('../../../src/main/utils/pathUtils.ts', () => ({
  getLogosDir: vi.fn(),
  getExtraResourcesLogosDir: vi.fn(() => null),
}));

vi.mock('../../../src/main/server.ts', () => ({}));

describe('logoManager - ensureLogosDir', () => {
  let testLogosDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    testLogosDir = mockPath.join(process.cwd(), 'tests', 'temp-test-logos');
    try {
      await fs.rm(testLogosDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    const { getLogosDir } = await import('../../../src/main/utils/pathUtils');
    vi.mocked(getLogosDir).mockReturnValue(testLogosDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testLogosDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test('ensureLogosDir должен создавать папку logos, если она не существует', async () => {
    const logoManager = await import('../../../src/main/logoManager');
    try {
      await fs.access(testLogosDir);
      await fs.rm(testLogosDir, { recursive: true, force: true });
    } catch {
      // ok
    }
    await logoManager.ensureLogosDir();
    await expect(fs.access(testLogosDir)).resolves.not.toThrow();
    const stats = await fs.stat(testLogosDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('ensureLogosDir должен корректно работать при повторных вызовах', async () => {
    const logoManager = await import('../../../src/main/logoManager');
    await logoManager.ensureLogosDir();
    await expect(fs.access(testLogosDir)).resolves.not.toThrow();
    await expect(logoManager.ensureLogosDir()).resolves.not.toThrow();
    await expect(logoManager.ensureLogosDir()).resolves.not.toThrow();
    await expect(fs.access(testLogosDir)).resolves.not.toThrow();
  });

  test('ensureLogosDir должен использовать app из electron для проверки production режима', async () => {
    const electron = await import('electron');
    const logoManager = await import('../../../src/main/logoManager');
    expect(electron.app).toBeDefined();
    expect(electron.app.isPackaged).toBeDefined();
    await expect(logoManager.ensureLogosDir()).resolves.not.toThrow();
  });

  test('ensureLogosDir должен работать в production режиме (isPackaged = true)', async () => {
    const electron = await import('electron');
    vi.mocked(electron.app).isPackaged = true;
    const logoManager = await import('../../../src/main/logoManager');
    await expect(logoManager.ensureLogosDir()).resolves.not.toThrow();
    await expect(fs.access(testLogosDir)).resolves.not.toThrow();
  });
});
