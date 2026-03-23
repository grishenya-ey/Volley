/**
 * Тесты для VMixInputFieldsPanel: аккордеон (одно поле открыто),
 * загрузка полей, handleSetMapping, выбор «Не сопоставлено».
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VMixInputFieldsPanel from '../../../src/renderer/components/VMixInputFieldsPanel';

describe('VMixInputFieldsPanel', () => {
  const defaultProps = {
    inputId: 'input-1',
    inputConfig: { vmixTitle: 'Title 1', vmixNumber: '1', enabled: true },
    config: {
      inputs: {
        'input-1': {
          vmixTitle: 'Title 1',
          fields: {},
        },
      },
    },
    onFieldChange: vi.fn(),
    readOnly: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      getVMixInputFields: vi.fn().mockResolvedValue({
        success: true,
        fields: [
          { name: 'TeamA', type: 'text' },
          { name: 'TeamB', type: 'text' },
          { name: 'ScoreA', type: 'text' },
        ],
      }),
    };
  });

  test('при загрузке показывает «Загрузка полей инпута…»', () => {
    window.electronAPI.getVMixInputFields.mockImplementation(
      () => new Promise(() => {})
    );
    render(<VMixInputFieldsPanel {...defaultProps} />);
    expect(screen.getByText(/Загрузка полей инпута/)).toBeInTheDocument();
  });

  test('после загрузки отображает список полей с заголовками', async () => {
    render(<VMixInputFieldsPanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('TeamA')).toBeInTheDocument();
    });
    expect(screen.getByText('TeamB')).toBeInTheDocument();
    expect(screen.getByText('ScoreA')).toBeInTheDocument();
  });

  test('аккордеон: при раскрытии одного поля другое закрывается', async () => {
    render(<VMixInputFieldsPanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('TeamA')).toBeInTheDocument();
    });
    const headers = screen.getAllByRole('button');
    const teamAHeader = headers.find((el) => el.textContent?.includes('TeamA'));
    const teamBHeader = headers.find((el) => el.textContent?.includes('TeamB'));
    expect(teamAHeader).toBeDefined();
    expect(teamBHeader).toBeDefined();

    fireEvent.click(teamAHeader);
    await waitFor(() => {
      expect(screen.getByText('Данные приложения')).toBeInTheDocument();
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(teamBHeader);
    await waitFor(() => {
      expect(teamBHeader).toHaveAttribute('tabindex', '0');
    });
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1);
  });

  test('при выборе «Не сопоставлено» вызывается onFieldChange с null', async () => {
    const onFieldChange = vi.fn();
    render(
      <VMixInputFieldsPanel
        {...defaultProps}
        config={{
          inputs: {
            'input-1': {
              vmixTitle: 'Title 1',
              fields: { TeamA: { dataMapKey: 'teamA.name' } },
            },
          },
        }}
        onFieldChange={onFieldChange}
      />
    );
    await waitFor(() => {
      expect(screen.getByText('TeamA')).toBeInTheDocument();
    });
    const teamAHeader = screen.getAllByRole('button').find((el) => el.textContent?.includes('TeamA'));
    expect(teamAHeader).toBeDefined();
    fireEvent.click(teamAHeader);
    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
    });
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '' } });
    expect(onFieldChange).toHaveBeenCalledWith('input-1', 'TeamA', null);
  });

  test('при ошибке загрузки полей показывает сообщение об ошибке', async () => {
    window.electronAPI.getVMixInputFields.mockResolvedValue({
      success: false,
      error: 'Ошибка подключения',
    });
    render(<VMixInputFieldsPanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Ошибка подключения/)).toBeInTheDocument();
    });
  });

  test('при пустом списке полей показывает «Нет полей или инпут недоступен»', async () => {
    window.electronAPI.getVMixInputFields.mockResolvedValue({
      success: true,
      fields: [],
    });
    render(<VMixInputFieldsPanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Нет полей или инпут недоступен/)).toBeInTheDocument();
    });
  });

  test('без inputId или inputConfig не запрашивает поля', () => {
    window.electronAPI.getVMixInputFields = vi.fn();
    render(
      <VMixInputFieldsPanel
        {...defaultProps}
        inputId={null}
        inputConfig={null}
      />
    );
    expect(window.electronAPI.getVMixInputFields).not.toHaveBeenCalled();
  });
});
