import { useState, useEffect } from 'react';
import TVScoreboard from '../components/TVScoreboard';
import type { Match } from '../../shared/types/Match';

/**
 * Страница для ТВ-дисплеев
 * Отображает счет в крупном формате, только для просмотра
 * Синхронизируется с основным приложением через localStorage
 */
export default function TVScoreboardPage() {
  const [match, setMatch] = useState<Match | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Загружаем текущий матч из localStorage при старте
    const loadMatch = () => {
      try {
        const stored = localStorage.getItem('currentMatch');
        if (stored) {
          const parsed = JSON.parse(stored) as Match;
          setMatch(parsed);
          setIsConnected(true);
        }
      } catch (e) {
        console.error('Ошибка загрузки матча из localStorage:', e);
      }
    };

    // Первоначальная загрузка
    loadMatch();

    // Слушаем изменения в localStorage (синхронизация между окнами)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentMatch') {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue) as Match;
            setMatch(parsed);
            setIsConnected(true);
          } catch (err) {
            console.error('Ошибка парсинга матча из storage:', err);
          }
        } else {
          setMatch(null);
          setIsConnected(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Также слушаем кастомное событие для синхронизации в пределах одного окна
    const handleMatchUpdate = (e: CustomEvent<Match>) => {
      setMatch(e.detail);
      setIsConnected(true);
    };

    window.addEventListener('matchUpdated' as any, handleMatchUpdate as any);

    // Периодическая проверка (на случай если событие не сработало)
    const intervalId = setInterval(loadMatch, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('matchUpdated' as any, handleMatchUpdate as any);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      overflow: 'hidden',
    }}>
      {/* Индикатор подключения */}
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: '999px',
        fontSize: '0.875rem',
        color: isConnected ? '#22c55e' : '#ef4444',
        zIndex: 1000,
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#22c55e' : '#ef4444',
          animation: isConnected ? 'none' : 'blink 1s infinite',
        }} />
        {isConnected ? 'Подключено' : 'Нет подключения'}
      </div>

      {/* Основное табло */}
      <TVScoreboard match={match} />

      {/* CSS анимации */}
      <style>{`
        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
