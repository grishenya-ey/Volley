/**
 * Утилиты для работы с конфигурацией vMix (inputOrder, inputs).
 */

export interface GTInput {
  key?: string | number;
  title?: string;
  number?: string | number;
}

export interface VMixInput {
  vmixKey?: string | number;
  vmixTitle?: string;
  vmixNumber?: string;
  [key: string]: unknown;
}

export interface VMixConfigFragment {
  inputOrder?: string[];
  inputs?: Record<string, VMixInput>;
}

export interface ConfigWithVMix {
  vmix?: VMixConfigFragment;
  [key: string]: unknown;
}

export interface TryApplyVMixInputRemapResult {
  config: VMixConfigFragment;
  updatedCount: number;
  updatedInputIds: string[];
}

function gtInputsHasTitle(gtInputs: GTInput[] | null | undefined, title: string | null | undefined): boolean {
  if (!title || typeof title !== 'string') return false;
  const t = title.trim();
  return Array.isArray(gtInputs) && gtInputs.some((inp) => inp && (inp.title ?? '').trim() === t);
}

export function tryApplyVMixInputRemapByKey(
  config: VMixConfigFragment,
  gtInputs: GTInput[] | null | undefined
): TryApplyVMixInputRemapResult {
  const inputOrder = Array.isArray(config.inputOrder) ? config.inputOrder : [];
  const inputs = config.inputs && typeof config.inputs === 'object' ? { ...config.inputs } : {};
  const gtByKey = new Map<string, { title: string; number: string }>();
  if (Array.isArray(gtInputs)) {
    for (const inp of gtInputs) {
      if (inp && inp.key != null && String(inp.key).trim() !== '') {
        gtByKey.set(String(inp.key).trim(), {
          title: inp.title != null ? String(inp.title) : '',
          number: inp.number != null ? String(inp.number) : '',
        });
      }
    }
  }
  let updatedCount = 0;
  const updatedInputIds: string[] = [];
  for (const id of inputOrder) {
    const input = inputs[id];
    if (!input || typeof input !== 'object') continue;
    const vmixKey = input.vmixKey != null ? String(input.vmixKey).trim() : '';
    if (vmixKey === '') continue;
    const vmixTitle = input.vmixTitle != null ? String(input.vmixTitle) : '';
    if (gtInputsHasTitle(gtInputs, vmixTitle)) continue;
    const gt = gtByKey.get(vmixKey);
    if (!gt) continue;
    inputs[id] = { ...input, vmixTitle: gt.title, vmixNumber: gt.number };
    updatedCount += 1;
    updatedInputIds.push(id);
  }
  return { config: { ...config, inputs }, updatedCount, updatedInputIds };
}

export function removeInputFromVMixConfig(config: ConfigWithVMix, inputId: string): ConfigWithVMix {
  if (!config?.vmix) return config;
  const { vmix } = config;
  const inputs = { ...vmix.inputs };
  delete inputs[inputId];
  const inputOrder = Array.isArray(vmix.inputOrder) ? vmix.inputOrder.filter((id) => id !== inputId) : [];
  return {
    ...config,
    vmix: {
      ...vmix,
      inputs,
      inputOrder,
    },
  };
}
