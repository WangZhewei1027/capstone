import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c883931-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Heap (Min/Max) Demonstration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Min Heap Operations', () => {
    test('should insert value into Min Heap', async ({ page }) => {
      await page.fill('#minInput', '5');
      await page.click('#minInsertBtn');

      const heapArray = await page.textContent('#minHeapArray');
      expect(heapArray).toBe('[5]'); // Validate that the heap contains the inserted value
    });

    test('should extract value from Min Heap', async ({ page }) => {
      await page.fill('#minInput', '3');
      await page.click('#minInsertBtn');
      await page.fill('#minInput', '1');
      await page.click('#minInsertBtn');
      await page.click('#minExtractBtn');

      const heapArray = await page.textContent('#minHeapArray');
      expect(heapArray).toBe('[3]'); // Validate that the extracted value is removed
    });

    test('should show alert when extracting from empty Min Heap', async ({ page }) => {
      await page.click('#minExtractBtn');
      const alertText = await page.waitForEvent('dialog');
      expect(alertText.message()).toBe('Min Heap is empty');
      await alertText.dismiss();
    });
  });

  test.describe('Max Heap Operations', () => {
    test('should insert value into Max Heap', async ({ page }) => {
      await page.fill('#maxInput', '10');
      await page.click('#maxInsertBtn');

      const heapArray = await page.textContent('#maxHeapArray');
      expect(heapArray).toBe('[10]'); // Validate that the heap contains the inserted value
    });

    test('should extract value from Max Heap', async ({ page }) => {
      await page.fill('#maxInput', '15');
      await page.click('#maxInsertBtn');
      await page.fill('#maxInput', '20');
      await page.click('#maxInsertBtn');
      await page.click('#maxExtractBtn');

      const heapArray = await page.textContent('#maxHeapArray');
      expect(heapArray).toBe('[15]'); // Validate that the extracted value is removed
    });

    test('should show alert when extracting from empty Max Heap', async ({ page }) => {
      await page.click('#maxExtractBtn');
      const alertText = await page.waitForEvent('dialog');
      expect(alertText.message()).toBe('Max Heap is empty');
      await alertText.dismiss();
    });
  });

  test.describe('Error Handling', () => {
    test('should show alert when inserting invalid number into Min Heap', async ({ page }) => {
      await page.fill('#minInput', 'invalid');
      await page.click('#minInsertBtn');
      const alertText = await page.waitForEvent('dialog');
      expect(alertText.message()).toBe('Enter a valid number');
      await alertText.dismiss();
    });

    test('should show alert when inserting empty value into Max Heap', async ({ page }) => {
      await page.fill('#maxInput', '');
      await page.click('#maxInsertBtn');
      const alertText = await page.waitForEvent('dialog');
      expect(alertText.message()).toBe('Enter a number to insert in Max Heap');
      await alertText.dismiss();
    });
  });
});