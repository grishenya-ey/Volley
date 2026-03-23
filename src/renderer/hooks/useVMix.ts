import { useState, useEffect, useCallback, useRef } from "react";
import type { Match } from "../../shared/types/Match";
import { debounce } from "../utils/debounce";
import { getFullFieldName } from "../utils/vmix-field-utils";
import { getContrastTextColor } from "../utils/colorContrast";
import { calculateDuration, formatDuration } from "../../shared/timeUtils";
import { getValueByDataMapKey } from "../../shared/getValueByDataMapKey";

// Константы для типов полей и ключей
const FIELD_TYPES = {
  TEXT: "text",
  FILL: "fill",
  IMAGE: "image",
};

const FIELD_KEYS = {
  TEAM_A_LOGO: "teamALogo",
  TEAM_B_LOGO: "teamBLogo",
  POINT_A: "pointA",
  POINT_B: "pointB",
  COLOR_A: "colorA",
  COLOR_B: "colorB",
};

const OVERLAY_UPDATE_DELAY = 300;
const OVERLAY_POLL_INTERVAL = 2000;
const DEBOUNCE_DELAY = 300;

/**
 * Хук для работы с vMix
 */
export function useVMix(_match: Match | null) {
  const [vmixConfig, setVMixConfig] = useState<unknown>(null);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: "Не подключено",
  });
  const [overlayStates, setOverlayStates] = useState({});
  const [inputsMap, setInputsMap] = useState({});
  const vmixConfigRef = useRef(vmixConfig);
  const updateMatchDataDebouncedRef = useRef(null);
  const connectionStatusRef = useRef(connectionStatus);

  // Кэш последних отправленных значений для динамических инпутов (ключ = inputId)
  // Структура: { inputId: { fields: {}, colorFields: {}, visibilityFields: {}, imageFields: {}, textColorFields: {} } }
  const lastSentValuesRef = useRef({});

  // ID текущего матча для отслеживания смены матча
  const currentMatchIdRef = useRef(null);

  // Отслеживание активной кнопки для каждого инпута
  // Структура: { inputKey: buttonKey }
  // Например: { referee1: "coachTeamA" }
  const activeButtonRef = useRef({});

  // Последний показанный по нашей инициативе inputKey в разрезе оверлея (1–8).
  // Нужно, когда несколько конфиг-инпутов сопоставлены с одним vMix-инпутом.
  const lastShownInputKeyByOverlay = useRef<Record<number, string>>({});

  const loadConfigRef = useRef(null);

  const matchRef = useRef<Match | null>(null);
  matchRef.current = _match;

  // Обновляем refs при изменении состояния
  useEffect(() => {
    vmixConfigRef.current = vmixConfig;
  }, [vmixConfig]);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  // Вспомогательные функции для проверок и валидации
  const isVMixReady = useCallback(() => {
    return (
      window.electronAPI &&
      vmixConfigRef.current &&
      connectionStatusRef.current.connected
    );
  }, []);

  const getInputIdentifier = useCallback((inputConfig) => {
    if (typeof inputConfig === "string") {
      return inputConfig;
    }
    // vmixTitle / vmixNumber — идентификатор инпута в vMix
    return inputConfig?.vmixTitle ?? inputConfig?.vmixNumber ?? null;
  }, []);

  const validateInputConfig = useCallback(
    (inputConfig, checkEnabled = true) => {
      if (!inputConfig) {
        return { valid: false, error: "Инпут не настроен" };
      }
      if (checkEnabled && inputConfig.enabled === false) {
        return { valid: false, error: "Инпут отключен" };
      }
      const inputIdentifier = getInputIdentifier(inputConfig);
      if (!inputIdentifier) {
        return { valid: false, error: "Инпут не настроен" };
      }
      return { valid: true, inputIdentifier };
    },
    [getInputIdentifier]
  );

  /**
   * Список inputKey из конфига с данным оверлеем и vMix-инпутом (для различения при нескольких конфигах на один инпут).
   */
  const getInputKeysForOverlayAndVmixInput = useCallback(
    (
      config: { inputOrder?: string[]; inputs?: Record<string, unknown>; overlay?: number },
      map: Record<string, { number: string; key?: string; title?: string; shortTitle?: string }> | null,
      overlayNumber: number,
      overlayInputValue: string
    ): string[] => {
      if (!config?.inputs || !map) return [];
      const findInMap = (id: string) => {
        const trimmed = String(id).trim();
        if (/^\d+$/.test(trimmed)) return map[trimmed] || null;
        for (const [_num, data] of Object.entries(map)) {
          if (data.key && data.key.toLowerCase() === trimmed.toLowerCase()) return data;
          if (data.title && data.title.toLowerCase() === trimmed.toLowerCase()) return data;
          if (data.shortTitle && data.shortTitle.toLowerCase() === trimmed.toLowerCase()) return data;
        }
        return null;
      };
      const overlayInputData = findInMap(overlayInputValue);
      if (!overlayInputData) return [];
      const inputOrder = Array.isArray(config.inputOrder) ? config.inputOrder : Object.keys(config.inputs);
      const list: string[] = [];
      for (const inputKey of inputOrder) {
        const inputConfig = config.inputs[inputKey];
        if (!inputConfig || typeof inputConfig !== "object") continue;
        const ov = (inputConfig as { overlay?: number }).overlay ?? config.overlay ?? 1;
        if (ov !== overlayNumber) continue;
        const inputIdentifier = (inputConfig as { vmixTitle?: string; vmixNumber?: string }).vmixTitle ?? (inputConfig as { vmixNumber?: string }).vmixNumber;
        if (inputIdentifier == null) continue;
        const configInputData = findInMap(String(inputIdentifier));
        if (configInputData && configInputData.number === overlayInputData.number) list.push(inputKey);
      }
      return list;
    },
    []
  );

  const normalizeColor = useCallback((color, defaultValue = "#000000") => {
    const normalizedColor = color || defaultValue;
    return normalizedColor.startsWith("#")
      ? normalizedColor
      : `#${normalizedColor}`;
  }, []);

  /**
   * Сравнивает два значения, нормализуя их для корректного сравнения.
   * Если последнее отправленное значение не было (undefined/null), считаем поля разными,
   * чтобы отправлять и пустые строки — иначе после снятия сопоставления в vMix остаётся старый текст.
   */
  const compareValues = useCallback((value1, value2) => {
    if (value2 === undefined || value2 === null) return false;
    const str1 = String(value1 || "").trim();
    const str2 = String(value2 || "").trim();
    return str1 === str2;
  }, []);

  /**
   * Сравнивает объект visibilityFields
   */
  const compareVisibilityFields = useCallback((field1, field2) => {
    if (!field1 && !field2) return true;
    if (!field1 || !field2) return false;
    return field1.visible === field2.visible;
  }, []);

  /**
   * Фильтрует поля, оставляя только измененные
   * @param {Object} newFields - новые поля
   * @param {Object} lastSentFields - последние отправленные поля
   * @returns {Object} - объект с только измененными полями
   */
  const filterChangedFields = useCallback(
    (newFields, lastSentFields) => {
      const changed = {};
      for (const [key, value] of Object.entries(newFields)) {
        if (!compareValues(value, lastSentFields[key])) {
          changed[key] = value;
        }
      }
      return changed;
    },
    [compareValues]
  );

  /**
   * Фильтрует colorFields, оставляя только измененные
   */
  const filterChangedColorFields = useCallback(
    (newFields, lastSentFields) => {
      const changed = {};
      for (const [key, value] of Object.entries(newFields)) {
        const normalizedNew = normalizeColor(value);
        const normalizedLast = normalizeColor(lastSentFields[key]);
        if (normalizedNew !== normalizedLast) {
          changed[key] = normalizedNew;
        }
      }
      return changed;
    },
    [normalizeColor]
  );

  /**
   * Фильтрует visibilityFields, оставляя только измененные
   */
  const filterChangedVisibilityFields = useCallback(
    (newFields, lastSentFields) => {
      const changed = {};
      for (const [key, value] of Object.entries(newFields)) {
        if (!compareVisibilityFields(value, lastSentFields[key])) {
          changed[key] = value;
        }
      }
      return changed;
    },
    [compareVisibilityFields]
  );

  /**
   * Фильтрует imageFields, оставляя только измененные
   */
  const filterChangedImageFields = useCallback(
    (newFields, lastSentFields) => {
      const changed = {};
      for (const [key, value] of Object.entries(newFields)) {
        if (!compareValues(value, lastSentFields[key])) {
          changed[key] = value;
        }
      }
      return changed;
    },
    [compareValues]
  );

  /**
   * Сбрасывает кэш для указанного инпута или всех инпутов
   */
  const resetLastSentValues = useCallback((inputKey = null) => {
    if (inputKey) {
      lastSentValuesRef.current[inputKey] = {
        fields: {},
        colorFields: {},
        visibilityFields: {},
        imageFields: {},
        textColorFields: {},
      };
    } else {
      lastSentValuesRef.current = {};
    }
  }, []);

  /**
   * Сбрасывает кэш imageFields для всех динамических инпутов (при смене команд — принудительное обновление логотипов)
   */
  const resetImageFieldsCache = useCallback(() => {
    for (const entry of Object.values(lastSentValuesRef.current)) {
      if (entry && typeof entry === "object") entry.imageFields = {};
    }
  }, []);

  /**
   * Обновляет кэш для указанного инпута
   */
  const updateLastSentValues = useCallback(
    (inputKey, fields, colorFields, visibilityFields, imageFields, textColorFields = {}) => {
      if (!lastSentValuesRef.current[inputKey]) {
        lastSentValuesRef.current[inputKey] = {
          fields: {},
          colorFields: {},
          visibilityFields: {},
          imageFields: {},
          textColorFields: {},
        };
      }

      // Обновляем только те поля, которые были отправлены
      if (fields) {
        lastSentValuesRef.current[inputKey].fields = {
          ...lastSentValuesRef.current[inputKey].fields,
          ...fields,
        };
      }
      if (colorFields) {
        lastSentValuesRef.current[inputKey].colorFields = {
          ...lastSentValuesRef.current[inputKey].colorFields,
          ...colorFields,
        };
      }
      if (visibilityFields) {
        lastSentValuesRef.current[inputKey].visibilityFields = {
          ...lastSentValuesRef.current[inputKey].visibilityFields,
          ...visibilityFields,
        };
      }
      if (imageFields) {
        lastSentValuesRef.current[inputKey].imageFields = {
          ...lastSentValuesRef.current[inputKey].imageFields,
          ...imageFields,
        };
      }
      if (textColorFields) {
        lastSentValuesRef.current[inputKey].textColorFields = {
          ...lastSentValuesRef.current[inputKey].textColorFields,
          ...textColorFields,
        };
      }
    },
    []
  );

  const updateOverlayStates = useCallback(async () => {
    try {
      if (!isVMixReady()) {
        return;
      }
      const result = await window.electronAPI.getVMixOverlayState();
      if (result.success && result.overlays) {
        setOverlayStates(result.overlays);
        if (result.inputsMap) {
          setInputsMap(result.inputsMap);
        }
        // Очищаем активные кнопки для инпутов, которые стали неактивными
        // Обрабатываем инпуты, активированные через vMix напрямую
        const currentConfig = vmixConfigRef.current;
        if (currentConfig && currentConfig.inputs && result.inputsMap) {
          const tempInputsMap = result.inputsMap;

          // Проверяем все инпуты в конфигурации
          for (const [inputKey, inputConfig] of Object.entries(
            currentConfig.inputs
          )) {
            if (!inputConfig) continue;

            const overlay =
              (typeof inputConfig === "object" && inputConfig.overlay) || 1;
            const overlayState = result.overlays[overlay];

            // Проверяем, активен ли оверлей
            const isOverlayActiveInVMix =
              overlayState && overlayState.active === true;

            if (!isOverlayActiveInVMix) {
              // Оверлей неактивен - очищаем активную кнопку для этого инпута
              if (activeButtonRef.current[inputKey]) {
                delete activeButtonRef.current[inputKey];
              }
            } else {
              // Оверлей активен - проверяем, активен ли именно наш инпут
              // Получаем идентификатор инпута из конфигурации
              const inputIdentifier =
                typeof inputConfig === "string"
                  ? inputConfig
                  : inputConfig?.vmixTitle ?? inputConfig?.vmixNumber;

              if (!inputIdentifier) continue;

              // Получаем номер инпута из оверлея
              const overlayInputValue = overlayState.input
                ? String(overlayState.input).trim()
                : null;

              if (!overlayInputValue) continue;

              // Функция для поиска инпута в карте (локальная копия логики из findInputInMap)
              const findInputInTempMap = (id) => {
                const trimmed = String(id).trim();
                if (/^\d+$/.test(trimmed)) {
                  return tempInputsMap[trimmed] || null;
                }
                for (const [_num, data] of Object.entries(tempInputsMap)) {
                  if (
                    data.key &&
                    data.key.toLowerCase() === trimmed.toLowerCase()
                  ) {
                    return data;
                  }
                  if (
                    data.title &&
                    data.title.toLowerCase() === trimmed.toLowerCase()
                  ) {
                    return data;
                  }
                  if (
                    data.shortTitle &&
                    data.shortTitle.toLowerCase() === trimmed.toLowerCase()
                  ) {
                    return data;
                  }
                }
                return null;
              };

              // Сравниваем инпуты по номерам
              let isOurInputActive = false;
              const overlayInputData = findInputInTempMap(overlayInputValue);
              const configInputData = findInputInTempMap(inputIdentifier);

              if (overlayInputData && configInputData) {
                isOurInputActive =
                  overlayInputData.number === configInputData.number;
              } else if (
                overlayInputValue.toLowerCase() ===
                inputIdentifier.trim().toLowerCase()
              ) {
                isOurInputActive = true;
              }

              if (!isOurInputActive) {
                // В оверлее активен другой инпут - очищаем активную кнопку
                if (activeButtonRef.current[inputKey]) {
                  delete activeButtonRef.current[inputKey];
                }
              } else {
                // Несколько конфиг-инпутов на один vMix-инпут: активной считаем только lastShown или первую по порядку
                const competingKeys = getInputKeysForOverlayAndVmixInput(
                  currentConfig,
                  tempInputsMap,
                  overlay,
                  overlayInputValue
                );
                if (competingKeys.length > 1) {
                  const allowedKey = lastShownInputKeyByOverlay.current[overlay] ?? competingKeys[0];
                  isOurInputActive = inputKey === allowedKey;
                }
                if (!isOurInputActive) {
                  if (activeButtonRef.current[inputKey]) {
                    delete activeButtonRef.current[inputKey];
                  }
                } else {
                  // Инпут активен в vMix и это именно наш инпут
                  if (!activeButtonRef.current[inputKey]) {
                    activeButtonRef.current[inputKey] = "__EXTERNAL__";
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Ошибка при обновлении состояния оверлеев:", error);
    }
  }, [isVMixReady, getInputKeysForOverlayAndVmixInput]);

  const scheduleOverlayUpdate = useCallback(() => {
    setTimeout(() => {
      updateOverlayStates();
    }, OVERLAY_UPDATE_DELAY);
  }, [updateOverlayStates]);

  // Загружаем конфигурацию vMix
  useEffect(() => {
    loadConfig();
  }, []);

  // Слушаем смену подключения (Подключить/Отключить на странице настроек vMix)
  useEffect(() => {
    loadConfigRef.current = loadConfig;
  });
  useEffect(() => {
    const remove = window.electronAPI?.onVMixConnectionChanged?.(() => {
      loadConfigRef.current?.();
    });
    return () => remove?.();
  }, []);

  // Обновляем состояние оверлеев периодически
  useEffect(() => {
    if (vmixConfig && connectionStatus.connected) {
      const interval = setInterval(() => {
        updateOverlayStates();
      }, OVERLAY_POLL_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [vmixConfig, connectionStatus.connected, updateOverlayStates]);

  const loadConfig = async () => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const config = await window.electronAPI.getVMixConfig();
      if (config) {
        // Сохраняем старую конфигурацию перед обновлением для сравнения
        const oldConfig = vmixConfigRef.current;

        // Проверяем, изменилась ли конфигурация (особенно структура инпутов)
        const configChanged =
          oldConfig &&
          JSON.stringify(oldConfig.inputs) !== JSON.stringify(config.inputs);

        setVMixConfig(config);

        // Источник истины для «подключено» — сохранённое состояние (Подключить/Отключить в настройках vMix)
        const connectedByConfig = config.connectionState === "connected";
        setConnectionStatus({
          connected: connectedByConfig,
          message: connectedByConfig
            ? "Подключено"
            : config.connectionState === "disconnected"
              ? "Отключено"
              : "Не подключено",
        });

        // Если конфигурация изменилась (особенно структура инпутов), сбрасываем кэш
        if (configChanged) {
          resetLastSentValues();
          activeButtonRef.current = {};
          lastShownInputKeyByOverlay.current = {};
        }

        // Проверяем доступность vMix только если в настройках выбрано «подключено»
        if (connectedByConfig) {
          checkConnection(config.host, config.port);
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке настроек vMix:", error);
    }
  };

  const checkConnection = async (host, port) => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const result = await window.electronAPI.testVMixConnection(host, port);
      setConnectionStatus({
        connected: result.success,
        message: result.success
          ? "Подключено"
          : result.error || "Не подключено",
      });

      if (result.success) {
        updateOverlayStates();
        resetLastSentValues();
        activeButtonRef.current = {};
        lastShownInputKeyByOverlay.current = {};
      }
    } catch {
      setConnectionStatus({
        connected: false,
        message: "Ошибка подключения",
      });
    }
  };

  /**
   * Обновляет данные в инпуте vMix
   */
  const updateInput = useCallback(
    async (inputKey, data) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = (vmixConfig as { inputs?: Record<string, unknown> }).inputs?.[inputKey];
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const result = await window.electronAPI.updateVMixInput(
          validation.inputIdentifier,
          data
        );
        return result;
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
    [vmixConfig, isVMixReady, validateInputConfig]
  );

  /**
   * Обновляет один динамический инпут vMix (поля, цвета, видимость, картинки).
   * Вызывается из updateDynamicInputs (цикл) и из showOverlay перед показом плашки.
   */
  const updateSingleDynamicInput = useCallback(
    async (inputId: string, matchData: Match | null, forceUpdate = true): Promise<void> => {
      if (!isVMixReady()) return;
      if (matchData == null) return;
      const config = vmixConfigRef.current;
      const inputConfig = config?.inputs?.[inputId];
      if (!inputConfig) return;
      const vmixTitle = inputConfig.vmixTitle ?? inputConfig.vmixNumber;
      if (!vmixTitle) return;

      const fieldsConfig = inputConfig.fields || {};
      const fields = {};
      const colorFields = {};
      const visibilityFields = {};
      const imageFields = {};
      const textColorFields = {};

      let vmixFieldsList: { name?: string; type?: string }[] = [];
      try {
        const fieldsResult = await window.electronAPI.getVMixInputFields(vmixTitle, false);
        if (fieldsResult?.success && Array.isArray(fieldsResult.fields)) {
          vmixFieldsList = fieldsResult.fields;
        }
      } catch (_) {
        // без списка полей отправим только сопоставленные
      }

      for (const f of vmixFieldsList) {
        if (f?.type === "text") {
          const fieldName = f.name;
          const mapping = fieldsConfig[fieldName];
          if (mapping && (mapping.dataMapKey != null || mapping.customValue != null)) {
            const rawValue =
              mapping.customValue != null && mapping.customValue !== ""
                ? String(mapping.customValue)
                : mapping.dataMapKey
                  ? getValueByDataMapKey(matchData, mapping.dataMapKey)
                  : undefined;
            fields[fieldName] = rawValue != null ? String(rawValue) : "";
          } else {
            fields[fieldName] = "";
          }
        }
      }

      for (const [fieldName, mapping] of Object.entries(fieldsConfig)) {
        if (!mapping || (mapping.dataMapKey == null && mapping.customValue == null)) continue;
        const rawValue =
          mapping.customValue != null && mapping.customValue !== ""
            ? String(mapping.customValue)
            : mapping.dataMapKey
              ? getValueByDataMapKey(matchData, mapping.dataMapKey)
              : undefined;
        const dataMapKey = mapping.dataMapKey || "";
        const isVisibility =
          dataMapKey === "visibility.pointA" || dataMapKey === "visibility.pointB";
        const vmixFieldType = mapping.vmixFieldType || "text";

        if (isVisibility) {
          visibilityFields[fieldName] = { visible: Boolean(rawValue), fieldConfig: {} };
          continue;
        }
        const value = rawValue != null ? String(rawValue) : "";
        if (vmixFieldType === "color") {
          colorFields[fieldName] = value;
        } else if (vmixFieldType === "image") {
          imageFields[fieldName] = value;
        } else if (!(fieldName in fields)) {
          fields[fieldName] = value;
        }
      }

      const lastSent = lastSentValuesRef.current[inputId];
      if (lastSent?.fields && typeof lastSent.fields === "object") {
        for (const key of Object.keys(lastSent.fields)) {
          if (!(key in fields)) fields[key] = "";
        }
      }

      const lastSentSafe = lastSent || {
        fields: {},
        colorFields: {},
        visibilityFields: {},
        imageFields: {},
        textColorFields: {},
      };

      let fieldsToSend = fields;
      let colorFieldsToSend = colorFields;
      let visibilityFieldsToSend = visibilityFields;
      let imageFieldsToSend = imageFields;
      if (!forceUpdate) {
        fieldsToSend = filterChangedFields(fields, lastSentSafe.fields);
        colorFieldsToSend = filterChangedColorFields(colorFields, lastSentSafe.colorFields);
        visibilityFieldsToSend = filterChangedVisibilityFields(
          visibilityFields,
          lastSentSafe.visibilityFields
        );
        imageFieldsToSend = filterChangedImageFields(imageFields, lastSentSafe.imageFields);
      }

      const hasAny =
        Object.keys(fieldsToSend).length > 0 ||
        Object.keys(colorFieldsToSend).length > 0 ||
        Object.keys(visibilityFieldsToSend).length > 0 ||
        Object.keys(imageFieldsToSend).length > 0;
      if (!hasAny && !forceUpdate) return;

      try {
        const result = await window.electronAPI.updateVMixInputFields(
          vmixTitle,
          fieldsToSend,
          colorFieldsToSend,
          visibilityFieldsToSend,
          imageFieldsToSend,
          textColorFields
        );
        if (result?.success) {
          updateLastSentValues(
            inputId,
            fieldsToSend,
            colorFieldsToSend,
            visibilityFieldsToSend,
            imageFieldsToSend,
            textColorFields
          );
        } else if (result && !result.skipped) {
          console.error(`[useVMix] Динамический инпут ${inputId}:`, result.error);
        }
      } catch (err) {
        console.error(`[useVMix] Ошибка обновления динамического инпута ${inputId}:`, err);
      }
    },
    [
      isVMixReady,
      filterChangedFields,
      filterChangedColorFields,
      filterChangedVisibilityFields,
      filterChangedImageFields,
      updateLastSentValues,
    ]
  );

  /**
   * Обновляет динамические инпуты vMix (из config.inputOrder) по сопоставлениям
   * dataMapKey/customValue и getValueByDataMapKey.
   */
  const updateDynamicInputs = useCallback(
    async (matchData, forceUpdate = false) => {
      if (!isVMixReady()) return;
      const config = vmixConfigRef.current;
      const inputOrder = Array.isArray(config?.inputOrder) ? config.inputOrder : [];
      if (inputOrder.length === 0) return;
      for (const inputId of inputOrder) {
        await updateSingleDynamicInput(inputId, matchData, forceUpdate);
      }
    },
    [isVMixReady, updateSingleDynamicInput]
  );

  /**
   * Показывает плашку в оверлее
   */
  const showOverlay = useCallback(
    async (inputKey, buttonKey = null) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const inputConfig = (vmixConfig as { inputs?: Record<string, unknown> }).inputs?.[inputKey];
        const validation = validateInputConfig(inputConfig);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const matchData = matchRef.current;
        if (matchData) {
          try {
            await updateSingleDynamicInput(inputKey, matchData, true);
          } catch (err) {
            console.error("[useVMix] Ошибка обновления полей перед показом:", err);
          }
        }

        const result = await window.electronAPI.showVMixOverlay(inputKey);

        if (result.success) {
          const overlay =
            (typeof inputConfig === "object" && inputConfig !== null && (inputConfig as { overlay?: number }).overlay != null)
              ? (inputConfig as { overlay?: number }).overlay
              : (vmixConfig as { overlay?: number })?.overlay ?? 1;
          lastShownInputKeyByOverlay.current[overlay] = inputKey;
          if (buttonKey) {
            activeButtonRef.current[inputKey] = buttonKey;
          }
          scheduleOverlayUpdate();
        }

        return result;
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
    [vmixConfig, isVMixReady, validateInputConfig, scheduleOverlayUpdate, updateSingleDynamicInput]
  );

  /**
   * Скрывает оверлей
   * Примечание: hideOverlay не проверяет enabled, так как нужно иметь возможность скрыть оверлей даже если инпут отключен
   * Примечание: activeButtonRef НЕ очищается сразу, так как vMix может скрывать инпут с задержкой (анимация)
   * Состояние кнопки обновится автоматически через периодический опрос vMix API в updateOverlayStates()
   */
  const hideOverlay = useCallback(
    async (inputKey) => {
      if (!isVMixReady()) {
        return { success: false, error: "vMix не подключен" };
      }

      try {
        const result = await window.electronAPI.hideVMixOverlay(inputKey);

        if (result.success) {
          // НЕ очищаем activeButtonRef сразу - дождемся подтверждения через vMix API
          // Это важно, так как vMix может скрывать инпут с задержкой из-за анимации
          // Планируем обновление состояния через периодический опрос
          scheduleOverlayUpdate();
        }

        return result;
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
    [isVMixReady, scheduleOverlayUpdate]
  );

  /**
   * Автоматическое обновление данных матча в vMix
   * @param {Object} matchData - данные матча
   * @param {boolean} forceUpdate - принудительное обновление всех полей (игнорирует кэш)
   */
  const updateMatchData = useCallback(
    (matchData, forceUpdate = false) => {
      // Проверяем, сменился ли матч (по matchId)
      if (
        matchData &&
        matchData.matchId &&
        currentMatchIdRef.current !== matchData.matchId
      ) {
        // Матч сменился - сбрасываем кэш и активные кнопки
        resetLastSentValues();
        activeButtonRef.current = {};
        lastShownInputKeyByOverlay.current = {};
        currentMatchIdRef.current = matchData.matchId;
      } else if (!matchData) {
        // Матч был сброшен
        currentMatchIdRef.current = null;
        activeButtonRef.current = {};
        lastShownInputKeyByOverlay.current = {};
      }

      if (updateMatchDataDebouncedRef.current) {
        updateMatchDataDebouncedRef.current(matchData, forceUpdate);
      }
    },
    [resetLastSentValues]
  );

  // Инициализируем debounced функцию для обновления данных
  useEffect(() => {
    updateMatchDataDebouncedRef.current = debounce(
      async (matchData, forceUpdate = false) => {
        const currentConfig = vmixConfigRef.current;
        const currentStatus = connectionStatusRef.current;

        if (!currentConfig || !currentStatus.connected || !matchData) {
          return;
        }

        try {
          await updateDynamicInputs(matchData, forceUpdate);
        } catch (error) {
          console.error("Ошибка при обновлении данных в vMix:", error);
        }
      },
      DEBOUNCE_DELAY
    );
  }, [updateDynamicInputs]);

  // Неиспользуемые функции оставлены для возможного будущего использования
  // eslint-disable-next-line unused-imports/no-unused-vars
  const formatSetScoreData = (_match, _set) => {
    return JSON.stringify({
      teamA: _match.teamA.name,
      teamB: _match.teamB.name,
      setNumber: _set.setNumber,
      scoreA: _set.scoreA,
      scoreB: _set.scoreB,
    });
  };

  // eslint-disable-next-line unused-imports/no-unused-vars
  const formatStatisticsData = (_match) => {
    return JSON.stringify({
      teamA: {
        name: _match.teamA.name,
        attack: _match.statistics.teamA.attack,
        block: _match.statistics.teamA.block,
        serve: _match.statistics.teamA.serve,
        opponentErrors: _match.statistics.teamA.opponentErrors,
      },
      teamB: {
        name: _match.teamB.name,
        attack: _match.statistics.teamB.attack,
        block: _match.statistics.teamB.block,
        serve: _match.statistics.teamB.serve,
        opponentErrors: _match.statistics.teamB.opponentErrors,
      },
    });
  };

  /**
   * Находит инпут в inputsMap по идентификатору (номер, ID или имя)
   * Возвращает объект с информацией об инпуте или null, если не найден
   */
  const findInputInMap = useCallback(
    (inputIdentifier) => {
      if (
        !inputIdentifier ||
        !inputsMap ||
        Object.keys(inputsMap).length === 0
      ) {
        return null;
      }

      const trimmed = inputIdentifier.trim();

      // 1. Если это число (порядковый номер) - ищем напрямую
      if (/^\d+$/.test(trimmed)) {
        const inputData = inputsMap[trimmed];
        if (inputData) {
          return {
            number: inputData.number,
            key: inputData.key,
            title: inputData.title,
            shortTitle: inputData.shortTitle,
            type: inputData.type,
          };
        }
        return null;
      }

      // 2. Если это ID инпута (key) - ищем по key
      for (const [_number, inputData] of Object.entries(inputsMap)) {
        if (
          inputData.key &&
          inputData.key.toLowerCase() === trimmed.toLowerCase()
        ) {
          return {
            number: inputData.number,
            key: inputData.key,
            title: inputData.title,
            shortTitle: inputData.shortTitle,
            type: inputData.type,
          };
        }
      }

      // 3. Если это имя инпута (title или shortTitle) - ищем по имени
      const normalizedName = trimmed.toLowerCase();
      for (const [_number, inputData] of Object.entries(inputsMap)) {
        const title = (inputData.title || "").toLowerCase();
        const shortTitle = (inputData.shortTitle || "").toLowerCase();

        // Точное совпадение
        if (title === normalizedName || shortTitle === normalizedName) {
          return {
            number: inputData.number,
            key: inputData.key,
            title: inputData.title,
            shortTitle: inputData.shortTitle,
            type: inputData.type,
          };
        }

        // Также проверяем, если имя содержит расширение (например, ".gtzip")
        // и совпадает с именем без расширения
        if (normalizedName.includes(".")) {
          const nameWithoutExt = normalizedName.split(".")[0];
          if (nameWithoutExt === title || nameWithoutExt === shortTitle) {
            return {
              number: inputData.number,
              key: inputData.key,
              title: inputData.title,
              shortTitle: inputData.shortTitle,
              type: inputData.type,
            };
          }
        }
      }

      // 4. Если ничего не найдено, возвращаем null
      // НЕ извлекаем номер из "Input3" - это неправильно,
      // потому что "Input3" и "3" - это разные способы обращения к инпуту в vMix
      return null;
    },
    [inputsMap]
  );

  /**
   * Проверяет, активна ли плашка в оверлее
   * @param {string} inputKey - ключ инпута
   * @param {string} buttonKey - ключ кнопки (опционально, для кнопок, использующих один инпут)
   * @returns {boolean} true если плашка активна и buttonKey соответствует активной кнопке
   */
  const isOverlayActive = useCallback(
    (inputKey, buttonKey = null) => {
      if (!vmixConfig || !overlayStates) {
        return false;
      }

      const inputConfig = (vmixConfig as { inputs?: Record<string, unknown> }).inputs?.[inputKey];
      if (!inputConfig) {
        return false;
      }

      const inputIdentifier = getInputIdentifier(inputConfig);
      if (!inputIdentifier) {
        return false;
      }

      const overlay =
        (typeof inputConfig === "object" && (inputConfig as { overlay?: number }).overlay) ||
        (vmixConfig as { overlay?: number })?.overlay ||
        1;

      const overlayState = overlayStates[overlay];
      if (!overlayState) {
        return false;
      }

      // Если оверлей неактивен, плашка не активна
      if (overlayState.active !== true) {
        // Если оверлей неактивен, очищаем активную кнопку для этого инпута
        if (activeButtonRef.current[inputKey]) {
          delete activeButtonRef.current[inputKey];
        }
        return false;
      }

      const overlayInputValue = overlayState.input
        ? String(overlayState.input).trim()
        : null;

      if (!overlayInputValue) {
        return false;
      }

      // vMix API возвращает в оверлее порядковый номер инпута (например, "3")
      // В конфиге может быть указан:
      // - Порядковый номер: "3"
      // - ID инпута (key): "some-uuid"
      // - Имя инпута: "Zayavka2024-2.gtzip"
      // НЕ используем формат "Input3" как идентификатор - это некорректно

      // Сначала проверяем точное совпадение исходных идентификаторов
      const normalizedConfig = inputIdentifier.trim().toLowerCase();
      const normalizedOverlay = overlayInputValue.toLowerCase();

      let isInputActive = false;
      if (normalizedConfig === normalizedOverlay) {
        isInputActive = true;
      } else {
        const trimmedIdentifier = inputIdentifier.trim();

        // Проверяем, является ли overlayInputValue порядковым номером (из vMix API)
        const isOverlayNumber = /^\d+$/.test(overlayInputValue);

        if (isOverlayNumber) {
          // vMix API вернул номер инпута в оверлее
          // Найдем инпут с этим номером в inputsMap
          const overlayInputData = inputsMap && inputsMap[overlayInputValue];

          if (overlayInputData) {
            // Теперь найдем инпут из конфига в inputsMap
            const configInputData = findInputInMap(trimmedIdentifier);

            if (configInputData) {
              // Сравниваем номера инпутов - если они совпадают, это один и тот же инпут
              isInputActive =
                configInputData.number === overlayInputData.number;
            }
          }
        } else {
          // Если в оверлее не число (нестандартный случай)
          // Найдем оба инпута в inputsMap и сравним их номера
          const overlayInputData = findInputInMap(overlayInputValue);
          const configInputData = findInputInMap(trimmedIdentifier);

          if (overlayInputData && configInputData) {
            // Сравниваем номера инпутов
            isInputActive = overlayInputData.number === configInputData.number;
          }
        }
      }

      // Несколько конфиг-инпутов на один vMix-инпут: активной считаем только lastShown или первую по порядку
      if (isInputActive) {
        const competingKeys = getInputKeysForOverlayAndVmixInput(
          vmixConfig as { inputOrder?: string[]; inputs?: Record<string, unknown>; overlay?: number },
          inputsMap as Record<string, { number: string; key?: string; title?: string; shortTitle?: string }>,
          overlay,
          overlayInputValue
        );
        if (competingKeys.length > 1) {
          const allowedKey = lastShownInputKeyByOverlay.current[overlay] ?? competingKeys[0];
          isInputActive = inputKey === allowedKey;
        }
      }

      // Если инпут неактивен, очищаем активную кнопку
      if (!isInputActive) {
        if (activeButtonRef.current[inputKey]) {
          delete activeButtonRef.current[inputKey];
        }
        return false;
      }

      // Если инпут активен, проверяем, соответствует ли buttonKey активной кнопке
      if (buttonKey !== null) {
        // Для кнопок, использующих один инпут, проверяем активную кнопку
        let activeButton = activeButtonRef.current[inputKey];

        // Если активная кнопка имеет специальное значение '__EXTERNAL__',
        // значит инпут был активирован через vMix напрямую
        // В этом случае устанавливаем текущую кнопку как активную при первом вызове
        // Используем атомарную проверку для предотвращения гонки условий
        if (activeButton === "__EXTERNAL__") {
          // Атомарно устанавливаем buttonKey как активную кнопку только если она еще '__EXTERNAL__'
          activeButtonRef.current[inputKey] = buttonKey;
          activeButton = buttonKey;
        }

        // Если активная кнопка не установлена (undefined или null), но инпут активен в vMix,
        // значит это первый раз, когда мы проверяем этот инпут после активации через vMix
        // Устанавливаем текущую кнопку как активную
        // Это может произойти, если updateOverlayStates еще не успел установить '__EXTERNAL__'
        if (
          (activeButton === undefined || activeButton === null) &&
          isInputActive
        ) {
          // Двойная проверка для атомарности (избегаем гонки условий)
          // Если между проверками другая кнопка установилась, используем её
          const currentActive = activeButtonRef.current[inputKey];
          if (
            currentActive === undefined ||
            currentActive === null ||
            currentActive === "__EXTERNAL__"
          ) {
            activeButtonRef.current[inputKey] = buttonKey;
            activeButton = buttonKey;
          } else {
            // Другая кнопка уже установилась - используем её
            activeButton = currentActive;
          }
        }

        // Обновляем локальную переменную после возможных изменений
        activeButton = activeButtonRef.current[inputKey];

        // Если активная кнопка все еще не установлена или имеет маркер внешней активации, возвращаем false
        if (
          activeButton === undefined ||
          activeButton === null ||
          activeButton === "__EXTERNAL__"
        ) {
          return false;
        }

        return activeButton === buttonKey;
      }

      // Если buttonKey не указан, возвращаем статус активности инпута
      // Но это используется только для внутренних проверок
      return true;
    },
    [vmixConfig, overlayStates, getInputIdentifier, findInputInMap, inputsMap, getInputKeysForOverlayAndVmixInput]
  );

  /**
   * Возвращает true, если для данного inputKey другая плашка из той же группы
   * (тот же vMix-инпут и оверлей) сейчас в эфире. Используется для блокировки кнопок:
   * пока одна плашка в эфире, остальные кнопки на тот же инпут недоступны.
   */
  const isAnotherOverlayOnAirForSameInput = useCallback(
    (inputKey: string): boolean => {
      if (!vmixConfig || !overlayStates || !inputsMap) return false;

      const inputConfig = (vmixConfig as { inputs?: Record<string, unknown> }).inputs?.[inputKey];
      if (!inputConfig) return false;

      const overlay =
        (typeof inputConfig === "object" && (inputConfig as { overlay?: number }).overlay) ||
        (vmixConfig as { overlay?: number })?.overlay ||
        1;

      const overlayState = overlayStates[overlay];
      if (!overlayState || overlayState.active !== true) return false;

      const overlayInputValue = overlayState.input ? String(overlayState.input).trim() : null;
      if (!overlayInputValue) return false;

      const competingKeys = getInputKeysForOverlayAndVmixInput(
        vmixConfig as { inputOrder?: string[]; inputs?: Record<string, unknown>; overlay?: number },
        inputsMap as Record<string, { number: string; key?: string; title?: string; shortTitle?: string }>,
        overlay,
        overlayInputValue
      );

      // Блокируем только кнопки, которые ссылаются на тот же vMix-инпут (входят в competingKeys)
      if (competingKeys.length <= 1 || !competingKeys.includes(inputKey)) return false;

      for (const k of competingKeys) {
        if (k !== inputKey && isOverlayActive(k, null)) return true;
      }
      return false;
    },
    [vmixConfig, overlayStates, inputsMap, getInputKeysForOverlayAndVmixInput, isOverlayActive]
  );

  return {
    vmixConfig,
    connectionStatus,
    overlayStates,
    updateInput,
    showOverlay,
    hideOverlay,
    updateMatchData,
    isOverlayActive,
    isAnotherOverlayOnAirForSameInput,
    checkConnection,
    resetImageFieldsCache,
  };
}
