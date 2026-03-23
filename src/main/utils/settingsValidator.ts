/**
 * Валидатор настроек приложения
 * Проверяет структуру и типы данных в settings.json
 */

/**
 * Результат валидации
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Типы полей для динамических инпутов vMix */
export const DYNAMIC_FIELD_TYPES = ['text', 'color', 'image'] as const;

export type DynamicFieldType = typeof DYNAMIC_FIELD_TYPES[number];

/**
 * Структура поля динамического инпута vMix
 */
export interface DynamicInputField {
  vmixFieldType: DynamicFieldType;
  dataMapKey?: string;
  customValue?: string;
}

/**
 * Структура динамического инпута vMix
 */
export interface VMixInput {
  enabled: boolean;
  displayName: string;
  vmixTitle: string;
  overlay: number;
  fields: Record<string, DynamicInputField>;
}

/**
 * Структура настроек vMix
 */
export interface VMixSettings {
  host: string;
  port: number;
  inputs: Record<string, VMixInput>;
}

/**
 * Структура настроек мобильного сервера
 */
export interface MobileSettings {
  enabled: boolean;
  port: number;
  sessionId: string | null;
  selectedIP: string | null;
}

/**
 * Структура настроек автосохранения
 */
export interface AutoSaveSettings {
  enabled: boolean;
}

/**
 * Структура настроек автоматических обновлений
 */
export interface AutoUpdateSettings {
  enabled: boolean;
}

/**
 * Структура настроек UI (тема и др.)
 */
