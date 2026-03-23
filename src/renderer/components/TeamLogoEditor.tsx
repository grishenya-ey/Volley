import { resizeImage } from '../utils/imageResize';
import type { Match } from '../../shared/types/Match';
import { radius } from '../theme/tokens';

export interface TeamLogoEditorProps {
  /** Объект команды из match (teamA или teamB) */
  team: { logo?: string; logoBase64?: string; logoPath?: string };
  teamLetter: 'A' | 'B';
  match: Match;
  /** Колбэк с обновлённым матчом после загрузки/удаления логотипа. Родитель сохраняет в state, Electron и при необходимости обновляет vMix. */
  onMatchChange: (updatedMatch: Match) => void | Promise<void>;
}

/**
 * Редактор логотипа команды: превью, загрузка/изменение, удаление.
 * Переиспользуется на страницах «Настройки матча» и «Управление составами».
 */
function TeamLogoEditor({ team, teamLetter, match, onMatchChange }: TeamLogoEditorProps) {
  const logoSrc = team?.logo || (team as { logoBase64?: string })?.logoBase64;
  const teamLabel = teamLetter === 'A' ? 'А' : 'Б';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        const resizedBase64 = await resizeImage(base64, 240);

        if (window.electronAPI?.saveLogoToFile) {
          const result = await window.electronAPI.saveLogoToFile(teamLetter, resizedBase64);
          if (result.success) {
            const teamKey = teamLetter === 'A' ? 'teamA' : 'teamB';
            const updatedMatch: Match = {
              ...match,
              [teamKey]: {
                ...match[teamKey],
                logo: resizedBase64,
                logoBase64: result.logoBase64,
                logoPath: result.logoPath,
              },
              updatedAt: new Date().toISOString(),
            };
            await onMatchChange(updatedMatch);
          } else {
            throw new Error(result.error || 'Ошибка при сохранении логотипа');
          }
        } else {
          const teamKey = teamLetter === 'A' ? 'teamA' : 'teamB';
          const updatedMatch: Match = {
            ...match,
            [teamKey]: {
              ...match[teamKey],
              logo: resizedBase64,
            },
            updatedAt: new Date().toISOString(),
          };
          await onMatchChange(updatedMatch);
        }
      } catch (error) {
        console.error('Ошибка при обработке изображения:', error);
        await window.electronAPI?.showMessage?.({ message: 'Ошибка при загрузке изображения: ' + (error as Error).message });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDelete = async () => {
    if (window.electronAPI?.deleteLogo) {
      await window.electronAPI.deleteLogo(teamLetter);
    }
    const teamKey = teamLetter === 'A' ? 'teamA' : 'teamB';
    const updatedMatch: Match = {
      ...match,
      [teamKey]: {
        ...match[teamKey],
        logo: undefined,
        logoBase64: undefined,
        logoPath: undefined,
      },
      updatedAt: new Date().toISOString(),
    };
    await onMatchChange(updatedMatch);
  };

  return (
    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
        Логотип команды
      </label>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {logoSrc && (
          <img
            src={logoSrc}
            alt={`Логотип команды ${teamLabel}`}
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'contain',
              backgroundColor: 'white',
              padding: '0.5rem',
              borderRadius: radius.sm,
              border: '1px solid var(--color-border)',
            }}
          />
        )}
        <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
          <label
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              borderRadius: radius.sm,
              cursor: 'pointer',
              display: 'inline-block',
              textAlign: 'center',
            }}
          >
            {logoSrc ? 'Изменить' : 'Загрузить'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
          {logoSrc && (
            <button
              type="button"
              onClick={handleDelete}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--color-danger)',
                color: 'white',
                border: 'none',
                borderRadius: radius.sm,
                cursor: 'pointer',
              }}
            >
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamLogoEditor;
