import { space, radius, typography } from '../theme/tokens';
import Button from './Button';

export interface ConnectionStatus {
  connected: boolean;
  message: string;
}

export interface VMixOverlayButtonsProps {
  vmixConfig: {
    inputOrder?: string[];
    inputs?: Record<string, { displayName?: string; enabled?: boolean }>;
  } | null;
  connectionStatus: ConnectionStatus;
  onShowOverlay: (inputKey: string, buttonKey?: string | null) => Promise<{ success: boolean; error?: string }>;
  onHideOverlay: (inputKey: string) => Promise<{ success: boolean; error?: string }>;
  isOverlayActive: (inputKey: string, buttonKey?: string | null) => boolean;
  /** Если другая плашка того же vMix-инпута в эфире — блокирует кнопку «Показать». */
  isAnotherOverlayOnAirForSameInput?: (inputKey: string) => boolean;
}

export default function VMixOverlayButtons({
  vmixConfig,
  connectionStatus,
  onShowOverlay,
  onHideOverlay,
  isOverlayActive,
  isAnotherOverlayOnAirForSameInput,
}: VMixOverlayButtonsProps) {
  const handleButtonClick = async (buttonConfig: { key: string; inputKey: string }) => {
    const buttonKey = buttonConfig.key;
    const inputKey = buttonConfig.inputKey || buttonKey;
    const isActive = isOverlayActive(inputKey, buttonKey);

    if (isActive) {
      const result = await onHideOverlay(inputKey);
      if (result && !result.success) {
        console.error("Ошибка при скрытии оверлея:", result.error);
      }
    } else {
      const result = await onShowOverlay(inputKey, buttonKey);
      if (result && !result.success) {
        console.error("Ошибка при показе оверлея:", result.error);
      }
    }
  };

  if (!vmixConfig) {
    return (
      <div
        style={{
          padding: space.md,
          backgroundColor: 'var(--color-surface-muted)',
          borderRadius: radius.sm,
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        Настройки vMix не загружены. Настройте подключение в настройках vMix.
      </div>
    );
  }

  const inputOrder = Array.isArray(vmixConfig?.inputOrder) ? vmixConfig.inputOrder : [];
  const dynamicButtons = inputOrder
    .map((id) => {
      const input = vmixConfig?.inputs?.[id];
      if (!input || input.displayName == null) return null;
      return { key: id, label: input.displayName, inputKey: id };
    })
    .filter((x): x is { key: string; label: string; inputKey: string } => Boolean(x));

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-muted)',
        padding: space.md,
        borderRadius: radius.sm,
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: space.md }}>
        Управление плашками vMix
      </h3>
      {dynamicButtons.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: space.sm,
          }}
        >
          {dynamicButtons.map((btn) => {
            const active = isOverlayActive(btn.inputKey, btn.key);
            const inputConfig = vmixConfig?.inputs?.[btn.inputKey];
            const isInputEnabled = inputConfig && inputConfig.enabled !== false;
            const isVMixConnected = connectionStatus.connected;
            const anotherOnAir = isAnotherOverlayOnAirForSameInput?.(btn.inputKey) === true;
            const disabled =
              !isVMixConnected ||
              !isInputEnabled ||
              (anotherOnAir && !active);
            const tooltipText = disabled
              ? !isVMixConnected
                ? 'vMix не подключен'
                : !isInputEnabled
                  ? 'Инпут отключен в настройках'
                  : 'Другая плашка этого инпута в эфире'
              : active
                ? 'Скрыть плашку'
                : 'Показать плашку';
            return (
              <Button
                key={btn.key}
                type="button"
                variant={active ? 'success' : disabled ? 'secondary' : 'primary'}
                disabled={disabled}
                onClick={() => handleButtonClick({ key: btn.key, inputKey: btn.inputKey })}
                title={tooltipText}
                style={{
                  fontSize: typography.small,
                  fontWeight: active ? 'bold' : 'normal',
                  position: 'relative',
                  opacity: disabled && !isVMixConnected ? 0.6 : disabled ? 0.5 : 1,
                }}
              >
                {btn.label}
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '4px',
                      fontSize: '0.8rem',
                    }}
                  >
                    ✓
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      ) : (
        <p
          style={{
            margin: 0,
            color: 'var(--color-text-secondary)',
            fontSize: typography.small,
          }}
        >
          Добавьте инпуты в настройках vMix (раздел «Настройка инпутов»).
        </p>
      )}
    </div>
  );
}
