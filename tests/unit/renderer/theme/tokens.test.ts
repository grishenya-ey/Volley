/**
 * Тесты для design tokens (theme/tokens)
 */
import { describe, it, expect } from 'vitest';
import { light, dark, space, radius, typography } from '../../../../src/renderer/theme/tokens';

describe('theme/tokens', () => {
  const lightKeys = [
    'background', 'surface', 'surfaceMuted', 'text', 'textSecondary',
    'primary', 'primaryHover', 'success', 'successHover', 'danger', 'dangerHover',
    'warning', 'neutral', 'neutralHover', 'accent', 'accentHover',
    'border', 'borderStrong', 'headerBg', 'disabled', 'overlay', 'primaryLight',
    'servingBorder', 'servingBadge',
  ];

  describe('light и dark', () => {
    it('экспортируются и содержат одни и те же ключи', () => {
      expect(Object.keys(light).sort()).toEqual(lightKeys.sort());
      expect(Object.keys(dark).sort()).toEqual(lightKeys.sort());
    });

    it('у каждого ключа в light и dark — непустая строка', () => {
      for (const key of lightKeys) {
        expect(typeof light[key as keyof typeof light]).toBe('string');
        expect((light[key as keyof typeof light] as string).length).toBeGreaterThan(0);
        expect(typeof dark[key as keyof typeof dark]).toBe('string');
        expect((dark[key as keyof typeof dark] as string).length).toBeGreaterThan(0);
      }
    });
  });

  describe('space', () => {
    it('содержит ожидаемые ключи', () => {
      expect(space).toHaveProperty('xs');
      expect(space).toHaveProperty('sm');
      expect(space).toHaveProperty('md');
      expect(space).toHaveProperty('lg');
      expect(space).toHaveProperty('xl');
    });

    it('значения — непустые строки', () => {
      Object.values(space).forEach((value) => {
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
      });
    });
  });

  describe('radius', () => {
    it('содержит ожидаемые ключи', () => {
      expect(radius).toHaveProperty('sm');
      expect(radius).toHaveProperty('md');
      expect(radius).toHaveProperty('lg');
    });

    it('значения — непустые строки', () => {
      Object.values(radius).forEach((value) => {
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
      });
    });
  });

  describe('typography', () => {
    it('содержит fontFamily и размеры', () => {
      expect(typography).toHaveProperty('fontFamily');
      expect(typography).toHaveProperty('h1');
      expect(typography).toHaveProperty('body');
    });
  });
});
