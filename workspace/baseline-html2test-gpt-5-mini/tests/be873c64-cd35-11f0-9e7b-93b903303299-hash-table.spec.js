import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be873c64-cd35-11f0-9e7b-93b903303299.html';

test.describe('Interactive Hash Table Demo (be873c64-cd35-11f0-9e7b-93b903303299)', () => {
  // Collect console messages and page errors for each test run
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for inspection
    page.on('console', msg => {
      consoleMessages.push({type: msg.type(), text: msg.text()});
    });

    // Capture unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app page as-is
    await page.goto(APP_URL);
    // Ensure initial render has happened
    await expect(page.locator('h1')).toHaveText('Interactive Hash Table');
  });

  test.afterEach(async () => {
    // Assert there are no uncaught page errors (ensures runtime loaded cleanly)
    // We intentionally observe page errors and assert none occurred.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);

    // Also fail if any console messages are of error/severity 'error'
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length, `Console errors: ${errorConsoleMessages.map(m => m.text).join('; ')}`).toBe(0);
  });

  test.describe('Initial load and default state', () => {
    test('should render UI elements with expected default values', async ({ page }) => {
      // Verify header and lead paragraph
      await expect(page.locator('h1')).toHaveText('Interactive Hash Table');
      await expect(page.locator('p.lead')).toContainText('Explore how a hash table stores key → value pairs');

      // Default mode select should be present and set to "separate"
      const mode = page.locator('#modeSelect');
      await expect(mode).toHaveValue('separate');

      // Size input default value is 8 and sizeChip should reflect table capacity
      await expect(page.locator('#sizeInput')).toHaveValue('8');
      await expect(page.locator('#sizeChip')).toHaveText('8');

      // Load chip should show 0 / 8 and a load-factor text
      await expect(page.locator('#loadChip')).toContainText('0 / 8');

      // Hash info initial text
      await expect(page.locator('#hashInfo')).toHaveText('Index: —');

      // There should be 8 bucket elements rendered for default capacity
      const buckets = page.locator('#bucketsArea .bucket');
      await expect(buckets).toHaveCount(8);

      // Status area should include mode and entries info
      await expect(page.locator('#statusArea')).toContainText('Mode: Separate chaining');
      await expect(page.locator('#statusArea')).toContainText('Entries: 0');
    });
  });

  test.describe('Basic CRUD operations in separate chaining mode (default)', () => {
    test('insert should add an item and update UI accordingly', async ({ page }) => {
      // Fill key and value then insert
      await page.fill('#keyInput', 'user:42');
      await page.fill('#valueInput', 'Alice');
      await page.click('#insertBtn');

      // Notice should mention insertion and index
      await expect(page.locator('#notice')).toContainText('Inserted key "user:42"');

      // Hash info should show index and raw hash text
      await expect(page.locator('#hashInfo')).toContainText('Index:');

      // Load chip should reflect 1 entry
      await expect(page.locator('#loadChip')).toContainText('1 / 8');

      // Status area should show Entries: 1
      await expect(page.locator('#statusArea')).toContainText('Entries: 1');

      // The bucket at the reported index should contain the key and value
      const hashInfoText = await page.locator('#hashInfo').textContent();
      // Extract the index from "Index: X  (raw hash ...)" or "Index: X"
      const idxMatch = hashInfoText.match(/Index:\s*(\d+)/);
      expect(idxMatch, 'Expected index in hashInfo after insert').not.toBeNull();
      const idx = idxMatch[1];

      const targetBucket = page.locator(`#bucketsArea .bucket[data-idx="${idx}"]`);
      await expect(targetBucket).toContainText('user:42');
      await expect(targetBucket).toContainText('Alice');

      // The UI should visually highlight the bucket (class .highlight)
      await expect(targetBucket).toHaveClass(/highlight/);
    });

    test('updating an existing key should change its value', async ({ page }) => {
      // Ensure the key exists (insert)
      await page.fill('#keyInput', 'user:update');
      await page.fill('#valueInput', 'First');
      await page.click('#insertBtn');
      await expect(page.locator('#notice')).toContainText('Inserted key "user:update"');

      // Update the value and insert again
      await page.fill('#valueInput', 'Second');
      await page.click('#insertBtn');
      await expect(page.locator('#notice')).toContainText('Updated existing key "user:update"');

      // Confirm bucket shows updated value
      const idxText = await page.locator('#hashInfo').textContent();
      const idxMatch1 = idxText.match(/Index:\s*(\d+)/);
      expect(idxMatch).not.toBeNull();
      const idx1 = idxMatch[1];
      const targetBucket1 = page.locator(`#bucketsArea .bucket[data-idx="${idx}"]`);
      await expect(targetBucket).toContainText('user:update');
      await expect(targetBucket).toContainText('Second');
    });

    test('get should locate an existing key and report not found for missing key', async ({ page }) => {
      // Insert known key
      await page.fill('#keyInput', 'fetch:key');
      await page.fill('#valueInput', 'Val');
      await page.click('#insertBtn');
      await expect(page.locator('#notice')).toContainText('Inserted key "fetch:key"');

      // Clear valueInput and click Get (key input remains)
      await page.click('#getBtn');
      await expect(page.locator('#notice')).toContainText('Found "fetch:key"');

      // Now try a missing key
      await page.fill('#keyInput', 'missing:key');
      await page.click('#getBtn');
      await expect(page.locator('#notice')).toContainText('Key "missing:key" not found');
      // Hash info should show the index where it would map
      await expect(page.locator('#hashInfo')).toContainText('Index:');
    });

    test('delete should remove an existing key and update UI', async ({ page }) => {
      // Insert then delete
      await page.fill('#keyInput', 'to:delete');
      await page.fill('#valueInput', 'bye');
      await page.click('#insertBtn');
      await expect(page.locator('#notice')).toContainText('Inserted key "to:delete"');

      // Delete it
      await page.click('#delBtn');
      await expect(page.locator('#notice')).toContainText('Removed key "to:delete".');

      // Ensure entries count decreased (Entries should not contain the deleted key)
      await expect(page.locator('#statusArea')).not.toContainText('to:delete');
    });
  });

  test.describe('Controls: populate, reset, clear, rehash, explain', () => {
    test('populate sample should add several items and update load/entries', async ({ page }) => {
      // Click populate
      await page.click('#populateBtn');
      await expect(page.locator('#notice')).toContainText('Populated with');

      // There should be at least one non-empty bucket
      const nonEmptyItems = page.locator('#bucketsArea .bucket .item.kv');
      await expect(nonEmptyItems.first()).toBeVisible();

      // Entries in status should be > 0
      await expect(page.locator('#statusArea')).toContainText('Entries:');
    });

    test('reset should recreate the table with chosen size', async ({ page }) => {
      // Change size input to 6 then reset
      await page.fill('#sizeInput', '6');
      await page.click('#resetBtn');

      // Notice should confirm reset
      await expect(page.locator('#notice')).toContainText('Table reset to 6 buckets');

      // Capacity indicators should reflect new size
      await expect(page.locator('#sizeChip')).toHaveText('6');
      await expect(page.locator('#bucketsArea .bucket')).toHaveCount(6);

      // hashInfo should be reset to default marker
      await expect(page.locator('#hashInfo')).toHaveText('Index: —');
    });

    test('force resize (rehash) should double capacity', async ({ page }) => {
      // Read current capacity
      const before = parseInt(await page.locator('#sizeChip').textContent(), 10);

      // Click rehash
      await page.click('#rehashBtn');
      await expect(page.locator('#notice')).toContainText('Forced resize');

      // Capacity should have doubled
      const after = parseInt(await page.locator('#sizeChip').textContent(), 10);
      expect(after).toBeGreaterThanOrEqual(before * 2);
    });

    test('clear should remove all entries and set count to 0', async ({ page }) => {
      // Ensure at least one entry exists
      await page.fill('#keyInput', 'clear:key');
      await page.fill('#valueInput', 'x');
      await page.click('#insertBtn');
      await expect(page.locator('#statusArea')).toContainText('Entries:');

      // Click clear and assert entries cleared
      await page.click('#clearBtn');
      await expect(page.locator('#notice')).toHaveText('Cleared all entries.');
      await expect(page.locator('#statusArea')).toContainText('Entries: 0');
    });

    test('explain button updates the explanation panel', async ({ page }) => {
      // Click explain
      await page.click('#explainBtn');

      // The explain area should now contain a strong heading about hash function
      await expect(page.locator('#explainArea')).toContainText('Hash function used');
    });
  });

  test.describe('Linear probing mode specifics', () => {
    test('switching to linear mode re-renders buckets as slots', async ({ page }) => {
      // Switch mode to linear
      await page.selectOption('#modeSelect', 'linear');
      await expect(page.locator('#notice')).toContainText('Switched mode to linear');

      // Status area should reflect Linear probing mode
      await expect(page.locator('#statusArea')).toContainText('Mode: Linear probing');

      // Buckets should now present slots (still equal to capacity count)
      const capacity = parseInt(await page.locator('#sizeChip').textContent(), 10);
      await expect(page.locator('#bucketsArea .bucket')).toHaveCount(capacity);
    });

    test('probe sequence is shown for typed key in linear mode', async ({ page }) => {
      // Ensure linear mode
      await page.selectOption('#modeSelect', 'linear');
      // Type a key to trigger live probe sequence calculation
      await page.fill('#keyInput', 'probe:key');
      // probeSeq should show a sequence start immediately
      await expect(page.locator('#probeSeq')).toContainText('Probe sequence:');

      // There should be visible probe sequence text
      const seqText = await page.locator('#probeSeq').textContent();
      expect(seqText).toMatch(/Probe sequence:\s*#\d+/);
    });

    test('deleting an item in linear mode produces a tombstone marker', async ({ page }) => {
      // Set a small table size to keep things deterministic and reset
      await page.fill('#sizeInput', '4');
      await page.click('#resetBtn');

      // Switch to linear mode and insert a key
      await page.selectOption('#modeSelect', 'linear');
      await page.fill('#keyInput', 'tomb:key');
      await page.fill('#valueInput', '1');
      await page.click('#insertBtn');
      await expect(page.locator('#notice')).toContainText('Inserted key "tomb:key"');

      // Delete the key
      await page.click('#delBtn');
      await expect(page.locator('#notice')).toContainText('Removed key "tomb:key".');

      // After deletion, in linear mode a tombstone element should be visible somewhere
      await expect(page.locator('.tomb')).toBeVisible();
      await expect(page.locator('.tomb')).toContainText('tombstone');
    });
  });

  test.describe('Accessibility and keyboard interactions', () => {
    test('pressing Enter in inputs triggers insert (keyboard sugar)', async ({ page }) => {
      // Use keyboard Enter on key input
      await page.fill('#keyInput', 'enter:key1');
      await page.fill('#valueInput', 'value1');

      // Press Enter while focused in valueInput to submit
      await page.focus('#valueInput');
      await page.keyboard.press('Enter');

      // Insert action should have happened
      await expect(page.locator('#notice')).toContainText('Inserted key "enter:key1"');

      // Now test Enter from key input also triggers insert
      await page.fill('#keyInput', 'enter:key2');
      await page.fill('#valueInput', 'value2');
      await page.focus('#keyInput');
      await page.keyboard.press('Enter');
      await expect(page.locator('#notice')).toContainText('Inserted key "enter:key2"');
    });
  });
});