export interface UISettings {
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Полная структура настроек приложения
 */
export interface Settings {
  vmix?: VMixSettings;
  mobile?: MobileSettings;
  autoSave?: AutoSaveSettings;
  autoUpdate?: AutoUpdateSettings;
  ui?: UISettings;
}

/**
 * Валидирует полную структуру настроек
 */
export function validateSettings(settings: any): ValidationResult {
  const errors: string[] = [];

  if (!settings || typeof settings !== 'object') {
    return {
      valid: false,
      errors: ['Настройки должны быть объектом'],
    };
  }

  // Валидируем каждую секцию, если она присутствует
  if (settings.vmix !== undefined) {
    const vmixResult = validateVMixSettings(settings.vmix);
    if (!vmixResult.valid) {
      errors.push(...vmixResult.errors.map(e => `vmix: ${e}`));
    }
  }

  if (settings.mobile !== undefined) {
    const mobileResult = validateMobileSettings(settings.mobile);
    if (!mobileResult.valid) {
      errors.push(...mobileResult.errors.map(e => `mobile: ${e}`));
    }
  }

  if (settings.autoSave !== undefined) {
    const autoSaveResult = validateAutoSaveSettings(settings.autoSave);
    if (!autoSaveResult.valid) {
      errors.push(...autoSaveResult.errors.map(e => `autoSave: ${e}`));
    }
  }

  if (settings.autoUpdate !== undefined) {
    const autoUpdateResult = validateAutoUpdateSettings(settings.autoUpdate);
    if (!autoUpdateResult.valid) {
      errors.push(...autoUpdateResult.errors.map(e => `autoUpdate: ${e}`));
    }
  }

  if (settings.ui !== undefined) {
    const uiResult = validateUISettings(settings.ui);
    if (!uiResult.valid) {
      errors.push(...uiResult.errors.map(e => `ui: ${e}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует настройки UI
 */
export function validateUISettings(ui: any): ValidationResult {
  const errors: string[] = [];

  if (!ui || typeof ui !== 'object') {
    return {
      valid: false,
      errors: ['ui должен быть объектом'],
    };
  }

  if (ui.theme !== undefined) {
    if (ui.theme !== 'light' && ui.theme !== 'dark' && ui.theme !== 'system') {
      errors.push('theme должен быть "light", "dark" или "system"');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует настройки vMix
 */
export function validateVMixSettings(vmix: any): ValidationResult {
  const errors: string[] = [];

  if (!vmix || typeof vmix !== 'object') {
    return {
      valid: false,
      errors: ['vmix должен быть объектом'],
    };
  }

  // Проверяем host
  if (typeof vmix.host !== 'string' || vmix.host.trim() === '') {
    errors.push('host должен быть непустой строкой');
  }

  // Проверяем port
  if (typeof vmix.port !== 'number' || vmix.port < 1 || vmix.port > 65535) {
    errors.push('port должен быть числом от 1 до 65535');
  }

  // Проверяем connectionState (опционально)
  if (vmix.connectionState !== undefined) {
    if (vmix.connectionState !== 'connected' && vmix.connectionState !== 'disconnected') {
      errors.push('connectionState должен быть "connected" или "disconnected"');
    }
  }

  // Проверяем inputOrder (опционально): массив строк
  if (vmix.inputOrder !== undefined) {
    if (!Array.isArray(vmix.inputOrder) || vmix.inputOrder.some((id) => typeof id !== 'string')) {
      errors.push('inputOrder должен быть массивом строк');
    }
  }

  // Проверяем inputs
  if (vmix.inputs !== undefined) {
    if (typeof vmix.inputs !== 'object' || Array.isArray(vmix.inputs)) {
      errors.push('inputs должен быть объектом');
    } else {
      // Валидируем каждый инпут
      for (const [inputKey, inputValue] of Object.entries(vmix.inputs)) {
        const inputResult = validateVMixInput(inputKey, inputValue);
        if (!inputResult.valid) {
          errors.push(`inputs.${inputKey}: ${inputResult.errors.join(', ')}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует отдельный инпут vMix (только динамический формат)
 */
export function validateVMixInput(inputKey: string, input: any): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Инпут должен быть объектом'],
    };
  }

  // Проверяем enabled
  if (typeof input.enabled !== 'boolean') {
    errors.push('enabled должен быть boolean');
  }

  // Проверяем overlay
  if (typeof input.overlay !== 'number' || input.overlay < 1) {
    errors.push('overlay должен быть числом >= 1');
  }

  // displayName и vmixTitle обязательны
  if (typeof input.displayName !== 'string' || input.displayName.trim() === '') {
    errors.push('displayName должен быть непустой строкой');
  }
  if (typeof input.vmixTitle !== 'string' || input.vmixTitle.trim() === '') {
    errors.push('vmixTitle должен быть непустой строкой');
  }

  // Проверяем fields
  if (input.fields !== undefined) {
    if (typeof input.fields !== 'object' || Array.isArray(input.fields)) {
      errors.push('fields должен быть объектом');
    } else {
      for (const [fieldKey, fieldValue] of Object.entries(input.fields)) {
        const fieldResult = validateInputField(fieldKey, fieldValue);
        if (!fieldResult.valid) {
          errors.push(`fields.${fieldKey}: ${fieldResult.errors.join(', ')}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует поле инпута (формат vmixFieldType, dataMapKey, customValue)
 */
function validateInputField(fieldKey: string, field: any): ValidationResult {
  const errors: string[] = [];

  if (!field || typeof field !== 'object') {
    return {
      valid: false,
      errors: ['Поле должно быть объектом'],
    };
  }

  // vmixFieldType обязателен
  if (typeof field.vmixFieldType !== 'string') {
    errors.push('vmixFieldType должен быть строкой');
  } else if (!DYNAMIC_FIELD_TYPES.includes(field.vmixFieldType as DynamicFieldType)) {
    errors.push(`vmixFieldType должен быть одним из: ${DYNAMIC_FIELD_TYPES.join(', ')}`);
  }

  // dataMapKey и customValue опциональны, но если есть — должны быть строками
  if (field.dataMapKey !== undefined && typeof field.dataMapKey !== 'string') {
    errors.push('dataMapKey должен быть строкой');
  }
  if (field.customValue !== undefined && typeof field.customValue !== 'string') {
    errors.push('customValue должен быть строкой');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует настройки мобильного сервера
 */
export function validateMobileSettings(mobile: any): ValidationResult {
  const errors: string[] = [];

  if (!mobile || typeof mobile !== 'object') {
    return {
      valid: false,
      errors: ['mobile должен быть объектом'],
    };
  }

  // Проверяем enabled
  if (typeof mobile.enabled !== 'boolean') {
    errors.push('enabled должен быть boolean');
  }

  // Проверяем port (только если enabled)
  if (mobile.enabled) {
    if (typeof mobile.port !== 'number' || mobile.port < 1 || mobile.port > 65535) {
      errors.push('port должен быть числом от 1 до 65535');
    }
  } else {
    // Если disabled, port все равно должен быть валидным числом (может быть неиспользуемым)
    if (mobile.port !== undefined && (typeof mobile.port !== 'number' || mobile.port < 1 || mobile.port > 65535)) {
      errors.push('port должен быть числом от 1 до 65535');
    }
  }

  // Проверяем sessionId (может быть null или string)
  if (mobile.sessionId !== null && mobile.sessionId !== undefined && typeof mobile.sessionId !== 'string') {
    errors.push('sessionId должен быть строкой или null');
  }

  // Проверяем selectedIP (может быть null или string)
  if (mobile.selectedIP !== null && mobile.selectedIP !== undefined && typeof mobile.selectedIP !== 'string') {
    errors.push('selectedIP должен быть строкой или null');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует настройки автосохранения
 */
export function validateAutoSaveSettings(autoSave: any): ValidationResult {
  const errors: string[] = [];

  if (!autoSave || typeof autoSave !== 'object') {
    return {
      valid: false,
      errors: ['autoSave должен быть объектом'],
    };
  }

  // Проверяем enabled
  if (typeof autoSave.enabled !== 'boolean') {
    errors.push('enabled должен быть boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидирует настройки автоматических обновлений
 */
export function validateAutoUpdateSettings(autoUpdate: any): ValidationResult {
  const errors: string[] = [];

  if (!autoUpdate || typeof autoUpdate !== 'object') {
    return {
      valid: false,
      errors: ['autoUpdate должен быть объектом'],
    };
  }

  // Проверяем enabled
  if (typeof autoUpdate.enabled !== 'boolean') {
    errors.push('enabled должен быть boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
