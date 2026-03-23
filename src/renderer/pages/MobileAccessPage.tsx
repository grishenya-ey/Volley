import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHeaderButtons } from '../components/Layout';
// ИСПРАВЛЕНИЕ: Используем qrcode.react вместо qrcode
// qrcode.react - это React-компонент, который работает в браузере и совместим с Vite production сборкой
// Он не имеет проблем с минификацией, в отличие от библиотеки qrcode
import { QRCodeCanvas } from 'qrcode.react';
import Button from '../components/Button';
import { space, radius } from '../theme/tokens';

function MobileAccessPage() {
  const navigate = useNavigate();
  const { setButtons } = useHeaderButtons();
  const [serverInfo, setServerInfo] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null); // URL для генерации QR-кода
  const [loading, setLoading] = useState(false);
  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [selectedIP, setSelectedIP] = useState(null);
  const [savingIP, setSavingIP] = useState(false);
  const sessionLoadedRef = useRef(false);

  useEffect(() => {
    loadServerInfo();
    loadNetworkInterfaces();
    // Обновляем информацию о сервере каждые 2 секунды
    const interval = setInterval(() => {
      loadServerInfo();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Загружаем выбранный IP из настроек при изменении serverInfo
  useEffect(() => {
    if (serverInfo && serverInfo.selectedIP !== undefined) {
      setSelectedIP(serverInfo.selectedIP);
    } else if (serverInfo && serverInfo.ip) {
      // Если нет сохраненного выбранного IP, используем текущий IP
      setSelectedIP(serverInfo.ip);
    }
  }, [serverInfo]);

  // Проверяем, что выбранный IP есть в списке интерфейсов при загрузке списка
  useEffect(() => {
    const isServerRunning = serverInfo && serverInfo.running !== false;
    
    if (networkInterfaces.length > 0 && selectedIP) {
      const found = networkInterfaces.find(iface => iface.ip === selectedIP);
      if (!found) {
        // Если выбранный IP не найден в списке, показываем предупреждение
        // и выбираем первый доступный в выпадающем списке (без автоматического сохранения)
        console.warn('Выбранный IP не найден в списке интерфейсов');
        const firstInterface = networkInterfaces.find(iface => !iface.isVpn) || networkInterfaces[0];
        if (firstInterface && !isServerRunning) {
          // Только если сервер не запущен, обновляем выбор в UI
          setSelectedIP(firstInterface.ip);
        }
      }
    } else if (networkInterfaces.length > 0 && !selectedIP && !isServerRunning) {
      // Если нет выбранного IP и сервер не запущен, выбираем первый доступный (не VPN)
      const firstInterface = networkInterfaces.find(iface => !iface.isVpn) || networkInterfaces[0];
      if (firstInterface) {
        setSelectedIP(firstInterface.ip);
      }
    }
  }, [networkInterfaces, selectedIP, serverInfo]);

  // Загружаем сохраненную сессию при изменении состояния сервера
  useEffect(() => {
    if (serverInfo && serverInfo.running !== false && !sessionData && !sessionLoadedRef.current) {
      loadSavedSession();
    }
  }, [serverInfo, sessionData]);

  const loadServerInfo = async () => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const info = await window.electronAPI.getMobileServerInfo();
      setServerInfo(info);
      // Если есть выбранный IP в настройках, обновляем состояние
      if (info && info.selectedIP !== undefined) {
        setSelectedIP(info.selectedIP);
      }
    } catch (error) {
      console.error('Ошибка при загрузке информации о сервере:', error);
    }
  };

  const loadNetworkInterfaces = async () => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const result = await window.electronAPI.getNetworkInterfaces();
      if (result.success && result.interfaces) {
        setNetworkInterfaces(result.interfaces);
      }
    } catch (error) {
      console.error('Ошибка при загрузке сетевых интерфейсов:', error);
    }
  };

  const handleSelectIP = async (ip) => {
    setSelectedIP(ip);
    setSavingIP(true);
    try {
      if (!window.electronAPI) {
        await window.electronAPI?.showMessage?.({ message: 'Electron API недоступен' });
        return;
      }
      const result = await window.electronAPI.setSelectedIP(ip);
      if (result.success) {
        console.log('Выбранный IP сохранен:', ip);
        // Обновляем информацию о сервере, чтобы показать новый IP
        await loadServerInfo();
      } else {
        await window.electronAPI?.showMessage?.({ message: 'Не удалось сохранить выбранный IP: ' + (result.error || 'Неизвестная ошибка') });
        // Возвращаем предыдущее значение при ошибке
        if (serverInfo && serverInfo.selectedIP) {
          setSelectedIP(serverInfo.selectedIP);
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении выбранного IP:', error);
      await window.electronAPI?.showMessage?.({ message: 'Ошибка при сохранении выбранного IP: ' + error.message });
      // Возвращаем предыдущее значение при ошибке
      if (serverInfo && serverInfo.selectedIP) {
        setSelectedIP(serverInfo.selectedIP);
      }
    } finally {
      setSavingIP(false);
    }
  };

  const handleSave = async () => {
    // Сохранение уже происходит автоматически при выборе IP через handleSelectIP
    // Но можно добавить явное сохранение, если нужно
    if (selectedIP) {
      await handleSelectIP(selectedIP);
      // Закрываем страницу после сохранения
      navigate('/match');
    }
  };

  const handleCancel = () => {
    navigate('/match');
  };

  const handleStartServer = async () => {
    setLoading(true);
    try {
      if (!window.electronAPI) {
        await window.electronAPI?.showMessage?.({ message: 'Electron API недоступен' });
        return;
      }

      const result = await window.electronAPI.startMobileServer(3000);
      if (result.success) {
        setServerInfo(result);
        // Загружаем сохраненную сессию, если она есть, иначе генерируем новую
        const savedSession = await window.electronAPI.getSavedMobileSession();
        if (savedSession && savedSession.url) {
          setSessionData(savedSession);
          await generateQRCode(savedSession.url);
        } else {
          // Генерируем новую сессию только если нет сохраненной
          await generateSession();
        }
      } else {
        await window.electronAPI?.showMessage?.({ message: 'Не удалось запустить сервер: ' + result.error });
      }
    } catch (error) {
      await window.electronAPI?.showMessage?.({ message: 'Ошибка: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleStopServer = async () => {
    setLoading(true);
    try {
      if (!window.electronAPI) {
        await window.electronAPI?.showMessage?.({ message: 'Electron API недоступен' });
        return;
      }

      const result = await window.electronAPI.stopMobileServer();
      if (result.success) {
        setServerInfo(null);
        setSessionData(null);
        setQrCodeDataUrl(null);
        setQrCodeUrl(null);
        sessionLoadedRef.current = false; // Сбрасываем флаг для следующего запуска
      } else {
        await window.electronAPI?.showMessage?.({ message: 'Не удалось остановить сервер: ' + result.error });
      }
    } catch (error) {
      await window.electronAPI?.showMessage?.({ message: 'Ошибка: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadSavedSession = async () => {
    // Предотвращаем повторную загрузку
    if (sessionLoadedRef.current) {
      return;
    }
    
    try {
      if (!window.electronAPI) {
        return;
      }
      const savedSession = await window.electronAPI.getSavedMobileSession();
      if (savedSession && savedSession.url) {
        sessionLoadedRef.current = true;
        setSessionData(savedSession);
        await generateQRCode(savedSession.url);
      }
    } catch (error) {
      console.error('Ошибка при загрузке сохраненной сессии:', error);
    }
  };

  const generateSession = async () => {
    try {
      if (!window.electronAPI) {
        await window.electronAPI?.showMessage?.({ message: 'Electron API недоступен' });
        return;
      }

      const result = await window.electronAPI.generateMobileSession();
      if (result.sessionId && result.url) {
        sessionLoadedRef.current = true; // Отмечаем, что сессия загружена
        setSessionData(result);
        await generateQRCode(result.url);
      } else {
        await window.electronAPI?.showMessage?.({ message: 'Не удалось сгенерировать сессию. Убедитесь, что сервер запущен.' });
      }
    } catch (error) {
      await window.electronAPI?.showMessage?.({ message: 'Ошибка при генерации сессии: ' + error.message });
    }
  };

  // Ref для контейнера QR-кода
  const qrCodeContainerRef = useRef(null);
  
  // Генерируем data URL из canvas после рендеринга QR-кода
  useEffect(() => {
    if (qrCodeUrl && qrCodeContainerRef.current) {
      // Ждем следующий тик, чтобы canvas был отрендерен
      const timer = setTimeout(() => {
        // Ищем canvas элемент внутри контейнера
        const canvas = qrCodeContainerRef.current?.querySelector('canvas');
        if (canvas) {
          try {
            const dataUrl = canvas.toDataURL('image/png');
            console.log('[QR Code] QR-код успешно сгенерирован, длина data URL:', dataUrl ? dataUrl.length : 0);
            setQrCodeDataUrl(dataUrl);
          } catch (error) {
            console.error('[QR Code] Ошибка при получении data URL из canvas:', error);
            setQrCodeDataUrl(null);
          }
        } else {
          console.error('[QR Code] Canvas элемент не найден');
          setQrCodeDataUrl(null);
        }
      }, 150); // Увеличиваем задержку для гарантии рендеринга
      
      return () => clearTimeout(timer);
    }
  }, [qrCodeUrl]);
  
  const generateQRCode = async (url) => {
    try {
      // ИСПРАВЛЕНИЕ: Используем qrcode.react для генерации QR-кода
      // Это React-компонент, который работает в браузере и совместим с Vite production сборкой
      // Он не имеет проблем с минификацией, в отличие от библиотеки qrcode
      
      console.log('[QR Code] Начало генерации QR-кода для URL:', url);
      
      // Устанавливаем URL для генерации QR-кода
      // Компонент QRCodeCanvas отрендерит canvas, из которого мы получим data URL
      setQrCodeUrl(url);
      setQrCodeDataUrl(null); // Сбрасываем предыдущий data URL
    } catch (error) {
      console.error('[QR Code] Ошибка при генерации QR-кода:', error);
      console.error('[QR Code] Детали ошибки:', {
        message: error.message,
        stack: error.stack,
      });
      setQrCodeDataUrl(null);
      setQrCodeUrl(null);
    }
  };

  const copyLinkToClipboard = async () => {
    if (!sessionData || !sessionData.url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sessionData.url);
      await window.electronAPI?.showMessage?.({ message: 'Ссылка скопирована в буфер обмена!' });
    } catch (error) {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = sessionData.url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        await window.electronAPI?.showMessage?.({ message: 'Ссылка скопирована в буфер обмена!' });
      } catch (err) {
        await window.electronAPI?.showMessage?.({ message: 'Не удалось скопировать ссылку' });
      }
      document.body.removeChild(textArea);
    }
  };

  const isServerRunning = serverInfo && serverInfo.running !== false;

  // Устанавливаем кнопки в шапку
  useEffect(() => {
    const handleSaveClick = async () => {
      // Сохранение уже происходит автоматически при выборе IP через handleSelectIP
      // Но можно добавить явное сохранение, если нужно
      if (selectedIP) {
        await handleSelectIP(selectedIP);
        // Закрываем страницу после сохранения
        navigate('/match');
      }
    };

    const handleCancelClick = () => {
      navigate('/match');
    };

    setButtons(
      <>
        <Button variant="secondary" onClick={handleCancelClick}>
          Отменить
        </Button>
        <Button variant="success" onClick={handleSaveClick} style={{ fontWeight: 'bold' }}>
          Сохранить
        </Button>
      </>
    );
    return () => setButtons(null);
  }, [selectedIP, setButtons, navigate]);

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Мобильный доступ</h2>

      {/* Статус сервера */}
      <div style={{
        backgroundColor: 'var(--color-surface-muted)',
        padding: '1.5rem',
        borderRadius: '4px',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ marginTop: 0 }}>Статус сервера</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: isServerRunning ? 'var(--color-success)' : 'var(--color-danger)',
          }}></div>
          <span style={{ fontWeight: 'bold' }}>
            {isServerRunning ? 'Запущен' : 'Остановлен'}
          </span>
        </div>

        {/* Выбор сетевого интерфейса */}
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
          }}>
            Сетевой интерфейс:
          </label>
          <select
            value={selectedIP || ''}
            onChange={(e) => handleSelectIP(e.target.value)}
            disabled={savingIP || isServerRunning}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              backgroundColor: savingIP || isServerRunning ? 'var(--color-surface-muted)' : 'var(--color-surface)',
              cursor: savingIP || isServerRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {networkInterfaces.length > 0 ? (
              networkInterfaces.map((iface, index) => (
                <option key={index} value={iface.ip}>
                  {iface.name} {iface.isVpn ? '(VPN)' : ''} {iface.isPrivate ? '' : '(публичный)'}
                </option>
              ))
            ) : (
              <option value="">Загрузка интерфейсов...</option>
            )}
          </select>
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)',
          }}>
            {savingIP ? 'Сохранение...' : isServerRunning ? 'Остановите сервер для изменения интерфейса' : 'Выберите сетевой интерфейс для мобильного сервера'}
          </div>
        </div>

        {isServerRunning && serverInfo && (
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Адрес сервера:</strong> {serverInfo.url}</p>
            <p><strong>IP адрес:</strong> {serverInfo.ip}</p>
            <p><strong>Порт:</strong> {serverInfo.port}</p>
            {serverInfo.sessionsCount !== undefined && (
              <p><strong>Активных сессий:</strong> {serverInfo.sessionsCount}</p>
            )}
          </div>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          {!isServerRunning ? (
            <Button
              variant="success"
              onClick={handleStartServer}
              disabled={loading}
              style={{ fontWeight: 'bold' }}
            >
              {loading ? 'Запуск...' : 'Запустить сервер'}
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={handleStopServer}
              disabled={loading}
              style={{ fontWeight: 'bold' }}
            >
              {loading ? 'Остановка...' : 'Остановить сервер'}
            </Button>
          )}
        </div>
      </div>

      {/* Генерация ссылки и QR-кода */}
      {isServerRunning && (
        <div style={{
          backgroundColor: 'var(--color-surface-muted)',
          padding: '1.5rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ marginTop: 0 }}>Уникальная ссылка для доступа</h3>
          
          {sessionData && sessionData.url ? (
            <>
              <div style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem',
                border: `2px solid var(--color-primary)`,
                wordBreak: 'break-all',
              }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  Ссылка для мобильного доступа:
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-text)' }}>
                  {sessionData.url}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <Button variant="primary" onClick={copyLinkToClipboard}>
                  Копировать ссылку
                </Button>
                <Button variant="accent" onClick={generateSession}>
                  Сгенерировать новую ссылку
                </Button>
              </div>

              {/* QR-код */}
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                borderRadius: '4px',
              }}>
                <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>
                  QR-код для быстрого подключения:
                </h4>
                {/* Скрытый QRCodeCanvas для генерации data URL */}
                {qrCodeUrl && (
                  <div ref={qrCodeContainerRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <QRCodeCanvas
                      value={qrCodeUrl}
                      size={300}
                      level="M"
                      marginSize={2}
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>
                )}
                {qrCodeDataUrl ? (
                  <div style={{
                    display: 'inline-block',
                    padding: '1rem',
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: '8px',
                    border: `2px solid var(--color-border)`,
                  }}>
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      style={{
                        width: '300px',
                        height: '300px',
                        maxWidth: '100%',
                      }}
                    />
                  </div>
                ) : qrCodeUrl ? (
                  <div style={{
                    width: '300px',
                    height: '300px',
                    margin: '0 auto',
                    backgroundColor: 'var(--color-surface-muted)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-secondary)',
                  }}>
                    Загрузка QR-кода...
                  </div>
                ) : null}
                <p style={{
                  marginTop: '1rem',
                  fontSize: '0.9rem',
                  color: 'var(--color-text-secondary)',
                }}>
                  Отсканируйте QR-код камерой мобильного устройства для быстрого доступа
                </p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                Нажмите кнопку для генерации уникальной ссылки доступа
              </p>
              <Button variant="success" onClick={generateSession} style={{ fontWeight: 'bold' }}>
                Сгенерировать ссылку
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Ссылки для vMix/OBS (Browser Source) */}
      {isServerRunning && serverInfo && serverInfo.url && (
        <div style={{
          backgroundColor: 'var(--color-surface-muted)',
          padding: '1.5rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ marginTop: 0 }}>Ссылки для vMix / OBS</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            Добавьте в vMix или OBS как Browser Source. Размер: 1920×1080, включите прозрачный фон при необходимости.
            Для ТВ-табло используйте полный экран в браузере на втором дисплее.
          </p>
          {[
            { path: '/overlay/scoreboard', label: 'Табло (счёт)' },
            { path: '/overlay/intro', label: 'Начальный титр' },
            { path: '/overlay/rosters', label: 'Составы' },
            { path: '/tv', label: 'ТВ-табло (для второго экрана)' },
          ].map(({ path, label }) => {
            const url = serverInfo.url.replace(/\/$/, '') + path;
            return (
              <div
                key={path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{
                  flex: '1',
                  minWidth: 200,
                  backgroundColor: 'var(--color-surface)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.9rem',
                  wordBreak: 'break-all',
                }}>
                  <span style={{ color: 'var(--color-text-secondary)', marginRight: '0.5rem' }}>{label}:</span>
                  {url}
                </div>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      await window.electronAPI?.showMessage?.({ message: 'Ссылка скопирована' });
                    } catch (e) {
                      const ta = document.createElement('textarea');
                      ta.value = url;
                      ta.style.position = 'fixed';
                      ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.select();
                      try {
                        document.execCommand('copy');
                        await window.electronAPI?.showMessage?.({ message: 'Ссылка скопирована' });
                      } catch (err) {
                        await window.electronAPI?.showMessage?.({ message: 'Не удалось скопировать' });
                      }
                      document.body.removeChild(ta);
                    }
                  }}
                >
                  Копировать
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Инструкции */}
      <div style={{
        backgroundColor: 'var(--color-surface-muted)',
        padding: space.md,
        borderRadius: radius.md,
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
      }}>
        <h4 style={{ marginTop: 0, color: 'var(--color-text)' }}>Инструкция:</h4>
        <ol style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8', color: 'var(--color-text)' }}>
          <li><strong>Выберите сетевой интерфейс</strong> в выпадающем списке выше (интерфейс должен быть в той же подсети, что и vMix)</li>
          <li>Запустите сервер, нажав кнопку "Запустить сервер"</li>
          <li>Сгенерируйте уникальную ссылку для доступа</li>
          <li>Скопируйте ссылку или отсканируйте QR-код с мобильного устройства</li>
          <li>Откройте ссылку в браузере мобильного устройства</li>
          <li>Убедитесь, что мобильное устройство подключено к той же сети, что и выбранный интерфейс</li>
        </ol>
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: radius.sm,
          fontSize: '0.9rem',
          color: 'var(--color-text)',
        }}>
          <strong>Важно:</strong> Если вы изменили сетевой интерфейс, необходимо остановить и заново запустить сервер для применения изменений.
        </div>
      </div>

      {/* Кнопки */}
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={() => navigate('/match')}>
          Отменить
        </Button>
        <Button
          variant="success"
          onClick={async () => {
            if (selectedIP) {
              await handleSelectIP(selectedIP);
              navigate('/match');
            }
          }}
          style={{ fontWeight: 'bold' }}
        >
          Сохранить
        </Button>
      </div>
    </div>
  );
}

export default MobileAccessPage;

