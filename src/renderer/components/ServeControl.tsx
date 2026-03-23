import { space, radius } from '../theme/tokens';
import Button from './Button';

export interface ServeControlProps {
  servingTeam: 'A' | 'B';
  teamAName: string;
  teamBName: string;
  onChange: (team: 'A' | 'B') => void;
}

export default function ServeControl({ servingTeam, teamAName, teamBName, onChange }: ServeControlProps) {
  const servingTeamName = servingTeam === 'A' ? teamAName : teamBName;
  const isLeftDisabled = servingTeam === 'A';
  const isRightDisabled = servingTeam === 'B';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.md,
      padding: space.sm,
      backgroundColor: 'var(--color-surface-muted)',
      borderRadius: radius.sm,
      marginBottom: space.md,
    }}>
      <span>Подача:</span>
      <span
        style={{
          padding: `${space.xs} ${space.sm}`,
          backgroundColor: 'var(--color-serving-badge)',
          color: 'white',
          borderRadius: radius.sm,
          fontWeight: 'bold',
          fontSize: '0.9rem',
        }}
      >
        {servingTeamName}
      </span>
      <Button
        variant="primary"
        onClick={() => !isLeftDisabled && onChange('A')}
        disabled={isLeftDisabled}
        style={{ padding: `${space.xs} ${space.sm}` }}
        title={isLeftDisabled ? 'Команда A уже подает' : 'Передать подачу команде A'}
        aria-label={isLeftDisabled ? 'Команда A уже подает' : 'Передать подачу команде A'}
      >
        ◄
      </Button>
      <Button
        variant="primary"
        onClick={() => !isRightDisabled && onChange('B')}
        disabled={isRightDisabled}
        style={{ padding: `${space.xs} ${space.sm}` }}
        title={isRightDisabled ? 'Команда B уже подает' : 'Передать подачу команде B'}
        aria-label={isRightDisabled ? 'Команда B уже подает' : 'Передать подачу команде B'}
      >
        ►
      </Button>
    </div>
  );
}
