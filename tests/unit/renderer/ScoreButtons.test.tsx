/**
 * Тесты для компонента ScoreButtons
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScoreButtons from '../../../src/renderer/components/ScoreButtons';

describe('ScoreButtons', () => {
  const defaultProps = {
    teamAName: 'Команда A',
    teamBName: 'Команда B',
    onScoreChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен отображать названия команд', () => {
    render(<ScoreButtons {...defaultProps} />);

    expect(screen.getByText('Команда A')).toBeInTheDocument();
    expect(screen.getByText('Команда B')).toBeInTheDocument();
  });

  it('должен отображать кнопки для обеих команд', () => {
    render(<ScoreButtons {...defaultProps} />);

    // Должно быть 4 кнопки: -1 и +1 для каждой команды
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
  });

  it('должен вызывать onScoreChange при клике на кнопку +1 для команды A', () => {
    const onScoreChange = vi.fn();
    render(<ScoreButtons {...defaultProps} onScoreChange={onScoreChange} />);

    const buttons = screen.getAllByRole('button');
    // Первая кнопка - это -1 для команды A, вторая - +1 для команды A
    const plusButtonA = buttons[1];
    
    fireEvent.click(plusButtonA);

    expect(onScoreChange).toHaveBeenCalledWith('A', 1);
  });

  it('должен вызывать onScoreChange при клике на кнопку -1 для команды A', () => {
    const onScoreChange = vi.fn();
    render(<ScoreButtons {...defaultProps} onScoreChange={onScoreChange} />);

    const buttons = screen.getAllByRole('button');
    const minusButtonA = buttons[0];
    
    fireEvent.click(minusButtonA);

    expect(onScoreChange).toHaveBeenCalledWith('A', -1);
  });

  it('должен вызывать onScoreChange при клике на кнопку +1 для команды B', () => {
    const onScoreChange = vi.fn();
    render(<ScoreButtons {...defaultProps} onScoreChange={onScoreChange} />);

    const buttons = screen.getAllByRole('button');
    // Третья кнопка - это -1 для команды B, четвертая - +1 для команды B
    const plusButtonB = buttons[3];
    
    fireEvent.click(plusButtonB);

    expect(onScoreChange).toHaveBeenCalledWith('B', 1);
  });

  it('должен вызывать onScoreChange при клике на кнопку -1 для команды B', () => {
    const onScoreChange = vi.fn();
    render(<ScoreButtons {...defaultProps} onScoreChange={onScoreChange} />);

    const buttons = screen.getAllByRole('button');
    const minusButtonB = buttons[2];
    
    fireEvent.click(minusButtonB);

    expect(onScoreChange).toHaveBeenCalledWith('B', -1);
  });

  it('не должен вызывать onScoreChange, если disabled=true', () => {
    const onScoreChange = vi.fn();
    render(<ScoreButtons {...defaultProps} onScoreChange={onScoreChange} disabled={true} />);

    const buttons = screen.getAllByRole('button');
    const plusButtonA = buttons[1];
    
    fireEvent.click(plusButtonA);

    expect(onScoreChange).not.toHaveBeenCalled();
  });

  it('должен иметь disabled атрибут на кнопках, если disabled=true', () => {
    render(<ScoreButtons {...defaultProps} disabled={true} />);

    const buttons = screen.getAllByRole('button');
    
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('не должен иметь disabled атрибут на кнопках, если disabled=false', () => {
    render(<ScoreButtons {...defaultProps} disabled={false} />);

    const buttons = screen.getAllByRole('button');
    
    buttons.forEach(button => {
      expect(button).not.toBeDisabled();
    });
  });

  it('должен применять стили disabled (opacity и cursor) когда disabled=true', () => {
    render(<ScoreButtons {...defaultProps} disabled={true} />);

    const buttons = screen.getAllByRole('button');
    // Button использует opacity: 0.7 при disabled
    buttons.forEach(button => {
      expect(button).toHaveStyle({ opacity: '0.7', cursor: 'not-allowed' });
    });
  });

  it('должен применять нормальные стили когда disabled=false', () => {
    render(<ScoreButtons {...defaultProps} disabled={false} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveStyle({ opacity: '1', cursor: 'pointer' });
    });
  });

  it('должен использовать disabled=false по умолчанию', () => {
    render(<ScoreButtons teamAName="A" teamBName="B" onScoreChange={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    
    buttons.forEach(button => {
      expect(button).not.toBeDisabled();
    });
  });
});
