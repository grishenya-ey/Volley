/**
 * Тесты для VMixOverlayButtons: динамические кнопки из config.inputOrder,
 * сообщение при отсутствии инпутов, показ/скрытие оверлеев.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VMixOverlayButtons from '../../../src/renderer/components/VMixOverlayButtons';

describe('VMixOverlayButtons', () => {
  const defaultProps = {
    vmixConfig: null,
    connectionStatus: { connected: false, message: '' },
    onShowOverlay: vi.fn(),
    onHideOverlay: vi.fn(),
    isOverlayActive: vi.fn(() => false),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('без конфига показывает сообщение о необходимости настройки', () => {
    render(<VMixOverlayButtons {...defaultProps} />);
    expect(screen.getByText(/Настройки vMix не загружены/)).toBeInTheDocument();
  });

  test('при пустом inputOrder показывает сообщение добавить инпуты', () => {
    const config = { inputOrder: [], inputs: {} };
    render(
      <VMixOverlayButtons
        {...defaultProps}
        vmixConfig={config}
      />
    );
    expect(screen.getByText(/Добавьте инпуты в настройках vMix/)).toBeInTheDocument();
  });

  test('при инпутах без displayName кнопки не отображаются', () => {
    const config = {
      inputOrder: ['id1'],
      inputs: { id1: { vmixTitle: 'Title1', enabled: true } },
    };
    render(
      <VMixOverlayButtons
        {...defaultProps}
        vmixConfig={config}
      />
    );
    expect(screen.getByText(/Добавьте инпуты в настройках vMix/)).toBeInTheDocument();
  });

  test('отображает динамические кнопки по inputOrder с displayName', () => {
    const config = {
      inputOrder: ['id1', 'id2'],
      inputs: {
        id1: { displayName: 'Плашка 1', vmixTitle: 'Title1', enabled: true },
        id2: { displayName: 'Плашка 2', vmixTitle: 'Title2', enabled: true },
      },
    };
    render(
      <VMixOverlayButtons
        {...defaultProps}
        vmixConfig={config}
        connectionStatus={{ connected: true }}
      />
    );
    expect(screen.getByRole('button', { name: /Плашка 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Плашка 2/ })).toBeInTheDocument();
  });

  test('клик по неактивной кнопке вызывает onShowOverlay с inputKey', async () => {
    const onShowOverlay = vi.fn().mockResolvedValue({ success: true });
    const config = {
      inputOrder: ['ref1'],
      inputs: {
        ref1: { displayName: 'Судья', vmixTitle: 'Referee', enabled: true },
      },
    };
    render(
      <VMixOverlayButtons
        {...defaultProps}
        vmixConfig={config}
        connectionStatus={{ connected: true }}
        onShowOverlay={onShowOverlay}
        isOverlayActive={() => false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Судья/ }));
    expect(onShowOverlay).toHaveBeenCalledWith('ref1', 'ref1');
  });

  test('клик по активной кнопке вызывает onHideOverlay', async () => {
    const onHideOverlay = vi.fn().mockResolvedValue({ success: true });
    const config = {
      inputOrder: ['ref1'],
      inputs: {
        ref1: { displayName: 'Судья', vmixTitle: 'Referee', enabled: true },
      },
    };
    render(
      <VMixOverlayButtons
        {...defaultProps}
        vmixConfig={config}
        connectionStatus={{ connected: true }}
        onHideOverlay={onHideOverlay}
        isOverlayActive={() => true}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Судья/ }));
    expect(onHideOverlay).toHaveBeenCalledWith('ref1');
  });

  test('кнопки отключены при неподключённом vMix', () => {
    const config = {
      inputOrder: ['id1'],
      inputs: {
        id1: { displayName: 'Плашка', vmixTitle: 'T', enabled: true },
      },
    };
    render(
      <VMixOverlayButtons
        {...defaultProps}
        vmixConfig={config}
        connectionStatus={{ connected: false }}
      />
    );
    const btn = screen.getByRole('button', { name: /Плашка/ });
    expect(btn).toBeDisabled();
  });

  test('кнопки отключены при отключённом инпуте (enabled: false)', () => {
    const config = {
      inputOrder: ['id1'],
      inputs: {
        id1: { displayName: 'Плашка', vmixTitle: 'T', enabled: false },
      },
    };
    render(
      <VMixOverlayButtons
        {...defaultProps}
        vmixConfig={config}
        connectionStatus={{ connected: true }}
      />
    );
    const btn = screen.getByRole('button', { name: /Плашка/ });
    expect(btn).toBeDisabled();
  });

  test('кнопка недоступна и с подсказкой, когда другая плашка того же инпута в эфире', () => {
    const config = {
      inputOrder: ['ref1', 'ref2'],
      inputs: {
        ref1: { displayName: 'Первый судья', vmixTitle: 'TITLES', enabled: true },
        ref2: { displayName: 'Второй судья', vmixTitle: 'TITLES', enabled: true },
      },
    };
    const isOverlayActive = vi.fn((inputKey: string) => inputKey === 'ref1');
    const isAnotherOverlayOnAirForSameInput = vi.fn((inputKey: string) => inputKey === 'ref2');

    render(
      <VMixOverlayButtons
        {...defaultProps}
        vmixConfig={config}
        connectionStatus={{ connected: true }}
        isOverlayActive={isOverlayActive}
        isAnotherOverlayOnAirForSameInput={isAnotherOverlayOnAirForSameInput}
      />
    );

    const btn1 = screen.getByRole('button', { name: /Первый судья/ });
    const btn2 = screen.getByRole('button', { name: /Второй судья/ });

    expect(btn1).not.toBeDisabled();
    expect(btn2).toBeDisabled();
    expect(btn2).toHaveAttribute('title', 'Другая плашка этого инпута в эфире');
  });
});
