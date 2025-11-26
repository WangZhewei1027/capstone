import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fdbc70-ca67-11f0-a3d6-179b5eb5e89b.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Heap (Min/Max) Demo Tests', () => {
  
  test('Initial state is Idle', async ({ page }) => {
    const heapArray = await page.locator('#heapArray').innerText();
    expect(heapArray).toBe('(empty)');
    const logContent = await page.locator('#log').innerText();
    expect(logContent).toBe('');
  });

  test('Insert a number into the heap', async ({ page }) => {
    await page.fill('#numInput', '10');
    await page.click('#insertBtn');

    const heapArray = await page.locator('#heapArray').innerText();
    expect(heapArray).toBe('[ 10 ]');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Inserted 10');
  });

  test('Insert multiple numbers and validate heap structure', async ({ page }) => {
    await page.fill('#numInput', '20');
    await page.click('#insertBtn');
    await page.fill('#numInput', '5');
    await page.click('#insertBtn');
    await page.fill('#numInput', '15');
    await page.click('#insertBtn');

    const heapArray = await page.locator('#heapArray').innerText();
    expect(heapArray).toBe('[ 5, 20, 15 ]');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Inserted 20');
    expect(logContent).toContain('Inserted 5');
    expect(logContent).toContain('Inserted 15');
  });

  test('Extract the top value from the heap', async ({ page }) => {
    await page.fill('#numInput', '30');
    await page.click('#insertBtn');
    await page.fill('#numInput', '10');
    await page.click('#insertBtn');
    await page.click('#extractBtn');

    const heapArray = await page.locator('#heapArray').innerText();
    expect(heapArray).toBe('[ 10, 30 ]');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Extracted top value: 5');
  });

  test('Clear the heap', async ({ page }) => {
    await page.fill('#numInput', '25');
    await page.click('#insertBtn');
    await page.click('#clearBtn');

    const heapArray = await page.locator('#heapArray').innerText();
    expect(heapArray).toBe('(empty)');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Heap cleared');
  });

  test('Switch from Min Heap to Max Heap', async ({ page }) => {
    await page.fill('#numInput', '10');
    await page.click('#insertBtn');
    await page.fill('#numInput', '20');
    await page.click('#insertBtn');
    await page.click('#switchBtn');

    const heapArray = await page.locator('#heapArray').innerText();
    expect(heapArray).toBe('[ 20, 10 ]');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Switched to Max Heap');
  });

  test('Edge case: Extract from an empty heap', async ({ page }) => {
    await page.click('#extractBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Heap empty: nothing to extract');
  });

  test('Edge case: Insert invalid input', async ({ page }) => {
    await page.fill('#numInput', 'abc');
    await page.click('#insertBtn');

    const heapArray = await page.locator('#heapArray').innerText();
    expect(heapArray).toBe('(empty)'); // No change in heap

    const logContent = await page.locator('#log').innerText();
    expect(logContent).not.toContain('Inserted');
  });

  test('Edge case: Clear an already empty heap', async ({ page }) => {
    await page.click('#clearBtn');

    const heapArray = await page.locator('#heapArray').innerText();
    expect(heapArray).toBe('(empty)');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Heap cleared');
  });
});