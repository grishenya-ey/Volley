/**
 * Тесты для модуля errorHandler
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import errorHandler from '../../../src/shared/errorHandler';

describe('errorHandler', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorHandler.clearErrorLog();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  describe('handleError', () => {
    test('должен логировать ошибку', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error, 'test-context');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test-context] Error:', error);

      const log = errorHandler.getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].error).toBe('Test error');
      expect(log[0].context).toBe('test-context');
    });

    test('должен возвращать понятное сообщение для пользователя', () => {
      const error = new Error('ENOENT: no such file or directory');
      const message = errorHandler.handleError(error, 'file-operation');

      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    test('должен обрабатывать ошибки файловой системы', () => {
      const error = new Error('ENOENT: file not found');
      const message = errorHandler.handleError(error, 'file-operation');
      expect(message).toContain('не найден');
    });

    test('должен обрабатывать ошибки доступа', () => {
      const error = new Error('EACCES: permission denied');
      const message = errorHandler.handleError(error, 'file-operation');
      expect(message).toContain('доступ');
    });

    test('должен обрабатывать сетевые ошибки', () => {
      const error = new Error('ECONNREFUSED: connection refused');
      const message = errorHandler.handleError(error, 'network-operation');
      expect(message).toContain('подключиться');
    });

    test('должен обрабатывать ошибки таймаута', () => {
      const error = new Error('ETIMEDOUT: timeout');
      const message = errorHandler.handleError(error, 'network-operation');
      expect(message).toContain('время ожидания');
    });

    test('должен обрабатывать ошибки JSON', () => {
      const error = new Error('Unexpected token in JSON');
      const message = errorHandler.handleError(error, 'parse-operation');
      expect(message).toContain('Файл поврежден');
    });

    test('должен обрабатывать ошибки валидации', () => {
      const error = new Error('Validation failed');
      const message = errorHandler.handleError(error, 'validation');
      expect(message).toContain('некорректны');
    });

    test('должен обрабатывать ошибки без сообщения', () => {
      const error = new Error();
      const message = errorHandler.handleError(error, 'test');
      expect(message).toBeDefined();
    });

    test('должен обрабатывать строковые ошибки', () => {
      const message = errorHandler.handleError('String error', 'test');
      expect(message).toBeDefined();
    });
  });

  describe('getErrorLog', () => {
    test('должен возвращать пустой массив если нет ошибок', () => {
      const log = errorHandler.getErrorLog();
      expect(log).toEqual([]);
    });

    test('должен возвращать массив ошибок', () => {
      errorHandler.handleError(new Error('Error 1'), 'context1');
      errorHandler.handleError(new Error('Error 2'), 'context2');

      const log = errorHandler.getErrorLog();
      expect(log.length).toBe(2);
      expect(log[0].error).toBe('Error 1');
      expect(log[1].error).toBe('Error 2');
    });

    test('должен сохранять timestamp', () => {
      const before = Date.now();
      errorHandler.handleError(new Error('Test'), 'test');
      const after = Date.now();

      const log = errorHandler.getErrorLog();
      const timestamp = new Date(log[0].timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    test('должен сохранять stack trace', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error, 'test');

      const log = errorHandler.getErrorLog();
      expect(log[0].stack).toBeDefined();
    });
  });

  describe('clearErrorLog', () => {
    test('должен очищать лог ошибок', () => {
      errorHandler.handleError(new Error('Error 1'), 'context1');
      errorHandler.handleError(new Error('Error 2'), 'context2');

      expect(errorHandler.getErrorLog().length).toBe(2);

      errorHandler.clearErrorLog();
      expect(errorHandler.getErrorLog().length).toBe(0);
    });
  });

  describe('getUserFriendlyMessage', () => {
    test('должен возвращать понятное сообщение для ENOENT', () => {
      const error = new Error('ENOENT');
      const message = errorHandler.handleError(error);
      expect(message).toContain('не найден');
    });

    test('должен возвращать понятное сообщение для EACCES', () => {
      const error = new Error('EACCES');
      const message = errorHandler.handleError(error);
      expect(message).toContain('доступ');
    });

    test('должен возвращать понятное сообщение для ECONNREFUSED', () => {
      const error = new Error('ECONNREFUSED');
      const message = errorHandler.handleError(error);
      expect(message).toContain('подключиться');
    });

    test('должен возвращать оригинальное сообщение для неизвестных ошибок', () => {
      const error = new Error('Unknown error type');
      const message = errorHandler.handleError(error);
      expect(message).toBe('Unknown error type');
    });
  });
});
