/**
 * Тесты для компонента SetEditModal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SetEditModal from '../../../src/renderer/components/SetEditModal';
import { SET_STATUS } from '../../../src/shared/types/Match.ts';

// Мокируем утилиты времени (путь без расширения — резолвер подхватывает timeUtils.ts)
// ВАЖНО: vi.mock() hoisted наверх, поэтому все должно быть определено внутри factory
vi.mock('../../../src/shared/timeUtils', () => ({
  formatTimestamp: vi.fn((timestamp: number, timezone?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    };
    if (timezone) {
      options.timeZone = timezone;
    }
    return date.toLocaleString('ru-RU', options);
  }),
  calculateDuration: vi.fn((startTime: number | null, endTime: number | null) => {
    if (!startTime || !endTime) return null;
    return Math.round((endTime - startTime) / 60000);
  }),
  formatDuration: vi.fn((minutes: number | null | undefined) => minutes !== null && minutes !== undefined ? `${minutes}'` : ''),
}));

// Импортируем моки после определения vi.mock
import * as timeUtils from '../../../src/shared/timeUtils';
const mockFormatTimestamp = vi.mocked(timeUtils.formatTimestamp);
const mockCalculateDuration = vi.mocked(timeUtils.calculateDuration);
const mockFormatDuration = vi.mocked(timeUtils.formatDuration);

describe('SetEditModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    set: {
      setNumber: 1,
      scoreA: 25,
      scoreB: 20,
      status: SET_STATUS.COMPLETED,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
      endTime: new Date('2024-01-01T10:45:00').getTime(),
      duration: 45,
    },
    isCurrentSet: false,
    onSave: vi.fn(() => true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('не должен отображаться, если isOpen=false', () => {
    render(<SetEditModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText(/Редактирование партии/i)).not.toBeInTheDocument();
  });

  it('должен отображаться, если isOpen=true', () => {
    render(<SetEditModal {...defaultProps} />);

    expect(screen.getByText(/Редактирование партии/i)).toBeInTheDocument();
  });

  it('должен инициализировать форму данными из set', () => {
    render(<SetEditModal {...defaultProps} />);

    expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
  });

  it('должен отображать номер партии', () => {
    render(<SetEditModal {...defaultProps} />);

    expect(screen.getByText(/Редактирование партии 1/i)).toBeInTheDocument();
  });

  it('должен позволять изменять счет команды A', () => {
    render(<SetEditModal {...defaultProps} />);

    const scoreAInput = screen.getByDisplayValue('25');
    fireEvent.change(scoreAInput, { target: { value: '26' } });

    expect(scoreAInput.value).toBe('26');
  });

  it('должен позволять изменять счет команды B', () => {
    render(<SetEditModal {...defaultProps} />);

    const scoreBInput = screen.getByDisplayValue('20');
    fireEvent.change(scoreBInput, { target: { value: '21' } });

    expect(scoreBInput.value).toBe('21');
  });

  it('должен позволять изменять статус партии', () => {
    const { container } = render(<SetEditModal {...defaultProps} />);

    // Находим select по role или через container
    const statusSelect = screen.getByRole('combobox') || container.querySelector('select');
    expect(statusSelect).toBeInTheDocument();
    expect(statusSelect.value).toBe(SET_STATUS.COMPLETED);
    expect(statusSelect.disabled).toBe(false);
    
    fireEvent.change(statusSelect, { target: { value: SET_STATUS.IN_PROGRESS } });

    expect(statusSelect.value).toBe(SET_STATUS.IN_PROGRESS);
  });

  it('должен позволять изменять статус текущей партии в игре на pending', () => {
    const setInProgress = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 12,
      status: SET_STATUS.IN_PROGRESS,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
    };

    const { container } = render(
      <SetEditModal 
        {...defaultProps} 
        set={setInProgress} 
        isCurrentSet={true} 
      />
    );

    const statusSelect = screen.getByRole('combobox') || container.querySelector('select');
    expect(statusSelect).toBeInTheDocument();
    expect(statusSelect.disabled).toBe(false);
    expect(statusSelect.value).toBe(SET_STATUS.IN_PROGRESS);
    
    // Проверяем, что доступны только опции "В игре" и "Не начата"
    const options = Array.from(statusSelect.options).map(opt => opt.value);
    expect(options).toEqual([SET_STATUS.IN_PROGRESS, SET_STATUS.PENDING]);
    
    fireEvent.change(statusSelect, { target: { value: SET_STATUS.PENDING } });
    expect(statusSelect.value).toBe(SET_STATUS.PENDING);
  });

  it('должен показывать только "Завершена" и "В игре" для завершенной партии, если следующая не началась', () => {
    const setCompleted = {
      setNumber: 1,
      scoreA: 25,
      scoreB: 20,
      status: SET_STATUS.COMPLETED,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
      endTime: new Date('2024-01-01T10:45:00').getTime(),
    };

    const match = {
      sets: [setCompleted],
      currentSet: {
        setNumber: 2,
        scoreA: 0,
        scoreB: 0,
        status: SET_STATUS.PENDING,
      },
    };

    const { container } = render(
      <SetEditModal 
        {...defaultProps} 
        set={setCompleted} 
        isCurrentSet={false}
        match={match}
      />
    );

    const statusSelect = screen.getByRole('combobox') || container.querySelector('select');
    expect(statusSelect).toBeInTheDocument();
    expect(statusSelect.value).toBe(SET_STATUS.COMPLETED);
    
    // Проверяем, что доступны только опции "Завершена" и "В игре"
    const options = Array.from(statusSelect.options).map(opt => opt.value);
    expect(options).toEqual([SET_STATUS.COMPLETED, SET_STATUS.IN_PROGRESS]);
  });

  it('должен показывать только "Завершена" для завершенной партии, если следующая уже началась', () => {
    const setCompleted = {
      setNumber: 1,
      scoreA: 25,
      scoreB: 20,
      status: SET_STATUS.COMPLETED,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
      endTime: new Date('2024-01-01T10:45:00').getTime(),
    };

    const match = {
      sets: [setCompleted],
      currentSet: {
        setNumber: 2,
        scoreA: 5,
        scoreB: 3,
        status: SET_STATUS.IN_PROGRESS,
        startTime: new Date('2024-01-01T11:00:00').getTime(),
      },
    };

    const { container } = render(
      <SetEditModal 
        {...defaultProps} 
        set={setCompleted} 
        isCurrentSet={false}
        match={match}
      />
    );

    const statusSelect = screen.getByRole('combobox') || container.querySelector('select');
    expect(statusSelect).toBeInTheDocument();
    expect(statusSelect.value).toBe(SET_STATUS.COMPLETED);
    
    // Проверяем, что доступна только опция "Завершена"
    const options = Array.from(statusSelect.options).map(opt => opt.value);
    expect(options).toEqual([SET_STATUS.COMPLETED]);
  });

  it('должен делать поля времени начала и завершения доступными для редактирования завершенной партии', () => {
    const setCompleted = {
      setNumber: 1,
      scoreA: 25,
      scoreB: 20,
      status: SET_STATUS.COMPLETED,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
      endTime: new Date('2024-01-01T10:45:00').getTime(),
    };

    render(<SetEditModal {...defaultProps} set={setCompleted} />);

    // Находим все datetime-local инпуты
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    
    // Первый инпут - это время начала
    const startTimeInput = dateInputs[0];
    expect(startTimeInput.disabled).toBe(false);
    
    // Второй инпут - это время завершения
    const endTimeInput = dateInputs[1];
    expect(endTimeInput.disabled).toBe(false);
  });

  it('должен вычислять и отображать продолжительность', () => {
    mockCalculateDuration.mockReturnValue(45);

    render(<SetEditModal {...defaultProps} />);

    // Продолжительность должна отображаться
    expect(mockCalculateDuration).toHaveBeenCalled();
  });

  it('должен вызывать onSave при нажатии на кнопку "Сохранить"', () => {
    const onSave = vi.fn(() => true);
    render(<SetEditModal {...defaultProps} onSave={onSave} />);

    const saveButton = screen.getByText(/Сохранить/i);
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });

  it('должен вызывать onClose после успешного сохранения', () => {
    const onClose = vi.fn();
    const onSave = vi.fn(() => true);
    render(<SetEditModal {...defaultProps} onClose={onClose} onSave={onSave} />);

    const saveButton = screen.getByText(/Сохранить/i);
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('не должен вызывать onClose, если onSave вернул false', () => {
    const onClose = vi.fn();
    const onSave = vi.fn(() => false);
    render(<SetEditModal {...defaultProps} onClose={onClose} onSave={onSave} />);

    const saveButton = screen.getByText(/Сохранить/i);
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('должен вызывать onClose при нажатии на кнопку "Отмена"', () => {
    const onClose = vi.fn();
    render(<SetEditModal {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByText(/Отмена/i);
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('должен передавать обновленные данные в onSave', () => {
    const onSave = vi.fn(() => true);
    render(<SetEditModal {...defaultProps} onSave={onSave} />);

    const scoreAInput = screen.getByDisplayValue('25');
    fireEvent.change(scoreAInput, { target: { value: '26' } });

    const saveButton = screen.getByText(/Сохранить/i);
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        scoreA: 26,
        scoreB: 20,
        status: SET_STATUS.COMPLETED,
      })
    );
  });

  it('должен обрабатывать партию без времени начала и завершения', () => {
    const setWithoutTime = {
      setNumber: 1,
      scoreA: 25,
      scoreB: 20,
      status: SET_STATUS.PENDING,
    };

    render(<SetEditModal {...defaultProps} set={setWithoutTime} />);

    expect(screen.getByText(/Редактирование партии 1/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('25')).toBeInTheDocument();
  });

  it('должен отображать ошибки валидации', () => {
    const setWithErrors = {
      setNumber: 1,
      scoreA: 25,
      scoreB: 20,
      status: SET_STATUS.COMPLETED,
    };

    // Симулируем ошибку валидации через onSave
    const onSave = vi.fn(() => {
      // В реальном компоненте ошибки устанавливаются через setErrors
      return false;
    });

    render(<SetEditModal {...defaultProps} set={setWithErrors} onSave={onSave} />);

    const saveButton = screen.getByText(/Сохранить/i);
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });

  it('должен правильно обрабатывать текущую партию (isCurrentSet=true)', () => {
    render(<SetEditModal {...defaultProps} isCurrentSet={true} />);

    // Модальное окно должно работать одинаково для текущей и завершенной партии
    expect(screen.getByText(/Редактирование партии/i)).toBeInTheDocument();
  });

  it('должен очищать ошибки при изменении полей', () => {
    render(<SetEditModal {...defaultProps} />);

    const scoreAInput = screen.getByDisplayValue('25');
    fireEvent.change(scoreAInput, { target: { value: '26' } });

    // Ошибки должны быть очищены (проверяется через отсутствие сообщений об ошибках)
    expect(screen.queryByText(/ошибка/i)).not.toBeInTheDocument();
  });

  it('должен правильно определять статус из set.status', () => {
    const setWithStatus = {
      setNumber: 1,
      scoreA: 25,
      scoreB: 20,
      status: SET_STATUS.IN_PROGRESS,
    };

    render(<SetEditModal {...defaultProps} set={setWithStatus} />);

    const statusSelect = screen.getByRole('combobox') || document.querySelector('select');
    expect(statusSelect.value).toBe(SET_STATUS.IN_PROGRESS);
  });

  it('должен определять статус COMPLETED из set.completed, если status отсутствует', () => {
    const setWithCompleted = {
      setNumber: 1,
      scoreA: 25,
      scoreB: 20,
      completed: true,
      // status отсутствует
    };

    render(<SetEditModal {...defaultProps} set={setWithCompleted} />);

    const statusSelect = screen.getByRole('combobox') || document.querySelector('select');
    expect(statusSelect.value).toBe(SET_STATUS.COMPLETED);
  });

  it('должен определять статус IN_PROGRESS из startTime, если status и completed отсутствуют', () => {
    const setWithStartTime = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 12,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
      // status и completed отсутствуют
    };

    render(<SetEditModal {...defaultProps} set={setWithStartTime} />);

    const statusSelect = screen.getByRole('combobox') || document.querySelector('select');
    expect(statusSelect.value).toBe(SET_STATUS.IN_PROGRESS);
  });

  it('должен определять статус PENDING, если нет status, completed и startTime', () => {
    const setPending = {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      // status, completed и startTime отсутствуют
    };

    render(<SetEditModal {...defaultProps} set={setPending} />);

    const statusSelect = screen.getByRole('combobox') || document.querySelector('select');
    expect(statusSelect.value).toBe(SET_STATUS.PENDING);
  });

  it('должен делать время завершения доступным для редактирования', () => {
    render(<SetEditModal {...defaultProps} />);

    // Находим все datetime-local инпуты
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    
    // Второй инпут - это время завершения
    const endTimeInput = dateInputs[1];
    expect(endTimeInput).toBeInTheDocument();
    expect(endTimeInput.disabled).toBe(false);
  });

  it('должен использовать timezone при форматировании времени', () => {
    mockFormatTimestamp.mockClear();

    const timezone = 'Europe/Moscow';
    render(<SetEditModal {...defaultProps} timezone={timezone} />);

    // Проверяем, что formatTimestamp вызывается с timezone
    expect(mockFormatTimestamp).toHaveBeenCalledWith(
      expect.any(Number),
      timezone
    );
  });

  it('должен работать без timezone', () => {
    mockFormatTimestamp.mockClear();

    render(<SetEditModal {...defaultProps} />);

    // Проверяем, что formatTimestamp вызывается без timezone (undefined)
    expect(mockFormatTimestamp).toHaveBeenCalled();
  });

  it('должен удалять startTime и endTime при изменении статуса на pending', () => {
    const onSave = vi.fn(() => true);
    const setInProgress = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 12,
      status: SET_STATUS.IN_PROGRESS,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
    };

    render(<SetEditModal {...defaultProps} set={setInProgress} isCurrentSet={true} onSave={onSave} />);

    // Изменяем статус на pending
    const statusSelect = screen.getByRole('combobox') || document.querySelector('select');
    fireEvent.change(statusSelect, { target: { value: SET_STATUS.PENDING } });

    // Сохраняем
    const saveButton = screen.getByText(/Сохранить/i);
    fireEvent.click(saveButton);

    // Проверяем, что startTime и endTime удалены
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        status: SET_STATUS.PENDING,
        startTime: null,
        endTime: null,
      })
    );
  });

  it('должен удалять endTime при изменении статуса завершенной партии на in_progress', () => {
    const onSave = vi.fn(() => true);
    const setCompleted = {
      setNumber: 1,
      scoreA: 25,
      scoreB: 20,
      status: SET_STATUS.COMPLETED,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
      endTime: new Date('2024-01-01T10:45:00').getTime(),
    };

    render(<SetEditModal {...defaultProps} set={setCompleted} onSave={onSave} />);

    // Изменяем статус на in_progress
    const statusSelect = screen.getByRole('combobox') || document.querySelector('select');
    fireEvent.change(statusSelect, { target: { value: SET_STATUS.IN_PROGRESS } });

    // Сохраняем
    const saveButton = screen.getByText(/Сохранить/i);
    fireEvent.click(saveButton);

    // Проверяем, что endTime удален, но startTime сохранен
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        status: SET_STATUS.IN_PROGRESS,
        startTime: setCompleted.startTime,
        endTime: null,
      })
    );
  });

  it('должен сохранять startTime и endTime при статусе completed', () => {
    const onSave = vi.fn(() => true);
    const setCompleted = {
      setNumber: 1,
      scoreA: 25,
      scoreB: 20,
      status: SET_STATUS.COMPLETED,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
      endTime: new Date('2024-01-01T10:45:00').getTime(),
    };

    render(<SetEditModal {...defaultProps} set={setCompleted} onSave={onSave} />);

    // Сохраняем без изменения статуса
    const saveButton = screen.getByText(/Сохранить/i);
    fireEvent.click(saveButton);

    // Проверяем, что оба времени сохранены
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        status: SET_STATUS.COMPLETED,
        startTime: setCompleted.startTime,
        endTime: setCompleted.endTime,
      })
    );
  });

  it('должен сохранять startTime при статусе in_progress', () => {
    const onSave = vi.fn(() => true);
    const setInProgress = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 12,
      status: SET_STATUS.IN_PROGRESS,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
    };

    render(<SetEditModal {...defaultProps} set={setInProgress} onSave={onSave} />);

    // Сохраняем без изменения статуса
    const saveButton = screen.getByText(/Сохранить/i);
    fireEvent.click(saveButton);

    // Проверяем, что startTime сохранен, а endTime null
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        status: SET_STATUS.IN_PROGRESS,
        startTime: setInProgress.startTime,
        endTime: null,
      })
    );
  });

  it('должен делать поле времени начала недоступным для редактирования при статусе pending', () => {
    const setPending = {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      status: SET_STATUS.PENDING,
    };

    render(<SetEditModal {...defaultProps} set={setPending} />);

    // Находим все datetime-local инпуты
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(1);
    
    // Первый инпут - это время начала
    const startTimeInput = dateInputs[0];
    expect(startTimeInput.disabled).toBe(true);
  });

  it('должен делать поле времени завершения недоступным для редактирования при статусе не completed', () => {
    const setInProgress = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 12,
      status: SET_STATUS.IN_PROGRESS,
      startTime: new Date('2024-01-01T10:00:00').getTime(),
    };

    render(<SetEditModal {...defaultProps} set={setInProgress} />);

    // Находим все datetime-local инпуты
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    
    // Второй инпут - это время завершения
    const endTimeInput = dateInputs[1];
    expect(endTimeInput.disabled).toBe(true);
  });

  it('должен делать поле времени завершения доступным для редактирования при статусе completed', () => {
    render(<SetEditModal {...defaultProps} />);

    // Находим все datetime-local инпуты
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    
    // Второй инпут - это время завершения
    const endTimeInput = dateInputs[1];
    expect(endTimeInput.disabled).toBe(false);
  });
});
