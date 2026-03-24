import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMatch } from "../hooks/useMatch";
import { useVMix } from "../hooks/useVMix";
import ScoreDisplay from "../components/ScoreDisplay";
import { getContrastTextColor } from "../utils/colorContrast";
import SetsDisplay from "../components/SetsDisplay";
import ServeControl from "../components/ServeControl";
import ScoreButtons from "../components/ScoreButtons";
import VMixOverlayButtons from "../components/VMixOverlayButtons";
import SetEditModal from "../components/SetEditModal";
import Button from "../components/Button";
import type { Match } from "../../shared/types/Match";
import { SET_STATUS } from "../../shared/types/Match";
import { SetDomain } from "../../shared/domain/SetDomain";
import { formatMatchDate } from "../../shared/getValueByDataMapKey";
import { space, radius, light, typography } from "../theme/tokens";

/**
 * Компонент ссылки на ТВ-табло (получает адрес из настроек мобильного сервера)
 */
function TVLinkSection() {
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Получаем информацию о запущенном сервере
    const loadServerInfo = async () => {
      try {
        const isRunningResult = await window.electronAPI?.isMobileServerRunning?.();
        setIsRunning(!!isRunningResult);

        if (isRunningResult) {
          const result = await window.electronAPI?.getMobileServerInfo?.();
          if (result?.success && result.info) {
            const { ip, port } = result.info;
            setServerUrl(`http://${ip}:${port}/tv`);
          }
        }
      } catch (e) {
        console.error('Ошибка загрузки информации о сервере:', e);
      }
    };

    loadServerInfo();

    // Опрос каждые 2 секунды для обновления статуса
    const intervalId = setInterval(loadServerInfo, 2000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>
      <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
        ТВ-табло (для второго экрана/браузера)
      </label>
      <div style={{ display: "flex", gap: space.sm, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          readOnly
          value={isRunning ? serverUrl : 'http://[IP]:3000/tv (сервер не запущен)'}
          style={{
            flex: 1,
            minWidth: "300px",
            padding: space.sm,
            border: "1px solid var(--color-border)",
            borderRadius: radius.sm,
            fontSize: "0.9rem",
            backgroundColor: "var(--color-background)",
          }}
        />
        <Button
          variant="primary"
          onClick={async () => {
            if (isRunning && serverUrl) {
              void navigator.clipboard.writeText(serverUrl);
              void window.electronAPI?.showMessage?.({ message: "Ссылка скопирована!" });
            }
          }}
          disabled={!isRunning}
        >
          Копировать
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (isRunning && serverUrl) {
              window.open(serverUrl, "_blank");
            }
          }}
          disabled={!isRunning}
        >
          Открыть
        </Button>
      </div>
      <p style={{ margin: "0.5rem 0 0", fontSize: typography.small, color: "var(--color-text-secondary)" }}>
        {isRunning 
          ? `Сервер запущен: ${serverUrl}`
          : 'Запустите сервер в разделе "Мобильный доступ"'}
      </p>
    </div>
  );
}

/**
 * Компонент таймера тайм-аута (30 секунд)
 */
function TimeoutTimer({
  startTime,
  duration,
  onEnd,
}: {
  startTime: number;
  duration: number;
  onEnd: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, duration - (Date.now() - startTime)));

  useEffect(() => {
    if (remaining <= 0) {
      onEnd();
      return;
    }

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newRemaining = Math.max(0, duration - elapsed);
      setRemaining(newRemaining);
    }, 100);

    return () => clearInterval(intervalId);
  }, [startTime, duration, remaining, onEnd]);

  const seconds = Math.ceil(remaining / 1000);
  const percentage = (remaining / duration) * 100;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: space.sm,
      marginLeft: 'auto',
      padding: `${space.xs} ${space.sm}`,
      backgroundColor: 'var(--color-warning)',
      borderRadius: radius.sm,
      color: 'white',
      fontWeight: 'bold',
      fontSize: typography.small,
    }}>
      <span>Тайм-аут: {seconds}с</span>
      <div style={{
        width: '60px',
        height: '8px',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: 'white',
          transition: 'width 0.1s linear',
        }} />
      </div>
    </div>
  );
}

export interface MatchControlPageProps {
  match: Match | null;
  onMatchChange: (match: Match) => void;
}

