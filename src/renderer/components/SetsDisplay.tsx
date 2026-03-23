import { memo, type ReactNode } from 'react';
import type { Set, CurrentSet } from '../../shared/types/Match';
import type { Match } from '../../shared/types/Match';
import { SET_STATUS } from '../../shared/types/Match';
import { formatDuration } from '../../shared/timeUtils';
import { SetDomain } from '../../shared/domain/SetDomain';
import { getSetNumbers, isDecidingSet } from '../../shared/volleyballRules';
import { space, radius } from '../theme/tokens';

export interface SetsDisplayProps {
  sets: Set[];
  currentSet: CurrentSet;
  match: Match | null;
  onSetClick?: (setNumber: number) => void;
}

function SetsDisplay({
  sets,
  currentSet,
  match,
  onSetClick,
}: SetsDisplayProps) {
  const setNumbers = match ? getSetNumbers(match) : [1, 2, 3, 4, 5];
  return (
    <div style={{
      backgroundColor: 'var(--color-surface-muted)',
      padding: space.md,
      borderRadius: radius.sm,
      marginBottom: space.md,
    }}>
      <h3 style={{ marginTop: 0 }}>Счет по партиям:</h3>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${setNumbers.length}, 1fr)`, gap: space.sm }}>
        {setNumbers.map((setNum) => {
          const set = sets.find(s => s.setNumber === setNum);
          const isCurrent = SetDomain.isCurrentSet(setNum, currentSet);
          const isCompleted = set ? SetDomain.isCompleted(set) : false;
          const isInProgress = isCurrent && currentSet.status === SET_STATUS.IN_PROGRESS && !isCompleted;

          let backgroundColor: string;
          let color: string;
          let content: ReactNode;
          const canEdit = isCompleted || isInProgress;

          if (isCompleted && set) {
            backgroundColor = 'var(--color-success)';
            color = 'white';
            const duration = (set.duration != null) ? formatDuration(set.duration) : '';
            const setLabel = match && isDecidingSet(setNum, match)
              ? `Партия ${setNum} (решающая)`
              : `Партия ${setNum}`;
            content = (
              <>
                <div style={{ fontSize: '0.8rem' }}>{setLabel}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {set.scoreA} - {set.scoreB}
                </div>
                {duration && (
                  <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                    {duration}
                  </div>
                )}
              </>
            );
          } else if (isInProgress) {
            backgroundColor = 'var(--color-primary)';
            color = 'white';
            const setLabelInProgress = match && isDecidingSet(setNum, match)
              ? `Партия ${setNum} (решающая)`
              : `Партия ${setNum}`;
            content = (
              <>
                <div style={{ fontSize: '0.8rem' }}>{setLabelInProgress}</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>В игре</div>
                <div style={{ fontSize: '1rem' }}>
                  {currentSet.scoreA} - {currentSet.scoreB}
                </div>
              </>
            );
          } else {
            backgroundColor = 'var(--color-disabled)';
            color = 'var(--color-text-secondary)';
            const setLabelPending = match && isDecidingSet(setNum, match)
              ? `Партия ${setNum} (решающая)`
              : `Партия ${setNum}`;
            content = (
              <>
                <div style={{ fontSize: '0.8rem' }}>{setLabelPending}</div>
                <div style={{ fontSize: '1.2rem' }}>-</div>
              </>
            );
          }

          return (
            <div
              key={setNum}
              onClick={() => canEdit && onSetClick?.(setNum)}
              style={{
                padding: space.sm,
                backgroundColor,
                color,
                borderRadius: radius.sm,
                textAlign: 'center',
                cursor: (canEdit && onSetClick) ? 'pointer' : 'default',
                transition: 'opacity 0.2s',
                opacity: canEdit ? 1 : 0.7,
              }}
              onMouseEnter={(e) => {
                if (canEdit && onSetClick) {
                  e.currentTarget.style.opacity = '0.8';
                }
              }}
              onMouseLeave={(e) => {
                if (canEdit && onSetClick) {
                  e.currentTarget.style.opacity = '1';
                } else {
                  e.currentTarget.style.opacity = '0.7';
                }
              }}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function areEqual(prevProps: SetsDisplayProps, nextProps: SetsDisplayProps): boolean {
  if (prevProps.match?.variant !== nextProps.match?.variant) {
    return false;
  }
  if (prevProps.sets.length !== nextProps.sets.length) {
    return false;
  }

  const prevSetsMap = new Map(prevProps.sets.map(s => [s.setNumber, s]));
  const nextSetsMap = new Map(nextProps.sets.map(s => [s.setNumber, s]));
  const allSetNumbers = new Set([
    ...prevProps.sets.map(s => s.setNumber),
    ...nextProps.sets.map(s => s.setNumber)
  ]);

  for (const setNumber of allSetNumbers) {
    const prevSet = prevSetsMap.get(setNumber);
    const nextSet = nextSetsMap.get(setNumber);
    if (!prevSet || !nextSet) {
      return false;
    }
    if (prevSet.setNumber !== nextSet.setNumber ||
        prevSet.scoreA !== nextSet.scoreA ||
        prevSet.scoreB !== nextSet.scoreB ||
        prevSet.status !== nextSet.status ||
        prevSet.completed !== nextSet.completed) {
      return false;
    }
  }

  if (prevProps.currentSet.setNumber !== nextProps.currentSet.setNumber ||
      prevProps.currentSet.status !== nextProps.currentSet.status ||
      prevProps.currentSet.scoreA !== nextProps.currentSet.scoreA ||
      prevProps.currentSet.scoreB !== nextProps.currentSet.scoreB) {
    return false;
  }

  return true;
}

export default memo(SetsDisplay, areEqual);
