/**
 * Настройка тестового окружения
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

declare global {
  // eslint-disable-next-line no-var
  var electronAPI: Record<string, ReturnType<typeof vi.fn> | (() => () => void)>;
  // eslint-disable-next-line no-var
  var window: Window & {
    electronAPI?: typeof globalThis extends { electronAPI: infer E } ? E : unknown;
    history?: { replaceState: (data: unknown, unused: string, url?: string | URL | null) => void };
  };
  // eslint-disable-next-line no-var
  var document: Document | undefined;
}

global.electronAPI = global.electronAPI || {
  getVersion: vi.fn(),
  createMatch: vi.fn(),
  openMatchDialog: vi.fn(),
  saveMatch: vi.fn(),
  saveMatchDialog: vi.fn(),
  getVMixConfig: vi.fn(),
  setVMixConfig: vi.fn(),
  testVMixConnection: vi.fn(),
  updateVMixInput: vi.fn(),
  updateVMixInputFields: vi.fn(),
  showVMixOverlay: vi.fn(),
  hideVMixOverlay: vi.fn(),
  getVMixOverlayState: vi.fn(),
  startMobileServer: vi.fn(),
  stopMobileServer: vi.fn(),
  getMobileServerInfo: vi.fn(),
  generateMobileSession: vi.fn(),
  getSavedMobileSession: vi.fn(),
  setMobileMatch: vi.fn(),
  isMobileServerRunning: vi.fn(),
  getNetworkInterfaces: vi.fn(),
  setSelectedIP: vi.fn(),
  setCurrentMatch: vi.fn(),
  markMatchSaved: vi.fn(),
  swapTeams: vi.fn(),
  getAutoSaveSettings: vi.fn(),
  setAutoSaveSettings: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  installUpdate: vi.fn(),
  getAutoUpdateSettings: vi.fn(),
  setAutoUpdateSettings: vi.fn(),
  onUpdateStatus: vi.fn(() => () => {}),
  onAutoUpdateSettingsChanged: vi.fn(() => () => {}),

  // Диалоги (IPC вместо alert/confirm — исправление бага с фокусом в полях ввода)
  showMessage: vi.fn(() => Promise.resolve()),
  showConfirm: vi.fn(() => Promise.resolve(true)),
};

global.window = global.window || ({} as typeof window);
(global.window as typeof window & { electronAPI?: unknown; history?: { replaceState: ReturnType<typeof vi.fn> } }).electronAPI =
  global.electronAPI;
(global.window as typeof window & { history?: { replaceState: ReturnType<typeof vi.fn> } }).history = {
  replaceState: vi.fn(),
};

if (typeof document === 'undefined') {
  (global as unknown as { document: Record<string, unknown> }).document = {
    createElement: vi.fn(() => ({
      textContent: '',
      innerHTML: '',
      style: {},
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      firstChild: null,
    })),
    getElementById: vi.fn(),
  };
}
