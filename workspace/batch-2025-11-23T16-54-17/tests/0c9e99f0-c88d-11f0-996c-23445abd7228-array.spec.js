import { test, expect } from '@playwright/test';

test.describe('JavaScript Array Demo FSM Tests', () => {
  // Setup before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-23T16-54-17/html/0c9e99f0-c88d-11f0-996c-23445abd7228.html');
  });

  // Test idle state and initial load
  test('should start in idle state with empty array', async ({ page }) => {
    const arrayOutput = await page.locator('#arrayOutput');
    const outputArea = await page.locator('#outputArea');
    
    await expect(arrayOutput).toHaveText('[]');
    await expect(outputArea).toHaveText('Array is empty.');
  });

  // Test adding items
  test.describe('Adding items to array', () => {
    test('should add item to array and transition to idle state', async ({ page }) => {
      await page.fill('#inputItem', 'TestItem');
      await page.click('#btnAdd');
      
      const arrayOutput = await page.locator('#arrayOutput');
      const outputArea = await page.locator('#outputArea');

      await expect(arrayOutput).toHaveText('["TestItem"]');
      await expect(outputArea).toHaveText('Added "TestItem" to the array.');
    });

    test('should alert when adding empty item', async ({ page }) => {
      page.on('dialog', async dialog => {
        expect(dialog.message()).toBe('Please enter a non-empty value.');
        await dialog.dismiss();
      });

      await page.click('#btnAdd');
    });
  });

  // Test removing last item
  test.describe('Removing last item from array', () => {
    test('should remove last item and transition to idle state', async ({ page }) => {
      await page.fill('#inputItem', 'TestItem');
      await page.click('#btnAdd');
      await page.click('#btnRemoveLast');
      
      const arrayOutput = await page.locator('#arrayOutput');
      const outputArea = await page.locator('#outputArea');

      await expect(arrayOutput).toHaveText('[]');
      await expect(outputArea).toHaveText('Removed last item: "TestItem".');
    });

    test('should log message when removing from empty array', async ({ page }) => {
      await page.click('#btnRemoveLast');
      
      const outputArea = await page.locator('#outputArea');
      await expect(outputArea).toHaveText('Array is already empty.');
    });
  });

  // Test showing array length
  test.describe('Showing array length', () => {
    test('should show length of array', async ({ page }) => {
      await page.fill('#inputItem', 'TestItem');
      await page.click('#btnAdd');
      await page.click('#btnShowLength');
      
      const outputArea = await page.locator('#outputArea');
      await expect(outputArea).toHaveText('Current array length: 1');
    });

    test('should show length as zero for empty array', async ({ page }) => {
      await page.click('#btnShowLength');
      
      const outputArea = await page.locator('#outputArea');
      await expect(outputArea).toHaveText('Current array length: 0');
    });
  });

  // Test clearing the array
  test.describe('Clearing the array', () => {
    test('should clear the array and transition to idle state', async ({ page }) => {
      await page.fill('#inputItem', 'TestItem');
      await page.click('#btnAdd');
      await page.click('#btnClear');
      
      const arrayOutput = await page.locator('#arrayOutput');
      const outputArea = await page.locator('#outputArea');

      await expect(arrayOutput).toHaveText('[]');
      await expect(outputArea).toHaveText('Array cleared.');
    });
  });
});