import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  dialog,
  globalShortcut,
  shell,
} from "electron";
import path from "path";
import fs from "fs";
import http from "http";
import * as documentationViewer from "./documentation-viewer.ts";
import * as fileManager from "./fileManager.ts";
import { getVMixClient, clearInputFieldsCache } from "./vmix-client.ts";
import * as vmixConfig from "./vmix-config.ts";
import { getMobileServer } from "./server.ts";
import * as settingsManager from "./settingsManager.ts";
import * as logoManager from "./logoManager.ts";
import errorHandler from "../shared/errorHandler";
import * as updater from "./updater.ts";
import { getIconPath, getPreloadPath, getVitePortFilePath } from "./utils/pathUtils.ts";
import {
  resolveLogoUrlsInImageFields,
  findInputConfig,
} from "./vmix-overlay-utils.ts";
import { registerDialogHandlers } from "./dialogHandlers.ts";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow;
let currentMatch = null;
let currentMatchFilePath = null; // Путь к файлу текущего матча
let hasUnsavedChanges = false;
let isLoadingVite = false; // Флаг для предотвращения одновременных попыток загрузки
let autoSaveTimeout = null; // Таймер для отложенного автосохранения

/**
 * Очищает файлы логотипов при создании нового матча
 * Удаляет logo_a.png и logo_b.png, чтобы они не отображались от предыдущего матча
 */
async function clearLogosOnNewMatch() {
  try {
    // Очищаем папку logos от старых логотипов при создании нового матча
    // Теперь используем cleanupLogosDirectory для удаления всех старых логотипов
    try {
      await logoManager.cleanupLogosDirectory();
      console.log('[main] Папка logos очищена при создании нового матча');
    } catch (error) {
      // Игнорируем ошибку, если папка не существует
      if (error.code !== 'ENOENT') {
        console.warn('Не удалось очистить папку logos:', error.message);
      }
    }
  } catch (error) {
    console.warn('Ошибка при очистке логотипов при создании нового матча:', error.message);
    // Не прерываем выполнение, если ошибка очистки логотипов
  }
}

/**
 * Планирует автосохранение матча с задержкой (debounce)
 */
async function scheduleAutoSave(match) {
  // Очищаем предыдущий таймер
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  // Проверяем, включено ли автосохранение
  const autoSaveSettings = await settingsManager.getAutoSaveSettings();
  if (!autoSaveSettings.enabled) {
    return;
  }

  // Если файл не был сохранен, не делаем автосохранение
  if (!currentMatchFilePath) {
    return;
  }

  // Устанавливаем таймер на 2 секунды (debounce)
  autoSaveTimeout = setTimeout(async () => {
    try {
      await fileManager.saveMatch(match, currentMatchFilePath);
      hasUnsavedChanges = false;
      console.log(
        "[AutoSave] Матч автоматически сохранен в",
        currentMatchFilePath
      );
    } catch (error) {
      console.error("[AutoSave] Ошибка при автосохранении:", error);
      // Не показываем ошибку пользователю, только логируем
    }
    autoSaveTimeout = null;
  }, 2000);
}

