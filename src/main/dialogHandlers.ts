import type { IpcMain } from 'electron';

export interface DialogHandlersDeps {
  showMessageBox: (win: unknown, options: Record<string, unknown>) => Promise<{ response: number }>;
}

/**
 * Регистрирует IPC-обработчики для показа диалогов из main-процесса.
 * Используется вместо alert/confirm в рендерере для устранения бага потери фокуса в полях ввода (Electron #20821).
 */
export function registerDialogHandlers(
  ipcMain: IpcMain,
  dialog: DialogHandlersDeps,
  getWindow: () => { id?: number } | null
): void {
  ipcMain.handle('dialog:show-message', async (_event, options: { title?: string; message: string }) => {
    const win = getWindow();
    if (!win) return;
    await dialog.showMessageBox(win, {
      type: 'info',
      title: options.title ?? 'Информация',
      message: options.message,
      buttons: ['OK'],
    });
  });

  ipcMain.handle('dialog:show-confirm', async (_event, options: { title?: string; message: string }) => {
    const win = getWindow();
    if (!win) return false;
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      title: options.title ?? 'Подтверждение',
      message: options.message,
      buttons: ['Да', 'Нет'],
      cancelId: 1,
    });
    return response === 0;
  });
}
