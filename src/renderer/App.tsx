import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import type { Match } from '../shared/types/Match';
import { applyTheme } from './theme/applyTheme';
import { light, dark } from './theme/tokens';
import Layout from './components/Layout';
import WelcomePage from './pages/WelcomePage';
import MatchControlPage from './pages/MatchControlPage';
import MatchSettingsPage from './pages/MatchSettingsPage';
import RosterManagementPage from './pages/RosterManagementPage';
import VMixSettingsPage from './pages/VMixSettingsPage';
import MobileAccessPage from './pages/MobileAccessPage';
import AboutPage from './pages/AboutPage';
import TVScoreboardPage from './pages/TVScoreboardPage';

function App() {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let resolved: 'light' | 'dark' = 'light';
    const loadTheme = async () => {
      if (!window.electronAPI?.getUISettings) return;
      try {
        const result = await window.electronAPI.getUISettings();
        if (result.success && result.theme) {
          if (result.theme === 'system') {
            resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          } else {
            resolved = result.theme as 'light' | 'dark';
          }
        }
      } catch (e) {
        console.error('Ошибка загрузки темы:', e);
      }
      setTheme(resolved);
    };
    loadTheme();
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onUIThemeChanged) return;
    const remove = window.electronAPI.onUIThemeChanged((newTheme: string) => {
      const resolved = newTheme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : (newTheme as 'light' | 'dark');
      setTheme(resolved);
    });
    return () => remove?.();
  }, []);

  useEffect(() => {
    applyTheme(theme === 'dark' ? dark : light);
  }, [theme]);

  useEffect(() => {
    const matchFromState = (location.state as { match?: Match } | null)?.match;
    if (matchFromState) {
      setCurrentMatch(matchFromState);

      if (window.electronAPI) {
        window.electronAPI.setCurrentMatch(matchFromState).catch((err: unknown) => {
          console.error('Ошибка при обновлении матча:', err);
        });
        window.electronAPI.setMobileMatch(matchFromState).catch((err: unknown) => {
          console.error('Ошибка при обновлении мобильного матча:', err);
        });
      }
      
      // Синхронизация с localStorage для ТВ-табло
      try {
        localStorage.setItem('currentMatch', JSON.stringify(matchFromState));
        window.dispatchEvent(new CustomEvent('matchUpdated', { detail: matchFromState }));
      } catch (e) {
        console.error('Ошибка синхронизации матча:', e);
      }

      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleNavigate = (path: string) => {
      navigate(path);
    };

    const handleLoadMatch = (match: Match | null) => {
      if (match) {
        // Просто обновляем состояние, без навигации
        // Навигация вызывает бесконечный цикл при сохранении настроек матча
        setCurrentMatch(match);

        // Синхронизация с localStorage для ТВ-табло
        try {
          localStorage.setItem('currentMatch', JSON.stringify(match));
          window.dispatchEvent(new CustomEvent('matchUpdated', { detail: match }));
        } catch (e) {
          console.error('Ошибка синхронизации матча:', e);
        }
      }
    };

    const handleRefreshVMix = () => {
      if (currentMatch) {
        navigate('/match', {
          state: { match: currentMatch, forceUpdateVMix: true },
        });
      }
    };

    const removeNavigate = window.electronAPI.onNavigate?.(handleNavigate);
    const removeLoadMatch = window.electronAPI.onLoadMatch?.(handleLoadMatch);
    const removeRefreshVMix = window.electronAPI.onRefreshVMix?.(handleRefreshVMix);

    return () => {
      removeNavigate?.();
      removeLoadMatch?.();
      removeRefreshVMix?.();
    };
  }, [navigate, currentMatch, location.pathname]);

  return (
    <Layout match={currentMatch} onMatchChange={setCurrentMatch}>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route
          path="/match"
          element={
            <MatchControlPage
              match={currentMatch}
              onMatchChange={setCurrentMatch}
            />
          }
        />
        <Route
          path="/match/settings"
          element={
            <MatchSettingsPage
              match={currentMatch}
              onMatchChange={setCurrentMatch}
            />
          }
        />
        <Route
          path="/match/roster"
          element={
            <RosterManagementPage
              match={currentMatch}
              onMatchChange={setCurrentMatch}
            />
          }
        />
        <Route path="/vmix/settings" element={<VMixSettingsPage />} />
        <Route path="/mobile/access" element={<MobileAccessPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/tv" element={<TVScoreboardPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
