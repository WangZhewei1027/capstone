import { test, expect } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fc35d0-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('JavaScript Array Demo Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
  });

  test('Initial state is Idle', async ({ page }) => {
    const arrayDisplay = await page.locator('#arrayDisplay').textContent();
    expect(arrayDisplay).toBe('["apple", "banana", "cherry"]');
  });

  test('Add element to the end of the array', async ({ page }) => {
    await page.fill('#addValue', 'date');
    await page.selectOption('#addPosition', 'end');
    await page.click('#btnAdd');

    const arrayDisplay = await page.locator('#arrayDisplay').textContent();
    expect(arrayDisplay).toBe('["apple", "banana", "cherry", "date"]');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Added "date" to the end.');
  });

  test('Add element to the start of the array', async ({ page }) => {
    await page.fill('#addValue', 'apricot');
    await page.selectOption('#addPosition', 'start');
    await page.click('#btnAdd');

    const arrayDisplay = await page.locator('#arrayDisplay').textContent();
    expect(arrayDisplay).toBe('["apricot", "apple", "banana", "cherry"]');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Added "apricot" to the start.');
  });

  test('Attempt to add an empty element', async ({ page }) => {
    await page.fill('#addValue', '');
    await page.click('#btnAdd');
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toBe('Please enter a value to add.');
    await alertText.dismiss();
  });

  test('Remove element from the end of the array', async ({ page }) => {
    await page.selectOption('#removePosition', 'end');
    await page.click('#btnRemove');

    const arrayDisplay = await page.locator('#arrayDisplay').textContent();
    expect(arrayDisplay).toBe('["apple", "banana"]');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Removed "cherry" from the end.');
  });

  test('Remove element from the start of the array', async ({ page }) => {
    await page.selectOption('#removePosition', 'start');
    await page.click('#btnRemove');

    const arrayDisplay = await page.locator('#arrayDisplay').textContent();
    expect(arrayDisplay).toBe('["banana"]');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Removed "apple" from the start.');
  });

  test('Attempt to remove from an empty array', async ({ page }) => {
    await page.selectOption('#removePosition', 'end');
    await page.click('#btnRemove');
    await page.click('#btnRemove'); // Remove again to empty the array

    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toBe('Array is empty, nothing to remove.');
    await alertText.dismiss();
  });

  test('Find an existing element index', async ({ page }) => {
    await page.fill('#findValue', 'banana');
    await page.click('#btnFind');

    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toBe('"banana" found at index 1.');
    await alertText.dismiss();
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Value "banana" found at index 1.');
  });

  test('Find a non-existing element index', async ({ page }) => {
    await page.fill('#findValue', 'grape');
    await page.click('#btnFind');

    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toBe('"grape" not found in array.');
    await alertText.dismiss();
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Value "grape" not found in array.');
  });

  test('Attempt to find an empty input', async ({ page }) => {
    await page.fill('#findValue', '');
    await page.click('#btnFind');
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toBe('Please enter a value to find.');
    await alertText.dismiss();
  });

  test('Sort the array', async ({ page }) => {
    await page.click('#btnSort');

    const arrayDisplay = await page.locator('#arrayDisplay').textContent();
    expect(arrayDisplay).toBe('["apple", "banana", "cherry"]');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Array sorted.');
  });

  test('Reverse the array', async ({ page }) => {
    await page.click('#btnReverse');

    const arrayDisplay = await page.locator('#arrayDisplay').textContent();
    expect(arrayDisplay).toBe('["cherry", "banana", "apple"]');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Array reversed.');
  });

  test('Clear the array', async ({ page }) => {
    await page.click('#btnClear');

    const arrayDisplay = await page.locator('#arrayDisplay').textContent();
    expect(arrayDisplay).toBe('[]');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Array cleared.');
  });
});