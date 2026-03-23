import type { ReactNode } from 'react';
import { useState, useEffect, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import type { Match } from '../../shared/types/Match';
import { space, typography } from '../theme/tokens';
import Button from './Button';

type HeaderButtons = ReactNode | null;

const HeaderButtonsContext = createContext<{
  buttons: HeaderButtons;
  setButtons: (b: HeaderButtons) => void;
}>({
  buttons: null,
  setButtons: () => {},
});

export const useHeaderButtons = () => {
  return useContext(HeaderButtonsContext);
};

export interface LayoutProps {
  children: ReactNode;
  match: Match | null;
  onMatchChange?: (match: Match) => void;
}

export default function Layout({ children, match, onMatchChange }: LayoutProps) {
  const location = useLocation();
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [headerButtons, setHeaderButtons] = useState<HeaderButtons>(null);

  useEffect(() => {
    const loadAutoSaveSettings = async () => {
      if (window.electronAPI && window.electronAPI.getAutoSaveSettings) {
        try {
          const result = await window.electronAPI.getAutoSaveSettings();
          if (result.success) {
            setAutoSaveEnabled(result.enabled);
          }
        } catch (error) {
          console.error('Ошибка при загрузке настроек автосохранения:', error);
        }
      }
    };
    loadAutoSaveSettings();

    if (window.electronAPI && window.electronAPI.onAutoSaveSettingsChanged) {
      const removeListener = window.electronAPI.onAutoSaveSettingsChanged((enabled: boolean) => {
        setAutoSaveEnabled(enabled);
      });
      return () => removeListener?.();
    }
  }, []);

  const handleAutoSaveToggle = async (enabled: boolean) => {
    if (window.electronAPI && window.electronAPI.setAutoSaveSettings) {
      try {
        const result = await window.electronAPI.setAutoSaveSettings(enabled);
        if (result.success) {
          setAutoSaveEnabled(enabled);
        } else {
          await window.electronAPI?.showMessage?.({ message: 'Не удалось изменить настройки автосохранения: ' + (result.error || 'Неизвестная ошибка') });
        }
      } catch (error) {
        console.error('Ошибка при изменении настроек автосохранения:', error);
        await window.electronAPI?.showMessage?.({ message: 'Ошибка при изменении настроек автосохранения: ' + (error instanceof Error ? error.message : String(error)) });
      }
    }
  };

  const handleSaveMatch = async () => {
    try {
      if (!window.electronAPI || !match) {
        return;
      }

      const result = await window.electronAPI.saveMatch(match);
      if (result.success) {
        const updatedMatch = { ...match, updatedAt: new Date().toISOString() };
        await window.electronAPI.showMessage({ message: 'Матч успешно сохранен!' });
        if (onMatchChange) {
          onMatchChange(updatedMatch as Match);
        }
        if (window.electronAPI.markMatchSaved) {
          window.electronAPI.markMatchSaved();
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении матча:', error);
      await window.electronAPI?.showMessage?.({ message: 'Не удалось сохранить матч: ' + (error instanceof Error ? error.message : String(error)) });
    }
  };

  const handleSaveAsMatch = async () => {
    try {
      if (!window.electronAPI || !match) {
        return;
      }

      const result = await window.electronAPI.saveMatchDialog(match);
      if (result.success) {
        const updatedMatch = { ...match, updatedAt: new Date().toISOString() };
        await window.electronAPI.showMessage({ message: 'Матч успешно сохранен!' });
        if (onMatchChange) {
          onMatchChange(updatedMatch as Match);
        }
        if (window.electronAPI.markMatchSaved) {
          window.electronAPI.markMatchSaved();
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении матча:', error);
      await window.electronAPI?.showMessage?.({ message: 'Не удалось сохранить матч: ' + (error instanceof Error ? error.message : String(error)) });
    }
  };

  if (location.pathname === '/') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: typography.fontFamily,
      }}>
        <main style={{ flex: 1, padding: space.md, backgroundColor: 'var(--color-background)' }}>
          {children}
        </main>
      </div>
    );
  }

  if (location.pathname === '/match') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: typography.fontFamily,
      }}>
        <header style={{
          backgroundColor: 'var(--color-header-bg)',
          color: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            padding: space.md,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: space.sm,
            maxWidth: '1600px',
            margin: '0 auto',
            width: '100%',
          }}>
            <h2 style={{ margin: 0, fontSize: typography.h2 }}>Управление матчем</h2>
            <div style={{ display: 'flex', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: space.sm,
                cursor: 'pointer',
                fontSize: typography.small,
                userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => handleAutoSaveToggle(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Автосохранение</span>
              </label>
              <Button variant="success" onClick={handleSaveMatch} style={{ padding: `${space.sm} ${space.md}` }}>
                Сохранить
              </Button>
              <Button variant="secondary" onClick={handleSaveAsMatch} style={{ padding: `${space.sm} ${space.md}` }}>
                Сохранить как...
              </Button>
            </div>
          </div>
        </header>
        <main style={{ flex: 1, padding: space.md, backgroundColor: 'var(--color-background)' }}>
          {children}
        </main>
      </div>
    );
  }

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/vmix/settings') return 'Настройки подключения к vMix';
    if (path === '/match/settings') return 'Настройки матча';
    if (path === '/match/roster') return 'Управление составами';
    if (path === '/mobile/access') return 'Мобильный доступ';
    if (path === '/about') return 'О программе';
    return '';
  };

  const pageTitle = getPageTitle();

  return (
    <HeaderButtonsContext.Provider value={{ buttons: headerButtons, setButtons: setHeaderButtons }}>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: typography.fontFamily,
      }}>
        <header style={{
          backgroundColor: 'var(--color-header-bg)',
          color: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            padding: space.md,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: space.sm,
            maxWidth: '1600px',
            margin: '0 auto',
            width: '100%',
          }}>
            {pageTitle && (
              <h2 style={{ margin: 0, fontSize: typography.h2 }}>
                {pageTitle}
              </h2>
            )}
            <div style={{ display: 'flex', gap: space.md, alignItems: 'center', flexWrap: 'wrap' }}>
              {headerButtons && (
                <div style={{ display: 'flex', gap: space.sm, alignItems: 'center' }}>
                  {headerButtons}
                </div>
              )}
            </div>
          </div>
        </header>
        <main style={{ flex: 1, padding: space.md, backgroundColor: 'var(--color-background)' }}>
          {children}
        </main>
      </div>
    </HeaderButtonsContext.Provider>
  );
}
