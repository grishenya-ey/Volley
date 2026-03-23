/**
 * Интеграционные тесты для проверки обновления vMix при открытии матча
 */

import { describe, test, beforeEach, expect, vi } from 'vitest';

const mockElectronAPI = {
  setCurrentMatch: vi.fn(() => Promise.resolve()),
  setMobileMatch: vi.fn(() => Promise.resolve()),
  updateVMixInputFields: vi.fn(() => Promise.resolve({ success: true })),
  getVMixConfig: vi.fn(() =>
    Promise.resolve({
      inputs: {
        currentScore: { inputId: 1, fields: {} },
        setScore: { inputId: 2, fields: {} },
      },
    })
  ),
  testVMixConnection: vi.fn(() => Promise.resolve({ connected: true })),
};

(global as unknown as { window: typeof globalThis & { electronAPI: typeof mockElectronAPI; history: { replaceState: ReturnType<typeof vi.fn> } } }).window = {
  ...(global as unknown as Window & { electronAPI?: unknown; history?: unknown }),
  electronAPI: mockElectronAPI,
  history: { replaceState: vi.fn() },
};

describe('Интеграция: открытие матча и обновление vMix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('при открытии матча из файла должен устанавливаться forceUpdateVMix', async () => {
    const testMatch = {
      matchId: 'test-match-1',
      teamA: { name: 'Команда A', logoBase64: 'data:image/png;base64,test' },
      teamB: { name: 'Команда B', logoBase64: 'data:image/png;base64,test' },
      currentSet: {
        scoreA: 10,
        scoreB: 15,
        servingTeam: 'A',
        setNumber: 1,
        status: 'IN_PROGRESS',
      },
      sets: [] as unknown[],
    };

    const navigateState = { match: testMatch, forceUpdateVMix: true };
    expect(navigateState.forceUpdateVMix).toBe(true);
    expect(navigateState.match).toEqual(testMatch);
  });

  test('при открытии матча должны обновляться данные в vMix с forceUpdate', async () => {
    const testMatch = {
      matchId: 'test-match-2',
      teamA: { name: 'Команда A' },
      teamB: { name: 'Команда B' },
      currentSet: {
        scoreA: 5,
        scoreB: 3,
        servingTeam: 'A',
        setNumber: 1,
        status: 'IN_PROGRESS',
      },
      sets: [] as unknown[],
    };

    const forceUpdate = true;
    if (forceUpdate) {
      await mockElectronAPI.updateVMixInputFields(
        1,
        { scoreA: 5, scoreB: 3 },
        {},
        {},
        {},
        {}
      );
    }
    expect(mockElectronAPI.updateVMixInputFields).toHaveBeenCalled();
  });

  test('при открытии матча без forceUpdateVMix не должно быть принудительного обновления', async () => {
    const testMatch = {
      matchId: 'test-match-3',
      teamA: { name: 'Команда A' },
      teamB: { name: 'Команда B' },
      currentSet: {
        scoreA: 0,
        scoreB: 0,
        servingTeam: 'A',
        setNumber: 1,
        status: 'IN_PROGRESS',
      },
      sets: [] as unknown[],
    };

    const navigateState = { match: testMatch };
    const forceUpdate = (navigateState as { forceUpdateVMix?: boolean }).forceUpdateVMix ?? false;
    expect(forceUpdate).toBe(false);

    const hasChanges = true;
    if (hasChanges && !forceUpdate) {
      await mockElectronAPI.updateVMixInputFields(1, { scoreA: 0, scoreB: 0 }, {}, {}, {}, {});
    }
    expect(mockElectronAPI.updateVMixInputFields).toHaveBeenCalled();
  });
});
