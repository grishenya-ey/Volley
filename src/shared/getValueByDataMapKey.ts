/**
 * Возвращает значение из матча по ключу справочника dataMapCatalog.
 * Используется при отправке данных динамических инпутов в vMix.
 */

import { getPositionAbbreviation } from './playerPositions';

/** Матч для извлечения значений (минимальная структура для getValueByDataMapKey) */
export interface MatchForDataMap {
  date?: string;
  time?: string;
  currentSet?: { servingTeam?: string };
  sets?: { setNumber: number; scoreA?: number; scoreB?: number; startTime?: number; endTime?: number }[];
  teamA?: { roster?: { number?: number; name?: string; position?: string; isStarter?: boolean }[]; startingLineupOrder?: number[]; liberoColor?: string; color?: string };
  teamB?: { roster?: { number?: number; name?: string; position?: string; isStarter?: boolean }[]; startingLineupOrder?: number[]; liberoColor?: string; color?: string };
  [key: string]: unknown;
}

function getByPath(obj: Record<string, unknown> | null | undefined, pathStr: string): unknown {
  if (!obj || !pathStr) return undefined;
  const parts = pathStr.split('.');
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

function calculateSetsScore(match: MatchForDataMap, team: 'A' | 'B'): number {
  if (!match?.sets) return 0;
  return match.sets.filter((set) => {
    const completed = (set as { completed?: boolean; status?: string }).completed === true || (set as { status?: string }).status === 'completed';
    if (!completed) return false;
    const s = set as { scoreA?: number; scoreB?: number };
    return team === 'A' ? (s.scoreA ?? 0) > (s.scoreB ?? 0) : (s.scoreB ?? 0) > (s.scoreA ?? 0);
  }).length;
}

/**
 * Форматирует дату (и опционально время) для отображения.
 */
export function formatMatchDate(dateStr: string | null | undefined, timeStr?: string | null): string {
  if (!dateStr) return '';
  const d = dateStr.split('-');
  if (d.length !== 3) return dateStr;
  const time = (timeStr ?? '').substring(0, 5);
  return time ? `${d[2]}.${d[1]}.${d[0]} ${time}` : `${d[2]}.${d[1]}.${d[0]}`;
}

/**
 * Возвращает значение из матча по ключу справочника dataMapCatalog.
 */
export function getValueByDataMapKey(match: MatchForDataMap | null | undefined, dataMapKey: string): string | boolean | undefined {
  if (!match || !dataMapKey || typeof dataMapKey !== 'string') return undefined;

  const key = dataMapKey.trim();
  if (!key) return undefined;

  if (key === 'visibility.pointA') {
    return (match.currentSet?.servingTeam ?? '') === 'A';
  }
  if (key === 'visibility.pointB') {
    return (match.currentSet?.servingTeam ?? '') === 'B';
  }

  if (key === 'scoreASets') {
    return String(calculateSetsScore(match, 'A'));
  }
  if (key === 'scoreBSets') {
    return String(calculateSetsScore(match, 'B'));
  }

  if (key === 'matchDate') {
    return formatMatchDate(match.date, match.time);
  }
  if (key === 'date') {
    return formatMatchDate(match.date, '');
  }

  const directPaths: Record<string, string> = {
    tournament: 'tournament',
    tournamentSubtitle: 'tournamentSubtitle',
    location: 'location',
    venue: 'venue',
    time: 'time',
    'teamA.name': 'teamA.name',
    'teamA.city': 'teamA.city',
    'teamA.color': 'teamA.color',
    'teamA.liberoColor': 'teamA.liberoColor',
    'teamA.coach': 'teamA.coach',
    'teamB.name': 'teamB.name',
    'teamB.city': 'teamB.city',
    'teamB.color': 'teamB.color',
    'teamB.liberoColor': 'teamB.liberoColor',
    'teamB.coach': 'teamB.coach',
    'currentSet.scoreA': 'currentSet.scoreA',
    'currentSet.scoreB': 'currentSet.scoreB',
    'currentSet.servingTeam': 'currentSet.servingTeam',
    'officials.referee1': 'officials.referee1',
    'officials.referee2': 'officials.referee2',
    'officials.lineJudge1': 'officials.lineJudge1',
    'officials.lineJudge2': 'officials.lineJudge2',
    'officials.scorer': 'officials.scorer',
  };

  if (directPaths[key]) {
    const v = getByPath(match as Record<string, unknown>, directPaths[key]);
    return v != null ? String(v) : '';
  }

  const rosterMatch = key.match(/^roster(A|B)\.player(\d+)(Number|Name|Position|PositionShort)$/);
  if (rosterMatch) {
    const teamKey = rosterMatch[1] === 'A' ? 'teamA' : 'teamB';
    const index = parseInt(rosterMatch[2], 10) - 1;
    const suffix = rosterMatch[3];
    const roster = match[teamKey]?.roster;
    const player = roster?.[index];
    if (suffix === 'PositionShort') {
      const pos = player?.position;
      if (pos == null || pos === '' || pos === 'Не указано') return '';
      return getPositionAbbreviation(pos) || '';
    }
    const prop = suffix === 'Number' ? 'number' : suffix === 'Name' ? 'name' : 'position';
    let val: unknown = player?.[prop as keyof typeof player];
    if (prop === 'position' && (val == null || val === '' || val === 'Не указано')) return '';
    return val != null ? String(val) : '';
  }

  const startMatch = key.match(/^starting(A|B)\.(player\d+|libero\d+|libero\d+Background)(Number|Name|Position|PositionShort|Background)?$/);
  if (startMatch) {
    const teamKey = startMatch[1] === 'A' ? 'teamA' : 'teamB';
    const part = startMatch[2];
    const suffix = startMatch[3] ?? '';
    const startOrder = match[teamKey]?.startingLineupOrder;
    const roster = match[teamKey]?.roster;
    if (part.startsWith('player')) {
      const i = parseInt(part.replace('player', ''), 10) - 1;
      // Игрок стартового состава: только по startingLineupOrder или по isStarter, без подстановки roster[i]
      const rosterIndex = startOrder?.[i];
      const player =
        typeof rosterIndex === 'number' && roster
          ? roster[rosterIndex]
          : roster?.filter((p) => p.isStarter)?.[i];
      if (suffix === 'PositionShort') {
        const pos = player?.position;
        if (pos == null || pos === '' || pos === 'Не указано') return '';
        return getPositionAbbreviation(pos) || '';
      }
      const prop = suffix === 'Number' ? 'number' : suffix === 'Position' ? 'position' : 'name';
      let val: unknown = player?.[prop as keyof typeof player];
      if (prop === 'position' && (val == null || val === '' || val === 'Не указано')) return '';
      return val != null ? String(val) : '';
    }
    if (part.startsWith('libero') && suffix === 'Background') {
      const color = match[teamKey]?.liberoColor ?? match[teamKey]?.color;
      return color != null ? String(color) : '';
    }
    if (part.startsWith('libero')) {
      const libNum = part === 'libero1' ? 0 : 1;
      const starters = roster?.filter((p) => p.isStarter) ?? [];
      const liberos = startOrder?.slice(6, 8) ?? [];
      const idx = liberos[libNum] ?? starters[6 + libNum];
      const player = typeof idx === 'number' && roster ? roster[idx] : undefined;
      if (suffix === 'PositionShort') {
        const pos = player?.position;
        if (pos == null || pos === '' || pos === 'Не указано') return '';
        return getPositionAbbreviation(pos) || '';
      }
      const prop = suffix === 'Number' ? 'number' : suffix === 'Position' ? 'position' : 'name';
      let val: unknown = player?.[prop as keyof typeof player];
      if (prop === 'position' && (val == null || val === '' || val === 'Не указано')) return '';
      return val != null ? String(val) : '';
    }
  }

  const setMatch = key.match(/^set(\d+)\.(scoreA|scoreB|duration)$/);
  if (setMatch) {
    const setNum = parseInt(setMatch[1], 10);
    const field = setMatch[2];
    const set = match.sets?.find((s) => s.setNumber === setNum);
    if (!set) return '';
    if (field === 'scoreA') return String((set as { scoreA?: number }).scoreA ?? '');
    if (field === 'scoreB') return String((set as { scoreB?: number }).scoreB ?? '');
    if (field === 'duration') {
      const s = set as { startTime?: number; endTime?: number };
      const min = s.startTime && s.endTime ? Math.round((s.endTime - s.startTime) / 60000) : null;
      return min != null ? `${min}'` : '';
    }
  }

  const v = getByPath(match as Record<string, unknown>, key);
  return v != null ? String(v) : '';
}
