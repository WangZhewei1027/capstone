import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fd2031-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Hash Table Demonstration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    const message = await page.locator('#message').innerText();
    expect(message).toBe('');
    const tableRows = await page.locator('#hashTableDisplay tbody tr').count();
    expect(tableRows).toBe(0);
  });

  test('Add entry with valid key and value', async ({ page }) => {
    await page.fill('#keyInput', 'key1');
    await page.fill('#valueInput', 'value1');
    await page.click('#addBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Added key "key1" with value "value1".');

    const tableRows = await page.locator('#hashTableDisplay tbody tr').count();
    expect(tableRows).toBe(1);
  });

  test('Update existing entry', async ({ page }) => {
    await page.fill('#keyInput', 'key1');
    await page.fill('#valueInput', 'value1');
    await page.click('#addBtn');

    await page.fill('#valueInput', 'value2');
    await page.click('#addBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Updated key "key1" with new value "value2".');

    const tableContent = await page.locator('#hashTableDisplay tbody').innerText();
    expect(tableContent).toContain('key1 → value2');
  });

  test('Remove entry with valid key', async ({ page }) => {
    await page.fill('#keyInput', 'key1');
    await page.fill('#valueInput', 'value1');
    await page.click('#addBtn');

    await page.fill('#keyInput', 'key1');
    await page.click('#removeBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Removed key "key1" from the hash table.');

    const tableRows = await page.locator('#hashTableDisplay tbody tr').count();
    expect(tableRows).toBe(0);
  });

  test('Attempt to remove non-existing entry', async ({ page }) => {
    await page.fill('#keyInput', 'key1');
    await page.click('#removeBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Key "key1" not found in the hash table.');
  });

  test('Get value by key', async ({ page }) => {
    await page.fill('#keyInput', 'key1');
    await page.fill('#valueInput', 'value1');
    await page.click('#addBtn');

    await page.fill('#keyInput', 'key1');
    await page.click('#getBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Value for key "key1": "value1"');
  });

  test('Attempt to get value for non-existing key', async ({ page }) => {
    await page.fill('#keyInput', 'key1');
    await page.click('#getBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Key "key1" not found in the hash table.');
  });

  test('Clear the hash table', async ({ page }) => {
    await page.fill('#keyInput', 'key1');
    await page.fill('#valueInput', 'value1');
    await page.click('#addBtn');

    await page.click('#clearBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Hash table cleared.');

    const tableRows = await page.locator('#hashTableDisplay tbody tr').count();
    expect(tableRows).toBe(0);
  });

  test('Error when adding entry with empty key', async ({ page }) => {
    await page.fill('#valueInput', 'value1');
    await page.click('#addBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Error: Key cannot be empty.');
  });

  test('Error when adding entry with empty value', async ({ page }) => {
    await page.fill('#keyInput', 'key1');
    await page.click('#addBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Error: Value cannot be empty.');
  });

  test('Error when removing entry with empty key', async ({ page }) => {
    await page.click('#removeBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Error: Key cannot be empty.');
  });

  test('Error when getting value with empty key', async ({ page }) => {
    await page.click('#getBtn');

    const message = await page.locator('#message').innerText();
    expect(message).toContain('Error: Key cannot be empty.');
  });
});