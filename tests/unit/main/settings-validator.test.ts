/**
 * Тесты для валидатора настроек
 * TDD подход: сначала тесты (Red), затем реализация (Green)
 */

import { describe, test, expect } from 'vitest';
import {
  validateSettings,
  validateVMixSettings,
  validateMobileSettings,
  validateAutoSaveSettings,
  validateAutoUpdateSettings,
  validateVMixInput,
} from '../../../src/main/utils/settingsValidator.ts';

describe('settingsValidator', () => {
  describe('validateSettings', () => {
    test('должна проверять структуру настроек', () => {
      const result = validateSettings(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Настройки должны быть объектом');
    });

    test('должна проверять типы данных', () => {
      const result = validateSettings({
        vmix: 'invalid',
        mobile: 123,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('должна проверять обязательные поля', () => {
      const result = validateSettings({
        vmix: {
          host: '', // Пустая строка - ошибка
          port: 8088,
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('host'))).toBe(true);
    });

    test('должна возвращать список ошибок', () => {
      const result = validateSettings({
        vmix: {
          host: '',
          port: 70000, // Некорректный порт
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('должна валидировать секцию vmix', () => {
      const result = validateSettings({
        vmix: {
          host: 'localhost',
          port: 8088,
          inputs: {},
        },
      });
      expect(result.valid).toBe(true);
    });

    test('должна валидировать секцию mobile', () => {
      const result = validateSettings({
        mobile: {
          enabled: false,
          port: 3000,
          sessionId: null,
          selectedIP: null,
        },
      });
      expect(result.valid).toBe(true);
    });

    test('должна валидировать секцию autoSave', () => {
      const result = validateSettings({
        autoSave: {
          enabled: true,
        },
      });
      expect(result.valid).toBe(true);
    });

    test('должна валидировать секцию autoUpdate', () => {
      const result = validateSettings({
        autoUpdate: {
          enabled: true,
        },
      });
      expect(result.valid).toBe(true);
    });

    test('должна валидировать структуру полей (fields) в динамических инпутах', () => {
      const result = validateSettings({
        vmix: {
          host: 'localhost',
          port: 8088,
          inputs: {
            'uuid-1': {
              enabled: true,
              displayName: 'SCORE',
              vmixTitle: 'SCORE',
              overlay: 1,
              fields: {
                'Count_Team1.Text': {
                  vmixFieldType: 'text',
                  dataMapKey: 'currentSet.scoreA',
                },
              },
            },
          },
        },
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять типы полей (text, color, image) в динамических инпутах', () => {
      const validResult = validateSettings({
        vmix: {
          host: 'localhost',
          port: 8088,
          inputs: {
            'uuid-1': {
              enabled: true,
              displayName: 'SCORE',
              vmixTitle: 'SCORE',
              overlay: 1,
              fields: {
                textField: { vmixFieldType: 'text', dataMapKey: 'teamA.name' },
                colorField: { vmixFieldType: 'color', dataMapKey: 'teamA.color' },
                imageField: { vmixFieldType: 'image', dataMapKey: 'teamA.logoPath' },
              },
            },
          },
        },
      });
      expect(validResult.valid).toBe(true);

      const invalidResult = validateSettings({
        vmix: {
          host: 'localhost',
          port: 8088,
          inputs: {
            'uuid-1': {
              enabled: true,
              displayName: 'SCORE',
              vmixTitle: 'SCORE',
              overlay: 1,
              fields: {
                invalid: { vmixFieldType: 'invalid_type', dataMapKey: 'x' },
              },
            },
          },
        },
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.some(e => e.includes('vmixFieldType'))).toBe(true);
    });
  });

  describe('validateVMixSettings', () => {
    test('должна валидировать корректные настройки vMix', () => {
      const result = validateVMixSettings({
        host: 'localhost',
        port: 8088,
        inputs: {},
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять host (непустая строка)', () => {
      const result1 = validateVMixSettings({
        host: '',
        port: 8088,
        inputs: {},
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('host'))).toBe(true);

      const result2 = validateVMixSettings({
        host: 'localhost',
        port: 8088,
        inputs: {},
      });
      expect(result2.valid).toBe(true);
    });

    test('должна проверять port (1-65535)', () => {
      const result1 = validateVMixSettings({
        host: 'localhost',
        port: 0,
        inputs: {},
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('port'))).toBe(true);

      const result2 = validateVMixSettings({
        host: 'localhost',
        port: 70000,
        inputs: {},
      });
      expect(result2.valid).toBe(false);
      expect(result2.errors.some(e => e.includes('port'))).toBe(true);

      const result3 = validateVMixSettings({
        host: 'localhost',
        port: 8088,
        inputs: {},
      });
      expect(result3.valid).toBe(true);
    });

    test('должна валидировать динамические инпуты', () => {
      const result = validateVMixSettings({
        host: 'localhost',
        port: 8088,
        inputs: {
          'uuid-1': {
            enabled: true,
            displayName: 'SCORE',
            vmixTitle: 'SCORE',
            overlay: 1,
            fields: {},
          },
        },
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateVMixInput', () => {
    test('должна валидировать корректный динамический инпут', () => {
      const result = validateVMixInput('uuid-1', {
        enabled: true,
        displayName: 'SCORE',
        vmixTitle: 'SCORE',
        overlay: 1,
        fields: {},
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять enabled (boolean)', () => {
      const result = validateVMixInput('uuid-1', {
        enabled: 'true', // Не boolean
        displayName: 'SCORE',
        vmixTitle: 'SCORE',
        overlay: 1,
        fields: {},
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
    });

    test('должна проверять displayName (непустая строка)', () => {
      const result = validateVMixInput('uuid-1', {
        enabled: true,
        displayName: '',
        vmixTitle: 'SCORE',
        overlay: 1,
        fields: {},
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('displayName'))).toBe(true);
    });

    test('должна проверять vmixTitle (непустая строка)', () => {
      const result = validateVMixInput('uuid-1', {
        enabled: true,
        displayName: 'SCORE',
        vmixTitle: '',
        overlay: 1,
        fields: {},
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('vmixTitle'))).toBe(true);
    });

    test('должна проверять overlay (число >= 1)', () => {
      const result1 = validateVMixInput('uuid-1', {
        enabled: true,
        displayName: 'SCORE',
        vmixTitle: 'SCORE',
        overlay: 0,
        fields: {},
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('overlay'))).toBe(true);

      const result2 = validateVMixInput('uuid-1', {
        enabled: true,
        displayName: 'SCORE',
        vmixTitle: 'SCORE',
        overlay: 1,
        fields: {},
      });
      expect(result2.valid).toBe(true);
    });

    test('должна валидировать fields с vmixFieldType', () => {
      const result = validateVMixInput('uuid-1', {
        enabled: true,
        displayName: 'SCORE',
        vmixTitle: 'SCORE',
        overlay: 1,
        fields: {
          'Count_Team1.Text': {
            vmixFieldType: 'text',
            dataMapKey: 'currentSet.scoreA',
          },
          'Color_Team1.Fill.Color': {
            vmixFieldType: 'color',
            dataMapKey: 'teamA.color',
          },
        },
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateMobileSettings', () => {
    test('должна валидировать корректные настройки mobile', () => {
      const result = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять enabled (boolean)', () => {
      const result = validateMobileSettings({
        enabled: 'false',
        port: 3000,
        sessionId: null,
        selectedIP: null,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
    });

    test('должна проверять port (1-65535, если enabled)', () => {
      const result1 = validateMobileSettings({
        enabled: true,
        port: 0,
        sessionId: null,
        selectedIP: null,
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('port'))).toBe(true);

      const result2 = validateMobileSettings({
        enabled: true,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      });
      expect(result2.valid).toBe(true);
    });

    test('должна проверять sessionId (string | null)', () => {
      const result1 = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: 123, // Не string и не null
        selectedIP: null,
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('sessionId'))).toBe(true);

      const result2 = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: 'test-session',
        selectedIP: null,
      });
      expect(result2.valid).toBe(true);

      const result3 = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: null,
      });
      expect(result3.valid).toBe(true);
    });

    test('должна проверять selectedIP (string | null)', () => {
      const result1 = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: 123, // Не string и не null
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('selectedIP'))).toBe(true);

      const result2 = validateMobileSettings({
        enabled: false,
        port: 3000,
        sessionId: null,
        selectedIP: '192.168.1.1',
      });
      expect(result2.valid).toBe(true);
    });
  });

  describe('validateAutoSaveSettings', () => {
    test('должна валидировать корректные настройки autoSave', () => {
      const result = validateAutoSaveSettings({
        enabled: true,
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять enabled (boolean)', () => {
      const result = validateAutoSaveSettings({
        enabled: 'true',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
    });
  });

  describe('validateAutoUpdateSettings', () => {
    test('должна валидировать корректные настройки autoUpdate', () => {
      const result = validateAutoUpdateSettings({
        enabled: true,
      });
      expect(result.valid).toBe(true);
    });

    test('должна проверять enabled (boolean)', () => {
      const result = validateAutoUpdateSettings({
        enabled: 'true',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
    });
  });
});
