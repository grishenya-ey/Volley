import { describe, it, expect } from 'vitest';
import {
  calculateSetDuration,
  getCompletedSetsUpTo,
  calculateSetsScore,
  formatSetScoreInputData,
} from '../../src/shared/setScoreInputsUtils';

describe('calculateSetDuration', () => {
  it('должен вычислять время партии в минутах из startTime и endTime', () => {
    const startTime = 1000000;
    const endTime = 1000000 + (30 * 60 * 1000);
    const duration = calculateSetDuration(startTime, endTime);
    expect(duration).toBe(30);
  });

  it('должен возвращать 0, если endTime отсутствует', () => {
    const startTime = 1000000;
    const duration = calculateSetDuration(startTime, undefined);
    expect(duration).toBe(0);
  });

  it('должен возвращать 0, если startTime отсутствует', () => {
    const endTime = 1000000;
    const duration = calculateSetDuration(undefined, endTime);
    expect(duration).toBe(0);
  });

  it('должен округлять до целых минут (округление вниз)', () => {
    const startTime = 1000000;
    const endTime = 1000000 + (30 * 60 * 1000 + 30 * 1000);
    const duration = calculateSetDuration(startTime, endTime);
    expect(duration).toBe(30);
  });

  it('должен округлять вверх, если остаток >= 30 секунд', () => {
    const startTime = 1000000;
    const endTime = 1000000 + (30 * 60 * 1000 + 35 * 1000);
    const duration = calculateSetDuration(startTime, endTime);
    expect(duration).toBe(30);
  });
});

describe('getCompletedSetsUpTo', () => {
  it('должен возвращать только завершенные партии до указанного номера', () => {
    const sets = [
      { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' as const },
      { setNumber: 2, scoreA: 20, scoreB: 25, status: 'completed' as const },
      { setNumber: 3, scoreA: 15, scoreB: 25, status: 'completed' as const },
      { setNumber: 4, scoreA: 25, scoreB: 23, status: 'in_progress' as const },
    ];
    const completed = getCompletedSetsUpTo(sets, 3);
    expect(completed).toHaveLength(3);
    expect(completed[0].setNumber).toBe(1);
    expect(completed[1].setNumber).toBe(2);
    expect(completed[2].setNumber).toBe(3);
  });

  it('должен возвращать пустой массив, если нет завершенных партий', () => {
    const sets = [
      { setNumber: 1, scoreA: 10, scoreB: 10, status: 'in_progress' as const },
    ];
    const completed = getCompletedSetsUpTo(sets, 1);
    expect(completed).toHaveLength(0);
  });

  it('должен возвращать пустой массив, если sets пустой', () => {
    const completed = getCompletedSetsUpTo([], 3);
    expect(completed).toHaveLength(0);
  });

  it('должен возвращать пустой массив, если sets null', () => {
    const completed = getCompletedSetsUpTo(null, 3);
    expect(completed).toHaveLength(0);
  });

  it('должен учитывать поле completed для обратной совместимости', () => {
    const sets = [
      { setNumber: 1, scoreA: 25, scoreB: 20, completed: true },
      { setNumber: 2, scoreA: 20, scoreB: 25, status: 'completed' },
    ];
    const completed = getCompletedSetsUpTo(sets, 2);
    expect(completed).toHaveLength(2);
  });
});

describe('calculateSetsScore', () => {
  it('должен вычислять количество выигранных партий для команды A', () => {
    const sets = [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 20, scoreB: 25 },
      { setNumber: 3, scoreA: 25, scoreB: 23 },
    ];
    const score = calculateSetsScore(sets, 'A');
    expect(score).toBe(2);
  });

  it('должен вычислять количество выигранных партий для команды B', () => {
    const sets = [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 20, scoreB: 25 },
      { setNumber: 3, scoreA: 25, scoreB: 23 },
    ];
    const score = calculateSetsScore(sets, 'B');
    expect(score).toBe(1);
  });

  it('должен возвращать 0, если sets пустой', () => {
    const score = calculateSetsScore([], 'A');
    expect(score).toBe(0);
  });

  it('должен возвращать 0, если sets null', () => {
    const score = calculateSetsScore(null, 'A');
    expect(score).toBe(0);
  });
});

