/**
 * Тесты для проверки обработки загрузки матча в App
 *
 * Проверяем:
 * 1. Код содержит правильную логику для установки forceUpdateVMix
 * 2. handleLoadMatch правильно обрабатывает матч
 */

import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const APP_FILE = path.join(process.cwd(), 'src', 'renderer', 'App.tsx');

describe('App - проверка кода для forceUpdateVMix', () => {
  test('App должен содержать forceUpdateVMix при открытии матча', () => {
    const appCode = fs.readFileSync(APP_FILE, 'utf-8');
    
    // Проверяем, что код содержит forceUpdateVMix в handleLoadMatch
    expect(appCode).toContain('forceUpdateVMix');
    expect(appCode).toContain('handleLoadMatch');
    
    // Проверяем, что forceUpdateVMix устанавливается в true
    expect(appCode).toMatch(/forceUpdateVMix:\s*true/);
    
    // Проверяем, что это происходит в контексте handleLoadMatch
    const handleLoadMatchIndex = appCode.indexOf('handleLoadMatch');
    const forceUpdateIndex = appCode.indexOf('forceUpdateVMix: true');
    
    expect(handleLoadMatchIndex).toBeGreaterThan(-1);
    expect(forceUpdateIndex).toBeGreaterThan(-1);
    
    // Проверяем, что forceUpdateVMix находится после handleLoadMatch
    // (в пределах разумного расстояния - не более 500 символов)
    const distance = forceUpdateIndex - handleLoadMatchIndex;
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(500);
  });

  test('App должен устанавливать forceUpdateVMix при навигации на /match', () => {
    const appCode = fs.readFileSync(APP_FILE, 'utf-8');
    
    // Проверяем, что navigate вызывается с state, содержащим forceUpdateVMix
    expect(appCode).toMatch(/navigate\(['"]\/match['"],\s*\{/);
    expect(appCode).toMatch(/state:\s*\{[^}]*forceUpdateVMix/);
  });

  test('App должен устанавливать forceUpdateVMix даже если уже на странице /match', () => {
    const appCode = fs.readFileSync(APP_FILE, 'utf-8');
    
    // Проверяем, что есть проверка location.pathname === '/match'
    expect(appCode).toMatch(/location\.pathname\s*===\s*['"]\/match['"]/);
    
    // Проверяем, что даже в этом случае устанавливается forceUpdateVMix
    // Ищем паттерн: if (location.pathname === '/match') { ... navigate('/match', { state: { forceUpdateVMix: true } }) }
    const matchPathCheck = appCode.indexOf("location.pathname === '/match'");
    const navigateInMatch = appCode.indexOf("navigate('/match'", matchPathCheck);
    
    expect(matchPathCheck).toBeGreaterThan(-1);
    expect(navigateInMatch).toBeGreaterThan(-1);
    
    // Проверяем, что в этом блоке есть forceUpdateVMix
    const blockAfterMatch = appCode.substring(matchPathCheck, navigateInMatch + 200);
    expect(blockAfterMatch).toContain('forceUpdateVMix');
  });
});