function createWindow() {
  // Используем единую утилиту для определения путей
  const iconPath = getIconPath();
  const preloadPath = getPreloadPath();
  
  // Проверяем существование файлов
  const iconExists = fs.existsSync(iconPath);
  const preloadExists = fs.existsSync(preloadPath);
  
  // Логируем информацию для отладки
  if (iconExists) {
    console.log(`[Window] Иконка найдена: ${iconPath}`);
  } else {
    console.warn(`[Window] Иконка не найдена по пути: ${iconPath}`);
  }
  
  if (preloadExists) {
    console.log(`[Window] Preload скрипт найден: ${preloadPath}`);
  } else {
    console.error(`[Window] Preload скрипт не найден по пути: ${preloadPath}`);
  }

  // Получаем версию приложения для заголовка окна
  const appVersion = app.getVersion();
  const windowTitle = `vMix Volley Scoreboard - v.${appVersion}`;

  // Создаем конфигурацию окна с иконкой
  const windowOptions = {
    width: 1200,
    height: 800,
    minWidth: 1280,
    minHeight: 600,
    title: windowTitle,
    // Показываем окно только после загрузки
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      // Для корректной загрузки ES модулей в production
      webSecurity: true,
      sandbox: false,
    },
  };
  
  // Добавляем иконку, если она найдена
  if (fs.existsSync(iconPath)) {
    windowOptions.icon = iconPath;
    console.log(`[Window] Иконка установлена для окна: ${iconPath}`);
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Показываем окно после загрузки страницы
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    // Устанавливаем заголовок после загрузки, чтобы переопределить HTML title
    mainWindow.setTitle(windowTitle);
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Также устанавливаем заголовок после загрузки страницы
  mainWindow.webContents.once("did-finish-load", () => {
    mainWindow.setTitle(windowTitle);
  });

  if (isDev) {
    // Функция для проверки доступности порта с проверкой, что это Vite
    const checkPort = (port, callback) => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        res.on("data", () => {
          // Игнорируем данные
        });
        res.on("end", () => {
          // Vite должен возвращать статус 200 или 304
          if (res.statusCode === 200 || res.statusCode === 304) {
            callback(true, port);
          } else {
            callback(false, port);
          }
        });
      });
      req.on("error", () => {
        callback(false, port);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        callback(false, port);
      });
    };

    // Пробуем найти работающий Vite dev server
    // Сначала проверяем файл с портом (созданный скриптом wait-for-vite.js)
    let savedPort = null;
    try {
      const portFile = getVitePortFilePath();
      if (fs.existsSync(portFile)) {
        savedPort = parseInt(fs.readFileSync(portFile, "utf8").trim());
      }
    } catch {
      // Игнорируем ошибки чтения файла
    }
    const tryPorts = savedPort
      ? [savedPort, 5173, 5174, 5175, 5176]
      : [5173, 5174, 5175, 5176];
    let portIndex = 0;
    let maxAttempts = 20; // Увеличиваем количество попыток
    let attempts = 0;

    const findVitePort = () => {
      if (isLoadingVite) {
        return; // Уже идет загрузка
      }

      if (attempts >= maxAttempts) {
        console.error(
          "Не удалось найти работающий Vite dev server после всех попыток"
        );
        return;
      }

      if (portIndex >= tryPorts.length) {
        portIndex = 0; // Начинаем заново
        attempts++;
      }

      const port = tryPorts[portIndex];
      checkPort(port, (available, checkedPort) => {
        if (available) {
          isLoadingVite = true; // Устанавливаем флаг
          // Vite автоматически обслуживает index.html из корня
          const devUrl = `http://localhost:${checkedPort}/`;
          console.log(
            `✓ Подключение к Vite dev server на порту ${checkedPort}`
          );
          console.log(`URL: ${devUrl}`);

          // Обработчик успешной загрузки
          const onLoadSuccess = () => {
            console.log(`✓ Страница успешно загружена с порта ${checkedPort}`);
            isLoadingVite = false; // Сбрасываем флаг
            mainWindow.webContents.removeListener("did-fail-load", onLoadFail);
            // Устанавливаем заголовок после загрузки, чтобы переопределить HTML title
            mainWindow.setTitle(windowTitle);
            // Открываем DevTools для отладки
            mainWindow.webContents.openDevTools();
            // Также логируем текущий URL для проверки
            console.log(`Текущий URL: ${mainWindow.webContents.getURL()}`);
          };

          // Обработчик ошибки загрузки
          const onLoadFail = (event, errorCode, errorDescription) => {
            console.error(
              `✗ Ошибка загрузки с порта ${checkedPort}: ${errorCode} - ${errorDescription}`
            );
            isLoadingVite = false; // Сбрасываем флаг
            mainWindow.webContents.removeListener(
              "did-finish-load",
              onLoadSuccess
            );
            portIndex++;
            setTimeout(findVitePort, 500);
          };

          mainWindow.webContents.once("did-finish-load", onLoadSuccess);
          mainWindow.webContents.once("did-fail-load", onLoadFail);

          mainWindow.loadURL(devUrl).catch((err) => {
            console.error("Ошибка при вызове loadURL:", err);
            isLoadingVite = false; // Сбрасываем флаг
            mainWindow.webContents.removeListener(
              "did-finish-load",
              onLoadSuccess
            );
            mainWindow.webContents.removeListener("did-fail-load", onLoadFail);
            portIndex++;
            setTimeout(findVitePort, 500);
          });
        } else {
          portIndex++;
          // Повторяем попытку через 500ms
          setTimeout(findVitePort, 500);
        }
      });
    };

    // Начинаем поиск порта с небольшой задержкой, чтобы дать Vite время запуститься
    setTimeout(() => {
      findVitePort();
    }, 1000);
  } else {
    // В production режиме используем app.getAppPath() для правильного пути
    // dist/index.html находится внутри ASAR архива
    const appPath = app.getAppPath();
    const distPath = path.join(appPath, "dist", "index.html");
    console.log("[Production] App path:", appPath);
    console.log("[Production] Loading file from:", distPath);
    console.log("[Production] File exists:", fs.existsSync(distPath));

    // Используем loadFile вместо loadURL для корректной работы с относительными путями
    // loadFile автоматически обрабатывает пути к assets внутри ASAR
    mainWindow.loadFile(distPath).catch((err) => {
      console.error("[Production] Failed to load index.html:", err);
      console.error("[Production] Error details:", err.message, err.stack);
      // Попробуем альтернативный способ через loadURL с file:// протоколом
      const fileUrl = `file://${distPath.replace(/\\/g, "/")}`;
      console.log("[Production] Trying alternative URL:", fileUrl);
      mainWindow.loadURL(fileUrl).catch((urlErr) => {
        console.error("[Production] Failed to load via URL:", urlErr);
        console.error("[Production] URL Error details:", urlErr.message, urlErr.stack);
      });
    });
    
    // Обработка ошибок загрузки страницы
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`[Production] Failed to load: ${errorCode} - ${errorDescription}`);
      console.error(`[Production] URL: ${validatedURL}`);
    });
    
    // Обработка успешной загрузки
    mainWindow.webContents.on('did-finish-load', () => {
      console.log("[Production] Page loaded successfully");
      // Устанавливаем заголовок после загрузки, чтобы переопределить HTML title
      mainWindow.setTitle(windowTitle);
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Логируем события загрузки
  mainWindow.webContents.on("dom-ready", () => {
    console.log("[Production] DOM ready");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[Production] Page finished loading");
    // Устанавливаем заголовок после загрузки, чтобы переопределить HTML title
    mainWindow.setTitle(windowTitle);
  });

  // Логируем ошибки загрузки страницы
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      console.error(`[Failed to load] URL: ${validatedURL}`);
      console.error(`[Failed to load] Error code: ${errorCode}`);
      console.error(`[Failed to load] Error description: ${errorDescription}`);
      console.error(`[Failed to load] Is main frame: ${isMainFrame}`);
    }
  );

  // Логируем ошибки JavaScript в renderer процессе
  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      const levelNames = ["debug", "log", "info", "warning", "error"];
      const levelName = levelNames[level] || level;
      // В production логируем все сообщения для отладки
      if (!isDev || level >= 2) {
        console.log(
          `[Renderer ${levelName}] ${message}${
            sourceId ? ` (${sourceId}:${line})` : ""
          }`
        );
      }
    }
  );

  // Перехватываем ошибки JavaScript
  mainWindow.webContents
    .executeJavaScript(
      `
    window.addEventListener('error', (event) => {
      console.error('JavaScript Error:', event.error);
    });
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
    });
  `
    )
    .catch((_err) => {
      // Игнорируем ошибки выполнения этого скрипта
    });

  // Логируем ошибки в консоли renderer процесса
  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      const levelNames = ["debug", "log", "info", "warning", "error"];
      try {
        console.log(
          `[Renderer ${
            levelNames[level] || level
          }] ${message} (${sourceId}:${line})`
        );
      } catch (error) {
        // Игнорируем ошибки записи в консоль (EPIPE и т.д.)
        // Это может происходить, если окно закрыто или pipe разорван
        if (error.code !== 'EPIPE') {
          // Логируем только не-EPIPE ошибки
          console.error('[main] Ошибка при логировании сообщения renderer:', error.message);
        }
      }
    }
  );
}

