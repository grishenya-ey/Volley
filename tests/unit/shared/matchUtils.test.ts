/**
 * Тесты для модуля matchUtils
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import { createNewMatch, validateMatch, generateUUID } from '../../../src/shared/matchUtils';
import type { Match } from '../../../src/shared/types/Match';

describe('matchUtils', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('createNewMatch', () => {
    test('должен создавать новый матч с правильной структурой', () => {
      const match = createNewMatch();
      expect(match).toBeDefined();
      expect(match.matchId).toBeDefined();
      expect(typeof match.matchId).toBe('string');
      expect(match.matchId.length).toBeGreaterThan(0);
    });

    test('должен создавать матч с командами по умолчанию', () => {
      const match = createNewMatch();
      expect(match.teamA).toBeDefined();
      expect(match.teamA.name).toBe('Команда А');
      expect(match.teamA.color).toBe('#3498db');
      expect(match.teamA.roster).toEqual([]);
      expect(match.teamB).toBeDefined();
      expect(match.teamB.name).toBe('Команда Б');
      expect(match.teamB.color).toBe('#e74c3c');
      expect(match.teamB.roster).toEqual([]);
    });

    test('должен создавать матч с текущей партией', () => {
      const match = createNewMatch();
      expect(match.currentSet).toBeDefined();
      expect(match.currentSet.setNumber).toBe(1);
      expect(match.currentSet.scoreA).toBe(0);
      expect(match.currentSet.scoreB).toBe(0);
      expect(match.currentSet.servingTeam).toBe('A');
    });

    test('должен создавать матч с пустым массивом сетов', () => {
      const match = createNewMatch();
      expect(match.sets).toEqual([]);
    });

    test('должен создавать матч с отключенной статистикой', () => {
      const match = createNewMatch();
      expect(match.statistics.enabled).toBe(false);
      expect(match.statistics.teamA.attack).toBe(0);
      expect(match.statistics.teamB.attack).toBe(0);
    });

    test('должен создавать матч с датами', () => {
      const match = createNewMatch();
      expect(match.createdAt).toBeDefined();
      expect(match.updatedAt).toBeDefined();
      expect(new Date(match.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('должен создавать матч с пустыми полями турнира', () => {
      const match = createNewMatch();
      expect(match.tournament).toBe('');
      expect(match.tournamentSubtitle).toBe('');
      expect(match.location).toBe('');
      expect(match.venue).toBe('');
    });

    test('должен создавать матч с пустыми официальными лицами', () => {
      const match = createNewMatch();
      expect(match.officials.referee1).toBe('');
      expect(match.officials.referee2).toBe('');
      expect(match.officials.lineJudge1).toBe('');
      expect(match.officials.lineJudge2).toBe('');
      expect(match.officials.scorer).toBe('');
    });

    test('должен создавать матч с часовым поясом по умолчанию', () => {
      const match = createNewMatch();
      expect(match.timezone).toBeDefined();
      expect(typeof match.timezone).toBe('string');
      expect(match.timezone.length).toBeGreaterThan(0);
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        expect(match.timezone).toBe(systemTimezone);
      } else {
        expect(match.timezone).toBe('UTC');
      }
    });

    test('должен устанавливать timezone при создании матча', () => {
      const match = createNewMatch();
      expect(match.timezone).toBeDefined();
      expect(typeof match.timezone).toBe('string');
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        expect(match.timezone).toBe(systemTimezone);
      } else {
        expect(match.timezone).toBe('UTC');
      }
    });
  });

  describe('validateMatch', () => {
    test('должен возвращать true для валидного матча', () => {
      const match = createNewMatch();
      expect(validateMatch(match)).toBe(true);
    });

    test('должен возвращать false для null', () => {
      expect(validateMatch(null)).toBe(false);
    });

    test('должен возвращать false для undefined', () => {
      expect(validateMatch(undefined)).toBe(false);
    });

    test('должен возвращать false для не объекта', () => {
      expect(validateMatch('not an object' as unknown as Match)).toBe(false);
      expect(validateMatch(123 as unknown as Match)).toBe(false);
      expect(validateMatch([] as unknown as Match)).toBe(false);
    });

    test('должен возвращать false если отсутствует matchId', () => {
      const match = createNewMatch();
      delete (match as Record<string, unknown>).matchId;
      expect(validateMatch(match)).toBe(false);
    });

    test('должен возвращать false если matchId не строка', () => {
      const match = createNewMatch();
      (match as Record<string, unknown>).matchId = 123;
      expect(validateMatch(match)).toBe(false);
    });

    test('должен возвращать false если отсутствует teamA', () => {
      const match = createNewMatch();
      delete (match as Record<string, unknown>).teamA;
      expect(validateMatch(match)).toBe(false);
    });

    test('должен возвращать false если отсутствует teamB', () => {
      const match = createNewMatch();
      delete (match as Record<string, unknown>).teamB;
      expect(validateMatch(match)).toBe(false);
    });

    test('должен возвращать false если отсутствует имя команды A', () => {
      const match = createNewMatch();
      match.teamA.name = '';
      expect(validateMatch(match)).toBe(false);
    });

    test('должен возвращать false если отсутствует имя команды B', () => {
      const match = createNewMatch();
      match.teamB.name = '';
      expect(validateMatch(match)).toBe(false);
    });

    test('должен возвращать false если отсутствует currentSet', () => {
      const match = createNewMatch();
      delete (match as Record<string, unknown>).currentSet;
      expect(validateMatch(match)).toBe(false);
    });

    test('должен возвращать false если sets не массив', () => {
      const match = createNewMatch();
      (match as Record<string, unknown>).sets = {};
      expect(validateMatch(match)).toBe(false);
    });

    test('должен возвращать false если отсутствует statistics', () => {
      const match = createNewMatch();
      delete (match as Record<string, unknown>).statistics;
      expect(validateMatch(match)).toBe(false);
    });

    test('должен возвращать true для матча с заполненными данными', () => {
      const match = createNewMatch();
      match.tournament = 'Чемпионат 2024';
      match.teamA.name = 'Спартак';
      match.teamB.name = 'Динамо';
      match.teamA.roster = [{ number: 1, name: 'Игрок 1', position: '', isStarter: false }];
      expect(validateMatch(match)).toBe(true);
    });
  });

  describe('generateUUID', () => {
    test('должен генерировать UUID', () => {
      const uuid = generateUUID();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
    });

    test('должен генерировать уникальные UUID', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    test('должен генерировать UUID правильного формата', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    test('должен генерировать UUID с версией 4', () => {
      const uuid = generateUUID();
      expect(uuid[14]).toBe('4');
    });
  });
});
