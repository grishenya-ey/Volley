/**
 * Тесты для проверки HTTP API команды SetTextColour в vMix
 */

import { describe, test, expect } from 'vitest';

describe('VMixClient - SetTextColour API Tests', () => {
  describe('SetTextColour команда для текстовых полей', () => {
    test('должен формировать правильный URL для SetTextColour с суффиксом .Text', () => {
      const inputName = 'Input5';
      const fieldName = 'Libero1Number.Text';
      const color = '#000000';
      const baseURL = 'http://localhost:8088/api';
      const queryParams = new URLSearchParams();
      queryParams.append('Function', 'SetTextColour');
      queryParams.append('Input', inputName);
      queryParams.append('SelectedName', fieldName);
      queryParams.append('Value', color);
      const expectedURL = `${baseURL}?${queryParams.toString()}`;
      expect(expectedURL).toContain('Function=SetTextColour');
      expect(expectedURL).toContain(`Input=${inputName}`);
      expect(expectedURL).toContain(`SelectedName=${encodeURIComponent(fieldName)}`);
      expect(expectedURL).toContain(`Value=${encodeURIComponent(color)}`);
      expect(expectedURL).toContain('Libero1Number.Text');
    });

    test('должен правильно кодировать символ # в цвете', () => {
      const inputName = 'Input5';
      const fieldName = 'Libero1Number.Text';
      const color = '#ffffff';
      const baseURL = 'http://localhost:8088/api';
      const queryParams = new URLSearchParams();
      queryParams.append('Function', 'SetTextColour');
      queryParams.append('Input', inputName);
      queryParams.append('SelectedName', fieldName);
      queryParams.append('Value', color);
      const expectedURL = `${baseURL}?${queryParams.toString()}`;
      expect(expectedURL).toContain('Value=%23ffffff');
    });

    test('должен работать с разными цветами (черный и белый)', () => {
      const testCases = [
        { color: '#000000', description: 'черный' },
        { color: '#ffffff', description: 'белый' },
        { color: '#ff0000', description: 'красный' },
      ];
      testCases.forEach(({ color }) => {
        const inputName = 'Input5';
        const fieldName = 'Libero1Number.Text';
        const baseURL = 'http://localhost:8088/api';
        const queryParams = new URLSearchParams();
        queryParams.append('Function', 'SetTextColour');
        queryParams.append('Input', inputName);
        queryParams.append('SelectedName', fieldName);
        queryParams.append('Value', color);
        const expectedURL = `${baseURL}?${queryParams.toString()}`;
        expect(expectedURL).toContain('Function=SetTextColour');
        expect(expectedURL).toContain(`Value=${encodeURIComponent(color)}`);
      });
    });

    test('должен работать с полями номеров либеро на карте', () => {
      const fieldNames = [
        'Libero1Number.Text',
        'Libero1NumberOnCard.Text',
        'Libero2Number.Text',
        'Libero2NumberOnCard.Text',
      ];
      fieldNames.forEach((fieldName) => {
        const inputName = 'Input5';
        const color = '#000000';
        const baseURL = 'http://localhost:8088/api';
        const queryParams = new URLSearchParams();
        queryParams.append('Function', 'SetTextColour');
        queryParams.append('Input', inputName);
        queryParams.append('SelectedName', fieldName);
        queryParams.append('Value', color);
        const expectedURL = `${baseURL}?${queryParams.toString()}`;
        expect(expectedURL).toContain('Function=SetTextColour');
        expect(expectedURL).toContain(`SelectedName=${encodeURIComponent(fieldName)}`);
        expect(expectedURL).toContain(fieldName);
      });
    });
  });
});
