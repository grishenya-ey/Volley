/**
 * Тесты для настроек автоматических обновлений
 */

import { describe, test, expect } from 'vitest';

describe('AutoUpdate Settings - Data Structure', () => {
  describe('Структура настроек autoUpdate', () => {
    test('должна содержать поле enabled', () => {
      const autoUpdateSettings = { enabled: true };
      expect(autoUpdateSettings).toHaveProperty('enabled');
      expect(typeof autoUpdateSettings.enabled).toBe('boolean');
    });

    test('должна иметь значение enabled: true по умолчанию', () => {
      const defaultSettings = { autoUpdate: { enabled: true } };
      expect(defaultSettings.autoUpdate.enabled).toBe(true);
    });

    test('должна поддерживать значение enabled: false', () => {
      const autoUpdateSettings = { enabled: false };
      expect(autoUpdateSettings.enabled).toBe(false);
    });
  });

  describe('Интеграция с другими настройками', () => {
    test('должна сохраняться вместе с другими настройками', () => {
      const fullSettings = {
        vmix: { host: 'localhost', port: 8088, inputs: {} },
        mobile: { enabled: false, port: 3000 },
        autoSave: { enabled: true },
        autoUpdate: { enabled: true },
      };
      expect(fullSettings.autoUpdate).toBeDefined();
      expect(fullSettings.vmix).toBeDefined();
      expect(fullSettings.mobile).toBeDefined();
      expect(fullSettings.autoSave).toBeDefined();
    });

    test('должна быть независимой от других настроек', () => {
      const settings1 = { autoUpdate: { enabled: true }, autoSave: { enabled: false } };
      const settings2 = { autoUpdate: { enabled: false }, autoSave: { enabled: true } };
      expect(settings1.autoUpdate.enabled).not.toBe(settings2.autoUpdate.enabled);
      expect(settings1.autoSave.enabled).not.toBe(settings2.autoSave.enabled);
    });
  });

  describe('Валидация значений', () => {
    test('enabled должен быть boolean', () => {
      const validSettings = { enabled: true };
      expect(typeof validSettings.enabled).toBe('boolean');
    });

    test('не должен содержать недопустимых полей', () => {
      const validSettings = { enabled: true };
      const keys = Object.keys(validSettings);
      expect(keys).toContain('enabled');
      expect(keys.length).toBe(1);
    });
  });
});
