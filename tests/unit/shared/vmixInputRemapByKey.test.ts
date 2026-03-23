/**
 * Тесты для tryApplyVMixInputRemapByKey: автоисправление сопоставления инпутов по vmixKey.
 */

import { describe, test, expect } from 'vitest';
import { tryApplyVMixInputRemapByKey } from '../../../src/shared/vmixConfigUtils';

describe('tryApplyVMixInputRemapByKey', () => {
  test('когда vmixTitle есть в списке GT — конфиг не меняется', () => {
    const config = {
      inputOrder: ['id1'],
      inputs: {
        id1: { vmixTitle: 'SCORE', vmixKey: 'key-a', vmixNumber: '10', displayName: 'Счёт', fields: {} },
      },
    };
    const gtInputs = [{ key: 'key-a', title: 'SCORE', number: '10' }];
    const { config: result, updatedCount, updatedInputIds } = tryApplyVMixInputRemapByKey(config, gtInputs);
    expect(updatedCount).toBe(0);
    expect(updatedInputIds).toEqual([]);
    expect(result.inputs.id1.vmixTitle).toBe('SCORE');
    expect(result.inputs.id1.vmixNumber).toBe('10');
  });

  test('когда vmixTitle нет в списке, но vmixKey найден — обновляются vmixTitle и vmixNumber', () => {
    const config = {
      inputOrder: ['id1'],
      inputs: {
        id1: { vmixTitle: 'SCORE', vmixKey: 'key-a', vmixNumber: '10', displayName: 'Счёт', fields: { 'Name_Team1.Text': { dataMapKey: 'teamA.name' } } },
      },
    };
    const gtInputs = [{ key: 'key-a', title: 'Scoreboard', number: '12' }];
    const { config: result, updatedCount, updatedInputIds } = tryApplyVMixInputRemapByKey(config, gtInputs);
    expect(updatedCount).toBe(1);
    expect(updatedInputIds).toEqual(['id1']);
    expect(result.inputs.id1.vmixTitle).toBe('Scoreboard');
    expect(result.inputs.id1.vmixNumber).toBe('12');
    expect(result.inputs.id1.vmixKey).toBe('key-a');
    expect(result.inputs.id1.fields).toEqual({ 'Name_Team1.Text': { dataMapKey: 'teamA.name' } });
  });

  test('поиск только по vmixKey, не по vmixNumber', () => {
    const config = {
      inputOrder: ['id1'],
      inputs: {
        id1: { vmixTitle: 'Old', vmixKey: 'key-x', vmixNumber: '10', displayName: 'X', fields: {} },
      },
    };
    const gtInputs = [{ key: 'key-other', title: 'Other', number: '10' }];
    const { config: result, updatedCount } = tryApplyVMixInputRemapByKey(config, gtInputs);
    expect(updatedCount).toBe(0);
    expect(result.inputs.id1.vmixTitle).toBe('Old');
    expect(result.inputs.id1.vmixNumber).toBe('10');
  });

  test('когда по vmixKey не найден — конфиг не меняется', () => {
    const config = {
      inputOrder: ['id1'],
      inputs: {
        id1: { vmixTitle: 'SCORE', vmixKey: 'deleted-key', vmixNumber: '10', displayName: 'Счёт', fields: {} },
      },
    };
    const gtInputs = [{ key: 'key-a', title: 'Scoreboard', number: '12' }];
    const { config: result, updatedCount } = tryApplyVMixInputRemapByKey(config, gtInputs);
    expect(updatedCount).toBe(0);
    expect(result.inputs.id1.vmixTitle).toBe('SCORE');
    expect(result.inputs.id1.vmixKey).toBe('deleted-key');
  });

  test('несколько инпутов: обновляется только тот, у кого title отсутствует и key найден', () => {
    const config = {
      inputOrder: ['id1', 'id2'],
      inputs: {
        id1: { vmixTitle: 'SCORE', vmixKey: 'key-a', vmixNumber: '10', displayName: 'Счёт', fields: {} },
        id2: { vmixTitle: 'OldTitle', vmixKey: 'key-b', vmixNumber: '11', displayName: 'Судья', fields: {} },
      },
    };
    const gtInputs = [
      { key: 'key-a', title: 'SCORE', number: '10' },
      { key: 'key-b', title: 'Referee', number: '12' },
    ];
    const { config: result, updatedCount, updatedInputIds } = tryApplyVMixInputRemapByKey(config, gtInputs);
    expect(updatedCount).toBe(1);
    expect(updatedInputIds).toEqual(['id2']);
    expect(result.inputs.id1.vmixTitle).toBe('SCORE');
    expect(result.inputs.id1.vmixNumber).toBe('10');
    expect(result.inputs.id2.vmixTitle).toBe('Referee');
    expect(result.inputs.id2.vmixNumber).toBe('12');
  });

  test('пустой vmixKey не считается совпадением', () => {
    const config = {
      inputOrder: ['id1'],
      inputs: {
        id1: { vmixTitle: 'Missing', vmixKey: '', vmixNumber: '10', displayName: 'X', fields: {} },
      },
    };
    const gtInputs = [{ key: 'key-a', title: 'A', number: '10' }];
    const { updatedCount } = tryApplyVMixInputRemapByKey(config, gtInputs);
    expect(updatedCount).toBe(0);
  });

  test('исходный config не мутируется', () => {
    const config = {
      inputOrder: ['id1'],
      inputs: {
        id1: { vmixTitle: 'SCORE', vmixKey: 'key-a', vmixNumber: '10', displayName: 'Счёт', fields: {} },
      },
    };
    const gtInputs = [{ key: 'key-a', title: 'Scoreboard', number: '12' }];
    const originalTitle = config.inputs.id1.vmixTitle;
    tryApplyVMixInputRemapByKey(config, gtInputs);
    expect(config.inputs.id1.vmixTitle).toBe(originalTitle);
  });
});
