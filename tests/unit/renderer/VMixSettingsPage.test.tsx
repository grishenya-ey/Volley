/**
 * Тесты для VMixSettingsPage: сохранение настроек, навигация с forceUpdateVMix,
 * перетаскивание порядка инпутов (DnD).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VMixSettingsPage from '../../../src/renderer/pages/VMixSettingsPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../src/renderer/components/Layout', () => ({
  useHeaderButtons: vi.fn(() => ({
    setButtons: vi.fn(),
  })),
}));

describe('VMixSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      getVMixConfig: vi.fn().mockResolvedValue({
        host: 'localhost',
        port: 8088,
        connectionState: 'disconnected',
        inputOrder: [],
        inputs: {},
      }),
      setVMixConfig: vi.fn().mockResolvedValue(undefined),
      testVMixConnection: vi.fn().mockResolvedValue({ success: true }),
      vmixConnect: vi.fn().mockResolvedValue({ success: true }),
      vmixDisconnect: vi.fn().mockResolvedValue(undefined),
      getVMixGTInputs: vi.fn().mockResolvedValue({ success: true, inputs: [] }),
      getVMixInputFields: vi.fn().mockResolvedValue({ success: true, fields: [] }),
      clearVMixInputFieldsCache: vi.fn().mockResolvedValue({ success: true }),
    };
  });

  const renderWithRouter = (initialEntries = ['/vmix-settings']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <VMixSettingsPage />
      </MemoryRouter>
    );
  };

  test('при сохранении вызывается setVMixConfig и navigate с state.forceUpdateVMix', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: '192.168.1.1',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: ['id1'],
      inputs: {
        id1: { displayName: 'Счёт', vmixTitle: 'Scoreboard', enabled: true, fields: {} },
      },
    });

    renderWithRouter();

    await waitFor(() => {
      expect(window.electronAPI.getVMixConfig).toHaveBeenCalled();
    });

    const saveButton = screen.getByRole('button', { name: /Сохранить/ });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(window.electronAPI.setVMixConfig).toHaveBeenCalled();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/match', { state: { forceUpdateVMix: true } });
  });

  test('отображает раздел «Подключение» и поля host/port', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Подключение/)).toBeInTheDocument();
    });

    const hostInput = screen.getByPlaceholderText(/192\.168\.1\.100/);
    const portInput = screen.getByPlaceholderText(/8088/);
    expect(hostInput).toBeInTheDocument();
    expect(portInput).toBeInTheDocument();
  });

  test('при загрузке с connectionState "disconnected" testVMixConnection не вызывается', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: [],
      inputs: {},
    });

    renderWithRouter();

    await waitFor(() => {
      expect(window.electronAPI.getVMixConfig).toHaveBeenCalled();
    });

    expect(window.electronAPI.testVMixConnection).not.toHaveBeenCalled();
  });

  test('при connectionState "disconnected" отображается кнопка «Подключить»', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: [],
      inputs: {},
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Подключить/ })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Отключить/ })).not.toBeInTheDocument();
  });

  test('при connectionState "connected" отображается кнопка «Отключить»', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
      inputOrder: [],
      inputs: {},
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Отключить/ })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Подключить/ })).not.toBeInTheDocument();
  });

  test('после «Отключить» и «Сохранить» в конфиг сохраняется connectionState "disconnected"', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
      inputOrder: [],
      inputs: {},
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Отключить/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Отключить/ }));
    await waitFor(() => {
      expect(window.electronAPI.vmixDisconnect).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Сохранить/ }));
    await waitFor(() => {
      expect(window.electronAPI.setVMixConfig).toHaveBeenCalled();
    });

    const savedConfig = window.electronAPI.setVMixConfig.mock.calls[0][0];
    expect(savedConfig.connectionState).toBe('disconnected');
  });

  test('при отсутствии electronAPI не падает', async () => {
    const originalAPI = window.electronAPI;
    window.electronAPI = undefined;

    expect(() => renderWithRouter()).not.toThrow();

    window.electronAPI = originalAPI;
  });

  test('кнопка «Сохранить» присутствует в интерфейсе', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Сохранить/ })).toBeInTheDocument();
    });
  });

  test('отображает список инпутов с draggable при наличии inputOrder', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
      inputOrder: ['id1', 'id2'],
      inputs: {
        id1: { displayName: 'Счёт', vmixTitle: 'T1', enabled: true, fields: {} },
        id2: { displayName: 'Судья', vmixTitle: 'T2', enabled: true, fields: {} },
      },
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Счёт')).toBeInTheDocument();
    });
    expect(screen.getByText('Судья')).toBeInTheDocument();

    const draggables = document.querySelectorAll('[draggable="true"]');
    expect(draggables.length).toBe(2);
  });

  test('при пустом inputOrder показывается «Нет инпутов»', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: [],
      inputs: {},
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Нет инпутов/)).toBeInTheDocument();
    });
  });

  test('при выбранном инпуте отображается кнопка «Повторно сопоставить»', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: ['id1'],
      inputs: {
        id1: { displayName: 'Счёт', vmixTitle: 'SCORE', vmixKey: 'key-a', vmixNumber: '10', enabled: true, fields: {} },
      },
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Счёт')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Счёт'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Повторно сопоставить/ })).toBeInTheDocument();
    });
  });

  test('по клику «Повторно сопоставить» открывается модальное окно', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
      inputOrder: ['id1'],
      inputs: {
        id1: { displayName: 'Счёт', vmixTitle: 'SCORE', vmixKey: 'key-a', vmixNumber: '10', enabled: true, fields: {} },
      },
    });
    window.electronAPI.getVMixGTInputs.mockResolvedValue({
      success: true,
      inputs: [{ key: 'key-a', title: 'SCORE', number: '10' }, { key: 'key-b', title: 'Scoreboard', number: '12' }],
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Счёт')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Счёт'));
    fireEvent.click(screen.getByRole('button', { name: /Повторно сопоставить/ }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Повторно сопоставить/ })).toBeInTheDocument();
    });
    const modalContent = screen.getByRole('heading', { name: /Повторно сопоставить/ }).closest('div');
    expect(within(modalContent).getByRole('button', { name: /Применить/ })).toBeInTheDocument();
    expect(within(modalContent).getByRole('button', { name: /Отмена/ })).toBeInTheDocument();
  });

  test('после выбора инпута и «Применить» в модальном окне конфиг обновляется и кэш сбрасывается', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'connected',
      inputOrder: ['id1'],
      inputs: {
        id1: { displayName: 'Счёт', vmixTitle: 'SCORE', vmixKey: 'key-a', vmixNumber: '10', enabled: true, fields: {} },
      },
    });
    window.electronAPI.getVMixGTInputs.mockResolvedValue({
      success: true,
      inputs: [{ key: 'key-a', title: 'SCORE', number: '10' }, { key: 'key-b', title: 'Scoreboard', number: '12' }],
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Счёт')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Счёт'));
    fireEvent.click(screen.getByRole('button', { name: /Повторно сопоставить/ }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Повторно сопоставить/ })).toBeInTheDocument();
    });

    const modalContent = screen.getByRole('heading', { name: /Повторно сопоставить/ }).closest('div');
    const select = within(modalContent).getByRole('combobox');
    fireEvent.change(select, { target: { value: 'key-b' } });
    fireEvent.click(within(modalContent).getByRole('button', { name: /Применить/ }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Повторно сопоставить/ })).not.toBeInTheDocument();
    });
    expect(window.electronAPI.clearVMixInputFieldsCache).toHaveBeenCalledWith('Scoreboard');
    expect(window.electronAPI.clearVMixInputFieldsCache).toHaveBeenCalledWith('key-b');
    expect(window.electronAPI.clearVMixInputFieldsCache).toHaveBeenCalledWith('12');

    fireEvent.click(screen.getByRole('button', { name: /Сохранить настройки/ }));
    await waitFor(() => {
      expect(window.electronAPI.setVMixConfig).toHaveBeenCalled();
    });
    const savedConfig = window.electronAPI.setVMixConfig.mock.calls[0][0];
    expect(savedConfig.inputs.id1.vmixTitle).toBe('Scoreboard');
    expect(savedConfig.inputs.id1.vmixKey).toBe('key-b');
    expect(savedConfig.inputs.id1.vmixNumber).toBe('12');
  });
});
