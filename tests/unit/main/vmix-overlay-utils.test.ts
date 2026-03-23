/**
 * Тесты для vmix-overlay-utils: resolveLogoUrlsInImageFields и findInputConfig.
 */

import { describe, test, expect } from 'vitest';
import {
  resolveLogoUrlsInImageFields,
  findInputConfig,
} from '../../../src/main/vmix-overlay-utils.ts';

describe('vmix-overlay-utils', () => {
  describe('resolveLogoUrlsInImageFields', () => {
    test('преобразует logos/ в полный URL с baseUrl', () => {
      const imageFields = { TeamALogo: 'logos/logo_a_123.png' };
      const baseUrl = 'http://192.168.1.1:3000';
      const result = resolveLogoUrlsInImageFields(imageFields, baseUrl);
      expect(result.TeamALogo).toBe('http://192.168.1.1:3000/logos/logo_a_123.png');
    });

    test('убирает trailing slash у baseUrl перед добавлением /logos/', () => {
      const imageFields = { Logo: 'logos/logo.png' };
      const result = resolveLogoUrlsInImageFields(imageFields, 'http://host:3000/');
      expect(result.Logo).toBe('http://host:3000/logos/logo.png');
    });

    test('кодирует имя файла через encodeURIComponent', () => {
      const imageFields = { Logo: 'logos/logo with spaces.png' };
      const result = resolveLogoUrlsInImageFields(imageFields, 'http://host:3000');
      expect(result.Logo).toBe('http://host:3000/logos/logo%20with%20spaces.png');
    });

    test('оставляет значения без префикса logos/ без изменений', () => {
      const imageFields = {
        TeamALogo: 'logos/logo_a.png',
        ExternalUrl: 'https://example.com/image.png',
      };
      const result = resolveLogoUrlsInImageFields(imageFields, 'http://host:3000');
      expect(result.TeamALogo).toBe('http://host:3000/logos/logo_a.png');
      expect(result.ExternalUrl).toBe('https://example.com/image.png');
    });

    test('возвращает imageFields без изменений при baseUrl null', () => {
      const imageFields = { Logo: 'logos/logo.png' };
      const result = resolveLogoUrlsInImageFields(imageFields, null);
      expect(result).toEqual(imageFields);
    });

    test('возвращает пустой объект при невалидном imageFields (null/undefined)', () => {
      const baseUrl = 'http://host';
      const r1 = resolveLogoUrlsInImageFields(null as unknown as Record<string, string>, baseUrl);
      const r2 = resolveLogoUrlsInImageFields(undefined as unknown as Record<string, string>, baseUrl);
      expect(r1).toEqual({});
      expect(r2).toEqual({});
    });

    test('обрабатывает пустую строку и trim', () => {
      const imageFields = { Logo: '  logos/logo.png  ' };
      const result = resolveLogoUrlsInImageFields(imageFields, 'http://host');
      expect(result.Logo).toBe('http://host/logos/logo.png');
    });
  });

  describe('findInputConfig', () => {
    test('находит конфиг по ключу (id из inputOrder)', () => {
      const config = {
        inputs: {
          'input-uuid-1': { vmixTitle: 'Title 1', enabled: true },
          'input-uuid-2': { vmixTitle: 'Title 2', enabled: true },
        },
      };
      const { inputConfig, resolvedKey } = findInputConfig(config, 'input-uuid-1');
      expect(inputConfig).toEqual({ vmixTitle: 'Title 1', enabled: true });
      expect(resolvedKey).toBe('input-uuid-1');
    });

    test('находит конфиг по vmixTitle когда передан не ключ', () => {
      const config = {
        inputs: {
          'input-uuid-1': { vmixTitle: 'Scoreboard', enabled: true },
        },
      };
      const { inputConfig, resolvedKey } = findInputConfig(config, 'Scoreboard');
      expect(inputConfig).toEqual({ vmixTitle: 'Scoreboard', enabled: true });
      expect(resolvedKey).toBe('input-uuid-1');
    });

    test('находит конфиг по vmixNumber (когда vmixTitle не задан или поиск по номеру)', () => {
      const config = {
        inputs: {
          ref1: { vmixNumber: '2', enabled: true },
        },
      };
      const { inputConfig, resolvedKey } = findInputConfig(config, '2');
      expect(inputConfig).toEqual({ vmixNumber: '2', enabled: true });
      expect(resolvedKey).toBe('ref1');
    });

    test('trim ключа при поиске по vmixTitle/vmixNumber', () => {
      const config = {
        inputs: {
          id1: { vmixTitle: ' Scoreboard ', enabled: true },
        },
      };
      const { inputConfig } = findInputConfig(config, '  Scoreboard  ');
      expect(inputConfig).toBeDefined();
      expect((inputConfig as { vmixTitle?: string }).vmixTitle).toBe(' Scoreboard ');
    });

    test('возвращает undefined когда инпут не найден', () => {
      const config = { inputs: { id1: { vmixTitle: 'A' } } };
      const { inputConfig, resolvedKey } = findInputConfig(config, 'NonExistent');
      expect(inputConfig).toBeUndefined();
      expect(resolvedKey).toBeUndefined();
    });

    test('игнорирует не-объекты в inputs', () => {
      const config = {
        inputs: {
          id1: null,
          id2: 'string',
          id3: { vmixTitle: 'Valid' },
        },
      };
      const { inputConfig, resolvedKey } = findInputConfig(config, 'Valid');
      expect(inputConfig).toEqual({ vmixTitle: 'Valid' });
      expect(resolvedKey).toBe('id3');
    });
  });
});
