import { dialog } from "electron";
import electronUpdater from "electron-updater";
import * as settingsManager from "./settingsManager.ts";

// electron-updater - используем default import и деструктуризацию для совместимости
const { autoUpdater } = electronUpdater;

/**
 * Модуль для управления автоматическими обновлениями приложения
 * Использует electron-updater для проверки и установки обновлений
 */

let mainWindow = null;

/**
 * Инициализирует систему автоматических обновлений
 * @param {BrowserWindow} window - главное окно приложения
 * @param {boolean} isDev - флаг режима разработки
 */
export async function initializeUpdater(window, isDev) {
  mainWindow = window;

  // В режиме разработки отключаем автообновления
  if (isDev) {
    console.log("[Updater] Режим разработки - автообновления отключены");
    return;
  }

  // Проверяем настройку автоматических обновлений
  try {
    const autoUpdateSettings = await settingsManager.getAutoUpdateSettings();
    if (!autoUpdateSettings.enabled) {
      console.log("[Updater] Автоматические обновления отключены в настройках");
      return;
    }
  } catch (error) {
    console.error("[Updater] Ошибка при проверке настроек автообновлений:", error);
    // Продолжаем работу, если не удалось загрузить настройки
  }

  // Настраиваем параметры autoUpdater
  autoUpdater.autoDownload = false; // Не скачивать автоматически, спрашивать пользователя
  autoUpdater.autoInstallOnAppQuit = true; // Устанавливать при выходе из приложения

  // Настраиваем канал для обновлений (GitHub)
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "ivmoiseev",
    repo: "vmix-volley-scoreboard",
  });

  // Обработчики событий обновлений
  setupUpdaterEventHandlers();

  // Проверяем обновления при старте приложения (с задержкой 10 секунд)
  setTimeout(async () => {
    // Проверяем настройку еще раз перед проверкой обновлений
    try {
      const autoUpdateSettings = await settingsManager.getAutoUpdateSettings();
      if (autoUpdateSettings.enabled) {
        checkForUpdates();
      }
    } catch (error) {
      console.error("[Updater] Ошибка при проверке настроек перед проверкой обновлений:", error);
    }
  }, 10000);
}

/**
 * Настраивает обработчики событий autoUpdater
 */
function setupUpdaterEventHandlers() {
  // Проверка обновлений началась
  autoUpdater.on("checking-for-update", () => {
    console.log("[Updater] Проверка обновлений...");
    sendUpdateStatusToRenderer("checking", null);
  });

  // Обновление доступно
  autoUpdater.on("update-available", (info) => {
    console.log("[Updater] Доступно обновление:", info.version);
    sendUpdateStatusToRenderer("available", {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });

    // Показываем диалог пользователю
    showUpdateAvailableDialog(info);
  });

  // Обновление недоступно (уже установлена последняя версия)
  autoUpdater.on("update-not-available", (info) => {
    console.log("[Updater] Обновления не найдены. Текущая версия:", info.version);
    sendUpdateStatusToRenderer("not-available", {
      version: info.version,
    });
  });

  // Ошибка при проверке обновлений
  autoUpdater.on("error", (error) => {
    // Проверяем, является ли ошибка отсутствием latest.yml (404)
    // Это нормально, если релиз был создан вручную без electron-builder --publish
    const isMissingLatestYml = 
      error.message?.includes("latest.yml") || 
      error.message?.includes("404") ||
      error.code === "ERR_HTTP_RESPONSE_CODE_FAILURE";
    
    if (isMissingLatestYml) {
      console.log(
        "[Updater] Файл latest.yml не найден. Это нормально, если релиз был создан вручную. " +
        "Для автоматических обновлений используйте 'electron-builder --publish always' при публикации релиза."
      );
      // Не отправляем ошибку в UI, так как это не критическая проблема
      // Пользователь может проверить обновления вручную через GitHub Releases
      sendUpdateStatusToRenderer("not-available", {
        version: null,
        message: "Автоматическая проверка обновлений недоступна. Проверьте обновления вручную на GitHub.",
      });
      return;
    }
    
    console.error("[Updater] Ошибка при проверке обновлений:", error);
    sendUpdateStatusToRenderer("error", {
      message: error.message,
    });
  });

  // Загрузка обновления началась
  autoUpdater.on("download-progress", (progressObj) => {
    const percent = Math.round(progressObj.percent);
    console.log(`[Updater] Загрузка: ${percent}%`);
    sendUpdateStatusToRenderer("downloading", {
      percent: percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  });

  // Загрузка обновления завершена
  autoUpdater.on("update-downloaded", (info) => {
    console.log("[Updater] Обновление загружено:", info.version);
    sendUpdateStatusToRenderer("downloaded", {
      version: info.version,
    });

    // Показываем диалог о готовности к установке
    showUpdateDownloadedDialog(info);
  });
}

/**
 * Отправляет статус обновления в renderer процесс
 * @param {string} status - статус обновления
 * @param {object} data - дополнительные данные
 */
function sendUpdateStatusToRenderer(status, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { status, data });
  }
}

