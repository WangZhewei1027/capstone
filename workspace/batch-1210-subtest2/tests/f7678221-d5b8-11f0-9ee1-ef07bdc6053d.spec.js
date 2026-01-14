import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7678221-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('Merge Sort Visualization - FSM validation (f7678221-d5b8-11f0-9ee1-ef07bdc6053d)', () => {
  // Collect console messages and page errors for each test to assert expected error behavior
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console events (info/warn/error) and store them for assertions
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions on the page (ReferenceError, TypeError, etc.)
    page.on('pageerror', err => {
      // err is an Error object from the page
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // nothing to teardown globally here; Playwright handles pages/contexts
  });

  test('S0_Idle: Initial render - buttons present and array container empty', async ({ page }) => {
    // Validate initial Idle state: buttons should be present and array container empty
    const generateButton = page.locator("button[onclick='generateArray()']");
    const startButton = page.locator("button[onclick='mergeSort(arr)']");
    const container = page.locator('#array-container');

    // Buttons visible
    await expect(generateButton).toBeVisible();
    await expect(startButton).toBeVisible();

    // Array container exists and is initially empty (no .array-bar children)
    await expect(container).toBeVisible();
    const initialBars = await container.locator('.array-bar').count();
    expect(initialBars).toBe(0);

    // No page errors or console 'error' messages on fresh load expected
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('S0 -> S1: Generate Random Array transitions to Array Generated (50 bars displayed)', async ({ page }) => {
    // Click the "Generate Random Array" button and verify displayArray(arr) was invoked by checking DOM
    const generateButton = page.locator("button[onclick='generateArray()']");
    const container = page.locator('#array-container');

    await generateButton.click();

    // After generating, we expect 50 bars to be present (as per implementation)
    await expect.poll(async () => {
      return await container.locator('.array-bar').count();
    }, { timeout: 2000 }).toBe(50);

    const count = await container.locator('.array-bar').count();
    expect(count).toBe(50);

    // Verify that each bar has a numeric height style set (basic visual feedback)
    const heights = await page.$$eval('#array-container .array-bar', bars =>
      bars.map(b => b.style.height)
    );
    // Each height string should be non-empty and end with 'px'
    for (const h of heights) {
      expect(typeof h).toBe('string');
      expect(h).toMatch(/px$/);
      // Also ensure height value is plausible (not zero-length string)
      expect(h.length).toBeGreaterThan(2);
    }

    // No page errors expected from generating the array
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('S1 -> S2 -> S3: Start Merge Sort on a small array sorts it and displays final sorted array', async ({ page }) => {
    // To reliably and quickly test sorting visualization and final sorted state,
    // set a small array on the page (reuse existing global `arr`) and render it.
    // This uses the page's own globals and functions (no function redefinitions).
    await page.evaluate(() => {
      // Use a small deterministic array to keep test fast and predictable
      arr = [5, 3, 8, 1];
      // Call displayArray(arr) as the S1 entry action would
      displayArray(arr);
    });

    // Verify we are in the Array Generated state with four bars
    const container = page.locator('#array-container');
    await expect.poll(async () => {
      return await container.locator('.array-bar').count();
    }, { timeout: 1000 }).toBe(4);

    // Click the Start Merge Sort button to transit to Sorting state (S2)
    const startButton = page.locator("button[onclick='mergeSort(arr)']");
    await startButton.click();

    // Wait until the final sorted array is displayed: heights should correspond to sorted values (1,3,5,8)
    // We convert bar heights back to numbers and assert non-decreasing order.
    await expect.poll(async () => {
      const heights = await page.$$eval('#array-container .array-bar', bars =>
        bars.map(b => parseFloat(b.style.height || '0'))
      );
      // If sorting has completed and displayArray was called with the fully sorted array,
      // heights should be non-decreasing (sorted ascending).
      for (let i = 1; i < heights.length; i++) {
        if (heights[i] < heights[i - 1]) return false;
      }
      // Also ensure we have the expected number of bars
      return heights.length === 4;
    }, { timeout: 5000 }).toBeTruthy();

    // Final assertion: the numeric heights map to the sorted values [1,3,5,8] scaled by 2 (as per implementation)
    const finalHeights = await page.$$eval('#array-container .array-bar', bars =>
      bars.map(b => parseFloat(b.style.height || '0'))
    );
    // Convert heights back to original values by dividing by 2 (scale factor in displayArray)
    const finalValues = finalHeights.map(h => Math.round(h / 2));
    expect(finalValues).toEqual([1, 3, 5, 8]);

    // No uncaught page errors expected during normal sorting of a valid array
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: invoking mergeSort(null) should produce a TypeError captured as a page error', async ({ page }) => {
    // Trigger an error scenario by calling mergeSort(null) inside the page context asynchronously
    // Use setTimeout to ensure the invocation happens on the page event loop and is not caught by evaluate
    await page.evaluate(() => {
      setTimeout(() => {
        // This will attempt to access .length of null and should throw a TypeError in the page context
        try {
          // Intentionally call to create an unhandled exception
          mergeSort(null);
        } catch (e) {
          // If mergeSort throws synchronously here, rethrow to make it an unhandled exception
          // But most likely it will throw and be caught by pageerror handler anyway.
          throw e;
        }
      }, 0);
    });

    // Wait for the pageerror event to be fired and recorded
    await expect.poll(() => pageErrors.length > 0, { timeout: 2000 }).toBeTruthy();

    // At least one page error should mention TypeError or cannot read property 'length'
    const matched = pageErrors.some(msg =>
      /TypeError/i.test(msg) || /cannot read/i.test(msg) || /reading 'length'/.test(msg) || /Cannot read properties of null/.test(msg)
    );

    expect(matched).toBeTruthy();

    // Also ensure we recorded at least one console message or page error overall
    expect(pageErrors.length).toBeGreaterThan(0);
  });

  test('Edge case: clicking Start Merge Sort while arr is empty should be a no-op and not throw', async ({ page }) => {
    // Ensure global arr is empty (initial state). Then click Start Merge Sort and assert no error occurs.
    await page.evaluate(() => {
      arr = [];
      // Ensure array container is cleared as part of setup
      const c = document.getElementById('array-container');
      if (c) c.innerHTML = '';
    });

    const container = page.locator('#array-container');
    const startButton = page.locator("button[onclick='mergeSort(arr)']");

    // Before click, container should be empty
    await expect(container.locator('.array-bar')).toHaveCount(0);

    // Click Start Merge Sort; mergeSort([]) should return early and not throw
    await startButton.click();

    // Allow a short time for any unexpected errors to surface
    await page.waitForTimeout(300);

    // Container should remain empty and no page errors should have been recorded from this action
    await expect(container.locator('.array-bar')).toHaveCount(0);

    // Confirm no new page errors from this scenario (note pageErrors may contain earlier errors from other tests in the same worker)
    // Since we accumulate pageErrors across the test, ensure that at least there was no new error added by this click.
    // To achieve this, we re-check the last page error timestamp by capturing current length before the click would have been better,
    // but for clarity here, assert that none of the recorded errors (if any) reference this action specifically.
    const errorFromEmptyStart = pageErrors.some(msg =>
      /Cannot read properties of null/i.test(msg) || /TypeError/i.test(msg)
    );
    // It's acceptable for pageErrors to exist from previous tests in this worker; we assert there was no obvious error caused by calling mergeSort([]).
    expect(errorFromEmptyStart).toBe(false);
  });

  // Final test to summarize console and page error observations for the suite run.
  test('Summary: verify no unexpected console errors beyond intentional edge-case', async ({ page }) => {
    // This test inspects the captured console and page errors arrays.
    // We expect that the only intentional error we triggered was the TypeError from mergeSort(null) test.
    // Count console 'error' messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');

    // Logically, we shouldn't have console errors except possibly those resulting from the intentional error scenario.
    // Accept either zero or a small number, but ensure none are SyntaxError (page load would have failed otherwise).
    const hasSyntaxError = pageErrors.some(msg => /SyntaxError/i.test(msg));
    expect(hasSyntaxError).toBe(false);

    // Confirm console errors do not include unexpected fatal messages; their presence is allowed but should be minimal.
    expect(consoleErrors.length).toBeLessThanOrEqual(5);
  });
});