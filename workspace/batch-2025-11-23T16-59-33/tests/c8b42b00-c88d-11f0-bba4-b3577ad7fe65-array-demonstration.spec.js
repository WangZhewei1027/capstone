import { test, expect } from '@playwright/test';

test.describe('Array Demonstration FSM Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-23T16-59-33/html/c8b42b00-c88d-11f0-bba4-b3577ad7fe65.html');
  });

  test('should transition from idle to arrayCreated state on CREATE_ARRAY_CLICKED', async ({ page }) => {
    await page.click('#createArrayBtn');
    const arrayOutput = await page.locator('#arrayOutput').textContent();
    expect(arrayOutput).toBe('Created array: [10,20,30,40,50]');
  });

  test.describe('Array Created State Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('#createArrayBtn');
    });

    test('should access element at valid index', async ({ page }) => {
      await page.fill('#indexInput', '2');
      await page.click('#accessIndexBtn');
      const accessOutput = await page.locator('#accessOutput').textContent();
      expect(accessOutput).toBe('Element at index 2: 30');
    });

    test('should show error for invalid index access', async ({ page }) => {
      await page.fill('#indexInput', '10');
      await page.click('#accessIndexBtn');
      const accessOutput = await page.locator('#accessOutput').textContent();
      expect(accessOutput).toBe('Invalid index. Current array length: 5');
    });

    test('should modify element at valid index', async ({ page }) => {
      await page.fill('#indexInput', '1');
      await page.fill('#modifyValueInput', '99');
      await page.click('#modifyIndexBtn');
      const modifyOutput = await page.locator('#modifyOutput').textContent();
      expect(modifyOutput).toBe('Modified array:\n[10,"99",30,40,50]');
    });

    test('should show error for invalid index modification', async ({ page }) => {
      await page.fill('#indexInput', '10');
      await page.fill('#modifyValueInput', '99');
      await page.click('#modifyIndexBtn');
      const modifyOutput = await page.locator('#modifyOutput').textContent();
      expect(modifyOutput).toBe('Invalid index for modification. Current array length: 5');
    });

    test('should push element to array', async ({ page }) => {
      await page.click('#pushBtn');
      const methodsOutput = await page.locator('#methodsOutput').textContent();
      expect(methodsOutput).toBe('After push(\'Hello\'):\n[10,20,30,40,50,"Hello"]');
    });

    test('should pop element from array', async ({ page }) => {
      await page.click('#popBtn');
      const methodsOutput = await page.locator('#methodsOutput').textContent();
      expect(methodsOutput).toBe('After pop(): removed "50"\n[10,20,30,40]');
    });

    test('should shift element from array', async ({ page }) => {
      await page.click('#shiftBtn');
      const methodsOutput = await page.locator('#methodsOutput').textContent();
      expect(methodsOutput).toBe('After shift(): removed "10"\n[20,30,40,50]');
    });

    test('should unshift element to array', async ({ page }) => {
      await page.click('#unshiftBtn');
      const methodsOutput = await page.locator('#methodsOutput').textContent();
      expect(methodsOutput).toBe('After unshift(\'Start\'):\n["Start",10,20,30,40,50]');
    });

    test('should splice array at index 1', async ({ page }) => {
      await page.click('#spliceBtn');
      const methodsOutput = await page.locator('#methodsOutput').textContent();
      expect(methodsOutput).toBe('After splice(1, 1, \'Spliced\'):\nRemoved element: [20]\n[10,"Spliced",30,40,50]');
    });

    test('should slice first 3 elements of array', async ({ page }) => {
      await page.click('#sliceBtn');
      const methodsOutput = await page.locator('#methodsOutput').textContent();
      expect(methodsOutput).toBe('Slice first 3 elements: [10,20,30]\nOriginal array remains:\n[10,20,30,40,50]');
    });

    test('should find index of "Hello" in array', async ({ page }) => {
      await page.click('#pushBtn'); // Ensure "Hello" is in the array
      await page.click('#indexOfBtn');
      const methodsOutput = await page.locator('#methodsOutput').textContent();
      expect(methodsOutput).toBe('"Hello" found at index: 5');
    });

    test('should not find "Hello" if not in array', async ({ page }) => {
      await page.click('#indexOfBtn');
      const methodsOutput = await page.locator('#methodsOutput').textContent();
      expect(methodsOutput).toBe('"Hello" not found in array.');
    });
  });
});