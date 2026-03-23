/**
 * Тесты для компонента AboutPage - функционал обновлений
 * @src/renderer/pages/AboutPage
 */

import { describe, test, beforeEach, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AboutPage from '../../../src/renderer/pages/AboutPage';

describe('AboutPage - Updates Functionality', () => {
  beforeEach(() => {
    // Сбрасываем моки перед каждым тестом
    vi.clearAllMocks();
    
    // Настраиваем моки для electronAPI
    global.window.electronAPI = {
      getVersion: vi.fn(() => Promise.resolve('1.0.6')),
      checkForUpdates: vi.fn(() => Promise.resolve({ success: true })),
      downloadUpdate: vi.fn(() => Promise.resolve({ success: true })),
      installUpdate: vi.fn(() => Promise.resolve({ success: true })),
      getAutoUpdateSettings: vi.fn(() =>
        Promise.resolve({ success: true, enabled: true })
      ),
      setAutoUpdateSettings: vi.fn(() =>
        Promise.resolve({ success: true })
      ),
      onUpdateStatus: vi.fn((callback) => {
        // Сохраняем callback для последующего вызова
        global.updateStatusCallback = callback;
        return () => {}; // Возвращаем cleanup функцию
      }),
      onAutoUpdateSettingsChanged: vi.fn((callback) => {
        global.autoUpdateSettingsCallback = callback;
        return () => {};
      }),
    };
  });

  test('должен отображать версию приложения', async () => {
    render(<AboutPage />);
    
    await waitFor(() => {
      expect(global.window.electronAPI.getVersion).toHaveBeenCalled();
    });
    
    // Проверяем, что версия отображается (может быть в тексте)
    expect(screen.getByText(/Версия/i)).toBeInTheDocument();
  });

  test('должен загружать настройки автообновлений при монтировании', async () => {
    render(<AboutPage />);
    
    await waitFor(() => {
      expect(global.window.electronAPI.getAutoUpdateSettings).toHaveBeenCalled();
    });
  });

  test('должен отображать переключатель автоматических обновлений', async () => {
    render(<AboutPage />);
    
    await waitFor(() => {
      const checkbox = screen.getByLabelText(/Автоматическая проверка при запуске/i);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked(); // По умолчанию включено
    });
  });

  test('должен обновлять настройки при изменении переключателя', async () => {
    const user = userEvent.setup();
    render(<AboutPage />);
    
    await waitFor(() => {
      expect(global.window.electronAPI.getAutoUpdateSettings).toHaveBeenCalled();
    });
    
    const checkbox = screen.getByLabelText(/Автоматическая проверка при запуске/i);
    await user.click(checkbox);
    
    await waitFor(() => {
      expect(global.window.electronAPI.setAutoUpdateSettings).toHaveBeenCalledWith(false);
    });
  });

  test('должен отображать кнопку "Проверить обновления"', async () => {
    render(<AboutPage />);
    
    const checkButton = screen.getByText(/Проверить обновления/i);
    expect(checkButton).toBeInTheDocument();
  });

  test('должен вызывать checkForUpdates при нажатии на кнопку', async () => {
    const user = userEvent.setup();
    render(<AboutPage />);
    
    const checkButton = screen.getByText(/Проверить обновления/i);
    await user.click(checkButton);
    
    await waitFor(() => {
      expect(global.window.electronAPI.checkForUpdates).toHaveBeenCalled();
    });
  });

  test('должен отображать статус "Проверка обновлений..."', async () => {
    render(<AboutPage />);
    
    // Симулируем событие проверки обновлений
    if (global.updateStatusCallback) {
      global.updateStatusCallback({ status: 'checking', data: null });
    }
    
    await waitFor(() => {
      expect(screen.getByText(/Проверка обновлений/i)).toBeInTheDocument();
    });
  });

  test('должен отображать доступное обновление', async () => {
    render(<AboutPage />);
    
    // Симулируем событие доступного обновления
    if (global.updateStatusCallback) {
      global.updateStatusCallback({
        status: 'available',
        data: {
          version: '1.0.7',
          releaseNotes: 'Новые функции',
        },
      });
    }
    
    await waitFor(() => {
      expect(screen.getByText(/Доступна новая версия: 1.0.7/i)).toBeInTheDocument();
      expect(screen.getByText(/Что нового:/i)).toBeInTheDocument();
      expect(screen.getByText(/Новые функции/i)).toBeInTheDocument();
    });
  });

  test('должен отображать кнопку "Скачать обновление" при доступном обновлении', async () => {
    render(<AboutPage />);
    
    if (global.updateStatusCallback) {
      global.updateStatusCallback({
        status: 'available',
        data: { version: '1.0.7' },
      });
    }
    
    await waitFor(() => {
      const downloadButton = screen.getByText(/Скачать обновление/i);
      expect(downloadButton).toBeInTheDocument();
    });
  });

  test('должен вызывать downloadUpdate при нажатии на кнопку скачивания', async () => {
    const user = userEvent.setup();
    render(<AboutPage />);
    
    if (global.updateStatusCallback) {
      global.updateStatusCallback({
        status: 'available',
        data: { version: '1.0.7' },
      });
    }
    
    await waitFor(() => {
      const downloadButton = screen.getByText(/Скачать обновление/i);
      expect(downloadButton).toBeInTheDocument();
    });
    
    const downloadButton = screen.getByText(/Скачать обновление/i);
    await user.click(downloadButton);
    
    await waitFor(() => {
      expect(global.window.electronAPI.downloadUpdate).toHaveBeenCalled();
    });
  });

  test('должен отображать прогресс загрузки', async () => {
    render(<AboutPage />);
    
    if (global.updateStatusCallback) {
      global.updateStatusCallback({
        status: 'downloading',
        data: {
          percent: 50,
          transferred: 1024 * 1024 * 5, // 5 МБ
          total: 1024 * 1024 * 10, // 10 МБ
        },
      });
    }
    
    await waitFor(() => {
      expect(screen.getByText(/Загрузка обновления/i)).toBeInTheDocument();
      expect(screen.getByText(/50%/i)).toBeInTheDocument();
    });
  });

  test('должен отображать загруженное обновление', async () => {
    render(<AboutPage />);
    
    if (global.updateStatusCallback) {
      global.updateStatusCallback({
        status: 'downloaded',
        data: { version: '1.0.7' },
      });
    }
    
    await waitFor(() => {
      expect(
        screen.getByText(/Обновление 1.0.7 загружено и готово к установке/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Установить сейчас/i)).toBeInTheDocument();
    });
  });

  test('должен вызывать installUpdate при нажатии на кнопку установки', async () => {
    const user = userEvent.setup();
    render(<AboutPage />);
    
    if (global.updateStatusCallback) {
      global.updateStatusCallback({
        status: 'downloaded',
        data: { version: '1.0.7' },
      });
    }
    
    await waitFor(() => {
      const installButton = screen.getByText(/Установить сейчас/i);
      expect(installButton).toBeInTheDocument();
    });
    
    const installButton = screen.getByText(/Установить сейчас/i);
    await user.click(installButton);
    
    await waitFor(() => {
      expect(global.window.electronAPI.installUpdate).toHaveBeenCalled();
    });
  });

  test('должен отображать сообщение когда обновления не найдены', async () => {
    render(<AboutPage />);
    
    if (global.updateStatusCallback) {
      global.updateStatusCallback({
        status: 'not-available',
        data: { version: '1.0.6' },
      });
    }
    
    await waitFor(() => {
      expect(
        screen.getByText(/У вас установлена последняя версия приложения/i)
      ).toBeInTheDocument();
    });
  });

  test('должен отображать ошибку при проблемах с обновлениями', async () => {
    render(<AboutPage />);
    
    if (global.updateStatusCallback) {
      global.updateStatusCallback({
        status: 'error',
        data: { message: 'Network error' },
      });
    }
    
    await waitFor(() => {
      expect(screen.getByText(/Ошибка: Network error/i)).toBeInTheDocument();
    });
  });

  test('должен отображать сообщение когда автообновления отключены', async () => {
    global.window.electronAPI.getAutoUpdateSettings = vi.fn(() =>
      Promise.resolve({ success: true, enabled: false })
    );
    
    render(<AboutPage />);
    
    await waitFor(() => {
      expect(
        screen.getByText(/Автоматические обновления отключены/i)
      ).toBeInTheDocument();
    });
  });
});
