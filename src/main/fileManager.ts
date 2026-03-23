import fs from 'fs/promises';
import path from 'path';
import { dialog } from 'electron';
import { validateMatch, createNewMatch } from '../shared/matchUtils';
import errorHandler from '../shared/errorHandler';
import { migrateRosterPositions } from '../shared/playerPositions';
import * as logoManager from './logoManager.ts';
import { getMatchesDir } from './utils/pathUtils.ts';

/**
 * Убеждается, что папка matches существует
 */
async function ensureMatchesDir() {
  const matchesDir = getMatchesDir();
  try {
    await fs.access(matchesDir);
  } catch {
    await fs.mkdir(matchesDir, { recursive: true });
  }
  return matchesDir;
}

/**
 * Создает новый матч
 */
async function createMatch() {
  const match = createNewMatch();
  return match;
}

/**
 * Сохраняет матч в файл
 */
async function saveMatch(match, filePath = null) {
  const matchesDir = await ensureMatchesDir();

  if (!validateMatch(match)) {
    throw new Error('Некорректные данные матча');
  }

  // Обновляем время изменения
  match.updatedAt = new Date().toISOString();

  // Обрабатываем логотипы команд: сохраняем в файлы и добавляем пути
  // ВАЖНО: Если logoPath уже существует и файл существует, не перегенерируем логотипы
  // Это предотвращает потерю ссылок на логотипы после swap-teams
  const matchToSave = { ...match };
  
  // Проверяем, нужно ли перегенерировать логотипы
  // Если logoPath уже существует и файл существует, используем существующие пути
  const logosDir = logoManager.getLogosDir();
  
  let needRegenerateLogos = false;
  
  // Проверяем, существуют ли файлы по текущим logoPath
  if (match.teamA?.logoPath) {
    const logoAPath = path.join(logosDir, match.teamA.logoPath.replace(/^logos\//, ''));
    try {
      await fs.access(logoAPath);
      // Файл существует, не нужно перегенерировать
    } catch {
      // Файл не существует, нужно перегенерировать
      needRegenerateLogos = true;
    }
  } else if (match.teamA?.logoBase64 || match.teamA?.logo) {
    // Есть логотип, но нет logoPath - нужно создать
    needRegenerateLogos = true;
  }
  
  if (!needRegenerateLogos && match.teamB?.logoPath) {
    const logoBPath = path.join(logosDir, match.teamB.logoPath.replace(/^logos\//, ''));
    try {
      await fs.access(logoBPath);
      // Файл существует, не нужно перегенерировать
    } catch {
      // Файл не существует, нужно перегенерировать
      needRegenerateLogos = true;
    }
  } else if (match.teamB?.logoBase64 || match.teamB?.logo) {
    // Есть логотип, но нет logoPath - нужно создать
    needRegenerateLogos = true;
  }
  
  if (needRegenerateLogos) {
    // ВАЖНО: Очищаем папку ОДИН РАЗ перед сохранением обоих логотипов
    await logoManager.cleanupLogosDirectory();
    matchToSave.teamA = await logoManager.processTeamLogoForSave(match.teamA, 'A');
    matchToSave.teamB = await logoManager.processTeamLogoForSave(match.teamB, 'B');
  } else {
    // Используем существующие logoPath без перегенерации
    matchToSave.teamA = {
      ...match.teamA,
      // Сохраняем все поля логотипа как есть
    };
    matchToSave.teamB = {
      ...match.teamB,
      // Сохраняем все поля логотипа как есть
    };
  }

  // Если путь не указан, используем стандартный путь
  if (!filePath) {
    const fileName = `match_${match.matchId}.json`;
    filePath = path.join(matchesDir, fileName);
  }

  // Сохраняем файл
  await fs.writeFile(filePath, JSON.stringify(matchToSave, null, 2), 'utf-8');

  return filePath;
}

/**
 * Открывает диалог выбора файла для открытия матча
 */
async function openMatchDialog() {
  const result = await dialog.showOpenDialog({
    title: 'Открыть матч',
    defaultPath: getMatchesDir(),
    filters: [
      { name: 'JSON файлы', extensions: ['json'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

/**
 * Открывает матч из файла
 */
async function openMatch(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    let match;
    
    try {
      match = JSON.parse(data);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Ошибка чтения JSON файла. Файл поврежден или имеет неверный формат.');
    }

    // Миграция позиций в рострах: старые/неизвестные значения → международный стандарт
    if (match.teamA && Array.isArray(match.teamA.roster)) {
      match.teamA.roster = migrateRosterPositions(match.teamA.roster);
    }
    if (match.teamB && Array.isArray(match.teamB.roster)) {
      match.teamB.roster = migrateRosterPositions(match.teamB.roster);
    }

    // Применяем миграцию, если необходимо
    try {
      const { migrateMatchToSetStatus, needsMigration } = await import('../shared/matchMigration');
      if (needsMigration(match)) {
        match = migrateMatchToSetStatus(match);
        console.log('[fileManager] Применена миграция данных матча к новой структуре');
      }
    } catch (migrationError) {
      console.warn('[fileManager] Не удалось загрузить модуль миграции:', migrationError.message);
      // Продолжаем без миграции, если модуль не загрузился
    }

    if (!validateMatch(match)) {
      console.error('Validation failed for match:', match);
      throw new Error('Файл содержит некорректные данные матча');
    }

    // Проверяем наличие логотипов в исходном JSON ДО обработки
    // Это важно, чтобы определить, нужно ли удалять файлы от предыдущего проекта
    const hasLogoAInFile = !!(match.teamA?.logo || match.teamA?.logoBase64 || match.teamA?.logoPath);
    const hasLogoBInFile = !!(match.teamB?.logo || match.teamB?.logoBase64 || match.teamB?.logoPath);

    // Обрабатываем логотипы команд: загружаем из файлов или используем base64
    // ВАЖНО: Очищаем папку ОДИН РАЗ перед сохранением обоих логотипов при загрузке
    await logoManager.cleanupLogosDirectory();
    
    const matchToLoad = { ...match };
    matchToLoad.teamA = await logoManager.processTeamLogoForLoad(match.teamA, 'A');
    matchToLoad.teamB = await logoManager.processTeamLogoForLoad(match.teamB, 'B');

    // Если в открытом проекте нет логотипов, удаляем файлы от предыдущего проекта
    // Это важно, чтобы при автосохранении старые логотипы не сохранились в новый проект
    
    // Если логотипов нет в исходном JSON, очищаем папку logos
    // Теперь используем cleanupLogosDirectory для удаления всех старых логотипов
    if (!hasLogoAInFile && !hasLogoBInFile) {
      try {
        await logoManager.cleanupLogosDirectory();
        console.log('[fileManager] Папка logos очищена при открытии проекта без логотипов');
      } catch (error) {
        console.warn('Не удалось очистить папку logos:', error.message);
      }
    }

    return matchToLoad;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Файл не найден');
    }
    if (error instanceof SyntaxError || error.message.includes('JSON')) {
      throw new Error('Ошибка чтения JSON файла. Файл поврежден или имеет неверный формат.');
    }
    // Если ошибка уже имеет понятное сообщение, используем его
    if (error.message && error.message !== 'Файл содержит некорректные данные матча') {
      const friendlyError = errorHandler.handleError(error, 'openMatch');
      throw new Error(friendlyError);
    }
    throw error;
  }
}

/**
 * Открывает диалог сохранения матча
 */
async function saveMatchDialog(match) {
  await ensureMatchesDir();

  const defaultFileName = match.matchId 
    ? `match_${match.matchId}.json`
    : `match_${Date.now()}.json`;

  const result = await dialog.showSaveDialog({
    title: 'Сохранить матч',
    defaultPath: path.join(getMatchesDir(), defaultFileName),
    filters: [
      { name: 'JSON файлы', extensions: ['json'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return await saveMatch(match, result.filePath);
}

export {
  createMatch,
  saveMatch,
  openMatch,
  openMatchDialog,
  saveMatchDialog,
  getMatchesDir,
};

