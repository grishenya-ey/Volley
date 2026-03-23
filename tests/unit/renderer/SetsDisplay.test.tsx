/**
 * Тесты для компонента SetsDisplay
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import SetsDisplay from '../../../src/renderer/components/SetsDisplay';
import { SET_STATUS } from '../../../src/shared/types/Match.ts';

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Мокируем formatDuration
vi.mock('../../../src/shared/timeUtils.js', () => ({
  formatDuration: vi.fn((minutes) => minutes !== null && minutes !== undefined ? `${minutes}'` : ''),
}));

describe('SetsDisplay', () => {
  const defaultProps = {
    sets: [],
    currentSet: {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      servingTeam: 'A',
      status: SET_STATUS.PENDING,
    },
    onSetClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен отображать все 5 партий', () => {
    render(<SetsDisplay {...defaultProps} />);
    
    // Проверяем, что отображаются все 5 партий
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`Партия ${i}`)).toBeInTheDocument();
    }
  });

  it('должен отображать завершенную партию с счетом и продолжительностью', () => {
    const sets = [
      {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        duration: 45,
      },
    ];

    render(<SetsDisplay {...defaultProps} sets={sets} />);

    // Проверяем отображение завершенной партии
    expect(screen.getByText('25 - 20')).toBeInTheDocument();
    expect(screen.getByText("45'")).toBeInTheDocument();
  });

  it('должен отображать текущую партию в игре', () => {
    const currentSet = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 12,
      servingTeam: 'A',
      status: SET_STATUS.IN_PROGRESS,
    };

    render(<SetsDisplay {...defaultProps} currentSet={currentSet} />);

    expect(screen.getByText('В игре')).toBeInTheDocument();
    expect(screen.getByText('15 - 12')).toBeInTheDocument();
  });

  it('должен отображать не начатую партию с "-"', () => {
    render(<SetsDisplay {...defaultProps} />);

    // Проверяем, что не начатые партии показывают "-"
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('должен показывать длительность "0\'" для завершенных партий', () => {
    const sets = [
      {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        duration: 0, // 0 минут
      },
    ];

    render(<SetsDisplay {...defaultProps} sets={sets} />);

    expect(screen.getByText("0'")).toBeInTheDocument();
  });

  it('не должен показывать длительность, если она null или undefined', () => {
    const sets = [
      {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        duration: null,
      },
    ];

    render(<SetsDisplay {...defaultProps} sets={sets} />);

    expect(screen.getByText('25 - 20')).toBeInTheDocument();
    // Длительность не должна отображаться
    expect(screen.queryByText(/\d+'/)).not.toBeInTheDocument();
  });

  it('должен вызывать onSetClick при клике на партию', () => {
    const onSetClick = vi.fn();
    // Используем партию в игре, чтобы она была редактируемой
    const currentSet = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 12,
      servingTeam: 'A',
      status: SET_STATUS.IN_PROGRESS,
    };
    
    render(<SetsDisplay {...defaultProps} currentSet={currentSet} onSetClick={onSetClick} />);

    // Кликаем на первую партию (которая в игре)
    const set1 = screen.getByText('Партия 1').closest('div');
    set1.click();

    expect(onSetClick).toHaveBeenCalledWith(1);
  });

  it('не должен вызывать onSetClick при клике на не начатую партию (pending)', () => {
    const onSetClick = vi.fn();
    const currentSet = {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      servingTeam: 'A',
      status: SET_STATUS.PENDING,
    };
    
    render(<SetsDisplay {...defaultProps} currentSet={currentSet} onSetClick={onSetClick} />);

    // Кликаем на первую партию (которая не начата)
    const set1 = screen.getByText('Партия 1').closest('div');
    set1.click();

    // onSetClick не должен быть вызван для pending партий
    expect(onSetClick).not.toHaveBeenCalled();
  });

  it('должен вызывать onSetClick для завершенной партии', () => {
    const onSetClick = vi.fn();
    const sets = [
      {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        duration: 45,
      },
    ];

    render(<SetsDisplay {...defaultProps} sets={sets} onSetClick={onSetClick} />);

    // Кликаем на завершенную партию
    const set1 = screen.getByText('Партия 1').closest('div');
    set1.click();

    expect(onSetClick).toHaveBeenCalledWith(1);
  });

  it('должен вызывать onSetClick для партии в игре', () => {
    const onSetClick = vi.fn();
    const currentSet = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 12,
      servingTeam: 'A',
      status: SET_STATUS.IN_PROGRESS,
    };

    render(<SetsDisplay {...defaultProps} currentSet={currentSet} onSetClick={onSetClick} />);

    // Кликаем на партию в игре
    const set1 = screen.getByText('Партия 1').closest('div');
    set1.click();

    expect(onSetClick).toHaveBeenCalledWith(1);
  });

  it('должен приоритетно показывать завершенную партию из sets, даже если currentSet имеет тот же номер', () => {
    const sets = [
      {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        duration: 45,
      },
    ];

    const currentSet = {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      servingTeam: 'A',
      status: SET_STATUS.PENDING, // Новая партия еще не начата
    };

    render(<SetsDisplay {...defaultProps} sets={sets} currentSet={currentSet} />);

    // Должна отображаться завершенная партия, а не pending
    expect(screen.getByText('25 - 20')).toBeInTheDocument();
    expect(screen.getByText("45'")).toBeInTheDocument();
    // Первая партия завершена, поэтому не должна показывать "-"
    // Проверяем, что для первой партии отображается счет, а не "-"
    const allDashes = screen.queryAllByText('-');
    // Должно быть 4 дефиса (для партий 2, 3, 4, 5), но не для первой
    expect(allDashes.length).toBe(4);
  });

  it('должен правильно отображать смешанные статусы партий', () => {
    const sets = [
      {
        setNumber: 1,
        scoreA: 25,
        scoreB: 20,
        completed: true,
        status: SET_STATUS.COMPLETED,
        duration: 45,
      },
    ];

    const currentSet = {
      setNumber: 2,
      scoreA: 15,
      scoreB: 12,
      servingTeam: 'A',
      status: SET_STATUS.IN_PROGRESS,
    };

    render(<SetsDisplay {...defaultProps} sets={sets} currentSet={currentSet} />);

    // Первая партия - завершена
    expect(screen.getByText('25 - 20')).toBeInTheDocument();
    
    // Вторая партия - в игре
    expect(screen.getByText('В игре')).toBeInTheDocument();
    expect(screen.getByText('15 - 12')).toBeInTheDocument();
  });
});
