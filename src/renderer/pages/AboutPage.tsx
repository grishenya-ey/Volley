import { useState, useEffect } from 'react';
import Button from '../components/Button';
import { space, radius } from '../theme/tokens';

function AboutPage() {
  const [version, setVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateData, setUpdateData] = useState<{ version?: string; releaseDate?: string } | null>(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);

  useEffect(() => {
    loadVersion();
    loadAutoUpdateSettings();
    const cleanup = setupUpdateListeners();
    
    return () => {
      // Очистка слушателей при размонтировании
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const loadVersion = async () => {
    try {
      if (window.electronAPI) {
        const appVersion = await window.electronAPI.getVersion();
        setVersion(appVersion);
      }
    } catch (error) {
      console.error('Ошибка при загрузке версии:', error);
    }
  };

  const loadAutoUpdateSettings = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getAutoUpdateSettings) {
        const result = await window.electronAPI.getAutoUpdateSettings();
        if (result.success) {
          setAutoUpdateEnabled(result.enabled);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек автообновлений:', error);
    }
  };

  const handleToggleAutoUpdate = async (enabled: boolean) => {
    try {
      if (window.electronAPI && window.electronAPI.setAutoUpdateSettings) {
        const result = await window.electronAPI.setAutoUpdateSettings(enabled);
        if (result.success) {
          setAutoUpdateEnabled(enabled);
        } else {
          console.error('Ошибка при сохранении настроек автообновлений:', result.error);
        }
      }
    } catch (error) {
      console.error('Ошибка при изменении настроек автообновлений:', error);
    }
  };

  const setupUpdateListeners = () => {
    if (!window.electronAPI || !window.electronAPI.onUpdateStatus) {
      return;
    }

    const cleanup = window.electronAPI.onUpdateStatus((statusData) => {
      setUpdateStatus(statusData.status);
      setUpdateData(statusData.data);
    });

    // Возвращаем функцию очистки для useEffect
    return cleanup;
  };

  const handleCheckForUpdates = async () => {
    try {
      if (window.electronAPI && window.electronAPI.checkForUpdates) {
        setUpdateStatus('checking');
        await window.electronAPI.checkForUpdates();
      }
    } catch (error) {
      console.error('Ошибка при проверке обновлений:', error);
      setUpdateStatus('error');
      setUpdateData({ message: error.message });
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      if (window.electronAPI && window.electronAPI.downloadUpdate) {
        await window.electronAPI.downloadUpdate();
      }
    } catch (error) {
      console.error('Ошибка при загрузке обновления:', error);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      if (window.electronAPI && window.electronAPI.installUpdate) {
        await window.electronAPI.installUpdate();
      }
    } catch (error) {
      console.error('Ошибка при установке обновления:', error);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>О программе</h2>
      
      <div style={{
        backgroundColor: 'var(--color-surface-muted)',
        padding: '2rem',
        borderRadius: '8px',
        marginTop: '2rem',
      }}>
        <h3 style={{ marginTop: 0 }}>vMix Volley Scoreboard</h3>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          Приложение для управления счетом в волейбольных турнирах с интеграцией vMix
        </p>
        
        {version && (
          <p><strong>Версия:</strong> {version}</p>
        )}

        {/* Компонент управления обновлениями */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: 'var(--color-surface)', 
          borderRadius: radius.sm,
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: 0 }}>Обновления</h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoUpdateEnabled}
                onChange={(e) => handleToggleAutoUpdate(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.9rem' }}>Автоматическая проверка при запуске</span>
            </label>
          </div>
          
          {!autoUpdateEnabled && updateStatus !== 'checking' && updateStatus !== 'downloading' && updateStatus !== 'downloaded' && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              Автоматические обновления отключены. Вы можете проверить обновления вручную.
            </p>
          )}
          
          {updateStatus === 'disabled' && (
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Автоматические обновления отключены
            </p>
          )}
          
          {updateStatus === 'checking' && (
            <p style={{ color: 'var(--color-primary)' }}>Проверка обновлений...</p>
          )}
          
          {updateStatus === 'available' && updateData && (
            <div>
              <p style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>
                Доступна новая версия: {updateData.version}
              </p>
              {updateData.releaseNotes && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.5rem', 
                  backgroundColor: 'var(--color-surface-muted)', 
                  borderRadius: radius.sm,
                  fontSize: '0.9rem'
                }}>
                  <strong>Что нового:</strong>
                  <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                    {updateData.releaseNotes}
                  </div>
                </div>
              )}
              <Button
                variant="primary"
                onClick={handleDownloadUpdate}
                style={{ marginTop: '1rem', fontSize: '0.9rem' }}
              >
                Скачать обновление
              </Button>
            </div>
          )}
          
          {updateStatus === 'downloading' && updateData && (
            <div>
              <p style={{ color: 'var(--color-primary)' }}>Загрузка обновления...</p>
              <div style={{
                marginTop: '0.5rem',
                width: '100%',
                height: '20px',
                backgroundColor: 'var(--color-surface-muted)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${updateData.percent || 0}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-primary)',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {updateData.percent || 0}%
                </div>
              </div>
              {updateData.transferred && updateData.total && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                  {Math.round(updateData.transferred / 1024 / 1024)} МБ / {Math.round(updateData.total / 1024 / 1024)} МБ
                </p>
              )}
            </div>
          )}
          
          {updateStatus === 'downloaded' && updateData && (
            <div>
              <p style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>
                Обновление {updateData.version} загружено и готово к установке
              </p>
              <Button
                variant="success"
                onClick={handleInstallUpdate}
                style={{ marginTop: '1rem', fontSize: '0.9rem' }}
              >
                Установить сейчас
              </Button>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                Приложение будет перезапущено для установки обновления
              </p>
            </div>
          )}
          
          {updateStatus === 'not-available' && (
            <div>
              {updateData?.message ? (
                <div>
                  <p style={{ color: 'var(--color-warning)', fontWeight: 'bold' }}>
                    {updateData.message}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                    Вы можете проверить наличие обновлений на{' '}
                    <a 
                      href="https://github.com/ivmoiseev/vmix-volley-scoreboard/releases" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      странице релизов GitHub
                    </a>
                  </p>
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  У вас установлена последняя версия приложения
                </p>
              )}
            </div>
          )}
          
          {updateStatus === 'error' && updateData && (
            <p style={{ color: 'var(--color-danger)' }}>
              Ошибка: {updateData.message || 'Не удалось проверить обновления'}
            </p>
          )}
          
          {(!updateStatus || updateStatus === 'not-available' || updateStatus === 'error' || updateStatus === 'disabled') && (
            <Button
              variant="secondary"
              onClick={handleCheckForUpdates}
              style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}
            >
              Проверить обновления
            </Button>
          )}
        </div>
        
        <div style={{ marginTop: '2rem' }}>
          <h4>Основные возможности:</h4>
          <ul style={{ lineHeight: '1.8' }}>
            <li>Ведение счета матча с автоматическим учетом подачи</li>
            <li>Определение сетбола и матчбола по правилам ВФВ</li>
            <li>Расширенная статистика (опционально)</li>
            <li>Управление составами команд с логотипами</li>
            <li>Интеграция с vMix для отображения плашек</li>
            <li>Мобильный доступ через Wi-Fi</li>
            <li>Сохранение матчей в JSON формате</li>
          </ul>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h4>Техническая информация:</h4>
          <ul style={{ lineHeight: '1.8' }}>
            <li><strong>Платформа:</strong> Electron</li>
            <li><strong>Интерфейс:</strong> React</li>
            <li><strong>Сервер:</strong> Express</li>
            <li><strong>Формат данных:</strong> JSON</li>
          </ul>
        </div>

        <div style={{ marginTop: space.xl, padding: space.md, backgroundColor: 'var(--color-surface)', borderRadius: radius.sm }}>
          <h4>Лицензия:</h4>
          <p>См. файл LICENSE в корне проекта</p>
        </div>

        <div style={{ marginTop: space.xl, padding: space.md, backgroundColor: 'var(--color-surface)', borderRadius: radius.sm }}>
          <h4>Автор:</h4>
          <p style={{ lineHeight: '1.8' }}>
            <strong>Илья Моисеев</strong><br />
            Волгоград, Россия<br />
            <a href="mailto:ilyamoiseev@inbox.ru" style={{ color: 'var(--color-primary)' }}>ilyamoiseev@inbox.ru</a><br />
            <a href="https://webcastmaster.ru" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>webcastmaster.ru</a>
          </p>
        </div>

        <div style={{ marginTop: space.xl, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p>© {new Date().getFullYear()} vMix Volley Scoreboard</p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;

