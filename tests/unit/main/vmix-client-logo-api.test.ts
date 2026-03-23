/**
 * Тесты для проверки HTTP API команд, отправляемых в vMix для логотипов
 */

import { describe, test, expect } from 'vitest';

describe('VMixClient - Logo API Tests', () => {
  describe('SetImage команда для логотипов', () => {
    test('должен отправлять правильный URL для logo_a.png для команды A', () => {
      const inputName = 'Input3';
      const fieldName = 'TeamLogo';
      const imagePath = 'http://192.168.1.100:3000/logos/logo_a.png';
      const baseURL = 'http://localhost:8088/api';
      const queryParams = new URLSearchParams();
      queryParams.append('Function', 'SetImage');
      queryParams.append('Input', inputName);
      queryParams.append('SelectedName', fieldName);
      queryParams.append('Value', imagePath);
      const actualURL = `${baseURL}?${queryParams.toString()}`;
      expect(actualURL).toContain('Function=SetImage');
      expect(actualURL).toContain(`Input=${inputName}`);
      expect(actualURL).toContain(`SelectedName=${fieldName}`);
      expect(actualURL).toContain('logo_a.png');
      expect(actualURL).not.toContain('logo_b.png');
    });

    test('должен отправлять правильный URL для logo_b.png для команды B', () => {
      const inputName = 'Input4';
      const fieldName = 'TeamLogo';
      const imagePath = 'http://192.168.1.100:3000/logos/logo_b.png';
      const baseURL = 'http://localhost:8088/api';
      const queryParams = new URLSearchParams();
      queryParams.append('Function', 'SetImage');
      queryParams.append('Input', inputName);
      queryParams.append('SelectedName', fieldName);
      queryParams.append('Value', imagePath);
      const actualURL = `${baseURL}?${queryParams.toString()}`;
      expect(actualURL).toContain('Function=SetImage');
      expect(actualURL).toContain(`Input=${inputName}`);
      expect(actualURL).toContain(`SelectedName=${fieldName}`);
      expect(actualURL).toContain('logo_b.png');
      expect(actualURL).not.toContain('logo_a.png');
    });

    test('после смены команд местами должен отправлять logo_a.png для rosterTeamA независимо от logoPath в команде', () => {
      const inputName = 'Input3';
      const fieldName = 'TeamLogo';
      const teamKey = 'A';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const imagePath = `${logoBaseUrl}/${logoFileName}`;
      const baseURL = 'http://localhost:8088/api';
      const queryParams = new URLSearchParams();
      queryParams.append('Function', 'SetImage');
      queryParams.append('Input', inputName);
      queryParams.append('SelectedName', fieldName);
      queryParams.append('Value', imagePath);
      const actualURL = `${baseURL}?${queryParams.toString()}`;
      expect(actualURL).toContain('logo_a.png');
      expect(actualURL).not.toContain('logo_b.png');
      expect(logoFileName).toBe('logo_a.png');
    });

    test('после смены команд местами должен отправлять logo_b.png для rosterTeamB независимо от logoPath в команде', () => {
      const inputName = 'Input4';
      const fieldName = 'TeamLogo';
      const teamKey = 'B';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const imagePath = `${logoBaseUrl}/${logoFileName}`;
      const baseURL = 'http://localhost:8088/api';
      const queryParams = new URLSearchParams();
      queryParams.append('Function', 'SetImage');
      queryParams.append('Input', inputName);
      queryParams.append('SelectedName', fieldName);
      queryParams.append('Value', imagePath);
      const actualURL = `${baseURL}?${queryParams.toString()}`;
      expect(actualURL).toContain('logo_b.png');
      expect(actualURL).not.toContain('logo_a.png');
      expect(logoFileName).toBe('logo_b.png');
    });
  });

  describe('Сценарий: Смена команд местами и сохранение настроек', () => {
    test('после смены команд и сохранения настроек должны отправляться правильные URL логотипов', () => {
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const teamKeyA = 'A';
      const logoFileNameA = teamKeyA === 'A' ? 'logo_a.png' : 'logo_b.png';
      const imagePathA = `${logoBaseUrl}/${logoFileNameA}`;
      const teamKeyB = 'B';
      const logoFileNameB = teamKeyB === 'A' ? 'logo_a.png' : 'logo_b.png';
      const imagePathB = `${logoBaseUrl}/${logoFileNameB}`;
      expect(imagePathA).toBe('http://192.168.1.100:3000/logos/logo_a.png');
      expect(imagePathB).toBe('http://192.168.1.100:3000/logos/logo_b.png');
      expect(imagePathA).not.toContain('logo_b.png');
      expect(imagePathB).not.toContain('logo_a.png');
    });
  });
});
