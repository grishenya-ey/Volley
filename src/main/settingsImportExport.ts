/**
 * Модуль импорта и экспорта настроек
 */

import { loadSettings, saveSettings } from './settingsManager.ts';
import { 
  validateSettings, 
  validateVMixSettings,
  validateMobileSettings,
  validateAutoSaveSettings,
  validateAutoUpdateSettings,
  validateUISettings,
  type Settings 
} from './utils/settingsValidator.ts';
import fs from 'fs/promises';
import path from 'path';

/**
 * Результат импорта настроек
 */
export interface ImportResult {
  success: boolean;
  merged: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Экспортирует настройки в указанный файл
 * @param filePath - путь к файлу для экспорта
 * @throws {Error} если настройки невалидны или произошла ошибка записи
 */
export async function exportSettings(filePath: string): Promise<void> {
  // Загружаем текущие настройки
  const settings = await loadSettings();

  // Валидируем настройки перед экспортом
  const validation = validateSettings(settings);
  if (!validation.valid) {
    throw new Error(`Настройки невалидны: ${validation.errors.join(', ')}`);
  }

  // Создаем директорию, если она не существует
  const dir = path.dirname(filePath);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }

  // Сохраняем настройки в файл с форматированием (отступы)
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * Импортирует настройки из указанного файла
 * @param filePath - путь к файлу для импорта
 * @returns {Promise<ImportResult>} результат импорта
 * @throws {Error} если файл не найден, JSON некорректен или настройки невалидны
 */
export async function importSettings(filePath: string): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Читаем файл
  let importedData: any;
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    importedData = JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('Файл не найден');
    }
    if (error instanceof SyntaxError) {
      throw new Error('Некорректный JSON файл');
    }
    throw new Error(`Ошибка при чтении файла: ${error.message}`);
  }

  // Проверяем, что это объект
  if (!importedData || typeof importedData !== 'object' || Array.isArray(importedData)) {
    throw new Error('Импортируемые настройки должны быть объектом');
  }

  // Валидируем импортируемые данные (общая проверка)
  const validation = validateSettings(importedData);

  // Валидируем каждую секцию отдельно для частичного импорта
  const validSections: string[] = [];
  const invalidSections: string[] = [];

  // Вспомогательная функция для валидации секции
  const validateSection = (sectionName: string, sectionData: any, validatorFn: (data: any) => any) => {
    if (sectionData !== undefined) {
      const validation = validatorFn(sectionData);
      if (validation.valid) {
        validSections.push(sectionName);
      } else {
        invalidSections.push(sectionName);
        errors.push(...validation.errors.map(e => `${sectionName}: ${e}`));
      }
    }
  };

  // Проверяем каждую секцию отдельно
  validateSection('vmix', importedData.vmix, validateVMixSettings);
  validateSection('mobile', importedData.mobile, validateMobileSettings);
  validateSection('autoSave', importedData.autoSave, validateAutoSaveSettings);
  validateSection('autoUpdate', importedData.autoUpdate, validateAutoUpdateSettings);
  validateSection('ui', importedData.ui, validateUISettings);

  // Если общая валидация прошла успешно, все секции валидны
  if (validation.valid) {
    // Все секции валидны, можно импортировать все
    for (const key of Object.keys(importedData)) {
      if (['vmix', 'mobile', 'autoSave', 'autoUpdate', 'ui'].includes(key)) {
        validSections.push(key);
      }
    }
  } else {
    // Если общая валидация не прошла, проверяем секции отдельно
    // Если все секции невалидны, выбрасываем ошибку
    if (validSections.length === 0 && Object.keys(importedData).length > 0) {
      throw new Error(`Настройки невалидны: ${validation.errors.join(', ')}`);
    }
  }

  // Если есть невалидные секции, добавляем предупреждения
  if (invalidSections.length > 0) {
    warnings.push(`Следующие секции невалидны и не будут импортированы: ${invalidSections.join(', ')}`);
    // Детальные ошибки уже добавлены в errors выше, дублируем их в warnings для удобства
    warnings.push(...errors.filter(e => invalidSections.some(section => e.startsWith(section + ':'))));
  }

  // Удаляем невалидные секции из импортируемых данных
  for (const section of invalidSections) {
    delete importedData[section];
  }

  // Проверяем наличие неизвестных секций
  const knownSections = ['vmix', 'mobile', 'autoSave', 'autoUpdate', 'ui'];
  for (const key of Object.keys(importedData)) {
    if (!knownSections.includes(key)) {
      warnings.push(`Неизвестная секция "${key}" будет проигнорирована`);
      delete importedData[key];
    }
  }

  // Загружаем существующие настройки
  const existingSettings = await loadSettings();

  // Объединяем настройки (merge стратегия)
  const mergedSettings = mergeSettings(existingSettings, importedData);

  // Сохраняем объединенные настройки
  await saveSettings(mergedSettings);

  return {
    success: true,
    merged: true,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Объединяет существующие настройки с импортированными (merge стратегия)
 * @param existing - существующие настройки
 * @param imported - импортированные настройки
 * @returns {Settings} объединенные настройки
 */
export function mergeSettings(existing: Settings, imported: Settings): Settings {
  const merged = { ...existing };

  // Объединяем каждую секцию отдельно
  if (imported.vmix) {
    merged.vmix = {
      ...existing.vmix,
      ...imported.vmix,
      // Для inputs делаем глубокое объединение
      inputs: mergeInputs(existing.vmix?.inputs || {}, imported.vmix.inputs || {}),
    };
  }

  if (imported.mobile) {
    merged.mobile = {
      ...existing.mobile,
      ...imported.mobile,
    };
  }

  if (imported.autoSave) {
    merged.autoSave = {
      ...existing.autoSave,
      ...imported.autoSave,
    };
  }

  if (imported.autoUpdate) {
    merged.autoUpdate = {
      ...existing.autoUpdate,
      ...imported.autoUpdate,
    };
  }

  if (imported.ui) {
    merged.ui = {
      ...existing.ui,
      ...imported.ui,
    };
  }

  return merged;
}

/**
 * Объединяет инпуты с глубоким слиянием полей (fields)
 * @param existing - существующие инпуты
 * @param imported - импортированные инпуты
 * @returns {Record<string, any>} объединенные инпуты
 */
function mergeInputs(existing: Record<string, any>, imported: Record<string, any>): Record<string, any> {
  const merged = { ...existing };

  for (const [inputKey, importedInput] of Object.entries(imported)) {
    if (merged[inputKey]) {
      // Инпут существует - объединяем с сохранением существующих полей
      merged[inputKey] = {
        ...merged[inputKey],
        ...importedInput,
        // Глубокое объединение полей: сохраняем существующие поля, добавляем/обновляем импортированные
        fields: {
          ...merged[inputKey].fields,
          ...importedInput.fields,
        },
      };
    } else {
      // Новый инпут - добавляем полностью
      merged[inputKey] = { ...importedInput };
    }
  }

  return merged;
}
