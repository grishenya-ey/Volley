export class HistoryService {
    static addAction(action) {
        this.history.push(action);
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
    static undoLastAction() {
        if (this.history.length === 0) {
            return null;
        }
        return this.history.pop() || null;
    }
    static getLastAction() {
        if (this.history.length === 0) {
            return null;
        }
        return this.history[this.history.length - 1];
    }
    static clearHistory() {
        this.history = [];
    }
    static getHistory() {
        return [...this.history];
    }
    static getHistorySize() {
        return this.history.length;
    }
    static setMaxHistorySize(size) {
        if (size < 1) {
            throw new Error('Максимальный размер истории должен быть больше 0');
        }
        this.maxHistorySize = size;
        if (this.history.length > size) {
            this.history = this.history.slice(-size);
        }
    }
}
HistoryService.history = [];
HistoryService.maxHistorySize = 100;
