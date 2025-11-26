import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1cc2f1-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Hash Table Interactive Demo', () => {
  
  test('should initialize with correct default values', async ({ page }) => {
    const entries = await page.locator('#statEntries').innerText();
    const capacity = await page.locator('#statCapacity').innerText();
    const loadFactor = await page.locator('#statLF').innerText();
    const collisions = await page.locator('#statCollisions').innerText();
    
    expect(entries).toBe('0');
    expect(capacity).toBe('8');
    expect(loadFactor).toBe('0.00');
    expect(collisions).toBe('0');
  });

  test('should show error when inserting with empty key', async ({ page }) => {
    await page.click('#putBtn');
    const notice = await page.locator('#notice').innerText();
    expect(notice).toBe('Please provide a key.');
  });

  test('should insert a new key-value pair', async ({ page }) => {
    await page.fill('#keyInput', 'apple');
    await page.fill('#valueInput', 'fruit');
    await page.click('#putBtn');

    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Inserted key "apple"');
    
    const entries = await page.locator('#statEntries').innerText();
    expect(entries).toBe('1');
  });

  test('should update an existing key', async ({ page }) => {
    await page.fill('#keyInput', 'apple');
    await page.fill('#valueInput', 'green fruit');
    await page.click('#putBtn');

    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Updated key "apple"');
    
    const entries = await page.locator('#statEntries').innerText();
    expect(entries).toBe('1');
  });

  test('should retrieve an existing key', async ({ page }) => {
    await page.fill('#keyInput', 'apple');
    await page.click('#getBtn');

    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Found key "apple" → green fruit');
  });

  test('should show not found message for a non-existing key', async ({ page }) => {
    await page.fill('#keyInput', 'banana');
    await page.click('#getBtn');

    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Key "banana" not found.');
  });

  test('should remove an existing key', async ({ page }) => {
    await page.fill('#keyInput', 'apple');
    await page.click('#removeBtn');

    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Removed key "apple"');
    
    const entries = await page.locator('#statEntries').innerText();
    expect(entries).toBe('0');
  });

  test('should show not found message when removing a non-existing key', async ({ page }) => {
    await page.fill('#keyInput', 'banana');
    await page.click('#removeBtn');

    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Key "banana" not found; nothing removed.');
  });

  test('should show error when checking contains with empty key', async ({ page }) => {
    await page.click('#containsBtn');
    const notice = await page.locator('#notice').innerText();
    expect(notice).toBe('Please provide a key.');
  });

  test('should confirm existence of a key', async ({ page }) => {
    await page.fill('#keyInput', 'apple');
    await page.click('#containsBtn');

    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Yes: key "apple" is present.');
  });

  test('should show not found message for a non-existing key in contains check', async ({ page }) => {
    await page.fill('#keyInput', 'banana');
    await page.click('#containsBtn');

    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('No: key "banana" not found.');
  });

  test('should insert random key-value pairs', async ({ page }) => {
    await page.click('#randomBtn');
    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Inserted key');
    
    const entries = await page.locator('#statEntries').innerText();
    expect(parseInt(entries)).toBeGreaterThan(0);
  });

  test('should fill the hash table with 40 entries', async ({ page }) => {
    await page.click('#fillBtn');
    await page.waitForTimeout(2000); // Wait for filling to complete

    const entries = await page.locator('#statEntries').innerText();
    expect(parseInt(entries)).toBeGreaterThanOrEqual(40);
  });

  test('should clear the hash table', async ({ page }) => {
    await page.click('#clearBtn');
    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Cleared table.');

    const entries = await page.locator('#statEntries').innerText();
    expect(entries).toBe('0');
  });

  test('should change the initial capacity', async ({ page }) => {
    await page.fill('#capacityInput', '16');
    await page.dispatchEvent('#capacityInput', 'change');
    
    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Capacity set to 16.');

    const capacity = await page.locator('#statCapacity').innerText();
    expect(capacity).toBe('16');
  });

  test('should change the resize threshold', async ({ page }) => {
    await page.fill('#thresholdInput', '1.0');
    await page.dispatchEvent('#thresholdInput', 'change');

    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Threshold set to 1.0.');
  });

  test('should switch the hash function', async ({ page }) => {
    await page.selectOption('#hashSelect', 'sum');
    const notice = await page.locator('#notice').innerText();
    expect(notice).toContain('Hash function switched to sum.');
  });

  test('should show error when trying to insert with empty key', async ({ page }) => {
    await page.fill('#keyInput', '');
    await page.click('#putBtn');
    const notice = await page.locator('#notice').innerText();
    expect(notice).toBe('Please provide a key.');
  });

});