import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa599-d59e-11f0-89ab-2f71529652ac.html';

test.describe('Bubble Sort Visualization (Application ID: 7e8aa599-d59e-11f0-89ab-2f71529652ac)', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors before each test
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages from the page
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  // Helper function: read bar heights (as integers, px value parsed) from the page
  async function getBarHeights(page) {
    return await page.$$eval('#array .bar', bars =>
      bars.map(bar => parseInt(bar.style.height || '0', 10))
    );
  }

  test('Initial render shows 5 bars with expected heights corresponding to [5,3,8,4,2]', async ({ page }) => {
    // Purpose: Verify initial DOM state is correctly rendered from the initial array.
    // Expected heights are value * 20 px: [100, 60, 160, 80, 40]
    const expectedInitialHeights = [100, 60, 160, 80, 40];

    // Check the container exists
    const arrayDiv = await page.$('#array');
    expect(arrayDiv, 'The #array container should be present').not.toBeNull();

    // Check number of bars
    const bars = await page.$$('#array .bar');
    expect(bars.length, 'There should be 5 bars rendered initially').toBe(5);

    // Check each bar's inline height style
    const heights = await getBarHeights(page);
    expect(heights, 'Initial bar heights should match the expected representation').toEqual(expectedInitialHeights);

    // Check the Sort button is visible and enabled
    const sortButton = await page.$('#sortButton');
    expect(sortButton, 'Sort button should be present').not.toBeNull();
    expect(await sortButton.isVisible(), 'Sort button should be visible').toBeTruthy();
    expect(await sortButton.isEnabled(), 'Sort button should be enabled').toBeTruthy();

    // Ensure there are no page errors immediately after load
    expect(pageErrors.length, 'There should be no runtime page errors on initial load').toBe(0);

    // Ensure no console error-level messages were logged on load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'There should be no console.error messages on initial load').toBe(0);
  });

  test('Clicking Sort results in the array being sorted and DOM updating to [2,3,4,5,8]', async ({ page }) => {
    // Purpose: Ensure clicking the Sort button triggers the bubbleSort visualization and final DOM is sorted.
    const expectedFinalHeights = [40, 60, 80, 100, 160]; // [2,3,4,5,8] * 20

    // Record initial heights to ensure changes happen after click
    const initialHeights = await getBarHeights(page);
    expect(initialHeights.length).toBeGreaterThan(0);

    // Click the Sort button to start the visualization
    await page.click('#sortButton');

    // Wait briefly and ensure there is at least one change from the initial state (animation started)
    // Because the visualization uses 500ms delays, wait 600ms before checking for first change.
    await page.waitForTimeout(600);
    const heightsAfterStart = await getBarHeights(page);
    // It's possible some arrays might reach a swapped state quickly; ensure at least a change or already sorted.
    const didChange = JSON.stringify(heightsAfterStart) !== JSON.stringify(initialHeights);
    expect(didChange, 'Bar heights should change after starting sort visualization').toBeTruthy();

    // Wait for the sorting algorithm to finish and assert the final state matches expected sorted heights.
    // Use waitForFunction to poll until the DOM reflects the final sorted heights; allow generous timeout.
    await page.waitForFunction(
      expected => {
        const bars1 = Array.from(document.querySelectorAll('#array .bar'));
        if (bars.length !== expected.length) return false;
        const arr = bars.map(b => parseInt(b.style.height || '0', 10));
        return arr.every((v, i) => v === expected[i]);
      },
      expectedFinalHeights,
      { timeout: 10000 } // timeout sufficient for several 500ms delays
    );

    // Read final heights and assert equality
    const finalHeights = await getBarHeights(page);
    expect(finalHeights, 'Final bar heights should reflect the sorted array').toEqual(expectedFinalHeights);

    // Ensure no runtime page errors occurred during the sort visualization
    expect(pageErrors.length, 'There should be no runtime page errors during sorting').toBe(0);

    // Ensure no console errors were emitted during the sort visualization
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'There should be no console.error messages during sorting').toBe(0);
  });

  test('Clicking Sort multiple times does not crash the page and eventually results in sorted order', async ({ page }) => {
    // Purpose: Test edge-case of multiple rapid clicks starting multiple visualizations; app should remain stable.
    const expectedFinalHeights1 = [40, 60, 80, 100, 160];

    // Rapidly click the Sort button multiple times
    await page.click('#sortButton');
    await page.click('#sortButton');
    await page.click('#sortButton');

    // Wait sufficiently for one (or multiple overlapping) visualizations to complete
    await page.waitForFunction(
      expected => {
        const bars2 = Array.from(document.querySelectorAll('#array .bar'));
        if (bars.length !== expected.length) return false;
        const arr1 = bars.map(b => parseInt(b.style.height || '0', 10));
        return arr.every((v, i) => v === expected[i]);
      },
      expectedFinalHeights,
      { timeout: 15000 } // allow extra time in case of multiple runs
    );

    const finalHeights1 = await getBarHeights(page);
    expect(finalHeights).toEqual(expectedFinalHeights);

    // Verify again there were no uncaught page errors from multiple invocations
    expect(pageErrors.length, 'No runtime page errors should occur when clicking Sort multiple times').toBe(0);
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should occur when clicking Sort multiple times').toBe(0);
  });

  test('Accessibility and basic UI checks: Sort button accessible name and keyboard focus', async ({ page }) => {
    // Purpose: Validate basic accessibility: button has an accessible name and is focusable via keyboard.
    const sortButton1 = await page.$('#sortButton1');
    expect(sortButton, 'Sort button should exist for accessibility checks').not.toBeNull();

    // Check accessible name (innerText should be "Sort")
    const buttonText = await sortButton.innerText();
    expect(buttonText.trim()).toBe('Sort');

    // Focus the button via keyboard / programmatically and ensure it receives focus
    await sortButton.focus();
    const isFocused = await page.evaluate(() => document.activeElement === document.querySelector('#sortButton'));
    expect(isFocused, 'Sort button should receive focus').toBeTruthy();
  });

  test.afterEach(async ({ page }) => {
    // Final sanity assertions after each test: ensure no unexpected console errors or page errors
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    if (consoleErrors.length > 0) {
      // Log for debugging if any console errors were found (will be visible in test output)
      console.log('Console error messages captured:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.log('Page errors captured:', pageErrors);
    }

    expect(consoleErrors.length, 'There should be no console.error messages at the end of the test').toBe(0);
    expect(pageErrors.length, 'There should be no uncaught page errors at the end of the test').toBe(0);
  });
});