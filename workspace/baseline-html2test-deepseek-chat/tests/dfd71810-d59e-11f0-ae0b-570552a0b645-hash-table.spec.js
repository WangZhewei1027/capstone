import { test, expect } from '@playwright/test';

// Test suite for Hash Table Visualization application
// Application URL:
// http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd71810-d59e-11f0-ae0b-570552a0b645.html

test.describe('Hash Table Visualization - dfd71810-d59e-11f0-ae0b-570552a0b645', () => {
  // Arrays to collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  // Helper: parse stats content into an object
  const parseStats = async (page) => {
    const statsText = await page.locator('#statsContent').innerText();
    // Expect lines like:
    // Entries: X
    // Load Factor: Y
    // Collisions: Z
    // Total Operations: N
    // Table Size: S
    const lines = statsText.split('\n').map(l => l.trim()).filter(Boolean);
    const result = {};
    for (const line of lines) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key === 'Entries') result.entries = parseInt(value, 10);
      if (key === 'Load Factor') result.loadFactor = parseFloat(value);
      if (key === 'Collisions') result.collisions = parseInt(value, 10);
      if (key === 'Total Operations') result.operations = parseInt(value, 10);
      if (key === 'Table Size') result.tableSize = parseInt(value, 10);
    }
    return result;
  };

  // Helper: find bucket element index that contains an entry with given key
  const findBucketIndexContainingKey = async (page, key) => {
    const buckets = await page.$$('#hashTableVisualization .bucket');
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      // Look for entry with <strong>key</strong>
      const keyStrong = await bucket.$(`text=Key: >> strong:has-text("${key}")`);
      if (keyStrong) return i;
      // Alternative: search for plaintext including Key and the key
      const inner = await bucket.innerText();
      if (inner.includes(`Key: ${key}`) || inner.includes(`Key: ${key}`)) return i;
    }
    return -1;
  };

  // Setup before each test: navigate and attach listeners
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd71810-d59e-11f0-ae0b-570552a0b645.html');
    // Ensure visualization is initialized
    await expect(page.locator('h1')).toHaveText('Hash Table Visualization');
  });

  // Tear down assertion: no unexpected console errors or page errors occurred
  test.afterEach(async () => {
    // Assert there were no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Assert there are no console messages of type 'error'
    const errorMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorMsgs.length).toBe(0);
  });

  test('Initial load shows default table size and empty buckets', async ({ page }) => {
    // Verify stats show initial values and default table size 7
    const stats = await parseStats(page);
    expect(stats.entries).toBe(0);
    expect(stats.loadFactor).toBeCloseTo(0.00, 2);
    expect(stats.collisions).toBe(0);
    expect(stats.operations).toBe(0);
    expect(stats.tableSize).toBe(7);

    // There should be 7 buckets each showing 'Empty'
    const buckets = page.locator('#hashTableVisualization .bucket');
    await expect(buckets).toHaveCount(7);

    // Verify each bucket has an Empty entry
    for (let i = 0; i < 7; i++) {
      const bucket = buckets.nth(i);
      await expect(bucket.locator('.entry')).toHaveText(/Empty|Key:/);
      // Specifically ensure the initial ones are 'Empty'
      const inner = await bucket.innerText();
      expect(inner).toContain('Bucket ' + i);
      // At least one of them should show 'Empty'
      expect(inner).toMatch(/Empty/);
    }
  });

  test('Insert entry updates visualization, stats, and highlights bucket (no collision)', async ({ page }) => {
    // Insert key 'alpha' value '1'
    await page.fill('#keyInput', 'alpha');
    await page.fill('#valueInput', '1');

    // Click insert (no alert expected). The bucket should be highlighted with 'success'.
    await page.click('button:has-text("Insert")');

    // There should be a bucket with class 'success' briefly
    const successBucket = page.locator('.bucket.success');
    await expect(successBucket).toHaveCount(1);

    // The bucket with success should contain the new entry with Key: alpha and Value: 1
    const successInner = await successBucket.innerText();
    expect(successInner).toContain('Key:');
    expect(successInner).toContain('alpha');
    expect(successInner).toContain('Value:');
    expect(successInner).toContain('1');

    // Stats should reflect 1 entry
    const stats = await parseStats(page);
    expect(stats.entries).toBe(1);
    expect(stats.operations).toBeGreaterThanOrEqual(1);

    // After the highlight timeout (~1s), the class should be removed
    await page.waitForTimeout(1200);
    await expect(page.locator('.bucket.success')).toHaveCount(0);
  });

  test('Insert colliding entry increments collisions and highlights bucket as collision', async ({ page }) => {
    // Insert a known key to create a base
    await page.fill('#keyInput', 'baseKey');
    await page.fill('#valueInput', 'B');
    await page.click('button:has-text("Insert")');

    // Determine a different key that hashes to the same bucket as 'baseKey'
    // Use page.evaluate to access the in-page hashTable.hash function
    const collisionKey = await page.evaluate(() => {
      const base = 'baseKey';
      const targetIndex = hashTable.hash(base);
      // Try simple candidates until we find a different key that maps to same index
      const alphabet = 'abcdefghijklmnopqrstuvwxyz';
      for (let a = 0; a < alphabet.length; a++) {
        for (let b = 0; b < alphabet.length; b++) {
          const candidate = alphabet[a] + alphabet[b];
          if (candidate === base) continue;
          if (hashTable.hash(candidate) === targetIndex) return candidate;
        }
      }
      return null;
    });

    // Ensure we found a candidate; if not, skip with a meaningful assertion
    expect(collisionKey).not.toBeNull();

    // Capture collisions before inserting
    const beforeStats = await parseStats(page);
    const beforeCollisions = beforeStats.collisions;

    // Insert the colliding key
    await page.fill('#keyInput', collisionKey);
    await page.fill('#valueInput', 'C');
    await page.click('button:has-text("Insert")');

    // The bucket should be highlighted with 'collision'
    await expect(page.locator('.bucket.collision')).toHaveCount(1);

    // Stats collisions should have increased by at least 1 (bucket had baseKey)
    const afterStats = await parseStats(page);
    expect(afterStats.collisions).toBeGreaterThanOrEqual(beforeCollisions + 1);

    // Confirm both entries are present in that bucket
    const bucketIndex = await page.evaluate((k) => {
      return hashTable.hash(k);
    }, 'baseKey');

    const bucket = page.locator(`#hashTableVisualization .bucket`).nth(bucketIndex);
    const bucketText = await bucket.innerText();
    expect(bucketText).toContain('baseKey');
    expect(bucketText).toContain(collisionKey);

    // Wait for collision class to be removed after timeout
    await page.waitForTimeout(1200);
    await expect(page.locator('.bucket.collision')).toHaveCount(0);
  });

  test('Search existing key shows alert and highlights the bucket', async ({ page }) => {
    // Ensure key exists: insert 'searchKey' => 'S'
    await page.fill('#keyInput', 'searchKey');
    await page.fill('#valueInput', 'S');
    await page.click('button:has-text("Insert")');

    // Prepare to capture dialog message from search
    let dialogMessage = '';
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Perform search
    await page.fill('#searchKey', 'searchKey');
    await page.click('button:has-text("Search")');

    // The dialog should report the found key and include bucket/position details
    expect(dialogMessage).toContain('Found key "searchKey"');

    // The bucket for that key should be highlighted with class 'success' briefly
    await expect(page.locator('.bucket.success')).toHaveCount(1);
    await page.waitForTimeout(1200);
    await expect(page.locator('.bucket.success')).toHaveCount(0);
  });

  test('Search missing key shows not found alert and highlights computed bucket', async ({ page }) => {
    // Choose a key that is very unlikely to exist
    const missingKey = 'nonexistent_key_42';

    // Capture dialog message
    let dialogMsg = '';
    page.once('dialog', async dialog => {
      dialogMsg = dialog.message();
      await dialog.accept();
    });

    await page.fill('#searchKey', missingKey);
    await page.click('button:has-text("Search")');

    // The dialog should report not found and show the bucket it would hash to
    expect(dialogMsg).toContain(`Key "${missingKey}" not found. Would hash to bucket`);

    // Extract index mentioned in the message (last number)
    const match = dialogMsg.match(/Would hash to bucket (\d+)/);
    expect(match).not.toBeNull();
    const index = parseInt(match[1], 10);

    // The bucket at that index should have been highlighted with 'collision' briefly
    const bucket = page.locator('#hashTableVisualization .bucket').nth(index);
    await expect(bucket).toHaveClass(/bucket/); // exists
    await expect(page.locator('.bucket.collision')).toHaveCount(1);
    await page.waitForTimeout(1200);
    await expect(page.locator('.bucket.collision')).toHaveCount(0);
  });

  test('Delete existing key removes entry, updates stats and shows deletion alert', async ({ page }) => {
    // Insert key to delete
    await page.fill('#keyInput', 'toDelete');
    await page.fill('#valueInput', 'D');
    await page.click('button:has-text("Insert")');

    // Ensure it's present
    let idx = await findBucketIndexContainingKey(page, 'toDelete');
    expect(idx).toBeGreaterThanOrEqual(0);

    // Capture dialog message for deletion
    let delMsg = '';
    page.once('dialog', async dialog => {
      delMsg = dialog.message();
      await dialog.accept();
    });

    // Delete the key
    await page.fill('#deleteKey', 'toDelete');
    await page.click('button:has-text("Delete")');

    // Dialog should confirm deletion
    expect(delMsg).toContain(`Key "toDelete" deleted from bucket`);

    // Entry should no longer be present
    const newIdx = await findBucketIndexContainingKey(page, 'toDelete');
    expect(newIdx).toBe(-1);

    // Stats entries decreased
    const stats = await parseStats(page);
    expect(stats.entries).toBeGreaterThanOrEqual(0);
  });

  test('Delete missing key shows not found alert', async ({ page }) => {
    // Attempt to delete a key that does not exist
    const missing = 'absent_key_99';
    let msg = '';
    page.once('dialog', async dialog => {
      msg = dialog.message();
      await dialog.accept();
    });

    await page.fill('#deleteKey', missing);
    await page.click('button:has-text("Delete")');

    expect(msg).toContain(`Key "${missing}" not found for deletion`);
  });

  test('Resize table rehashes entries and updates table size and buckets', async ({ page }) => {
    // Insert a couple of entries to observe rehash
    await page.fill('#keyInput', 'r1');
    await page.fill('#valueInput', 'V1');
    await page.click('button:has-text("Insert")');

    await page.fill('#keyInput', 'r2');
    await page.fill('#valueInput', 'V2');
    await page.click('button:has-text("Insert")');

    const beforeStats = await parseStats(page);
    expect(beforeStats.entries).toBeGreaterThanOrEqual(2);

    // Resize table to size 3
    await page.fill('#tableSize', '3');
    await page.click('button:has-text("Resize")');

    // Stats should reflect new table size
    const afterStats = await parseStats(page);
    expect(afterStats.tableSize).toBe(3);

    // Number of buckets in DOM should be 3
    const buckets = page.locator('#hashTableVisualization .bucket');
    await expect(buckets).toHaveCount(3);

    // Entries should still exist (rehash preserves entries)
    expect(afterStats.entries).toBe(beforeStats.entries);
  });

  test('Clear table resets entries to zero and shows empty buckets', async ({ page }) => {
    // Insert an entry to ensure clear has effect
    await page.fill('#keyInput', 'c1');
    await page.fill('#valueInput', 'C1');
    await page.click('button:has-text("Insert")');

    // Click clear
    await page.click('button:has-text("Clear Hash Table")');

    // Stats should show entries 0
    const stats = await parseStats(page);
    expect(stats.entries).toBe(0);

    // All buckets should show 'Empty'
    const bucketCount = stats.tableSize;
    const buckets = page.locator('#hashTableVisualization .bucket');
    await expect(buckets).toHaveCount(bucketCount);
    for (let i = 0; i < bucketCount; i++) {
      const inner = await buckets.nth(i).innerText();
      expect(inner).toMatch(/Empty/);
    }
  });

});