import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1cea00-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Hash Map Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should render initial state correctly', async ({ page }) => {
    const buckets = await page.locator('#buckets').evaluate(el => el.innerHTML);
    expect(buckets).toContain('(empty)');
    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('HashMap visualizer ready');
  });

  test('should put a key-value pair', async ({ page }) => {
    await page.fill('#key', 'apple');
    await page.fill('#value', 'fruit');
    await page.click('#putBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Inserted "apple" -> "fruit"');
    const buckets = await page.locator('#buckets').innerHTML();
    expect(buckets).toContain('apple');
  });

  test('should get a value by key', async ({ page }) => {
    await page.fill('#key', 'apple');
    await page.click('#getBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Found "apple" -> "fruit"');
  });

  test('should not get a value if key is empty', async ({ page }) => {
    await page.click('#getBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Key required');
  });

  test('should remove a key-value pair', async ({ page }) => {
    await page.fill('#key', 'apple');
    await page.click('#removeBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Removed "apple" from bucket');
  });

  test('should clear all entries', async ({ page }) => {
    await page.click('#clearBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Cleared map.');
    const buckets = await page.locator('#buckets').innerHTML();
    expect(buckets).toContain('(empty)');
  });

  test('should handle error when putting without key', async ({ page }) => {
    await page.fill('#value', 'fruit');
    await page.click('#putBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Key required');
  });

  test('should handle error when removing without key', async ({ page }) => {
    await page.click('#removeBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Key required');
  });

  test('should insert random key-value pair', async ({ page }) => {
    await page.click('#randomBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toMatch(/Random insert: \w{6} -> \w{6}/);
  });

  test('should fill to resize and handle collisions', async ({ page }) => {
    await page.click('#fillBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Inserted multiple keys to produce collisions/resizes.');
  });

  test('should rebuild the hash map', async ({ page }) => {
    await page.click('#rebuildBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Rebuilt map with current settings.');
  });

  test('should toggle internals visibility', async ({ page }) => {
    await page.click('#toggleInternals');
    const buckets = await page.locator('#buckets').innerHTML();
    expect(buckets).toContain('occupied'); // Assuming internals are shown
  });

  test('should toggle step mode', async ({ page }) => {
    await page.click('#stepMode');
    const stepModeText = await page.locator('#stepMode').innerText();
    expect(stepModeText).toContain('On');
  });

  test('should change collision strategy', async ({ page }) => {
    await page.selectOption('#strategy', 'probing');
    const modeLabel = await page.locator('#modeLabel').innerText();
    expect(modeLabel).toContain('Linear Probing');
  });

  test('should change initial capacity', async ({ page }) => {
    await page.fill('#capacity', '16');
    await page.click('#rebuildBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Rebuilt map with current settings.');
  });

  test('should toggle resize enabled', async ({ page }) => {
    await page.check('#resizeToggle', { checked: false });
    const isChecked = await page.isChecked('#resizeToggle');
    expect(isChecked).toBe(false);
  });

  test('should change load factor threshold', async ({ page }) => {
    await page.fill('#threshold', '0.5');
    await page.click('#rebuildBtn');

    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('Rebuilt map with current settings.');
  });
});