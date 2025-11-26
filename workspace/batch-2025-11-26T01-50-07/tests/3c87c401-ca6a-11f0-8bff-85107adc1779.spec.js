import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c87c401-ca6a-11f0-8bff-85107adc1779.html';

test.describe('JavaScript Set Demonstration', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    // Reset the application state before each test
    await page.reload();
  });

  test('should start in Idle state', async () => {
    const setSize = await page.locator('#setSize').innerText();
    expect(setSize).toBe('0');
    const logContents = await page.locator('#log').innerText();
    expect(logContents).not.toContain('Added');
  });

  test('should add a new item to the Set', async () => {
    await page.fill('#itemInput', 'apple');
    await page.click('#addButton');

    const setSize = await page.locator('#setSize').innerText();
    expect(setSize).toBe('1');

    const setContents = await page.locator('#setContents').innerText();
    expect(setContents).toContain('apple');

    const logContents = await page.locator('#log').innerText();
    expect(logContents).toContain('Added "apple" to the Set.');
  });

  test('should not add a duplicate item to the Set', async () => {
    await page.fill('#itemInput', 'banana');
    await page.click('#addButton');

    await page.fill('#itemInput', 'banana');
    await page.click('#addButton');

    const setSize = await page.locator('#setSize').innerText();
    expect(setSize).toBe('1');

    const logContents = await page.locator('#log').innerText();
    expect(logContents).toContain('The item "banana" is already in the Set, duplicate not added.');
  });

  test('should clear all items from the Set', async () => {
    await page.fill('#itemInput', 'orange');
    await page.click('#addButton');

    await page.click('#clearButton');

    const setSize = await page.locator('#setSize').innerText();
    expect(setSize).toBe('0');

    const setContents = await page.locator('#setContents').innerText();
    expect(setContents).not.toContain('orange');

    const logContents = await page.locator('#log').innerText();
    expect(logContents).toContain('Cleared all items from the Set.');
  });

  test('should handle empty input gracefully', async () => {
    await page.click('#addButton');

    const logContents = await page.locator('#log').innerText();
    expect(logContents).toContain('No input entered or empty string, nothing added.');
  });

  test('should handle clearing the Set when already empty', async () => {
    await page.click('#clearButton');

    const setSize = await page.locator('#setSize').innerText();
    expect(setSize).toBe('0');

    const logContents = await page.locator('#log').innerText();
    expect(logContents).toContain('Cleared all items from the Set.');
  });
});