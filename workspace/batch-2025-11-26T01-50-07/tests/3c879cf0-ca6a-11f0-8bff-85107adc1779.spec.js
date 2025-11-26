import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c879cf0-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Hash Table Demonstration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state - Idle', async ({ page }) => {
    const message = await page.locator('#message').textContent();
    expect(message).toBe('');
    await expect(page.locator('#hashTable tbody tr')).toHaveCount(10); // Expect 10 buckets
  });

  test('Insert key-value pair successfully', async ({ page }) => {
    await page.fill('#key', 'testKey');
    await page.fill('#value', 'testValue');
    await page.click('button[type="submit"]');

    const message = await page.locator('#message').textContent();
    expect(message).toContain('Inserted key "testKey" with value "testValue".');

    const tableContent = await page.locator('#hashTable tbody').innerHTML();
    expect(tableContent).toContain('testKey: testValue');
  });

  test('Update existing key', async ({ page }) => {
    await page.fill('#key', 'testKey');
    await page.fill('#value', 'newValue');
    await page.click('button[type="submit"]');

    const message = await page.locator('#message').textContent();
    expect(message).toContain('Updated key "testKey" with new value "newValue".');

    const tableContent = await page.locator('#hashTable tbody').innerHTML();
    expect(tableContent).toContain('testKey: newValue');
  });

  test('Insert with empty key', async ({ page }) => {
    await page.fill('#key', '');
    await page.fill('#value', 'someValue');
    await page.click('button[type="submit"]');

    const message = await page.locator('#message').textContent();
    expect(message).toBe('Key cannot be empty.');
  });

  test('Lookup existing key', async ({ page }) => {
    await page.fill('#lookupKey', 'testKey');
    await page.click('#lookupBtn');

    const message = await page.locator('#message').textContent();
    expect(message).toContain('Value for key "testKey": "newValue".');
  });

  test('Lookup non-existing key', async ({ page }) => {
    await page.fill('#lookupKey', 'nonExistentKey');
    await page.click('#lookupBtn');

    const message = await page.locator('#message').textContent();
    expect(message).toBe('Key "nonExistentKey" not found.');
  });

  test('Lookup with empty key', async ({ page }) => {
    await page.fill('#lookupKey', '');
    await page.click('#lookupBtn');

    const message = await page.locator('#message').textContent();
    expect(message).toBe('Please enter a key to lookup.');
  });

  test('Delete existing key', async ({ page }) => {
    await page.fill('#lookupKey', 'testKey');
    await page.click('#deleteBtn');

    const message = await page.locator('#message').textContent();
    expect(message).toContain('Key "testKey" deleted successfully.');

    const tableContent = await page.locator('#hashTable tbody').innerHTML();
    expect(tableContent).not.toContain('testKey:');
  });

  test('Delete non-existing key', async ({ page }) => {
    await page.fill('#lookupKey', 'nonExistentKey');
    await page.click('#deleteBtn');

    const message = await page.locator('#message').textContent();
    expect(message).toBe('Key "nonExistentKey" not found. Cannot delete.');
  });

  test('Delete with empty key', async ({ page }) => {
    await page.fill('#lookupKey', '');
    await page.click('#deleteBtn');

    const message = await page.locator('#message').textContent();
    expect(message).toBe('Please enter a key to delete.');
  });

  test('Success message acknowledgment', async ({ page }) => {
    await page.fill('#key', 'acknowledgeKey');
    await page.fill('#value', 'acknowledgeValue');
    await page.click('button[type="submit"]');

    const message = await page.locator('#message').textContent();
    expect(message).toContain('Inserted key "acknowledgeKey" with value "acknowledgeValue".');

    await page.click('button[type="submit"]'); // Acknowledge the message
    const newMessage = await page.locator('#message').textContent();
    expect(newMessage).toBe('');
  });

  test('Error message acknowledgment', async ({ page }) => {
    await page.fill('#key', '');
    await page.fill('#value', 'someValue');
    await page.click('button[type="submit"]');

    const message = await page.locator('#message').textContent();
    expect(message).toBe('Key cannot be empty.');

    await page.click('button[type="submit"]'); // Acknowledge the message
    const newMessage = await page.locator('#message').textContent();
    expect(newMessage).toBe('');
  });
});