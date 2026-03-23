/**
 * Тесты для useVMix: несколько конфиг-инпутов на один vMix-инпут (идентификация и обновление при показе).
 * См. docs/development/vmix-overlay-same-input-implementation-guide.md
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVMix } from '../../../src/renderer/hooks/useVMix';

const OVERLAY_POLL_INTERVAL = 2000;
const WAIT_OVERLAY_POLL_MS = 2500;

const twoInputsSameVmixConfig = {
  host: 'localhost',
  port: 8088,
  connectionState: 'connected',
  inputOrder: ['ref1', 'ref2'],
  inputs: {
    ref1: {
      displayName: 'Первый судья',
      vmixTitle: 'TITLES',
      vmixNumber: '13',
      enabled: true,
      overlay: 1,
      fields: {},
    },
    ref2: {
      displayName: 'Второй судья',
      vmixTitle: 'TITLES',
      vmixNumber: '13',
      enabled: true,
      overlay: 1,
      fields: {},
    },
  },
};

const overlayStateActiveInput13 = {
  success: true,
  overlays: {
    1: { active: true, input: '13' },
    2: { active: false, input: null },
    3: { active: false, input: null },
    4: { active: false, input: null },
    5: { active: false, input: null },
    6: { active: false, input: null },
    7: { active: false, input: null },
    8: { active: false, input: null },
  },
  inputsMap: {
    '13': { number: '13', key: 'titles-uuid', title: 'TITLES', shortTitle: 'TITLES', type: 'Title' },
  },
};

const overlayStateInactive = {
  success: true,
  overlays: {
    1: { active: false, input: null },
    2: { active: false, input: null },
    3: { active: false, input: null },
    4: { active: false, input: null },
    5: { active: false, input: null },
    6: { active: false, input: null },
    7: { active: false, input: null },
    8: { active: false, input: null },
  },
  inputsMap: {
    '13': { number: '13', key: 'titles-uuid', title: 'TITLES', shortTitle: 'TITLES', type: 'Title' },
  },
};

describe('useVMix — несколько конфигов на один vMix-инпут (идентификация)', () => {
  let mockGetVMixConfig: ReturnType<typeof vi.fn>;
  let mockGetVMixOverlayState: ReturnType<typeof vi.fn>;
  let mockShowVMixOverlay: ReturnType<typeof vi.fn>;
  let mockHideVMixOverlay: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetVMixConfig = vi.fn().mockResolvedValue(twoInputsSameVmixConfig);
    mockGetVMixOverlayState = vi.fn().mockResolvedValue(overlayStateActiveInput13);
    mockShowVMixOverlay = vi.fn().mockResolvedValue({ success: true });
    mockHideVMixOverlay = vi.fn().mockResolvedValue({ success: true });

    (window as unknown as { electronAPI: Record<string, unknown> }).electronAPI = {
      getVMixConfig: mockGetVMixConfig,
      setVMixConfig: vi.fn(),
      testVMixConnection: vi.fn().mockResolvedValue({ success: true }),
      vmixConnect: vi.fn().mockResolvedValue({ success: true }),
      vmixDisconnect: vi.fn().mockResolvedValue({ success: true }),
      onVMixConnectionChanged: vi.fn(() => () => {}),
      showVMixOverlay: mockShowVMixOverlay,
      hideVMixOverlay: mockHideVMixOverlay,
      getVMixOverlayState: mockGetVMixOverlayState,
      updateVMixInput: vi.fn(),
      updateVMixInputFields: vi.fn().mockResolvedValue({ success: true }),
      getVMixInputFields: vi.fn().mockResolvedValue({ success: true, fields: [] }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('два конфиг-инпута на один vMix — активна только последняя показанная (ref1, затем ref2)', async () => {
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(mockGetVMixConfig).toHaveBeenCalled());
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));

    await act(async () => {
      const res = await result.current.showOverlay('ref1', 'ref1');
      expect(res.success).toBe(true);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, WAIT_OVERLAY_POLL_MS));
    });
    expect(result.current.isOverlayActive('ref1', 'ref1')).toBe(true);
    expect(result.current.isOverlayActive('ref2', 'ref2')).toBe(false);

    await act(async () => {
      const res = await result.current.showOverlay('ref2', 'ref2');
      expect(res.success).toBe(true);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, WAIT_OVERLAY_POLL_MS));
    });
    expect(result.current.isOverlayActive('ref1', 'ref1')).toBe(false);
    expect(result.current.isOverlayActive('ref2', 'ref2')).toBe(true);
  }, 15000);

  test('скрытие оверлея — после неактивного состояния ни одна кнопка не активна', async () => {
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));

    await act(async () => {
      await result.current.showOverlay('ref1', 'ref1');
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, WAIT_OVERLAY_POLL_MS));
    });
    expect(result.current.isOverlayActive('ref1', 'ref1')).toBe(true);

    mockGetVMixOverlayState.mockResolvedValueOnce(overlayStateInactive);
    await act(async () => {
      await new Promise((r) => setTimeout(r, WAIT_OVERLAY_POLL_MS));
    });
    expect(result.current.isOverlayActive('ref1', 'ref1')).toBe(false);
  }, 15000);

  test('внешняя активация — подсвечивается первая по порядку в inputOrder', async () => {
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));
    await act(async () => {
      await new Promise((r) => setTimeout(r, WAIT_OVERLAY_POLL_MS));
    });
    expect(result.current.isOverlayActive('ref1', 'ref1')).toBe(true);
    expect(result.current.isOverlayActive('ref2', 'ref2')).toBe(false);
  }, 15000);

  test('isAnotherOverlayOnAirForSameInput: когда ref1 в эфире — для ref2 true, для ref1 false', async () => {
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));

    await act(async () => {
      await result.current.showOverlay('ref1', 'ref1');
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, WAIT_OVERLAY_POLL_MS));
    });

    expect(result.current.isAnotherOverlayOnAirForSameInput('ref2')).toBe(true);
    expect(result.current.isAnotherOverlayOnAirForSameInput('ref1')).toBe(false);
  }, 15000);

  test('isAnotherOverlayOnAirForSameInput: когда оверлей неактивен — оба false', async () => {
    mockGetVMixOverlayState.mockResolvedValue(overlayStateInactive);
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));
    await act(async () => {
      await new Promise((r) => setTimeout(r, WAIT_OVERLAY_POLL_MS));
    });

    expect(result.current.isAnotherOverlayOnAirForSameInput('ref1')).toBe(false);
    expect(result.current.isAnotherOverlayOnAirForSameInput('ref2')).toBe(false);
  }, 15000);
});

describe('useVMix — isAnotherOverlayOnAirForSameInput только для того же vMix-инпута', () => {
  const configWithTwoInputs = {
    host: 'localhost',
    port: 8088,
    connectionState: 'connected',
    inputOrder: ['ref1', 'ref2', 'other'],
    inputs: {
      ref1: {
        displayName: 'Первый судья',
        vmixTitle: 'TITLES',
        vmixNumber: '13',
        enabled: true,
        overlay: 1,
        fields: {},
      },
      ref2: {
        displayName: 'Второй судья',
        vmixTitle: 'TITLES',
        vmixNumber: '13',
        enabled: true,
        overlay: 1,
        fields: {},
      },
      other: {
        displayName: 'Другая плашка',
        vmixTitle: 'LOWER',
        vmixNumber: '14',
        enabled: true,
        overlay: 1,
        fields: {},
      },
    },
  };

  const overlayStateInput13 = {
    success: true,
    overlays: {
      1: { active: true, input: '13' },
      2: { active: false, input: null },
      3: { active: false, input: null },
      4: { active: false, input: null },
      5: { active: false, input: null },
      6: { active: false, input: null },
      7: { active: false, input: null },
      8: { active: false, input: null },
    },
    inputsMap: {
      '13': { number: '13', key: 'titles-uuid', title: 'TITLES', shortTitle: 'TITLES', type: 'Title' },
      '14': { number: '14', key: 'lower-uuid', title: 'LOWER', shortTitle: 'LOWER', type: 'Title' },
    },
  };

  beforeEach(() => {
    (window as unknown as { electronAPI: Record<string, unknown> }).electronAPI = {
      getVMixConfig: vi.fn().mockResolvedValue(configWithTwoInputs),
      setVMixConfig: vi.fn(),
      testVMixConnection: vi.fn().mockResolvedValue({ success: true }),
      vmixConnect: vi.fn().mockResolvedValue({ success: true }),
      vmixDisconnect: vi.fn().mockResolvedValue({ success: true }),
      onVMixConnectionChanged: vi.fn(() => () => {}),
      showVMixOverlay: vi.fn().mockResolvedValue({ success: true }),
      hideVMixOverlay: vi.fn().mockResolvedValue({ success: true }),
      getVMixOverlayState: vi.fn().mockResolvedValue(overlayStateInput13),
      updateVMixInput: vi.fn(),
      updateVMixInputFields: vi.fn().mockResolvedValue({ success: true }),
      getVMixInputFields: vi.fn().mockResolvedValue({ success: true, fields: [] }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('когда в эфире ref1 (инпут 13), для other (инпут 14) возвращается false — блокируем только тот же инпут', async () => {
    const { result } = renderHook(() => useVMix(null));
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));

    await act(async () => {
      await result.current.showOverlay('ref1', 'ref1');
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, WAIT_OVERLAY_POLL_MS));
    });

    expect(result.current.isAnotherOverlayOnAirForSameInput('ref2')).toBe(true);
    expect(result.current.isAnotherOverlayOnAirForSameInput('ref1')).toBe(false);
    expect(result.current.isAnotherOverlayOnAirForSameInput('other')).toBe(false);
  }, 15000);
});

describe('useVMix — обновление данных при показе (проблема 2)', () => {
  let mockGetVMixConfig: ReturnType<typeof vi.fn>;
  let mockGetVMixOverlayState: ReturnType<typeof vi.fn>;
  let mockShowVMixOverlay: ReturnType<typeof vi.fn>;
  let mockUpdateVMixInputFields: ReturnType<typeof vi.fn>;
  let mockGetVMixInputFields: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetVMixOverlayState = vi.fn().mockResolvedValue({ success: true, overlays: {}, inputsMap: {} });
    mockShowVMixOverlay = vi.fn().mockResolvedValue({ success: true });
    mockUpdateVMixInputFields = vi.fn().mockResolvedValue({ success: true });
    mockGetVMixInputFields = vi.fn().mockResolvedValue({
      success: true,
      fields: [{ name: 'Name', type: 'text' }, { name: 'Role', type: 'text' }],
    });
    mockGetVMixConfig = vi.fn().mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
      inputOrder: ['titles1'],
      inputs: {
        titles1: {
          displayName: 'Судья',
          vmixTitle: 'TITLES',
          vmixNumber: '13',
          enabled: true,
          overlay: 1,
          fields: {
            Name: { dataMapKey: 'referee1', vmixFieldType: 'text' },
            Role: { customValue: 'Первый судья', vmixFieldType: 'text' },
          },
        },
      },
    });

    (window as unknown as { electronAPI: Record<string, unknown> }).electronAPI = {
      getVMixConfig: mockGetVMixConfig,
      setVMixConfig: vi.fn(),
      testVMixConnection: vi.fn().mockResolvedValue({ success: true }),
      vmixConnect: vi.fn().mockResolvedValue({ success: true }),
      vmixDisconnect: vi.fn().mockResolvedValue({ success: true }),
      onVMixConnectionChanged: vi.fn(() => () => {}),
      showVMixOverlay: mockShowVMixOverlay,
      hideVMixOverlay: vi.fn().mockResolvedValue({ success: true }),
      getVMixOverlayState: mockGetVMixOverlayState,
      updateVMixInput: vi.fn(),
      updateVMixInputFields: mockUpdateVMixInputFields,
      getVMixInputFields: mockGetVMixInputFields,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('перед showVMixOverlay вызывается updateVMixInputFields с данными матча, порядок: сначала поля, затем показ', async () => {
    const match = {
      matchId: 'm1',
      referee1: 'Иванов',
      teamA: { name: 'A' },
      teamB: { name: 'B' },
    } as unknown as Parameters<typeof useVMix>[0];
    const { result } = renderHook(() => useVMix(match));
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));

    mockUpdateVMixInputFields.mockClear();
    mockShowVMixOverlay.mockClear();
    await act(async () => {
      await result.current.showOverlay('titles1');
    });

    expect(mockUpdateVMixInputFields).toHaveBeenCalled();
    expect(mockShowVMixOverlay).toHaveBeenCalledWith('titles1');
    const updateCallOrder = mockUpdateVMixInputFields.mock.invocationCallOrder[0];
    const showCallOrder = mockShowVMixOverlay.mock.invocationCallOrder[0];
    expect(updateCallOrder).toBeLessThan(showCallOrder);
    expect(mockUpdateVMixInputFields).toHaveBeenCalledWith(
      'TITLES',
      expect.objectContaining({ Name: 'Иванов', Role: 'Первый судья' }),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object)
    );
  }, 10000);

  test('два инпута на один vMix — при показе каждого в updateVMixInputFields уходят свои данные', async () => {
    mockGetVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
      inputOrder: ['ref1', 'ref2'],
      inputs: {
        ref1: {
          displayName: 'Первый судья',
          vmixTitle: 'TITLES',
          vmixNumber: '13',
          enabled: true,
          overlay: 1,
          fields: {
            Name: { dataMapKey: 'referee1', vmixFieldType: 'text' },
            Role: { customValue: '1-й судья', vmixFieldType: 'text' },
          },
        },
        ref2: {
          displayName: 'Второй судья',
          vmixTitle: 'TITLES',
          vmixNumber: '13',
          enabled: true,
          overlay: 1,
          fields: {
            Name: { dataMapKey: 'referee2', vmixFieldType: 'text' },
            Role: { customValue: '2-й судья', vmixFieldType: 'text' },
          },
        },
      },
    });
    mockGetVMixInputFields.mockResolvedValue({
      success: true,
      fields: [{ name: 'Name', type: 'text' }, { name: 'Role', type: 'text' }],
    });

    const match = {
      matchId: 'm1',
      referee1: 'Иванов',
      referee2: 'Петров',
      teamA: { name: 'A' },
      teamB: { name: 'B' },
    } as unknown as Parameters<typeof useVMix>[0];
    const { result } = renderHook(() => useVMix(match));
    await waitFor(() => expect(result.current.connectionStatus.connected).toBe(true));

    mockUpdateVMixInputFields.mockClear();
    await act(async () => {
      await result.current.showOverlay('ref1');
    });
    expect(mockUpdateVMixInputFields).toHaveBeenCalledWith(
      'TITLES',
      expect.objectContaining({ Name: 'Иванов', Role: '1-й судья' }),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object)
    );

    mockUpdateVMixInputFields.mockClear();
    await act(async () => {
      await result.current.showOverlay('ref2');
    });
    expect(mockUpdateVMixInputFields).toHaveBeenCalledWith(
      'TITLES',
      expect.objectContaining({ Name: 'Петров', Role: '2-й судья' }),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object)
    );
  }, 10000);
});
