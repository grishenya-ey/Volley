import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { getSettingsPath, getDefaultSettingsPath } from './utils/pathUtils.ts';

// Используем единую утилиту для определения путей
function getSettingsFilePath() {
  return getSettingsPath();
}

function getDefaultSettingsFilePath() {
  return getDefaultSettingsPath();
}

// Убираем константу, используем функцию напрямую

/**
 * Убеждается, что файл настроек существует
 */
async function ensureSettingsFile() {
  const settingsPath = getSettingsFilePath();
  
  try {
    await fs.access(settingsPath);
    // Файл существует, всё хорошо
    return;
  } catch {
    // Файл не существует
    const isPackaged = app && app.isPackaged;
    
    if (isPackaged) {
      // В production сначала пытаемся скопировать настройки из extraResources
      try {
        const defaultSettingsPath = getDefaultSettingsFilePath();
        await fs.access(defaultSettingsPath);
        
        // Копируем настройки по умолчанию из extraResources в userData
        const defaultData = await fs.readFile(defaultSettingsPath, 'utf-8');
        // Убеждаемся, что директория userData существует
        const userDataDir = app.getPath('userData');
        await fs.mkdir(userDataDir, { recursive: true });
        // Сохраняем копию в userData
        await fs.writeFile(settingsPath, defaultData, 'utf-8');
        console.log('[SettingsManager] Скопированы настройки по умолчанию из extraResources в userData');
        return;
      } catch (copyError) {
        console.log('[SettingsManager] Не удалось скопировать настройки из extraResources, создаем новые:', copyError.message);
        // Если не удалось скопировать, создаем с дефолтными настройками
      }
    }
    
    // Создаем файл с дефолтными настройками
    const defaultSettings = getDefaultSettings();
    // Убеждаемся, что директория существует
    const settingsDir = path.dirname(settingsPath);
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  }
}

/**
 * Возвращает настройки по умолчанию
 */
function getDefaultSettings() {
  return {
    vmix: {
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: [],
      inputs: {},
    },
    mobile: {
      enabled: false,
      port: 3000,
      sessionId: null,
      selectedIP: null, // Выбранный IP адрес сетевого интерфейса
    },
    autoSave: {
      enabled: true, // По умолчанию автосохранение включено
    },
    autoUpdate: {
      enabled: true, // По умолчанию автоматические обновления включены
    },
    ui: {
      theme: 'light', // 'light' | 'dark' | 'system'
    },
  };
}

/**
 * Загружает настройки из файла
 */
async function loadSettings() {
  try {
    await ensureSettingsFile();
    const settingsPath = getSettingsFilePath();
    const data = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(data);
    
    // Оставляем только динамические инпуты (с displayName и vmixTitle)
    if (settings.vmix && settings.vmix.inputs && typeof settings.vmix.inputs === 'object') {
      const inputs = settings.vmix.inputs;
      const filteredInputs: Record<string, unknown> = {};
      for (const [key, input] of Object.entries(inputs)) {
        const inp = input as Record<string, unknown>;
        if (inp && typeof inp === 'object' && 
            typeof inp.displayName === 'string' && inp.displayName.trim() !== '' &&
            typeof inp.vmixTitle === 'string' && inp.vmixTitle.trim() !== '') {
          filteredInputs[key] = input;
        }
      }
      const inputOrder = Array.isArray(settings.vmix.inputOrder) 
        ? settings.vmix.inputOrder.filter((id: string) => id in filteredInputs) 
        : [];
      if (Object.keys(filteredInputs).length !== Object.keys(inputs).length || 
          JSON.stringify(inputOrder) !== JSON.stringify(settings.vmix.inputOrder || [])) {
        const cleanedSettings = {
          ...settings,
          vmix: {
            ...settings.vmix,
            inputs: filteredInputs,
            inputOrder,
          },
        };
        await saveSettings(cleanedSettings);
        return cleanedSettings;
      }
    }

    return settings;
  } catch (error) {
    console.error('Ошибка при загрузке настроек:', error);
    // Возвращаем настройки по умолчанию
    return getDefaultSettings();
  }
}

/**
 * Сохраняет настройки в файл
 */
async function saveSettings(settings) {
  try {
    await ensureSettingsFile();
    const settingsPath = getSettingsFilePath();
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error);
    throw error;
  }
}

/**
 * Получает настройки vMix
 */
async function getVMixSettings() {
  const settings = await loadSettings();
  const vmix = settings.vmix || getDefaultSettings().vmix;
  if (vmix.connectionState === undefined) {
    vmix.connectionState = 'disconnected';
  }
  if (vmix.inputOrder === undefined) {
    vmix.inputOrder = [];
  }
  if (vmix.inputs === undefined) {
    vmix.inputs = {};
  }
  return vmix;
}

/**
 * Сохраняет настройки vMix
 */
