/**
 * Тесты для WelcomePage: статус vMix берётся только из config.connectionState,
 * без вызова testVMixConnection для отображения.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WelcomePage from '../../../src/renderer/pages/WelcomePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('WelcomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      getVMixConfig: vi.fn().mockResolvedValue({
        host: 'localhost',
        port: 8088,
        connectionState: 'disconnected',
      }),
      testVMixConnection: vi.fn().mockResolvedValue({ success: true }),
    };
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <WelcomePage />
      </MemoryRouter>
    );
  };

  test('при connectionState "disconnected" отображается «Не подключено»', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Не подключено/)).toBeInTheDocument();
    });
    expect(window.electronAPI.testVMixConnection).not.toHaveBeenCalled();
  });

  test('при connectionState "connected" отображается «Подключено»', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Подключено/)).toBeInTheDocument();
    });
    expect(window.electronAPI.testVMixConnection).not.toHaveBeenCalled();
  });

  test('статус vMix не зависит от testVMixConnection', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
    });
    window.electronAPI.testVMixConnection.mockResolvedValue({ success: true });

    renderWithRouter();

    await waitFor(() => {
      expect(window.electronAPI.getVMixConfig).toHaveBeenCalled();
    });
    expect(screen.getByText(/Не подключено/)).toBeInTheDocument();
    expect(window.electronAPI.testVMixConnection).not.toHaveBeenCalled();
  });
});
