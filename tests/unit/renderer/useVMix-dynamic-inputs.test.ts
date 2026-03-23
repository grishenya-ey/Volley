/**
 * Тесты для useVMix: динамические инпуты и валидация
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVMix } from '../../../src/renderer/hooks/useVMix';

describe('useVMix — динамические инпуты и валидация', () => {
  let mockGetVMixConfig: ReturnType<typeof vi.fn>;
  let mockShowVMixOverlay: ReturnType<typeof vi.fn>;
  let mockGetVMixInputFields: ReturnType<typeof vi.fn>;
  let mockUpdateVMixInputFields: ReturnType<typeof vi.fn>;
  let mockTestVMixConnection: ReturnType<typeof vi.fn>;
  let mockOnVMixConnectionChanged: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetVMixConfig = vi.fn().mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
      inputOrder: ['input-1'],
      inputs: {
        'input-1': {
          displayName: 'Счёт',
          vmixTitle: 'Scoreboard',
          vmixNumber: '2',
          enabled: true,
          overlay: 1,
          fields: {
            TeamA: { dataMapKey: 'teamA.name', vmixFieldType: 'text' },
            TeamB: { dataMapKey: 'teamB.name', vmixFieldType: 'text' },
          },
        },
      },
    });
    mockTestVMixConnection = vi.fn().mockResolvedValue({ success: true });
    mockShowVMixOverlay = vi.fn().mockResolvedValue({ success: true });
    mockGetVMixInputFields = vi.fn().mockResolvedValue({
      success: true,
      fields: [{ name: 'TeamA', type: 'text' }, { name: 'TeamB', type: 'text' }],
    });
    mockUpdateVMixInputFields = vi.fn().mockResolvedValue({ success: true });
    mockOnVMixConnectionChanged = vi.fn(() => () => {});

    (window as unknown as { electronAPI: Record<string, unknown> }).electronAPI = {
      getVMixConfig: mockGetVMixConfig,
      setVMixConfig: vi.fn(),
      testVMixConnection: mockTestVMixConnection,
      vmixConnect: vi.fn().mockResolvedValue({ success: true }),
      vmixDisconnect: vi.fn().mockResolvedValue({ success: true }),
      onVMixConnectionChanged: mockOnVMixConnectionChanged,
      showVMixOverlay: mockShowVMixOverlay,
      hideVMixOverlay: vi.fn().mockResolvedValue({ success: true }),
      getVMixOverlayState: vi.fn().mockResolvedValue({ overlays: {} }),
      updateVMixInput: vi.fn(),
      updateVMixInputFields: mockUpdateVMixInputFields,
      getVMixInputFields: mockGetVMixInputFields,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('showOverlay с инпутом только vmixTitle проходит валидацию и вызывает IPC', async () => {
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(mockGetVMixConfig).toHaveBeenCalled());
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));
    await act(async () => {
      const res = await result.current.showOverlay('input-1');
      expect(res.success).toBe(true);
    });
    expect(mockShowVMixOverlay).toHaveBeenCalledWith('input-1');
  });

  test('showOverlay с инпутом vmixNumber проходит валидацию', async () => {
    mockGetVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
      inputOrder: ['ref1'],
      inputs: {
        ref1: { displayName: 'Судья', vmixNumber: '5', enabled: true, fields: {} },
      },
    });
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(mockGetVMixConfig).toHaveBeenCalled());
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));
    await act(async () => {
      const res = await result.current.showOverlay('ref1');
      expect(res.success).toBe(true);
    });
    expect(mockShowVMixOverlay).toHaveBeenCalledWith('ref1');
  });

  test('updateMatchData с forceUpdate вызывает getVMixInputFields и updateVMixInputFields', async () => {
    const match = { matchId: 'm1', teamA: { name: 'Команда A' }, teamB: { name: 'Команда B' } };
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(mockGetVMixConfig).toHaveBeenCalled());
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));
    act(() => result.current.updateMatchData(match, true));
    await waitFor(
      () => {
        expect(mockGetVMixInputFields).toHaveBeenCalled();
        expect(mockUpdateVMixInputFields).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
    expect(mockUpdateVMixInputFields).toHaveBeenCalledWith(
      'Scoreboard',
      expect.objectContaining({ TeamA: 'Команда A', TeamB: 'Команда B' }),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object)
    );
  }, 15000);

  test('при смене matchId сбрасывается кэш', async () => {
    const match1 = { matchId: 'm1', teamA: { name: 'A1' }, teamB: { name: 'B1' } };
    const match2 = { matchId: 'm2', teamA: { name: 'A2' }, teamB: { name: 'B2' } };
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(mockGetVMixConfig).toHaveBeenCalled());
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));
    act(() => result.current.updateMatchData(match1, true));
    await waitFor(
      () =>
        expect(mockUpdateVMixInputFields).toHaveBeenCalledWith(
          'Scoreboard',
          expect.objectContaining({ TeamA: 'A1' }),
          expect.any(Object),
          expect.any(Object),
          expect.any(Object),
          expect.any(Object)
        ),
      { timeout: 2000 }
    );
    mockUpdateVMixInputFields.mockClear();
    act(() => result.current.updateMatchData(match2, true));
    await waitFor(
      () =>
        expect(mockUpdateVMixInputFields).toHaveBeenCalledWith(
          'Scoreboard',
          expect.objectContaining({ TeamA: 'A2' }),
          expect.any(Object),
          expect.any(Object),
          expect.any(Object),
          expect.any(Object)
        ),
      { timeout: 2000 }
    );
  }, 15000);

  test('при connectionState "disconnected" testVMixConnection не вызывается при загрузке', async () => {
    mockGetVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: [],
      inputs: {},
    });
    renderHook(() => useVMix(null));
    await waitFor(() => expect(mockGetVMixConfig).toHaveBeenCalled());
    expect(mockTestVMixConnection).not.toHaveBeenCalled();
  });

  test('при событии vmix-connection-changed вызывается loadConfig', async () => {
    let connectionChangedCallback: () => void;
    mockOnVMixConnectionChanged.mockImplementation((cb: () => void) => {
      connectionChangedCallback = cb;
      return () => {};
    });
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(mockGetVMixConfig).toHaveBeenCalled());
    const firstCallCount = mockGetVMixConfig.mock.calls.length;
    expect(typeof connectionChangedCallback!).toBe('function');
    act(() => connectionChangedCallback!());
    await waitFor(() => expect(mockGetVMixConfig.mock.calls.length).toBeGreaterThan(firstCallCount));
  });

  test('без подключения showOverlay возвращает ошибку', async () => {
    mockGetVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: [],
      inputs: {},
    });
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(mockGetVMixConfig).toHaveBeenCalled());
    await act(async () => {
      const res = await result.current.showOverlay('input-1');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/vMix не подключен|Инпут не настроен/);
    });
    expect(mockShowVMixOverlay).not.toHaveBeenCalled();
  });

  test('showOverlay при отсутствии inputIdentifier в конфиге возвращает ошибку', async () => {
    mockGetVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
      inputOrder: ['bad'],
      inputs: { bad: { displayName: 'Bad', enabled: true } },
    });
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(mockGetVMixConfig).toHaveBeenCalled());
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));
    await act(async () => {
      const res = await result.current.showOverlay('bad');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Инпут не настроен/);
    });
  });
});
