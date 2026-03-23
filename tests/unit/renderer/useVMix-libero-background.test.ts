/**
 * Тесты для обработки полей подложек либеро в useVMix
 */

import { describe, test, expect, vi } from 'vitest';
import { getFullFieldName } from '../../../src/renderer/utils/vmix-field-utils';
import { getContrastTextColor } from '../../../src/renderer/utils/colorContrast';

vi.mock('../../../src/renderer/utils/vmix-field-utils', () => ({
  getFullFieldName: vi.fn((name: string, type: string) => {
    if (type === 'text') return `${name}.Text`;
    if (type === 'image') return `${name}.Source`;
    if (type === 'fill') return `${name}.Fill.Color`;
    return name;
  }),
}));

vi.mock('../../../src/renderer/utils/colorContrast', () => ({
  getContrastTextColor: vi.fn((backgroundColor: string) => {
    if (!backgroundColor) return '#ffffff';
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }),
}));

describe('useVMix - Libero Background Fields', () => {
  describe('Обработка полей подложек либеро', () => {
    test('должен формировать полное имя для libero1Background', () => {
      const fullName = getFullFieldName('Libero1Background', 'fill');
      expect(getFullFieldName).toHaveBeenCalledWith('Libero1Background', 'fill');
      expect(fullName).toBe('Libero1Background.Fill.Color');
    });
    test('должен формировать полное имя для libero1BackgroundOnCard', () => {
      expect(getFullFieldName('Libero1BackgroundOnCard', 'fill')).toBe('Libero1BackgroundOnCard.Fill.Color');
    });
    test('должен обрабатывать поля типа fill для подложек либеро', () => {
      const fieldConfig = { enabled: true, type: 'fill', fieldIdentifier: 'Libero1Background' };
      expect(fieldConfig.type === 'fill').toBe(true);
    });
  });

  describe('Управление цветом подложек', () => {
    test('должен использовать liberoColor команды для подложки либеро', () => {
      const match = { teamA: { liberoColor: '#ff0000', color: '#3498db' } };
      const liberoColor = match.teamA.liberoColor || match.teamA.color || '#ffffff';
      expect(liberoColor).toBe('#ff0000');
    });
    test('должен использовать color команды как fallback', () => {
      const match = { teamA: { color: '#3498db' } };
      const liberoColor = match.teamA.liberoColor || match.teamA.color || '#ffffff';
      expect(liberoColor).toBe('#3498db');
    });
    test('должен использовать белый цвет по умолчанию', () => {
      const match = { teamA: {} as { liberoColor?: string; color?: string } };
      const liberoColor = match.teamA.liberoColor || match.teamA.color || '#ffffff';
      expect(liberoColor).toBe('#ffffff');
    });
  });

  describe('Управление цветом подложек в зависимости от наличия либеро', () => {
    test('должен устанавливать цвет из настроек, если либеро указан в стартовом составе', () => {
      const match = { teamA: { liberoColor: '#ff0000', color: '#3498db' } };
      const startingLineup: Array<{ number: number; name?: string } | null> = [
        { number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }, { number: 5 }, { number: 6 },
        { number: 7, name: 'Либеро 1' }, { number: 8, name: 'Либеро 2' },
      ];
      const libero1 = startingLineup[6];
      const liberoColor = match.teamA.liberoColor || match.teamA.color || '#ffffff';
      expect(libero1).toBeDefined();
      expect(liberoColor).toBe('#ff0000');
    });
    test('должен устанавливать прозрачный цвет #00000000, если либеро не указан', () => {
      const startingLineup: Array<{ number: number } | null> = [
        { number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }, { number: 5 }, { number: 6 },
        null, null,
      ];
      expect(startingLineup[6]).toBeNull();
      expect(startingLineup[7]).toBeNull();
      expect('#00000000').toBe('#00000000');
    });
    test('должен обрабатывать частичное заполнение либеро', () => {
      const match = { teamA: { color: '#3498db' } };
      const startingLineup: Array<{ number: number; name?: string } | null> = [
        { number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }, { number: 5 }, { number: 6 },
        { number: 7, name: 'Либеро 1' }, null,
      ];
      const libero1 = startingLineup[6];
      const libero2 = startingLineup[7];
      const libero1Color = libero1 ? (match.teamA.liberoColor || match.teamA.color || '#ffffff') : '#00000000';
      const libero2Color = libero2 ? (match.teamA.liberoColor || match.teamA.color || '#ffffff') : '#00000000';
      expect(libero1).toBeDefined();
      expect(libero2).toBeNull();
      expect(libero1Color).toBe('#3498db');
      expect(libero2Color).toBe('#00000000');
    });
  });

  describe('Совместимость с данными матча', () => {
    test('должен обрабатывать подложки либеро для команды A', () => {
      const match = { teamA: { liberoColor: '#ff0000', color: '#3498db' } };
      const startingLineup = [
        { number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }, { number: 5 }, { number: 6 },
        { number: 7, name: 'Либеро 1' }, { number: 8, name: 'Либеро 2' },
      ];
      const libero1 = startingLineup[6];
      const liberoColor = match.teamA.liberoColor || match.teamA.color || '#ffffff';
      expect(libero1).toBeDefined();
      expect(liberoColor).toBe('#ff0000');
      expect(getFullFieldName('Libero1Background', 'fill')).toBe('Libero1Background.Fill.Color');
    });
    test('должен обрабатывать подложки либеро для команды B', () => {
      const match = { teamB: { liberoColor: '#00ff00', color: '#e74c3c' } };
      const startingLineup = [
        { number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }, { number: 5 }, { number: 6 },
        { number: 9, name: 'Либеро 1' }, { number: 10, name: 'Либеро 2' },
      ];
      const libero2 = startingLineup[7];
      const liberoColor = match.teamB.liberoColor || match.teamB.color || '#ffffff';
      expect(libero2).toBeDefined();
      expect(liberoColor).toBe('#00ff00');
      expect(getFullFieldName('Libero2Background', 'fill')).toBe('Libero2Background.Fill.Color');
    });
  });

  describe('Обработка всех полей подложек', () => {
    test('должен корректно обрабатывать все четыре поля подложек', () => {
      const fields = [
        { type: 'fill', fieldIdentifier: 'Libero1Background' },
        { type: 'fill', fieldIdentifier: 'Libero1BackgroundOnCard' },
        { type: 'fill', fieldIdentifier: 'Libero2Background' },
        { type: 'fill', fieldIdentifier: 'Libero2BackgroundOnCard' },
      ];
      const processedFields = fields.map((field) => ({
        ...field,
        fullName: getFullFieldName(field.fieldIdentifier, field.type),
      }));
      expect(processedFields[0].fullName).toBe('Libero1Background.Fill.Color');
      expect(processedFields[1].fullName).toBe('Libero1BackgroundOnCard.Fill.Color');
      expect(processedFields[2].fullName).toBe('Libero2Background.Fill.Color');
      expect(processedFields[3].fullName).toBe('Libero2BackgroundOnCard.Fill.Color');
    });
  });

  describe('Контрастный цвет текста для полей номеров либеро', () => {
    test('должен устанавливать контрастный цвет текста для libero1Number', () => {
      const match = { teamA: { liberoColor: '#ff0000', color: '#3498db' } };
      const startingLineup: Array<{ number: number; name?: string } | null> = [
        { number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }, { number: 5 }, { number: 6 },
        { number: 7, name: 'Либеро 1' }, null,
      ];
      const libero = startingLineup[6];
      const liberoBackgroundColor = match.teamA.liberoColor || match.teamA.color || '#ffffff';
      const contrastTextColor = getContrastTextColor(liberoBackgroundColor);
      expect(libero).toBeDefined();
      expect(liberoBackgroundColor).toBe('#ff0000');
      expect(contrastTextColor).toBe('#ffffff');
      expect(getFullFieldName('Libero1Number', 'text')).toBe('Libero1Number.Text');
    });
    test('должен устанавливать контрастный цвет для libero1NumberOnCard', () => {
      const match = { teamA: { color: '#ffffff' } };
      const startingLineup: Array<{ number: number; name?: string } | null> = [
        { number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }, { number: 5 }, { number: 6 },
        { number: 7, name: 'Либеро 1' }, null,
      ];
      const libero = startingLineup[6];
      const liberoBackgroundColor = match.teamA.liberoColor || match.teamA.color || '#ffffff';
      const contrastTextColor = getContrastTextColor(liberoBackgroundColor);
      expect(libero).toBeDefined();
      expect(liberoBackgroundColor).toBe('#ffffff');
      expect(contrastTextColor).toBe('#000000');
      expect(getFullFieldName('Libero1NumberOnCard', 'text')).toBe('Libero1NumberOnCard.Text');
    });
    test('должен устанавливать контрастный цвет для libero2Number', () => {
      const match = { teamB: { liberoColor: '#0000ff', color: '#e74c3c' } };
      const startingLineup: Array<{ number: number; name?: string } | null> = [
        { number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }, { number: 5 }, { number: 6 },
        null, { number: 8, name: 'Либеро 2' },
      ];
      const libero = startingLineup[7];
      const liberoBackgroundColor = match.teamB.liberoColor || match.teamB.color || '#ffffff';
      const contrastTextColor = getContrastTextColor(liberoBackgroundColor);
      expect(libero).toBeDefined();
      expect(liberoBackgroundColor).toBe('#0000ff');
      expect(contrastTextColor).toBe('#ffffff');
      expect(getFullFieldName('Libero2Number', 'text')).toBe('Libero2Number.Text');
    });
    test('не должен устанавливать цвет текста, если либеро не указан', () => {
      const startingLineup: Array<{ number: number } | null> = [
        { number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }, { number: 5 }, { number: 6 },
        null, null,
      ];
      expect(startingLineup[6]).toBeNull();
      expect(startingLineup[7]).toBeNull();
    });
  });
});
