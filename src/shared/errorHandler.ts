/**
 * Централизованная обработка ошибок
 */

export interface ErrorLogEntry {
  timestamp: string;
  context: string;
  error: string;
  stack?: string;
}

class ErrorHandler {
  private errorLog: ErrorLogEntry[] = [];

  handleError(error: unknown, context = ''): string {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[${context}] Error:`, error);

    this.errorLog.push({
      timestamp: new Date().toISOString(),
      context,
      error: err.message || String(error),
      stack: err.stack,
    });

    return this.getUserFriendlyMessage(err, context);
  }

  getUserFriendlyMessage(error: Error, _context: string): string {
    const errorMessage = error.message || String(error);

    if (errorMessage.includes('ENOENT') || errorMessage.includes('не найден')) {
      return 'Файл не найден. Проверьте путь к файлу.';
    }
    if (errorMessage.includes('EACCES') || errorMessage.includes('доступ')) {
      return 'Нет доступа к файлу. Проверьте права доступа.';
    }
    if (errorMessage.includes('EISDIR')) {
      return 'Выбранная папка, а не файл. Выберите файл.';
    }
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('подключение')) {
      return 'Не удалось подключиться. Проверьте адрес и порт.';
    }
    if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('таймаут')) {
      return 'Превышено время ожидания. Проверьте подключение к сети.';
    }
    if (errorMessage.includes('ENOTFOUND')) {
      return 'Сервер не найден. Проверьте адрес.';
    }
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return 'Ошибка чтения файла. Файл поврежден или имеет неверный формат.';
    }
    if (errorMessage.includes('валидация') || errorMessage.includes('Validation failed')) {
      return 'Данные некорректны. Проверьте введенные данные.';
    }

    return errorMessage || 'Произошла неизвестная ошибка.';
  }

  getErrorLog(): ErrorLogEntry[] {
    return this.errorLog;
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }
}

const errorHandler = new ErrorHandler();

export default errorHandler;
