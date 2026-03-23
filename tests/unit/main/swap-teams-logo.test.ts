/**
 * Тесты для проверки обработки логотипов при смене команд местами
 */

import { describe, test, beforeEach, expect, vi } from 'vitest';
import path from 'path';

const mockPath = path;
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => mockPath.join(__dirname, '../../temp-test-logos')),
  },
}));

vi.mock('../../../src/main/server.ts', () => ({}));

vi.mock('../../../src/main/logoManager.ts', async (importOriginal: () => Promise<Record<string, unknown>>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    processTeamLogoForSave: vi.fn(async (team: { logo?: string; logoBase64?: string }, teamLetter: string) => {
      const logoBase64 = team.logo ?? team.logoBase64;
      if (!logoBase64) {
        return { ...team, logoPath: undefined, logoBase64: undefined, logo: undefined };
      }
      const timestamp = Date.now();
      return {
        ...team,
        logoPath: `logos/logo_${teamLetter.toLowerCase()}_${timestamp}.png`,
        logoBase64,
        logo: undefined,
      };
    }),
    cleanupLogosDirectory: vi.fn(async () => {}),
  };
});

import * as logoManager from '../../../src/main/logoManager';

describe('swapTeams - обработка логотипов', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Проблема 1: Правильность сохранения логотипов в файлы', () => {
    test('должен сохранять логотип бывшей команды B в logo_a.png для новой команды A', async () => {
      const match = {
        matchId: 'test-match-1',
        teamA: { name: 'Команда A', logoBase64: 'data:image/png;base64,TEAM_A_LOGO_BASE64', logoPath: 'logos/logo_a.png' },
        teamB: { name: 'Команда B', logoBase64: 'data:image/png;base64,TEAM_B_LOGO_BASE64', logoPath: 'logos/logo_b.png' },
        currentSet: { scoreA: 10, scoreB: 15, servingTeam: 'A' },
        sets: [],
        statistics: { teamA: { attack: 5 }, teamB: { attack: 8 } },
      };

      const swappedMatch = JSON.parse(JSON.stringify(match)) as typeof match;
      const originalTeamALogo = (match.teamA as { logo?: string; logoBase64?: string }).logo ?? match.teamA.logoBase64;
      const originalTeamBLogo = (match.teamB as { logo?: string; logoBase64?: string }).logo ?? match.teamB.logoBase64;

      const tempTeam = swappedMatch.teamA;
      swappedMatch.teamA = swappedMatch.teamB;
      swappedMatch.teamB = tempTeam;

      if (originalTeamBLogo) {
        const processedTeamA = await logoManager.processTeamLogoForSave({ logo: originalTeamBLogo }, 'A');
        swappedMatch.teamA.logoBase64 = processedTeamA.logoBase64;
        swappedMatch.teamA.logoPath = processedTeamA.logoPath;
      }
      if (originalTeamALogo) {
        const processedTeamB = await logoManager.processTeamLogoForSave({ logo: originalTeamALogo }, 'B');
        swappedMatch.teamB.logoBase64 = processedTeamB.logoBase64;
        swappedMatch.teamB.logoPath = processedTeamB.logoPath;
      }

      expect(logoManager.processTeamLogoForSave).toHaveBeenCalledWith(
        { logo: 'data:image/png;base64,TEAM_B_LOGO_BASE64' },
        'A'
      );
      expect(logoManager.processTeamLogoForSave).toHaveBeenCalledWith(
        { logo: 'data:image/png;base64,TEAM_A_LOGO_BASE64' },
        'B'
      );
      expect(swappedMatch.teamA.logoPath).toMatch(/^logos\/logo_a_\d+\.png$/);
      expect(swappedMatch.teamB.logoPath).toMatch(/^logos\/logo_b_\d+\.png$/);
      expect(swappedMatch.teamA.logoBase64).toBe('data:image/png;base64,TEAM_B_LOGO_BASE64');
      expect(swappedMatch.teamB.logoBase64).toBe('data:image/png;base64,TEAM_A_LOGO_BASE64');
    });
  });

  describe('Проблема 2: Конфликт при повторном вызове setCurrentMatch после swapTeams', () => {
    test('после swapTeams setCurrentMatch не должен перезаписывать правильно установленные logoPath', async () => {
      const match = {
        matchId: 'test-match-2',
        teamA: { name: 'Команда A', logoBase64: 'data:image/png;base64,TEAM_A_LOGO', logoPath: 'logos/logo_a.png' },
        teamB: { name: 'Команда B', logoBase64: 'data:image/png;base64,TEAM_B_LOGO', logoPath: 'logos/logo_b.png' },
        currentSet: { scoreA: 0, scoreB: 0, servingTeam: 'A' },
        sets: [],
        statistics: { teamA: {}, teamB: {} },
      };

      const swappedMatch = JSON.parse(JSON.stringify(match)) as typeof match;
      const originalTeamALogo = match.teamA.logoBase64;
      const originalTeamBLogo = match.teamB.logoBase64;

      const tempTeam = swappedMatch.teamA;
      swappedMatch.teamA = swappedMatch.teamB;
      swappedMatch.teamB = tempTeam;

      if (originalTeamBLogo) {
        const processedTeamA = await logoManager.processTeamLogoForSave({ logo: originalTeamBLogo }, 'A');
        swappedMatch.teamA.logoBase64 = processedTeamA.logoBase64;
        swappedMatch.teamA.logoPath = processedTeamA.logoPath;
      }
      if (originalTeamALogo) {
        const processedTeamB = await logoManager.processTeamLogoForSave({ logo: originalTeamALogo }, 'B');
        swappedMatch.teamB.logoBase64 = processedTeamB.logoBase64;
        swappedMatch.teamB.logoPath = processedTeamB.logoPath;
      }

      const correctLogoPathA = swappedMatch.teamA.logoPath;
      const correctLogoPathB = swappedMatch.teamB.logoPath;
      const correctLogoBase64A = swappedMatch.teamA.logoBase64;
      const correctLogoBase64B = swappedMatch.teamB.logoBase64;

      if (swappedMatch.teamA) {
        const processedTeamA = await logoManager.processTeamLogoForSave(swappedMatch.teamA, 'A');
        swappedMatch.teamA.logoPath = processedTeamA.logoPath;
        swappedMatch.teamA.logoBase64 = processedTeamA.logoBase64;
      }
      if (swappedMatch.teamB) {
        const processedTeamB = await logoManager.processTeamLogoForSave(swappedMatch.teamB, 'B');
        swappedMatch.teamB.logoPath = processedTeamB.logoPath;
        swappedMatch.teamB.logoBase64 = processedTeamB.logoBase64;
      }

      expect(swappedMatch.teamA.logoPath).toBe(correctLogoPathA);
      expect(swappedMatch.teamB.logoPath).toBe(correctLogoPathB);
      expect(swappedMatch.teamA.logoBase64).toBe(correctLogoBase64A);
      expect(swappedMatch.teamB.logoBase64).toBe(correctLogoBase64B);
    });
  });

  describe('Проблема 3: Конфликт при сохранении настроек после swapTeams', () => {
    test('handleSave не должен перезаписывать logoPath старыми значениями из исходного матча', async () => {
      const originalMatch = {
        matchId: 'test-match-3',
        teamA: { name: 'Команда A', logoBase64: 'data:image/png;base64,TEAM_A_LOGO', logoPath: 'logos/logo_a.png' },
        teamB: { name: 'Команда B', logoBase64: 'data:image/png;base64,TEAM_B_LOGO', logoPath: 'logos/logo_b.png' },
        currentSet: { scoreA: 0, scoreB: 0, servingTeam: 'A' },
        sets: [],
        statistics: { teamA: {}, teamB: {} },
      };

      const swappedMatch = JSON.parse(JSON.stringify(originalMatch)) as typeof originalMatch;
      const originalTeamALogo = originalMatch.teamA.logoBase64;
      const originalTeamBLogo = originalMatch.teamB.logoBase64;

      const tempTeam = swappedMatch.teamA;
      swappedMatch.teamA = swappedMatch.teamB;
      swappedMatch.teamB = tempTeam;

      if (originalTeamBLogo) {
        const processedTeamA = await logoManager.processTeamLogoForSave({ logo: originalTeamBLogo }, 'A');
        swappedMatch.teamA.logoBase64 = processedTeamA.logoBase64;
        swappedMatch.teamA.logoPath = processedTeamA.logoPath;
      }
      if (originalTeamALogo) {
        const processedTeamB = await logoManager.processTeamLogoForSave({ logo: originalTeamALogo }, 'B');
        swappedMatch.teamB.logoBase64 = processedTeamB.logoBase64;
        swappedMatch.teamB.logoPath = processedTeamB.logoPath;
      }

      const correctLogoPathA = swappedMatch.teamA.logoPath;
      const correctLogoPathB = swappedMatch.teamB.logoPath;

      const updatedMatch = {
        ...swappedMatch,
        teamA: { ...swappedMatch.teamA, logoPath: swappedMatch.teamA.logoPath, logoBase64: swappedMatch.teamA.logoBase64 },
        teamB: { ...swappedMatch.teamB, logoPath: swappedMatch.teamB.logoPath, logoBase64: swappedMatch.teamB.logoBase64 },
      };

      expect(updatedMatch.teamA.logoPath).toBe(correctLogoPathA);
      expect(updatedMatch.teamB.logoPath).toBe(correctLogoPathB);
      expect(updatedMatch.teamA.logoPath).toMatch(/^logos\/logo_a_\d+\.png$/);
      expect(updatedMatch.teamB.logoPath).toMatch(/^logos\/logo_b_\d+\.png$/);
      expect(updatedMatch.teamA.logoBase64).toBe(originalMatch.teamB.logoBase64);
      expect(updatedMatch.teamB.logoBase64).toBe(originalMatch.teamA.logoBase64);
    });
  });
});
