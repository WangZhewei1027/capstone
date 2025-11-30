import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a94-cd36-11f0-b98e-a1744d282049.html';

test.describe('Knapsack Problem Demonstration - E2E', () => {
  // Keep track of page errors and console messages for assertions
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect any uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console messages for inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the app page
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure the app had a chance to initialize
    await page.waitForTimeout(50);
  });

  test.afterEach(async ({ page }) => {
    // Basic sanity: no unexpected page errors occurred
    expect(pageErrors.map(e => String(e))).toEqual([]);
  });

  test('Initial load: default UI elements and state are present', async ({ page }) => {
    // Verify page title and key elements exist
    await expect(page.locator('h1')).toHaveText('Knapsack Problem Demonstration');

    // Default number of items input should be present and default to 5
    const numItems = page.locator('#numItems');
    await expect(numItems).toHaveValue('5');

    // Items table should have tbody rows equal to numItems
    const rows = page.locator('#itemsTable tbody tr');
    await expect(rows).toHaveCount(5);

    // Item cards should reflect same count as rows
    const itemCards = page.locator('#itemList .item-card');
    await expect(itemCards).toHaveCount(5);

    // Result area should show initial message
    await expect(page.locator('#resultText')).toContainText('No run yet.');

    // Log area should be hidden initially
    const logAreaStyle = await page.locator('#logArea').evaluate(el => getComputedStyle(el).display);
    expect(logAreaStyle).toBe('none');

    // Speed input should be present and default to 80
    await expect(page.locator('#speed')).toHaveValue('80');

    // No console errors captured
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  test('Changing number of items via Apply and Enter key updates the table and item cards', async ({ page }) => {
    // Set numItems to 3 and press Enter to trigger apply
    const numItems1 = page.locator('#numItems1');
    await numItems.fill('3');
    await numItems.press('Enter'); // Enter should trigger applyN as wired in the app

    // Wait for DOM updates
    await page.waitForTimeout(50);

    // Confirm table rows and item cards updated to 3
    await expect(page.locator('#itemsTable tbody tr')).toHaveCount(3);
    await expect(page.locator('#itemList .item-card')).toHaveCount(3);

    // Now try using Apply button to change back to 4
    await numItems.fill('4');
    await page.click('#applyN');

    await page.waitForTimeout(50);
    await expect(page.locator('#itemsTable tbody tr')).toHaveCount(4);
    await expect(page.locator('#itemList .item-card')).toHaveCount(4);
  });

  test('Randomize and Clear buttons modify item values and update visual cards', async ({ page }) => {
    // Read a value (first weight/value) to compare after randomize
    const firstW = await page.locator('#itemsTable tbody tr:first-child input.w').inputValue();
    const firstV = await page.locator('#itemsTable tbody tr:first-child input.v').inputValue();

    // Click randomize
    await page.click('#randomize');
    await page.waitForTimeout(50);

    // After randomize, at least one of weight/value for first row should likely differ
    const newW = await page.locator('#itemsTable tbody tr:first-child input.w').inputValue();
    const newV = await page.locator('#itemsTable tbody tr:first-child input.v').inputValue();

    // It's possible (rarely) that random picked the same values; we assert that either changed or other rows changed.
    const anyChanged = (newW !== firstW) || (newV !== firstV);
    if (!anyChanged) {
      // fallback: ensure at least one row differs somewhere
      const rows1 = await page.locator('#itemsTable tbody tr').count();
      let foundDifference = false;
      for (let i = 1; i <= rows; i++) {
        const beforeW = firstW; // not a full snapshot; if randomize produced same for first row, we still check others
        const w = await page.locator(`#itemsTable tbody tr:nth-child(${i}) input.w`).inputValue();
        const v = await page.locator(`#itemsTable tbody tr:nth-child(${i}) input.v`).inputValue();
        // If any value > 0 (randomize always produces >0), consider it changed relative to possible previous cleared zeros
        if (Number(w) > 0 || Number(v) > 0) {
          foundDifference = true;
          break;
        }
      }
      expect(foundDifference).toBe(true);
    }

    // Now click clear - should set all weights and values to 0 and update cards
    await page.click('#clear');
    await page.waitForTimeout(50);

    // Assert that all weight and value inputs are zero
    const rowsCount = await page.locator('#itemsTable tbody tr').count();
    for (let i = 1; i <= rowsCount; i++) {
      const w1 = await page.locator(`#itemsTable tbody tr:nth-child(${i}) input.w1`).inputValue();
      const v1 = await page.locator(`#itemsTable tbody tr:nth-child(${i}) input.v1`).inputValue();
      expect(w).toBe('0');
      expect(v).toBe('0');
    }

    // Item cards should reflect zeros: check text contains 'W: 0' and 'V: 0' and ratio displays '∞' (as implemented)
    const firstCardText = await page.locator('#itemList .item-card').first().innerText();
    expect(firstCardText).toContain('W: 0');
    expect(firstCardText).toContain('V: 0');
    expect(firstCardText).toMatch(/V\/W:\s*∞/);
  });

  test('Explain button shows informational alert dialog', async ({ page }) => {
    // Listen for dialog and assert its message contains expected help text
    let dialogMessage = null;
    page.once('dialog', dialog => {
      dialogMessage = dialog.message();
      dialog.accept();
    });

    await page.click('#explain');

    // Wait a bit for dialog handler
    await page.waitForTimeout(50);

    expect(dialogMessage).toBeTruthy();
    expect(dialogMessage).toContain('Knapsack Problem');
    expect(dialogMessage).toContain('0-1 knapsack');
  });

  test('Run 0-1 DP algorithm (without animation) updates result area and log', async ({ page }) => {
    // Ensure animation is disabled for a quick run
    const animate = page.locator('#animate');
    const isChecked = await animate.isChecked();
    if (isChecked) {
      await animate.click();
    }

    // Ensure algorithm is 0-1 DP
    await page.selectOption('#algorithm', 'dp01');

    // Set capacity to a moderate small value
    await page.fill('#capacity', '12');

    // Click Run
    await page.click('#run');

    // Wait for result area to update - DP run updates resultText asynchronously
    const resultLocator = page.locator('#resultText');

    // Wait up to 5 seconds for algorithm to finish (should be quick without animation)
    await expect(resultLocator).toContainText('Algorithm: 0-1 DP', { timeout: 5000 });

    // Result text should include Total value and Total weight
    await expect(resultLocator).toContainText('Total value');
    await expect(resultLocator).toContainText('Total weight');

    // Log area should be visible after run
    await expect(page.locator('#logArea')).toBeVisible();

    // The DP should have rendered a DP table in the grid wrap
    await expect(page.locator('#gridWrap table.dp-table').first()).toBeVisible();
  });

  test('Run Fractional Greedy shows sorted items and chosen fractions', async ({ page }) => {
    // Choose fractional algorithm
    await page.selectOption('#algorithm', 'fractional');

    // Set some capacity to ensure partial selection may occur
    await page.fill('#capacity', '10');

    // Click Run
    await page.click('#run');

    // Fractional algorithm runs synchronously; wait a short time and assert result
    await page.waitForTimeout(100);

    // Result area should indicate Fractional Greedy
    await expect(page.locator('#resultText')).toContainText('Algorithm: Fractional Greedy');

    // Grid wrap should contain the header about sorted items
    await expect(page.locator('#gridWrap')).toContainText('Items sorted by V/W');
  });

  test('Run Brute Force (exact) computes optimal subset and renders result', async ({ page }) => {
    // Reduce number of items to 4 to keep brute force fast
    await page.fill('#numItems', '4');
    await page.click('#applyN');
    await page.waitForTimeout(50);

    // Ensure animation is disabled to speed up
    const animate1 = page.locator('#animate1');
    if (await animate.isChecked()) await animate.click();

    // Select brute force algorithm
    await page.selectOption('#algorithm', 'bruteforce');

    // Set capacity reasonably
    await page.fill('#capacity', '20');

    // Click Run
    await page.click('#run');

    // Wait for result text to include Brute Force
    await expect(page.locator('#resultText')).toContainText('Algorithm: Brute Force');

    // Grid wrap should render chosen items summary
    await expect(page.locator('#gridWrap')).toContainText('Chosen items');
    // result area should show Total value
    await expect(page.locator('#resultText')).toContainText('Total value');
  });

  test('Double-clicking a table row fills demo values and updates cards', async ({ page }) => {
    // Ensure there is at least one row
    await expect(page.locator('#itemsTable tbody tr')).toHaveCountGreaterThan(0);

    // Read current values of first row
    const wSelector = '#itemsTable tbody tr:first-child input.w';
    const vSelector = '#itemsTable tbody tr:first-child input.v';
    const beforeW1 = await page.locator(wSelector).inputValue();
    const beforeV = await page.locator(vSelector).inputValue();

    // Double click the first row
    await page.locator('#itemsTable tbody tr:first-child').dblclick();

    // Wait for update
    await page.waitForTimeout(50);

    // After dblclick, values should be non-empty and likely different
    const afterW = await page.locator(wSelector).inputValue();
    const afterV = await page.locator(vSelector).inputValue();

    // Since dblclick assigns random positive values, expect numeric and >=1
    expect(Number(afterW)).toBeGreaterThanOrEqual(1);
    expect(Number(afterV)).toBeGreaterThanOrEqual(1);

    // Item card for first card should reflect updated numbers
    const firstCardText1 = await page.locator('#itemList .item-card').first().innerText();
    expect(firstCardText).toContain(`W: ${afterW}`);
    expect(firstCardText).toContain(`V: ${afterV}`);
  });

  test('No unexpected JS errors logged to console during typical interactions', async ({ page }) => {
    // Perform a set of typical interactions quickly
    await page.click('#randomize');
    await page.click('#clear');
    await page.selectOption('#algorithm', 'fractional');
    await page.click('#run');

    // Wait briefly for synchronous fractional run and any logs
    await page.waitForTimeout(100);

    // Check collected pageErrors (should have been asserted in afterEach) and console errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

});