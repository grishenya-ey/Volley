/**
 * Сервис для работы с историей действий
 * Управление историей действий, отмена действий
 */

/**
 * Интерфейс действия в истории
 */
export interface Action {
  type: string;
  timestamp: number;
  data: any;
  previousState?: any; // Предыдущее состояние для отмены
}

/**
 * Сервис для работы с историей действий
 * Предоставляет методы для управления историей действий и отмены
 * 
 * Примечание: В текущей реализации история хранится в памяти.
 * Для production может потребоваться персистентное хранилище.
 */
export class HistoryService {
  private static history: Action[] = [];
  private static maxHistorySize = 100;

  /**
   * Добавляет действие в историю
   * 
   * Автоматически ограничивает размер истории до maxHistorySize.
   * 
   * @param action - Действие для добавления
   * 
   * @example
   * ```typescript
   * HistoryService.addAction({
   *   type: 'score_change',
   *   timestamp: Date.now(),
   *   data: { team: 'A', delta: 1 },
   *   previousState: oldMatch
   * });
   * ```
   */
  static addAction(action: Action): void {
    this.history.push(action);

    // Ограничиваем размер истории
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Отменяет последнее действие
   * 
   * Удаляет последнее действие из истории и возвращает его.
   * 
   * @returns Последнее действие или null, если история пуста
   * 
   * @example
   * ```typescript
   * const lastAction = HistoryService.undoLastAction();
   * if (lastAction) {
   *   // Восстановить previousState из lastAction
   * }
   * ```
   */
  static undoLastAction(): Action | null {
    if (this.history.length === 0) {
      return null;
    }

    return this.history.pop() || null;
  }

  /**
   * Получает последнее действие без удаления
   * 
   * @returns Последнее действие или null, если история пуста
   * 
   * @example
   * ```typescript
   * const lastAction = HistoryService.getLastAction();
   * ```
   */
  static getLastAction(): Action | null {
    if (this.history.length === 0) {
      return null;
    }

    return this.history[this.history.length - 1];
  }

  /**
   * Очищает историю
   * 
   * @example
   * ```typescript
   * HistoryService.clearHistory();
   * ```
   */
  static clearHistory(): void {
    this.history = [];
  }

  /**
   * Получает всю историю
   * 
   * @returns Массив всех действий в истории
   * 
   * @example
   * ```typescript
   * const allActions = HistoryService.getHistory();
   * ```
   */
  static getHistory(): Action[] {
    return [...this.history]; // Возвращаем копию для безопасности
  }

  /**
   * Получает размер истории
   * 
   * @returns Количество действий в истории
   * 
   * @example
   * ```typescript
   * const size = HistoryService.getHistorySize();
   * ```
   */
  static getHistorySize(): number {
    return this.history.length;
  }

  /**
   * Устанавливает максимальный размер истории
   * 
   * @param size - Максимальный размер истории
   * 
   * @example
   * ```typescript
   * HistoryService.setMaxHistorySize(200);
   * ```
   */
  static setMaxHistorySize(size: number): void {
    if (size < 1) {
      throw new Error('Максимальный размер истории должен быть больше 0');
    }
    this.maxHistorySize = size;

    // Обрезаем историю, если она превышает новый размер
    if (this.history.length > size) {
      this.history = this.history.slice(-size);
    }
  }
}