app.whenReady().then(async () => {
  createWindow();
  await createMenu();

  // Инициализируем систему автоматических обновлений
  if (mainWindow) {
    await updater.initializeUpdater(mainWindow, isDev);
  }

  // Регистрируем горячие клавиши для DevTools (работают в production)
  globalShortcut.register("F12", () => {
    // Проверяем, есть ли открытое окно документации
    const docWindow = documentationViewer.getDocumentationWindow();
    if (docWindow && docWindow.isFocused()) {
      // Если окно документации в фокусе, переключаем его DevTools
      if (docWindow.webContents.isDevToolsOpened()) {
        docWindow.webContents.closeDevTools();
      } else {
        docWindow.webContents.openDevTools();
      }
    } else if (mainWindow) {
      // Иначе переключаем DevTools основного окна
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Альтернативная комбинация Ctrl+Shift+I
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    // Проверяем, есть ли открытое окно документации
    const docWindow = documentationViewer.getDocumentationWindow();
    if (docWindow && docWindow.isFocused()) {
      // Если окно документации в фокусе, переключаем его DevTools
      if (docWindow.webContents.isDevToolsOpened()) {
        docWindow.webContents.closeDevTools();
      } else {
        docWindow.webContents.openDevTools();
      }
    } else if (mainWindow) {
      // Иначе переключаем DevTools основного окна
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Инициализируем папку logos и мигрируем из extraResources при первом запуске
  try {
    // ensureLogosDir создаст папку и выполнит миграцию из extraResources в production
    await logoManager.ensureLogosDir();
    const logosDir = logoManager.getLogosDir();
    console.log("[App] Папка logos инициализирована:", logosDir);
  } catch (error) {
    console.warn(
      "[App] Не удалось инициализировать папку logos при старте:",
      error.message
    );
  }
  
  // Очищаем папку logos от устаревших файлов при старте приложения
  try {
    await logoManager.cleanupLogosDirectory();
    console.log("[App] Папка logos очищена от устаревших файлов");
  } catch (error) {
    console.warn(
      "[App] Не удалось очистить папку logos при старте:",
      error.message
    );
  }

  // При старте: если в настройках «Отключено» — считаем отключённым; если «Подключено» — проверяем
  // доступность vMix; при недоступности переводим в «Отключено» и сохраняем; при доступности — считаем включённым.
  try {
    const vmixSettings = await settingsManager.getVMixSettings();
    if (vmixSettings?.connectionState === "connected" && vmixSettings?.host && vmixSettings?.port) {
      const client = getVMixClient(vmixSettings.host, vmixSettings.port);
      const result = await client.testConnection();
      if (!result.success) {
        await settingsManager.setVMixSettings({
          ...vmixSettings,
          connectionState: "disconnected",
        });
        console.log("[App] vMix: автоматическое подключение не удалось, состояние сброшено");
      }
    }
  } catch (error) {
    console.warn("[App] Ошибка при восстановлении подключения к vMix:", error?.message);
  }

  // Восстанавливаем состояние мобильного сервера при запуске
  try {
    const mobileSettings = await settingsManager.getMobileSettings();
    if (mobileSettings.enabled) {
      const mobileServer = getMobileServer();
      try {
        await mobileServer.start(mobileSettings.port || 3000);
        console.log(
          "Мобильный сервер автоматически запущен при старте приложения"
        );
        // Загружаем сохраненную сессию, если она есть
        if (mobileSettings.sessionId) {
          await mobileServer.loadSavedSession();
        }
      } catch (error) {
        console.error(
          "Не удалось автоматически запустить мобильный сервер:",
          error
        );
        // Если не удалось запустить, отключаем в настройках
        await settingsManager.setMobileSettings({
          ...mobileSettings,
          enabled: false,
        });
      }
    }
  } catch (error) {
    console.error(
      "Ошибка при восстановлении состояния мобильного сервера:",
      error
    );
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // Отменяем регистрацию всех глобальных горячих клавиш
  globalShortcut.unregisterAll();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Отменяем регистрацию горячих клавиш при выходе
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Обработка закрытия окна с проверкой несохраненных изменений
app.on("before-quit", async (event) => {
  if (hasUnsavedChanges && mainWindow) {
    event.preventDefault();
    const choice = await dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Сохранить", "Не сохранять", "Отмена"],
      defaultId: 0,
      title: "Несохраненные изменения",
      message: "У вас есть несохраненные изменения. Сохранить перед выходом?",
    });

    if (choice.response === 0) {
      // Сохранить
      if (currentMatch && mainWindow) {
        mainWindow.webContents.send("save-match-before-quit");
        // Ждем сохранения
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      hasUnsavedChanges = false;
      app.quit();
    } else if (choice.response === 1) {
      // Не сохранять
      hasUnsavedChanges = false;
      app.quit();
    }
    // Если отмена - ничего не делаем, приложение продолжит работу
  }
});


/**
 * Создает главное меню приложения
 */
async function createMenu() {
  // Загружаем настройки автосохранения для меню
  let autoSaveEnabled = true;
  try {
    const autoSaveSettings = await settingsManager.getAutoSaveSettings();
    autoSaveEnabled = autoSaveSettings.enabled;
  } catch (error) {
    console.error(
      "Ошибка при загрузке настроек автосохранения для меню:",
      error
    );
  }

  const template = [
    {
      label: "Файл",
      submenu: [
        {
          label: "Создать новый матч",
          accelerator: "CmdOrCtrl+N",
          click: async () => {
            if (mainWindow) {
              const match = await fileManager.createMatch();
              
              // При создании нового матча очищаем файлы логотипов
              await clearLogosOnNewMatch();
              
              currentMatch = match;
              currentMatchFilePath = null; // Сбрасываем путь при создании нового матча
              hasUnsavedChanges = true;
              mainWindow.webContents.send("load-match", match);
            }
          },
        },
        {
          label: "Открыть матч...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            if (mainWindow) {
              try {
                const filePath = await fileManager.openMatchDialog();
                if (filePath) {
                  const match = await fileManager.openMatch(filePath);
                  currentMatch = match;
                  currentMatchFilePath = filePath; // Запоминаем путь к файлу
                  hasUnsavedChanges = false;
                  mainWindow.webContents.send("load-match", match);
                }
              } catch (error) {
                dialog.showErrorBox(
                  "Ошибка",
                  "Не удалось открыть матч: " + error.message
                );
              }
            }
          },
        },
        { type: "separator" },
        {
          label: "Автосохранение",
          type: "checkbox",
          checked: autoSaveEnabled,
          click: async (menuItem) => {
            try {
              await settingsManager.setAutoSaveSettings({
                enabled: menuItem.checked,
              });
              // Отправляем событие в renderer для обновления UI
              if (mainWindow) {
                mainWindow.webContents.send(
                  "autosave-settings-changed",
                  menuItem.checked
                );
              }
            } catch (error) {
              console.error("Ошибка при изменении автосохранения:", error);
            }
          },
        },
        {
          label: "Сохранить матч",
          accelerator: "CmdOrCtrl+S",
          click: async () => {
            if (mainWindow && currentMatch) {
              try {
                let filePath;
                // Если файл уже был сохранен, используем его путь
                if (currentMatchFilePath) {
                  filePath = await fileManager.saveMatch(
                    currentMatch,
                    currentMatchFilePath
                  );
                } else {
                  // Первое сохранение - показываем диалог
                  filePath = await fileManager.saveMatchDialog(currentMatch);
                  if (filePath) {
                    currentMatchFilePath = filePath;
                  }
                }
                if (filePath) {
                  hasUnsavedChanges = false;
                  mainWindow.webContents.send("match-saved");
                }
              } catch (error) {
                dialog.showErrorBox(
                  "Ошибка",
                  "Не удалось сохранить матч: " + error.message
                );
              }
            }
          },
        },
        {
          label: "Сохранить матч как...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: async () => {
            if (mainWindow && currentMatch) {
              try {
                const filePath = await fileManager.saveMatchDialog(
                  currentMatch
                );
                if (filePath) {
                  currentMatchFilePath = filePath; // Обновляем путь к файлу
                  hasUnsavedChanges = false;
                  mainWindow.webContents.send("match-saved");
                }
              } catch (error) {
                dialog.showErrorBox(
                  "Ошибка",
                  "Не удалось сохранить матч: " + error.message
                );
              }
            }
          },
        },
        { type: "separator" },
        {
          label: "Импорт настроек...",
          click: async () => {
            if (mainWindow) {
              try {
                const result = await dialog.showOpenDialog({
                  title: 'Импорт настроек',
                  filters: [
                    { name: 'JSON файлы', extensions: ['json'] },
                    { name: 'Все файлы', extensions: ['*'] },
                  ],
                  properties: ['openFile'],
                });

                if (!result.canceled && result.filePaths.length > 0) {
                  const filePath = result.filePaths[0];
                  const importResult = await settingsManager.importSettingsFromFile(filePath);

                  if (importResult.success) {
                    let message = 'Настройки успешно импортированы';
                    let detail = `Настройки загружены из файла:\n${filePath}`;

                    if (importResult.warnings && importResult.warnings.length > 0) {
                      detail += `\n\nПредупреждения:\n${importResult.warnings.join('\n')}`;
                    }

                    dialog.showMessageBox(mainWindow, {
                      type: importResult.warnings && importResult.warnings.length > 0 ? 'warning' : 'info',
                      title: 'Успешно',
                      message,
                      detail,
                    });

                    // Перезагружаем приложение для применения новых настроек
                    // (или можно отправить событие в renderer для обновления)
                    mainWindow.webContents.send("settings-imported");
                  } else {
                    throw new Error(importResult.errors?.join(', ') || 'Неизвестная ошибка');
                  }
                }
              } catch (error: any) {
                dialog.showErrorBox(
                  "Ошибка",
                  "Не удалось импортировать настройки: " + error.message
                );
              }
            }
          },
        },
        {
          label: "Экспорт настроек...",
          click: async () => {
            if (mainWindow) {
              try {
                const result = await dialog.showSaveDialog({
                  title: 'Экспорт настроек',
                  defaultPath: 'vmix-volley-scoreboard-settings.json',
                  filters: [
                    { name: 'JSON файлы', extensions: ['json'] },
                    { name: 'Все файлы', extensions: ['*'] },
                  ],
                });

                if (!result.canceled && result.filePath) {
                  await settingsManager.exportSettingsToFile(result.filePath);
                  dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Успешно',
                    message: 'Настройки успешно экспортированы',
                    detail: `Настройки сохранены в файл:\n${result.filePath}`,
                  });
                }
              } catch (error: any) {
                dialog.showErrorBox(
                  "Ошибка",
                  "Не удалось экспортировать настройки: " + error.message
                );
              }
            }
          },
        },
        { type: "separator" },
        {
          label: "Выход",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Вид",
      submenu: [
        {
          label: "Переключить тему (светлая ↔ тёмная)",
          click: async () => {
            if (mainWindow) {
              try {
                const ui = await settingsManager.getUISettings();
                const current = ui?.theme ?? "light";
                const next = current === "dark" ? "light" : "dark";
                await settingsManager.setUISettings({ theme: next });
                mainWindow.webContents.send("ui-theme-changed", next);
              } catch (e) {
                console.error("Ошибка переключения темы:", e);
              }
            }
          },
        },
        { type: "separator" },
        {
          label: "Управление матчем",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("navigate", "/match");
            }
          },
        },
        {
          label: "Настройки матча",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("navigate", "/match/settings");
            }
          },
        },
        {
          label: "Настройки vMix",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("navigate", "/vmix/settings");
            }
          },
        },
        {
          label: "Мобильный доступ",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("navigate", "/mobile/access");
            }
          },
        },
        { type: "separator" },
        {
          label: "Инструменты разработчика",
          accelerator: "F12",
          click: () => {
            if (mainWindow) {
              if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
              } else {
                mainWindow.webContents.openDevTools();
              }
            }
          },
        },
        { type: "separator" },
        {
          label: "Обновить данные в vMix",
          accelerator: "F5",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("refresh-vmix");
            }
          },
        },
      ],
    },
    {
      label: "Справка",
      submenu: [
        {
          label: "Руководство пользователя",
          click: () => {
            documentationViewer.openDocumentationWindow(
              "USER_GUIDE.md",
              "Руководство пользователя",
              mainWindow,
              isDev
            );
          },
        },
        {
          label: "Инструкция по установке",
          click: () => {
            documentationViewer.openDocumentationWindow(
              "INSTALLATION.md",
              "Инструкция по установке",
              mainWindow,
              isDev
            );
          },
        },
        {
          label: "README",
          click: () => {
            documentationViewer.openDocumentationWindow(
              "README.md",
              "README",
              mainWindow,
              isDev
            );
          },
        },
        { type: "separator" },
        {
          label: "О программе",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("navigate", "/about");
            }
          },
        },
      ],
    },
  ];

  // На macOS первый пункт меню - название приложения
  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about", label: "О программе" },
        { type: "separator" },
        { role: "services", label: "Сервисы" },
        { type: "separator" },
        { role: "hide", label: "Скрыть" },
        { role: "hideOthers", label: "Скрыть остальные" },
        { role: "unhide", label: "Показать все" },
        { type: "separator" },
        { role: "quit", label: "Выход" },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers
