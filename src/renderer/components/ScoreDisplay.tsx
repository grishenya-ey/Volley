import { memo } from 'react';
import { space, radius } from '../theme/tokens';

const TEAM_BLOCK_WIDTH = 200;
const SCORE_BADGE_BLOCK_MIN_HEIGHT = '4.5rem';
const TEAM_NAME_FONT_SIZE = '0.875rem';

export interface ScoreDisplayProps {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  servingTeam: 'A' | 'B';
  teamAColor?: string;
  teamBColor?: string;
  isSetball?: boolean;
  setballTeam?: 'A' | 'B' | null;
  isMatchball?: boolean;
  matchballTeam?: 'A' | 'B' | null;
  teamALogo?: string | null;
  teamBLogo?: string | null;
}

const ScoreDisplay = memo(function ScoreDisplay({
  teamA,
  teamB,
  scoreA,
  scoreB,
  servingTeam,
  isSetball = false,
  setballTeam = null,
  isMatchball = false,
  matchballTeam = null,
  teamALogo = null,
  teamBLogo = null,
}: ScoreDisplayProps) {
  const isServingA = servingTeam === 'A';
  const isServingB = servingTeam === 'B';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      fontSize: '2rem',
      fontWeight: 'bold',
      padding: space.md,
      position: 'relative',
    }}>
      {teamALogo && (
        <div style={{
          width: '120px',
          height: '120px',
          minWidth: '120px',
          minHeight: '120px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-surface)',
          borderRadius: radius.md,
          padding: space.sm,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <img
            src={teamALogo}
            alt={teamA}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      <div style={{
        textAlign: 'center',
        color: 'var(--color-text)',
        position: 'relative',
        width: TEAM_BLOCK_WIDTH,
        minWidth: TEAM_BLOCK_WIDTH,
        maxWidth: TEAM_BLOCK_WIDTH,
        padding: space.sm,
        borderRadius: radius.sm,
        border: isServingA ? '2px solid var(--color-serving-border)' : '2px solid transparent',
        boxSizing: 'border-box',
      }}>
        <div style={{ marginBottom: space.xs }}>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            maxWidth: '100%',
            fontSize: TEAM_NAME_FONT_SIZE,
          }}>
            {teamA}
          </span>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: space.xs,
          minHeight: SCORE_BADGE_BLOCK_MIN_HEIGHT,
        }}>
          <span style={{ fontSize: '3rem' }}>{scoreA}</span>
          {((isMatchball && matchballTeam === 'A') || (isSetball && setballTeam === 'A' && !isMatchball)) ? (
            <span style={{
              padding: '2px 8px',
              backgroundColor: isMatchball ? 'var(--color-danger)' : 'var(--color-warning)',
              color: 'white',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              letterSpacing: '0.02em',
            }}>
              {isMatchball ? 'Матчбол' : 'Сетбол'}
            </span>
          ) : (
            <span style={{ minHeight: '1.25rem', display: 'block' }} aria-hidden="true" />
          )}
        </div>
      </div>

      <div style={{ fontSize: '2rem', flexShrink: 0 }}>:</div>

      <div style={{
        textAlign: 'center',
        color: 'var(--color-text)',
        position: 'relative',
        width: TEAM_BLOCK_WIDTH,
        minWidth: TEAM_BLOCK_WIDTH,
        maxWidth: TEAM_BLOCK_WIDTH,
        padding: space.sm,
        borderRadius: radius.sm,
        border: isServingB ? '2px solid var(--color-serving-border)' : '2px solid transparent',
        boxSizing: 'border-box',
      }}>
        <div style={{ marginBottom: space.xs }}>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            maxWidth: '100%',
            fontSize: TEAM_NAME_FONT_SIZE,
          }}>
            {teamB}
          </span>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: space.xs,
          minHeight: SCORE_BADGE_BLOCK_MIN_HEIGHT,
        }}>
          <span style={{ fontSize: '3rem' }}>{scoreB}</span>
          {((isMatchball && matchballTeam === 'B') || (isSetball && setballTeam === 'B' && !isMatchball)) ? (
            <span style={{
              padding: '2px 8px',
              backgroundColor: isMatchball ? 'var(--color-danger)' : 'var(--color-warning)',
              color: 'white',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              letterSpacing: '0.02em',
            }}>
              {isMatchball ? 'Матчбол' : 'Сетбол'}
            </span>
          ) : (
            <span style={{ minHeight: '1.25rem', display: 'block' }} aria-hidden="true" />
          )}
        </div>
      </div>

      {teamBLogo && (
        <div style={{
          width: '120px',
          height: '120px',
          minWidth: '120px',
          minHeight: '120px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-surface)',
          borderRadius: radius.md,
          padding: space.sm,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <img
            src={teamBLogo}
            alt={teamB}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      )}
    </div>
  );
});

export default ScoreDisplay;
