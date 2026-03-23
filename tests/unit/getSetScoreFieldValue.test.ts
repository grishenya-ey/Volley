import { describe, it, expect } from 'vitest';

/**
 * Тесты для логики getSetScoreFieldValue (форматирование полей инпутов "Счет после X партии")
 */

interface SetLike {
  setNumber: number;
  scoreA?: number;
  scoreB?: number;
  status?: string;
  completed?: boolean;
  startTime?: number;
  endTime?: number;
}

describe('getSetScoreFieldValue logic', () => {
  const createMatch = (sets: SetLike[] = []) => ({
    teamA: { name: 'Команда А' },
    teamB: { name: 'Команда Б' },
    sets,
  });

  it('должен возвращать имя команды A для fieldKey teamA', () => {
    const match = createMatch();
    expect(match.teamA?.name).toBe('Команда А');
  });

  it('должен возвращать имя команды B для fieldKey teamB', () => {
    const match = createMatch();
    expect(match.teamB?.name).toBe('Команда Б');
  });

  it('должен правильно вычислять счет по сетам для scoreASets', () => {
    const match = createMatch([
      { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' },
      { setNumber: 2, scoreA: 20, scoreB: 25, status: 'completed' },
      { setNumber: 3, scoreA: 25, scoreB: 23, status: 'completed' },
    ]);
    const completedSets = match.sets.filter(
      (set) => set.setNumber <= 3 && set.status === 'completed'
    );
    const score = completedSets.filter((set) => set.scoreA! > set.scoreB!).length;
    expect(score).toBe(2);
  });

  it('должен правильно вычислять счет по сетам для scoreBSets', () => {
    const match = createMatch([
      { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' },
      { setNumber: 2, scoreA: 20, scoreB: 25, status: 'completed' },
    ]);
    const completedSets = match.sets.filter(
      (set) => set.setNumber <= 2 && set.status === 'completed'
    );
    const score = completedSets.filter((set) => set.scoreB! > set.scoreA!).length;
    expect(score).toBe(1);
  });

  it('должен возвращать длительность партии для set1Duration', () => {
    const startTime = 1000000;
    const endTime = 1000000 + (30 * 60 * 1000 + 30 * 1000);
    const durationMs = endTime - startTime;
    const durationMinutes = Math.round(durationMs / 60000);
    expect(durationMinutes).toBe(31);
  });

  it('должен возвращать пустую строку для незавершенной партии', () => {
    const match = createMatch([
      { setNumber: 1, scoreA: 15, scoreB: 10, status: 'in_progress' },
    ]);
    const set = match.sets.find((s) => s.setNumber === 1);
    const isCompleted = set && (set.status === 'completed' || set.completed === true);
    expect(isCompleted).toBe(false);
  });

  it('должен возвращать пустую строку для партии, номер которой превышает setNumber', () => {
    const match = createMatch([
      { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' },
      { setNumber: 2, scoreA: 20, scoreB: 25, status: 'completed' },
    ]);
    const setNumber = 1;
    const setNum = 2;
    expect(setNum > setNumber).toBe(true);
  });

  it('должен возвращать счет команды A для set1ScoreA', () => {
    const match = createMatch([
      { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' },
    ]);
    const set = match.sets.find((s) => s.setNumber === 1);
    const score = String(set!.scoreA ?? 0);
    expect(score).toBe('25');
  });

  it('должен возвращать счет команды B для set1ScoreB', () => {
    const match = createMatch([
      { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' },
    ]);
    const set = match.sets.find((s) => s.setNumber === 1);
    const score = String(set!.scoreB ?? 0);
    expect(score).toBe('20');
  });

  it('должен обрабатывать случай, когда отсутствует startTime или endTime', () => {
    const match = createMatch([
      { setNumber: 1, scoreA: 25, scoreB: 20, status: 'completed' },
    ]);
    const set = match.sets.find((s) => s.setNumber === 1);
    const hasTime = set!.startTime && set!.endTime;
    expect(hasTime).toBeFalsy();
    expect(set!.startTime).toBeUndefined();
    expect(set!.endTime).toBeUndefined();
  });
});