registerDialogHandlers(ipcMain, dialog, () => BrowserWindow.getFocusedWindow());
ipcMain.handle("app-version", () => {
  return app.getVersion();
});

// File management handlers
ipcMain.handle("match:create", async () => {
  try {
    const match = await fileManager.createMatch();
    
    // При создании нового матча очищаем файлы логотипов,
    // чтобы они не отображались от предыдущего матча
    await clearLogosOnNewMatch();
    
    return match;
  } catch (error) {
    console.error("Error creating match:", error);
    const friendlyError = errorHandler.handleError(error, "match:create");
    throw new Error(friendlyError);
  }
});

ipcMain.handle("match:open-dialog", async () => {
  try {
    const filePath = await fileManager.openMatchDialog();
    if (!filePath) {
      return null;
    }
    const match = await fileManager.openMatch(filePath);
    currentMatchFilePath = filePath; // Запоминаем путь к файлу
    currentMatch = match;
    hasUnsavedChanges = false;
    return match;
  } catch (error) {
    console.error("Error opening match:", error);
    const friendlyError = errorHandler.handleError(error, "match:open-dialog");
    throw new Error(friendlyError);
  }
});

ipcMain.handle("match:save", async (event, match) => {
  try {
    let filePath;
    // Если файл уже был сохранен, используем его путь
    if (currentMatchFilePath) {
      filePath = await fileManager.saveMatch(match, currentMatchFilePath);
    } else {
      // Первое сохранение - показываем диалог
      filePath = await fileManager.saveMatchDialog(match);
      if (filePath) {
        currentMatchFilePath = filePath;
      } else {
        return { success: false, cancelled: true };
      }
    }
    currentMatch = match;
    hasUnsavedChanges = false;
    return { success: true, filePath };
  } catch (error) {
    console.error("Error saving match:", error);
    const friendlyError = errorHandler.handleError(error, "match:save");
    throw new Error(friendlyError);
  }
});

