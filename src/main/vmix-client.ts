import axios from 'axios';
import xml2js from 'xml2js';
import errorHandler from '../shared/errorHandler';

/**
 * Клиент для работы с vMix HTTP API
 * Документация: https://www.vmix.com/help24/index.htm?ShortcutFunctionReference.html
 */

/** Кэш списка полей по инпуту (ключ: number или title) */
const fieldsCacheByInput = new Map();

class VMixClient {
  constructor(host = 'localhost', port = 8088) {
    this.host = host;
    this.port = port;
    this.baseURL = `http://${host}:${port}/api`;
    this.connected = false;
    this.requestQueue = [];
    this.processingQueue = false;
  }

  /**
   * Тестирует подключение к vMix
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}`, {
        timeout: 3000,
      });
      this.connected = true;
      return { success: true, data: response.data };
    } catch (error) {
      this.connected = false;
      const friendlyError = errorHandler.handleError(error, 'vMix testConnection');
      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  /**
   * Отправляет команду в vMix
   * @param {string} functionName - Название функции vMix API
   * @param {Object} params - Параметры команды
   */
  async sendCommand(functionName, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('Function', functionName);
      
      Object.keys(params).forEach(key => {
        queryParams.append(key, params[key]);
      });

      // vMix API работает с /api/ и /api, используем /api/ для совместимости с рабочей ссылкой
      const url = `${this.baseURL}/?${queryParams.toString()}`;
      
      // Подробное логирование только для команды SetImage
      if (functionName === 'SetImage') {
        // Создаем читаемую версию URL для логирования (декодированную)
        const readableUrl = `${this.baseURL}/?${decodeURIComponent(queryParams.toString())}`;
        
        const logPrefix = `[vMix API] ${functionName}`;
        const inputNameFromParams = params.Input || 'N/A';
        console.log(`${logPrefix} → ${inputNameFromParams}`);
        if (params.SelectedName) {
          console.log(`  Поле: ${params.SelectedName}`);
        }
        if (params.Value) {
          const valuePreview = typeof params.Value === 'string' && params.Value.length > 100 
            ? params.Value.substring(0, 100) + '...' 
            : params.Value;
          console.log(`  Значение: ${valuePreview}`);
          // Для SetImage с логотипами - полный URL
          if (typeof params.Value === 'string' && params.Value.includes('logo')) {
            console.log(`  [SetImage Logo] Полный URL: ${params.Value}`);
          }
        }
        console.log(`  Полный HTTP запрос (читаемый): ${readableUrl}`);
      }

      const response = await axios.get(url, {
        timeout: 5000,
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      const friendlyError = errorHandler.handleError(error, `vMix sendCommand: ${functionName}`);
      
      if (functionName === 'SetImage') {
        console.error('[SetImage] Ошибка запроса:', error.config?.url || 'URL не определен');
      }
      
      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  /**
   * Обновляет данные в инпуте
   * @param {string} inputName - Название инпута
   * @param {string} data - Данные для обновления (XML или текст)
   */
  async updateInput(inputName, data) {
    return this.sendCommand('SetText', {
      Input: inputName,
      Value: data,
    });
  }

  /**
   * Обновляет конкретное поле в инпуте по имени поля
   * @param {string} inputName - Название инпута
   * @param {string} fieldName - Имя поля (fieldIdentifier)
   * @param {string} value - Значение для поля
   */
  async updateInputField(inputName, fieldName, value) {
    return this.sendCommand('SetText', {
      Input: inputName,
      SelectedName: fieldName,
      Value: value,
    });
  }

  /**
   * Управляет видимостью текстового поля
   * @param {string} inputName - Название инпута
   * @param {string} fieldName - Имя поля (fieldIdentifier)
   * @param {boolean} visible - true для показа, false для скрытия
   */
  async setTextVisibility(inputName, fieldName, visible) {
    const functionName = visible ? 'SetTextVisibleOn' : 'SetTextVisibleOff';
    return this.sendCommand(functionName, {
      Input: inputName,
      SelectedName: fieldName,
    });
  }

  /**
   * Устанавливает цвет для поля
   * @param {string} inputName - Название инпута
   * @param {string} fieldName - Имя поля (fieldIdentifier)
   * @param {string} color - Цвет в HEX формате (например, #FF0000)
   */
  async setColor(inputName, fieldName, color) {
    return this.sendCommand('SetColor', {
      Input: inputName,
      SelectedName: fieldName,
      Value: color,
    });
  }

  /**
   * Устанавливает цвет текста для текстового поля
   * @param {string} inputName - Название инпута
   * @param {string} fieldName - Имя поля (fieldIdentifier)
   * @param {string} color - HEX цвет в формате #RRGGBB
   */
  async setTextColour(inputName, fieldName, color) {
    return this.sendCommand('SetTextColour', {
      Input: inputName,
      SelectedName: fieldName,
      Value: color,
    });
  }

  /**
   * Устанавливает изображение для поля
   * @param {string} inputName - Название инпута
   * @param {string} fieldName - Имя поля изображения (fieldIdentifier)
   * @param {string} imagePath - Путь или URL к изображению
   */
  async setImage(inputName, fieldName, imagePath) {
    // fieldName уже содержит полное имя поля из настроек (fieldIdentifier),
    // включая суффикс .Source если он указан пользователем в настройках
    const params = {
      Input: inputName,
      SelectedName: fieldName,
      Value: imagePath,
    };
    
    // Дополнительное логирование для логотипов
    if (imagePath && typeof imagePath === 'string' && imagePath.includes('logo')) {
      console.log(`[setImage Logo] Инпут: ${inputName}, Поле: ${fieldName}, URL: ${imagePath}`);
    }
    
    return this.sendCommand('SetImage', params);
  }

  /**
   * Обновляет несколько полей в инпуте
   * @param {string} inputName - Название инпута
   * @param {Object} fields - Объект с текстовыми полями { fieldName: value }
   * @param {Object} colorFields - Объект с полями цвета { fieldName: colorValue } (для fill полей)
   * @param {Object} visibilityFields - Объект с полями видимости { fieldName: { visible: boolean, fieldConfig: object } }
   * @param {Object} imageFields - Объект с полями изображений { fieldName: imagePath }
   * @param {Object} textColorFields - Объект с цветами текста для текстовых полей { fieldName: colorValue }
   * @returns {Promise<Array>} - Массив результатов для каждого поля
   */
  async updateInputFields(inputName, fields, colorFields = {}, visibilityFields = {}, imageFields = {}, textColorFields = {}) {
    const results = [];
    
    // Логирование начала обновления инпута
    console.log(`[updateInputFields] Начало обновления инпута: ${inputName}`);
    if (Object.keys(imageFields).length > 0) {
      console.log(`  Поля изображений: ${Object.keys(imageFields).join(', ')}`);
      Object.entries(imageFields).forEach(([fieldName, imagePath]) => {
        console.log(`    ${fieldName}: ${imagePath}`);
      });
    }
    
    // 1. Устанавливаем текстовые значения для обычных полей
    for (const [fieldName, value] of Object.entries(fields)) {
      const result = await this.updateInputField(inputName, fieldName, value);
      results.push(result);
    }
    
    // 2. Устанавливаем цвета для полей типа fill через команду SetColor
    for (const [fieldName, colorValue] of Object.entries(colorFields)) {
      const result = await this.setColor(inputName, fieldName, colorValue);
      results.push(result);
    }
    
    // 2.5. Устанавливаем цвета текста для текстовых полей через команду SetTextColour
    // ВАЖНО: SetTextColour должен вызываться ПОСЛЕ SetText, чтобы цвет применялся к уже установленному тексту
    for (const [fieldName, colorValue] of Object.entries(textColorFields)) {
      const result = await this.setTextColour(inputName, fieldName, colorValue);
      results.push(result);
    }
    
    // 3. Устанавливаем изображения для полей типа image через команду SetImage
    for (const [fieldName, imagePath] of Object.entries(imageFields)) {
      const result = await this.setImage(inputName, fieldName, imagePath);
      results.push(result);
    }
    
    // 4. Для полей видимости: управляем видимостью
    // Если поле есть в colorFields (fill), цвет уже установлен, просто управляем видимостью
    // Если поле текстовое, сначала устанавливаем символ ●, затем управляем видимостью
    for (const [fieldName, { visible, fieldConfig }] of Object.entries(visibilityFields)) {
      // Проверяем, является ли это полем fill (цвет уже установлен в шаге 2)
      const isFillField = colorFields.hasOwnProperty(fieldName);
      
      if (!isFillField) {
        // Для текстовых полей: сначала устанавливаем символ ●
        const setSymbolResult = await this.updateInputField(inputName, fieldName, '●');
        results.push(setSymbolResult);
      }
      
      // Затем управляем видимостью (для всех типов полей)
      const visibilityResult = await this.setTextVisibility(inputName, fieldName, visible);
      results.push(visibilityResult);
    }
    
    return results;
  }

  /**
   * Показывает инпут в оверлее
   * @param {number} overlay - Номер оверлея (1-8)
   * @param {string} inputName - Название инпута
   */
  async showOverlay(overlay, inputName) {
    return this.sendCommand('OverlayInput' + overlay + 'In', {
      Input: inputName,
    });
  }

  /**
   * Скрывает оверлей
   * @param {number} overlay - Номер оверлея (1-8)
   */
  async hideOverlay(overlay) {
    return this.sendCommand('OverlayInput' + overlay + 'Out');
  }

  /**
   * Получает текущее состояние оверлеев
   * @returns {Object} Состояние оверлеев
   */
  async getOverlayState() {
    try {
      const response = await axios.get(`${this.baseURL}`, {
        timeout: 3000,
      });
      
      // Парсим XML ответ vMix
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(response.data);
      
      // Инициализируем состояние оверлеев
      const overlayState = {
        1: { active: false, input: null },
        2: { active: false, input: null },
        3: { active: false, input: null },
        4: { active: false, input: null },
        5: { active: false, input: null },
        6: { active: false, input: null },
        7: { active: false, input: null },
        8: { active: false, input: null },
      };

      // Извлекаем информацию об оверлеях из XML
      if (result && result.vmix && result.vmix.overlays) {
        const overlays = result.vmix.overlays.overlay;
        
        // Если overlay один - он будет объектом, если несколько - массивом
        const overlayArray = Array.isArray(overlays) ? overlays : (overlays ? [overlays] : []);
        
        overlayArray.forEach((overlay) => {
          const number = parseInt(overlay.$.number);
          if (number >= 1 && number <= 8) {
            // В реальном XML vMix номер инпута находится внутри элемента как текст
            // Например: <overlay number="1">13</overlay> означает, что в оверлее 1 находится инпут номер 13
            // Если элемент пустой или не содержит текста - оверлей неактивен
            
            let inputValue = null;
            let isActive = false;
            
            // Получаем текстовое содержимое элемента
            if (overlay._) {
              // xml2js помещает текстовое содержимое в свойство _
              const textContent = overlay._.trim();
              if (textContent && !isNaN(textContent)) {
                inputValue = textContent;
                isActive = true;
              }
            } else if (typeof overlay === 'string') {
              // Если overlay сам по себе строка (при explicitArray: false)
              const textContent = overlay.trim();
              if (textContent && !isNaN(textContent)) {
                inputValue = textContent;
                isActive = true;
              }
            }
            
            overlayState[number] = {
              active: isActive,
              input: inputValue,
              preview: overlay.$.preview === 'True' || overlay.$.preview === true,
            };
          }
        });
      }
      
      // Также сохраняем список inputs для последующего использования
      // при поиске инпутов по номеру, ID или имени
      const inputsMap = {};
      if (result && result.vmix && result.vmix.inputs && result.vmix.inputs.input) {
        const inputsArray = Array.isArray(result.vmix.inputs.input) 
          ? result.vmix.inputs.input 
          : [result.vmix.inputs.input];
        
        inputsArray.forEach((input) => {
          if (input.$ && input.$.number) {
            const number = input.$.number;
            const inputData = {
              number: number,
              key: input.$.key || null, // ID инпута
              title: input.$.title || '',
              shortTitle: input.$.shortTitle || input.$.title || '',
              type: input.$.type || '',
            };
            
            // Сохраняем по номеру для обратной совместимости
            inputsMap[number] = inputData;
          }
        });
      }
      
      return { success: true, overlays: overlayState, inputsMap };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        overlays: null,
      };
    }
  }

  /**
   * Получает полный XML-ответ API (для парсинга инпутов и полей)
   * @private
   */
  async _fetchAndParseAPI() {
    const response = await axios.get(`${this.baseURL}`, { timeout: 3000 });
    const parser = new xml2js.Parser({
      explicitArray: false,
      trim: true,
      explicitCharkey: true,
    });
    return parser.parseStringPromise(response.data);
  }

  /**
   * Получает список инпутов типа GT
   * @returns {Object} { success: boolean, inputs: { number: string, key: string, title: string, shortTitle: string }[], error?: string }
   */
  async getGTInputs() {
    try {
      const result = await this._fetchAndParseAPI();
      const inputs = [];
      if (result?.vmix?.inputs?.input) {
        const inputsArray = Array.isArray(result.vmix.inputs.input)
          ? result.vmix.inputs.input
          : [result.vmix.inputs.input];
        inputsArray.forEach((input) => {
          if (input.$ && input.$.type === 'GT') {
            inputs.push({
              number: String(input.$.number),
              key: input.$.key || '',
              title: input.$.title || '',
              shortTitle: input.$.shortTitle || input.$.title || '',
            });
          }
        });
      }
      return { success: true, inputs };
    } catch (error) {
      const friendlyError = errorHandler.handleError(error, 'vMix getGTInputs');
      return { success: false, error: friendlyError, inputs: [] };
    }
  }

  /**
   * Извлекает поля инпута из разобранного XML (теги text, color, image)
   * @private
   */
  _extractInputFields(inputNode) {
    const fields = [];
    const push = (type, list) => {
      if (!list) return;
      const arr = Array.isArray(list) ? list : [list];
      arr.forEach((item) => {
        if (item?.$?.name != null) {
          fields.push({
            type,
            name: item.$.name,
            index: parseInt(item.$.index, 10) || 0,
          });
        }
      });
    };
    push('text', inputNode.text);
    push('color', inputNode.color);
    push('image', inputNode.image);
    return fields;
  }

  /**
   * Получает список полей выбранного инпута (text, color, image). Использует кэш.
   * @param {string|number} inputNumberOrKey - номер инпута или key (GUID)
   * @param {boolean} forceRefresh - запросить с API, игнорируя кэш
   * @returns {Promise<Object>} { success: boolean, fields: { type: string, name: string, index: number }[], error?: string }
   */
  async getInputFields(inputNumberOrKey, forceRefresh = false) {
    const cacheKey = String(inputNumberOrKey);
    if (!forceRefresh && fieldsCacheByInput.has(cacheKey)) {
      return { success: true, fields: fieldsCacheByInput.get(cacheKey) };
    }
    try {
      const result = await this._fetchAndParseAPI();
      if (!result?.vmix?.inputs?.input) {
        return { success: true, fields: [] };
      }
      const inputsArray = Array.isArray(result.vmix.inputs.input)
        ? result.vmix.inputs.input
        : [result.vmix.inputs.input];
      const input = inputsArray.find((inp) => {
        if (!inp.$) return false;
        const num = String(inp.$.number);
        const key = inp.$.key || '';
        return num === cacheKey || key === cacheKey || inp.$.title === cacheKey;
      });
      if (!input) {
        return { success: true, fields: [] };
      }
      const fields = this._extractInputFields(input);
      fieldsCacheByInput.set(cacheKey, fields);
      return { success: true, fields };
    } catch (error) {
      const friendlyError = errorHandler.handleError(error, 'vMix getInputFields');
      return { success: false, error: friendlyError, fields: [] };
    }
  }

  /**
   * Получает список доступных инпутов и их номеров
   * @returns {Object} { success: boolean, inputs: { number: string, title: string, shortTitle: string }[], error?: string }
   */
  async getInputs() {
    try {
      const response = await axios.get(`${this.baseURL}`, {
        timeout: 3000,
      });
      
      // Парсим XML
      const parser = new xml2js.Parser({ 
        explicitArray: false, 
        trim: true,
        explicitCharkey: true 
      });
      const result = await parser.parseStringPromise(response.data);
      
      const inputs = [];
      
      if (result && result.vmix && result.vmix.inputs && result.vmix.inputs.input) {
        const inputsArray = Array.isArray(result.vmix.inputs.input) 
          ? result.vmix.inputs.input 
          : [result.vmix.inputs.input];
        
        inputsArray.forEach((input) => {
          if (input.$) {
            inputs.push({
              number: input.$.number,
              title: input.$.title || '',
              shortTitle: input.$.shortTitle || input.$.title || '',
            });
          }
        });
      }
      
      return { success: true, inputs };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        inputs: [],
      };
    }
  }

  /**
   * Находит номер инпута по его имени или title
   * @param {string} identifier - имя, title или номер инпута
   * @returns {Promise<number|null>} - номер инпута или null, если не найден
   */
  async findInputNumberByIdentifier(identifier) {
    try {
      // Если это уже номер, возвращаем его
      if (/^\d+$/.test(identifier.trim())) {
        return parseInt(identifier.trim());
      }
      
      // Если это "InputN", извлекаем номер
      const inputMatch = identifier.trim().match(/^Input\s*(\d+)$/i);
      if (inputMatch) {
        return parseInt(inputMatch[1]);
      }
      
      // Ищем по имени в списке инпутов
      const inputsResult = await this.getInputs();
      if (!inputsResult.success) {
        return null;
      }
      
      const normalizedIdentifier = identifier.trim().toLowerCase();
      
      const foundInput = inputsResult.inputs.find(input => {
        const title = (input.title || '').toLowerCase();
        const shortTitle = (input.shortTitle || '').toLowerCase();
        
        return title === normalizedIdentifier || 
               shortTitle === normalizedIdentifier ||
               title.includes(normalizedIdentifier) ||
               shortTitle.includes(normalizedIdentifier);
      });
      
      return foundInput ? parseInt(foundInput.number) : null;
    } catch (error) {
      console.error('Ошибка при поиске номера инпута:', error);
      return null;
    }
  }

  /**
   * Устанавливает настройки подключения
   */
  setConnection(host, port) {
    this.host = host;
    this.port = port;
    this.baseURL = `http://${host}:${port}/api`;
    this.connected = false;
  }

  /**
   * Проверяет, подключен ли клиент
   */
  isConnected() {
    return this.connected;
  }
}

// Создаем singleton экземпляр
let vmixClientInstance = null;

function getVMixClient(host, port) {
  if (!vmixClientInstance) {
    vmixClientInstance = new VMixClient(host, port);
  } else if (host && port) {
    vmixClientInstance.setConnection(host, port);
  }
  return vmixClientInstance;
}

/**
 * Инвалидирует кэш полей инпута по идентификатору (vmixTitle, vmixKey или vmixNumber).
 * Вызывается после смены сопоставления инпута с vMix, чтобы при следующем getInputFields подтянулась актуальная структура.
 * Конфиг полей (config.inputs[id].fields) не меняется — только кэш в main.
 */
export function clearInputFieldsCache(inputIdentifier: string): void {
  if (inputIdentifier != null && inputIdentifier !== '') {
    fieldsCacheByInput.delete(String(inputIdentifier));
  }
}

export {
  VMixClient,
  getVMixClient,
};

