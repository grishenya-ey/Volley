#!/usr/bin/env node

/**
 * Скрипт для анализа результатов тестов из JSON файла
 * 
 * Использование:
 *   node scripts/analyze-test-results.js [test-results.json]
 */

import fs from 'fs';
import path from 'path';

const resultsFile = process.argv[2] || 'test-results.json';

if (!fs.existsSync(resultsFile)) {
  console.error(`❌ Файл ${resultsFile} не найден.`);
  console.error('Запустите сначала: npm run test:json');
  process.exit(1);
}

try {
  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  
  console.log('\n📊 Анализ результатов тестов\n');
  console.log('═'.repeat(50));
  
  // Общая статистика
  console.log('\n📈 Общая статистика:');
  console.log(`   Всего тестов: ${results.numTotalTests}`);
  console.log(`   ✅ Пройдено: ${results.numPassedTests}`);
  console.log(`   ❌ Провалено: ${results.numFailedTests}`);
  console.log(`   ⏸️  Пропущено: ${results.numPendingTests}`);
  console.log(`   ⏱️  Время выполнения: ${((results.testResults[0]?.endTime - results.testResults[0]?.startTime) / 1000).toFixed(2)}s`);
  
  if (results.numTotalTests > 0) {
    const successRate = (results.numPassedTests / results.numTotalTests * 100).toFixed(2);
    console.log(`   📊 Успешность: ${successRate}%`);
  }
  
  // Статистика по наборам тестов
  console.log('\n📦 Статистика по наборам тестов:');
  console.log(`   Всего наборов: ${results.numTotalTestSuites}`);
  console.log(`   ✅ Успешных: ${results.numPassedTestSuites}`);
  console.log(`   ❌ Проваленных: ${results.numFailedTestSuites}`);
  
  // Детали по каждому набору тестов
  console.log('\n📋 Детали по наборам тестов:');
  results.testResults.forEach((suite, index) => {
    const status = suite.status === 'passed' ? '✅' : '❌';
    const suiteName = path.basename(suite.name);
    const passed = suite.assertionResults.filter(t => t.status === 'passed').length;
    const failed = suite.assertionResults.filter(t => t.status === 'failed').length;
    const pending = suite.assertionResults.filter(t => t.status === 'pending').length;
    
    console.log(`\n   ${status} ${suiteName}`);
    console.log(`      Тестов: ${suite.assertionResults.length} (✅ ${passed}, ❌ ${failed}, ⏸️  ${pending})`);
    
    if (failed > 0) {
      console.log(`      ⚠️  Проваленные тесты:`);
      suite.assertionResults
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`         - ${test.fullName}`);
          if (test.failureMessages && test.failureMessages.length > 0) {
            const firstMessage = test.failureMessages[0].split('\n')[0];
            console.log(`           ${firstMessage.substring(0, 80)}...`);
          }
        });
    }
  });
  
  // Проваленные тесты (детально)
  if (results.numFailedTests > 0) {
    console.log('\n❌ Детали проваленных тестов:');
    console.log('═'.repeat(50));
    
    results.testResults.forEach(suite => {
      suite.assertionResults
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`\n${test.fullName}`);
          console.log('-'.repeat(50));
          if (test.failureMessages && test.failureMessages.length > 0) {
            test.failureMessages.forEach(msg => {
              console.log(msg);
            });
          }
        });
    });
  }
  
  // Самые медленные тесты
  const slowTests = results.testResults
    .flatMap(suite => suite.assertionResults.map(test => ({
      ...test,
      suiteName: path.basename(suite.name),
    })))
    .filter(test => test.duration !== undefined)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);
  
  if (slowTests.length > 0) {
    console.log('\n🐌 Самые медленные тесты:');
    slowTests.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test.suiteName} > ${test.fullName} (${test.duration}ms)`);
    });
  }
  
  // Итог
  console.log('\n' + '═'.repeat(50));
  if (results.success) {
    console.log('✅ Все тесты пройдены успешно!');
  } else {
    console.log('❌ Некоторые тесты провалены.');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Ошибка при анализе результатов:', error.message);
  process.exit(1);
}
