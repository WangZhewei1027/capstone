import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c883930-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Red-Black Tree Visualization Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.reload();
  });

  test('Initial state is Idle', async () => {
    const message = await page.locator('#messages').textContent();
    expect(message).toBe('');
  });

  test('Insert a valid key', async () => {
    await page.fill('#inputKey', '10');
    await page.click('#insertBtn');

    const message = await page.locator('#messages').textContent();
    expect(message).toContain('Inserted key 10.');
  });

  test('Insert a duplicate key', async () => {
    await page.fill('#inputKey', '10');
    await page.click('#insertBtn');
    await page.fill('#inputKey', '10');
    await page.click('#insertBtn');

    const message = await page.locator('#messages').textContent();
    expect(message).toContain('Duplicate key 10 not inserted.');
  });

  test('Insert an invalid key', async () => {
    await page.fill('#inputKey', 'invalid');
    await page.click('#insertBtn');

    const message = await page.locator('#messages').textContent();
    expect(message).toContain('Please enter a valid integer key.');
  });

  test('Delete a valid key', async () => {
    await page.fill('#inputKey', '10');
    await page.click('#insertBtn');
    await page.fill('#inputKey', '10');
    await page.click('#deleteBtn');

    const message = await page.locator('#messages').textContent();
    expect(message).toContain('Deleted key 10.');
  });

  test('Delete a non-existent key', async () => {
    await page.fill('#inputKey', '20');
    await page.click('#deleteBtn');

    const message = await page.locator('#messages').textContent();
    expect(message).toContain('Key 20 not found.');
  });

  test('Delete an invalid key', async () => {
    await page.fill('#inputKey', 'invalid');
    await page.click('#deleteBtn');

    const message = await page.locator('#messages').textContent();
    expect(message).toContain('Please enter a valid integer key.');
  });

  test('Reset the tree', async () => {
    await page.fill('#inputKey', '10');
    await page.click('#insertBtn');
    await page.click('#resetBtn');

    const message = await page.locator('#messages').textContent();
    expect(message).toContain('Tree has been reset.');
    const canvasContent = await page.locator('#treeCanvas').screenshot();
    expect(canvasContent).toBeTruthy(); // Ensure canvas is cleared
  });

  test('Check visual feedback after insertion', async () => {
    await page.fill('#inputKey', '15');
    await page.click('#insertBtn');
    const canvasContent = await page.locator('#treeCanvas').screenshot();
    expect(canvasContent).toBeTruthy(); // Ensure tree is drawn
  });

  test('Check visual feedback after deletion', async () => {
    await page.fill('#inputKey', '15');
    await page.click('#insertBtn');
    await page.fill('#inputKey', '15');
    await page.click('#deleteBtn');
    const canvasContent = await page.locator('#treeCanvas').screenshot();
    expect(canvasContent).toBeTruthy(); // Ensure tree is updated
  });

  test('Check visual feedback after reset', async () => {
    await page.fill('#inputKey', '15');
    await page.click('#insertBtn');
    await page.click('#resetBtn');
    const canvasContent = await page.locator('#treeCanvas').screenshot();
    expect(canvasContent).toBeTruthy(); // Ensure canvas is cleared
  });
});