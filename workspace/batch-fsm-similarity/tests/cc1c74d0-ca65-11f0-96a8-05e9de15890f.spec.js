import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1c74d0-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Singly Linked List Visualizer', () => {
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

  test('Initial state is idle', async () => {
    const sizeBadge = await page.locator('#sizeBadge').textContent();
    expect(sizeBadge).toBe('Size: 0');
  });

  test('Prepend operation', async () => {
    await page.fill('#valueInput', 'A');
    await page.click('#prependBtn');

    // Verify the new state after prepend
    const sizeBadge = await page.locator('#sizeBadge').textContent();
    expect(sizeBadge).toBe('Size: 1');
    const firstNode = await page.locator('.node').nth(0).textContent();
    expect(firstNode).toBe('A');
  });

  test('Append operation', async () => {
    await page.fill('#valueInput', 'B');
    await page.click('#appendBtn');

    // Verify the new state after append
    const sizeBadge = await page.locator('#sizeBadge').textContent();
    expect(sizeBadge).toBe('Size: 1');
    const firstNode = await page.locator('.node').nth(0).textContent();
    expect(firstNode).toBe('B');
  });

  test('Insert at index operation', async () => {
    await page.fill('#valueInput', 'C');
    await page.click('#prependBtn'); // Add 'C' first
    await page.fill('#valueInput', 'D');
    await page.fill('#indexInput', '0'); // Insert at head
    await page.click('#insertBtn');

    // Verify the new state after insert
    const sizeBadge = await page.locator('#sizeBadge').textContent();
    expect(sizeBadge).toBe('Size: 2');
    const firstNode = await page.locator('.node').nth(0).textContent();
    expect(firstNode).toBe('D');
  });

  test('Remove by value operation', async () => {
    await page.fill('#valueInput', 'E');
    await page.click('#prependBtn'); // Add 'E'
    await page.fill('#valueInput', 'F');
    await page.click('#prependBtn'); // Add 'F'
    await page.fill('#valueInput', 'E');
    await page.click('#removeValueBtn');

    // Verify the new state after remove by value
    const sizeBadge = await page.locator('#sizeBadge').textContent();
    expect(sizeBadge).toBe('Size: 1');
    const firstNode = await page.locator('.node').nth(0).textContent();
    expect(firstNode).toBe('F');
  });

  test('Remove by index operation', async () => {
    await page.fill('#valueInput', 'G');
    await page.click('#prependBtn'); // Add 'G'
    await page.fill('#valueInput', 'H');
    await page.click('#prependBtn'); // Add 'H'
    await page.fill('#indexInput', '1'); // Remove index 1
    await page.click('#removeIndexBtn');

    // Verify the new state after remove by index
    const sizeBadge = await page.locator('#sizeBadge').textContent();
    expect(sizeBadge).toBe('Size: 1');
    const firstNode = await page.locator('.node').nth(0).textContent();
    expect(firstNode).toBe('G');
  });

  test('Search operation', async () => {
    await page.fill('#valueInput', 'I');
    await page.click('#prependBtn'); // Add 'I'
    await page.fill('#valueInput', 'J');
    await page.click('#prependBtn'); // Add 'J'
    await page.fill('#valueInput', 'I');
    await page.click('#searchBtn');

    // Verify the search result
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Found value at index 1');
  });

  test('Reverse operation', async () => {
    await page.fill('#valueInput', 'K');
    await page.click('#prependBtn'); // Add 'K'
    await page.fill('#valueInput', 'L');
    await page.click('#prependBtn'); // Add 'L'
    await page.click('#reverseBtn');

    // Verify the new state after reverse
    const firstNode = await page.locator('.node').nth(0).textContent();
    expect(firstNode).toBe('K');
  });

  test('Clear operation', async () => {
    await page.fill('#valueInput', 'M');
    await page.click('#prependBtn'); // Add 'M'
    await page.click('#clearBtn');

    // Verify the new state after clear
    const sizeBadge = await page.locator('#sizeBadge').textContent();
    expect(sizeBadge).toBe('Size: 0');
  });

  test('Alert for empty input on prepend', async () => {
    await page.click('#prependBtn');
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toBe('Enter a value');
  });

  test('Alert for invalid index on remove by index', async () => {
    await page.fill('#indexInput', '-1'); // Invalid index
    await page.click('#removeIndexBtn');
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toBe('Enter a valid index');
  });

  test('Alert for empty input on remove by value', async () => {
    await page.click('#removeValueBtn');
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toBe('Enter a value');
  });

  test('Alert for empty input on search', async () => {
    await page.click('#searchBtn');
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toBe('Enter a value');
  });

  test('Alert for clearing with confirmation', async () => {
    await page.fill('#valueInput', 'N');
    await page.click('#prependBtn'); // Add 'N'
    await page.click('#clearBtn');

    // Confirm clearing
    await page.evaluate(() => window.confirm = () => true);
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Clearing list');
  });
});