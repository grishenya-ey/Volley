/**
 * Правила волейбола (ВФВ)
 * Поддержка вариантов: зал, пляж, снежный
 */

import type { RulesConfig } from './volleyballRulesConfig';
import { RULES_CONFIGS, VARIANTS } from './volleyballRulesConfig';

export interface SetballResult {
  isSetball: boolean;
  team: 'A' | 'B' | null;
}

export interface MatchballResult {
  isMatchball: boolean;
  team: 'A' | 'B' | null;
}

export interface VolleyballRules {
  isSetball(scoreA: number, scoreB: number, setNumber?: number): SetballResult;
  isMatchball(sets: { completed?: boolean; status?: string; scoreA: number; scoreB: number }[], currentSetNumber: number, scoreA: number, scoreB: number): MatchballResult;
  canFinishSet(scoreA: number, scoreB: number, setNumber?: number): boolean;
  getSetWinner(scoreA: number, scoreB: number): 'A' | 'B' | null;
  getMatchWinner(sets: { completed?: boolean; status?: string; scoreA: number; scoreB: number }[]): 'A' | 'B' | null;
  isMatchFinished(sets: { completed?: boolean; status?: string; scoreA: number; scoreB: number }[]): boolean;
  getConfig(): RulesConfig;
}

export function createRules(config: RulesConfig): VolleyballRules {
  const isDecidingSet = (setNumber: number) => setNumber === config.decidingSetNumber;
  const getSetballThreshold = (setNumber: number) =>
    isDecidingSet(setNumber) ? config.setballThresholdDeciding : config.setballThresholdRegular;
  const getFinishThreshold = (setNumber: number) =>
    isDecidingSet(setNumber) ? config.pointsToWinDecidingSet : config.pointsToWinRegularSet;

  return {
    isSetball(scoreA: number, scoreB: number, setNumber = 1): SetballResult {
      const setballThreshold = getSetballThreshold(setNumber);
      const maxScore = Math.max(scoreA, scoreB);
      const minScore = Math.min(scoreA, scoreB);
      if (maxScore >= setballThreshold && maxScore - minScore >= 1 && scoreA !== scoreB) {
        return { isSetball: true, team: scoreA > scoreB ? 'A' : 'B' };
      }
      return { isSetball: false, team: null };
    },

    isMatchball(sets, currentSetNumber, scoreA, scoreB): MatchballResult {
      const winsA = sets.filter(s => (s.completed === true || s.status === 'completed') && s.scoreA > s.scoreB).length;
      const winsB = sets.filter(s => (s.completed === true || s.status === 'completed') && s.scoreB > s.scoreA).length;
      const oneWinAway = config.setsToWinMatch - 1;
      
      if (winsA === oneWinAway || winsB === oneWinAway) {
        const sb = this.isSetball(scoreA, scoreB, currentSetNumber);
        if (sb.isSetball && ((sb.team === 'A' && winsA === oneWinAway) || (sb.team === 'B' && winsB === oneWinAway))) {
          return { isMatchball: true, team: sb.team };
        }
      }
      return { isMatchball: false, team: null };
    },

    canFinishSet(scoreA: number, scoreB: number, setNumber = 1): boolean {
      const finishThreshold = getFinishThreshold(setNumber);
      const tieThreshold = finishThreshold - 1;
      const maxScore = Math.max(scoreA, scoreB);
      const minScore = Math.min(scoreA, scoreB);
      if (maxScore >= finishThreshold && maxScore - minScore >= 2) return true;
      if (maxScore >= tieThreshold && minScore >= tieThreshold && maxScore - minScore >= 2) return true;
      return false;
    },

    getSetWinner(scoreA: number, scoreB: number): 'A' | 'B' | null {
      if (scoreA > scoreB) return 'A';
      if (scoreB > scoreA) return 'B';
      return null;
    },

    getMatchWinner(sets): 'A' | 'B' | null {
      const completed = sets.filter(s => s.completed === true || s.status === 'completed');
      const winsA = completed.filter(s => s.scoreA > s.scoreB).length;
      const winsB = completed.filter(s => s.scoreB > s.scoreA).length;
      if (winsA >= config.setsToWinMatch) return 'A';
      if (winsB >= config.setsToWinMatch) return 'B';
      return null;
    },

    isMatchFinished(sets): boolean {
      return this.getMatchWinner(sets) !== null;
    },

    getConfig: () => config,
  };
}

/** Матч с полем variant для получения правил (минимальный контракт для getRules) */
export interface MatchWithVariant {
  variant?: string;
  [key: string]: unknown;
}

export function getRules(match: MatchWithVariant | null | undefined): VolleyballRules {
  const variant = match?.variant ?? VARIANTS.INDOOR;
  const config = RULES_CONFIGS[variant] ?? RULES_CONFIGS[VARIANTS.INDOOR];
  return createRules(config);
}

export function getSetNumbers(match: MatchWithVariant | null | undefined): number[] {
  const config = getRules(match).getConfig();
  return Array.from({ length: config.maxSets }, (_, i) => i + 1);
}

export function isDecidingSet(setNumber: number, match: MatchWithVariant | null | undefined): boolean {
  return getRules(match).getConfig().decidingSetNumber === setNumber;
}

export { RULES_CONFIGS, VARIANTS };
