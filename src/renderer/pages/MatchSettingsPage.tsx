import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Match } from '../../shared/types/Match';
import { useVMix } from '../hooks/useVMix';
import { useHeaderButtons } from '../components/Layout';
import Button from '../components/Button';
import TeamColorsEditor from '../components/TeamColorsEditor';
import TeamLogoEditor from '../components/TeamLogoEditor';
import { space, radius } from '../theme/tokens';
import { VARIANTS } from '../../shared/volleyballRulesConfig';
import { MatchDomain } from '../../shared/domain/MatchDomain';

export interface MatchSettingsPageProps {
  match: Match | null;
  onMatchChange: (match: Match) => void;
}

function MatchSettingsPage({ match: propMatch, onMatchChange }: MatchSettingsPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setButtons } = useHeaderButtons();

  // Получаем match из location.state динамически при каждом рендере
  const matchFromState = (location.state as { match?: Match } | null)?.match;

  // Используем match из пропсов или из state
  const [match, setMatch] = useState<Match | null>(null);
  
  // Обновляем match при изменении propMatch или matchFromState
  useEffect(() => {
    const newMatch = propMatch || matchFromState;
    if (newMatch) {
      setMatch(newMatch);
    }
  }, [propMatch, matchFromState]);

  // Получаем updateMatchData, resetImageFieldsCache и updateReferee2Data из useVMix для принудительного обновления при сохранении
  const { updateMatchData, connectionStatus, resetImageFieldsCache, updateReferee2Data } = useVMix(match);

  // Используем useRef для отслеживания matchId, чтобы не перезаписывать formData при изменении логотипов
  const lastMatchIdRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    variant: VARIANTS.INDOOR,
    tournament: '',
    tournamentSubtitle: '',
    location: '',
    venue: '',
    date: '',
    time: '',
    timezone: '',
    teamAName: '',
    teamAColor: '#3498db',
    teamALiberoColor: '',
    teamACity: '',
    teamBName: '',
    teamBColor: '#e74c3c',
    teamBLiberoColor: '',
    teamBCity: '',
    referee1: '',
    referee2: '',
    lineJudge1: '',
    lineJudge2: '',
    scorer: '',
  });

  // Ref для актуального formData: кнопка «Сохранить» в хедере создаётся в useEffect и может захватывать
  // устаревшее замыкание (пустой formData при первой загрузке) — handleSave читает formDataRef.current
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Список популярных часовых поясов
  const timezones = [
    { value: 'Europe/Moscow', label: 'Москва (MSK, UTC+3)' },
    { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
    { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
    { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
    { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
    { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
    { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
    { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
    { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
    { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
    { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
    { value: 'Europe/Kiev', label: 'Киев (UTC+2)' },
    { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
    { value: 'Europe/Warsaw', label: 'Варшава (UTC+1/+2)' },
    { value: 'Europe/Berlin', label: 'Берлин (UTC+1/+2)' },
    { value: 'Europe/Paris', label: 'Париж (UTC+1/+2)' },
    { value: 'Europe/London', label: 'Лондон (UTC+0/+1)' },
    { value: 'America/New_York', label: 'Нью-Йорк (UTC-5/-4)' },
    { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8/-7)' },
    { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
    { value: 'Asia/Shanghai', label: 'Шанхай (UTC+8)' },
    { value: 'UTC', label: 'UTC (UTC+0)' },
  ];

  // Загружаем матч из Electron API, если его нет
  useEffect(() => {
    const loadMatch = async () => {
      if (!match && window.electronAPI) {
        try {
          // Пытаемся получить текущий матч из main процесса
          // Это может быть через какой-то API, но пока используем location.state
          // Если location.state есть, используем его
          if (matchFromState) {
            setMatch(matchFromState);
            return;
          }
        } catch (error) {
          console.error('Ошибка при загрузке матча:', error);
        }
      }
    };
    
    loadMatch();
  }, []);

  // Обновляем match при изменении propMatch или matchFromState
  useEffect(() => {
    if (propMatch) {
      setMatch(propMatch);
    } else if (matchFromState) {
      setMatch(matchFromState);
    }
  }, [propMatch, matchFromState, location]);

  useEffect(() => {
    if (!match) {
      // Не делаем редирект сразу, даем время загрузить матч
      const timer = setTimeout(() => {
        if (!match) {
          navigate('/');
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // ВАЖНО: Обновляем formData только при смене матча (когда matchId изменился)
    // Используем matchId в зависимостях, а не match — иначе при получении нового объекта match
    // с тем же matchId (например, при обновлении из useVMix или смене variant) эффект запускался бы
    // и перезаписывал formData данными из match, теряя несохранённые правки в текстовых полях
    const currentMatchId = match.matchId;
    const lastMatchId = lastMatchIdRef.current;

    // Если matchId изменился (новый матч) или это первая инициализация (lastMatchId === null)
    if (currentMatchId !== lastMatchId) {
      lastMatchIdRef.current = currentMatchId;

      const defaultTimezone = typeof Intl !== 'undefined' && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC';

      setFormData({
        variant: match.variant || VARIANTS.INDOOR,
        tournament: match.tournament || '',
        tournamentSubtitle: match.tournamentSubtitle || '',
        location: match.location || '',
        venue: match.venue || '',
        date: match.date || '',
        time: match.time || '',
        timezone: match.timezone || defaultTimezone,
        teamAName: match.teamA.name || '',
        teamAColor: match.teamA.color || '#3498db',
        teamALiberoColor: match.teamA.liberoColor || '',
        teamACity: match.teamA.city || '',
        teamBName: match.teamB.name || '',
        teamBColor: match.teamB.color || '#e74c3c',
        teamBLiberoColor: match.teamB.liberoColor || '',
        teamBCity: match.teamB.city || '',
        referee1: match.officials?.referee1 || '',
        referee2: match.officials?.referee2 || '',
        lineJudge1: match.officials?.lineJudge1 || '',
        lineJudge2: match.officials?.lineJudge2 || '',
        scorer: match.officials?.scorer || '',
      });
    } else if (match.variant && match.variant !== formData.variant) {
      // Если variant в match изменился (после сохранения), обновляем formData
      setFormData(prev => ({ ...prev, variant: match.variant }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- намеренно используем match?.matchId вместо match:
    // при смене типа игры (variant) или других обновлениях match с тем же matchId не должно перезаписывать formData
  }, [match?.matchId, match?.variant, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!match) return;

    // Используем formDataRef — кнопка «Сохранить» в хедере создаётся в useEffect и может захватывать
    // устаревшее замыкание (пустой formData при первой загрузке)
    const fd = formDataRef.current;
    
    // Проверяем, что variant является допустимым значением
    const validVariants = [VARIANTS.INDOOR, VARIANTS.BEACH, VARIANTS.SNOW, VARIANTS.INDOOR_3SETS];
    const variant = validVariants.includes(fd.variant) ? fd.variant : VARIANTS.INDOOR;

    const updatedMatch = {
      ...match,
      variant,
      tournament: fd.tournament,
      tournamentSubtitle: fd.tournamentSubtitle,
      location: fd.location,
      venue: fd.venue,
      date: fd.date,
      time: fd.time,
      timezone: fd.timezone,
      teamA: {
        ...match.teamA,
        name: fd.teamAName,
        color: fd.teamAColor,
        liberoColor: fd.teamALiberoColor || undefined,
        city: fd.teamACity,
        // ВАЖНО: Сохраняем все поля логотипа из текущего match (который может быть обновлен после swapTeams)
        // После swap-teams logoPath уже обновлен с новыми уникальными именами файлов
        // Нужно сохранить эти актуальные logoPath, а не перезаписывать их
        logo: match.teamA.logo,
        logoPath: match.teamA.logoPath, // Используем актуальный logoPath из match (после swap-teams он уже обновлен)
        logoBase64: match.teamA.logoBase64, // Используем актуальный logoBase64 из match
      },
      teamB: {
        ...match.teamB,
        name: fd.teamBName,
        color: fd.teamBColor,
        liberoColor: fd.teamBLiberoColor || undefined,
        city: fd.teamBCity,
        // ВАЖНО: Сохраняем все поля логотипа из текущего match (который может быть обновлен после swapTeams)
        // После swap-teams logoPath уже обновлен с новыми уникальными именами файлов
        // Нужно сохранить эти актуальные logoPath, а не перезаписывать их
        logo: match.teamB.logo,
        logoPath: match.teamB.logoPath, // Используем актуальный logoPath из match (после swap-teams он уже обновлен)
        logoBase64: match.teamB.logoBase64, // Используем актуальный logoBase64 из match
      },
      officials: {
        referee1: fd.referee1,
        referee2: fd.referee2,
        lineJudge1: fd.lineJudge1,
        lineJudge2: fd.lineJudge2,
        scorer: fd.scorer,
      },
      updatedAt: new Date().toISOString(),
    };

    // Обновляем матч в Electron API
    // ВАЖНО: setCurrentMatch обновляет logoPath в матче, поэтому используем обновленный матч
    let finalMatch = updatedMatch;
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.setCurrentMatch(updatedMatch);
        if (result && result.match) {
          finalMatch = result.match;
        }
        await window.electronAPI.setMobileMatch(finalMatch);
      } catch (error) {
        console.error('Ошибка при сохранении матча:', error);
      }
    }

    // Обновляем матч в родительском компоненте (App.jsx)
    if (onMatchChange) {
      onMatchChange(finalMatch);
    }

    setMatch(finalMatch);
    
    // Принудительно обновляем все данные в vMix при сохранении настроек
    // ВАЖНО: Используем finalMatch с обновленными logoPath
    if (connectionStatus.connected) {
      // ВАЖНО: Сбрасываем кэш логотипов перед обновлением, чтобы гарантировать их обновление
      // Это особенно важно после смены команд местами, когда logoPath изменился
      resetImageFieldsCache();

      // ВАЖНО: Используем finalMatch с актуальными logoPath для обновления vMix
      // finalMatch содержит правильные logoPath после swap-teams
      updateMatchData(finalMatch, true);
      // Обновляем данные обоих судей в плашке 2 судей при сохранении настроек
      if (updateReferee2Data) {
        try {
          const result = await updateReferee2Data(finalMatch);
          if (!result.success) {
            console.error('Ошибка при обновлении данных судей в плашке 2 судей:', result.error);
          }
        } catch (error) {
          console.error('Ошибка при обновлении данных судей в плашке 2 судей:', error);
        }
      }
    }

    navigate('/match', { state: { match: finalMatch } });
  };

  const handleCancel = () => {
    navigate('/match', { state: { match } });
  };

  // Устанавливаем кнопки в шапку
  useEffect(() => {
    if (match) {
      setButtons(
        <>
          <Button variant="secondary" onClick={handleCancel}>
            Отмена
          </Button>
          <Button variant="success" onClick={handleSave} style={{ fontWeight: 'bold' }}>
            Сохранить изменения
          </Button>
        </>
      );
    }
    return () => setButtons(null);
  }, [match, setButtons]);

  if (!match) {
    return null;
  }

  const variantOptions = [
    { value: VARIANTS.INDOOR, label: 'Зал (до 5 партий, до 25 очков)' },
    { value: VARIANTS.BEACH, label: 'Пляж (до 3 партий, до 21 очка)' },
    { value: VARIANTS.SNOW, label: 'Снежный (до 3 партий, до 15 очков)' },
    { value: VARIANTS.INDOOR_3SETS, label: 'Зал из 3х партий (до 25/15 очков)' },
  ];

  return (
    <div style={{ padding: space.md, maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Настройки матча</h2>

      {/* Тип игры */}
      <div style={{
        backgroundColor: 'var(--color-surface-muted)',
        padding: space.lg,
        borderRadius: radius.sm,
        marginBottom: space.lg,
      }}>
        <h3 style={{ marginTop: 0 }}>Тип игры</h3>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Вариант волейбола
          </label>
          <select
            value={formData.variant || VARIANTS.INDOOR}
            onChange={(e) => handleInputChange('variant', e.target.value)}
            disabled={MatchDomain.hasMatchStarted(match)}
            title={MatchDomain.hasMatchStarted(match) ? 'Тип матча нельзя изменить после начала игры' : ''}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: radius.sm,
              opacity: MatchDomain.hasMatchStarted(match) ? 0.6 : 1,
              cursor: MatchDomain.hasMatchStarted(match) ? 'not-allowed' : 'pointer',
            }}
          >
            {variantOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {MatchDomain.hasMatchStarted(match) && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Тип матча нельзя изменить после начала игры
            </div>
          )}
        </div>
      </div>

      {/* Информация о турнире */}
      <div style={{
        backgroundColor: 'var(--color-surface-muted)',
        padding: space.lg,
        borderRadius: radius.sm,
        marginBottom: space.lg,
      }}>
        <h3 style={{ marginTop: 0 }}>Информация о турнире</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* Первая строка: Заголовок | Подзаголовок */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Заголовок (название турнира)
              </label>
              <input
                type="text"
                value={formData.tournament}
                onChange={(e) => handleInputChange('tournament', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
                placeholder="Введите заголовок турнира"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Подзаголовок (название турнира)
              </label>
              <input
                type="text"
                value={formData.tournamentSubtitle}
                onChange={(e) => handleInputChange('tournamentSubtitle', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
                placeholder="Введите подзаголовок турнира"
              />
            </div>
          </div>
          
          {/* Вторая строка: Город, страна | Место проведения */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Город, страна
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
                placeholder="Введите город и страну"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Место проведения
              </label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => handleInputChange('venue', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
                placeholder="Введите место проведения"
              />
            </div>
          </div>
          
          {/* Третья строка: Дата проведения | Время начала | Часовой пояс */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Дата проведения
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: space.sm, fontWeight: 'bold' }}>
                Время начала
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: space.sm, fontWeight: 'bold' }}>
                Часовой пояс
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Команды */}
      <div style={{
        backgroundColor: 'var(--color-surface-muted)',
        padding: space.lg,
        borderRadius: radius.sm,
        marginBottom: space.lg,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Команды</h3>
          <button
            onClick={async () => {
              if (!match) return;
              
              const confirmed = await window.electronAPI?.showConfirm?.({
                title: 'Подтверждение',
                message: 'Вы уверены, что хотите поменять команды местами? Это действие изменит:\n- Названия команд\n- Цвета команд\n- Логотипы команд\n- Счет в текущей партии\n- Счет во всех завершенных партиях\n- Статистику команд',
              });
              if (!confirmed) return;

              try {
                if (window.electronAPI && window.electronAPI.swapTeams) {
                  console.log('[MatchSettingsPage] До swapTeams:');
                  console.log(`  teamA.name: ${match.teamA?.name}, logoPath: ${match.teamA?.logoPath || 'N/A'}`);
                  console.log(`  teamB.name: ${match.teamB?.name}, logoPath: ${match.teamB?.logoPath || 'N/A'}`);
                  
                  const result = await window.electronAPI.swapTeams(match);
                  if (result.success) {
                    const swappedMatch = result.match;
                    
                    console.log('[MatchSettingsPage] После swapTeams:');
                    console.log(`  teamA.name: ${swappedMatch.teamA?.name}, logoPath: ${swappedMatch.teamA?.logoPath || 'N/A'}`);
                    console.log(`  teamB.name: ${swappedMatch.teamB?.name}, logoPath: ${swappedMatch.teamB?.logoPath || 'N/A'}`);
                    
                    // Обновляем матч в Electron API
                    // ВАЖНО: setCurrentMatch обновляет logoPath в матче, поэтому используем обновленный матч
                    const setCurrentResult = await window.electronAPI.setCurrentMatch(swappedMatch);
                    let finalSwappedMatch = swappedMatch;
                    if (setCurrentResult && setCurrentResult.match) {
                      // Используем обновленный матч с правильными logoPath
                      finalSwappedMatch = setCurrentResult.match;
                      console.log('[MatchSettingsPage] После setCurrentMatch (после swapTeams):');
                      console.log(`  teamA.name: ${finalSwappedMatch.teamA?.name}, logoPath: ${finalSwappedMatch.teamA?.logoPath || 'N/A'}`);
                      console.log(`  teamB.name: ${finalSwappedMatch.teamB?.name}, logoPath: ${finalSwappedMatch.teamB?.logoPath || 'N/A'}`);
                    }
                    
                    await window.electronAPI.setMobileMatch(finalSwappedMatch);
                    
                    // Обновляем матч в родительском компоненте
                    if (onMatchChange) {
                      onMatchChange(finalSwappedMatch);
                    }
                    
                    setMatch(finalSwappedMatch);
                    
                    // Принудительно обновляем все данные в vMix при смене команд местами
                    // Это критически важно, так как меняются все данные команд
                    // ВАЖНО: Используем finalSwappedMatch с обновленными logoPath
                    // Сбрасываем кэш логотипов перед обновлением, чтобы гарантировать их обновление
                    if (connectionStatus.connected) {
                      console.log('[MatchSettingsPage] Обновление данных в vMix после swapTeams:');
                      console.log(`  Используемый матч: teamA.name=${finalSwappedMatch.teamA?.name}, teamB.name=${finalSwappedMatch.teamB?.name}`);
                      console.log(`  teamA.logoPath: ${finalSwappedMatch.teamA?.logoPath || 'N/A'}`);
                      console.log(`  teamB.logoPath: ${finalSwappedMatch.teamB?.logoPath || 'N/A'}`);
                      resetImageFieldsCache();
                      updateMatchData(finalSwappedMatch, true);
                    }
                    
                    // Получаем часовой пояс по умолчанию из системы, если не указан в матче
                    const defaultTimezone = typeof Intl !== 'undefined' && Intl.DateTimeFormat 
                      ? Intl.DateTimeFormat().resolvedOptions().timeZone 
                      : 'UTC';
                    
                    // ВАЖНО: Явно обновляем форму с данными из finalSwappedMatch после swapTeams
                    // Это необходимо, так как команды поменялись местами, и нужно обновить все поля формы
                    // matchId не меняется при swapTeams, поэтому useEffect не обновит formData автоматически
                    setFormData({
                      variant: finalSwappedMatch.variant || VARIANTS.INDOOR,
                      tournament: finalSwappedMatch.tournament || '',
                      tournamentSubtitle: finalSwappedMatch.tournamentSubtitle || '',
                      location: finalSwappedMatch.location || '',
                      venue: finalSwappedMatch.venue || '',
                      date: finalSwappedMatch.date || '',
                      time: finalSwappedMatch.time || '',
                      timezone: finalSwappedMatch.timezone || defaultTimezone,
                      teamAName: finalSwappedMatch.teamA.name || '',
                      teamAColor: finalSwappedMatch.teamA.color || '#3498db',
                      teamALiberoColor: finalSwappedMatch.teamA.liberoColor || '',
                      teamACity: finalSwappedMatch.teamA.city || '',
                      teamBName: finalSwappedMatch.teamB.name || '',
                      teamBColor: finalSwappedMatch.teamB.color || '#e74c3c',
                      teamBLiberoColor: finalSwappedMatch.teamB.liberoColor || '',
                      teamBCity: finalSwappedMatch.teamB.city || '',
                      referee1: finalSwappedMatch.officials?.referee1 || '',
                      referee2: finalSwappedMatch.officials?.referee2 || '',
                      lineJudge1: finalSwappedMatch.officials?.lineJudge1 || '',
                      lineJudge2: finalSwappedMatch.officials?.lineJudge2 || '',
                      scorer: finalSwappedMatch.officials?.scorer || '',
                    });
                    
                    await window.electronAPI?.showMessage?.({ message: 'Команды успешно поменяны местами!' });
                  } else {
                    await window.electronAPI?.showMessage?.({ message: 'Ошибка при смене команд: ' + (result.error || 'Неизвестная ошибка') });
                  }
                } else {
                  await window.electronAPI?.showMessage?.({ message: 'Electron API недоступен' });
                }
              } catch (error) {
                console.error('Ошибка при смене команд:', error);
                await window.electronAPI?.showMessage?.({ message: 'Ошибка при смене команд: ' + error.message });
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: 'var(--color-warning)',
              color: 'white',
              border: 'none',
              borderRadius: radius.sm,
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            title="Поменять команды местами (A ↔ B)"
          >
            <span>⇄</span>
            Поменять команды местами
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Команда А */}
          <div>
            <h4>Команда А</h4>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Название команды
                </label>
                <input
                  type="text"
                  value={formData.teamAName}
                  onChange={(e) => handleInputChange('teamAName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: radius.sm,
                  }}
                  placeholder="Название команды"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Город
                </label>
                <input
                  type="text"
                  value={formData.teamACity}
                  onChange={(e) => handleInputChange('teamACity', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: radius.sm,
                  }}
                  placeholder="Город команды"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <TeamLogoEditor
                  team={match.teamA}
                  teamLetter="A"
                  match={match}
                  onMatchChange={async (updatedMatch) => {
                    setMatch(updatedMatch);
                    if (window.electronAPI?.setCurrentMatch) {
                      await window.electronAPI.setCurrentMatch(updatedMatch);
                    }
                    if (connectionStatus.connected) {
                      resetImageFieldsCache();
                      updateMatchData(updatedMatch, true);
                    }
                  }}
                />
                <TeamColorsEditor
                  color={formData.teamAColor}
                  liberoColor={formData.teamALiberoColor || ''}
                  colorPlaceholder="#3498db"
                  onChange={({ color, liberoColor }) => {
                    if (color !== undefined) handleInputChange('teamAColor', color);
                    if (liberoColor !== undefined) handleInputChange('teamALiberoColor', liberoColor);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Команда Б */}
          <div>
            <h4>Команда Б</h4>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Название команды
                </label>
                <input
                  type="text"
                  value={formData.teamBName}
                  onChange={(e) => handleInputChange('teamBName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: radius.sm,
                  }}
                  placeholder="Название команды"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Город
                </label>
                <input
                  type="text"
                  value={formData.teamBCity}
                  onChange={(e) => handleInputChange('teamBCity', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: radius.sm,
                  }}
                  placeholder="Город команды"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <TeamLogoEditor
                  team={match.teamB}
                  teamLetter="B"
                  match={match}
                  onMatchChange={async (updatedMatch) => {
                    setMatch(updatedMatch);
                    if (window.electronAPI?.setCurrentMatch) {
                      await window.electronAPI.setCurrentMatch(updatedMatch);
                    }
                    if (connectionStatus.connected) {
                      resetImageFieldsCache();
                      updateMatchData(updatedMatch, true);
                    }
                  }}
                />
                <TeamColorsEditor
                  color={formData.teamBColor}
                  liberoColor={formData.teamBLiberoColor || ''}
                  colorPlaceholder="#e74c3c"
                  onChange={({ color, liberoColor }) => {
                    if (color !== undefined) handleInputChange('teamBColor', color);
                    if (liberoColor !== undefined) handleInputChange('teamBLiberoColor', liberoColor);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Судейская коллегия */}
      <div style={{
        backgroundColor: 'var(--color-surface-muted)',
        padding: '1.5rem',
        borderRadius: radius.sm,
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ marginTop: 0 }}>Судейская коллегия</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Главный судья
              </label>
              <input
                type="text"
                value={formData.referee1}
                onChange={(e) => handleInputChange('referee1', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
                placeholder="Имя главного судьи"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Второй судья
              </label>
              <input
                type="text"
                value={formData.referee2}
                onChange={(e) => handleInputChange('referee2', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
                placeholder="Имя второго судьи"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Судья на линии 1
              </label>
              <input
                type="text"
                value={formData.lineJudge1}
                onChange={(e) => handleInputChange('lineJudge1', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
                placeholder="Имя судьи на линии"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Судья на линии 2
              </label>
              <input
                type="text"
                value={formData.lineJudge2}
                onChange={(e) => handleInputChange('lineJudge2', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: radius.sm,
                }}
                placeholder="Имя судьи на линии"
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Секретарь
            </label>
            <input
              type="text"
              value={formData.scorer}
              onChange={(e) => handleInputChange('scorer', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid var(--color-border)',
                borderRadius: radius.sm,
              }}
              placeholder="Имя секретаря"
            />
          </div>
        </div>
      </div>

      {/* Кнопки */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleCancel}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: 'var(--color-neutral)',
            color: 'white',
            border: 'none',
            borderRadius: radius.sm,
            cursor: 'pointer',
          }}
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: 'var(--color-success)',
            color: 'white',
            border: 'none',
            borderRadius: radius.sm,
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Сохранить изменения
        </button>
      </div>
    </div>
  );
}

export default MatchSettingsPage;

