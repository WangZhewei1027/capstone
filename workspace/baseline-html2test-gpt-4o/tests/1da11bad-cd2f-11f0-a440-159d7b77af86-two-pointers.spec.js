import { test, expect } from '@playwright/test';

// Page object model for the Two Pointers page
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetSum');
    this.findButton = page.locator('button', { hasText: 'Find Pairs' });
    this.outputMessage = page.locator('#outputMessage');
    this.pairsRows = page.locator('#pairsTable tr');
  }

  async goto(url) {
    await this.page.goto(url);
  }

  async setArray(value) {
    await this.arrayInput.fill(value);
  }

  async setTarget(value) {
    // Playwright will convert numbers to strings if needed
    await this.targetInput.fill(String(value));
  }

  async clickFind() {
    await this.findButton.click();
  }

  async getOutputText() {
    return (await this.outputMessage.textContent()) ?? '';
  }

  async pairsCount() {
    return await this.pairsRows.count();
  }

  // Returns array of rows, each row is { pair: string, sum: string }
  async getPairs() {
    const count = await this.pairsCount();
    const rows = [];
    for (let i = 0; i < count; i++) {
      const row = this.pairsRows.nth(i);
      const cells = row.locator('td');
      const pairText = (await cells.nth(0).textContent())?.trim() ?? '';
      const sumText = (await cells.nth(1).textContent())?.trim() ?? '';
      rows.push({ pair: pairText, sum: sumText });
    }
    return rows;
  }
}

test.describe('Two Pointers - Find Pair Sum (1da11bad-cd2f-11f0-a440-159d7b77af86)', () => {
  // Arrays to capture console errors and page errors for each test run
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Observe console messages and page errors
    page.on('console', msg => {
      // Capture only runtime console errors for assertion
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    page.on('pageerror', err => {
      // Collect page error objects
      pageErrors.push({
        message: err.message,
        stack: err.stack,
      });
    });

    // Navigate to the provided HTML page exactly as-is
    await page.goto('http://127.0.0.1:5500/workspace/html2test/html/1da11bad-cd2f-11f0-a440-159d7b77af86.html');
  });

  test.afterEach(async () => {
    // After each test, assert that no console 'error' messages or page errors were emitted.
    // This ensures we observed runtime errors (ReferenceError, TypeError, SyntaxError) if any.
    expect(consoleErrors, `Console error messages were observed: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(pageErrors, `Page errors were observed: ${JSON.stringify(pageErrors, null, 2)}`).toHaveLength(0);
  });

  // Test initial page load state and presence of interactive elements
  test('Initial load: inputs, button, output message and table exist and are empty', async ({ page }) => {
    const tp = new TwoPointersPage(page);

    // Verify title is present and page loaded
    await expect(page.locator('h1')).toHaveText('Find Pair Sum using Two Pointers');

    // Verify inputs and button are visible and empty by default
    await expect(tp.arrayInput).toBeVisible();
    await expect(tp.arrayInput).toHaveValue('');
    await expect(tp.targetInput).toBeVisible();
    await expect(tp.targetInput).toHaveValue('');
    await expect(tp.findButton).toBeVisible();
    await expect(tp.outputMessage).toBeVisible();
    // Initially, there should be no pairs in the table
    expect(await tp.pairsCount()).toBe(0);
    // Output message should be empty string initially
    expect(await tp.getOutputText()).toBe('');
  });

  // Test the main happy-path: finds multiple pairs in a sorted array
  test('Finds pairs for array "1, 2, 3, 4, 5" with target 5 and updates DOM accordingly', async ({ page }) => {
    const tp = new TwoPointersPage(page);

    // Fill inputs and trigger the search
    await tp.setArray('1, 2, 3, 4, 5');
    await tp.setTarget('5');
    await tp.clickFind();

    // Expect two pairs: "1 + 4" and "2 + 3" in that order (algorithm appends as found)
    const count = await tp.pairsCount();
    expect(count).toBe(2);

    const pairs = await tp.getPairs();
    // First row should be 1 + 4 = 5
    expect(pairs[0].pair).toBe('1 + 4');
    expect(pairs[0].sum).toBe('5');
    // Second row should be 2 + 3 = 5
    expect(pairs[1].pair).toBe('2 + 3');
    expect(pairs[1].sum).toBe('5');

    // Output message should be cleared when pairs are found
    expect(await tp.getOutputText()).toBe('');
  });

  // Test behavior when no pairs exist for the given sum
  test('Displays "No pairs found with the given sum." when there are no matching pairs', async ({ page }) => {
    const tp = new TwoPointersPage(page);

    // Use an array that cannot produce the target sum
    await tp.setArray('1, 2, 4');
    await tp.setTarget('10');
    await tp.clickFind();

    // No table rows should be present
    expect(await tp.pairsCount()).toBe(0);

    // Output should contain the "No pairs found" message exactly as in the implementation
    expect(await tp.getOutputText()).toBe('No pairs found with the given sum.');
  });

  // Test handling of duplicate elements resulting in multiple valid pairs
  test('Handles duplicates: array "0,0,0,0" with target 0 returns multiple pairs', async ({ page }) => {
    const tp = new TwoPointersPage(page);

    await tp.setArray('0,0,0,0');
    await tp.setTarget('0');
    await tp.clickFind();

    // Expect two pairs: 0+0 and 0+0
    expect(await tp.pairsCount()).toBe(2);
    const pairs = await tp.getPairs();
    expect(pairs[0].pair).toBe('0 + 0');
    expect(pairs[0].sum).toBe('0');
    expect(pairs[1].pair).toBe('0 + 0');
    expect(pairs[1].sum).toBe('0');

    // No output message when pairs exist
    expect(await tp.getOutputText()).toBe('');
  });

  // Test that the search clears previous results each time
  test('Clears previous results when searching again', async ({ page }) => {
    const tp = new TwoPointersPage(page);

    // First search: produces pairs
    await tp.setArray('1,2,3,4,5');
    await tp.setTarget('5');
    await tp.clickFind();
    expect(await tp.pairsCount()).toBe(2);

    // Second search: different data with no pairs
    await tp.setArray('10,20,30');
    await tp.setTarget('5');
    await tp.clickFind();

    // Expect previous rows removed and new result shows "No pairs..."
    expect(await tp.pairsCount()).toBe(0);
    expect(await tp.getOutputText()).toBe('No pairs found with the given sum.');
  });

  // Test handling of malformed / non-numeric input gracefully
  test('Non-numeric array input does not crash the page and reports no pairs', async ({ page }) => {
    const tp = new TwoPointersPage(page);

    // Provide alphabetic values where parseInt will yield NaN
    await tp.setArray('a, b, c');
    await tp.setTarget('5');
    await tp.clickFind();

    // The code should finish without throwing, and no pairs should be found
    expect(await tp.pairsCount()).toBe(0);
    expect(await tp.getOutputText()).toBe('No pairs found with the given sum.');
  });

  // Accessibility / interactivity check: button is focusable and clickable
  test('Find button is focusable and can be triggered via click', async ({ page }) => {
    const tp = new TwoPointersPage(page);

    await tp.setArray('1,2,3');
    await tp.setTarget('4');

    // Focus the button (accessibility) then click
    await tp.findButton.focus();
    await expect(tp.findButton).toBeFocused();

    await tp.clickFind();

    // Expect to find the pair 1 + 3 = 4
    const rows = await tp.getPairs();
    expect(rows.length).toBe(1);
    expect(rows[0].pair).toBe('1 + 3');
    expect(rows[0].sum).toBe('4');
  });
});