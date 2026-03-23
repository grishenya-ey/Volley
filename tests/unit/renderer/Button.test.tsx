/**
 * Тесты для компонента Button
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../../../src/renderer/components/Button';

describe('Button', () => {
  describe('рендер', () => {
    it('рендерит кнопку с текстом', () => {
      render(<Button>Нажми</Button>);
      expect(screen.getByRole('button', { name: /нажми/i })).toBeInTheDocument();
    });

    it('рендерит с variant primary по умолчанию', () => {
      render(<Button>Сохранить</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveStyle({ backgroundColor: 'var(--color-primary)' });
    });

    it('рендерит с variant secondary', () => {
      render(<Button variant="secondary">Отмена</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveStyle({ backgroundColor: 'var(--color-neutral)' });
    });

    it('рендерит с variant success', () => {
      render(<Button variant="success">Готово</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveStyle({ backgroundColor: 'var(--color-success)' });
    });

    it('рендерит с variant danger', () => {
      render(<Button variant="danger">Удалить</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveStyle({ backgroundColor: 'var(--color-danger)' });
    });

    it('рендерит с variant warning', () => {
      render(<Button variant="warning">Внимание</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveStyle({ backgroundColor: 'var(--color-warning)' });
    });

    it('рендерит с variant accent', () => {
      render(<Button variant="accent">Составы</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveStyle({ backgroundColor: 'var(--color-accent)' });
    });
  });

  describe('onClick', () => {
    it('вызывает onClick при клике', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Нажми</Button>);
      await user.click(screen.getByRole('button', { name: /нажми/i }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('не вызывает onClick при disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button onClick={onClick} disabled>
          Нажми
        </Button>
      );
      await user.click(screen.getByRole('button', { name: /нажми/i }));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('доступность', () => {
    it('имеет роль button', () => {
      render(<Button>Текст</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('принимает и отображает aria-label', () => {
      render(<Button aria-label="Закрыть окно">×</Button>);
      expect(screen.getByRole('button', { name: 'Закрыть окно' })).toBeInTheDocument();
    });

    it('по умолчанию type="button"', () => {
      render(<Button>Кнопка</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('может иметь type="submit"', () => {
      render(
        <form>
          <Button type="submit">Отправить</Button>
        </form>
      );
      expect(screen.getByRole('button', { name: /отправить/i })).toHaveAttribute('type', 'submit');
    });
  });
});
