/**
 * Тесты для TeamColorsEditor — редактор цветов формы и либеро, кнопка «Поменять цвета».
 */

import { describe, test, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TeamColorsEditor from '../../../src/renderer/components/TeamColorsEditor';

describe('TeamColorsEditor', () => {
  test('отображает кнопку «Поменять цвета»', () => {
    const onChange = vi.fn();
    render(
      <TeamColorsEditor
        color="#3498db"
        liberoColor="#e74c3c"
        onChange={onChange}
      />
    );
    expect(screen.getByRole('button', { name: /поменять местами цвет формы игроков и цвет формы либеро/i })).toBeInTheDocument();
    expect(screen.getByText('Поменять цвета')).toBeInTheDocument();
  });

  test('по клику «Поменять цвета» вызывает onChange с обменянными color и liberoColor', () => {
    const onChange = vi.fn();
    render(
      <TeamColorsEditor
        color="#3498db"
        liberoColor="#e74c3c"
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('Поменять цвета'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ color: '#e74c3c', liberoColor: '#3498db' });
  });

  test('при пустом liberoColor обмен передаёт пустую строку в color', () => {
    const onChange = vi.fn();
    render(
      <TeamColorsEditor
        color="#3498db"
        liberoColor=""
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('Поменять цвета'));
    expect(onChange).toHaveBeenCalledWith({ color: '', liberoColor: '#3498db' });
  });
});
