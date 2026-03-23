import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { getLogosDir, getExtraResourcesLogosDir } from './utils/pathUtils.ts';

// Убираем константу, будем использовать функцию напрямую

/**
 * Убеждается, что папка logos существует
 * Также мигрирует логотипы из extraResources в userData при первом запуске в production
 */
async function ensureLogosDir() {
  const logosDir = getLogosDir();
  try {
    await fs.access(logosDir);
  } catch {
    await fs.mkdir(logosDir, { recursive: true });
  }
  
  // В production режиме мигрируем логотипы из extraResources в userData при первом запуске
  const isPackaged = app && app.isPackaged;
  if (isPackaged) {
    await migrateLogosFromExtraResources();
  }
}

/**
 * Мигрирует логотипы из extraResources (read-only) в userData (writable)
 * Выполняется только один раз при первом запуске в production
 */
async function migrateLogosFromExtraResources() {
  try {
    const sourceDir = getExtraResourcesLogosDir();
    if (!sourceDir) {
      return; // extraResources не доступна (dev режим или ошибка)
    }
    
    const targetDir = getLogosDir();
    
    // Проверяем, нужно ли выполнять миграцию
    // Если в targetDir уже есть файлы, миграция не нужна
    try {
      const targetFiles = await fs.readdir(targetDir);
      if (targetFiles.some(file => file === 'logo_a.png' || file === 'logo_b.png')) {
        // Логотипы уже мигрированы или созданы пользователем
        return;
      }
    } catch {
      // Папка пуста или не существует, продолжаем миграцию
    }
    
    // Проверяем наличие файлов в extraResources
    try {
      await fs.access(sourceDir);
      const sourceFiles = await fs.readdir(sourceDir);
      const logoFiles = sourceFiles.filter(file => file === 'logo_a.png' || file === 'logo_b.png');
      
      if (logoFiles.length > 0) {
        // Копируем логотипы из extraResources в userData
        console.log('[logoManager] Миграция логотипов из extraResources в userData...');
        for (const file of logoFiles) {
          const sourcePath = path.join(sourceDir, file);
          const targetPath = path.join(targetDir, file);
          try {
            await fs.copyFile(sourcePath, targetPath);
            console.log(`[logoManager] Логотип ${file} скопирован в userData`);
          } catch (error) {
            console.warn(`[logoManager] Не удалось скопировать ${file}:`, error.message);
          }
        }
      }
    } catch {
      // extraResources не доступна или пуста - это нормально, пропускаем миграцию
      console.log('[logoManager] extraResources logos не найдены, пропускаем миграцию');
    }
  } catch (error) {
    console.warn('[logoManager] Ошибка при миграции логотипов:', error.message);
    // Не прерываем выполнение, миграция не критична
  }
}

/**
 * Конвертирует base64 в Buffer (убирает data URL префикс)
 */
