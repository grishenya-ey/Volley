/**
 * Тесты для компонента MobileAccessPage
 * 
 * Проверяем:
 * 1. Генерацию QR-кода с использованием qrcode.react
 * 2. Отображение QR-кода после генерации
 * 3. Работу с QRCodeCanvas компонентом
 * 4. Интеграцию с Electron API для мобильного сервера
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileAccessPage from '../../../src/renderer/pages/MobileAccessPage';

// Моки для хуков
vi.mock('../../../src/renderer/components/Layout', () => ({
  useHeaderButtons: vi.fn(() => ({
    setButtons: vi.fn(),
  })),
}));

// Моки для react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/mobile-access',
      state: null,
      search: '',
      hash: '',
    }),
  };
});

// Моки для qrcode.react (без getContext — в jsdom он не реализован)
vi.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value, size }) => {
    return React.createElement('canvas', {
      'data-testid': 'qrcode-canvas',
      width: size || 300,
      height: size || 300,
    });
  },
}));

describe('MobileAccessPage', () => {
  let mockElectronAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Моки для Electron API (running: false — чтобы отображалась кнопка «Запустить сервер»)
    mockElectronAPI = {
      getMobileServerInfo: vi.fn(() => Promise.resolve({ success: false, running: false })),
      isMobileServerRunning: vi.fn(() => Promise.resolve(false)),
      startMobileServer: vi.fn(() => Promise.resolve({ success: true, port: 3000 })),
      stopMobileServer: vi.fn(() => Promise.resolve({ success: true })),
      generateMobileSession: vi.fn(() => Promise.resolve({
        success: true,
        sessionId: 'test-session-id',
        url: 'http://192.168.1.100:3000/mobile/test-session-id',
      })),
      getSavedMobileSession: vi.fn(() => Promise.resolve(null)),
      getNetworkInterfaces: vi.fn(() => Promise.resolve([
        { name: 'Ethernet', ip: '192.168.1.100', isPrivate: true, isVpn: false },
        { name: 'Wi-Fi', ip: '192.168.1.101', isPrivate: true, isVpn: false },
      ])),
      setSelectedIP: vi.fn(() => Promise.resolve({ success: true })),
      getSelectedIP: vi.fn(() => Promise.resolve(null)),
    };

    // Настройка global.window.electronAPI
    if (!global.window) {
      global.window = {};
    }
    if (!global.window.electronAPI) {
      global.window.electronAPI = mockElectronAPI;
    } else {
      Object.assign(global.window.electronAPI, mockElectronAPI);
    }

    // Моки для window.confirm
    if (!global.window.confirm) {
      global.window.confirm = vi.fn(() => true);
    } else {
      global.window.confirm = vi.fn(() => true);
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  const renderWithRouter = (component) => {
    return render(
      <MemoryRouter>
        {component}
      </MemoryRouter>
    );
  };

  test('должен отображать страницу мобильного доступа', async () => {
    renderWithRouter(<MobileAccessPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/мобильный доступ/i)).toBeInTheDocument();
    });
  });

  test('должен загружать сетевые интерфейсы при монтировании', async () => {
    renderWithRouter(<MobileAccessPage />);
    
    await waitFor(() => {
      expect(mockElectronAPI.getNetworkInterfaces).toHaveBeenCalled();
    });
  });

  test('должен запускать сервер при нажатии на кнопку "Запустить сервер"', async () => {
    renderWithRouter(<MobileAccessPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /запустить сервер/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /запустить сервер/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockElectronAPI.startMobileServer).toHaveBeenCalledWith(3000);
    });
  });

  test('должен генерировать QR-код после запуска сервера и генерации сессии', async () => {
    mockElectronAPI.getSavedMobileSession = vi.fn(() => Promise.resolve(null));
    
    renderWithRouter(<MobileAccessPage />);
    
    // Запускаем сервер (кнопка — на странице несколько элементов с текстом «запустить сервер»)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /запустить сервер/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /запустить сервер/i });
    fireEvent.click(startButton);

    // Ждем генерации сессии
    await waitFor(() => {
      expect(mockElectronAPI.startMobileServer).toHaveBeenCalled();
    });

    // Ждем генерации QR-кода
    await waitFor(() => {
      expect(mockElectronAPI.generateMobileSession).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Проверяем, что QR-код отображается (может потребоваться дополнительное время для рендеринга canvas)
    await waitFor(() => {
      const canvas = document.querySelector('canvas[data-testid="qrcode-canvas"]');
      expect(canvas).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('должен отображать QR-код из сохраненной сессии', async () => {
    const savedSession = {
      sessionId: 'saved-session-id',
      url: 'http://192.168.1.100:3000/mobile/saved-session-id',
    };
    const getSavedMobileSessionMock = vi.fn(() => Promise.resolve(savedSession));
    const getMobileServerInfoMock = vi.fn(() =>
      Promise.resolve({ success: true, port: 3000, running: true })
    );
    mockElectronAPI.getSavedMobileSession = getSavedMobileSessionMock;
    mockElectronAPI.getMobileServerInfo = getMobileServerInfoMock;
    global.window.electronAPI.getSavedMobileSession = getSavedMobileSessionMock;
    global.window.electronAPI.getMobileServerInfo = getMobileServerInfoMock;

    renderWithRouter(<MobileAccessPage />);

    // Ждем загрузки сохраненной сессии (loadSavedSession вызывается при serverInfo.running === true)
    await waitFor(
      () => {
        expect(getSavedMobileSessionMock).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Проверяем, что QR-код отображается
    await waitFor(
      () => {
        const canvas = document.querySelector('canvas[data-testid="qrcode-canvas"]');
        expect(canvas).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  test('должен останавливать сервер при нажатии на кнопку "Остановить сервер"', async () => {
    const getMobileServerInfoMock = vi.fn(() =>
      Promise.resolve({ success: true, port: 3000, running: true })
    );
    mockElectronAPI.getMobileServerInfo = getMobileServerInfoMock;
    global.window.electronAPI.getMobileServerInfo = getMobileServerInfoMock;

    renderWithRouter(<MobileAccessPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /остановить сервер/i })).toBeInTheDocument();
    });

    const stopButton = screen.getByRole('button', { name: /остановить сервер/i });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockElectronAPI.stopMobileServer).toHaveBeenCalled();
    });
  });

  test('должен очищать QR-код при остановке сервера', async () => {
    const getMobileServerInfoMock = vi.fn(() =>
      Promise.resolve({ success: true, port: 3000, running: true })
    );
    const getSavedMobileSessionMock = vi.fn(() =>
      Promise.resolve({
        sessionId: 'test-session',
        url: 'http://192.168.1.100:3000/mobile/test-session',
      })
    );
    mockElectronAPI.getMobileServerInfo = getMobileServerInfoMock;
    mockElectronAPI.getSavedMobileSession = getSavedMobileSessionMock;
    global.window.electronAPI.getMobileServerInfo = getMobileServerInfoMock;
    global.window.electronAPI.getSavedMobileSession = getSavedMobileSessionMock;

    renderWithRouter(<MobileAccessPage />);

    // Ждем загрузки QR-кода (сессия подгружается при running: true)
    await waitFor(
      () => {
        const canvas = document.querySelector('canvas[data-testid="qrcode-canvas"]');
        return canvas !== null;
      },
      { timeout: 2000 }
    );

    // Останавливаем сервер (кнопка по роли — на странице может быть текст «остановить» в инструкции)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /остановить сервер/i })).toBeInTheDocument();
    });

    const stopButton = screen.getByRole('button', { name: /остановить сервер/i });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockElectronAPI.stopMobileServer).toHaveBeenCalled();
    });

    // Проверяем, что QR-код больше не отображается
    await waitFor(() => {
      const canvas = document.querySelector('canvas[data-testid="qrcode-canvas"]');
      expect(canvas).not.toBeInTheDocument();
    });
  });

  test('должен отображать сетевые интерфейсы в выпадающем списке', async () => {
    renderWithRouter(<MobileAccessPage />);

    await waitFor(() => {
      expect(mockElectronAPI.getNetworkInterfaces).toHaveBeenCalled();
    });

    // Проверяем наличие выпадающего списка
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  test('должен обрабатывать ошибки при генерации QR-кода', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const generateMobileSessionReject = vi.fn(() =>
      Promise.reject(new Error('Ошибка генерации сессии'))
    );
    mockElectronAPI.generateMobileSession = generateMobileSessionReject;
    mockElectronAPI.getSavedMobileSession = vi.fn(() => Promise.resolve(null));
    global.window.electronAPI.generateMobileSession = generateMobileSessionReject;

    renderWithRouter(<MobileAccessPage />);

    // Запускаем сервер (ищем кнопку по роли — на странице несколько элементов с текстом «запустить сервер»)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /запустить сервер/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /запустить сервер/i });
    fireEvent.click(startButton);

    // Ждем вызова generateMobileSession (после успешного startMobileServer компонент вызывает его)
    await waitFor(
      () => {
        expect(generateMobileSessionReject).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    consoleErrorSpy.mockRestore();
  });
});