function MatchControlPage({ match: initialMatch, onMatchChange }: MatchControlPageProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Получаем матч из location.state при навигации (например, после сохранения настроек)
  // ВАЖНО: matchFromState имеет приоритет — при переходе с state мы явно передаём актуальный матч,
  // тогда как initialMatch от родителя может быть устаревшим (App ещё не успел обновиться)
  const matchFromState = location.state?.match;
  const effectiveInitialMatch = matchFromState || initialMatch;

  // Форматирование даты ДД.ММ.ГГГГ (общая функция с vMix и overlay)
  const formatDate = (dateStr) => {
    const formatted = formatMatchDate(dateStr || "", "");
    return formatted || "Не указана";
  };

  // Отслеживание предыдущего matchId для определения первой загрузки
  const previousMatchIdRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  // Флаг принудительного обновления из location.state (например, при F5)
  const forceUpdateFromState = location.state?.forceUpdateVMix || false;

  // Состояние для модального окна редактирования партии
  const [editingSetNumber, setEditingSetNumber] = useState(null);

  // ВСЕ хуки должны вызываться ДО любых условных возвратов
  const {
    match,
    setMatch,
    changeScore,
    changeServingTeam,
    finishSet,
    startSet,
    toggleSetStatus,
    updateSet,
    changeStatistics,
    toggleStatistics,
    undoLastAction,
    takeTimeout,
    resetTimeout,
    endActiveTimeout,
    isSetballNow,
    setballTeam,
    isMatchballNow,
    matchballTeam,
    canFinish,
    hasHistory,
    currentSetStatus,
  } = useMatch(effectiveInitialMatch);

  const {
    vmixConfig,
    connectionStatus,
    updateMatchData,
    showOverlay,
    hideOverlay,
    isOverlayActive,
    isAnotherOverlayOnAirForSameInput,
  } = useVMix(match);
  
  // Вычисляем данные для модального окна с помощью useMemo, чтобы избежать бесконечных ре-рендеров
  const modalData = useMemo(() => {
    if (!editingSetNumber || !match) return null;
    
    // Сначала ищем завершенную партию в sets
    const completedSet = match.sets.find(s => s.setNumber === editingSetNumber);
    // Если не нашли в sets, проверяем currentSet
    const setToEdit = completedSet || (editingSetNumber === match.currentSet.setNumber ? match.currentSet : null);
    // Определяем, является ли это текущей партией используя Domain Layer
    const isCurrentSet = setToEdit && !completedSet && SetDomain.isCurrentSet(editingSetNumber, match.currentSet);
    
    if (!setToEdit) {
      return null;
    }
    
    return { setToEdit, isCurrentSet };
  }, [editingSetNumber, match?.currentSet?.setNumber, match?.sets]);
  
  // Callback для сохранения изменений партии
  const handleSetSave = useCallback((updates) => {
    if (!editingSetNumber || !match) return false;
    
    const wasCompletedSet = match.sets.find(s => s.setNumber === editingSetNumber);
    const success = updateSet(editingSetNumber, updates);
    if (success) {
      setEditingSetNumber(null);
      // Если статус изменен на IN_PROGRESS для завершенной партии, 
      // useEffect автоматически обновит vMix при изменении match.updatedAt
      if (updates.status === SET_STATUS.IN_PROGRESS && wasCompletedSet) {
        console.log('[MatchControlPage] Партия возвращена в игру, ожидаем автоматического обновления vMix через useEffect');
      }
    }
    return success;
  }, [editingSetNumber, match, updateSet]);

  // Синхронизируем match из location.state с родительским компонентом
  useEffect(() => {
    if (matchFromState && !initialMatch) {
      // Если матч пришел из state, но initialMatch еще null, устанавливаем его
      // Это происходит при первом создании матча
      if (onMatchChange) {
        onMatchChange(matchFromState);
      }
      // Очищаем state после использования, чтобы избежать повторной обработки
      window.history.replaceState({}, document.title);
    }
  }, [matchFromState, initialMatch, onMatchChange]);

  // Проверяем наличие матча только после того, как все эффекты отработали
  useEffect(() => {
    // Не делаем редирект сразу, даем время для обработки location.state
    if (!effectiveInitialMatch && !match) {
      const timer = setTimeout(() => {
        // Проверяем еще раз после небольшой задержки
        if (!match && !location.state?.match) {
          navigate("/");
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [match, effectiveInitialMatch, navigate, location.state]);

  // Автоматическое обновление vMix при изменении матча
  useEffect(() => {
    if (match && connectionStatus.connected) {
      // Определяем, является ли это первой загрузкой матча или сменой матча
      const currentMatchId = match.matchId;
      const isNewMatch = previousMatchIdRef.current !== currentMatchId;
      // forceUpdate используется при первой загрузке, смене матча или явном запросе (например, F5)
      const forceUpdate =
        isFirstLoadRef.current || isNewMatch || forceUpdateFromState;

      if (isNewMatch) {
        previousMatchIdRef.current = currentMatchId;
        isFirstLoadRef.current = false;
      }

      console.log(
        "[MatchControlPage] Вызов updateMatchData для обновления vMix:",
        {
          matchId: match.matchId,
          teamA: match.teamA?.name,
          teamB: match.teamB?.name,
          hasLogoA: !!match.teamA?.logo,
          hasLogoB: !!match.teamB?.logo,
          forceUpdate,
          isNewMatch,
        }
      );
      updateMatchData(match, forceUpdate);

      // Очищаем флаг forceUpdateFromState после использования
      if (forceUpdateFromState) {
        window.history.replaceState({}, document.title);
      }
    } else {
      // Сбрасываем флаг первой загрузки, если нет матча
      if (!match) {
        previousMatchIdRef.current = null;
        isFirstLoadRef.current = true;
      }
    }
  }, [
    match,
    connectionStatus.connected,
    updateMatchData,
    forceUpdateFromState,
  ]);

  // Синхронизируем изменения матча с родительским компонентом
  useEffect(() => {
    if (onMatchChange && match) {
      onMatchChange(match);
    }
  }, [match, onMatchChange]);

  // Таймер для автоматического завершения тайм-аута через 30 секунд
  useEffect(() => {
    if (!match?.timeouts?.activeTimeout) return;

    const { startTime, duration } = match.timeouts.activeTimeout;
    const elapsed = Date.now() - startTime;
    const remaining = duration - elapsed;

    if (remaining <= 0) {
      // Тайм-аут уже завершился
      endActiveTimeout();
    } else {
      // Устанавливаем таймер на завершение
      const timeoutId = setTimeout(() => {
        endActiveTimeout();
        void window.electronAPI?.showMessage?.({ message: 'Тайм-аут завершен' });
      }, remaining);

      return () => clearTimeout(timeoutId);
    }
  }, [match?.timeouts?.activeTimeout, endActiveTimeout]);

  // Синхронизируем матч с мобильным сервером
  useEffect(() => {
    if (match && window.electronAPI) {
      window.electronAPI.setMobileMatch(match);
      window.electronAPI.setCurrentMatch(match);
    }
  }, [match]);

  // Дополнительная синхронизация при изменении подачи
  useEffect(() => {
    if (
      match &&
      match.currentSet &&
      window.electronAPI &&
      window.electronAPI.setMobileMatch
    ) {
      // Используем setTimeout для гарантии, что состояние обновилось
      const timeoutId = setTimeout(() => {
        window.electronAPI.setMobileMatch(match).catch((err) => {
          console.error(
            "Ошибка при синхронизации матча с мобильным сервером:",
            err
          );
        });
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [match?.currentSet?.servingTeam]);

  // Принудительное обновление видимости полей в vMix при изменении подачи
  useEffect(() => {
    if (
      match &&
      match.currentSet &&
      connectionStatus.connected
    ) {
      console.log(
        "[MatchControlPage] Обновление видимости полей при изменении подачи:",
        {
          servingTeam: match.currentSet.servingTeam,
        }
      );
      // Вызываем updateMatchData с forceUpdate=false, но изменения видимости должны быть обнаружены
      // через filterChangedVisibilityFields, так как видимость изменилась
      updateMatchData(match, false);
    }
  }, [match?.currentSet?.servingTeam, connectionStatus.connected, updateMatchData]);

  // Обработка обновления матча из мобильного приложения или при создании/открытии матча
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleLoadMatch = (updatedMatch) => {
      if (updatedMatch) {
        // При загрузке нового матча (создание или открытие) сбрасываем previousMatchIdRef
        // чтобы гарантировать, что updateMatchData будет вызван с forceUpdate=true
        const isNewMatch = previousMatchIdRef.current !== updatedMatch.matchId;
        if (isNewMatch) {
          previousMatchIdRef.current = null; // Сбрасываем, чтобы гарантировать обновление vMix
          isFirstLoadRef.current = true; // Помечаем как первую загрузку
        }
        
        // Обновляем матч в состоянии хука useMatch
        setMatch(updatedMatch);
        // Также обновляем в родительском компоненте
        if (onMatchChange) {
          onMatchChange(updatedMatch);
        }
      }
    };

    const removeLoadMatch = window.electronAPI.onLoadMatch?.(handleLoadMatch);

    return () => {
      removeLoadMatch?.();
    };
  }, [setMatch, onMatchChange]);

  // Отмечаем матч как сохраненный после успешного сохранения
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleMatchSaved = () => {
      if (window.electronAPI.markMatchSaved) {
        window.electronAPI.markMatchSaved();
      }
    };

    const removeMatchSaved =
      window.electronAPI.onMatchSaved?.(handleMatchSaved);

    return () => {
      // Удаляем слушатель при размонтировании компонента
      removeMatchSaved?.();
    };
  }, []);

  // Условный рендеринг ПОСЛЕ всех хуков
  if (!initialMatch || !match) {
    return (
      <div style={{ padding: space.xl, textAlign: "center" }}>
        <h2>Матч не загружен</h2>
        <p>Пожалуйста, создайте новый матч или откройте существующий.</p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "var(--color-primary)",
            color: "white",
            border: "none",
            borderRadius: radius.sm,
            cursor: "pointer",
            marginTop: space.md,
          }}
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  const handleFinishSet = async () => {
    if (!canFinish) {
      const threshold = match?.currentSet?.setNumber === 5 ? 15 : 25;
      await window.electronAPI?.showMessage?.({
        message: `Партия не может быть завершена. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`,
      });
      return;
    }

    const confirmed = await window.electronAPI?.showConfirm?.({ message: 'Завершить текущую партию?' });
    if (confirmed) {
      finishSet();
    }
  };

  return (
    <div style={{ padding: space.md, maxWidth: "1600px", margin: "0 auto" }}>
      {/* Основной контент: 2/3 слева, 1/3 справа */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
          gap: space.md,
          alignItems: "start",
        }}
      >
        {/* Левая часть (2/3) - Управление матчем */}
        <div style={{ minWidth: "790px" }}>
          {/* Информация о матче */}
          <div
            style={{
              backgroundColor: "var(--color-surface-muted)",
              padding: space.md,
              borderRadius: radius.sm,
              marginBottom: space.md,
            }}
          >
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div>
                <strong>Турнир:</strong> {match.tournament || "Не указан"}
              </div>
              <div>
                <strong>Место:</strong> {match.venue || "Не указано"}
              </div>
              <div>
                <strong>Дата:</strong> {formatDate(match.date)}
              </div>
              <div>
                <strong>Время:</strong> {match.time || "Не указано"}
              </div>
            </div>
          </div>

          {/* Команды */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: space.md,
              marginBottom: space.md,
            }}
          >
            <div
              style={{
                backgroundColor: match.teamA.color || light.primary,
                color: getContrastTextColor(match.teamA.color || light.primary),
                padding: space.md,
                borderRadius: radius.sm,
                textAlign: "center",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{match.teamA.name}</h3>
              {match.teamA.coach && <p>Тренер: {match.teamA.coach}</p>}
            </div>
            <div
              style={{
                backgroundColor: match.teamB.color || light.danger,
                color: getContrastTextColor(match.teamB.color || light.danger),
                padding: space.md,
                borderRadius: radius.sm,
                textAlign: "center",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{match.teamB.name}</h3>
              {match.teamB.coach && <p>Тренер: {match.teamB.coach}</p>}
            </div>
          </div>

          {/* Счет по партиям */}
          <SetsDisplay
            sets={match.sets}
            currentSet={match.currentSet}
            match={match}
            onSetClick={(setNumber) => setEditingSetNumber(setNumber)}
          />

          {/* Текущий счет */}
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              border: "2px solid var(--color-border-strong)",
              borderRadius: radius.sm,
              padding: space.md,
              marginBottom: space.md,
            }}
          >
            <h3 style={{ textAlign: "center", marginTop: 0 }}>
              Партия #{match.currentSet.setNumber}
              {currentSetStatus === SET_STATUS.PENDING && 
               match.sets.some(s => s.setNumber === match.currentSet.setNumber && s.status === SET_STATUS.COMPLETED) 
                ? " - завершена" 
                : ""}
            </h3>
            <ScoreDisplay
              teamA={match.teamA.name}
              teamB={match.teamB.name}
              scoreA={match.currentSet.scoreA}
              scoreB={match.currentSet.scoreB}
              servingTeam={match.currentSet.servingTeam}
              teamAColor={match.teamA.color}
              teamBColor={match.teamB.color}
              isSetball={isSetballNow}
              setballTeam={setballTeam}
              isMatchball={isMatchballNow}
              matchballTeam={matchballTeam}
              teamALogo={match.teamA.logo}
              teamBLogo={match.teamB.logo}
            />
            <ServeControl
              servingTeam={match.currentSet.servingTeam}
              teamAName={match.teamA.name}
              teamBName={match.teamB.name}
              onChange={changeServingTeam}
            />
          </div>

          {/* Кнопки управления счетом */}
          <ScoreButtons
            teamAName={match.teamA.name}
            teamBName={match.teamB.name}
            onScoreChange={changeScore}
            disabled={currentSetStatus !== SET_STATUS.IN_PROGRESS}
          />

          {/* Кнопки управления партией */}
          <div
            style={{
              display: "flex",
              gap: space.md,
              justifyContent: "center",
              marginBottom: space.md,
            }}
          >
            <button
              onClick={toggleSetStatus}
              disabled={currentSetStatus === SET_STATUS.IN_PROGRESS && !canFinish}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: currentSetStatus === SET_STATUS.PENDING 
                  ? "var(--color-primary)" 
                  : (canFinish ? "var(--color-success)" : "var(--color-neutral)"),
                color: "white",
                border: "none",
                borderRadius: radius.sm,
                cursor: (currentSetStatus === SET_STATUS.IN_PROGRESS && !canFinish) 
                  ? "not-allowed" 
                  : "pointer",
                fontWeight: "bold",
                opacity: (currentSetStatus === SET_STATUS.IN_PROGRESS && !canFinish) ? 0.6 : 1,
              }}
            >
              {currentSetStatus === SET_STATUS.PENDING 
                ? "Начать партию" 
                : "Завершить партию"}
            </button>
            <button
              onClick={undoLastAction}
              disabled={!hasHistory || currentSetStatus !== SET_STATUS.IN_PROGRESS}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: (hasHistory && currentSetStatus === SET_STATUS.IN_PROGRESS) ? "var(--color-danger)" : "var(--color-neutral)",
                color: "white",
                border: "none",
                borderRadius: radius.sm,
                cursor: hasHistory ? "pointer" : "not-allowed",
              }}
            >
              Отменить последнее действие
            </button>
          </div>

          {/* Расширенная статистика (по умолчанию свёрнута для компактности) */}
          <div
            style={{
              backgroundColor: "var(--color-surface-muted)",
              padding: space.md,
              borderRadius: radius.sm,
              marginBottom: space.md,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: space.sm,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={match.statistics.enabled}
                onChange={(e) => toggleStatistics(e.target.checked)}
              />
              <span>Расширенная статистика</span>
            </label>

            {match.statistics.enabled && (
              <div style={{ marginTop: space.md }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <h4>{match.teamA.name}</h4>

                    {/* Тайм-ауты команды A */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: space.sm,
                      marginBottom: space.md,
                      padding: space.sm,
                      backgroundColor: 'var(--color-surface-muted)',
                      borderRadius: radius.sm,
                      flexWrap: 'wrap',
                    }}>
                      <span style={{ fontWeight: 'bold', fontSize: typography.small }}>
                        Тайм-ауты:
                      </span>
                      <button
                        onClick={() => takeTimeout('A')}
                        disabled={match.timeouts.teamA >= 2 || match.currentSet.status !== SET_STATUS.IN_PROGRESS || match.timeouts.activeTimeout !== null}
                        style={{
                          padding: `${space.xs} ${space.sm}`,
                          backgroundColor: match.timeouts.teamA >= 2 || match.currentSet.status !== SET_STATUS.IN_PROGRESS || match.timeouts.activeTimeout !== null
                            ? 'var(--color-disabled)'
                            : 'var(--color-warning)',
                          color: match.timeouts.teamA >= 2 || match.currentSet.status !== SET_STATUS.IN_PROGRESS || match.timeouts.activeTimeout !== null
                            ? 'var(--color-text-secondary)'
                            : 'white',
                          border: 'none',
                          borderRadius: radius.sm,
                          cursor: match.timeouts.teamA >= 2 || match.currentSet.status !== SET_STATUS.IN_PROGRESS || match.timeouts.activeTimeout !== null
                            ? 'not-allowed'
                            : 'pointer',
                          fontWeight: 'bold',
                          opacity: match.timeouts.teamA >= 2 || match.currentSet.status !== SET_STATUS.IN_PROGRESS || match.timeouts.activeTimeout !== null ? 0.6 : 1,
                        }}
                      >
                        Взять
                      </button>
                      <div style={{
                        display: 'flex',
                        gap: '0.25rem',
                      }}>
                        {[0, 1].map((i) => (
                          <div
                            key={i}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: i < match.timeouts.teamA ? 'var(--color-warning)' : 'var(--color-border)',
                              border: '2px solid var(--color-border)',
                            }}
                          />
                        ))}
                      </div>
                      {match.timeouts.teamA > 0 && (
                        <button
                          onClick={() => resetTimeout('A')}
                          style={{
                            padding: `${space.xs} ${space.sm}`,
                            backgroundColor: 'var(--color-secondary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: radius.sm,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            marginLeft: 'auto',
                          }}
                        >
                          Сброс
                        </button>
                      )}
                      
                      {/* Индикатор активного тайм-аута */}
                      {match.timeouts.activeTimeout?.team === 'A' && (
                        <TimeoutTimer
                          startTime={match.timeouts.activeTimeout.startTime}
                          duration={match.timeouts.activeTimeout.duration}
                          onEnd={endActiveTimeout}
                        />
                      )}
                    </div>
                    
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "attack", -1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "attack", 1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-success)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Атака: {match.statistics.teamA.attack}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "block", -1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "block", 1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-success)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Блок: {match.statistics.teamA.block}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "serve", -1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "serve", 1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-success)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Подачи: {match.statistics.teamA.serve}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "opponentErrors", -1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("A", "opponentErrors", 1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-success)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Ошибки соперника:{" "}
                          {match.statistics.teamA.opponentErrors}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4>{match.teamB.name}</h4>
                    
                    {/* Тайм-ауты команды B */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: space.sm,
                      marginBottom: space.md,
                      padding: space.sm,
                      backgroundColor: 'var(--color-surface-muted)',
                      borderRadius: radius.sm,
                    }}>
                      <span style={{ fontWeight: 'bold', fontSize: typography.small }}>
                        Тайм-ауты:
                      </span>
                      <button
                        onClick={() => takeTimeout('B')}
                        disabled={match.timeouts.teamB >= 2 || match.currentSet.status !== SET_STATUS.IN_PROGRESS || match.timeouts.activeTimeout !== null}
                        style={{
                          padding: `${space.xs} ${space.sm}`,
                          backgroundColor: match.timeouts.teamB >= 2 || match.currentSet.status !== SET_STATUS.IN_PROGRESS || match.timeouts.activeTimeout !== null
                            ? 'var(--color-disabled)'
                            : 'var(--color-warning)',
                          color: match.timeouts.teamB >= 2 || match.currentSet.status !== SET_STATUS.IN_PROGRESS || match.timeouts.activeTimeout !== null
                            ? 'var(--color-text-secondary)'
                            : 'white',
                          border: 'none',
                          borderRadius: radius.sm,
                          cursor: match.timeouts.teamB >= 2 || match.currentSet.status !== SET_STATUS.IN_PROGRESS || match.timeouts.activeTimeout !== null
                            ? 'not-allowed'
                            : 'pointer',
                          fontWeight: 'bold',
                          opacity: match.timeouts.teamB >= 2 || match.currentSet.status !== SET_STATUS.IN_PROGRESS || match.timeouts.activeTimeout !== null ? 0.6 : 1,
                        }}
                      >
                        Взять
                      </button>
                      <div style={{
                        display: 'flex',
                        gap: '0.25rem',
                      }}>
                        {[0, 1].map((i) => (
                          <div
                            key={i}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: i < match.timeouts.teamB ? 'var(--color-warning)' : 'var(--color-border)',
                              border: '2px solid var(--color-border)',
                            }}
                          />
                        ))}
                      </div>
                      {match.timeouts.teamB > 0 && (
                        <button
                          onClick={() => resetTimeout('B')}
                          style={{
                            padding: `${space.xs} ${space.sm}`,
                            backgroundColor: 'var(--color-secondary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: radius.sm,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            marginLeft: 'auto',
                          }}
                        >
                          Сброс
                        </button>
                      )}
                      
                      {/* Индикатор активного тайм-аута */}
                      {match.timeouts.activeTimeout?.team === 'B' && (
                        <TimeoutTimer
                          startTime={match.timeouts.activeTimeout.startTime}
                          duration={match.timeouts.activeTimeout.duration}
                          onEnd={endActiveTimeout}
                        />
                      )}
                    </div>
                    
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "attack", -1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "attack", 1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-success)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Атака: {match.statistics.teamB.attack}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "block", -1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "block", 1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-success)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Блок: {match.statistics.teamB.block}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "serve", -1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "serve", 1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-success)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Подачи: {match.statistics.teamB.serve}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "opponentErrors", -1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            -1
                          </button>
                          <button
                            onClick={(e) =>
                              changeStatistics("B", "opponentErrors", 1, e)
                            }
            style={{
              flex: 1,
              padding: space.sm,
              backgroundColor: "var(--color-success)",
              color: "white",
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
                          >
                            +1
                          </button>
                        </div>
                        <div
                          style={{ textAlign: "center", fontWeight: "bold" }}
                        >
                          Ошибки соперника:{" "}
                          {match.statistics.teamB.opponentErrors}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Правая часть (1/3) - Управление vMix */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            position: "sticky",
            top: "1rem",
          }}
        >
          {/* Управление плашками vMix */}
          <VMixOverlayButtons
            vmixConfig={vmixConfig}
            connectionStatus={connectionStatus}
            onShowOverlay={showOverlay}
            onHideOverlay={hideOverlay}
            isOverlayActive={isOverlayActive}
            isAnotherOverlayOnAirForSameInput={isAnotherOverlayOnAirForSameInput}
          />

          {/* Статус подключения к vMix */}
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: connectionStatus.connected
                ? "var(--color-success)"
                : "var(--color-danger)",
              color: "white",
              borderRadius: radius.sm,
              textAlign: "center",
              fontSize: "0.95rem",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
              vMix
            </div>
            <div>{connectionStatus.message}</div>
          </div>

          {/* Кнопка настроек vMix */}
          <Button
            variant="primary"
            onClick={() => navigate("/vmix/settings")}
            style={{ fontWeight: "bold", width: "100%" }}
          >
            Настройки vMix
          </Button>
        </div>
      </div>

      {/* Навигация (внизу страницы, на всю ширину) */}
      <div
        style={{
          display: "flex",
          gap: space.md,
          justifyContent: "center",
          marginTop: space.md,
          flexWrap: "wrap",
        }}
      >
        <Button variant="primary" onClick={() => navigate("/match/settings")}>
          Настройки матча
        </Button>
        <Button variant="accent" onClick={() => navigate("/match/roster")}>
          Управление составами
        </Button>
        <Button variant="warning" onClick={() => navigate("/mobile/access")}>
          Мобильный доступ
        </Button>
        <Button variant="secondary" onClick={() => navigate("/tv")}>
          ТВ-табло
        </Button>
      </div>

      {/* Ссылки для vMix / OBS / браузера */}
      <div
        style={{
          backgroundColor: "var(--color-surface-muted)",
          padding: space.lg,
          borderRadius: radius.sm,
          marginTop: space.lg,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: space.md }}>
          Ссылки для vMix / OBS / браузера
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
          {/* ТВ-табло */}
          <TVLinkSection />
        </div>
      </div>

      {/* Модальное окно редактирования партии */}
      {modalData && (
        <SetEditModal
          key={editingSetNumber} // Добавляем key для предотвращения проблем с ре-рендерами
          isOpen={true}
          onClose={() => setEditingSetNumber(null)}
          set={modalData.setToEdit}
          isCurrentSet={modalData.isCurrentSet}
          timezone={match.timezone}
          match={match}
          onSave={handleSetSave}
        />
      )}
    </div>
  );
}

export default MatchControlPage;
