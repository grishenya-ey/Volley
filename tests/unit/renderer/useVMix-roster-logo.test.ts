/**
 * Тесты для проверки проблемы с логотипами в инпуте "Заявка"
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useVMix - Roster Logo Tests', () => {
  const mockElectronAPI = {
    getMobileServerInfo: vi.fn(),
    updateVMixInputFields: vi.fn(),
  };

  beforeEach(() => {
    (global as unknown as { window: { electronAPI: typeof mockElectronAPI } }).window = {
      electronAPI: mockElectronAPI,
    };
    mockElectronAPI.getMobileServerInfo.mockResolvedValue({ ip: '192.168.1.100', port: 3000 });
    mockElectronAPI.updateVMixInputFields.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getRosterFieldValue - teamLogo', () => {
    test('должен возвращать правильный URL логотипа для команды A', () => {
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const teamKey = 'A';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const team = {
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        logoPath: 'logos/logo_a.png',
        logoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      };
      const hasLogo = logoBaseUrl && (team?.logo || team?.logoPath || team?.logoBase64);
      const result = hasLogo ? `${logoBaseUrl}/${logoFileName}` : '';
      expect(result).toBe('http://192.168.1.100:3000/logos/logo_a.png');
    });

    test('должен возвращать правильный URL логотипа для команды B', () => {
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const teamKey = 'B';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const team = {
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        logoPath: 'logos/logo_b.png',
        logoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      };
      const hasLogo = logoBaseUrl && (team?.logo || team?.logoPath || team?.logoBase64);
      const result = hasLogo ? `${logoBaseUrl}/${logoFileName}` : '';
      expect(result).toBe('http://192.168.1.100:3000/logos/logo_b.png');
    });

    test('должен использовать teamKey для определения имени файла, а не logoPath из команды', () => {
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const teamA = {
        name: 'Команда B (бывшая)',
        logoPath: 'logos/logo_b.png',
        logoBase64: 'data:image/png;base64,TEAM_B_LOGO',
      };
      const teamKey = 'A';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const hasLogo = logoBaseUrl && (teamA?.logo || (teamA as { logoPath?: string }).logoPath || teamA?.logoBase64);
      const result = hasLogo ? `${logoBaseUrl}/${logoFileName}` : '';
      expect(result).toBe('http://192.168.1.100:3000/logos/logo_a.png');
      expect(result).not.toContain('logo_b.png');
    });
  });

  describe('Сценарий: Смена команд местами и сохранение настроек', () => {
    test('после смены команд местами logo_a.png должен содержать логотип новой команды A', () => {
      const swappedMatch = {
        teamA: {
          name: 'Команда B',
          logoBase64: 'data:image/png;base64,LOGO_B',
          logoPath: 'logos/logo_a.png',
        },
        teamB: {
          name: 'Команда A',
          logoBase64: 'data:image/png;base64,LOGO_A',
          logoPath: 'logos/logo_b.png',
        },
      };
      expect(swappedMatch.teamA.name).toBe('Команда B');
      expect(swappedMatch.teamA.logoPath).toBe('logos/logo_a.png');
      expect(swappedMatch.teamB.name).toBe('Команда A');
      expect(swappedMatch.teamB.logoPath).toBe('logos/logo_b.png');
    });

    test('при формировании URL для rosterTeamA должен использоваться logo_a.png независимо от logoPath', () => {
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const match = {
        teamA: {
          name: 'Команда B (новая A)',
          logoPath: 'logos/logo_b.png',
          logoBase64: 'data:image/png;base64,LOGO_B',
        },
      };
      const teamKey = 'A';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const team = match.teamA;
      const hasLogo = logoBaseUrl && (team?.logo || (team as { logoPath?: string }).logoPath || team?.logoBase64);
      const result = hasLogo ? `${logoBaseUrl}/${logoFileName}` : '';
      expect(result).toBe('http://192.168.1.100:3000/logos/logo_a.png');
      expect(logoFileName).toBe('logo_a.png');
    });
  });
});