ipcMain.handle("match:save-dialog", async (event, match) => {
  try {
    const filePath = await fileManager.saveMatchDialog(match);
    if (!filePath) {
      return { success: false, cancelled: true };
    }
    currentMatchFilePath = filePath; // Обновляем путь к файлу
    currentMatch = match;
    hasUnsavedChanges = false;
    return { success: true, filePath };
  } catch (error) {
    console.error("Error saving match:", error);
    const friendlyError = errorHandler.handleError(error, "match:save-dialog");
    throw new Error(friendlyError);
  }
});

// Отслеживание изменений матча
// ВАЖНО: НЕ сохраняем логотипы в файлы здесь - это лишняя операция
// Файлы генерируются только при:
// 1. Загрузке нового логотипа (logo:save-to-file)
// 2. Открытии сохраненного матча (fileManager.openMatch -> processTeamLogoForLoad)
// 3. Смене команд местами (match:swap-teams)
ipcMain.handle("match:set-current", async (event, match) => {
  console.log('[match:set-current] Обновление текущего матча');
  console.log(`  teamA.name: ${match?.teamA?.name || 'N/A'}, logoPath: ${match?.teamA?.logoPath || 'N/A'}`);
  console.log(`  teamB.name: ${match?.teamB?.name || 'N/A'}, logoPath: ${match?.teamB?.logoPath || 'N/A'}`);
  console.log(`  variant: ${match?.variant || 'N/A'}`);

  currentMatch = match;
  hasUnsavedChanges = true;

  // Автосохранение при изменениях матча
  await scheduleAutoSave(match);

  // Возвращаем матч без изменений (логотипы уже должны быть в файлах)
  return { success: true, match };
});

ipcMain.handle("match:mark-saved", () => {
  hasUnsavedChanges = false;
  return { success: true };
});

/**
 * Сохраняет логотип команды в файл
 * Вызывается при загрузке нового логотипа в настройках
 * @param {string} teamLetter - 'A' или 'B'
 * @param {string} logoBase64 - base64 строка логотипа
 */
