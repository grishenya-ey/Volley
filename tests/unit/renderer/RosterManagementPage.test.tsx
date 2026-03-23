/**
 * Тесты для RosterManagementPage — импорт и экспорт составов команд.
 * Проверяем:
 * 1. Экспорт — формат JSON (coach, roster)
 * 2. Импорт — миграция позиций (Нападающий → Доигровщик, Другое/Не указано → "")
 */

import { describe, test, beforeEach, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RosterManagementPage from '../../../src/renderer/pages/RosterManagementPage';
import { createNewMatch } from '../../../src/shared/matchUtils.js';

vi.mock('../../../src/renderer/hooks/useVMix', () => ({
  useVMix: vi.fn(() => ({
    updateMatchData: vi.fn(),
    resetImageFieldsCache: vi.fn(),
    connectionStatus: { connected: false },
  })),
}));

vi.mock('../../../src/renderer/components/Layout', () => ({
  useHeaderButtons: vi.fn(() => ({
    setButtons: vi.fn(),
  })),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/roster',
      state: null,
      search: '',
      hash: '',
    }),
  };
});

const createMatchWithRoster = (teamARoster, teamBRoster = []) => {
  const match = createNewMatch();
  match.teamA = { ...match.teamA, name: 'Команда A', roster: teamARoster };
  match.teamB = { ...match.teamB, name: 'Команда B', roster: teamBRoster };
  return match;
};

const renderWithRouter = (match, onMatchChange = vi.fn()) => {
  return render(
    <MemoryRouter initialEntries={['/roster']} initialIndex={0}>
      <RosterManagementPage match={match} onMatchChange={onMatchChange} />
    </MemoryRouter>
  );
};

