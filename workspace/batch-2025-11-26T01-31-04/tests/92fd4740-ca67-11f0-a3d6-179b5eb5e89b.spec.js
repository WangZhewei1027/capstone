import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fd4740-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Hash Map Demonstration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    // Verify that the application starts in the Idle state
    const message = await page.locator('#message').textContent();
    expect(message).toBe('');
    const output = await page.locator('#output').textContent();
    expect(output).toBe('(Operation results will show here)');
    const mapVisual = await page.locator('#mapVisual').textContent();
    expect(mapVisual).toBe('(empty)');
  });

  test('Add entry with valid key and value', async ({ page }) => {
    // Test adding a new entry to the hash map
    await page.fill('#keyInput', 'key1');
    await page.fill('#valueInput', 'value1');
    await page.click('#addBtn');

    const message = await page.locator('#message').textContent();
    expect(message).toBe('');
    const output = await page.locator('#output').textContent();
    expect(output).toBe('Added/Updated: { "key1": "value1" }');
    const mapVisual = await page.locator('#mapVisual').textContent();
    expect(mapVisual).toContain('key1');
    expect(mapVisual).toContain('value1');
  });

  test('Add entry with empty key', async ({ page }) => {
    // Test adding an entry with an empty key
    await page.fill('#keyInput', '');
    await page.fill('#valueInput', 'value1');
    await page.click('#addBtn');

    const message = await page.locator('#message').textContent();
    expect(message).toBe('Please enter a non-empty key.');
    const output = await page.locator('#output').textContent();
    expect(output).toBe('(Operation results will show here)');
  });

  test('Get value by key with valid key', async ({ page }) => {
    // Test getting a value by a valid key
    await page.fill('#keyInput', 'key1');
    await page.click('#getBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toBe('Value for key "key1": "value1"');
  });

  test('Get value by key with empty key', async ({ page }) => {
    // Test getting a value with an empty key
    await page.fill('#keyInput', '');
    await page.click('#getBtn');

    const message = await page.locator('#message').textContent();
    expect(message).toBe('Please enter a key to get its value.');
    const output = await page.locator('#output').textContent();
    expect(output).toBe('(Operation results will show here)');
  });

  test('Remove entry with valid key', async ({ page }) => {
    // Test removing an entry by a valid key
    await page.fill('#keyInput', 'key1');
    await page.click('#removeBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toBe('Removed key "key1" from the hash map.');
    const mapVisual = await page.locator('#mapVisual').textContent();
    expect(mapVisual).not.toContain('key1');
  });

  test('Remove entry with empty key', async ({ page }) => {
    // Test removing an entry with an empty key
    await page.fill('#keyInput', '');
    await page.click('#removeBtn');

    const message = await page.locator('#message').textContent();
    expect(message).toBe('Please enter a key to remove.');
    const output = await page.locator('#output').textContent();
    expect(output).toBe('(Operation results will show here)');
  });

  test('Clear the hash map', async ({ page }) => {
    // Test clearing the entire hash map
    await page.fill('#keyInput', 'key1');
    await page.fill('#valueInput', 'value1');
    await page.click('#addBtn');
    
    await page.click('#clearBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toBe('Hash map cleared (all entries removed).');
    const mapVisual = await page.locator('#mapVisual').textContent();
    expect(mapVisual).toBe('(empty)');
  });
});