ipcMain.handle("logo:save-to-file", async (event, teamLetter, logoBase64) => {
  try {
    if (!logoBase64) {
      return { success: false, error: "Логотип не указан" };
    }
    
    // Очищаем папку перед сохранением (удаляем старые логотипы)
    await logoManager.cleanupLogosDirectory();
    
    // Сохраняем логотип в файл с уникальным именем
    const processedTeam = await logoManager.processTeamLogoForSave(
      { logo: logoBase64 },
      teamLetter
    );
    
    return {
      success: true,
      logoPath: processedTeam.logoPath,
      logoBase64: processedTeam.logoBase64,
    };
  } catch (error) {
    console.error(`Ошибка при сохранении логотипа команды ${teamLetter}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Удаляет логотип команды (очищает файлы)
 * Вызывается при удалении логотипа в настройках
 * @param {string} teamLetter - 'A' или 'B'
 */
ipcMain.handle("logo:delete", async (event, teamLetter) => {
  try {
    // Очищаем папку logos от всех файлов логотипов
    await logoManager.cleanupLogosDirectory();
    
    return { success: true };
  } catch (error) {
    console.error(`Ошибка при удалении логотипа команды ${teamLetter}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Меняет команды местами в матче
 * Меняет местами teamA и teamB, счет, статистику и файлы логотипов
 */
ipcMain.handle("match:swap-teams", async (event, match) => {
  try {
    if (!match) {
      return { success: false, error: "Матч не указан" };
    }

    // Создаем копию матча для изменения
    const swappedMatch = JSON.parse(JSON.stringify(match));

    // 1. Сохраняем оригинальные логотипы ДО смены команд
    // Это критически важно - нужно сохранить логотипы до того, как команды поменяются местами
    const originalTeamALogo = match.teamA.logo || match.teamA.logoBase64;
    const originalTeamBLogo = match.teamB.logo || match.teamB.logoBase64;

    // 2. Меняем местами команды
    const tempTeam = swappedMatch.teamA;
    swappedMatch.teamA = swappedMatch.teamB;
    swappedMatch.teamB = tempTeam;

    // 3. Меняем местами счет в текущей партии
    const tempScore = swappedMatch.currentSet.scoreA;
    swappedMatch.currentSet.scoreA = swappedMatch.currentSet.scoreB;
    swappedMatch.currentSet.scoreB = tempScore;

    // 4. Инвертируем подачу (A -> B, B -> A)
    swappedMatch.currentSet.servingTeam =
      swappedMatch.currentSet.servingTeam === "A" ? "B" : "A";

    // 5. Меняем местами счет в завершенных партиях
    if (swappedMatch.sets && Array.isArray(swappedMatch.sets)) {
      swappedMatch.sets = swappedMatch.sets.map((set) => {
        const tempSetScore = set.scoreA;
        set.scoreA = set.scoreB;
        set.scoreB = tempSetScore;
        return set;
      });
    }

    // 6. Меняем местами статистику
    if (swappedMatch.statistics) {
      const tempStats = swappedMatch.statistics.teamA;
      swappedMatch.statistics.teamA = swappedMatch.statistics.teamB;
      swappedMatch.statistics.teamB = tempStats;
    }

    // 7. Сохраняем логотипы в правильные файлы
    // После смены команд местами:
    // - swappedMatch.teamA теперь содержит данные бывшей команды B
    // - swappedMatch.teamB теперь содержит данные бывшей команды A
    // Поэтому сохраняем оригинальный логотип команды B в logo_a.png
    // и оригинальный логотип команды A в logo_b.png
    try {
      // ВАЖНО: Очищаем папку ОДИН РАЗ перед сохранением обоих логотипов
      await logoManager.cleanupLogosDirectory();
      
      // Сохраняем оригинальный логотип команды B в logo_a.png (для новой команды A)
      if (originalTeamBLogo) {
        const processedTeamA = await logoManager.processTeamLogoForSave(
          { logo: originalTeamBLogo },
          "A"
        );
        // Обновляем логотипы в swappedMatch.teamA
        // ВАЖНО: Устанавливаем все три поля для правильного отображения:
        // - logo: для отображения в UI (img src)
        // - logoBase64: для сохранения в JSON
        // - logoPath: для отправки в vMix
        swappedMatch.teamA.logo = processedTeamA.logoBase64; // Для отображения в UI
        swappedMatch.teamA.logoBase64 = processedTeamA.logoBase64; // Для сохранения
        swappedMatch.teamA.logoPath = processedTeamA.logoPath; // Для vMix
      } else {
        // Если логотипа нет, очищаем поля логотипа для команды A
        swappedMatch.teamA.logo = undefined;
        swappedMatch.teamA.logoBase64 = undefined;
        swappedMatch.teamA.logoPath = undefined;
      }

      // Сохраняем оригинальный логотип команды A в logo_b.png (для новой команды B)
      if (originalTeamALogo) {
        const processedTeamB = await logoManager.processTeamLogoForSave(
          { logo: originalTeamALogo },
          "B"
        );
        // Обновляем логотипы в swappedMatch.teamB
        // ВАЖНО: Устанавливаем все три поля для правильного отображения:
        // - logo: для отображения в UI (img src)
        // - logoBase64: для сохранения в JSON
        // - logoPath: для отправки в vMix
        swappedMatch.teamB.logo = processedTeamB.logoBase64; // Для отображения в UI
        swappedMatch.teamB.logoBase64 = processedTeamB.logoBase64; // Для сохранения
        swappedMatch.teamB.logoPath = processedTeamB.logoPath; // Для vMix
      } else {
        // Если логотипа нет, очищаем поля логотипа для команды B
        swappedMatch.teamB.logo = undefined;
        swappedMatch.teamB.logoBase64 = undefined;
        swappedMatch.teamB.logoPath = undefined;
      }

      // Очистка папки logos уже выполнена перед сохранением обоих логотипов
    } catch (error) {
      console.error(
        "Ошибка при сохранении логотипов после смены команд:",
        error
      );
      // Не прерываем выполнение
    }

    // 8. Обновляем updatedAt
    swappedMatch.updatedAt = new Date().toISOString();

    // 10. Обновляем текущий матч
    currentMatch = swappedMatch;
    hasUnsavedChanges = true;

    return { success: true, match: swappedMatch };
  } catch (error) {
    console.error("Ошибка при смене команд местами:", error);
    return { success: false, error: error.message };
  }
});

// vMix handlers
ipcMain.handle("vmix:get-config", async () => {
  return await vmixConfig.getVMixConfig();
});

ipcMain.handle("vmix:set-config", async (event, config) => {
  await vmixConfig.setVMixConfig(config);
  // Обновляем клиент с новыми настройками
  getVMixClient(config.host, config.port);
  return { success: true };
});

ipcMain.handle("vmix:test-connection", async (event, host, port) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const h = host ?? config?.host;
    const p = port ?? config?.port;
    const client = getVMixClient(h, p);
    const result = await client.testConnection();
    return result;
  } catch (error) {
    const friendlyError = errorHandler.handleError(
      error,
      "vmix:test-connection"
    );
    return { success: false, error: friendlyError };
  }
});

/** Подключение к vMix: тест соединения и сохранение connectionState в файл при успехе */
ipcMain.handle("vmix:connect", async (event, host, port) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const h = host ?? config?.host ?? "localhost";
    const p = port ?? config?.port ?? 8088;
    const client = getVMixClient(h, p);
    const result = await client.testConnection();
    if (result.success) {
      const newConfig = { ...config, host: h, port: p, connectionState: "connected" };
      await settingsManager.setVMixSettings(newConfig);
      if (mainWindow) mainWindow.webContents.send("vmix-connection-changed");
    }
    return result;
  } catch (error) {
    const friendlyError = errorHandler.handleError(error, "vmix:connect");
    return { success: false, error: friendlyError };
  }
});