async function setVMixSettings(vmixConfig) {
  const settings = await loadSettings();
  settings.vmix = vmixConfig;
  await saveSettings(settings);
}

/**
 * Получает конкретную настройку
 */
async function getSetting(path) {
  const settings = await loadSettings();
  const keys = path.split('.');
  let value = settings;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

/**
 * Устанавливает конкретную настройку
 */
async function setSetting(path, value) {
  const settings = await loadSettings();
  const keys = path.split('.');
  let current = settings;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  await saveSettings(settings);
}

/**
 * Получает настройки мобильного сервера
 */
async function getMobileSettings() {
  const settings = await loadSettings();
  if (!settings.mobile) {
    // Если секции mobile нет, создаем её с дефолтными значениями и сохраняем
    const defaultMobile = getDefaultSettings().mobile;
    settings.mobile = defaultMobile;
    await saveSettings(settings);
  }
  return settings.mobile;
}

/**
 * Сохраняет настройки мобильного сервера
 */
async function setMobileSettings(mobileConfig) {
  const settings = await loadSettings();
  // Объединяем с дефолтными настройками, чтобы не потерять структуру
  const defaultMobile = getDefaultSettings().mobile;
  settings.mobile = {
    ...defaultMobile,
    ...mobileConfig,
  };
  await saveSettings(settings);
}

/**
 * Получает настройки автосохранения
 */
async function getAutoSaveSettings() {
  const settings = await loadSettings();
  if (!settings.autoSave) {
    // Если секции autoSave нет, создаем её с дефолтными значениями и сохраняем
    const defaultAutoSave = getDefaultSettings().autoSave;
    settings.autoSave = defaultAutoSave;
    await saveSettings(settings);
  }
  return settings.autoSave;
}

/**
 * Сохраняет настройки автосохранения
 */
async function setAutoSaveSettings(autoSaveConfig) {
  const settings = await loadSettings();
  // Объединяем с дефолтными настройками, чтобы не потерять структуру
  const defaultAutoSave = getDefaultSettings().autoSave;
  settings.autoSave = {
    ...defaultAutoSave,
    ...autoSaveConfig,
  };
  await saveSettings(settings);
}

/**
 * Получает настройки автоматических обновлений
 */
async function getAutoUpdateSettings() {
  const settings = await loadSettings();
  if (!settings.autoUpdate) {
    // Если секции autoUpdate нет, создаем её с дефолтными значениями и сохраняем
    const defaultAutoUpdate = getDefaultSettings().autoUpdate;
    settings.autoUpdate = defaultAutoUpdate;
    await saveSettings(settings);
  }
  return settings.autoUpdate;
}

/**
 * Сохраняет настройки автоматических обновлений
 */
async function setAutoUpdateSettings(autoUpdateConfig) {
  const settings = await loadSettings();
  // Объединяем с дефолтными настройками, чтобы не потерять структуру
  const defaultAutoUpdate = getDefaultSettings().autoUpdate;
  settings.autoUpdate = {
    ...defaultAutoUpdate,
    ...autoUpdateConfig,
  };
  await saveSettings(settings);
}

/**
 * Получает настройки UI (тема и др.)
 */
async function getUISettings() {
  const settings = await loadSettings();
  if (!settings.ui) {
    const defaultUI = getDefaultSettings().ui;
    settings.ui = defaultUI;
    await saveSettings(settings);
  }
  return settings.ui;
}

/**
 * Сохраняет настройки UI
 */
async function setUISettings(uiConfig) {
  const settings = await loadSettings();
  const defaultUI = getDefaultSettings().ui;
  settings.ui = {
    ...defaultUI,
    ...uiConfig,
  };
  await saveSettings(settings);
}

/**
 * Экспортирует настройки в указанный файл
 * @param filePath - путь к файлу для экспорта
 * @throws {Error} если настройки невалидны или произошла ошибка записи
 */
async function exportSettingsToFile(filePath: string): Promise<void> {
  const { exportSettings } = await import('./settingsImportExport.ts');
  return exportSettings(filePath);
}

/**
 * Импортирует настройки из указанного файла
 * @param filePath - путь к файлу для импорта
 * @returns {Promise<ImportResult>} результат импорта
 * @throws {Error} если файл не найден, JSON некорректен или настройки невалидны
 */
async function importSettingsFromFile(filePath: string): Promise<any> {
  const { importSettings } = await import('./settingsImportExport.ts');
  return importSettings(filePath);
}

export {
  loadSettings,
  saveSettings,
  getVMixSettings,
  setVMixSettings,
  getMobileSettings,
  setMobileSettings,
  getAutoSaveSettings,
  setAutoSaveSettings,
  getAutoUpdateSettings,
  setAutoUpdateSettings,
  getUISettings,
  setUISettings,
  getSetting,
  setSetting,
  getSettingsFilePath,
  exportSettingsToFile,
  importSettingsFromFile,
};

