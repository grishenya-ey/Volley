/**
 * Утилиты для оверлеев и полей vMix (разрешённые URL логотипов, поиск конфига инпута).
 * Вынесены из main.ts для тестирования.
 */

/**
 * Преобразует относительные пути логотипов (logos/...) в полные URL,
 * чтобы vMix мог загрузить изображения. Без этого vMix возвращает "Недопустимый URI".
 */
export function resolveLogoUrlsInImageFields(
  imageFields: Record<string, string>,
  baseUrl: string | null
): Record<string, string> {
  if (!baseUrl || imageFields == null || typeof imageFields !== "object")
    return imageFields || {};
  const resolved: Record<string, string> = {};
  const logosBase = baseUrl.replace(/\/$/, "") + "/logos/";
  for (const [fieldName, value] of Object.entries(imageFields)) {
    const s = typeof value === "string" ? value.trim() : "";
    if (s.startsWith("logos/")) {
      const fileName = s.replace(/^logos\//, "");
      resolved[fieldName] = logosBase + encodeURIComponent(fileName);
    } else {
      resolved[fieldName] = s;
    }
  }
  return resolved;
}

/**
 * Находит конфиг инпута по ключу (id из inputOrder) или по vmixTitle/vmixNumber.
 * Нужно, чтобы оверлей работал даже при рассинхроне ключей или при передаче имени инпута.
 */
export function findInputConfig(
  config: { inputs: Record<string, unknown> },
  inputKey: string
): { inputConfig: unknown; resolvedKey: string | undefined } {
  const direct = config.inputs[inputKey];
  if (direct) return { inputConfig: direct, resolvedKey: inputKey };
  const key = String(inputKey).trim();
  for (const [id, input] of Object.entries(config.inputs)) {
    if (!input || typeof input !== "object") continue;
    const obj = input as Record<string, unknown>;
    const title = obj.vmixTitle ?? obj.vmixNumber;
    if (title != null && String(title).trim() === key)
      return { inputConfig: input, resolvedKey: id };
  }
  return { inputConfig: undefined, resolvedKey: undefined };
}