describe('formatSetScoreInputData', () => {
  it('должен формировать данные для set1Score', () => {
    const match = {
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets: [
        {
          setNumber: 1,
          scoreA: 25,
          scoreB: 20,
          status: 'completed' as const,
          startTime: 1000000,
          endTime: 1000000 + (30 * 60 * 1000),
        },
      ],
    };
    const result = formatSetScoreInputData(match, 1);
    expect(result.fields['TeamA']).toBe('Команда А');
    expect(result.fields['TeamB']).toBe('Команда Б');
    expect(result.fields['ScoreASets']).toBe('1');
    expect(result.fields['ScoreBSets']).toBe('0');
    expect(result.fields['Set1Duration']).toBe('30');
    expect(result.fields['Set1ScoreA']).toBe('25');
    expect(result.fields['Set1ScoreB']).toBe('20');
  });

  it('должен формировать данные для set3Score с тремя завершенными партиями', () => {
    const match = {
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' as const, startTime: 1000000, endTime: 1000000 + (30 * 60 * 1000) },
        { setNumber: 2, scoreA: 20, scoreB: 25, status: 'completed' as const, startTime: 2000000, endTime: 2000000 + (35 * 60 * 1000) },
        { setNumber: 3, scoreA: 25, scoreB: 23, status: 'completed' as const, startTime: 3000000, endTime: 3000000 + (28 * 60 * 1000) },
      ],
    };
    const result = formatSetScoreInputData(match, 3);
    expect(result.fields['TeamA']).toBe('Команда А');
    expect(result.fields['TeamB']).toBe('Команда Б');
    expect(result.fields['ScoreASets']).toBe('2');
    expect(result.fields['ScoreBSets']).toBe('1');
    expect(result.fields['Set1Duration']).toBe('30');
    expect(result.fields['Set1ScoreA']).toBe('25');
    expect(result.fields['Set1ScoreB']).toBe('20');
    expect(result.fields['Set2Duration']).toBe('35');
    expect(result.fields['Set2ScoreA']).toBe('20');
    expect(result.fields['Set2ScoreB']).toBe('25');
    expect(result.fields['Set3Duration']).toBe('28');
    expect(result.fields['Set3ScoreA']).toBe('25');
    expect(result.fields['Set3ScoreB']).toBe('23');
  });

  it('должен обрабатывать случай, когда партий меньше, чем номер инпута', () => {
    const match = {
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' as const, startTime: 1000000, endTime: 1000000 + (30 * 60 * 1000) },
      ],
    };
    const result = formatSetScoreInputData(match, 3);
    expect(result.fields['Set1Duration']).toBe('30');
    expect(result.fields['Set1ScoreA']).toBe('25');
    expect(result.fields['Set1ScoreB']).toBe('20');
    expect(result.fields['Set2Duration']).toBe('');
    expect(result.fields['Set2ScoreA']).toBe('');
    expect(result.fields['Set2ScoreB']).toBe('');
    expect(result.fields['Set3Duration']).toBe('');
    expect(result.fields['Set3ScoreA']).toBe('');
    expect(result.fields['Set3ScoreB']).toBe('');
  });

  it('должен возвращать пустой объект, если match null', () => {
    const result = formatSetScoreInputData(null, 1);
    expect(result.fields).toEqual({});
  });

  it('должен обрабатывать случай, когда отсутствует время партии', () => {
    const match = {
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' as const },
      ],
    };
    const result = formatSetScoreInputData(match, 1);
    expect(result.fields['Set1Duration']).toBe('');
    expect(result.fields['Set1ScoreA']).toBe('25');
    expect(result.fields['Set1ScoreB']).toBe('20');
  });

  it('должен обрабатывать случай, когда время партии равно 0', () => {
    const match = {
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' as const, startTime: 1000000, endTime: 1000000 },
      ],
    };
    const result = formatSetScoreInputData(match, 1);
    expect(result.fields['Set1Duration']).toBe('');
  });

  it('должен обрабатывать случай, когда партия не завершена', () => {
    const match = {
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets: [
        { setNumber: 1, scoreA: 15, scoreB: 10, status: 'in_progress' as const, startTime: 1000000, endTime: 1000000 + (20 * 60 * 1000) },
      ],
    };
    const result = formatSetScoreInputData(match, 3);
    expect(result.fields['Set1Duration']).toBe('');
    expect(result.fields['Set1ScoreA']).toBe('');
    expect(result.fields['Set1ScoreB']).toBe('');
    expect(result.fields['Set2Duration']).toBe('');
    expect(result.fields['Set3Duration']).toBe('');
  });

  it('должен правильно вычислять счет по сетам для частично завершенных партий', () => {
    const match = {
      teamA: { name: 'Команда А' },
      teamB: { name: 'Команда Б' },
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' as const },
        { setNumber: 2, scoreA: 20, scoreB: 25, status: 'completed' as const },
      ],
    };
    const result = formatSetScoreInputData(match, 3);
    expect(result.fields['ScoreASets']).toBe('1');
    expect(result.fields['ScoreBSets']).toBe('1');
  });
});
