/**
 * Тесты для applyTheme (применение темы к DOM)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyTheme } from '../../../../src/renderer/theme/applyTheme';

describe('applyTheme', () => {
  let setPropertySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');
  });

  afterEach(() => {
    setPropertySpy.mockRestore();
  });

  it('устанавливает CSS-переменные на documentElement из объекта темы', () => {
    const theme = {
      background: '#f5f5f5',
      text: '#2c3e50',
      primary: '#3498db',
    };
    applyTheme(theme);
    expect(setPropertySpy).toHaveBeenCalledWith('--color-background', '#f5f5f5');
    expect(setPropertySpy).toHaveBeenCalledWith('--color-text', '#2c3e50');
    expect(setPropertySpy).toHaveBeenCalledWith('--color-primary', '#3498db');
    expect(setPropertySpy).toHaveBeenCalledTimes(3);
  });

  it('конвертирует camelCase в kebab-case для имён переменных', () => {
    applyTheme({ surfaceMuted: '#ecf0f1' });
    expect(setPropertySpy).toHaveBeenCalledWith('--color-surface-muted', '#ecf0f1');
  });

  it('ничего не делает при null или не объекте', () => {
    applyTheme(null as unknown as Record<string, string>);
    applyTheme(undefined as unknown as Record<string, string>);
    applyTheme('light' as unknown as Record<string, string>);
    expect(setPropertySpy).not.toHaveBeenCalled();
  });
});