function base64ToBuffer(base64String) {
  // Убираем префикс data:image/png;base64, если есть
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Сохраняет логотип из base64 в файл PNG
 * Использует уникальные имена с timestamp для обхода кэширования vMix
 * Формат: logo_a_<timestamp>.png или logo_b_<timestamp>.png
 * @param {string} base64String - base64 строка изображения
 * @param {string} team - 'A' или 'B'
 * @returns {Promise<string>} - путь к сохраненному файлу относительно logos/
 */
async function saveLogoToFile(base64String, team) {
  await ensureLogosDir();
  
  // Генерируем уникальное имя с timestamp для обхода кэширования vMix
  const timestamp = Date.now();
  const prefix = team === 'A' ? 'logo_a' : 'logo_b';
  const fileName = `${prefix}_${timestamp}.png`;
  const filePath = path.join(getLogosDir(), fileName);
  
  // Конвертируем base64 в Buffer и сохраняем
  const buffer = base64ToBuffer(base64String);
  await fs.writeFile(filePath, buffer);
  
  // ВАЖНО: Проверяем, что файл действительно создан перед возвратом
  // Это гарантирует, что файл будет доступен при отправке в vMix
  await fs.access(filePath);
  
  // Возвращаем относительный путь для сохранения в JSON
  return `logos/${fileName}`;
}

/**
 * Загружает логотип из файла и конвертирует в base64
 * @param {string} logoPath - путь к файлу (относительный или абсолютный)
 * @returns {Promise<string|null>} - base64 строка или null если файл не найден
 */
async function loadLogoFromFile(logoPath) {
  try {
    let filePath;
    
    // Если путь относительный (начинается с logos/)
    if (logoPath.startsWith('logos/')) {
      // Используем правильный путь к logos в зависимости от режима
      const logosDir = getLogosDir();
      const fileName = logoPath.replace('logos/', '');
      filePath = path.join(logosDir, fileName);
    } else {
      // Если абсолютный путь
      filePath = logoPath;
    }
    
    // Проверяем существование файла
    await fs.access(filePath);
    
    // Читаем файл и конвертируем в base64
    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString('base64');
    
    // Возвращаем data URL для совместимости
    return `data:image/png;base64,${base64}`;
  } catch {
    // Файл не найден или ошибка чтения
    return null;
  }
}

/**
 * Обрабатывает логотипы команды при сохранении матча
 * Сохраняет base64 в файл и возвращает обновленный объект команды
 * @param {Object} team - объект команды с logo (base64) или logoBase64
 * @param {string} teamLetter - 'A' или 'B'
 * @returns {Promise<Object>} - обновленный объект команды с logoPath и logoBase64
 */
async function processTeamLogoForSave(team, teamLetter) {
  // Определяем источник логотипа: приоритет logo, затем logoBase64
  let logoBase64 = null;
  
  if (team.logo) {
    logoBase64 = team.logo;
  } else if (team.logoBase64) {
    logoBase64 = team.logoBase64;
  }
  
  // Если нет логотипа, удаляем файл и возвращаем команду без логотипов
  if (!logoBase64) {
    // Удаляем файл логотипа, если он существует
    try {
      const logosDir = getLogosDir();
      const fileName = teamLetter === 'A' ? 'logo_a.png' : 'logo_b.png';
      const logoPath = path.join(logosDir, fileName);
      
      try {
        await fs.unlink(logoPath);
        console.log(`[logoManager] Удален ${fileName} при сохранении проекта без логотипа`);
      } catch (error) {
        // Игнорируем ошибку, если файл не существует
        if (error.code !== 'ENOENT') {
          console.warn(`Не удалось удалить ${fileName}:`, error.message);
        }
      }
    } catch (error) {
      console.warn('Ошибка при удалении файла логотипа:', error.message);
    }
    
    return {
      ...team,
      logoPath: undefined, // Не устанавливаем путь, если логотипа нет
      logo: undefined,
      logoBase64: undefined,
    };
  }
  
  // Проверяем, является ли logo base64 строкой
  const isBase64 = typeof logoBase64 === 'string' && 
                   (logoBase64.startsWith('data:image/') || logoBase64.length > 100);
  
  if (isBase64) {
    try {
      // Сохраняем в файл с уникальным именем (с timestamp)
      // ВАЖНО: Очистка папки должна вызываться ОДИН РАЗ перед сохранением обоих логотипов
      // в местах, где сохраняются оба логотипа (fileManager.js, main.js)
      const logoPath = await saveLogoToFile(logoBase64, teamLetter);
      
      // Возвращаем объект с путем и base64
      return {
        ...team,
        logoPath, // Путь к файлу для HTTP доступа (с уникальным именем)
        logoBase64: logoBase64, // Base64 для портативности
        logo: undefined, // Убираем из основного поля для экономии места в JSON
      };
    } catch (error) {
      console.error(`Ошибка при сохранении логотипа команды ${teamLetter}:`, error);
      // В случае ошибки сохраняем только base64
      return {
        ...team,
        logoBase64: logoBase64,
        logoPath: undefined, // Не устанавливаем путь при ошибке
        logo: undefined,
      };
    }
  }
  
  // Если logo уже является путем к файлу, обновляем logoPath на фиксированное имя
  return {
    ...team,
    logoPath: `logos/logo_${teamLetter.toLowerCase()}.png`,
    logo: undefined,
  };
}

/**
 * Обрабатывает логотипы команды при загрузке матча
 * Пытается загрузить файл, если не получается - использует base64
 * ВАЖНО: Если есть base64, перезаписывает файл для синхронизации
 * @param {Object} team - объект команды с logoPath и/или logoBase64
 * @param {string} teamLetter - 'A' или 'B' (для определения фиксированного имени)
 * @returns {Promise<Object>} - обновленный объект команды с logo (base64 для отображения)
 */
async function processTeamLogoForLoad(team, teamLetter) {
  let logoBase64 = null;
  
  // Приоритет 1: используем base64 из JSON (самый надежный источник)
  if (team.logoBase64) {
    logoBase64 = team.logoBase64;
    // Сохраняем файл для синхронизации с данными матча
    // ВАЖНО: Очистка папки уже выполнена в fileManager.openMatch перед вызовом processTeamLogoForLoad
    try {
      const logoPath = await saveLogoToFile(logoBase64, teamLetter);
      return {
        ...team,
        logo: logoBase64, // Для отображения в UI
        logoPath: logoPath, // Обновляем logoPath на новый файл с уникальным именем
        logoBase64: logoBase64, // Сохраняем base64
      };
    } catch (error) {
      console.error(`Ошибка при сохранении логотипа команды ${teamLetter} при загрузке:`, error);
      return {
        ...team,
        logo: logoBase64,
      };
    }
  }
  
  // Приоритет 2: если logo уже есть (старый формат без logoBase64)
  if (team.logo) {
    logoBase64 = team.logo;
    // Проверяем, является ли это base64
    const isBase64 = typeof team.logo === 'string' && 
                     (team.logo.startsWith('data:image/') || team.logo.length > 100);
    if (isBase64) {
      // Сохраняем файл для синхронизации
      // ВАЖНО: Очистка папки уже выполнена в fileManager.openMatch перед вызовом processTeamLogoForLoad
      try {
        const logoPath = await saveLogoToFile(logoBase64, teamLetter);
        return {
          ...team,
          logo: logoBase64,
          logoPath: logoPath, // Обновляем logoPath на новый файл с уникальным именем
          logoBase64: logoBase64, // Сохраняем base64
        };
      } catch (error) {
        console.error(`Ошибка при сохранении логотипа команды ${teamLetter} при загрузке:`, error);
        return team;
      }
    }
    return team;
  }
  
  // Приоритет 3: пытаемся загрузить из файла ТОЛЬКО если есть logoPath в JSON
  // Это важно: если в JSON нет logoPath, значит логотип не был сохранен в этом матче
  // и не нужно пытаться загружать его из файла (который может быть от другого матча)
  if (team.logoPath) {
    logoBase64 = await loadLogoFromFile(team.logoPath, teamLetter);
    if (logoBase64) {
      return {
        ...team,
        logo: logoBase64, // Для отображения в UI
      };
    }
  }
  
  // Если в JSON нет логотипа (ни logoBase64, ни logo, ни logoPath), 
  // возвращаем команду без логотипа (не пытаемся загружать из файла)
  // Это гарантирует, что при открытии пустого проекта логотипы не будут загружены
  // из файлов предыдущего проекта
  return {
    ...team,
    logo: undefined,
    logoBase64: undefined,
    logoPath: undefined,
  };
}

/**
 * Получает HTTP URL для логотипа
 * @param {string} logoPath - путь к файлу (относительный)
 * @param {number} port - порт HTTP сервера
 * @returns {string|null} - HTTP URL или null
 */
function getLogoHttpUrl(logoPath, port) {
  if (!logoPath) return null;
  
  // Убираем префикс logos/ если есть
  const cleanPath = logoPath.replace(/^logos\//, '');
  return `http://localhost:${port}/${cleanPath}`;
}

/**
 * Очищает папку logos от всех файлов логотипов (logo_*.png)
 * Удаляет все старые логотипы перед сохранением новых для обхода кэширования vMix
 * @returns {Promise<void>}
 */
async function cleanupLogosDirectory() {
  try {
    await ensureLogosDir();
    
    const logosDir = getLogosDir();
    const files = await fs.readdir(logosDir);
    
    // Удаляем все файлы, начинающиеся с logo_ и заканчивающиеся на .png
    const deletePromises = files
      .filter(file => file.startsWith('logo_') && file.endsWith('.png'))
      .map(async (file) => {
        try {
          const filePath = path.join(logosDir, file);
          const stats = await fs.stat(filePath);
          
          // Удаляем только файлы, не директории
          if (stats.isFile()) {
            await fs.unlink(filePath);
            console.log(`[logoManager] Удален файл логотипа: ${file}`);
          }
        } catch (error) {
          // Игнорируем ошибки удаления отдельных файлов
          console.warn(`[logoManager] Не удалось удалить файл ${file}:`, error.message);
        }
      });
    
    await Promise.all(deletePromises);
  } catch (error) {
    // Не прерываем выполнение при ошибке очистки
    // Игнорируем ошибки, если папка не существует или пуста
    if (error.code !== 'ENOENT') {
      console.warn('[logoManager] Ошибка при очистке папки logos:', error.message);
    }
  }
}

export {
  saveLogoToFile,
  loadLogoFromFile,
  processTeamLogoForSave,
  processTeamLogoForLoad,
  getLogoHttpUrl,
  cleanupLogosDirectory,
  getLogosDir,
  ensureLogosDir,
  migrateLogosFromExtraResources,
};

