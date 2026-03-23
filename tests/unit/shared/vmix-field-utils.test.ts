/**
 * Тесты для утилиты работы с полями vMix
 */

import { describe, test, expect } from 'vitest';
import {
  getFullFieldName,
  removeFieldSuffix,
  hasFieldSuffix,
} from '../../../src/shared/vmix-field-utils';

describe('vmix-field-utils', () => {
  describe('getFullFieldName', () => {
    test('должен добавлять суффикс .Text для типа text', () => {
      expect(getFullFieldName('TeamA', 'text')).toBe('TeamA.Text');
      expect(getFullFieldName('ScoreASet', 'text')).toBe('ScoreASet.Text');
    });

    test('должен добавлять суффикс .Source для типа image', () => {
      expect(getFullFieldName('TeamALogo', 'image')).toBe('TeamALogo.Source');
      expect(getFullFieldName('TeamBLogo', 'image')).toBe('TeamBLogo.Source');
    });

    test('должен добавлять суффикс .Fill.Color для типа fill', () => {
      expect(getFullFieldName('ColorA', 'fill')).toBe('ColorA.Fill.Color');
      expect(getFullFieldName('ColorB', 'fill')).toBe('ColorB.Fill.Color');
    });

    test('не должен добавлять суффикс повторно, если он уже есть', () => {
      expect(getFullFieldName('TeamA.Text', 'text')).toBe('TeamA.Text');
      expect(getFullFieldName('TeamALogo.Source', 'image')).toBe('TeamALogo.Source');
      expect(getFullFieldName('ColorA.Fill.Color', 'fill')).toBe('ColorA.Fill.Color');
    });

    test('должен обрабатывать пустые значения', () => {
      expect(getFullFieldName('', 'text')).toBe('.Text');
      expect(getFullFieldName('', 'image')).toBe('.Source');
      expect(getFullFieldName('', 'fill')).toBe('.Fill.Color');
    });

    test('должен обрабатывать null и undefined', () => {
      expect(getFullFieldName(null, 'text')).toBe('.Text');
      expect(getFullFieldName(undefined, 'text')).toBe('.Text');
    });

    test('должен обрабатывать неизвестный тип', () => {
      expect(() => getFullFieldName('FieldName', 'unknown' as 'text')).toThrow();
    });
  });

  describe('removeFieldSuffix', () => {
    test('должен удалять суффикс .Text', () => {
      expect(removeFieldSuffix('TeamA.Text')).toBe('TeamA');
      expect(removeFieldSuffix('ScoreASet.Text')).toBe('ScoreASet');
    });

    test('должен удалять суффикс .Source', () => {
      expect(removeFieldSuffix('TeamALogo.Source')).toBe('TeamALogo');
      expect(removeFieldSuffix('TeamBLogo.Source')).toBe('TeamBLogo');
    });

    test('должен удалять суффикс .Fill.Color', () => {
      expect(removeFieldSuffix('ColorA.Fill.Color')).toBe('ColorA');
      expect(removeFieldSuffix('ColorB.Fill.Color')).toBe('ColorB');
    });

    test('должен возвращать исходное значение, если суффикса нет', () => {
      expect(removeFieldSuffix('TeamA')).toBe('TeamA');
      expect(removeFieldSuffix('ColorA')).toBe('ColorA');
      expect(removeFieldSuffix('TeamALogo')).toBe('TeamALogo');
    });

    test('должен обрабатывать пустые значения', () => {
      expect(removeFieldSuffix('')).toBe('');
      expect(removeFieldSuffix(null)).toBe('');
      expect(removeFieldSuffix(undefined)).toBe('');
    });

    test('должен обрабатывать частичные совпадения', () => {
      expect(removeFieldSuffix('TextField')).toBe('TextField');
      expect(removeFieldSuffix('SourceField')).toBe('SourceField');
      expect(removeFieldSuffix('ColorField')).toBe('ColorField');
    });
  });

  describe('hasFieldSuffix', () => {
    test('должен определять наличие суффикса .Text для типа text', () => {
      expect(hasFieldSuffix('TeamA.Text', 'text')).toBe(true);
      expect(hasFieldSuffix('TeamA', 'text')).toBe(false);
    });

    test('должен определять наличие суффикса .Source для типа image', () => {
      expect(hasFieldSuffix('TeamALogo.Source', 'image')).toBe(true);
      expect(hasFieldSuffix('TeamALogo', 'image')).toBe(false);
    });

    test('должен определять наличие суффикса .Fill.Color для типа fill', () => {
      expect(hasFieldSuffix('ColorA.Fill.Color', 'fill')).toBe(true);
      expect(hasFieldSuffix('ColorA', 'fill')).toBe(false);
    });

    test('должен возвращать false для несоответствующих суффиксов', () => {
      expect(hasFieldSuffix('TeamA.Text', 'image')).toBe(false);
      expect(hasFieldSuffix('TeamALogo.Source', 'text')).toBe(false);
      expect(hasFieldSuffix('ColorA.Fill.Color', 'text')).toBe(false);
    });

    test('должен обрабатывать пустые значения', () => {
      expect(hasFieldSuffix('', 'text')).toBe(false);
      expect(hasFieldSuffix(null, 'text')).toBe(false);
      expect(hasFieldSuffix(undefined, 'text')).toBe(false);
    });
  });
});
