import { test, expect } from '@playwright/test';

// Test file: 6e096b04-d5a0-11f0-8040-510e90b1f3a7-hash-table.spec.js
// Purpose: End-to-end tests for the Hash Table Visualization app.
// The tests load the page as-is, interact with UI controls, verify DOM updates,
// handle dialogs (alerts), and assert there are no uncaught page errors.
// Tests are grouped and organized using a small page-object helper.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e096b04-d5a0-11f0-8040-510e90b1f3a7.html';

class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#keyInput');
    this.valueInput = page.locator('#valueInput');
    this.tableSizeInput = page.locator('#tableSize');
    this.insertButton = page.locator('button', { hasText: 'Insert' });
    this.getButton = page.locator('button', { hasText: 'Get Value' });
    this.removeButton = page.locator('button', { hasText: 'Remove' });
    this.clearButton = page.locator('button', { hasText: 'Clear Table' });
    this.resizeButton = page.locator('button', { hasText: 'Resize' });
    this.hashTable = page.locator('#hashTable');
    this.stats = page.locator('#stats');
  }

  async buckets() {
    return this.page.locator('.bucket');
  }

  async bucketHeader(index) {
    return this.page.locator('.bucket').nth(index).locator('.bucket-header');
  }

  async entriesInBucket(index) {
    return this.page.locator('.bucket').nth(index).locator('.entry');
  }

  async allEntries() {
    return this.page.locator('.entry');
  }

  async emptyPlaceholders() {
    return this.page.locator('.bucket').locator('text=Empty');
  }

  async getStatsText() {
    return this.stats.textContent();
  }

  async insert(key, value) {
    await this.keyInput.fill(key);
    await this.valueInput.fill(value);
    await this.insertButton.click();
  }

  async getValueForKey(key) {
    await this.keyInput.fill(key);
    await this.getButton.click();
  }

  async removeKey(key) {
    await this.keyInput.fill(key);
    await this.removeButton.click();
  }

  async clearTable() {
    await this.clearButton.click();
  }

  async resizeTable(size) {
    await this.tableSizeInput.fill(String(size));
    await this.resizeButton.click();
  }

  // read inline style borderColor for the bucket index
  async getBucketBorderColor(index) {
    const bucket = this.page.locator('.bucket').nth(index);
    return bucket.evaluate((el) => {
      // computed style to capture cascaded color values
      return window.getComputedStyle(el).borderColor;
    });
  }
}