describe('RosterManagementPage — импорт и экспорт', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('кнопки Импорт и Экспорт находятся в блоке «Внешний вид команды»', () => {
    const match = createMatchWithRoster([]);
    const { container } = renderWithRouter(match);
    const heading = screen.getByText('Внешний вид команды');
    const section = heading.closest('div');
    expect(section).toBeTruthy();
    expect(section).toContainElement(screen.getByText('Импорт'));
    expect(section).toContainElement(screen.getByText('Экспорт'));
  });

  test('в блоке «Состав команды» только кнопка «Добавить игрока», без Импорт/Экспорт', () => {
    const match = createMatchWithRoster([]);
    renderWithRouter(match);
    const rosterHeading = screen.getByText('Состав команды');
    const rosterSection = rosterHeading.closest('div');
    expect(rosterSection).toBeTruthy();
    const withinRoster = within(rosterSection as HTMLElement);
    expect(withinRoster.getByText('Добавить игрока')).toBeInTheDocument();
    expect(withinRoster.queryByText('Экспорт')).not.toBeInTheDocument();
    expect(withinRoster.queryByText('Импорт')).not.toBeInTheDocument();
  });

  describe('экспорт состава', () => {
    test('экспортирует name, city, coach, roster, startingLineupOrder, color, liberoColor в формате JSON', async () => {
      const roster = [
        { number: 1, name: 'Игрок 1', position: 'Доигровщик', isStarter: true },
        { number: 2, name: 'Игрок 2', position: 'Связующий', isStarter: false },
      ];
      const match = createMatchWithRoster(roster);
      match.teamA.coach = 'Тренер A';
      match.teamA.name = 'Команда A';
      match.teamA.city = 'Москва';
      match.teamA.color = '#3498db';
      match.teamA.liberoColor = '#ffffff';
      match.teamA.startingLineupOrder = [0];

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      renderWithRouter(match);
      fireEvent.click(screen.getByText('Экспорт'));

      expect(createObjectURLSpy).toHaveBeenCalled();
      const blob = createObjectURLSpy.mock.calls[0][0];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');

      const exportText = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsText(blob);
      });

      const exportData = JSON.parse(exportText);
      expect(exportData).toHaveProperty('coach', 'Тренер A');
      expect(exportData).toHaveProperty('name', 'Команда A');
      expect(exportData).toHaveProperty('city', 'Москва');
      expect(exportData).toHaveProperty('roster');
      expect(exportData).toHaveProperty('startingLineupOrder');
      expect(exportData).toHaveProperty('color', '#3498db');
      expect(exportData).toHaveProperty('liberoColor', '#ffffff');
      expect(exportData.roster).toHaveLength(2);
      expect(exportData.roster[0].position).toBe('Доигровщик');
      expect(exportData.roster[1].position).toBe('Связующий');

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock');

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    test('включает logoBase64 в экспорт при наличии логотипа', async () => {
      const match = createMatchWithRoster([{ number: 1, name: 'X', position: '', isStarter: false }]);
      match.teamA.logoBase64 = 'data:image/png;base64,abc';

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      renderWithRouter(match);
      fireEvent.click(screen.getByText('Экспорт'));

      const blob = createObjectURLSpy.mock.calls[0][0];
      const exportText = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsText(blob);
      });
      const exportData = JSON.parse(exportText);
      expect(exportData).toHaveProperty('logoBase64', 'data:image/png;base64,abc');

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('импорт состава', () => {
    test('мигрирует позиции при импорте: Нападающий → Доигровщик', async () => {
      const match = createMatchWithRoster([]);
      const onMatchChange = vi.fn();

      const importData = {
        coach: 'Импорт тренер',
        roster: [
          { number: 1, name: 'Игрок 1', position: 'Нападающий', isStarter: true },
          { number: 2, name: 'Игрок 2', position: 'Не указано', isStarter: true },
        ],
      };

      const mockFile = new File([JSON.stringify(importData, null, 2)], 'roster.json', {
        type: 'application/json',
      });

      // showMessage мокируется в tests/setup.ts

      const { container } = renderWithRouter(match, onMatchChange);

      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      expect(fileInput).toBeTruthy();

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(onMatchChange).toHaveBeenCalled();
      });

      const updatedMatch = onMatchChange.mock.calls[0][0];
      expect(updatedMatch.teamA.roster[0].position).toBe('Доигровщик');
      expect(updatedMatch.teamA.roster[1].position).toBe('');
      expect(updatedMatch.teamA.coach).toBe('Импорт тренер');
    });

    test('показывает ошибку при некорректном формате файла', async () => {
      const match = createMatchWithRoster([]);
      const showMessageMock = global.electronAPI?.showMessage;
      if (showMessageMock) vi.mocked(showMessageMock).mockClear();

      const invalidData = { foo: 'bar' };
      const mockFile = new File([JSON.stringify(invalidData)], 'invalid.json', {
        type: 'application/json',
      });

      const { container } = renderWithRouter(match);

      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(global.electronAPI?.showMessage).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining('Некорректный формат файла') })
        );
      });
    });

    test('применяет name, city, color, liberoColor при импорте расширенного формата', async () => {
      const match = createMatchWithRoster([]);
      match.teamA.name = 'Было';
      match.teamA.city = 'Был город';
      match.teamA.color = '#000000';
      const onMatchChange = vi.fn();

      const importData = {
        roster: [{ number: 1, name: 'Игрок', position: '', isStarter: false }],
        coach: 'Тренер',
        name: 'Новое название',
        city: 'Казань',
        color: '#ff0000',
        liberoColor: '#00ff00',
      };

      const mockFile = new File([JSON.stringify(importData)], 'roster.json', {
        type: 'application/json',
      });

      const { container } = renderWithRouter(match, onMatchChange);
      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(onMatchChange).toHaveBeenCalled();
      });

      const updatedMatch = onMatchChange.mock.calls[0][0];
      expect(updatedMatch.teamA.name).toBe('Новое название');
      expect(updatedMatch.teamA.city).toBe('Казань');
      expect(updatedMatch.teamA.color).toBe('#ff0000');
      expect(updatedMatch.teamA.liberoColor).toBe('#00ff00');
      expect(updatedMatch.teamA.coach).toBe('Тренер');
      expect(updatedMatch.teamA.roster).toHaveLength(1);
    });

    test('применяет city при импорте и отображает в поле «Город команды»', async () => {
      const match = createMatchWithRoster([]);
      const onMatchChange = vi.fn();

      const importData = {
        roster: [{ number: 1, name: 'X', position: '', isStarter: false }],
        city: 'Санкт-Петербург',
      };
      const mockFile = new File([JSON.stringify(importData)], 'roster.json', {
        type: 'application/json',
      });

      const { container } = renderWithRouter(match, onMatchChange);
      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(onMatchChange).toHaveBeenCalled();
      });

      const updatedMatch = onMatchChange.mock.calls[0][0];
      expect(updatedMatch.teamA.city).toBe('Санкт-Петербург');

      // Проверяем, что в UI отображается импортированный город
      const cityInput = container.querySelector('input[placeholder="Город команды"]');
      expect(cityInput).toBeTruthy();
      expect((cityInput as HTMLInputElement).value).toBe('Санкт-Петербург');
    });
  });
});
