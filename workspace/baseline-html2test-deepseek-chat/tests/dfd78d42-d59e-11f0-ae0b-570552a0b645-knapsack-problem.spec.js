import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d42-d59e-11f0-ae0b-570552a0b645.html';

test.describe('Knapsack Problem Demo (dfd78d42-d59e-11f0-ae0b-570552a0b645)', () => {
  // Helper to attach listeners to capture console errors and page errors for assertions
  async function attachErrorCollectors(page) {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // ignore listener errors
      }
    });

    page.on('pageerror', err => {
      pageErrors.push({ message: err.message, stack: err.stack });
    });

    return { consoleErrors, pageErrors };
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to the page for every test to get a fresh DOM state
    await page.goto(APP_URL);
  });

  test('Initial page load: button is present and output container is empty', async ({ page }) => {
    // Attach error collectors to observe runtime errors during initial load
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);

    // Verify the Run button exists, is visible and enabled
    const runButton = page.locator('button', { hasText: 'Run Knapsack Problem Demo' });
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();

    // Verify the output container exists and is initially empty
    const output = page.locator('#output');
    await expect(output).toBeVisible();
    // innerHTML may contain whitespace; assert trimmed textContent is empty
    const text = (await output.textContent()) || '';
    expect(text.trim()).toBe('');

    // Assert no console.error or page errors occurred on load
    expect(consoleErrors.length, `console.error messages on page load: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `page errors on page load: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Clicking "Run Knapsack Problem Demo" renders expected solution and DP table', async ({ page }) => {
    // Attach error collectors to capture any runtime exceptions from the user action
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);

    // Click the run button to execute knapsackProblem()
    await page.click('button:has-text("Run Knapsack Problem Demo")');

    // The output should now contain the solution heading
    const output = page.locator('#output');
    await expect(output.locator('h3')).toHaveText('Knapsack Problem Solution');

    // Verify Items line shows the correct arrays (weights and values)
    const itemsLine = output.locator('p').nth(0); // first <p> after h3
    await expect(itemsLine).toContainText('Items:');
    await expect(itemsLine).toContainText('Weights = [2,3,4,5]');
    await expect(itemsLine).toContainText('Values = [3,4,5,6]');

    // Verify capacity is shown correctly
    await expect(output).toContainText('Capacity: 5');

    // Verify Maximum Value is correct: expected 7 (items weight 2 and 3 -> value 3 + 4 = 7)
    await expect(output).toContainText('Maximum Value: 7');

    // Verify Selected Items are correct and in the backtracking order: [1,0]
    await expect(output).toContainText('Selected Items (0-indexed):');
    // Strict check for the array string
    await expect(output).toContainText('[1,0]');

    // Verify DP Table header and pre element exist and contain numeric entries (including the final 7)
    const pre = output.locator('pre');
    await expect(pre).toBeVisible();
    const preText = (await pre.textContent()) || '';
    // Should contain row indicators and the computed maximum value
    expect(preText).toContain('0:');
    expect(preText).toContain('1:');
    expect(preText).toContain('2:');
    expect(preText).toContain('3:');
    expect(preText).toContain('4:');
    expect(preText).toContain('  7'); // the max value should appear in DP table

    // Confirm output has exactly the expected number of child elements (h3 + 5 p + pre = 7)
    // Actual HTML structure: <h3>, <p>Items, <p>Capacity, <p>Maximum Value, <p>Selected Items, <p>DP Table, <pre>
    const childCount = await page.$eval('#output', el => el.childElementCount);
    expect(childCount).toBe(7);

    // Ensure no runtime console errors or page errors occurred while running the demo
    expect(consoleErrors.length, `console.error messages during run: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `page errors during run: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Running the demo multiple times is idempotent and does not accumulate DOM nodes', async ({ page }) => {
    // Attach error collectors
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);

    const runButtonSelector = 'button:has-text("Run Knapsack Problem Demo")';
    const outputSelector = '#output';

    // Click the run button the first time
    await page.click(runButtonSelector);
    const firstChildCount = await page.$eval(outputSelector, el => el.childElementCount);
    const firstOutputHTML = await page.$eval(outputSelector, el => el.innerHTML);

    // Click the run button a second time
    await page.click(runButtonSelector);
    const secondChildCount = await page.$eval(outputSelector, el => el.childElementCount);
    const secondOutputHTML = await page.$eval(outputSelector, el => el.innerHTML);

    // The DOM should be replaced (innerHTML set), not appended — child count should remain the same
    expect(secondChildCount).toBe(firstChildCount);
    // And the content should be identical for a deterministic algorithm
    expect(secondOutputHTML).toBe(firstOutputHTML);

    // No console or page errors should have been emitted during repeated runs
    expect(consoleErrors.length, `console.error messages during repeated runs: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `page errors during repeated runs: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('DP table content matches expected dimensions and values (sanity checks)', async ({ page }) => {
    // Attach collectors
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);

    // Execute the demo
    await page.click('button:has-text("Run Knapsack Problem Demo")');

    // Grab the <pre> content and perform structured checks
    const pre = page.locator('#output pre');
    await expect(pre).toBeVisible();
    const preText = (await pre.textContent()) || '';

    // The DP has n+1 = 5 rows (i = 0..4). Ensure those row labels exist
    for (let i = 0; i <= 4; i++) {
      expect(preText).toContain(`${i}:`);
    }

    // Ensure capacity columns 0..5 are present in header
    for (let w = 0; w <= 5; w++) {
      // Look for the column number somewhere in the header line
      expect(preText).toContain(w.toString());
    }

    // Spot-check a few DP entries:
    // For i=1 (only first item with weight 2, value 3), dp[1][2] should be 3
    // We look for a substring showing "1:(" which is start of row 1, and ensure '  3 ' occurs later in that row.
    const rows = preText.split('\n').map(r => r.trim()).filter(Boolean);
    // rows[0] is header, rows[1] corresponds to i=0, rows[2] -> i=1, etc.
    // Ensure we have at least 6 lines (header + 5 rows)
    expect(rows.length).toBeGreaterThanOrEqual(6);

    const rowForI1 = rows.find(r => r.startsWith('1:('));
    expect(rowForI1).toBeTruthy();
    // rowForI1 should include a '3' as dp[1][2] value; check presence of '3' separated by spaces/padding
    expect(rowForI1).toMatch(/(^|\s)3(\s|$)/);

    // Final sanity: maximum value 7 present in last DP row (i=4)
    const rowForI4 = rows.find(r => r.startsWith('4:(') || r.startsWith('4:'));
    expect(rowForI4).toBeTruthy();
    expect(rowForI4).toContain('7');

    // No runtime errors should have occurred during these checks
    expect(consoleErrors.length, `console.error messages during DP checks: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `page errors during DP checks: ${JSON.stringify(pageErrors)}`).toBe(0);
  });
});