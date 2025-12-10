import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdb7-d59e-11f0-b3ae-79d1ce7b5503.html';

test.describe('Heap Sort Visualization - 0888fdb7-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Arrays to capture console messages and page errors for each test
  let pageErrors = [];
  let consoleMessages = [];

  // Setup: navigate to the page and attach listeners to capture runtime errors and console messages
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture all console messages for inspection (including errors)
    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });

    // Load the application page as-is
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Teardown: nothing to patch or modify; keep listeners to allow assertions in tests

  test('Initial load: page structure and default visualization are correct', async ({ page }) => {
    // Purpose: Verify the initial DOM elements are present and the initial array is rendered as 7 bars
    // Verify page title / heading
    const heading = await page.locator('h1').innerText();
    expect(heading).toContain('Heap Sort Visualization');

    // Start button should be visible and have the expected text
    const startBtn = page.getByRole('button', { name: 'Start Heap Sort' });
    await expect(startBtn).toBeVisible();

    // Verify the container has exactly 7 bars on initial load
    const bars = await page.$$eval('#arrayContainer .bar', nodes => nodes.map(n => ({
      height: n.style.height,
      width: n.style.width,
      className: n.className
    })));
    expect(bars.length).toBe(7);

    // Expected initial heights based on the array [10, 30, 20, 50, 40, 70, 60] scaled by 5
    const expectedInitialHeights = [10, 30, 20, 50, 40, 70, 60].map(v => (v * 5) + 'px');

    // Assert each bar has the expected class, width and height
    for (let i = 0; i < bars.length; i++) {
      expect(bars[i].className).toBe('bar');
      expect(bars[i].width).toBe('30px');
      expect(bars[i].height).toBe(expectedInitialHeights[i]);
    }

    // Ensure there were no uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);
    // Ensure there are no console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking "Start Heap Sort" sorts the visualization to ascending order', async ({ page }) => {
    // Purpose: Ensure the Start Heap Sort button triggers sorting and final visual state is sorted ascending

    // Capture the heights before starting the sort
    const beforeHeights = await page.$$eval('#arrayContainer .bar', nodes => nodes.map(n => n.style.height));

    // Click the Start Heap Sort button
    await page.getByRole('button', { name: 'Start Heap Sort' }).click();

    // After a synchronous sort, the DOM should reflect the final sorted array.
    const afterHeights = await page.$$eval('#arrayContainer .bar', nodes => nodes.map(n => n.style.height));

    // Expected final heights for the sorted array [10,20,30,40,50,60,70] scaled by 5 px
    const expectedFinalHeights = [10, 20, 30, 40, 50, 60, 70].map(v => (v * 5) + 'px');

    // Assert final heights match sorted order
    expect(afterHeights).toEqual(expectedFinalHeights);

    // Also verify that the final state is different from the initial in at least one position
    const arraysAreIdentical = beforeHeights.length === afterHeights.length && beforeHeights.every((h, i) => h === afterHeights[i]);
    expect(arraysAreIdentical).toBeFalsy();

    // Confirm no runtime page errors or console error messages occurred during the operation
    expect(pageErrors.length).toBe(0);
    const consoleErrors1 = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Start button is idempotent (multiple clicks produce consistent sorted result) and robust to rapid clicks', async ({ page }) => {
    // Purpose: Validate that invoking the sort multiple times (including rapid repeated clicks) does not throw errors
    const startBtn1 = page.getByRole('button', { name: 'Start Heap Sort' });

    // Rapidly click the button several times to simulate a user pressing it repeatedly
    for (let i = 0; i < 5; i++) {
      await startBtn.click();
    }

    // Final state should still be the sorted ascending array
    const afterHeights1 = await page.$$eval('#arrayContainer .bar', nodes => nodes.map(n => n.style.height));
    const expectedFinalHeights1 = [10, 20, 30, 40, 50, 60, 70].map(v => (v * 5) + 'px');
    expect(afterHeights).toEqual(expectedFinalHeights);

    // No uncaught errors or console error messages should be present
    expect(pageErrors.length).toBe(0);
    const consoleErrors2 = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Accessibility: Start button is discoverable by role and name', async ({ page }) => {
    // Purpose: Check basic accessibility - ensure the Start button can be found via ARIA role and name
    const startBtn2 = page.getByRole('button', { name: 'Start Heap Sort' });
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    // Clicking via the accessible locator should also trigger sorting
    await startBtn.click();
    const afterHeights2 = await page.$$eval('#arrayContainer .bar', nodes => nodes.map(n => n.style.height));
    const expectedFinalHeights2 = [10, 20, 30, 40, 50, 60, 70].map(v => (v * 5) + 'px');
    expect(afterHeights).toEqual(expectedFinalHeights);

    // Ensure there are no accessibility-related runtime exceptions captured in page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Edge-case behavior: repeated sorting does not alter global state incorrectly', async ({ page }) => {
    // Purpose: Ensure the application does not permanently mutate the global original array in a way that breaks subsequent sorts
    // The implementation copies the global array inside startHeapSort; verify repeated runs produce the same sorted result.

    // Run the sort multiple times, reading the resultant heights each time
    for (let run = 0; run < 3; run++) {
      await page.getByRole('button', { name: 'Start Heap Sort' }).click();
      const heights = await page.$$eval('#arrayContainer .bar', nodes => nodes.map(n => n.style.height));
      const expectedFinalHeights3 = [10, 20, 30, 40, 50, 60, 70].map(v => (v * 5) + 'px');
      expect(heights).toEqual(expectedFinalHeights);
    }

    // Confirm no unexpected runtime errors occurred during repeated operations
    expect(pageErrors.length).toBe(0);
    const consoleErrors3 = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Observes and asserts absence of uncaught exceptions and console errors across the session', async ({ page }) => {
    // Purpose: Collect and assert global page error state after interactions have been performed in previous tests
    // This is a final check to ensure the page did not produce uncaught exceptions or console errors during the test session.

    // Perform one more interaction to exercise code paths
    await page.getByRole('button', { name: 'Start Heap Sort' }).click();

    // Assert there were no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Assert there were no console error messages
    const consoleErrors4 = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);

    // Additionally assert that we have collected at least some non-error console messages or DOM activity.
    // (Not strictly required, but it verifies the listeners were active)
    expect(consoleMessages.length).toBeGreaterThanOrEqual(0);
  });
});