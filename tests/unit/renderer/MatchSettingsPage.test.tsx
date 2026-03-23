/**
 * Тесты для компонента MatchSettingsPage
 * 
 * Проверяем:
 * 1. Сохранение несохраненных изменений в текстовых полях при работе с логотипами (критично - исправление бага)
 * 2. Смену команд (swapTeams)
 * 3. Обновление formData только при смене matchId
 * 4. Загрузку/удаление логотипов
 * 5. Сохранение формы
 * 6. Инициализацию формы при загрузке матча
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MatchSettingsPage from '../../../src/renderer/pages/MatchSettingsPage';
import { createNewMatch } from '../../../src/shared/matchUtils.js';

// Моки для хуков
vi.mock('../../../src/renderer/hooks/useVMix', () => ({
  useVMix: vi.fn(() => ({
    updateMatchData: vi.fn(),
    connectionStatus: { connected: false },
    resetImageFieldsCache: vi.fn(),
    updateReferee2Data: vi.fn(),
  })),
}));

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
      pathname: '/match-settings',
      state: null,
      search: '',
      hash: '',
    }),
  };
});

// Моки для утилит
vi.mock('../../../src/renderer/utils/imageResize', () => ({
  resizeImage: vi.fn((base64) => Promise.resolve(base64)),
}));

// Моки для window.electronAPI
const mockElectronAPI = {
  saveLogoToFile: vi.fn(),
  deleteLogo: vi.fn(),
  setCurrentMatch: vi.fn(),
  setMobileMatch: vi.fn(),
  swapTeams: vi.fn(),
  showMessage: vi.fn(() => Promise.resolve()),
  showConfirm: vi.fn(() => Promise.resolve(true)),
};

// Обертка для рендеринга с роутером
const renderWithRouter = (component, initialEntries = ['/match-settings']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  );
};

// Обертка для rerender с роутером
const rerenderWithRouter = (rerender, component, initialEntries = ['/match-settings']) => {
  return rerender(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  );
};

describe('MatchSettingsPage', () => {
  let testMatch;
  let onMatchChange;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Создаем тестовый матч
    testMatch = createNewMatch();
    testMatch.tournament = 'Тестовый турнир';
    testMatch.teamA.name = 'Команда А';
    testMatch.teamB.name = 'Команда Б';
    
    onMatchChange = vi.fn();
    
    // ВАЖНО: Не заменяем window полностью, а расширяем его
    // Это предотвращает ошибку "Right-hand side of 'instanceof' is not an object"
    if (!global.window.electronAPI) {
      global.window.electronAPI = mockElectronAPI;
    } else {
      Object.assign(global.window.electronAPI, mockElectronAPI);
    }
    
    // Моки для FileReader
    // ВАЖНО: FileReader должен быть конструктором (классом), а не функцией
    // В jsdom окружении FileReader может быть определен, поэтому проверяем и заменяем только если нужно
    // Используем функцию-конструктор (не arrow function!) для правильного мока
    const MockFileReader = function() {
      this.onload = null;
      this.readAsDataURL = vi.fn((file) => {
        // Симулируем успешное чтение файла
        // Используем Promise.resolve().then для асинхронного выполнения
        // Это гарантирует, что onload будет вызван после текущего стека вызовов
        const reader = this;
        Promise.resolve().then(() => {
          if (reader.onload) {
            reader.onload({ target: { result: 'data:image/png;base64,test' } });
          }
        });
      });
    };
    // Заменяем глобальный FileReader на наш мок
    global.FileReader = MockFileReader;
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Инициализация формы', () => {
    test('должен инициализировать форму данными из матча', async () => {
      renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      // Ждем инициализации формы
      const tournamentInput = await screen.findByPlaceholderText('Введите заголовок турнира');

      // Проверяем, что поля формы заполнены данными из матча
      expect(tournamentInput).toHaveValue(testMatch.tournament);
    });

    test('должен обновлять форму только при смене matchId', async () => {
      const { rerender } = renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      const tournamentInput = await screen.findByPlaceholderText('Введите заголовок турнира');
      
      // Изменяем значение в поле
      fireEvent.change(tournamentInput, { target: { value: 'Новое значение' } });
      expect(tournamentInput).toHaveValue('Новое значение');

      // Обновляем match с тем же matchId (симулируем изменение логотипа)
      const updatedMatch = {
        ...testMatch,
        teamA: {
          ...testMatch.teamA,
          logo: 'data:image/png;base64,newlogo',
        },
      };

      rerenderWithRouter(rerender, <MatchSettingsPage match={updatedMatch} onMatchChange={onMatchChange} />);

      // Значение в поле должно сохраниться (не перезаписаться)
      await waitFor(() => {
        expect(tournamentInput).toHaveValue('Новое значение');
      });
    });

    test('должен обновлять форму при смене matchId (новый матч)', async () => {
      const { rerender } = renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      const tournamentInput = await screen.findByPlaceholderText('Введите заголовок турнира');
      
      // Изменяем значение в поле
      fireEvent.change(tournamentInput, { target: { value: 'Новое значение' } });
      expect(tournamentInput).toHaveValue('Новое значение');

      // Создаем новый матч с другим matchId
      const newMatch = createNewMatch();
      newMatch.tournament = 'Новый турнир';

      rerenderWithRouter(rerender, <MatchSettingsPage match={newMatch} onMatchChange={onMatchChange} />);

      // Форма должна обновиться данными из нового матча
      await waitFor(() => {
        expect(tournamentInput).toHaveValue('Новый турнир');
      });
    });
  });

  describe('Сохранение несохраненных изменений при работе с логотипами', () => {
    test('не должен терять несохраненные изменения при загрузке логотипа', async () => {
      mockElectronAPI.saveLogoToFile.mockResolvedValue({
        success: true,
        logoBase64: 'data:image/png;base64,newlogo',
        logoPath: 'logos/logo_a_1234567890.png',
      });
      mockElectronAPI.setCurrentMatch.mockResolvedValue({});

      renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      const tournamentInput = await screen.findByPlaceholderText('Введите заголовок турнира');
      // Находим поле "Название команды" для команды A (первое в списке)
      const teamNameInputs = screen.getAllByPlaceholderText('Название команды');
      const teamANameInput = teamNameInputs[0]; // Первое - для команды A

      // Изменяем значения в текстовых полях
      fireEvent.change(tournamentInput, { target: { value: 'Измененный турнир' } });
      fireEvent.change(teamANameInput, { target: { value: 'Измененная команда А' } });

      expect(tournamentInput).toHaveValue('Измененный турнир');
      expect(teamANameInput).toHaveValue('Измененная команда А');

      // Загружаем логотип команды A
      // Используем getAllByLabelText, так как есть два input с одинаковым текстом (для команды A и B)
      const fileInputs = screen.getAllByLabelText(/Загрузить/i);
      const fileInputA = fileInputs[0]; // Первый - для команды A
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      fireEvent.change(fileInputA, { target: { files: [file] } });

      // Ждем завершения загрузки
      await waitFor(() => {
        expect(mockElectronAPI.saveLogoToFile).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Проверяем, что несохраненные изменения сохранились
      expect(tournamentInput).toHaveValue('Измененный турнир');
      expect(teamANameInput).toHaveValue('Измененная команда А');
    });

    test('не должен терять несохраненные изменения при удалении логотипа', async () => {
      // Создаем матч с логотипом
      const matchWithLogo = {
        ...testMatch,
        teamA: {
          ...testMatch.teamA,
          logo: 'data:image/png;base64,test',
        },
      };

      mockElectronAPI.deleteLogo.mockResolvedValue({});
      mockElectronAPI.setCurrentMatch.mockResolvedValue({});

      renderWithRouter(
        <MatchSettingsPage match={matchWithLogo} onMatchChange={onMatchChange} />
      );

      const tournamentInput = await screen.findByPlaceholderText('Введите заголовок турнира');
      // Находим поле "Название команды" для команды A (первое в списке)
      const teamNameInputs = screen.getAllByPlaceholderText('Название команды');
      const teamANameInput = teamNameInputs[0]; // Первое - для команды A

      // Изменяем значения в текстовых полях
      fireEvent.change(tournamentInput, { target: { value: 'Измененный турнир' } });
      fireEvent.change(teamANameInput, { target: { value: 'Измененная команда А' } });

      expect(tournamentInput).toHaveValue('Измененный турнир');
      expect(teamANameInput).toHaveValue('Измененная команда А');

      // Удаляем логотип команды A
      // Используем getAllByText, так как есть две кнопки "Удалить" (для команды A и B)
      const deleteButtons = screen.getAllByText('Удалить');
      const deleteButtonA = deleteButtons[0]; // Первая - для команды A
      fireEvent.click(deleteButtonA);

      // Ждем завершения удаления
      await waitFor(() => {
        expect(mockElectronAPI.deleteLogo).toHaveBeenCalled();
      });

      // Проверяем, что несохраненные изменения сохранились
      expect(tournamentInput).toHaveValue('Измененный турнир');
      expect(teamANameInput).toHaveValue('Измененная команда А');
    });
  });

  describe('Смена команд (swapTeams)', () => {
    test('должен вызывать swapTeams при нажатии на кнопку смены команд', async () => {
      const swappedMatch = {
        ...testMatch,
        teamA: {
          ...testMatch.teamB,
          name: testMatch.teamB.name,
        },
        teamB: {
          ...testMatch.teamA,
          name: testMatch.teamA.name,
        },
      };

      mockElectronAPI.swapTeams.mockResolvedValue({
        success: true,
        match: swappedMatch,
      });
      mockElectronAPI.setCurrentMatch.mockResolvedValue({
        match: swappedMatch,
      });
      mockElectronAPI.setMobileMatch.mockResolvedValue({});

      renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      // Находим кнопку смены команд
      const swapButton = await screen.findByText('Поменять команды местами');
      fireEvent.click(swapButton);

      // Проверяем, что swapTeams был вызван
      await waitFor(() => {
        expect(mockElectronAPI.swapTeams).toHaveBeenCalledWith(testMatch);
      });
    });

    test('должен обновлять форму после успешной смены команд', async () => {
      const swappedMatch = {
        ...testMatch,
        teamA: {
          ...testMatch.teamB,
          name: 'Команда Б (после смены)',
        },
        teamB: {
          ...testMatch.teamA,
          name: 'Команда А (после смены)',
        },
      };

      mockElectronAPI.swapTeams.mockResolvedValue({
        success: true,
        match: swappedMatch,
      });
      mockElectronAPI.setCurrentMatch.mockResolvedValue({
        match: swappedMatch,
      });
      mockElectronAPI.setMobileMatch.mockResolvedValue({});

      renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      const swapButton = await screen.findByText('Поменять команды местами');
      fireEvent.click(swapButton);

      // Ждем завершения смены команд
      await waitFor(() => {
        expect(mockElectronAPI.swapTeams).toHaveBeenCalled();
      });

      // Проверяем, что форма обновилась
      const teamANameInput = await screen.findByDisplayValue('Команда Б (после смены)');
      expect(teamANameInput).toBeInTheDocument();
    });

    test('должен обновлять formData явно после swapTeams (matchId не меняется)', async () => {
      const swappedMatch = {
        ...testMatch,
        teamA: {
          ...testMatch.teamB,
          name: 'Новое имя команды А',
        },
        teamB: {
          ...testMatch.teamA,
          name: 'Новое имя команды Б',
        },
      };

      mockElectronAPI.swapTeams.mockResolvedValue({
        success: true,
        match: swappedMatch,
      });
      mockElectronAPI.setCurrentMatch.mockResolvedValue({
        match: swappedMatch,
      });
      mockElectronAPI.setMobileMatch.mockResolvedValue({});

      renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      // Изменяем значение перед сменой команд
      const tournamentInput = await screen.findByPlaceholderText('Введите заголовок турнира');
      fireEvent.change(tournamentInput, { target: { value: 'Измененный турнир' } });

      const swapButton = await screen.findByText('Поменять команды местами');
      fireEvent.click(swapButton);

      // Ждем завершения смены команд
      await waitFor(() => {
        expect(mockElectronAPI.swapTeams).toHaveBeenCalled();
      });

      // После swapTeams форма должна обновиться данными из swappedMatch
      // (явное обновление в коде swapTeams)
      const teamANameInput = await screen.findByDisplayValue('Новое имя команды А');
      expect(teamANameInput).toBeInTheDocument();
    });

    test('не должен вызывать swapTeams, если пользователь отменил подтверждение', async () => {
      mockElectronAPI.showConfirm.mockResolvedValue(false);

      renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      const swapButton = await screen.findByText('Поменять команды местами');
      fireEvent.click(swapButton);

      await waitFor(() => {
        expect(mockElectronAPI.showConfirm).toHaveBeenCalled();
      });
      expect(mockElectronAPI.swapTeams).not.toHaveBeenCalled();
    });
  });

  describe('Загрузка и удаление логотипов', () => {
    test('должен загружать логотип команды A', async () => {
      mockElectronAPI.saveLogoToFile.mockResolvedValue({
        success: true,
        logoBase64: 'data:image/png;base64,newlogo',
        logoPath: 'logos/logo_a_1234567890.png',
      });
      mockElectronAPI.setCurrentMatch.mockResolvedValue({});

      renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      // Используем getAllByLabelText, так как есть два input с одинаковым текстом (для команды A и B)
      const fileInputs = screen.getAllByLabelText(/Загрузить/i);
      const fileInputA = fileInputs[0]; // Первый - для команды A
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      fireEvent.change(fileInputA, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockElectronAPI.saveLogoToFile).toHaveBeenCalledWith('A', expect.any(String));
      }, { timeout: 3000 });
    });

    test('должен удалять логотип команды A', async () => {
      const matchWithLogo = {
        ...testMatch,
        teamA: {
          ...testMatch.teamA,
          logo: 'data:image/png;base64,test',
        },
      };

      mockElectronAPI.deleteLogo.mockResolvedValue({});
      mockElectronAPI.setCurrentMatch.mockResolvedValue({});

      renderWithRouter(
        <MatchSettingsPage match={matchWithLogo} onMatchChange={onMatchChange} />
      );

      // Используем getAllByText, так как есть две кнопки "Удалить" (для команды A и B)
      const deleteButtons = screen.getAllByText('Удалить');
      const deleteButtonA = deleteButtons[0]; // Первая - для команды A
      fireEvent.click(deleteButtonA);

      await waitFor(() => {
        expect(mockElectronAPI.deleteLogo).toHaveBeenCalledWith('A');
      });
    });
  });

  describe('Сохранение формы', () => {
    test('должен сохранять изменения формы', async () => {
      mockElectronAPI.setCurrentMatch.mockResolvedValue({});
      mockElectronAPI.setMobileMatch.mockResolvedValue({});

      renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      const tournamentInput = await screen.findByPlaceholderText('Введите заголовок турнира');
      fireEvent.change(tournamentInput, { target: { value: 'Новый турнир' } });

      const saveButton = screen.getByText('Сохранить изменения');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockElectronAPI.setCurrentMatch).toHaveBeenCalled();
      });

      // Проверяем, что матч был обновлен с новыми данными
      const callArgs = mockElectronAPI.setCurrentMatch.mock.calls[0][0];
      expect(callArgs.tournament).toBe('Новый турнир');
    });

    test('должен сохранять все изменения формы, включая команды и судей', async () => {
      mockElectronAPI.setCurrentMatch.mockResolvedValue({});
      mockElectronAPI.setMobileMatch.mockResolvedValue({});

      renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      // Изменяем несколько полей
      const tournamentInput = await screen.findByPlaceholderText('Введите заголовок турнира');
      // Находим поле "Название команды" для команды A (первое в списке)
      const teamNameInputs = screen.getAllByPlaceholderText('Название команды');
      const teamANameInput = teamNameInputs[0]; // Первое - для команды A
      const referee1Input = await screen.findByPlaceholderText('Имя главного судьи');

      fireEvent.change(tournamentInput, { target: { value: 'Новый турнир' } });
      fireEvent.change(teamANameInput, { target: { value: 'Новая команда А' } });
      fireEvent.change(referee1Input, { target: { value: 'Иван Иванов' } });

      const saveButton = screen.getByText('Сохранить изменения');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockElectronAPI.setCurrentMatch).toHaveBeenCalled();
      });

      // Проверяем, что все изменения сохранены
      const callArgs = mockElectronAPI.setCurrentMatch.mock.calls[0][0];
      expect(callArgs.tournament).toBe('Новый турнир');
      expect(callArgs.teamA.name).toBe('Новая команда А');
      expect(callArgs.officials.referee1).toBe('Иван Иванов');
    });
  });

  describe('Интеграция: сохранение изменений при множественных операциях', () => {
    test('должен сохранять изменения после загрузки и удаления логотипа', async () => {
      mockElectronAPI.saveLogoToFile.mockResolvedValue({
        success: true,
        logoBase64: 'data:image/png;base64,newlogo',
        logoPath: 'logos/logo_a_1234567890.png',
      });
      mockElectronAPI.deleteLogo.mockResolvedValue({});
      mockElectronAPI.setCurrentMatch.mockResolvedValue({});

      renderWithRouter(
        <MatchSettingsPage match={testMatch} onMatchChange={onMatchChange} />
      );

      const tournamentInput = await screen.findByPlaceholderText('Введите заголовок турнира');
      fireEvent.change(tournamentInput, { target: { value: 'Измененный турнир' } });

      // Загружаем логотип команды A
      // Используем getAllByLabelText, так как есть два input с одинаковым текстом (для команды A и B)
      const fileInputs = screen.getAllByLabelText(/Загрузить/i);
      const fileInputA = fileInputs[0]; // Первый - для команды A
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      fireEvent.change(fileInputA, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockElectronAPI.saveLogoToFile).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Проверяем, что изменения сохранились
      expect(tournamentInput).toHaveValue('Измененный турнир');

      // Удаляем логотип команды A
      // Используем getAllByText, так как есть две кнопки "Удалить" (для команды A и B)
      const deleteButtons = screen.getAllByText('Удалить');
      const deleteButtonA = deleteButtons[0]; // Первая - для команды A
      fireEvent.click(deleteButtonA);

      await waitFor(() => {
        expect(mockElectronAPI.deleteLogo).toHaveBeenCalled();
      });

      // Проверяем, что изменения все еще сохранились
      expect(tournamentInput).toHaveValue('Измененный турнир');
    });
  });
});
