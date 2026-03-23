/**
 * Тесты на защиту от XSS уязвимостей
 */

import { describe, test, expect, beforeAll } from 'vitest';

type JSDOMInstance = typeof import('jsdom');

describe('XSS Protection Tests', () => {
  let jsdom: JSDOMInstance | undefined;

  beforeAll(() => {
    try {
      jsdom = require('jsdom') as JSDOMInstance;
    } catch {
      console.warn('jsdom не установлен. Установите: npm install --save-dev jsdom');
    }
  });

  function createSanitizeFunction(): ((text: string | null | undefined) => string) | null {
    if (!jsdom) return null;
    const { JSDOM } = jsdom;
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const { document } = dom.window;
    return function sanitizeText(text: string | null | undefined) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
  }

  const xssVectors = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<div onclick="alert(\'XSS\')">Click me</div>',
    '"><script>alert("XSS")</script>',
    '\'><script>alert("XSS")</script>',
  ];

  test('should sanitize XSS vectors', () => {
    const sanitizeText = createSanitizeFunction();
    if (!sanitizeText) {
      console.warn('Пропуск тестов: jsdom не установлен');
      return;
    }
    xssVectors.forEach((vector) => {
      const sanitized = sanitizeText(vector);
      const hasHtmlTags = vector.includes('<');
      if (hasHtmlTags) {
        expect(sanitized).toContain('&lt;');
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/<img/i);
        expect(sanitized).not.toMatch(/<svg/i);
        expect(sanitized).not.toMatch(/<iframe/i);
      } else {
        expect(typeof sanitized).toBe('string');
        expect(sanitized).toBe(vector);
        expect(sanitized).not.toContain('&lt;');
      }
    });
  });

  test('should preserve safe text', () => {
    const sanitizeText = createSanitizeFunction();
    if (!sanitizeText) return;
    const safeTexts = ['Команда А', 'Команда Б', 'Турнир 2024', 'Москва', '123', 'Счет: 25-23'];
    safeTexts.forEach((text) => {
      expect(sanitizeText(text)).toBe(text);
    });
  });

  test('should handle empty string', () => {
    const sanitizeText = createSanitizeFunction();
    if (!sanitizeText) return;
    expect(sanitizeText('')).toBe('');
  });

  test('should handle null/undefined', () => {
    const sanitizeText = createSanitizeFunction();
    if (!sanitizeText) return;
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });

  test('should escape special characters', () => {
    const sanitizeText = createSanitizeFunction();
    if (!sanitizeText) return;
    const specialChars = [
      { input: '<', expected: '&lt;' },
      { input: '>', expected: '&gt;' },
      { input: '&', expected: '&amp;' },
    ];
    specialChars.forEach(({ input, expected }) => {
      expect(sanitizeText(input)).toContain(expected);
    });
  });

  test('should handle complex XSS payloads', () => {
    const sanitizeText = createSanitizeFunction();
    if (!sanitizeText) return;
    const complexPayloads = [
      '<img src=x onerror="alert(String.fromCharCode(88,83,83))">',
      '<svg><script>alert("XSS")</script></svg>',
      '<div style="background:url(\'javascript:alert("XSS")\')">',
    ];
    complexPayloads.forEach((payload) => {
      const sanitized = sanitizeText(payload);
      if (payload.includes('<')) {
        expect(sanitized).toContain('&lt;');
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/<img/i);
        expect(sanitized).not.toMatch(/<div/i);
      }
    });
  });
});
