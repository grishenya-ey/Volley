/**
 * Тесты для регистратора IPC-диалогов (dialog:show-message, dialog:show-confirm).
 * Проверяют вызов dialog.showMessageBox с нужными параметрами и возврат результата.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDialogHandlers } from '../../../src/main/dialogHandlers';

describe('dialogHandlers', () => {
  let mockIpcMain: { handle: ReturnType<typeof vi.fn> };
  let mockDialog: { showMessageBox: ReturnType<typeof vi.fn> };
  let mockGetWindow: ReturnType<typeof vi.fn>;
  let showMessageHandler!: (e: unknown, opts: { title?: string; message: string }) => Promise<void>;
  let showConfirmHandler!: (e: unknown, opts: { title?: string; message: string }) => Promise<boolean>;

  beforeEach(() => {
    const showMessageBox = vi.fn().mockResolvedValue({ response: 0 });
    mockDialog = { showMessageBox };
    mockGetWindow = vi.fn().mockReturnValue({});
    mockIpcMain = {
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        if (channel === 'dialog:show-message') showMessageHandler = handler as typeof showMessageHandler;
        if (channel === 'dialog:show-confirm') showConfirmHandler = handler as typeof showConfirmHandler;
      }),
    };
    registerDialogHandlers(mockIpcMain as never, mockDialog as never, mockGetWindow);
  });

  it('dialog:show-message вызывает showMessageBox с type: info', async () => {
    await showMessageHandler(null, { title: 'Заголовок', message: 'Текст' });
    expect(mockDialog.showMessageBox).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ type: 'info', title: 'Заголовок', message: 'Текст', buttons: ['OK'] })
    );
  });

  it('dialog:show-confirm возвращает true при response 0', async () => {
    mockDialog.showMessageBox.mockResolvedValue({ response: 0 });
    const result = await showConfirmHandler(null, { message: 'Продолжить?' });
    expect(result).toBe(true);
    expect(mockDialog.showMessageBox).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ type: 'question', buttons: ['Да', 'Нет'] })
    );
  });

  it('dialog:show-confirm возвращает false при response 1', async () => {
    mockDialog.showMessageBox.mockResolvedValue({ response: 1 });
    const result = await showConfirmHandler(null, { message: 'Продолжить?' });
    expect(result).toBe(false);
  });
});
