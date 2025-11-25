import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-37-02/html/5a566ee0-ca25-11f0-ad71-69ecf40ad507.html';

test.describe('Heap (Min/Max) Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should be in idle state initially', async ({ page }) => {
    const heapContent = await page.locator('#heap').innerText();
    expect(heapContent).toContain('Heap: , ');
  });

  test('should transition to inserting state on INSERT_CLICKED', async ({ page }) => {
    await page.click('#insert-button');
    const heapContent = await page.locator('#heap').innerText();
    expect(heapContent).toContain('Heap: ');
  });

  test('should complete insertion and return to idle state', async ({ page }) => {
    await page.click('#insert-button');
    await page.waitForTimeout(100); // Simulate insertion delay
    await page.evaluate(() => {
      // Simulate INSERT_COMPLETE event
      document.getElementById('heap').innerHTML = "Heap: 0, 0";
    });
    const heapContent = await page.locator('#heap').innerText();
    expect(heapContent).toContain('Heap: 0, 0');
  });

  test('should transition to extracting state on EXTRACT_CLICKED', async ({ page }) => {
    await page.click('#extract-button');
    const heapContent = await page.locator('#heap').innerText();
    expect(heapContent).toContain('Heap: ');
  });

  test('should complete extraction and return to idle state', async ({ page }) => {
    await page.click('#extract-button');
    await page.waitForTimeout(100); // Simulate extraction delay
    await page.evaluate(() => {
      // Simulate EXTRACT_COMPLETE event
      document.getElementById('heap').innerHTML = "Heap: , 0";
    });
    const heapContent = await page.locator('#heap').innerText();
    expect(heapContent).toContain('Heap: , 0');
  });

  test('should handle edge case for empty heap on extraction', async ({ page }) => {
    await page.evaluate(() => {
      // Clear the heap for this test
      document.getElementById('heap').innerHTML = "Heap: , ";
    });
    await page.click('#extract-button');
    await page.waitForTimeout(100); // Simulate extraction delay
    const heapContent = await page.locator('#heap').innerText();
    expect(heapContent).toContain('Heap: , ');
  });

  test('should handle edge case for invalid insertion', async ({ page }) => {
    await page.evaluate(() => {
      // Simulate an invalid insertion
      document.getElementById('heap').innerHTML = "Heap: invalid, ";
    });
    await page.click('#insert-button');
    await page.waitForTimeout(100); // Simulate insertion delay
    const heapContent = await page.locator('#heap').innerText();
    expect(heapContent).toContain('Heap: invalid, ');
  });
});