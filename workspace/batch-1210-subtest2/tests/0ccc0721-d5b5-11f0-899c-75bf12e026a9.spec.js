import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccc0721-d5b5-11f0-899c-75bf12e026a9.html';

test.describe('Merge Sort Visualization - FSM tests (Application ID: 0ccc0721-d5b5-11f0-899c-75bf12e026a9)', () => {
  // Capture console errors and page errors for each test run
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught exceptions from the page
    page.on('pageerror', err => {
      pageErrors.push(err.message || String(err));
    });

    // Navigate to the tested page
    await page.goto(APP_URL);
    // Wait for main elements to be present
    await expect(page.locator('#arrayInput')).toBeVisible();
    await expect(page.locator('#sortBtn')).toBeVisible();
    await expect(page.locator('#visualization')).toBeVisible();
  });

  test.afterEach(async () => {
    // Assert there were no uncaught page errors or console.error messages
    // We observe the page and assert no ReferenceError / SyntaxError / TypeError occurred.
    // If there are any errors, include them in the assertion message for debugging.
    expect(pageErrors.length, `Unexpected page errors: ${JSON.stringify(pageErrors, null, 2)}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console.error messages: ${JSON.stringify(consoleErrors, null, 2)}`).toBe(0);
  });

  test('Initial idle state (S0_Idle) - page initializes bars from default input', async ({ page }) => {
    // This test validates the initial Idle state:
    // - Input contains the default value
    // - Bars are created to match the input numbers
    // - Status area is empty
    // - Sort button is enabled

    const input = page.locator('#arrayInput');
    const sortBtn = page.locator('#sortBtn');
    const status = page.locator('#status');
    const bars = page.locator('#visualization .bar');

    // Verify default input value
    await expect(input).toHaveValue('38,27,43,3,9,82,10');

    // Expect visualization bars to be present and match the number of items in input
    await expect(bars).toHaveCount(7);

    // Verify each bar's dataset.value matches the parsed input numbers
    const values = await page.$$eval('#visualization .bar', bars => bars.map(b => Number(b.dataset.value)));
    expect(values).toEqual([38,27,43,3,9,82,10]);

    // Ensure bars have non-zero heights (visual presence)
    const heights = await page.$$eval('#visualization .bar', bars => bars.map(b => parseFloat(getComputedStyle(b).height)));
    heights.forEach(h => expect(h).toBeGreaterThan(0));

    // Status should be empty on initial idle state
    await expect(status).toHaveText('');

    // Sort button should be enabled in Idle
    await expect(sortBtn).toBeEnabled();
  });

  test('Clicking Sort begins sorting (S1_Sorting) - controls disabled, status updated, and final sorted state (S0_Idle exit actions)', async ({ page }) => {
    // This test validates transition from S0_Idle -> S1_Sorting and back:
    // - Clicking the Sort button sets status to 'Starting merge sort...' immediately
    // - Button and input are disabled while sorting
    // - During sorting, status shows progress (e.g., 'Splitting' or 'Comparing')
    // - After sorting completes, status is 'Array sorted!', controls are re-enabled
    // - All bars are marked as 'sorted' visually and data values are in ascending order

    const input = page.locator('#arrayInput');
    const sortBtn = page.locator('#sortBtn');
    const status = page.locator('#status');

    // Click the Sort button to start sorting
    await sortBtn.click();

    // On enter S1_Sorting: status should be updated immediately
    await expect(status).toHaveText('Starting merge sort...');

    // Button and input should be disabled while sorting
    await expect(sortBtn).toBeDisabled();
    await expect(input).toBeDisabled();

    // During sorting we expect intermediate status updates such as 'Splitting' or 'Comparing'
    // Wait for at least one intermediate message to appear within a reasonable timeout
    await page.waitForFunction(() => {
      const txt = document.getElementById('status')?.textContent || '';
      return txt.includes('Splitting') || txt.includes('Comparing') || txt.includes('Appending');
    }, { timeout: 8000 });

    // Wait for sorting to complete: status becomes 'Array sorted!'
    await page.waitForFunction(() => (document.getElementById('status')?.textContent || '') === 'Array sorted!', { timeout: 30000 });

    // After sorting completes (exit actions), controls should be enabled again
    await expect(sortBtn).toBeEnabled();
    await expect(input).toBeEnabled();

    // All bars should have the 'sorted' class applied
    const sortedCount = await page.$$eval('#visualization .bar.sorted', bars => bars.length);
    const totalBars = await page.$$eval('#visualization .bar', bars => bars.length);
    expect(sortedCount).toBe(totalBars);

    // Verify the values displayed in bars are sorted ascending
    const sortedValues = await page.$$eval('#visualization .bar', bars => bars.map(b => Number(b.dataset.value)));
    const expectedSorted = [...sortedValues].slice().sort((a,b) => a - b);
    expect(sortedValues).toEqual(expectedSorted);
  }, 45000); // increased timeout because visual algorithm uses delays

  test('Edge case: Invalid input triggers alert and does not start sorting', async ({ page }) => {
    // This test verifies error handling:
    // - If user provides invalid input (non-numeric), an alert is shown
    // - Sorting should not start (status should not change to 'Starting merge sort...')
    // - Button should remain enabled

    const input = page.locator('#arrayInput');
    const sortBtn = page.locator('#sortBtn');
    const status = page.locator('#status');

    // Replace input with invalid values
    await input.fill('a,b,c');

    // Listen for dialog event to assert alert is shown
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept(); // close the alert so the page is not blocked
    });

    // Click the Sort button
    await sortBtn.click();

    // Ensure an alert dialog was shown with the expected message
    await page.waitForTimeout(200); // small wait to ensure dialog handler runs
    expect(dialogMessage).toBe('Please enter a valid list of numbers separated by commas.');

    // Sorting should not have started: status should not be 'Starting merge sort...'
    const statusText = await status.textContent();
    expect(statusText).not.toBe('Starting merge sort...');

    // Controls should remain enabled
    await expect(sortBtn).toBeEnabled();
    await expect(input).toBeEnabled();
  });

  test('Re-running sort after completion demonstrates transition back to Idle and repeatability', async ({ page }) => {
    // This test ensures that after the first sort completes (S1 -> S0),
    // clicking Sort again restarts the sorting process and completes successfully.

    const input = page.locator('#arrayInput');
    const sortBtn = page.locator('#sortBtn');
    const status = page.locator('#status');

    // Start first sort
    await sortBtn.click();
    await page.waitForFunction(() => (document.getElementById('status')?.textContent || '') === 'Array sorted!', { timeout: 30000 });

    // Confirm that we are back in Idle (controls enabled)
    await expect(sortBtn).toBeEnabled();
    await expect(input).toBeEnabled();
    await expect(status).toHaveText('Array sorted!');

    // Modify the input to a different set to ensure re-run does real work
    await input.fill('5,1,4,2,3');

    // Start second sort
    await sortBtn.click();

    // Immediately on entering S1_Sorting expect controls to disable and status update
    await expect(status).toHaveText('Starting merge sort...');
    await expect(sortBtn).toBeDisabled();
    await expect(input).toBeDisabled();

    // Wait for sorting to produce intermediate messages
    await page.waitForFunction(() => {
      const txt = document.getElementById('status')?.textContent || '';
      return txt.includes('Comparing') || txt.includes('Splitting') || txt.includes('Appending');
    }, { timeout: 8000 });

    // Wait for the second run to finish
    await page.waitForFunction(() => (document.getElementById('status')?.textContent || '') === 'Array sorted!', { timeout: 30000 });

    // After completion, controls are enabled again
    await expect(sortBtn).toBeEnabled();
    await expect(input).toBeEnabled();

    // Verify the final bar values are sorted ascending for the second run
    const finalValues = await page.$$eval('#visualization .bar', bars => bars.map(b => Number(b.dataset.value)));
    const expected = [...finalValues].slice().sort((a,b) => a-b);
    expect(finalValues).toEqual(expected);
  }, 45000);

});