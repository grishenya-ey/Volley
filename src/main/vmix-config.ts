import * as settingsManager from './settingsManager.ts';

/**
 * Получает настройки vMix
 */
async function getVMixConfig() {
  return await settingsManager.getVMixSettings();
}

/**
 * Сохраняет настройки vMix
 */
async function setVMixConfig(config) {
  await settingsManager.setVMixSettings(config);
}

/**
 * Получает конкретную настройку vMix
 */
async function getVMixSetting(key) {
  const config = await getVMixConfig();
  const keys = key.split('.');
  let value = config;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  return value;
}

/**
 * Устанавливает конкретную настройку vMix
 */
async function setVMixSetting(key, value) {
  const config = await getVMixConfig();
  const keys = key.split('.');
  let current = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!current[k] || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k];
  }
  
  current[keys[keys.length - 1]] = value;
  await setVMixConfig(config);
}

export {
  getVMixConfig,
  setVMixConfig,
  getVMixSetting,
  setVMixSetting,
};