/** Отключение от vMix: сохранение connectionState в файл */
ipcMain.handle("vmix:disconnect", async () => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const newConfig = { ...config, connectionState: "disconnected" };
    await settingsManager.setVMixSettings(newConfig);
    if (mainWindow) mainWindow.webContents.send("vmix-connection-changed");
    return { success: true };
  } catch (error) {
    const friendlyError = errorHandler.handleError(error, "vmix:disconnect");
    return { success: false, error: friendlyError };
  }
});

ipcMain.handle("vmix:update-input", async (event, inputName, data) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const client = getVMixClient(config.host, config.port);
    const result = await client.updateInput(inputName, data);
    return result;
  } catch (error) {
    const friendlyError = errorHandler.handleError(error, "vmix:update-input");
    return { success: false, error: friendlyError };
  }
});

ipcMain.handle(
  "vmix:update-input-fields",
  async (
    event,
    inputName,
    fields,
    colorFields,
    visibilityFields,
    imageFields,
    textColorFields
  ) => {
    try {
      const config = await vmixConfig.getVMixConfig();
      const client = getVMixClient(config.host, config.port);

      // Базовый URL для логотипов (мобильный сервер): vMix должен загружать изображения по HTTP
      let logosBaseUrl: string | null = null;
      try {
        const mobileSettings = await settingsManager.getMobileSettings();
        const port = mobileSettings?.port || 3000;
        const selectedIP = mobileSettings?.selectedIP ?? null;
        const ip = getMobileServer().getLocalIP?.(selectedIP);
        if (ip && port) {
          logosBaseUrl = `http://${ip}:${port}`;
        }
      } catch (_) {
        // Игнорируем: без URL логотипы уйдут как есть (могут не работать в vMix)
      }

      const resolvedImageFields = resolveLogoUrlsInImageFields(
        imageFields || {},
        logosBaseUrl
      );

      const results = await client.updateInputFields(
        inputName,
        fields || {},
        colorFields || {},
        visibilityFields || {},
        resolvedImageFields,
        textColorFields || {}
      );
      // Проверяем, есть ли ошибки
      const hasErrors = results.some((r) => !r.success);
      if (hasErrors) {
        const errors = results.filter((r) => !r.success).map((r) => r.error);
        return { success: false, error: errors.join("; ") };
      }
      return { success: true };
    } catch (error) {
      const friendlyError = errorHandler.handleError(
        error,
        "vmix:update-input-fields"
      );
      return { success: false, error: friendlyError };
    }
  }
);

ipcMain.handle("vmix:show-overlay", async (event, inputKey) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const { inputConfig } = findInputConfig(config, inputKey);
    if (!inputConfig) {
      return { success: false, error: `Инпут не найден в конфигурации (ключ: ${inputKey}). Проверьте настройки vMix.` };
    }

    const inputIdentifier =
      typeof inputConfig === "string"
        ? inputConfig
        : (inputConfig as Record<string, unknown>).vmixTitle ||
          (inputConfig as Record<string, unknown>).vmixNumber;
    const overlay =
      typeof inputConfig === "object" && inputConfig !== null && (inputConfig as Record<string, unknown>).overlay != null
        ? (inputConfig as Record<string, unknown>).overlay
        : config.overlay || 1;

    if (!inputIdentifier) {
      return { success: false, error: "У инпута не задан vmixTitle / vmixNumber." };
    }

    const client = getVMixClient(config.host, config.port);
    const result = await client.showOverlay(Number(overlay), String(inputIdentifier));
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("vmix:hide-overlay", async (event, inputKey) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const { inputConfig } = findInputConfig(config, inputKey);
    if (!inputConfig) {
      return { success: false, error: `Инпут не найден в конфигурации (ключ: ${inputKey}). Проверьте настройки vMix.` };
    }

    const overlay =
      typeof inputConfig === "object" && inputConfig !== null && (inputConfig as Record<string, unknown>).overlay != null
        ? (inputConfig as Record<string, unknown>).overlay
        : config.overlay || 1;

    const client = getVMixClient(config.host, config.port);
    const result = await client.hideOverlay(Number(overlay));
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("vmix:get-overlay-state", async () => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const client = getVMixClient(config.host, config.port);
    const result = await client.getOverlayState();
    return result;
  } catch (error) {
    return { success: false, error: error.message, overlays: null };
  }
});

ipcMain.handle("vmix:getGTInputs", async () => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const client = getVMixClient(config.host, config.port);
    return await client.getGTInputs();
  } catch (error) {
    return { success: false, error: error.message, inputs: [] };
  }
});

ipcMain.handle("vmix:getInputFields", async (event, inputNumberOrKey, forceRefresh) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const client = getVMixClient(config.host, config.port);
    return await client.getInputFields(inputNumberOrKey, forceRefresh);
  } catch (error) {
    return { success: false, error: error.message, fields: [] };
  }
});

