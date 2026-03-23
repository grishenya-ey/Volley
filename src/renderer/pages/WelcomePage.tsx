import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { space, radius, typography } from '../theme/tokens';
import Button from '../components/Button';

function WelcomePage() {
  const navigate = useNavigate();
  const [vmixStatus, setVMixStatus] = useState({
    connected: false,
    message: 'Не подключено',
  });

  useEffect(() => {
    checkVMixStatus();
    // Проверяем статус vMix каждые 5 секунд
    const interval = setInterval(checkVMixStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkVMixStatus = async () => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const config = await window.electronAPI.getVMixConfig();
      if (config) {
        // Статус только из сохранённых настроек (Подключить/Отключить), без проверки по сети
        const connected = config.connectionState === 'connected';
        setVMixStatus({
          connected,
          message: connected ? 'Подключено' : 'Не подключено',
        });
      }
    } catch (error) {
      console.error('Ошибка при проверке статуса vMix:', error);
    }
  };

  const handleCreateMatch = async () => {
    try {
      if (!window.electronAPI) {
        return;
      }

      const match = await window.electronAPI.createMatch();
      if (!match) {
        await window.electronAPI.showMessage({ message: 'Не удалось создать матч: матч не был создан' });
        return;
      }
      navigate('/match', { state: { match } });
    } catch (error) {
      console.error('Ошибка при создании матча:', error);
      await window.electronAPI?.showMessage?.({ message: 'Не удалось создать матч: ' + (error instanceof Error ? error.message : String(error)) });
    }
  };

  const handleOpenMatch = async () => {
    try {
      if (!window.electronAPI) {
        return;
      }

      const match = await window.electronAPI.openMatchDialog();
      if (match) {
        navigate('/match', { state: { match } });
      }
    } catch (error) {
      console.error('Ошибка при открытии матча:', error);
      await window.electronAPI?.showMessage?.({ message: 'Не удалось открыть матч: ' + (error instanceof Error ? error.message : String(error)) });
    }
  };

  return (
    <div style={{
      maxWidth: '700px',
      margin: '0 auto',
      padding: space.xl,
    }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: typography.h1, marginBottom: space.sm, color: 'var(--color-text)' }}>
          vMix Volley Scoreboard
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)' }}>
          Управление счетом волейбольных матчей
        </p>
      </div>

      <div style={{
        backgroundColor: 'var(--color-surface-muted)',
        padding: space.lg,
        borderRadius: radius.md,
        marginBottom: space.xl,
      }}>
        <h3 style={{ marginTop: 0 }}>Статус подключения</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: vmixStatus.connected ? 'var(--color-success)' : 'var(--color-danger)',
          }} />
          <span>
            <strong>vMix:</strong> {vmixStatus.message}
          </span>
        </div>
        {!vmixStatus.connected && (
          <p style={{ marginTop: space.sm, fontSize: typography.small, color: 'var(--color-text-secondary)' }}>
            Настройте подключение к vMix в настройках приложения
          </p>
        )}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: space.md,
        marginBottom: space.xl,
      }}>
        <Button
          variant="primary"
          onClick={handleCreateMatch}
          style={{
            padding: `${space.lg} ${space.xl}`,
            fontSize: '1.2rem',
            borderRadius: radius.md,
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(52, 152, 219, 0.3)',
            transition: 'transform 0.1s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          ➕ Создать новый матч
        </Button>
        <Button
          variant="secondary"
          onClick={handleOpenMatch}
          style={{
            padding: `${space.lg} ${space.xl}`,
            fontSize: '1.2rem',
            borderRadius: radius.md,
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(149, 165, 166, 0.3)',
            transition: 'transform 0.1s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          📂 Открыть существующий матч
        </Button>
      </div>

      <div style={{
        backgroundColor: 'var(--color-surface-muted)',
        padding: space.md,
        borderRadius: radius.md,
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
      }}>
        <h4 style={{ marginTop: 0, color: 'var(--color-text)' }}>Быстрый старт:</h4>
        <ol style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8', color: 'var(--color-text)' }}>
          <li>Создайте новый матч или откройте существующий</li>
          <li>Настройте параметры матча (команды, турнир, место)</li>
          <li>Настройте подключение к vMix (если используется)</li>
          <li>Начните ведение счета</li>
        </ol>
      </div>
    </div>
  );
}

export default WelcomePage;