test.describe('Hash Table Visualization - end-to-end', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let dialogMessages = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    pageErrors = [];
    consoleErrors = [];
    dialogMessages = [];

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture console messages of type error
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });

    // Capture dialogs (alerts) and accept them; also store their messages for assertions
    page.on('dialog', async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });

    // Navigate to the application
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test ensure no unexpected page errors occurred
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);
    // Also expect no console error messages
    expect(consoleErrors.length, `Unexpected console error messages: ${consoleErrors.map(m => m.text()).join(', ')}`).toBe(0);
  });

  test('Initial load displays correct buckets, sample items, and stats', async ({ page }) => {
    // Purpose: verify the page loads and displays initial sample data and correct stats
    const app = new HashTablePage(page);

    // Expect header and explanation to be present
    await expect(page.locator('h1', { hasText: 'Hash Table Visualization' })).toBeVisible();
    await expect(page.locator('.explanation')).toBeVisible();

    // There should be 7 buckets initially
    const buckets = await app.buckets();
    await expect(buckets).toHaveCount(7);

    // Sample data includes 5 items; verify total entry elements equals 5
    const entries = await app.allEntries();
    await expect(entries).toHaveCount(5);

    // Verify stats text shows Table Size: 7 | Items: 5 | Load Factor: 0.71
    const statsText = await app.getStatsText();
    expect(statsText).toContain('Table Size: 7');
    expect(statsText).toContain('Items: 5');
    // load factor 5/7 = 0.714 -> displayed as 0.71
    expect(statsText).toContain('Load Factor: 0.71');
  });

  test('Insert new key increases item count and highlights correct bucket', async ({ page }) => {
    // Purpose: insert a new key and ensure DOM updates, stats update, and highlight is shown then removed
    const app = new HashTablePage(page);

    // Insert a new key that doesn't exist
    await app.insert('mango', '12');

    // After insert, inputs are cleared
    await expect(app.keyInput).toHaveValue('');
    await expect(app.valueInput).toHaveValue('');

    // Stats should update: Items -> 6
    const statsAfterInsert = await app.getStatsText();
    expect(statsAfterInsert).toContain('Items: 6');
    // Load factor 6/7 = 0.857 -> 0.86
    expect(statsAfterInsert).toContain('Load Factor: 0.86');

    // An entry for mango should be visible somewhere
    const mangoEntry = page.locator('.entry', { hasText: 'mango: 12' });
    await expect(mangoEntry).toBeVisible();

    // The affected bucket should have a greenish border while highlighted.
    // We cannot know the index a priori, compute index by finding the bucket that contains the entry.
    const bucketWithMango = mangoEntry.locator('xpath=ancestor::div[contains(@class,"bucket")]');
    // Immediately after insert, the highlight should be applied (borderColor changes)
    const borderColorDuring = await bucketWithMango.evaluate((el) => window.getComputedStyle(el).borderColor);
    // Highlight uses rgb for #28a745
    expect(borderColorDuring).toMatch(/28,\s*167,\s*69/);

    // Wait for highlight to be removed (should revert after ~2s)
    await page.waitForTimeout(2200);
    const borderColorAfter = await bucketWithMango.evaluate((el) => window.getComputedStyle(el).borderColor);
    // Original style uses #007bff -> rgb(0, 123, 255) in many browsers; match by 0, 123, 255 or fallback to any non-highlight color
    expect(borderColorAfter).not.toMatch(/28,\s*167,\s*69/);
  });

  test('Get existing key shows alert with value and highlights bucket', async ({ page }) => {
    // Purpose: verify getItem triggers an alert with the proper message and highlights bucket
    const app = new HashTablePage(page);

    // Ensure key input is 'apple' by default in markup, but fill anyway
    await app.keyInput.fill('apple');

    // Trigger get (this will cause an alert and highlight)
    await app.getButton.click();

    // One dialog should have been shown with the value for apple
    expect(dialogMessages.length).toBeGreaterThanOrEqual(1);
    const lastDialog = dialogMessages[dialogMessages.length - 1];
    expect(lastDialog).toContain('Key "apple" has value: 10');
    expect(lastDialog).toContain('found in bucket');

    // The alerted bucket should be highlighted; detect the highlighted bucket by border color
    // Identify the bucket that contains 'apple: 10'
    const appleEntry = page.locator('.entry', { hasText: 'apple: 10' });
    await expect(appleEntry).toBeVisible();
    const bucketWithApple = appleEntry.locator('xpath=ancestor::div[contains(@class,"bucket")]');
    const borderColor = await bucketWithApple.evaluate((el) => window.getComputedStyle(el).borderColor);
    expect(borderColor).toMatch(/28,\s*167,\s*69/);

    // Wait for highlight to end and ensure it reverts
    await page.waitForTimeout(2200);
    const borderColorAfter = await bucketWithApple.evaluate((el) => window.getComputedStyle(el).borderColor);
    expect(borderColorAfter).not.toMatch(/28,\s*167,\s*69/);
  });

  test('Remove existing key updates DOM and shows success alert', async ({ page }) => {
    // Purpose: remove a key and verify it is no longer present and stats update
    const app = new HashTablePage(page);

    // Remove 'orange' which exists in sample data
    await app.removeKey('orange');

    // An alert confirming removal should have been shown
    expect(dialogMessages.length).toBeGreaterThanOrEqual(1);
    const lastDialog = dialogMessages[dialogMessages.length - 1];
    expect(lastDialog).toContain('Key "orange" removed successfully');

    // 'orange' entry should no longer be found
    const orangeEntry = page.locator('.entry', { hasText: 'orange: 15' });
    await expect(orangeEntry).toHaveCount(0);

    // Stats should reflect Items: 4 now (from initial 5)
    const stats = await app.getStatsText();
    expect(stats).toContain('Items: 4');
  });

  test('Clear table removes all items and shows confirmation alert', async ({ page }) => {
    // Purpose: test clearTable resets the hash table but keeps the same bucket count
    const app = new HashTablePage(page);

    // Click clear table
    await app.clearTable();

    // It should show an alert 'Hash table cleared!'
    expect(dialogMessages.length).toBeGreaterThanOrEqual(1);
    expect(dialogMessages[dialogMessages.length - 1]).toContain('Hash table cleared!');

    // All buckets should now display 'Empty' placeholders
    const emptyPlaceholders = await app.emptyPlaceholders();
    // There should be one 'Empty' per bucket; buckets count likely 7
    const buckets = await app.buckets();
    await expect(emptyPlaceholders).toHaveCount(await buckets.count());
    // Stats should show Items: 0 and Load Factor: 0.00
    const stats = await app.getStatsText();
    expect(stats).toContain('Items: 0');
    expect(stats).toContain('Load Factor: 0.00');
  });

  test('Resize table rehashes items and updates bucket count', async ({ page }) => {
    // Purpose: change table size and ensure the number of buckets changes and an alert appears
    const app = new HashTablePage(page);

    // Resize to 10
    await app.resizeTable(10);

    // Confirmation alert should be shown
    expect(dialogMessages.length).toBeGreaterThanOrEqual(1);
    expect(dialogMessages[dialogMessages.length - 1]).toContain('Table resized to 10 buckets');

    // There should be 10 bucket elements now
    const buckets = await app.buckets();
    await expect(buckets).toHaveCount(10);

    // Items should still be 5 (sample data rehashed)
    const stats = await app.getStatsText();
    expect(stats).toContain('Items: 5');
  });

  test('Insert with empty key shows validation alert (edge case)', async ({ page }) => {
    // Purpose: ensure validation for empty key triggers alert and no insertion occurs
    const app = new HashTablePage(page);

    // Clear key input and attempt insert
    await app.keyInput.fill('');
    await app.valueInput.fill('999');
    await app.insertButton.click();

    // Expect alert asking for a key
    expect(dialogMessages.length).toBeGreaterThanOrEqual(1);
    expect(dialogMessages[dialogMessages.length - 1]).toContain('Please enter a key');

    // Ensure item count remains unchanged (still 5)
    const stats = await app.getStatsText();
    expect(stats).toContain('Items: 5');
  });

  test('Duplicate insert updates value without increasing item count', async ({ page }) => {
    // Purpose: inserting a key that already exists updates its value but does not increase count
    const app = new HashTablePage(page);

    // Ensure 'apple' exists originally
    const statsBefore = await app.getStatsText();
    expect(statsBefore).toContain('Items: 5');

    // Insert duplicate key 'apple' with new value
    await app.insert('apple', '99');

    // No alert expected for insert; but DOM should update
    const appleEntry = page.locator('.entry', { hasText: 'apple: 99' });
    await expect(appleEntry).toBeVisible();

    // Items count should remain 5
    const statsAfter = await app.getStatsText();
    expect(statsAfter).toContain('Items: 5');
  });

  test('Resizing to small table increases collisions and collision class is applied', async ({ page }) => {
    // Purpose: verify that resizing to a smaller table (e.g., 3) rehashes items and some entries are marked as collisions
    const app = new HashTablePage(page);

    // Resize to 3 to force collisions
    await app.resizeTable(3);

    // Confirm resize alert
    expect(dialogMessages.length).toBeGreaterThanOrEqual(1);
    expect(dialogMessages[dialogMessages.length - 1]).toContain('Table resized to 3 buckets');

    // After resize, check that at least one entry element has the 'collision' class
    // We look for elements whose class includes 'collision'
    const collisionEntries = page.locator('.entry.collision');
    // There should be at least one collision when 5 items distributed into 3 buckets
    await expect(collisionEntries.count()).toBeGreaterThan(0);
  });
});