ipcMain.handle("vmix:clearInputFieldsCache", async (event, inputIdentifier) => {
  try {
    clearInputFieldsCache(inputIdentifier);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Mobile server handlers
const mobileServer = getMobileServer();

// Устанавливаем callback для синхронизации изменений матча из мобильного приложения
mobileServer.setMatchUpdateCallback((updatedMatch) => {
  // Обновляем текущий матч в main процессе
  currentMatch = updatedMatch;
  hasUnsavedChanges = true;

  // Отправляем обновленный матч в renderer процесс
  if (mainWindow) {
    mainWindow.webContents.send("load-match", updatedMatch);
  }
});

ipcMain.handle("mobile:start-server", async (event, port) => {
  try {
    const result = await mobileServer.start(port || 3000);
    return { success: true, ...result };
  } catch (error) {
    const friendlyError = errorHandler.handleError(
      error,
      "mobile:start-server"
    );
    return { success: false, error: friendlyError };
  }
});

ipcMain.handle("mobile:stop-server", async () => {
  try {
    await mobileServer.stop();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("mobile:get-server-info", async () => {
  const info = await mobileServer.getServerInfo();
  if (info) {
    console.log("[IPC mobile:get-server-info] Сервер запущен:", info);
    return info;
  }

  // Если сервер не запущен, пытаемся получить информацию из настроек
  // чтобы использовать последние известные IP и порт
  try {
    const mobileSettings = await settingsManager.getMobileSettings();
    if (mobileSettings && mobileSettings.port) {
      // IP определяется динамически через getLocalIP с учетом выбранного IP из настроек
      const selectedIP = mobileSettings.selectedIP || null;
      const fallbackInfo = {
        running: false,
        port: mobileSettings.port,
        ip: mobileServer.getLocalIP ? mobileServer.getLocalIP(selectedIP) : null,
        selectedIP: selectedIP,
      };
      if (fallbackInfo.ip) {
        fallbackInfo.url = `http://${fallbackInfo.ip}:${fallbackInfo.port}`;
      }
      console.log(
        "[IPC mobile:get-server-info] Сервер не запущен, используем настройки:",
        fallbackInfo
      );
      return fallbackInfo;
    }
  } catch (error) {
    console.error(
      "[IPC mobile:get-server-info] Ошибка при получении настроек:",
      error
    );
  }

  console.log("[IPC mobile:get-server-info] Информация недоступна");
  return { running: false };
});

ipcMain.handle("mobile:get-network-interfaces", async () => {
  try {
    const interfaces = mobileServer.getNetworkInterfaces();
    return { success: true, interfaces };
  } catch (error) {
    console.error("[IPC mobile:get-network-interfaces] Ошибка:", error);
    return { success: false, error: error.message, interfaces: [] };
  }
});

ipcMain.handle("mobile:set-selected-ip", async (event, selectedIP) => {
  try {
    const mobileSettings = await settingsManager.getMobileSettings();
    await settingsManager.setMobileSettings({
      ...mobileSettings,
      selectedIP: selectedIP,
    });
    console.log("[IPC mobile:set-selected-ip] Выбранный IP сохранен:", selectedIP);
    return { success: true };
  } catch (error) {
    console.error("[IPC mobile:set-selected-ip] Ошибка:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("mobile:generate-session", async () => {
  const sessionId = await mobileServer.generateSession();
  const info = await mobileServer.getServerInfo();
  return {
    sessionId,
    url: info ? `${info.url}/panel/${sessionId}` : null,
  };
});

ipcMain.handle("mobile:get-saved-session", async () => {
  try {
    const mobileSettings = await settingsManager.getMobileSettings();
    const info = await mobileServer.getServerInfo();
    if (mobileSettings.sessionId && info) {
      return {
        sessionId: mobileSettings.sessionId,
        url: `${info.url}/panel/${mobileSettings.sessionId}`,
      };
    }
    return null;
  } catch (error) {
    console.error("Ошибка при получении сохраненной сессии:", error);
    return null;
  }
});

ipcMain.handle("mobile:set-match", async (event, match) => {
  // ВАЖНО: НЕ сохраняем логотипы в файлы здесь - это лишняя операция
  // Файлы уже должны быть созданы при загрузке/открытии/смене команд
  // Мобильный сервер просто отдает существующие файлы по HTTP
  console.log('[mobile:set-match] Установка матча для мобильного сервера (логотипы уже в файлах)');

  mobileServer.setMatch(match);
  return { success: true };
});

ipcMain.handle("mobile:is-running", () => {
  return mobileServer.isRunning();
});

ipcMain.handle("mobile:get-settings", async () => {
  try {
    const settings = await settingsManager.getMobileSettings();
    return { success: true, ...settings };
  } catch (error) {
    console.error("Error getting mobile settings:", error);
    return { success: false, error: error.message };
  }
});

// AutoSave handlers
ipcMain.handle("autosave:get-settings", async () => {
  try {
    const settings = await settingsManager.getAutoSaveSettings();
    return { success: true, enabled: settings.enabled };
  } catch (error) {
    console.error("Error getting auto-save settings:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("autosave:set-settings", async (event, enabled) => {
  try {
    await settingsManager.setAutoSaveSettings({ enabled });
    return { success: true };
  } catch (error) {
    console.error("Error setting auto-save settings:", error);
    return { success: false, error: error.message };
  }
});

// Update handlers
ipcMain.handle("update:check", async () => {
  try {
    updater.checkForUpdates();
    return { success: true };
  } catch (error) {
    console.error("Error checking for updates:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("update:download", async () => {
  try {
    updater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error("Error downloading update:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("update:install", async () => {
  try {
    updater.installUpdate();
    return { success: true };
  } catch (error) {
    console.error("Error installing update:", error);
    return { success: false, error: error.message };
  }
});

// AutoUpdate settings handlers
ipcMain.handle("autoupdate:get-settings", async () => {
  try {
    const settings = await settingsManager.getAutoUpdateSettings();
    return { success: true, enabled: settings.enabled };
  } catch (error) {
    console.error("Error getting auto-update settings:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("autoupdate:set-settings", async (event, enabled) => {
  try {
    await settingsManager.setAutoUpdateSettings({ enabled });
    // Отправляем событие в renderer для обновления UI
    if (mainWindow) {
      mainWindow.webContents.send("autoupdate-settings-changed", enabled);
    }
    return { success: true };
  } catch (error) {
    console.error("Error setting auto-update settings:", error);
    return { success: false, error: error.message };
  }
});

// UI settings (theme) handlers
ipcMain.handle("ui:get-settings", async () => {
  try {
    const ui = await settingsManager.getUISettings();
    return { success: true, theme: ui?.theme ?? "light" };
  } catch (error) {
    console.error("Error getting UI settings:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("ui:set-settings", async (event, uiConfig: { theme?: string }) => {
  try {
    await settingsManager.setUISettings(uiConfig);
    if (mainWindow && uiConfig.theme !== undefined) {
      mainWindow.webContents.send("ui-theme-changed", uiConfig.theme);
    }
    return { success: true };
  } catch (error) {
    console.error("Error setting UI settings:", error);
    return { success: false, error: error.message };
  }
});
