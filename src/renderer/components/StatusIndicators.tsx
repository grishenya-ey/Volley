import { memo } from 'react';
import { space, radius } from '../theme/tokens';

export interface StatusIndicatorsProps {
  isSetball?: boolean;
  isMatchball?: boolean;
}

const StatusIndicators = memo(function StatusIndicators({ isSetball, isMatchball }: StatusIndicatorsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: space.md,
      justifyContent: 'center',
      marginBottom: space.md,
    }}>
      {isSetball && (
        <div style={{
          padding: `${space.sm} ${space.md}`,
          backgroundColor: 'var(--color-warning)',
          color: 'white',
          borderRadius: radius.sm,
          fontWeight: 'bold',
        }}>
          СЕТБОЛ
        </div>
      )}
      {isMatchball && (
        <div style={{
          padding: `${space.sm} ${space.md}`,
          backgroundColor: 'var(--color-danger)',
          color: 'white',
          borderRadius: radius.sm,
          fontWeight: 'bold',
        }}>
          МАТЧБОЛ
        </div>
      )}
    </div>
  );
});

export default StatusIndicators;
