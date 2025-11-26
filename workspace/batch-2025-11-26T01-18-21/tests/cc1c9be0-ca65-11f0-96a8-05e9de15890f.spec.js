import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1c9be0-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Queue Visualization Application Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state should be idle', async () => {
    const size = await page.locator('#size').innerText();
    expect(size).toBe('0');
  });

  test('Enqueue an item', async () => {
    await page.fill('#itemInput', 'Item1');
    await page.click('#enqueueBtn');
    const size = await page.locator('#size').innerText();
    expect(size).toBe('1');
    const logText = await page.locator('#log p').first().innerText();
    expect(logText).toContain('Enqueued: Item1');
  });

  test('Enqueue an empty item should show error', async () => {
    await page.fill('#itemInput', '');
    await page.click('#enqueueBtn');
    const logText = await page.locator('#log p').last().innerText();
    expect(logText).toContain('Cannot enqueue empty string');
  });

  test('Dequeue an item', async () => {
    await page.click('#dequeueBtn');
    const size = await page.locator('#size').innerText();
    expect(size).toBe('0');
    const logText = await page.locator('#log p').last().innerText();
    expect(logText).toContain('Dequeued: Item1');
  });

  test('Dequeue from an empty queue should show error', async () => {
    await page.click('#dequeueBtn');
    const logText = await page.locator('#log p').last().innerText();
    expect(logText).toContain('Dequeue attempted on empty queue');
  });

  test('Peek at the front item', async () => {
    await page.fill('#itemInput', 'Item2');
    await page.click('#enqueueBtn');
    await page.click('#peekBtn');
    const logText = await page.locator('#log p').last().innerText();
    expect(logText).toContain('Peek: Item2');
  });

  test('Bulk add items', async () => {
    await page.click('#bulkBtn');
    const size = await page.locator('#size').innerText();
    expect(size).toBe('3'); // Assuming bulk add adds 3 items
  });

  test('Switch implementation to Array', async () => {
    await page.selectOption('#implSelect', 'array');
    const implBadge = await page.locator('#implBadge').innerText();
    expect(implBadge).toBe('Array');
  });

  test('Change capacity for Circular implementation', async () => {
    await page.selectOption('#implSelect', 'circular');
    await page.fill('#capacity', '4');
    await page.click('#capacity');
    const logText = await page.locator('#log p').last().innerText();
    expect(logText).toContain('Circular capacity set to 4');
  });

  test('Clear the queue', async () => {
    await page.click('#clearBtn');
    const size = await page.locator('#size').innerText();
    expect(size).toBe('0');
    const logText = await page.locator('#log p').last().innerText();
    expect(logText).toContain('Queue cleared');
  });

  test('Auto enqueue items', async () => {
    await page.click('#autoToggle');
    await page.waitForTimeout(1000); // Wait for auto enqueue to trigger
    const size = await page.locator('#size').innerText();
    expect(Number(size)).toBeGreaterThan(0); // Check if items were enqueued
    await page.click('#autoToggle'); // Stop auto enqueue
  });

  test('Remove an item by clicking on it', async () => {
    await page.fill('#itemInput', 'Item3');
    await page.click('#enqueueBtn');
    await page.click('#visual .cell'); // Click the first cell to remove
    const size = await page.locator('#size').innerText();
    expect(size).toBe('0');
    const logText = await page.locator('#log p').last().innerText();
    expect(logText).toContain('Removed element at index 0');
  });

  test('Enqueue to full Circular Queue', async () => {
    await page.fill('#capacity', '1'); // Set capacity to 1
    await page.fill('#itemInput', 'Item4');
    await page.click('#enqueueBtn');
    await page.fill('#itemInput', 'Item5');
    await page.click('#enqueueBtn');
    const logText = await page.locator('#log p').last().innerText();
    expect(logText).toContain('Enqueue failed: queue is full (capacity 1)');
  });
});