/**
 * Показывает диалог о доступном обновлении
 * @param {object} info - информация об обновлении
 */
function showUpdateAvailableDialog(info) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const message = `Доступна новая версия приложения: ${info.version}\n\nХотите скачать и установить обновление?`;
  const detail = info.releaseNotes
    ? `Что нового:\n${info.releaseNotes}`
    : `Дата выпуска: ${info.releaseDate || "Не указана"}`;

  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      title: "Доступно обновление",
      message: message,
      detail: detail,
      buttons: ["Скачать", "Позже"],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        // Пользователь выбрал "Скачать"
        downloadUpdate();
      }
    })
    .catch((error) => {
      console.error("[Updater] Ошибка при показе диалога:", error);
    });
}

/**
 * Показывает диалог о загруженном обновлении
 * @param {object} info - информация об обновлении
 */
function showUpdateDownloadedDialog(info) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const message = `Обновление ${info.version} загружено и готово к установке.\n\nПриложение будет перезапущено для установки обновления.`;
  const detail =
    "Рекомендуется сохранить все несохраненные изменения перед установкой.";

  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      title: "Обновление готово к установке",
      message: message,
      detail: detail,
      buttons: ["Установить сейчас", "Установить при выходе"],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        // Пользователь выбрал "Установить сейчас"
        installUpdate();
      }
      // Если выбрано "Установить при выходе", autoInstallOnAppQuit уже настроен
    })
    .catch((error) => {
      console.error("[Updater] Ошибка при показе диалога:", error);
    });
}

/**
 * Проверяет наличие обновлений
 */
export async function checkForUpdates() {
  if (process.env.NODE_ENV === "development") {
    console.log("[Updater] Пропуск проверки обновлений в режиме разработки");
    return;
  }

  // Проверяем настройку автоматических обновлений
  try {
    const autoUpdateSettings = await settingsManager.getAutoUpdateSettings();
    if (!autoUpdateSettings.enabled) {
      console.log("[Updater] Автоматические обновления отключены - пропуск проверки");
      sendUpdateStatusToRenderer("disabled", null);
      return;
    }
  } catch (error) {
    console.error("[Updater] Ошибка при проверке настроек:", error);
    // Продолжаем проверку, если не удалось загрузить настройки
  }

  console.log("[Updater] Запуск проверки обновлений...");
  autoUpdater.checkForUpdates().catch((error) => {
    // Проверяем, является ли ошибка отсутствием latest.yml (404)
    const isMissingLatestYml = 
      error.message?.includes("latest.yml") || 
      error.message?.includes("404") ||
      error.code === "ERR_HTTP_RESPONSE_CODE_FAILURE";
    
    if (isMissingLatestYml) {
      console.log(
        "[Updater] Файл latest.yml не найден. Это нормально, если релиз был создан вручную. " +
        "Для автоматических обновлений используйте 'electron-builder --publish always' при публикации релиза."
      );
      sendUpdateStatusToRenderer("not-available", {
        version: null,
        message: "Автоматическая проверка обновлений недоступна. Проверьте обновления вручную на GitHub.",
      });
      return;
    }
    
    console.error("[Updater] Ошибка при проверке обновлений:", error);
    sendUpdateStatusToRenderer("error", {
      message: error.message,
    });
  });
}

/**
 * Скачивает доступное обновление
 */
export function downloadUpdate() {
  console.log("[Updater] Начало загрузки обновления...");
  sendUpdateStatusToRenderer("downloading", { percent: 0 });
  autoUpdater.downloadUpdate().catch((error) => {
    console.error("[Updater] Ошибка при загрузке обновления:", error);
    sendUpdateStatusToRenderer("error", {
      message: error.message,
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        "Ошибка загрузки обновления",
        `Не удалось загрузить обновление: ${error.message}`
      );
    }
  });
}

/**
 * Устанавливает загруженное обновление
 */
export function installUpdate() {
  console.log("[Updater] Установка обновления...");
  autoUpdater.quitAndInstall(false, true); // false = не перезапускать немедленно, true = закрыть все окна
}

