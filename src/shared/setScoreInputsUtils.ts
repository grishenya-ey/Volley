/**
 * Утилиты для работы с инпутами "Счет после X партии"
 */

/** Партия с полями для инпута */
interface SetLike {
  setNumber: number;
  scoreA?: number;
  scoreB?: number;
  startTime?: number;
  endTime?: number;
  status?: string;
  completed?: boolean;
}

/** Матч для форматирования инпута */
interface MatchForSetScoreInput {
  teamA?: { name?: string };
  teamB?: { name?: string };
  sets?: SetLike[];
}

export function calculateSetDuration(startTime: number | null | undefined, endTime: number | null | undefined): number {
  if (!startTime || !endTime) return 0;
  const durationMs = endTime - startTime;
  return Math.floor(durationMs / (60 * 1000));
}

export function getCompletedSetsUpTo(sets: SetLike[] | null | undefined, maxSetNumber: number): SetLike[] {
  if (!sets || !Array.isArray(sets)) return [];
  return sets
    .filter(
      (set) =>
        set.setNumber <= maxSetNumber && (set.status === 'completed' || set.completed === true)
    )
    .sort((a, b) => a.setNumber - b.setNumber);
}

export function calculateSetsScore(sets: SetLike[] | null | undefined, team: 'A' | 'B'): number {
  if (!sets || !Array.isArray(sets)) return 0;
  return sets.filter((set) => (team === 'A' ? (set.scoreA ?? 0) > (set.scoreB ?? 0) : (set.scoreB ?? 0) > (set.scoreA ?? 0))).length;
}

export interface SetScoreInputFields {
  [key: string]: string;
}

export function formatSetScoreInputData(
  match: MatchForSetScoreInput | null | undefined,
  setNumber: number
): { fields: SetScoreInputFields } {
  if (!match) return { fields: {} };

  const fields: SetScoreInputFields = {};
  fields['TeamA'] = match.teamA?.name ?? '';
  fields['TeamB'] = match.teamB?.name ?? '';

  const completedSets = getCompletedSetsUpTo(match.sets ?? [], setNumber);
  const scoreASets = calculateSetsScore(completedSets, 'A');
  const scoreBSets = calculateSetsScore(completedSets, 'B');
  fields['ScoreASets'] = String(scoreASets);
  fields['ScoreBSets'] = String(scoreBSets);

  completedSets.forEach((set) => {
    const duration = calculateSetDuration(set.startTime, set.endTime);
    const setNum = set.setNumber;
    fields[`Set${setNum}Duration`] = duration > 0 ? String(duration) : '';
    fields[`Set${setNum}ScoreA`] = String(set.scoreA ?? 0);
    fields[`Set${setNum}ScoreB`] = String(set.scoreB ?? 0);
  });

  for (let i = 1; i <= setNumber; i++) {
    const setExists = completedSets.some((set) => set.setNumber === i);
    if (!setExists) {
      fields[`Set${i}Duration`] = '';
      fields[`Set${i}ScoreA`] = '';
      fields[`Set${i}ScoreB`] = '';
    }
  }

  return { fields };
}
