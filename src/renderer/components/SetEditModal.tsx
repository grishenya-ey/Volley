import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Set, Match } from '../../shared/types/Match';
import { SET_STATUS } from '../../shared/types/Match';
import { formatTimestamp, calculateDuration, formatDuration } from '../../shared/timeUtils';
import { SetDomain } from '../../shared/domain/SetDomain';
import Button from './Button';
import { space, radius } from '../theme/tokens';

export interface SetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  set: Set | null;
  isCurrentSet: boolean;
  timezone?: string;
  match: Match | null;
  onSave: (setNumber: number, updates: Partial<Set>) => void;
}

/**
 * Модальное окно для редактирования партии
 */
export default function SetEditModal({
  isOpen,
  onClose,
  set,
  isCurrentSet,
  timezone,
  match,
  onSave,
}: SetEditModalProps) {
  const [formData, setFormData] = useState<{
    scoreA: number;
    scoreB: number;
    status: string;
    startTime: number | null;
    endTime: number | null;
  }>({
    scoreA: 0,
    scoreB: 0,
    status: SET_STATUS.PENDING,
    startTime: null,
    endTime: null,
  });
  const [errors, setErrors] = useState<string[]>([]);

  const determineSetStatus = (setArg: Set | null): string => {
    console.log('[SetEditModal.determineSetStatus] Входные данные:', {
      setNumber: setArg?.setNumber,
      status: setArg?.status,
      completed: setArg?.completed,
      startTime: setArg?.startTime,
      endTime: setArg?.endTime,
      fullSet: setArg,
    });

    if (!setArg) {
      console.log('[SetEditModal.determineSetStatus] set отсутствует, возвращаем PENDING');
      return SET_STATUS.PENDING;
    }

    if (SetDomain.isCompleted(setArg)) {
      console.log('[SetEditModal.determineSetStatus] Найден completed === true, возвращаем COMPLETED');
      return SET_STATUS.COMPLETED;
    }
    
    const validStatuses = [SET_STATUS.COMPLETED, SET_STATUS.IN_PROGRESS, SET_STATUS.PENDING];
    if (setArg.status && validStatuses.includes(setArg.status)) {
      console.log('[SetEditModal.determineSetStatus] Найден валидный status:', setArg.status);
      return setArg.status;
    }

    if (setArg.startTime && setArg.endTime) {
      console.log('[SetEditModal.determineSetStatus] Найдены оба времени, возвращаем COMPLETED');
      return SET_STATUS.COMPLETED;
    }
    
    if (setArg.startTime) {
      console.log('[SetEditModal.determineSetStatus] Найдено только startTime, возвращаем IN_PROGRESS');
      return SET_STATUS.IN_PROGRESS;
    }
    
    console.log('[SetEditModal.determineSetStatus] Не найдено признаков завершенности, возвращаем PENDING');
    return SET_STATUS.PENDING;
  };
  
  /**
   * Проверяет, началась ли любая последующая партия (после текущей редактируемой)
   * @returns {boolean} true, если любая последующая партия уже началась
   */
  const isAnySubsequentSetStarted = () => {
    if (!match || !set) return false;
    const currentSetNumber = set.setNumber;
    
    console.log('[SetEditModal.isAnySubsequentSetStarted] Проверка:', {
      currentSetNumber,
      sets: match.sets.map(s => ({ setNumber: s.setNumber, status: s.status })),
      currentSet: {
        setNumber: match.currentSet.setNumber,
        status: match.currentSet.status,
      },
    });
    
    // Проверяем завершенные партии в sets - если есть партия с номером больше текущей, значит последующая уже началась и завершилась
    const hasSubsequentCompletedSet = match.sets.some(s => s.setNumber > currentSetNumber);
    
    // Проверяем текущую партию - если ее номер больше редактируемой И она в игре, значит последующая уже началась
    // Важно: если currentSet.setNumber > currentSetNumber, но статус PENDING, значит партия еще не началась
    const currentSetNumberIsGreater = match.currentSet.setNumber > currentSetNumber;
    const currentSetIsInProgress = currentSetNumberIsGreater && match.currentSet.status === SET_STATUS.IN_PROGRESS;
    
    const result = hasSubsequentCompletedSet || currentSetIsInProgress;
    console.log('[SetEditModal.isAnySubsequentSetStarted] Результат:', {
      hasSubsequentCompletedSet,
      currentSetNumberIsGreater,
      currentSetStatus: match.currentSet.status,
      currentSetIsInProgress,
      result,
    });
    
    return result;
  };
  
  /**
   * Определяет, является ли редактируемая партия завершенной
   * Проверяет как formData.status, так и исходный set
   * @returns {boolean} true, если партия завершена
   */
  const getIsCompletedSet = () => {
    console.log('[SetEditModal.getIsCompletedSet] Проверка:', {
      isCurrentSet,
      setNumber: set?.setNumber,
      setStatus: set?.status,
      setCompleted: set?.completed,
      setStartTime: set?.startTime,
      setEndTime: set?.endTime,
      formDataStatus: formData.status,
    });
    
    // Если это текущая партия, она не может быть завершенной
    if (isCurrentSet) {
      console.log('[SetEditModal.getIsCompletedSet] Это текущая партия, возвращаем false');
      return false;
    }
    
    // Если set не передан, не можем определить статус
    if (!set) {
      console.log('[SetEditModal.getIsCompletedSet] set отсутствует, возвращаем false');
      return false;
    }
    
    // Проверяем исходный set (приоритет), так как formData может быть еще не обновлен
    // Приоритет 1: явный статус
    if (set.status === SET_STATUS.COMPLETED) {
      console.log('[SetEditModal.getIsCompletedSet] Найден status === COMPLETED, возвращаем true');
      return true;
    }

    if (SetDomain.isCompleted(set)) {
      console.log('[SetEditModal.getIsCompletedSet] Найден completed === true, возвращаем true');
      return true;
    }
    
    if (set.startTime && set.endTime) {
      console.log('[SetEditModal.getIsCompletedSet] Найдены оба времени, возвращаем true');
      return true;
    }
    
    // Приоритет 4: проверяем formData.status как fallback
    const result = formData.status === SET_STATUS.COMPLETED;
    console.log('[SetEditModal.getIsCompletedSet] Проверка formData.status, возвращаем:', result);
    return result;
  };
  
  /**
   * Определяет доступные опции статуса для select
   * @returns {Array} Массив объектов {value, label}
   */
  const getStatusOptions = () => {
    console.log('[SetEditModal.getStatusOptions] Определение опций:', {
      isCurrentSet,
      formDataStatus: formData.status,
      setNumber: set?.setNumber,
      setStatus: set?.status,
      setCompleted: set?.completed,
    });
    
    // Для текущей партии в игре доступны только "В игре" и "Не начата"
    if (isCurrentSet && formData.status === SET_STATUS.IN_PROGRESS) {
      console.log('[SetEditModal.getStatusOptions] Текущая партия в игре, возвращаем [IN_PROGRESS, PENDING]');
      return [
        { value: SET_STATUS.IN_PROGRESS, label: 'В игре' },
        { value: SET_STATUS.PENDING, label: 'Не начата' },
      ];
    }
    
    // Для завершенной партии проверяем, началась ли любая последующая
    const isCompletedSet = getIsCompletedSet();
    console.log('[SetEditModal.getStatusOptions] isCompletedSet:', isCompletedSet);
    
    if (isCompletedSet && match) {
      const subsequentSetStarted = isAnySubsequentSetStarted();
      console.log('[SetEditModal.getStatusOptions] subsequentSetStarted:', subsequentSetStarted);
      
      if (!subsequentSetStarted) {
        // Если последующая партия не началась, доступны "Завершена" и "В игре"
        console.log('[SetEditModal.getStatusOptions] Последующая партия не началась, возвращаем [COMPLETED, IN_PROGRESS]');
        return [
          { value: SET_STATUS.COMPLETED, label: 'Завершена' },
          { value: SET_STATUS.IN_PROGRESS, label: 'В игре' },
        ];
      }
      // Если любая последующая партия началась, доступна только "Завершена"
      console.log('[SetEditModal.getStatusOptions] Последующая партия началась, возвращаем [COMPLETED]');
      return [
        { value: SET_STATUS.COMPLETED, label: 'Завершена' },
      ];
    }
    
    // Для партий в других статусах (pending, in_progress не текущая)
    console.log('[SetEditModal.getStatusOptions] Другие статусы, возвращаем все опции');
    return [
      { value: SET_STATUS.PENDING, label: 'Не начата' },
      { value: SET_STATUS.IN_PROGRESS, label: 'В игре' },
      { value: SET_STATUS.COMPLETED, label: 'Завершена' },
    ];
  };
  
  // Инициализация формы при открытии модального окна
  useEffect(() => {
    if (!isOpen || !set) return;
    
    console.log('[SetEditModal.useEffect] Инициализация формы:', {
      isOpen,
      setNumber: set.setNumber,
      setStatus: set.status,
      setCompleted: set.completed,
      setStartTime: set.startTime,
      setEndTime: set.endTime,
      isCurrentSet,
      fullSet: set,
    });
    
    // Определяем статус партии с учетом всех признаков завершенности
    let status = determineSetStatus(set);
    console.log('[SetEditModal.useEffect] Статус после determineSetStatus:', status);
    
    // Дополнительная проверка: если партия завершена (по любому признаку), принудительно устанавливаем COMPLETED
    const isActuallyCompleted = SetDomain.isCompleted(set) || 
                                 set.status === SET_STATUS.COMPLETED || 
                                 (set.startTime && set.endTime);
    
    console.log('[SetEditModal.useEffect] Проверка завершенности:', {
      setCompleted: set.completed,
      setStatus: set.status,
      hasBothTimes: !!(set.startTime && set.endTime),
      isActuallyCompleted,
    });
    
    if (isActuallyCompleted) {
      console.log('[SetEditModal.useEffect] Партия завершена, принудительно устанавливаем COMPLETED');
      status = SET_STATUS.COMPLETED;
    }
    
    // Отладочная информация для диагностики проблемы
    if (set.setNumber && isActuallyCompleted && status !== SET_STATUS.COMPLETED) {
      console.warn('[SetEditModal.useEffect] ⚠️ Несоответствие статуса:', {
        setNumber: set.setNumber,
        setStatus: set.status,
        setCompleted: set.completed,
        startTime: set.startTime,
        endTime: set.endTime,
        determinedStatus: status,
        isActuallyCompleted,
        finalStatus: SET_STATUS.COMPLETED,
        setObject: set,
      });
    }
    
    console.log('[SetEditModal.useEffect] Устанавливаем formData со статусом:', status);
    
    setFormData({
      scoreA: set.scoreA || 0,
      scoreB: set.scoreB || 0,
      status: status,
      startTime: set.startTime || null,
      endTime: set.endTime || null,
    });
    setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, set?.setNumber]);
  
  // Вычисляем продолжительность
  const duration = formData.startTime && formData.endTime
    ? calculateDuration(formData.startTime, formData.endTime)
    : null;
  
  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [field]: value,
      };
      
      // При изменении статуса автоматически очищаем время в зависимости от нового статуса
      if (field === 'status') {
        if (value === SET_STATUS.PENDING) {
          // При переходе в pending удаляем время начала и завершения
          newFormData.startTime = null;
          newFormData.endTime = null;
        } else if (value === SET_STATUS.IN_PROGRESS) {
          // При переходе в in_progress удаляем время завершения
          newFormData.endTime = null;
        }
      }
      
      return newFormData;
    });
    setErrors([]);
  };
  
  const handleDateTimeChange = (field, value) => {
    if (!value) {
      handleChange(field, null);
      return;
    }
    
    try {
      // datetime-local всегда интерпретируется как локальное время браузера
      // Но нам нужно сохранить правильный UTC timestamp
      // Если указан часовой пояс матча, нужно учесть разницу между локальным временем браузера
      // и временем в часовом поясе матча
      
      // Получаем компоненты даты/времени из строки
      const [datePart, timePart] = value.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      
      if (timezone) {
        // Пользователь ввел время в часовом поясе матча (отображается в datetime-local)
        // Нужно конвертировать это время в UTC timestamp
        
        // Создаем строку ISO для указанного времени
        const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        
        // Создаем дату, интерпретируя строку как локальное время браузера
        const localDate = new Date(isoString);
        const localTimestamp = localDate.getTime();
        
        // Получаем смещение для указанного часового пояса
        // Для этого создаем временную метку и сравниваем представление в UTC и в указанном часовом поясе
        const testDate = new Date(localTimestamp);
        
        // Получаем строку времени в указанном часовом поясе для этой временной метки
        const tzFormatter = new Intl.DateTimeFormat('en', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        
        const tzParts = tzFormatter.formatToParts(testDate);
        const tzYear = tzParts.find(p => p.type === 'year').value;
        const tzMonth = tzParts.find(p => p.type === 'month').value;
        const tzDay = tzParts.find(p => p.type === 'day').value;
        const tzHour = tzParts.find(p => p.type === 'hour').value;
        const tzMinute = tzParts.find(p => p.type === 'minute').value;
        
        // Сравниваем введенное время с временем в указанном часовом поясе
        // Если они совпадают, значит локальное время браузера соответствует времени в часовом поясе матча
        const tzString = `${tzYear}-${tzMonth}-${tzDay}T${tzHour}:${tzMinute}`;
        const inputString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        
        if (tzString === inputString) {
          // Время совпадает, используем локальное время как есть
          handleChange(field, localTimestamp);
        } else {
          // Время не совпадает, нужно скорректировать
          // Вычисляем разницу между локальным временем и временем в указанном часовом поясе
          const tzDate = new Date(tzString);
          const offsetMs = tzDate.getTime() - localTimestamp;
          
          // Корректируем timestamp
          const correctedTimestamp = localTimestamp - offsetMs;
          handleChange(field, correctedTimestamp);
        }
      } else {
        // Если часовой пояс не указан, используем стандартную конвертацию
        const timestamp = new Date(value).getTime();
        handleChange(field, timestamp);
      }
    } catch (e) {
      console.error('Ошибка при парсинге даты:', e);
      setErrors(['Некорректный формат даты/времени']);
    }
  };
  
  // Проверка пересечения времени с другими партиями
  const validateTimeOverlap = (startTime, endTime) => {
    if (!match || !startTime || !endTime) return null;
    
    const errors = [];
    const currentSetNumber = set.setNumber;
    
    // Проверяем пересечение с предыдущей партией
    const previousSet = match.sets.find(s => s.setNumber === currentSetNumber - 1);
    if (previousSet && previousSet.startTime && previousSet.endTime) {
      // Проверяем, что текущая партия не начинается раньше окончания предыдущей
      if (startTime < previousSet.endTime) {
        errors.push(`Время начала партии ${currentSetNumber} пересекается с временем окончания партии ${currentSetNumber - 1}`);
      }
    }
    
    // Проверяем пересечение со следующей партией
    const nextSetNumber = currentSetNumber + 1;
    const nextSet = match.sets.find(s => s.setNumber === nextSetNumber);
    if (nextSet && nextSet.startTime && nextSet.endTime) {
      // Проверяем, что текущая партия не заканчивается позже начала следующей
      if (endTime > nextSet.startTime) {
        errors.push(`Время окончания партии ${currentSetNumber} пересекается с временем начала партии ${nextSetNumber}`);
      }
    }
    
    // Проверяем пересечение с текущей партией (если она не является редактируемой)
    if (!isCurrentSet && match.currentSet.setNumber === nextSetNumber && match.currentSet.startTime) {
      if (endTime > match.currentSet.startTime) {
        errors.push(`Время окончания партии ${currentSetNumber} пересекается с временем начала партии ${nextSetNumber}`);
      }
    }
    
    return errors.length > 0 ? errors : null;
  };
  
  const handleSave = () => {
    console.log('[SetEditModal.handleSave] Начало сохранения:', {
      formData,
      isStatusChangeBlocked,
      setNumber: set?.setNumber,
    });
    
    // Проверяем, не заблокировано ли изменение статуса
    // Если следующая партия начата, нельзя менять статус на "В игре"
    if (isStatusChangeBlocked && formData.status !== SET_STATUS.COMPLETED) {
      console.log('[SetEditModal.handleSave] Блокировка: следующая партия уже началась');
      setErrors(['Нельзя изменить статус: следующая партия уже началась']);
      return;
    }
    
    const updates = {
      scoreA: parseInt(formData.scoreA, 10),
      scoreB: parseInt(formData.scoreB, 10),
      status: formData.status,
    };
    
    // Логика обработки времени в зависимости от статуса
    if (formData.status === SET_STATUS.PENDING) {
      // Если статус pending - удаляем время начала и завершения
      updates.startTime = null;
      updates.endTime = null;
    } else if (formData.status === SET_STATUS.IN_PROGRESS) {
      // Если статус in_progress - можно указать время начала, но не время завершения
      if (formData.startTime) {
        updates.startTime = formData.startTime;
      }
      updates.endTime = null; // Удаляем время завершения при переходе в in_progress
    } else if (formData.status === SET_STATUS.COMPLETED) {
      // Если статус completed - можно указать оба времени
      if (formData.startTime) {
        updates.startTime = formData.startTime;
      }
      if (formData.endTime) {
        updates.endTime = formData.endTime;
      }
      
      // Проверяем пересечение времени с другими партиями
      if (formData.startTime && formData.endTime) {
        const timeErrors = validateTimeOverlap(formData.startTime, formData.endTime);
        if (timeErrors) {
          console.log('[SetEditModal.handleSave] Ошибки валидации времени:', timeErrors);
          setErrors(timeErrors);
          return;
        }
      }
    }
    
    console.log('[SetEditModal.handleSave] Вызываем onSave с обновлениями:', updates);
    
    // Вызываем onSave, который должен выполнить валидацию
    if (onSave) {
      const result = onSave(updates);
      console.log('[SetEditModal.handleSave] Результат onSave:', result);
      if (result) {
        console.log('[SetEditModal.handleSave] Сохранение успешно, закрываем модальное окно');
        onClose();
      } else {
        console.warn('[SetEditModal.handleSave] Сохранение не удалось, модальное окно остается открытым');
      }
    } else {
      console.error('[SetEditModal.handleSave] onSave не определен!');
    }
  };
  
  if (!isOpen || !set) return null;
  
  // Функция для конвертации timestamp в datetime-local с учетом часового пояса
  const timestampToDateTimeLocal = (timestamp, tz) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    
    // Если указан часовой пояс, конвертируем в локальное время этого часового пояса
    if (tz) {
      // Используем Intl.DateTimeFormat для получения времени в нужном часовом поясе
      // Формат 'en-CA' дает нам YYYY-MM-DD формат
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      
      // Получаем части даты в нужном часовом поясе
      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year').value;
      const month = parts.find(p => p.type === 'month').value;
      const day = parts.find(p => p.type === 'day').value;
      const hour = parts.find(p => p.type === 'hour').value;
      const minute = parts.find(p => p.type === 'minute').value;
      
      return `${year}-${month}-${day}T${hour}:${minute}`;
    } else {
      // Если часовой пояс не указан, используем локальное время системы
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hour}:${minute}`;
    }
  };
  
  // Конвертируем timestamp в datetime-local формат для input с учетом часового пояса
  const startDateTime = timestampToDateTimeLocal(formData.startTime, timezone);
  const endDateTime = timestampToDateTimeLocal(formData.endTime, timezone);
  
  // Мемоизируем функции, чтобы избежать бесконечных циклов
  const isCompletedSet = useMemo(() => getIsCompletedSet(), [isCurrentSet, set, formData.status]);
  const subsequentSetStarted = useMemo(() => isAnySubsequentSetStarted(), [match, set]);
  const isStatusChangeBlocked = useMemo(() => isCompletedSet && match && subsequentSetStarted, [isCompletedSet, match, subsequentSetStarted]);
  const statusOptions = useMemo(() => getStatusOptions(), [isCurrentSet, formData.status, set, match, isCompletedSet, subsequentSetStarted]);
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--color-overlay)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        padding: space.xl,
        borderRadius: radius.md,
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Редактирование партии {set?.setNumber}</h2>
        
        {errors.length > 0 && (
          <div style={{
            backgroundColor: 'var(--color-danger)',
            color: 'white',
            padding: '0.75rem',
            borderRadius: radius.sm,
            marginBottom: space.md,
          }}>
            {errors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </div>
        )}
        
        {/* Предупреждение о блокировке изменения статуса */}
        {isStatusChangeBlocked && (
          <div style={{
            backgroundColor: 'var(--color-warning)',
            color: 'var(--color-text)',
            padding: '0.75rem',
            borderRadius: radius.sm,
            marginBottom: space.md,
          }}>
            Изменение статуса недоступно: следующая партия уже началась. Можно редактировать счет и время.
          </div>
        )}
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Счет команды A:
          </label>
          <input
            type="number"
            min="0"
            value={formData.scoreA}
            onChange={(e) => handleChange('scoreA', e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: radius.sm,
            }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Счет команды B:
          </label>
          <input
            type="number"
            min="0"
            value={formData.scoreB}
            onChange={(e) => handleChange('scoreB', e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: radius.sm,
            }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Статус:
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            disabled={isStatusChangeBlocked}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: radius.sm,
              opacity: isStatusChangeBlocked ? 0.5 : 1,
            }}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Время начала:
          </label>
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => handleDateTimeChange('startTime', e.target.value)}
            disabled={formData.status === SET_STATUS.PENDING}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: radius.sm,
              opacity: formData.status === SET_STATUS.PENDING ? 0.5 : 1,
            }}
          />
          {formData.startTime && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              {formatTimestamp(formData.startTime, timezone)}
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Время завершения:
          </label>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => handleDateTimeChange('endTime', e.target.value)}
            disabled={formData.status === SET_STATUS.PENDING || formData.status === SET_STATUS.IN_PROGRESS}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: radius.sm,
              opacity: (formData.status === SET_STATUS.PENDING || formData.status === SET_STATUS.IN_PROGRESS) ? 0.5 : 1,
            }}
          />
          {formData.endTime && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              {formatTimestamp(formData.endTime, timezone)}
            </div>
          )}
        </div>
        
        {duration !== null && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--color-surface-muted)', borderRadius: radius.sm }}>
            <strong>Продолжительность:</strong> {formatDuration(duration)}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="success" onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
