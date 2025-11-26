import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fd4741-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('JavaScript Set Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    const output = await page.locator('#output').innerText();
    expect(output).toContain('Set size: 0');
    expect(output).toContain('Set values:');
    expect(output).toContain('(empty)');
  });

  test('Add unique values to Set', async ({ page }) => {
    const input = page.locator('#inputValues');
    const addButton = page.locator('#addButton');

    await input.fill('apple, banana, apple, 42, 42, hello');
    await addButton.click();

    const output = await page.locator('#output').innerText();
    expect(output).toContain('Set size: 4');
    expect(output).toContain('Set values:');
    expect(output).toContain('  [0]: "apple" (string)');
    expect(output).toContain('  [1]: "banana" (string)');
    expect(output).toContain('  [2]: 42 (number)');
    expect(output).toContain('  [3]: "hello" (string)');
  });

  test('Show error when adding empty input', async ({ page }) => {
    const addButton = page.locator('#addButton');

    await addButton.click();
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toBe('Please enter some values to add.');
    await alertText.dismiss();
  });

  test('Clear the Set', async ({ page }) => {
    const input = page.locator('#inputValues');
    const addButton = page.locator('#addButton');
    const clearButton = page.locator('#clearButton');

    await input.fill('apple, banana');
    await addButton.click();

    await clearButton.click();
    const output = await page.locator('#output').innerText();
    expect(output).toContain('Set size: 0');
    expect(output).toContain('Set values:');
    expect(output).toContain('(empty)');
  });

  test('Add values and check alert for added count', async ({ page }) => {
    const input = page.locator('#inputValues');
    const addButton = page.locator('#addButton');

    await input.fill('apple, banana');
    await addButton.click();

    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toBe('2 unique values added to the Set.');
    await alertText.dismiss();
  });

  test('Add duplicate values and check Set size', async ({ page }) => {
    const input = page.locator('#inputValues');
    const addButton = page.locator('#addButton');

    await input.fill('apple, banana, apple');
    await addButton.click();

    const output = await page.locator('#output').innerText();
    expect(output).toContain('Set size: 2');
    expect(output).toContain('Set values:');
    expect(output).toContain('  [0]: "apple" (string)');
    expect(output).toContain('  [1]: "banana" (string)');
  });

  test('Ensure Set is cleared correctly', async ({ page }) => {
    const input = page.locator('#inputValues');
    const addButton = page.locator('#addButton');
    const clearButton = page.locator('#clearButton');

    await input.fill('apple, banana');
    await addButton.click();
    await clearButton.click();

    const output = await page.locator('#output').innerText();
    expect(output).toContain('Set size: 0');
    expect(output).toContain('Set values:');
    expect(output).toContain('(empty)');
  });
});