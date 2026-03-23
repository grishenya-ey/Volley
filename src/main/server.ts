import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import errorHandler from '../shared/errorHandler';
import { light as lightTheme, dark as darkTheme } from '../shared/theme/tokens';
import * as settingsManager from './settingsManager.ts';
import * as domUtils from './utils/domUtils.ts';
import path from 'path';
import { setupApiRoutes } from './server/api/MatchApiRoutes.ts';
import { getLogosDir, getPublicDir } from './utils/pathUtils.ts';
import { getRules, RULES_CONFIGS, VARIANTS } from '../shared/volleyballRules';
import { getValueByDataMapKey } from '../shared/getValueByDataMapKey';
import { getPositionAbbreviation } from '../shared/playerPositions';

// Получаем __dirname для ES-модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Создаем require для динамических импортов (например, electron)
const require = createRequire(import.meta.url);

/**
 * HTTP сервер для мобильного доступа
 */
class MobileServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.port = 3000;
    this.sessions = new Map(); // Хранилище активных сессий
    this.currentMatch = null; // Текущий матч
    this.onMatchUpdate = null; // Callback для уведомления об изменениях матча
    this.savedSessionId = null; // Сохраненный sessionId из настроек
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Получает путь к папке logos в зависимости от режима
   * В production - userData (доступно для записи)
   * В dev режиме - корень проекта
   */
  getLogosPath() {
    // Используем единую утилиту для определения путей
    return getLogosDir();
  }

  /**
   * Настройка middleware
   */
  setupMiddleware() {
    // CORS для мобильных устройств
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Парсинг JSON
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Статические файлы (для мобильного интерфейса и overlay)
    // В production public лежит в resources (extraResources), не в asar
    this.app.use(express.static(getPublicDir()));
    
    // Статические файлы для логотипов
    // Определяем путь динамически при инициализации
    const logosPath = this.getLogosPath();
    
    // Убеждаемся, что папка существует
    fs.access(logosPath).catch(() => {
      return fs.mkdir(logosPath, { recursive: true });
    }).catch(err => {
      console.error('[MobileServer] Ошибка при создании папки logos:', err);
    });
    
    // Настраиваем express.static для обслуживания логотипов
    this.app.use('/logos', express.static(logosPath, {
      maxAge: '1d', // Кэширование на 1 день
    }));
  }

  /**
   * Настройка маршрутов
   */
  setupRoutes() {
    // Главная страница мобильной панели
    this.app.get('/panel/:sessionId', async (req, res) => {
      const { sessionId } = req.params;
      
      if (!this.validateSession(sessionId)) {
        return res.status(403).send('Неверная или истекшая сессия');
      }

      let theme = 'light';
      try {
        const ui = await settingsManager.getUISettings();
        if (ui?.theme === 'dark') theme = 'dark';
      } catch (e) {
        // оставляем light по умолчанию
      }
      res.send(this.getMobilePanelHTML(sessionId, theme));
    });

    // API маршруты настроены через MatchApiRoutes
    // Используем новый API Layer для всех операций с матчем
    setupApiRoutes(this.app, this);

    // API оверлеев (read-only, без сессии) — для Browser Source в vMix/OBS
    this.app.get('/api/overlay/match', (_req, res) => {
      const payload = this.getOverlayMatchPayload();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).json(payload);
    });
    
    // API для ТВ-табло (полный матч)
    this.app.get('/api/match', (_req, res) => {
      if (!this.currentMatch) {
        return res.status(404).json({ error: 'Матч не найден' });
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).json(this.currentMatch);
    });

    const overlayDir = path.join(getPublicDir(), 'overlay');
    this.app.get('/overlay/scoreboard', (_req, res) => {
      res.sendFile(path.join(overlayDir, 'scoreboard.html'));
    });
    this.app.get('/overlay/intro', (_req, res) => {
      res.sendFile(path.join(overlayDir, 'intro.html'));
    });
    this.app.get('/overlay/rosters', (_req, res) => {
      res.sendFile(path.join(overlayDir, 'rosters.html'));
    });
    
    // ТВ-табло (для второго экрана/браузера)
    this.app.get('/tv', (_req, res) => {
      // Отдаём HTML страницу ТВ-табло
      res.sendFile(path.join(getPublicDir(), 'tv.html'));
    });

    // API: Проверка доступности логотипов (для отладки)
    this.app.get('/api/logos/check', async (req, res) => {
      // Используем метод getLogosPath для определения пути
      const logosPath = this.getLogosPath();
      
      // Получаем выбранный IP из настроек
      let selectedIP = null;
      try {
        const mobileSettings = await settingsManager.getMobileSettings();
        selectedIP = mobileSettings.selectedIP || null;
      } catch (error) {
        console.error('Ошибка при получении настроек для /api/logos/check:', error);
      }
      
      const serverIP = this.getLocalIP(selectedIP);
      
      // Проверяем наличие логотипов с уникальными именами (logo_*_*.png)
      fs.readdir(logosPath)
        .then((files) => {
          // Ищем файлы, начинающиеся с logo_a_ и logo_b_
          const logoAFiles = files.filter(f => f.startsWith('logo_a_') && f.endsWith('.png'));
          const logoBFiles = files.filter(f => f.startsWith('logo_b_') && f.endsWith('.png'));
          
          const logoA = logoAFiles.length > 0;
          const logoB = logoBFiles.length > 0;
          
          // Используем последний файл (самый новый) для URL
          const logoAUrl = logoA 
            ? `http://${serverIP}:${this.port}/logos/${logoAFiles[logoAFiles.length - 1]}`
            : `http://${serverIP}:${this.port}/logos/logo_a.png`; // Fallback для обратной совместимости
          const logoBUrl = logoB 
            ? `http://${serverIP}:${this.port}/logos/${logoBFiles[logoBFiles.length - 1]}`
            : `http://${serverIP}:${this.port}/logos/logo_b.png`; // Fallback для обратной совместимости
          
          res.json({
            logosPath,
            logoA: { exists: logoA, url: logoAUrl },
            logoB: { exists: logoB, url: logoBUrl },
            serverIP: serverIP,
            serverPort: this.port,
          });
        })
        .catch((_error) => {
          // Если папка не существует или ошибка чтения, возвращаем false
          res.json({
            logosPath,
            logoA: { exists: false, url: `http://${serverIP}:${this.port}/logos/logo_a.png` },
            logoB: { exists: false, url: `http://${serverIP}:${this.port}/logos/logo_b.png` },
            serverIP: serverIP,
            serverPort: this.port,
          });
        });
    });

    // API маршруты для операций с матчем теперь обрабатываются через MatchApiRoutes
    // (настроены выше через setupApiRoutes)
  }

  /**
   * Формирует «лёгкий» объект матча для overlay-страниц (GET /api/overlay/match).
   * Включает setballTeam и matchballTeam, вычисленные по правилам; URL логотипов — относительные.
   * @returns {Object|null} payload или null, если матча нет
   */
  getOverlayMatchPayload() {
    const m = this.currentMatch;
    if (!m || !m.teamA || !m.teamB || !m.currentSet) {
      return null;
    }

    const logosDir = getLogosDir();
    const logoUrl = (team: { logoPath?: string; logoBase64?: string; logo?: string } | null | undefined) => {
      if (!team) return null;
      const p = team.logoPath;
      if (p && typeof p === 'string') {
        const fileName = p.startsWith('logos/') ? p.slice(6) : p;
        const fullPath = path.join(logosDir, fileName);
        if (existsSync(fullPath)) {
          return p.startsWith('logos/') ? '/' + p : '/logos/' + p;
        }
        // Файл по logoPath отсутствует (например, удалён при cleanup или после сохранения матча,
        // а currentMatch не обновлён новыми путями) — не отдаём битую ссылку, переходим к base64
      }
      const base64 = team.logoBase64 || team.logo;
      if (base64 && typeof base64 === 'string') {
        return base64;
      }
      return null;
    };

    const rules = getRules(m);
    const cs = m.currentSet;
    const setball = rules.isSetball(cs.scoreA, cs.scoreB, cs.setNumber);
    const matchball = rules.isMatchball(m.sets || [], cs.setNumber, cs.scoreA, cs.scoreB);

    const rosterFor = (team) => (team.roster || []).map((p) => ({
      number: p.number,
      name: p.name,
      isStarter: !!p.isStarter,
      positionShort: getPositionAbbreviation(p.position || ''),
    }));

    return {
      teamA: {
        name: m.teamA.name || '',
        city: m.teamA.city || '',
        color: m.teamA.color || '#3498db',
        logoUrl: logoUrl(m.teamA),
        coach: m.teamA.coach,
        roster: rosterFor(m.teamA),
      },
      teamB: {
        name: m.teamB.name || '',
        city: m.teamB.city || '',
        color: m.teamB.color || '#e74c3c',
        logoUrl: logoUrl(m.teamB),
        coach: m.teamB.coach,
        roster: rosterFor(m.teamB),
      },
      currentSet: {
        scoreA: cs.scoreA,
        scoreB: cs.scoreB,
        servingTeam: cs.servingTeam || 'A',
        setNumber: cs.setNumber,
      },
      sets: (m.sets || []).map((s) => ({
        setNumber: s.setNumber,
        scoreA: s.scoreA,
        scoreB: s.scoreB,
        status: s.status,
      })),
      setballTeam: setball.isSetball ? setball.team : null,
      matchballTeam: matchball.isMatchball ? matchball.team : null,
      tournament: m.tournament,
      tournamentSubtitle: m.tournamentSubtitle,
      venue: m.venue,
      location: m.location,
      date: m.date,
      time: m.time,
      timezone: m.timezone,
      /** Форматированная дата и время в формате ДД.ММ.ГГГГ ЧЧ:ММ (как в vMix) */
      matchDate: getValueByDataMapKey(m, 'matchDate') || null,
    };
  }

  /**
   * Генерирует HTML для мобильной панели
   * @param {string} sessionId
   * @param {'light'|'dark'} theme - тема из настроек ui.theme
   */
  getMobilePanelHTML(sessionId, theme = 'light') {
    const serverPort = this.port;
    const bodyTheme = theme === 'dark' ? ' data-theme="dark"' : '';
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
    const rootVars = Object.entries(themeObj)
      .map(([k, v]) => {
        const name = '--color-' + k.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
        return `${name}:${v}`;
      })
      .join(';');
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>vMix Volley Scoreboard</title>
  <style>
    :root {
      ${rootVars}
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 0.5rem;
      padding-bottom: env(safe-area-inset-bottom);
    }
    [data-theme="dark"] body {
      background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%);
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      background: rgba(44, 62, 80, 0.95);
      color: white;
      padding: 1rem;
      text-align: center;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .header h1 {
      font-size: 1.3rem;
      font-weight: 600;
    }
    .match-info {
      background: rgba(255, 255, 255, 0.95);
      padding: 0.75rem;
      text-align: center;
      font-size: 0.85rem;
      color: #7f8c8d;
      border-radius: 0 0 12px 12px;
    }
    .score-section {
      background: white;
      padding: 1.5rem 1rem;
      text-align: center;
      border: 3px solid #3498db;
      border-radius: 12px;
      margin: 0.5rem 0;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .teams {
      display: flex;
      justify-content: space-around;
      margin-bottom: 1rem;
      font-size: 1rem;
      font-weight: 600;
      color: #2c3e50;
    }
    .team-name {
      flex: 1;
      padding: 0.5rem;
    }
    .score {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      font-size: 5rem;
      font-weight: bold;
      color: #2c3e50;
      line-height: 1;
      margin: 0.5rem 0;
      position: relative;
    }
    .score-team {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 80px;
    }
    .score-separator {
      font-size: 5rem;
      line-height: 1;
    }
    .indicator-badge {
      position: absolute;
      top: -15px;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      font-size: 0.65rem;
      font-weight: bold;
      color: white;
      white-space: nowrap;
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .indicator-badge.setball {
      background: #f39c12;
    }
    .indicator-badge.matchball {
      background: #e74c3c;
    }
    .score-team:first-child .indicator-badge {
      right: -25px;
    }
    .score-team:last-child .indicator-badge {
      left: -25px;
    }
    .logo-container {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border-radius: 8px;
      padding: 0.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin: 0 0.5rem;
    }
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .set-info {
      font-size: 0.9rem;
      color: #7f8c8d;
      margin-top: 0.5rem;
    }
    .serve-info {
      background: #ecf0f1;
      padding: 0.75rem;
      border-radius: 8px;
      margin-top: 1rem;
      font-size: 0.95rem;
      font-weight: 500;
    }
    .serve-info .serving {
      color: #f39c12;
      font-weight: bold;
    }
    .indicators {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin: 0.5rem 0;
      flex-wrap: wrap;
    }
    .indicator {
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: bold;
      color: white;
    }
    .indicator.setball {
      background: #f39c12;
    }
    .indicator.matchball {
      background: #e74c3c;
    }
    .buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .button {
      padding: 1.25rem;
      font-size: 1.8rem;
      font-weight: bold;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      color: white;
      touch-action: manipulation;
      user-select: none;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .button:active {
      transform: scale(0.95);
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .button-minus {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }
    .button-plus {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    }
    .button-label {
      font-size: 0.7rem;
      font-weight: normal;
      display: block;
      margin-top: 0.25rem;
    }
    .sets {
      background: white;
      padding: 1rem;
      border-radius: 12px;
      margin: 1rem 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .sets h3 {
      font-size: 1rem;
      margin-bottom: 0.75rem;
      color: #2c3e50;
    }
    .set-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      border-bottom: 1px solid #ecf0f1;
      font-size: 0.95rem;
    }
    .set-item:last-child {
      border-bottom: none;
    }
    .set-item.current {
      background: #e8f4f8;
      border-radius: 6px;
      margin: 0.25rem 0;
      font-weight: 600;
    }
    .action-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .action-button {
      padding: 1rem;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      color: white;
      touch-action: manipulation;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    .action-button:active {
      transform: scale(0.95);
    }
    .action-button.finish {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }
    .action-button.undo {
      background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
    }
    .action-button:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
      opacity: 0.6;
    }
    .status {
      text-align: center;
      padding: 0.75rem;
      margin: 1rem 0;
      border-radius: 12px;
      font-weight: 500;
      font-size: 0.9rem;
    }
    .status.connected {
      background: #27ae60;
      color: white;
    }
    .status.disconnected {
      background: #e74c3c;
      color: white;
    }
    .status.syncing {
      background: #f39c12;
      color: white;
    }
    @media (max-width: 480px) {
      .score {
        font-size: 4rem;
      }
      .button {
        padding: 1rem;
        font-size: 1.5rem;
      }
    }
    @media (orientation: landscape) and (max-height: 500px) {
      .score {
        font-size: 3rem;
      }
      .button {
        padding: 0.75rem;
        font-size: 1.3rem;
      }
    }
    /* Тёмная тема мобильной панели (градации серого) */
    [data-theme="dark"] .header {
      background: rgba(26, 26, 26, 0.95);
    }
    [data-theme="dark"] .match-info {
      background: rgba(56, 56, 56, 0.95);
      color: #b0b0b0;
    }
    [data-theme="dark"] .score-section {
      background: #252525;
      border-color: #3498db;
    }
    [data-theme="dark"] .teams,
    [data-theme="dark"] .score {
      color: #e8e8e8;
    }
    [data-theme="dark"] .sets {
      background: #252525;
    }
    [data-theme="dark"] .sets h3 {
      color: #e8e8e8;
    }
    [data-theme="dark"] .set-item {
      border-bottom-color: #404040;
      color: #e8e8e8;
    }
    [data-theme="dark"] .set-item.current {
      background: #383838;
    }
    [data-theme="dark"] .serve-info {
      background: #383838;
      color: #e8e8e8;
    }
    [data-theme="dark"] .logo-container {
      background: #252525;
    }
    [data-theme="dark"] .set-info {
      color: #b0b0b0;
    }
  </style>
</head>
<body${bodyTheme}>
  <div class="container">
    <div class="header">
      <h1>vMix Volley Scoreboard</h1>
    </div>
    
    <div class="match-info" id="matchInfo">
      Загрузка...
    </div>
    
    <div class="score-section">
      <div class="teams">
        <div class="team-name" id="teamA">Команда А</div>
        <div class="team-name" id="teamB">Команда Б</div>
      </div>
      <div class="score">
        <div class="logo-container" id="logoA"></div>
        <div class="score-team">
          <span id="scoreA">0</span>
          <div class="indicator-badge" id="indicatorA" style="display: none;"></div>
        </div>
        <span class="score-separator">:</span>
        <div class="score-team">
          <span id="scoreB">0</span>
          <div class="indicator-badge" id="indicatorB" style="display: none;"></div>
        </div>
        <div class="logo-container" id="logoB"></div>
      </div>
      <div class="set-info" id="setInfo">Партия 1</div>
      <div class="serve-info" style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
        <span>Подача:</span>
        <span class="serving" id="servingTeam" style="color: #f39c12; font-weight: bold;">-</span>
        <div style="display: flex; gap: 0.5rem;">
          <button 
            id="serveLeftBtn" 
            onclick="changeServingTeam('A')"
            style="
              padding: 0.5rem 0.75rem;
              font-size: 1.2rem;
              background-color: #3498db;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              touch-action: manipulation;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            "
          >
            ◄
          </button>
          <button 
            id="serveRightBtn" 
            onclick="changeServingTeam('B')"
            style="
              padding: 0.5rem 0.75rem;
              font-size: 1.2rem;
              background-color: #3498db;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              touch-action: manipulation;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            "
          >
            ►
          </button>
        </div>
      </div>
    </div>

    <div class="buttons">
      <button class="button button-minus" onclick="changeScore('A', -1)">
        -1
        <span class="button-label" id="labelA">Команда А</span>
      </button>
      <button class="button button-minus" onclick="changeScore('B', -1)">
        -1
        <span class="button-label" id="labelB">Команда Б</span>
      </button>
      <button class="button button-plus" onclick="changeScore('A', 1)">
        +1
        <span class="button-label" id="labelA2">Команда А</span>
      </button>
      <button class="button button-plus" onclick="changeScore('B', 1)">
        +1
        <span class="button-label" id="labelB2">Команда Б</span>
      </button>
    </div>

    <div class="sets">
      <h3>Счет по партиям:</h3>
      <div id="setsList"></div>
    </div>

    <div class="action-buttons">
      <button class="action-button finish" id="finishBtn" onclick="finishSet()">
        Завершить партию
      </button>
      <button class="action-button undo" id="undoBtn" onclick="undoAction()" disabled>
        Отменить
      </button>
    </div>

    <div class="status connected" id="status">
      Синхронизировано
    </div>
  </div>

  <script>
    ${domUtils.getSanitizationFunctions()}
    
    const RULES_CONFIG = ${JSON.stringify(RULES_CONFIGS)};
    function createRules(config) {
      const isDecidingSet = (n) => n === config.decidingSetNumber;
      const getSetballThreshold = (n) => isDecidingSet(n) ? config.setballThresholdDeciding : config.setballThresholdRegular;
      const getFinishThreshold = (n) => isDecidingSet(n) ? config.pointsToWinDecidingSet : config.pointsToWinRegularSet;
      return {
        isSetball(scoreA, scoreB, setNumber) {
          const t = getSetballThreshold(setNumber || 1);
          const max = Math.max(scoreA, scoreB), min = Math.min(scoreA, scoreB);
          if (max >= t && max - min >= 1 && scoreA !== scoreB)
            return { isSetball: true, team: scoreA > scoreB ? 'A' : 'B' };
          return { isSetball: false, team: null };
        },
        isMatchball(sets, curSet, scoreA, scoreB) {
          const winsA = sets.filter(s => (s.completed || s.status === 'completed') && s.scoreA > s.scoreB).length;
          const winsB = sets.filter(s => (s.completed || s.status === 'completed') && s.scoreB > s.scoreA).length;
          const need = config.setsToWinMatch - 1;
          if (winsA === need || winsB === need) {
            const sb = this.isSetball(scoreA, scoreB, curSet);
            if (sb.isSetball && ((sb.team === 'A' && winsA === need) || (sb.team === 'B' && winsB === need)))
              return { isMatchball: true, team: sb.team };
          }
          return { isMatchball: false, team: null };
        },
        canFinishSet(scoreA, scoreB, setNumber) {
          const finish = getFinishThreshold(setNumber || 1);
          const tie = finish - 1;
          const max = Math.max(scoreA, scoreB), min = Math.min(scoreA, scoreB);
          return (max >= finish && max - min >= 2) || (max >= tie && min >= tie && max - min >= 2);
        },
        getConfig: () => config
      };
    }
    function getRules(match) {
      const v = match?.variant || '${VARIANTS.INDOOR}';
      const c = RULES_CONFIG[v] || RULES_CONFIG['${VARIANTS.INDOOR}'];
      return createRules(c);
    }
    function isDecidingSet(setNumber, match) {
      return getRules(match).getConfig().decidingSetNumber === setNumber;
    }
    
    const sessionId = '${sessionId}';
    let matchData = null;
    let updateInterval = null;
    let lastUpdateTime = Date.now();
    let actionHistory = [];

    async function loadMatch() {
      try {
        const response = await fetch(\`/api/match/\${sessionId}\`);
        if (response.ok) {
          const data = await response.json();
          if (JSON.stringify(data) !== JSON.stringify(matchData)) {
            matchData = data;
            lastUpdateTime = Date.now();
            updateUI();
            updateStatus('connected', null, false); // Обновление с сервера
          }
        } else if (response.status === 403) {
          updateStatus('disconnected', 'Сессия истекла');
        } else {
          updateStatus('disconnected', 'Ошибка загрузки данных');
        }
      } catch (error) {
        console.error('Ошибка:', error);
        updateStatus('disconnected', 'Ошибка подключения');
      }
    }

    function updateUI() {
      if (!matchData) return;

      // Информация о матче (используем безопасную санитизацию)
      const matchInfo = [];
      if (matchData.tournament) matchInfo.push(sanitizeText(matchData.tournament));
      if (matchData.venue) matchInfo.push(sanitizeText(matchData.venue));
      const matchInfoText = matchInfo.length > 0 ? matchInfo.join(' | ') : 'Матч';
      setTextContentSafe(document.getElementById('matchInfo'), matchInfoText);

      // Команды (используем безопасную санитизацию)
      setTextContentSafe(document.getElementById('teamA'), matchData.teamA.name);
      setTextContentSafe(document.getElementById('teamB'), matchData.teamB.name);
      setTextContentSafe(document.getElementById('labelA'), matchData.teamA.name);
      setTextContentSafe(document.getElementById('labelB'), matchData.teamB.name);
      setTextContentSafe(document.getElementById('labelA2'), matchData.teamA.name);
      setTextContentSafe(document.getElementById('labelB2'), matchData.teamB.name);

      // Счет
      document.getElementById('scoreA').textContent = matchData.currentSet.scoreA;
      document.getElementById('scoreB').textContent = matchData.currentSet.scoreB;
      
      // Логотипы команд
      const logoA = document.getElementById('logoA');
      const logoB = document.getElementById('logoB');
      
      // Для команды A: приоритет logoPath (с уникальным именем), затем base64, затем fallback
      let logoAUrl = null;
      if (matchData.teamA && matchData.teamA.logoPath) {
        // Используем logoPath с уникальным именем
        const fileName = matchData.teamA.logoPath.startsWith('logos/') 
          ? matchData.teamA.logoPath.slice(6) 
          : matchData.teamA.logoPath;
        logoAUrl = \`http://\${window.location.hostname}:${serverPort}/logos/\${fileName}\`;
      } else if (matchData.teamA && matchData.teamA.logoBase64) {
        // Используем base64 из JSON (более надежно)
        logoAUrl = matchData.teamA.logoBase64;
      } else if (matchData.teamA && matchData.teamA.logo) {
        // Старый формат (обратная совместимость)
        logoAUrl = matchData.teamA.logo;
      }
      // Если логотипа нет — logoAUrl остаётся null, контейнер будет скрыт
      
      // Используем безопасный метод для установки логотипа
      setLogoContainer(logoA, logoAUrl, matchData.teamA ? matchData.teamA.name : 'Команда A');
      
      // Для команды B: приоритет logoPath (с уникальным именем), затем base64, затем fallback
      let logoBUrl = null;
      if (matchData.teamB && matchData.teamB.logoPath) {
        // Используем logoPath с уникальным именем
        const fileName = matchData.teamB.logoPath.startsWith('logos/') 
          ? matchData.teamB.logoPath.slice(6) 
          : matchData.teamB.logoPath;
        logoBUrl = \`http://\${window.location.hostname}:${serverPort}/logos/\${fileName}\`;
      } else if (matchData.teamB && matchData.teamB.logoBase64) {
        // Используем base64 из JSON (более надежно)
        logoBUrl = matchData.teamB.logoBase64;
      } else if (matchData.teamB && matchData.teamB.logo) {
        // Старый формат (обратная совместимость)
        logoBUrl = matchData.teamB.logo;
      }
      // Если логотипа нет — logoBUrl остаётся null, контейнер будет скрыт
      
      // Используем безопасный метод для установки логотипа
      setLogoContainer(logoB, logoBUrl, matchData.teamB ? matchData.teamB.name : 'Команда B');
      
      // Партия (используем безопасную санитизацию)
      const setInfoText = \`Партия #\${matchData.currentSet.setNumber}\`;
      setTextContentSafe(document.getElementById('setInfo'), setInfoText);
      
      // Подача (используем безопасную санитизацию)
      const servingTeam = matchData.currentSet.servingTeam === 'A' 
        ? matchData.teamA.name 
        : matchData.teamB.name;
      setTextContentSafe(document.getElementById('servingTeam'), servingTeam);
      
      // Обновляем состояние кнопок управления подачей
      const serveLeftBtn = document.getElementById('serveLeftBtn');
      const serveRightBtn = document.getElementById('serveRightBtn');
      const isLeftDisabled = matchData.currentSet.servingTeam === 'A';
      const isRightDisabled = matchData.currentSet.servingTeam === 'B';
      
      if (serveLeftBtn) {
        serveLeftBtn.disabled = isLeftDisabled;
        serveLeftBtn.style.backgroundColor = isLeftDisabled ? '#bdc3c7' : '#3498db';
        serveLeftBtn.style.opacity = isLeftDisabled ? '0.5' : '1';
        serveLeftBtn.style.cursor = isLeftDisabled ? 'not-allowed' : 'pointer';
      }
      
      if (serveRightBtn) {
        serveRightBtn.disabled = isRightDisabled;
        serveRightBtn.style.backgroundColor = isRightDisabled ? '#bdc3c7' : '#3498db';
        serveRightBtn.style.opacity = isRightDisabled ? '0.5' : '1';
        serveRightBtn.style.cursor = isRightDisabled ? 'not-allowed' : 'pointer';
      }

      // Индикаторы сетбола и матчбола
      updateIndicators();

      // Список партий
      updateSetsList();

      // Кнопка начала/завершения партии (toggle)
      const finishBtn = document.getElementById('finishBtn');
      if (finishBtn) {
        const currentStatus = matchData.currentSet.status || 'pending';
        
        if (currentStatus === 'pending') {
          finishBtn.textContent = 'Начать партию';
          finishBtn.onclick = () => startSet();
          finishBtn.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
          finishBtn.disabled = false;
        } else {
          finishBtn.textContent = 'Завершить партию';
          finishBtn.onclick = () => finishSet();
          
          // Для завершения партии проверяем canFinish
          const rules = getRules(matchData);
          const canFinish = rules.canFinishSet(
            matchData.currentSet.scoreA, 
            matchData.currentSet.scoreB, 
            matchData.currentSet.setNumber
          );
          finishBtn.disabled = !canFinish;
          
          // Устанавливаем цвет и стиль в зависимости от доступности
          if (canFinish) {
            finishBtn.style.background = 'linear-gradient(135deg, #27ae60 0%, #229954 100%)';
            finishBtn.style.opacity = '1';
            finishBtn.style.cursor = 'pointer';
          } else {
            finishBtn.style.background = 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)';
            finishBtn.style.opacity = '0.6';
            finishBtn.style.cursor = 'not-allowed';
          }
        }
      }

      // Блокируем кнопки изменения счета и "Отменить", если партия не начата
      const isSetInProgress = matchData.currentSet.status === 'in_progress';
      
      // Кнопки изменения счета
      const scoreButtons = document.querySelectorAll('.button.button-minus, .button.button-plus');
      scoreButtons.forEach(btn => {
        btn.disabled = !isSetInProgress;
        btn.style.opacity = isSetInProgress ? '1' : '0.6';
        btn.style.cursor = isSetInProgress ? 'pointer' : 'not-allowed';
      });
      
      // Кнопка "Отменить"
      const undoBtn = document.getElementById('undoBtn');
      if (undoBtn) {
        const hasHistory = actionHistory.length > 0;
        undoBtn.disabled = !hasHistory || !isSetInProgress;
        if (!isSetInProgress) {
          undoBtn.style.opacity = '0.6';
          undoBtn.style.cursor = 'not-allowed';
        } else if (!hasHistory) {
          undoBtn.style.opacity = '0.6';
          undoBtn.style.cursor = 'not-allowed';
        } else {
          undoBtn.style.opacity = '1';
          undoBtn.style.cursor = 'pointer';
        }
      }
    }

    function updateIndicators() {
      const indicatorA = document.getElementById('indicatorA');
      const indicatorB = document.getElementById('indicatorB');
      
      const scoreA = matchData.currentSet.scoreA;
      const scoreB = matchData.currentSet.scoreB;
      const setNumber = matchData.currentSet.setNumber;
      
      // Получаем информацию о сетболе/матчболе
      const rules = getRules(matchData);
      const setballInfo = rules.isSetball(scoreA, scoreB, setNumber);
      const matchballInfo = rules.isMatchball(matchData.sets, setNumber, scoreA, scoreB);
      
      // Индикатор для команды A
      if ((matchballInfo.isMatchball && matchballInfo.team === 'A') || 
          (setballInfo.isSetball && setballInfo.team === 'A' && !matchballInfo.isMatchball)) {
        indicatorA.style.display = 'block';
        indicatorA.className = \`indicator-badge \${matchballInfo.isMatchball ? 'matchball' : 'setball'}\`;
        indicatorA.textContent = matchballInfo.isMatchball ? 'МАТЧБОЛ' : 'СЕТБОЛ';
      } else {
        indicatorA.style.display = 'none';
      }
      
      // Индикатор для команды B
      if ((matchballInfo.isMatchball && matchballInfo.team === 'B') || 
          (setballInfo.isSetball && setballInfo.team === 'B' && !matchballInfo.isMatchball)) {
        indicatorB.style.display = 'block';
        indicatorB.className = \`indicator-badge \${matchballInfo.isMatchball ? 'matchball' : 'setball'}\`;
        indicatorB.textContent = matchballInfo.isMatchball ? 'МАТЧБОЛ' : 'СЕТБОЛ';
      } else {
        indicatorB.style.display = 'none';
      }
    }

    function createSetItem(set, setNumber, currentSetNum, currentSet, match) {
      const setItem = document.createElement('div');
      setItem.className = 'set-item';

      // Приоритет: если партия завершена в sets, показываем как завершенную
      // даже если currentSet имеет тот же номер (новая партия еще не начата)
      const isCompleted = set && set.status === 'completed';
      const isCurrent = setNumber === currentSetNum;
      const isInProgress = isCurrent && currentSet.status === 'in_progress' && !isCompleted;

      // Устанавливаем класс для текущей партии (только если она идет)
      if (isInProgress) {
        setItem.classList.add('current');
      }
      
      // Подпись партии: для решающей добавляем «(решающая)»
      const setLabel = match && isDecidingSet(setNumber, match)
        ? \`Партия \${setNumber} (решающая)\`
        : \`Партия \${setNumber}\`;
      
      // Создаем содержимое элемента
      const setNumberEl = document.createElement('div');
      setTextContentSafe(setNumberEl, setLabel);
      
      const scoreEl = document.createElement('div');
      if (isCompleted) {
        // Завершенная партия (приоритет над текущей) - показываем счет и продолжительность
        // Показываем длительность, даже если она равна 0
        const duration = (set.duration !== null && set.duration !== undefined) ? \` (\${set.duration}')\` : '';
        scoreEl.textContent = \`\${set.scoreA}:\${set.scoreB}\${duration}\`;
        scoreEl.style.fontWeight = 'bold';
        scoreEl.style.color = '#27ae60';
      } else if (isInProgress) {
        // Текущая партия в игре - показываем статус и счет
        scoreEl.textContent = \`В игре (\${currentSet.scoreA}:\${currentSet.scoreB})\`;
        scoreEl.style.fontWeight = 'bold';
        scoreEl.style.color = '#3498db';
      } else if (isCurrent && currentSet) {
        // Текущая партия не начата
        scoreEl.textContent = 'Не начата';
        scoreEl.style.color = '#7f8c8d';
      } else {
        // Будущая партия - показываем прочерк
        scoreEl.textContent = '-';
        scoreEl.style.color = '#7f8c8d';
      }
      
      setItem.appendChild(setNumberEl);
      setItem.appendChild(scoreEl);
      
      return setItem;
    }

    function updateSetsList() {
      const setsList = document.getElementById('setsList');
      
      // Очищаем контейнер безопасно
      while (setsList.firstChild) {
        setsList.removeChild(setsList.firstChild);
      }
      
      // Проверяем, что matchData и currentSet существуют
      if (!matchData || !matchData.currentSet) {
        return;
      }
      
      const currentSetNum = matchData.currentSet.setNumber;
      const setNumbers = getRules(matchData).getConfig().maxSets;
      for (let i = 1; i <= setNumbers; i++) {
        const set = matchData.sets ? matchData.sets.find(s => s && s.setNumber === i) : null;
        const setItem = createSetItem(set, i, currentSetNum, matchData.currentSet, matchData);
        setsList.appendChild(setItem);
      }
    }

    let lastLocalUpdate = null; // Время последнего локального обновления (отправка на сервер)
    let lastServerUpdate = null; // Время последнего обновления с сервера (получение данных)

    function updateStatus(type, message, isLocalUpdate = false) {
      const statusEl = document.getElementById('status');
      statusEl.className = \`status \${type}\`;
      
      if (type === 'connected') {
        if (isLocalUpdate) {
          // Локальное обновление (отправка на сервер)
          lastLocalUpdate = Date.now();
          statusEl.textContent = 'Синхронизация...';
        } else {
          // Обновление с сервера (получение данных)
          lastServerUpdate = Date.now();
          const timeSinceUpdate = lastServerUpdate ? Math.floor((Date.now() - lastServerUpdate) / 1000) : 0;
          if (timeSinceUpdate < 2) {
            statusEl.textContent = 'Синхронизировано ✓';
          } else {
            statusEl.textContent = \`Обновлено \${timeSinceUpdate}с назад\`;
          }
        }
      } else {
        statusEl.textContent = message || 'Не подключено';
      }
    }

    // Функция для создания облегченной копии матча (без логотипов в base64)
    function createLightweightMatchCopy(match) {
      const copy = JSON.parse(JSON.stringify(match));
      
      // Удаляем base64 логотипы из копии (они не меняются при изменении счета/подачи)
      // Оставляем только logoPath для ссылки
      if (copy.teamA) {
        delete copy.teamA.logo;
        delete copy.teamA.logoBase64;
        // Оставляем только logoPath, если есть
      }
      if (copy.teamB) {
        delete copy.teamB.logo;
        delete copy.teamB.logoBase64;
        // Оставляем только logoPath, если есть
      }
      
      return copy;
    }

    async function changeScore(team, delta) {
      // Проверяем, что партия начата
      if (!matchData || matchData.currentSet.status !== 'in_progress') {
        return; // Не изменяем счет, если партия не начата
      }

      // Сохраняем состояние для отмены (без логотипов в base64)
      actionHistory.push({
        type: 'score',
        team,
        delta,
        previousState: createLightweightMatchCopy(matchData),
      });
      document.getElementById('undoBtn').disabled = false;

      updateStatus('syncing', 'Синхронизация...', true); // Локальное обновление
      
      try {
        const response = await fetch(\`/api/match/\${sessionId}/score\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team, delta }),
        });
        
        if (response.ok) {
          const result = await response.json();
          matchData = result.match;
          updateUI();
          updateStatus('connected', null, false); // Обновление с сервера
        } else {
          const error = await response.json();
          alert('Ошибка: ' + (error.error || 'Не удалось изменить счет'));
          updateStatus('disconnected', 'Ошибка');
        }
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка подключения');
        updateStatus('disconnected', 'Ошибка');
      }
    }

    async function changeServingTeam(team) {
      // Проверяем, что партия начата
      if (!matchData || matchData.currentSet.status !== 'in_progress') {
        return; // Не изменяем подачу, если партия не начата
      }

      // Проверяем, что передана корректная команда
      if (team !== 'A' && team !== 'B') {
        console.error('changeServingTeam: некорректная команда', team);
        return;
      }
      
      // Если подача уже у этой команды, ничего не делаем
      if (matchData.currentSet.servingTeam === team) {
        return;
      }
      
      // Сохраняем состояние для отмены (без логотипов в base64)
      actionHistory.push({
        type: 'serve',
        team,
        previousState: createLightweightMatchCopy(matchData),
      });
      document.getElementById('undoBtn').disabled = false;

      updateStatus('syncing', 'Синхронизация...', true); // Локальное обновление
      
      try {
        const response = await fetch(\`/api/match/\${sessionId}/serve\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team }),
        });
        
        if (response.ok) {
          const result = await response.json();
          matchData = result.match;
          updateUI();
          updateStatus('connected', null, false); // Обновление с сервера
        } else {
          const error = await response.json();
          alert('Ошибка: ' + (error.error || 'Не удалось изменить подачу'));
          updateStatus('disconnected', 'Ошибка');
        }
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка подключения');
        updateStatus('disconnected', 'Ошибка');
      }
    }

    async function startSet() {
      updateStatus('syncing', 'Синхронизация...', true); // Локальное обновление
      
      try {
        const response = await fetch(\`/api/match/\${sessionId}/set/start\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          matchData = result.match;
          updateUI();
          updateStatus('connected', null, false); // Обновление с сервера
        } else {
          const error = await response.json();
          alert('Ошибка: ' + (error.error || 'Не удалось начать партию'));
          updateStatus('disconnected', 'Ошибка');
        }
      } catch (error) {
        console.error('Ошибка при начале партии:', error);
        updateStatus('disconnected', 'Ошибка соединения');
      }
    }

    async function finishSet() {
      const setNumber = matchData.currentSet.setNumber;
      const rules = getRules(matchData);
      if (!rules.canFinishSet(matchData.currentSet.scoreA, matchData.currentSet.scoreB, setNumber)) {
        const cfg = rules.getConfig();
        const threshold = setNumber === cfg.decidingSetNumber ? cfg.pointsToWinDecidingSet : cfg.pointsToWinRegularSet;
        alert(\`Партия не может быть завершена. Необходимо набрать \${threshold} очков с разницей минимум 2 очка.\`);
        return;
      }
      
      if (!confirm('Завершить текущую партию?')) return;
      
      updateStatus('syncing', 'Синхронизация...', true); // Локальное обновление
      
      try {
        const response = await fetch(\`/api/match/\${sessionId}/set\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          const result = await response.json();
          matchData = result.match;
          updateUI();
          updateStatus('connected', null, false); // Обновление с сервера
          actionHistory = []; // Очищаем историю после завершения партии
          document.getElementById('undoBtn').disabled = true;
        } else {
          const error = await response.json();
          alert('Ошибка: ' + (error.error || 'Не удалось завершить партию'));
          updateStatus('disconnected', 'Ошибка');
        }
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка подключения');
        updateStatus('disconnected', 'Ошибка');
      }
    }

    async function undoAction() {
      if (actionHistory.length === 0) return;
      
      // Проверяем, что партия начата
      if (!matchData || matchData.currentSet.status !== 'in_progress') {
        return; // Не отменяем действия, если партия не начата
      }

      const lastAction = actionHistory.pop();
      
      if (!lastAction || !lastAction.previousState) {
        // Если нет предыдущего состояния, просто обновляем UI
        if (actionHistory.length === 0) {
          document.getElementById('undoBtn').disabled = true;
        }
        return;
      }

      updateStatus('syncing', 'Синхронизация...', true); // Локальное обновление
      
      try {
        const response = await fetch(\`/api/match/\${sessionId}/undo\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ previousState: lastAction.previousState }),
        });
        
        if (response.ok) {
          const result = await response.json();
          matchData = result.match;
          updateUI();
          updateStatus('connected', null, false); // Обновление с сервера
          
          if (actionHistory.length === 0) {
            document.getElementById('undoBtn').disabled = true;
          }
        } else {
          const error = await response.json();
          alert('Ошибка: ' + (error.error || 'Не удалось отменить действие'));
          updateStatus('disconnected', 'Ошибка');
          // Возвращаем действие в историю при ошибке
          actionHistory.push(lastAction);
        }
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка подключения');
        updateStatus('disconnected', 'Ошибка');
        // Возвращаем действие в историю при ошибке
        actionHistory.push(lastAction);
      }
    }

    // Загружаем данные при загрузке страницы
    loadMatch();
    
    // Обновляем данные каждые 2 секунды
    updateInterval = setInterval(loadMatch, 2000);
    
    // Обновляем статус каждую секунду
    setInterval(() => {
      if (matchData) {
        updateStatus('connected', null, false); // Обновление с сервера
      }
    }, 1000);

    // Очистка при закрытии
    window.addEventListener('beforeunload', () => {
      if (updateInterval) clearInterval(updateInterval);
    });

    // Предотвращаем случайное закрытие при свайпе
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    });
    document.addEventListener('touchmove', (e) => {
      if (window.scrollY === 0 && e.touches[0].clientY > touchStartY) {
        e.preventDefault();
      }
    }, { passive: false });
  </script>
</body>
</html>
    `;
  }

  /**
   * Валидация сессии
   */
  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Проверяем, не истекла ли сессия (24 часа)
    const now = Date.now();
    if (now - session.createdAt > 24 * 60 * 60 * 1000) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Генерирует новую сессию
   */
  async generateSession() {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      createdAt: Date.now(),
    };
    
    this.sessions.set(sessionId, session);
    this.savedSessionId = sessionId;
    
    // Сохраняем sessionId в настройки
    try {
      const mobileSettings = await settingsManager.getMobileSettings();
      await settingsManager.setMobileSettings({
        ...mobileSettings,
        sessionId: sessionId,
      });
    } catch (error) {
      console.error('Ошибка при сохранении sessionId:', error);
    }
    
    return sessionId;
  }

  /**
   * Загружает сохраненную сессию из настроек
   */
  async loadSavedSession() {
    try {
      const mobileSettings = await settingsManager.getMobileSettings();
      if (mobileSettings.sessionId) {
        // Восстанавливаем сессию
        const session = {
          id: mobileSettings.sessionId,
          createdAt: Date.now(), // Обновляем время создания
        };
        this.sessions.set(mobileSettings.sessionId, session);
        this.savedSessionId = mobileSettings.sessionId;
        return mobileSettings.sessionId;
      }
    } catch (error) {
      console.error('Ошибка при загрузке сохраненной сессии:', error);
    }
    return null;
  }

  /**
   * Удаляет сессию
   */
  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * Устанавливает текущий матч
   */
  setMatch(match) {
    this.currentMatch = match;
  }

  /**
   * Устанавливает callback для уведомления об изменениях матча
   */
  setMatchUpdateCallback(callback) {
    this.onMatchUpdate = callback;
  }

  /**
   * Получает список всех доступных сетевых интерфейсов
   * @returns {Array} Массив объектов { ip, name, isPrivate, isWireless, isVpn }
   */
  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    
    // Список известных VPN интерфейсов (по имени)
    const vpnInterfacePatterns = [
      /^tun\d*$/i,      // TUN/TAP
      /^tap\d*$/i,      // TAP
      /^vpn/i,          // VPN (общие)
      /^hamachi/i,      // LogMeIn Hamachi
      /^nordlynx/i,     // NordVPN
      /^wg\d*$/i,       // WireGuard
      /^utun\d*$/i,     // macOS VPN
      /^ppp\d*$/i,      // PPP (часто VPN)
      /^ipsec/i,        // IPSec VPN
      /^openvpn/i,      // OpenVPN
      /^proton/i,       // ProtonVPN
    ];
    
    // Функция проверки, является ли интерфейс VPN
    const isVpnInterface = (name) => {
      return vpnInterfacePatterns.some(pattern => pattern.test(name));
    };
    
    // Функция проверки, является ли IP частным (RFC 1918)
    const isPrivateIP = (ip) => {
      // 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
      if (/^10\./.test(ip)) return true;
      // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
      // 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
      if (/^192\.168\./.test(ip)) return true;
      return false;
    };
    
    // Функция проверки, является ли интерфейс беспроводным (Wi-Fi)
    const isWirelessInterface = (name) => {
      return /^(Wi-Fi|wlan|wifi|en0|en1)/i.test(name);
    };
    
    const result = [];
    
    // Собираем все интерфейсы
    for (const name of Object.keys(interfaces)) {
      const isVpn = isVpnInterface(name);
      
      for (const iface of interfaces[name]) {
        // Пропускаем внутренние и не-IPv4 адреса
        if (iface.family !== 'IPv4' || iface.internal) {
          continue;
        }
        
        const ip = iface.address;
        const isPrivate = isPrivateIP(ip);
        const isWireless = isWirelessInterface(name);
        
        result.push({
          ip,
          name: `${name} (${ip})`,
          interfaceName: name,
          isPrivate,
          isWireless,
          isVpn,
        });
      }
    }
    
    // Сортируем: сначала частные IP (не VPN), затем остальные
    result.sort((a, b) => {
      // Приоритет 1: Частный IP + не VPN
      // Приоритет 2: Частный IP + VPN
      // Приоритет 3: Публичный IP
      if (a.isPrivate && !a.isVpn && (b.isVpn || !b.isPrivate)) return -1;
      if (b.isPrivate && !b.isVpn && (a.isVpn || !a.isPrivate)) return 1;
      if (a.isPrivate && !b.isPrivate) return -1;
      if (b.isPrivate && !a.isPrivate) return 1;
      return 0;
    });
    
    return result;
  }

  /**
   * Получает локальный IP адрес
   * Использует выбранный IP из настроек или автоматически определяет по приоритету
   * @param {string} selectedIP - выбранный IP адрес из настроек (опционально)
   */
  getLocalIP(selectedIP = null) {
    // Если указан выбранный IP, проверяем его доступность и возвращаем
    if (selectedIP) {
      const interfaces = this.getNetworkInterfaces();
      const found = interfaces.find(iface => iface.ip === selectedIP);
      if (found) {
        return selectedIP;
      }
      // Если выбранный IP не найден, продолжаем с автоматическим определением
    }
    
    // Автоматическое определение по старой логике
    const interfaces = this.getNetworkInterfaces();
    
    // Фильтруем VPN интерфейсы для автоматического выбора
    const candidates = interfaces.filter(iface => !iface.isVpn);
    
    // Приоритет: частный IP + беспроводной интерфейс
    let best = candidates.find(iface => iface.isPrivate && iface.isWireless);
    if (best) return best.ip;
    
    // Затем: частный IP
    best = candidates.find(iface => iface.isPrivate);
    if (best) return best.ip;
    
    // Fallback: любой доступный IP
    if (candidates.length > 0) {
      return candidates[0].ip;
    }
    
    // Если ничего не найдено, возвращаем localhost
    return 'localhost';
  }

  /**
   * Запускает сервер
   */
  async start(port = 3000) {
    return new Promise((resolve, reject) => {
      this.port = port;
      
      this.server = this.app.listen(port, '0.0.0.0', async () => {
        console.log(`Mobile server started on port ${port}`);
        
        // Получаем выбранный IP из настроек
        let selectedIP = null;
        try {
          const mobileSettings = await settingsManager.getMobileSettings();
          selectedIP = mobileSettings.selectedIP || null;
          // Сохраняем состояние сервера в настройки
          await settingsManager.setMobileSettings({
            ...mobileSettings,
            enabled: true,
            port: port,
            selectedIP: selectedIP, // Сохраняем выбранный IP
          });
        } catch (error) {
          console.error('Ошибка при сохранении состояния сервера:', error);
        }
        
        // Загружаем сохраненную сессию, если она есть
        await this.loadSavedSession();
        
        const serverIP = this.getLocalIP(selectedIP);
        resolve({
          port,
          ip: serverIP,
          url: `http://${serverIP}:${port}`,
          sessionId: this.savedSessionId,
        });
      });

      this.server.on('error', (error) => {
        const friendlyError = errorHandler.handleError(error, 'server:start');
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Порт ${port} уже занят. Выберите другой порт.`));
        } else {
          reject(new Error(friendlyError));
        }
      });
    });
  }

  /**
   * Останавливает сервер
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(async () => {
          console.log('Mobile server stopped');
          this.server = null;
          
          // Сохраняем состояние сервера в настройки
          try {
            const mobileSettings = await settingsManager.getMobileSettings();
            await settingsManager.setMobileSettings({
              ...mobileSettings,
              enabled: false,
            });
          } catch (error) {
            console.error('Ошибка при сохранении состояния сервера:', error);
          }
          
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Проверяет, запущен ли сервер
   */
  isRunning() {
    return this.server !== null;
  }

  /**
   * Получает информацию о сервере
   */
  async getServerInfo() {
    if (!this.isRunning()) {
      return null;
    }

    // Получаем выбранный IP из настроек
    let selectedIP = null;
    try {
      const mobileSettings = await settingsManager.getMobileSettings();
      selectedIP = mobileSettings.selectedIP || null;
    } catch (error) {
      console.error('Ошибка при получении настроек для getServerInfo:', error);
    }

    const ip = this.getLocalIP(selectedIP);
    const port = this.port;
    const url = `http://${ip}:${port}`;
    
    console.log('[MobileServer.getServerInfo]', {
      ip,
      selectedIP,
      port,
      url,
      running: true,
      sessionsCount: this.sessions.size,
    });

    return {
      running: true,
      port,
      ip,
      url,
      sessionsCount: this.sessions.size,
    };
  }
}

// Создаем singleton экземпляр
let serverInstance = null;

function getMobileServer() {
  if (!serverInstance) {
    serverInstance = new MobileServer();
  }
  return serverInstance;
}

export {
  MobileServer,
  getMobileServer,
};

