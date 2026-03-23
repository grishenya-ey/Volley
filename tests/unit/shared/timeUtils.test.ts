/**
 * Тесты для утилит работы со временем партий
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDuration,
  formatDuration,
  toTimestamp,
  formatTimestamp,
} from '../../../src/shared/timeUtils';

describe('timeUtils', () => {
  describe('calculateDuration', () => {
    it('должна вычислять продолжительность в минутах', () => {
      const startTime = Date.now() - 61000;
      const endTime = Date.now();
      const duration = calculateDuration(startTime, endTime);
      expect(duration).toBe(1);
    });

    it('должна возвращать null если startTime отсутствует', () => {
      const endTime = Date.now();
      const duration = calculateDuration(null, endTime);
      expect(duration).toBeNull();
    });

    it('должна возвращать null если endTime отсутствует', () => {
      const startTime = Date.now();
      const duration = calculateDuration(startTime, null);
      expect(duration).toBeNull();
    });

    it('должна возвращать null если endTime раньше startTime', () => {
      const startTime = Date.now();
      const endTime = startTime - 60000;
      const duration = calculateDuration(startTime, endTime);
      expect(duration).toBeNull();
    });

    it('должна округлять продолжительность до ближайшей минуты', () => {
      const startTime = Date.now() - 90000;
      const endTime = Date.now();
      const duration = calculateDuration(startTime, endTime);
      expect(duration).toBe(2);
    });

    it('должна возвращать 0 для очень коротких партий', () => {
      const startTime = Date.now() - 15000;
      const endTime = Date.now();
      const duration = calculateDuration(startTime, endTime);
      expect(duration).toBe(0);
    });

    it('должна корректно вычислять продолжительность для длинных партий', () => {
      const startTime = Date.now() - 3600000;
      const endTime = Date.now();
      const duration = calculateDuration(startTime, endTime);
      expect(duration).toBe(60);
    });
  });

  describe('formatDuration', () => {
    it('должна форматировать продолжительность с апострофом', () => {
      expect(formatDuration(45)).toBe("45'");
    });

    it('должна возвращать пустую строку для null', () => {
      expect(formatDuration(null)).toBe('');
    });

    it('должна возвращать пустую строку для undefined', () => {
      expect(formatDuration(undefined)).toBe('');
    });

    it('должна возвращать пустую строку для NaN', () => {
      expect(formatDuration(NaN)).toBe('');
    });

    it('должна форматировать 0 минут', () => {
      expect(formatDuration(0)).toBe("0'");
    });

    it('должна форматировать большие значения', () => {
      expect(formatDuration(120)).toBe("120'");
    });
  });

  describe('toTimestamp', () => {
    it('должна возвращать число как есть, если это уже timestamp', () => {
      const timestamp = 1234567890;
      expect(toTimestamp(timestamp)).toBe(timestamp);
    });

    it('должна конвертировать Date в timestamp', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const expected = date.getTime();
      expect(toTimestamp(date)).toBe(expected);
    });

    it('должна конвертировать строку ISO в timestamp', () => {
      const dateString = '2024-01-01T12:00:00Z';
      const expected = new Date(dateString).getTime();
      expect(toTimestamp(dateString)).toBe(expected);
    });

    it('должна выбрасывать ошибку для некорректной строки', () => {
      expect(() => toTimestamp('некорректная дата')).toThrow('Некорректная дата');
    });

    it('должна выбрасывать ошибку для неподдерживаемого типа', () => {
      const invalidType = { some: 'object' };
      expect(() => toTimestamp(invalidType as unknown)).toThrow('Неподдерживаемый тип данных');
    });
  });

  describe('formatTimestamp', () => {
    it('должна форматировать timestamp в читаемую дату', () => {
      const timestamp = new Date('2024-01-15T14:30:00').getTime();
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}/);
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });

    it('должна возвращать пустую строку для null', () => {
      expect(formatTimestamp(null)).toBe('');
    });

    it('должна возвращать пустую строку для undefined', () => {
      expect(formatTimestamp(undefined)).toBe('');
    });

    it('должна возвращать пустую строку для 0', () => {
      expect(formatTimestamp(0)).toBe('');
    });

    it('должна использовать русскую локаль', () => {
      const timestamp = new Date('2024-12-25T15:45:00').getTime();
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
    });

    it('должна использовать указанный часовой пояс', () => {
      const timestamp = new Date('2024-01-15T12:00:00Z').getTime();
      const timezone = 'Europe/Moscow';
      const formatted = formatTimestamp(timestamp, timezone);
      expect(formatted).toMatch(/\d{2}:\d{2}/);
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
    });

    it('должна использовать системный часовой пояс, если timezone не указан', () => {
      const timestamp = new Date('2024-01-15T12:00:00').getTime();
      const formatted = formatTimestamp(timestamp);
      const formattedWithUndefined = formatTimestamp(timestamp, undefined);
      expect(formatted).toBe(formattedWithUndefined);
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
    });

    it('должна правильно форматировать время для разных часовых поясов', () => {
      const timestamp = new Date('2024-01-15T12:00:00Z').getTime();
      const formattedUTC = formatTimestamp(timestamp, 'UTC');
      const formattedMoscow = formatTimestamp(timestamp, 'Europe/Moscow');
      const formattedNY = formatTimestamp(timestamp, 'America/New_York');
      expect(formattedUTC).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
      expect(formattedMoscow).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
      expect(formattedNY).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
      expect(formattedUTC).not.toBe(formattedMoscow);
      expect(formattedUTC).not.toBe(formattedNY);
    });
  });
});
