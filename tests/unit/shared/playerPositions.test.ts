/**
 * Тесты для playerPositions — позиции игроков (международный стандарт OH, MB, OPP, S, L).
 */

import { describe, test, expect } from 'vitest';
import {
  POSITION_ABBREVIATIONS,
  POSITION_OPTIONS,
  getPositionAbbreviation,
  migratePosition,
  migrateRosterPositions,
} from '../../../src/shared/playerPositions';

describe('playerPositions', () => {
  describe('POSITION_ABBREVIATIONS', () => {
    test('содержит все позиции международного стандарта', () => {
      expect(POSITION_ABBREVIATIONS).toEqual({
        'Доигровщик': 'OH',
        'Центральный блокирующий': 'MB',
        'Диагональный': 'OPP',
        'Связующий': 'S',
        'Либеро': 'L',
      });
    });
  });

  describe('POSITION_OPTIONS', () => {
    test('содержит опцию «Не указано» и все позиции с сокращениями', () => {
      expect(POSITION_OPTIONS[0]).toEqual({ value: '', label: '— Не указано —' });
      expect(POSITION_OPTIONS).toContainEqual({ value: 'Доигровщик', label: 'Доигровщик (OH)' });
      expect(POSITION_OPTIONS).toContainEqual({ value: 'Центральный блокирующий', label: 'Центральный блокирующий (MB)' });
      expect(POSITION_OPTIONS).toContainEqual({ value: 'Диагональный', label: 'Диагональный (OPP)' });
      expect(POSITION_OPTIONS).toContainEqual({ value: 'Связующий', label: 'Связующий (S)' });
      expect(POSITION_OPTIONS).toContainEqual({ value: 'Либеро', label: 'Либеро (L)' });
    });
  });

  describe('getPositionAbbreviation', () => {
    test('возвращает сокращение для каждой позиции', () => {
      expect(getPositionAbbreviation('Доигровщик')).toBe('OH');
      expect(getPositionAbbreviation('Центральный блокирующий')).toBe('MB');
      expect(getPositionAbbreviation('Диагональный')).toBe('OPP');
      expect(getPositionAbbreviation('Связующий')).toBe('S');
      expect(getPositionAbbreviation('Либеро')).toBe('L');
    });

    test('возвращает пустую строку для неизвестных позиций', () => {
      expect(getPositionAbbreviation('Нападающий')).toBe('');
      expect(getPositionAbbreviation('Неизвестная')).toBe('');
    });

    test('возвращает пустую строку для пустых/null значений', () => {
      expect(getPositionAbbreviation('')).toBe('');
      expect(getPositionAbbreviation(null as unknown as string)).toBe('');
      expect(getPositionAbbreviation(undefined as unknown as string)).toBe('');
      expect(getPositionAbbreviation('Не указано')).toBe('');
    });
  });

  describe('migratePosition', () => {
    test('мигрирует "Нападающий" в "Доигровщик"', () => {
      expect(migratePosition('Нападающий')).toBe('Доигровщик');
    });

    test('мигрирует "Другое" и "Не указано" в пустую строку', () => {
      expect(migratePosition('Другое')).toBe('');
      expect(migratePosition('Не указано')).toBe('');
    });

    test('возвращает пустую строку для null/undefined/""', () => {
      expect(migratePosition(null as unknown as string)).toBe('');
      expect(migratePosition(undefined as unknown as string)).toBe('');
      expect(migratePosition('')).toBe('');
    });

    test('оставляет валидные позиции без изменений', () => {
      expect(migratePosition('Доигровщик')).toBe('Доигровщик');
      expect(migratePosition('Связующий')).toBe('Связующий');
      expect(migratePosition('Либеро')).toBe('Либеро');
    });
  });

  describe('migrateRosterPositions', () => {
    test('мигрирует позиции всех игроков в ростре', () => {
      const roster = [
        { number: 1, name: 'Игрок 1', position: 'Нападающий', isStarter: true },
        { number: 2, name: 'Игрок 2', position: 'Не указано', isStarter: true },
        { number: 3, name: 'Игрок 3', position: 'Связующий', isStarter: false },
      ];
      const result = migrateRosterPositions(roster);
      expect(result[0].position).toBe('Доигровщик');
      expect(result[1].position).toBe('');
      expect(result[2].position).toBe('Связующий');
      expect(result[0].name).toBe('Игрок 1');
    });

    test('возвращает пустой массив для пустого ростра', () => {
      expect(migrateRosterPositions([])).toEqual([]);
    });

    test('возвращает roster без изменений для null/undefined', () => {
      expect(migrateRosterPositions(null)).toBe(null);
      expect(migrateRosterPositions(undefined)).toBe(undefined);
    });
  });
});
