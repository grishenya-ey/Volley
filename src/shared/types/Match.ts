/**
 * Типы данных для матча
 */

/**
 * Константы состояний партий
 */
export const SET_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type SetStatus = typeof SET_STATUS[keyof typeof SET_STATUS];

/**
 * Enum для состояний партий (для удобства использования)
 */
export enum SET_STATUS_ENUM {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface Player {
  number: number;
  name: string;
  position: string;
  isStarter: boolean;
  numberOnCard?: string; // Номер игрока на карте (опционально)
}

export interface Team {
  name: string;
  color: string; // Цвет формы игроков
  liberoColor?: string; // Цвет формы либеро
  city?: string; // Город команды
  logo?: string; // base64 или путь к файлу (для отображения в UI)
  logoPath?: string; // Путь к файлу логотипа (для vMix, main process)
  logoBase64?: string; // base64 для сохранения в JSON и переносимости
  coach?: string;
  roster?: Player[];
  startingLineupOrder?: number[]; // Индексы игроков из roster в порядке стартового состава
}

export interface Officials {
  referee1?: string;
  referee2?: string;
  lineJudge1?: string;
  lineJudge2?: string;
  scorer?: string;
}

export interface Set {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  completed: boolean; // Оставить для обратной совместимости
  status: SetStatus; // Статус партии: 'pending' | 'in_progress' | 'completed' (обязательное поле)
  startTime?: number; // Timestamp начала партии (milliseconds)
  endTime?: number; // Timestamp завершения партии (milliseconds)
  duration?: number; // Продолжительность в минутах (вычисляемое поле)
}

export interface CurrentSet {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  servingTeam: 'A' | 'B';
  status: SetStatus; // Статус текущей партии: 'pending' | 'in_progress' (обязательное поле)
  startTime?: number; // Timestamp начала текущей партии
  endTime?: number; // Timestamp завершения текущей партии (если завершена)
}

export interface Statistics {
  enabled: boolean;
  teamA: {
    attack: number;
    block: number;
    serve: number;
    opponentErrors: number;
  };
  teamB: {
    attack: number;
    block: number;
    serve: number;
    opponentErrors: number;
  };
}

/**
 * Тайм-ауты для текущей партии
 */
export interface Timeouts {
  teamA: number; // Количество использованных тайм-аутов командой A
  teamB: number; // Количество использованных тайм-аутов командой B
  activeTimeout?: {
    team: 'A' | 'B'; // Какая команда взяла тайм-аут
    startTime: number; // Timestamp начала тайм-аута (milliseconds)
    duration: number; // Продолжительность в миллисекундах (30000 = 30 секунд)
  } | null;
}

export interface Match {
  matchId: string;
  variant: 'indoor' | 'beach' | 'snow' | 'indoor-3sets'; // Тип игры: зал, пляж, снежный, зал из 3х партий
  tournament?: string; // Заголовок (название турнира)
  tournamentSubtitle?: string; // Подзаголовок (название турнира)
  location?: string; // Город, страна
  venue?: string; // Место проведения
  date?: string; // ISO date
  time?: string; // ISO time
  timezone?: string; // Часовой пояс (IANA timezone, например "Europe/Moscow")
  teamA: Team;
  teamB: Team;
  officials?: Officials;
  sets: Set[];
  currentSet: CurrentSet;
  statistics: Statistics;
  timeouts: Timeouts; // Тайм-ауты текущей партии
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

/**
 * Создает новый пустой матч
 */
export function createNewMatch(): Match {
  const now = new Date().toISOString();
  // Получаем часовой пояс по умолчанию из системы
  const defaultTimezone = typeof Intl !== 'undefined' && Intl.DateTimeFormat 
    ? Intl.DateTimeFormat().resolvedOptions().timeZone 
    : 'UTC';
  
  return {
    matchId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateUUID(),
    variant: 'indoor',
    tournament: '',
    tournamentSubtitle: '',
    location: '',
    venue: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    timezone: defaultTimezone,
    teamA: {
      name: 'Команда А',
      color: '#3498db',
      liberoColor: undefined,
      logo: undefined,
      coach: '',
      roster: [],
    },
    teamB: {
      name: 'Команда Б',
      color: '#e74c3c',
      liberoColor: undefined,
      logo: undefined,
      coach: '',
      roster: [],
    },
    officials: {
      referee1: '',
      referee2: '',
      lineJudge1: '',
      lineJudge2: '',
      scorer: '',
    },
    sets: [],
    currentSet: {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      servingTeam: 'A',
      status: SET_STATUS.PENDING, // Добавить статус по умолчанию
    },
    statistics: {
      enabled: false,
      teamA: {
        attack: 0,
        block: 0,
        serve: 0,
        opponentErrors: 0,
      },
      teamB: {
        attack: 0,
        block: 0,
        serve: 0,
        opponentErrors: 0,
      },
    },
    timeouts: {
      teamA: 0,
      teamB: 0,
      activeTimeout: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Валидация данных матча
 */
export function validateMatch(match: any): match is Match {
  if (!match || typeof match !== 'object') {
    return false;
  }

  if (!match.matchId || typeof match.matchId !== 'string') {
    return false;
  }

  if (!match.teamA || !match.teamB) {
    return false;
  }

  if (!match.teamA.name || !match.teamB.name) {
    return false;
  }

  if (!match.currentSet) {
    return false;
  }

  // Проверяем наличие обязательного поля status в currentSet
  if (!match.currentSet.status || typeof match.currentSet.status !== 'string') {
    return false;
  }

  if (!Array.isArray(match.sets)) {
    return false;
  }

  // Проверяем наличие обязательного поля status в каждой партии
  for (const set of match.sets) {
    if (!set.status || typeof set.status !== 'string') {
      return false;
    }
  }

  if (!match.statistics) {
    return false;
  }

  // Проверяем наличие timeouts (для обратной совместимости)
  if (!match.timeouts) {
    match.timeouts = { teamA: 0, teamB: 0 };
  }

  return true;
}

/**
 * Простая генерация UUID (fallback для окружений без crypto.randomUUID)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

