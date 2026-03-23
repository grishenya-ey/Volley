import { memo } from 'react';
import type { Match } from '../../shared/types/Match';
import { getRules, type MatchWithVariant } from '../../shared/volleyballRules';
import { SET_STATUS } from '../../shared/types/Match';

export interface TVScoreboardProps {
  match: Match | null;
}

const TVScoreboard = memo(function TVScoreboard({ match }: TVScoreboardProps) {
  if (!match) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#888',
        fontSize: '2rem',
        fontWeight: 'bold',
      }}>
        Нет данных матча
      </div>
    );
  }

  const { teamA, teamB, currentSet, sets } = match;
  const { scoreA, scoreB, servingTeam } = currentSet;

  // Вычисляем сетбол/матчбол через getRules
  const rules = getRules(match as unknown as MatchWithVariant);
  const setballInfo = currentSet.status === SET_STATUS.IN_PROGRESS
    ? rules.isSetball(scoreA, scoreB, currentSet.setNumber)
    : { isSetball: false, team: null };
  const matchballInfo = currentSet.status === SET_STATUS.IN_PROGRESS
    ? rules.isMatchball(sets, currentSet.setNumber, scoreA, scoreB)
    : { isMatchball: false, team: null };

  const isSetballNow = setballInfo.isSetball;
  const setballTeam = setballInfo.team;
  const isMatchballNow = matchballInfo.isMatchball;
  const matchballTeam = matchballInfo.team;

  // Счет по партиям
  const completedSets = sets.filter(s => s.completed && s.status === 'completed');

  // Форматируем счет по партиям
  const getSetScore = (setNumber: number) => {
    const set = sets.find(s => s.setNumber === setNumber);
    if (set && set.completed) {
      return `${set.scoreA} - ${set.scoreB}`;
    }
    return '-';
  };

  // Определяем победителя по партиям (точки для визуализации)
  const getSetWinnerDot = (setNumber: number) => {
    const set = sets.find(s => s.setNumber === setNumber);
    if (!set || !set.completed) return null;
    if (set.scoreA > set.scoreB) return 'A';
    if (set.scoreB > set.scoreA) return 'B';
    return null;
  };

  const textColor = '#ffffff';
  const accentColor = '#ffd700';
  const teamAColor = teamA.color || '#3498db';
  const teamBColor = teamB.color || '#e74c3c';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      boxSizing: 'border-box',
    }}>
      {/* Заголовок турнира */}
      {(match.tournament || match.tournamentSubtitle) && (
        <div style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}>
          {match.tournament && (
            <div style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
              fontWeight: 'bold',
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '0.5rem',
            }}>
              {match.tournament}
            </div>
          )}
          {match.tournamentSubtitle && (
            <div style={{
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              color: '#888',
            }}>
              {match.tournamentSubtitle}
            </div>
          )}
        </div>
      )}

      {/* Место и дата */}
      {(match.location || match.venue || match.date) && (
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#666',
          fontSize: 'clamp(0.9rem, 1.5vw, 1.2rem)',
        }}>
          {[match.location, match.venue].filter(Boolean).join(', ')}
          {match.date && ` • ${match.date}`}
        </div>
      )}

      {/* Основное табло */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
      }}>
        {/* Команды и счет */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(2rem, 5vw, 4rem)',
          width: '100%',
          maxWidth: '1400px',
        }}>
          {/* Команда А */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}>
            {/* Логотип команды А */}
            {teamA.logo && (
              <div style={{
                width: 'clamp(100px, 15vw, 180px)',
                height: 'clamp(100px, 15vw, 180px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '1rem',
                padding: '1rem',
              }}>
                <img
                  src={teamA.logo}
                  alt={teamA.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
            
            {/* Название команды А */}
            <div style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
              fontWeight: 'bold',
              color: teamAColor,
              textAlign: 'center',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 1rem',
            }}>
              {teamA.name}
            </div>

            {/* Тайм-ауты команды А */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.5rem',
            }}>
              {[0, 1].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 'clamp(25px, 4vw, 40px)',
                    height: 'clamp(25px, 4vw, 40px)',
                    borderRadius: '50%',
                    backgroundColor: i < (match.timeouts?.teamA || 0) ? accentColor : 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    transition: 'background-color 0.3s',
                  }}
                  title={`Тайм-аут ${i + 1}`}
                />
              ))}
            </div>

            {/* Счет команды А */}
            <div style={{
              fontSize: 'clamp(6rem, 20vw, 15rem)',
              fontWeight: 'bold',
              color: textColor,
              lineHeight: 1,
              position: 'relative',
            }}>
              {scoreA}
              {servingTeam === 'A' && (
                <div style={{
                  position: 'absolute',
                  top: '10%',
                  right: '-20%',
                  width: '0',
                  height: '0',
                  borderLeft: 'clamp(15px, 3vw, 25px) solid transparent',
                  borderRight: 'clamp(15px, 3vw, 25px) solid transparent',
                  borderBottom: 'clamp(15px, 3vw, 25px) solid accentColor',
                  animation: 'pulse 1.5s infinite',
                }} />
              )}
            </div>

            {/* Индикаторы сетбола/матчбола для А */}
            <div style={{ height: '2.5rem' }}>
              {isMatchballNow && matchballTeam === 'A' && (
                <div style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '999px',
                  fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  animation: 'pulse 1s infinite',
                }}>
                  Матчбол
                </div>
              )}
              {isSetballNow && setballTeam === 'A' && !isMatchballNow && (
                <div style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '999px',
                  fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Сетбол
                </div>
              )}
            </div>
          </div>

          {/* Разделитель */}
          <div style={{
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            color: '#444',
            fontWeight: 'bold',
          }}>
            :
          </div>

          {/* Команда Б */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}>
            {/* Логотип команды Б */}
            {teamB.logo && (
              <div style={{
                width: 'clamp(100px, 15vw, 180px)',
                height: 'clamp(100px, 15vw, 180px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '1rem',
                padding: '1rem',
              }}>
                <img
                  src={teamB.logo}
                  alt={teamB.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
            
            {/* Название команды Б */}
            <div style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
              fontWeight: 'bold',
              color: teamBColor,
              textAlign: 'center',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 1rem',
            }}>
              {teamB.name}
            </div>

            {/* Тайм-ауты команды Б */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.5rem',
            }}>
              {[0, 1].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 'clamp(25px, 4vw, 40px)',
                    height: 'clamp(25px, 4vw, 40px)',
                    borderRadius: '50%',
                    backgroundColor: i < (match.timeouts?.teamB || 0) ? accentColor : 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    transition: 'background-color 0.3s',
                  }}
                  title={`Тайм-аут ${i + 1}`}
                />
              ))}
            </div>

            {/* Счет команды Б */}
            <div style={{
              fontSize: 'clamp(6rem, 20vw, 15rem)',
              fontWeight: 'bold',
              color: textColor,
              lineHeight: 1,
              position: 'relative',
            }}>
              {scoreB}
              {servingTeam === 'B' && (
                <div style={{
                  position: 'absolute',
                  top: '10%',
                  right: '-20%',
                  width: '0',
                  height: '0',
                  borderLeft: 'clamp(15px, 3vw, 25px) solid transparent',
                  borderRight: 'clamp(15px, 3vw, 25px) solid transparent',
                  borderBottom: 'clamp(15px, 3vw, 25px) solid accentColor',
                  animation: 'pulse 1.5s infinite',
                }} />
              )}
            </div>

            {/* Индикаторы сетбола/матчбола для Б */}
            <div style={{ height: '2.5rem' }}>
              {isMatchballNow && matchballTeam === 'B' && (
                <div style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '999px',
                  fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  animation: 'pulse 1s infinite',
                }}>
                  Матчбол
                </div>
              )}
              {isSetballNow && setballTeam === 'B' && !isMatchballNow && (
                <div style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '999px',
                  fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Сетбол
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Счет по партиям */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '1rem',
          padding: 'clamp(1rem, 2vw, 2rem)',
          marginTop: '2rem',
          width: '100%',
          maxWidth: '800px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 'clamp(0.5rem, 1vw, 1rem)',
            textAlign: 'center',
          }}>
            {[1, 2, 3, 4, 5].map((setNum) => {
              const set = sets.find(s => s.setNumber === setNum);
              const isCompleted = set?.completed;
              const winner = getSetWinnerDot(setNum);
              
              return (
                <div
                  key={setNum}
                  style={{
                    backgroundColor: isCompleted ? 'rgba(255,255,255,0.1)' : 'transparent',
                    borderRadius: '0.5rem',
                    padding: 'clamp(0.5rem, 1vw, 1rem)',
                    opacity: isCompleted ? 1 : 0.5,
                  }}
                >
                  <div style={{
                    fontSize: 'clamp(0.8rem, 1.5vw, 1rem)',
                    color: '#888',
                    marginBottom: '0.25rem',
                  }}>
                    Партия {setNum}
                  </div>
                  <div style={{
                    fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
                    fontWeight: 'bold',
                    color: textColor,
                  }}>
                    {getSetScore(setNum)}
                  </div>
                  {winner && (
                    <div style={{
                      fontSize: 'clamp(0.8rem, 1.5vw, 1rem)',
                      color: winner === 'A' ? teamAColor : teamBColor,
                      marginTop: '0.25rem',
                      fontWeight: 'bold',
                    }}>
                      ●
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Текущая партия */}
        <div style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.8rem)',
          color: accentColor,
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          Партия {currentSet.setNumber}
        </div>
      </div>

      {/* CSS анимации */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
});

export default TVScoreboard;
