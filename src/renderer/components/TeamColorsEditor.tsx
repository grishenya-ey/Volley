import Button from './Button';
import { radius } from '../theme/tokens';

export interface TeamColorsEditorProps {
  color: string;
  liberoColor: string;
  colorPlaceholder?: string;
  onChange: (values: { color?: string; liberoColor?: string }) => void;
}

/**
 * Редактор цветов формы команды: основной состав и либеро.
 * Переиспользуется на страницах «Настройки матча» и «Управление составами».
 */
function TeamColorsEditor({
  color,
  liberoColor,
  colorPlaceholder = '#3498db',
  onChange,
}: TeamColorsEditorProps) {
  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    fontSize: '1rem',
    border: '1px solid var(--color-border)',
    borderRadius: radius.sm,
  };
  const colorPickerStyle = {
    width: '60px',
    height: '40px',
    border: '1px solid var(--color-border)',
    borderRadius: radius.sm,
    cursor: 'pointer' as const,
  };

  const handleSwapColors = () => {
    onChange({ color: liberoColor || '', liberoColor: color || '' });
  };

  // input type="color" требует формат #rrggbb; при пустом значении используем fallback только для отображения пикера
  const COLOR_PICKER_FALLBACK = '#ffffff';

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div style={{ minWidth: '140px', flex: '1 1 0' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Цвет формы игроков
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="color"
            value={color || COLOR_PICKER_FALLBACK}
            onChange={(e) => onChange({ color: e.target.value })}
            style={colorPickerStyle}
            aria-label="Цвет формы игроков"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => onChange({ color: e.target.value })}
            style={{ flex: 1, minWidth: 0, ...inputStyle }}
            placeholder="Не указан"
          />
        </div>
      </div>
      <div style={{ minWidth: '140px', flex: '1 1 0' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Цвет формы либеро
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="color"
            value={liberoColor || COLOR_PICKER_FALLBACK}
            onChange={(e) => onChange({ liberoColor: e.target.value })}
            style={colorPickerStyle}
            aria-label="Цвет формы либеро"
          />
          <input
            type="text"
            value={liberoColor || ''}
            onChange={(e) => onChange({ liberoColor: e.target.value })}
            style={{ flex: 1, minWidth: 0, ...inputStyle }}
            placeholder="Не указан"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={handleSwapColors}
        aria-label="Поменять местами цвет формы игроков и цвет формы либеро"
      >
        Поменять цвета
      </Button>
    </div>
  );
}

export default TeamColorsEditor;
