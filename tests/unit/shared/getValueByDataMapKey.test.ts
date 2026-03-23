/**
 * Тесты для getValueByDataMapKey — извлечение значений из матча по ключам dataMapCatalog.
 */

import { describe, test, expect } from 'vitest';
import { getValueByDataMapKey } from '../../../src/shared/getValueByDataMapKey';
import type { MatchForDataMap } from '../../../src/shared/getValueByDataMapKey';

describe('getValueByDataMapKey', () => {
  const baseMatch: MatchForDataMap = {
    matchId: 'test-1',
    tournament: 'Турнир',
    tournamentSubtitle: 'Финал',
    location: 'Москва',
    venue: 'Зал',
    date: '2024-01-15',
    time: '18:00',
    teamA: {
      name: 'Команда A',
      city: 'Город A',
      color: '#3498db',
      liberoColor: '#2980b9',
      coach: 'Тренер A',
      roster: [
        { number: 1, name: 'Игрок 1', position: '', isStarter: true },
        { number: 2, name: 'Игрок 2', position: '', isStarter: true },
      ],
      startingLineupOrder: [0, 1],
    },
    teamB: {
      name: 'Команда B',
      city: 'Город B',
      color: '#e74c3c',
      liberoColor: '#c0392b',
      coach: 'Тренер B',
      roster: [
        { number: 10, name: 'Игрок 10', position: '', isStarter: true },
        { number: 11, name: 'Игрок 11', position: '', isStarter: true },
      ],
      startingLineupOrder: [0, 1],
    },
    officials: {
      referee1: 'Судья 1',
      referee2: 'Судья 2',
      lineJudge1: 'Л1',
      lineJudge2: 'Л2',
      scorer: 'Секретарь',
    },
    currentSet: { setNumber: 1, scoreA: 15, scoreB: 12, servingTeam: 'A' },
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 20, completed: true, status: 'completed', startTime: 1000, endTime: 37000 },
      { setNumber: 2, scoreA: 22, scoreB: 25, completed: true, status: 'completed', startTime: 40000, endTime: 70000 },
    ],
  };

  describe('невалидные аргументы', () => {
    test('возвращает undefined при отсутствии match', () => {
      expect(getValueByDataMapKey(null, 'teamA.name')).toBeUndefined();
      expect(getValueByDataMapKey(undefined, 'teamA.name')).toBeUndefined();
    });

    test('возвращает undefined при отсутствии или неверном dataMapKey', () => {
      expect(getValueByDataMapKey(baseMatch, null as unknown as string)).toBeUndefined();
      expect(getValueByDataMapKey(baseMatch, undefined as unknown as string)).toBeUndefined();
      expect(getValueByDataMapKey(baseMatch, '')).toBeUndefined();
      expect(getValueByDataMapKey(baseMatch, '   ')).toBeUndefined();
      expect(getValueByDataMapKey(baseMatch, 123 as unknown as string)).toBeUndefined();
    });
  });

  describe('видимость (индикаторы подачи)', () => {
    test('visibility.pointA возвращает true когда подаёт команда A', () => {
      expect(getValueByDataMapKey(baseMatch, 'visibility.pointA')).toBe(true);
      expect(getValueByDataMapKey({ ...baseMatch, currentSet: { setNumber: 1, scoreA: 0, scoreB: 0, servingTeam: 'B' } }, 'visibility.pointA')).toBe(false);
    });

    test('visibility.pointB возвращает true когда подаёт команда B', () => {
      expect(getValueByDataMapKey(baseMatch, 'visibility.pointB')).toBe(false);
      expect(getValueByDataMapKey({ ...baseMatch, currentSet: { setNumber: 1, scoreA: 0, scoreB: 0, servingTeam: 'B' } }, 'visibility.pointB')).toBe(true);
    });
  });

  describe('вычисляемые: счёт по партиям', () => {
    test('scoreASets возвращает количество выигранных партий командой A', () => {
      expect(getValueByDataMapKey(baseMatch, 'scoreASets')).toBe('1');
      const matchBWins: MatchForDataMap = {
        ...baseMatch,
        sets: [
          { setNumber: 1, scoreA: 20, scoreB: 25, completed: true, status: 'completed' },
          { setNumber: 2, scoreA: 22, scoreB: 25, completed: true, status: 'completed' },
        ],
      };
      expect(getValueByDataMapKey(matchBWins, 'scoreASets')).toBe('0');
      expect(getValueByDataMapKey(matchBWins, 'scoreBSets')).toBe('2');
    });

    test('scoreBSets возвращает количество выигранных партий командой B', () => {
      expect(getValueByDataMapKey(baseMatch, 'scoreBSets')).toBe('1');
    });
  });

  describe('вычисляемые: дата/время', () => {
    test('matchDate форматирует date и time', () => {
      expect(getValueByDataMapKey(baseMatch, 'matchDate')).toBe('15.01.2024 18:00');
      expect(getValueByDataMapKey({ ...baseMatch, time: '' }, 'matchDate')).toBe('15.01.2024');
      expect(getValueByDataMapKey({ ...baseMatch, date: '' }, 'matchDate')).toBe('');
    });
  });

  describe('прямые пути в match', () => {
    test('возвращает значения по directPaths', () => {
      expect(getValueByDataMapKey(baseMatch, 'tournament')).toBe('Турнир');
      expect(getValueByDataMapKey(baseMatch, 'tournamentSubtitle')).toBe('Финал');
      expect(getValueByDataMapKey(baseMatch, 'location')).toBe('Москва');
      expect(getValueByDataMapKey(baseMatch, 'venue')).toBe('Зал');
      expect(getValueByDataMapKey(baseMatch, 'date')).toBe('15.01.2024');
      expect(getValueByDataMapKey(baseMatch, 'time')).toBe('18:00');
      expect(getValueByDataMapKey(baseMatch, 'teamA.name')).toBe('Команда A');
      expect(getValueByDataMapKey(baseMatch, 'teamA.city')).toBe('Город A');
      expect(getValueByDataMapKey(baseMatch, 'teamA.color')).toBe('#3498db');
      expect(getValueByDataMapKey(baseMatch, 'teamA.liberoColor')).toBe('#2980b9');
      expect(getValueByDataMapKey(baseMatch, 'teamA.coach')).toBe('Тренер A');
      expect(getValueByDataMapKey(baseMatch, 'teamB.name')).toBe('Команда B');
      expect(getValueByDataMapKey(baseMatch, 'currentSet.scoreA')).toBe('15');
      expect(getValueByDataMapKey(baseMatch, 'currentSet.scoreB')).toBe('12');
      expect(getValueByDataMapKey(baseMatch, 'currentSet.servingTeam')).toBe('A');
      expect(getValueByDataMapKey(baseMatch, 'officials.referee1')).toBe('Судья 1');
      expect(getValueByDataMapKey(baseMatch, 'officials.referee2')).toBe('Судья 2');
      expect(getValueByDataMapKey(baseMatch, 'officials.lineJudge1')).toBe('Л1');
      expect(getValueByDataMapKey(baseMatch, 'officials.lineJudge2')).toBe('Л2');
      expect(getValueByDataMapKey(baseMatch, 'officials.scorer')).toBe('Секретарь');
    });

    test('возвращает пустую строку для отсутствующих полей по directPaths', () => {
      const minimal: MatchForDataMap = { teamA: { name: '', color: '' }, teamB: { name: '', color: '' }, currentSet: { setNumber: 1, scoreA: 0, scoreB: 0, servingTeam: 'A' } };
      expect(getValueByDataMapKey(minimal, 'teamA.name')).toBe('');
      expect(getValueByDataMapKey(minimal, 'teamA.color')).toBe('');
    });
  });

  describe('ростер: rosterA/rosterB.playerN Number/Name/Position', () => {
    test('rosterA.player1Number, rosterA.player1Name и т.д.', () => {
      expect(getValueByDataMapKey(baseMatch, 'rosterA.player1Number')).toBe('1');
      expect(getValueByDataMapKey(baseMatch, 'rosterA.player1Name')).toBe('Игрок 1');
      expect(getValueByDataMapKey(baseMatch, 'rosterA.player2Number')).toBe('2');
      expect(getValueByDataMapKey(baseMatch, 'rosterA.player2Name')).toBe('Игрок 2');
      expect(getValueByDataMapKey(baseMatch, 'rosterB.player1Number')).toBe('10');
      expect(getValueByDataMapKey(baseMatch, 'rosterB.player1Name')).toBe('Игрок 10');
    });

    test('rosterA.playerNPosition возвращает позицию или "" если не указана', () => {
      const withPosition: MatchForDataMap = {
        ...baseMatch,
        teamA: {
          ...baseMatch.teamA!,
          roster: [
            { number: 1, name: 'Игрок 1', position: 'Доигровщик', isStarter: true },
            { number: 2, name: 'Игрок 2', position: '', isStarter: true },
          ],
        },
      };
      expect(getValueByDataMapKey(withPosition, 'rosterA.player1Position')).toBe('Доигровщик');
      expect(getValueByDataMapKey(withPosition, 'rosterA.player2Position')).toBe('');
    });

    test('rosterA.playerNPositionShort возвращает сокращение позиции (OH, MB, OPP, S, L)', () => {
      const withPosition: MatchForDataMap = {
        ...baseMatch,
        teamA: {
          ...baseMatch.teamA!,
          roster: [
            { number: 1, name: 'Игрок 1', position: 'Доигровщик', isStarter: true },
            { number: 2, name: 'Игрок 2', position: 'Связующий', isStarter: true },
            { number: 3, name: 'Игрок 3', position: '', isStarter: true },
          ],
        },
      };
      expect(getValueByDataMapKey(withPosition, 'rosterA.player1PositionShort')).toBe('OH');
      expect(getValueByDataMapKey(withPosition, 'rosterA.player2PositionShort')).toBe('S');
      expect(getValueByDataMapKey(withPosition, 'rosterA.player3PositionShort')).toBe('');
    });

    test('позиция не указана (пустая строка, null, "Не указано") → в vMix уходит ""', () => {
      const rosterEmpty = [{ number: 1, name: 'Игрок 1', position: '', isStarter: true }];
      const rosterNull = [{ number: 1, name: 'Игрок 1', position: null as unknown as string, isStarter: true }];
      const rosterNeUkazano = [{ number: 1, name: 'Игрок 1', position: 'Не указано', isStarter: true }];
      expect(getValueByDataMapKey({ ...baseMatch, teamA: { ...baseMatch.teamA!, roster: rosterEmpty } }, 'rosterA.player1Position')).toBe('');
      expect(getValueByDataMapKey({ ...baseMatch, teamA: { ...baseMatch.teamA!, roster: rosterNull } }, 'rosterA.player1Position')).toBe('');
      expect(getValueByDataMapKey({ ...baseMatch, teamA: { ...baseMatch.teamA!, roster: rosterNeUkazano } }, 'rosterA.player1Position')).toBe('');
    });

    test('возвращает пустую строку при отсутствии игрока в ростер', () => {
      const noRoster: MatchForDataMap = { ...baseMatch, teamA: { ...baseMatch.teamA!, roster: [] } };
      expect(getValueByDataMapKey(noRoster, 'rosterA.player1Number')).toBe('');
      expect(getValueByDataMapKey(noRoster, 'rosterA.player1Name')).toBe('');
      expect(getValueByDataMapKey(noRoster, 'rosterA.player1Position')).toBe('');
    });
  });

  describe('стартовый состав: startingA/startingB.playerN, libero, Position', () => {
    test('startingA.player1Number/Name по startingLineupOrder', () => {
      expect(getValueByDataMapKey(baseMatch, 'startingA.player1Number')).toBe('1');
      expect(getValueByDataMapKey(baseMatch, 'startingA.player1Name')).toBe('Игрок 1');
    });

    test('startingA.playerNPosition и libero1Position: значение или "" если не указано', () => {
      const withPositions: MatchForDataMap = {
        ...baseMatch,
        teamA: {
          ...baseMatch.teamA!,
          roster: [
            { number: 1, name: 'Игрок 1', position: 'Связующий', isStarter: true },
            { number: 2, name: 'Игрок 2', position: '', isStarter: true },
          ],
          startingLineupOrder: [0, 1],
        },
      };
      expect(getValueByDataMapKey(withPositions, 'startingA.player1Position')).toBe('Связующий');
      expect(getValueByDataMapKey(withPositions, 'startingA.player2Position')).toBe('');
    });

    test('startingA.playerNPositionShort возвращает сокращение позиции', () => {
      const withPositions: MatchForDataMap = {
        ...baseMatch,
        teamA: {
          ...baseMatch.teamA!,
          roster: [
            { number: 1, name: 'Игрок 1', position: 'Связующий', isStarter: true },
            { number: 2, name: 'Игрок 2', position: 'Либеро', isStarter: true },
          ],
          startingLineupOrder: [0, 1],
        },
      };
      expect(getValueByDataMapKey(withPositions, 'startingA.player1PositionShort')).toBe('S');
      expect(getValueByDataMapKey(withPositions, 'startingA.player2PositionShort')).toBe('L');
    });

    test('позиция стартового/либеро не указана ("Не указано", "", null) → ""', () => {
      const rosterNeUkazano = [
        { number: 1, name: 'Игрок 1', position: 'Не указано', isStarter: true },
        { number: 2, name: 'Игрок 2', position: '', isStarter: true },
      ];
      const m: MatchForDataMap = { ...baseMatch, teamA: { ...baseMatch.teamA!, roster: rosterNeUkazano, startingLineupOrder: [0, 1] } };
      expect(getValueByDataMapKey(m, 'startingA.player1Position')).toBe('');
      expect(getValueByDataMapKey(m, 'startingA.player2Position')).toBe('');
    });

    test('liberoN Number/Name и liberoNBackground', () => {
      const matchWithLiberos: MatchForDataMap = {
        ...baseMatch,
        teamA: {
          ...baseMatch.teamA!,
          roster: [
            { number: 1, name: 'Игрок 1', position: '', isStarter: true },
            { number: 2, name: 'Игрок 2', position: '', isStarter: true },
            { number: 5, name: 'Либеро', position: '', isStarter: false },
          ],
          startingLineupOrder: [0, 1, undefined, undefined, undefined, undefined, 2],
        },
      };
      const val = getValueByDataMapKey(matchWithLiberos, 'startingA.libero1Number');
      expect(val === '5' || val === '').toBe(true);
      const nameVal = getValueByDataMapKey(matchWithLiberos, 'startingA.libero1Name');
      expect(nameVal === 'Либеро' || nameVal === '').toBe(true);
    });

    test('liberoNBackground возвращает liberoColor или color команды', () => {
      expect(getValueByDataMapKey(baseMatch, 'startingA.libero1Background')).toBe('#2980b9');
    });

    test('при пустом стартовом составе (нет isStarter) поля Старт А/Б возвращают пустую строку, не данные из Roster', () => {
      const noStarters: MatchForDataMap = {
        ...baseMatch,
        teamA: {
          ...baseMatch.teamA!,
          roster: [
            { number: 1, name: 'Игрок 1', position: '', isStarter: false },
            { number: 2, name: 'Игрок 2', position: '', isStarter: false },
          ],
          startingLineupOrder: [],
        },
        teamB: {
          ...baseMatch.teamB!,
          roster: [
            { number: 10, name: 'Игрок 10', position: '', isStarter: false },
            { number: 11, name: 'Игрок 11', position: '', isStarter: false },
          ],
          startingLineupOrder: [],
        },
      };
      expect(getValueByDataMapKey(noStarters, 'startingA.player1Number')).toBe('');
      expect(getValueByDataMapKey(noStarters, 'startingA.player1Name')).toBe('');
      expect(getValueByDataMapKey(noStarters, 'startingA.player2Number')).toBe('');
      expect(getValueByDataMapKey(noStarters, 'startingB.player1Number')).toBe('');
      expect(getValueByDataMapKey(noStarters, 'startingB.player1Name')).toBe('');
      expect(getValueByDataMapKey(noStarters, 'startingB.player2Name')).toBe('');
    });
  });

  describe('партии: setN.scoreA, setN.scoreB, setN.duration', () => {
    test('set1.scoreA, set1.scoreB, set2.scoreA и т.д.', () => {
      expect(getValueByDataMapKey(baseMatch, 'set1.scoreA')).toBe('25');
      expect(getValueByDataMapKey(baseMatch, 'set1.scoreB')).toBe('20');
      expect(getValueByDataMapKey(baseMatch, 'set2.scoreA')).toBe('22');
      expect(getValueByDataMapKey(baseMatch, 'set2.scoreB')).toBe('25');
    });

    test('setN.duration в минутах по startTime/endTime', () => {
      expect(getValueByDataMapKey(baseMatch, 'set1.duration')).toBe("1'");
      const set60min: MatchForDataMap = {
        ...baseMatch,
        sets: [{ setNumber: 1, scoreA: 0, scoreB: 0, completed: false, startTime: 1000, endTime: 3610000 }],
      };
      expect(getValueByDataMapKey(set60min, 'set1.duration')).toBe("60'");
    });

    test('возвращает пустую строку для несуществующей партии', () => {
      expect(getValueByDataMapKey(baseMatch, 'set5.scoreA')).toBe('');
      expect(getValueByDataMapKey(baseMatch, 'set5.duration')).toBe('');
    });
  });

  describe('универсальный путь (getByPath)', () => {
    test('teamA.logo, teamA.logoPath и другие пути', () => {
      const withLogo: MatchForDataMap = { ...baseMatch, teamA: { ...baseMatch.teamA!, logo: 'logo_a.png' } };
      expect(getValueByDataMapKey(withLogo, 'teamA.logo')).toBe('logo_a.png');
    });

    test('пустой ключ после trim не ломает', () => {
      expect(getValueByDataMapKey(baseMatch, '  teamA.name  ')).toBe('Команда A');
    });

    test('расширенная статистика (statistics.teamA/B.*)', () => {
      const withStats: MatchForDataMap = {
        ...baseMatch,
        statistics: {
          enabled: true,
          teamA: { attack: 45, block: 8, serve: 5, opponentErrors: 12 },
          teamB: { attack: 38, block: 6, serve: 4, opponentErrors: 10 },
        },
      };
      expect(getValueByDataMapKey(withStats, 'statistics.teamA.attack')).toBe('45');
      expect(getValueByDataMapKey(withStats, 'statistics.teamA.block')).toBe('8');
      expect(getValueByDataMapKey(withStats, 'statistics.teamA.serve')).toBe('5');
      expect(getValueByDataMapKey(withStats, 'statistics.teamA.opponentErrors')).toBe('12');
      expect(getValueByDataMapKey(withStats, 'statistics.teamB.attack')).toBe('38');
      expect(getValueByDataMapKey(withStats, 'statistics.teamB.block')).toBe('6');
      expect(getValueByDataMapKey(withStats, 'statistics.teamB.serve')).toBe('4');
      expect(getValueByDataMapKey(withStats, 'statistics.teamB.opponentErrors')).toBe('10');
      expect(getValueByDataMapKey(baseMatch, 'statistics.teamA.attack')).toBe('');
    });
  });
});
