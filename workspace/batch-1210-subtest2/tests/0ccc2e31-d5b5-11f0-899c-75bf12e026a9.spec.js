import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccc2e31-d5b5-11f0-899c-75bf12e026a9.html';

test.describe('Counting Sort Visualization (FSM) - 0ccc2e31-d5b5-11f0-899c-75bf12e026a9', () => {
  // Capture console errors and page errors for every test so we can assert on them.
  test.beforeEach(async ({ page }) => {
    // Arrays attached to page to persist across event handlers inside a test
    (page as any)._consoleErrors = [];
    (page as any)._pageErrors = [];

    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          (page as any)._consoleErrors.push({
            text: msg.text(),
            location: msg.location(),
            type: msg.type()
          });
        }
      } catch (e) {
        // swallow any listener error
      }
    });

    page.on('pageerror', err => {
      (page as any)._pageErrors.push({
        message: err.message,
        stack: err.stack
      });
    });

    // Navigate to the app page exactly as provided.
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // For clarity: make sure there were no unexpected JS runtime errors that surfaced to page.
    const consoleErrors = (page as any)._consoleErrors || [];
    const pageErrors = (page as any)._pageErrors || [];

    // Assert there are no JS runtime errors (ReferenceError, TypeError, SyntaxError) or console error messages.
    const combined = [...consoleErrors.map(e => e.text), ...pageErrors.map(e => e.message)];
    const problematic = combined.filter(msg => /ReferenceError|TypeError|SyntaxError/.test(String(msg)));
    expect(problematic.length, `Unexpected JS errors in console/pageerror: ${JSON.stringify(problematic, null, 2)}`).toBe(0);
  });

  test('S0_Idle: Initial render shows title, input placeholder, start button and hides visualization/steps', async ({ page }) => {
    // Validate initial UI elements and their states (Idle state)
    const title = page.locator('h1');
    await expect(title).toHaveText('Counting Sort Visualization');

    const input = page.locator('#inputArray');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'e.g. 4,2,2,8,3,3,1');

    const startBtn = page.locator('#startBtn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    const errorMsg = page.locator('#errorMsg');
    await expect(errorMsg).toHaveText('');

    // Visualization and steps should be hidden initially (display:none)
    const visualization = page.locator('#visualization');
    await expect(visualization).toBeHidden();

    const steps = page.locator('#steps');
    await expect(steps).toBeHidden();

    // Assert no console or page errors observed so far
    const consoleErrors = (page as any)._consoleErrors || [];
    const pageErrors = (page as any)._pageErrors || [];
    expect(consoleErrors.length + pageErrors.length).toBe(0);
  });

  test('S3_Error: Invalid input (non-integers) should show invalid input message and keep visualization hidden', async ({ page }) => {
    // Enter invalid input containing non-integer tokens
    await page.fill('#inputArray', 'a, 2.5, hello');
    await page.click('#startBtn');

    // Error message described in FSM for invalid parse
    const errorMsg = page.locator('#errorMsg');
    await expect(errorMsg).toHaveText('Invalid input! Please enter integers between 0 and 100, separated by commas.');

    // visualization and steps must remain hidden
    await expect(page.locator('#visualization')).toBeHidden();
    await expect(page.locator('#steps')).toBeHidden();

    // No JS runtime errors should have been thrown during handling
    const consoleErrors = (page as any)._consoleErrors || [];
    const pageErrors = (page as any)._pageErrors || [];
    expect(consoleErrors.length + pageErrors.length).toBe(0);
  });

  test('S3_Error: Empty input should show "Please enter at least one number." and keep visualization hidden', async ({ page }) => {
    // Input empty or whitespace only - should be detected as empty array and trigger that error message
    await page.fill('#inputArray', '   ');
    await page.click('#startBtn');

    const errorMsg = page.locator('#errorMsg');
    await expect(errorMsg).toHaveText('Please enter at least one number.');

    // visualization and steps must remain hidden
    await expect(page.locator('#visualization')).toBeHidden();
    await expect(page.locator('#steps')).toBeHidden();

    const consoleErrors = (page as any)._consoleErrors || [];
    const pageErrors = (page as any)._pageErrors || [];
    expect(consoleErrors.length + pageErrors.length).toBe(0);
  });

  test('S1_InputReceived -> S2_Visualizing: Valid input triggers visualization, shows steps and final sorted output', async ({ page }) => {
    // Arrange: valid input as in example
    const inputStr = '4,2,2,8,3,3,1';
    await page.fill('#inputArray', inputStr);

    // Act: click start to transition from Idle -> InputReceived and then to Visualizing
    await page.click('#startBtn');

    // Visualization and steps should become visible shortly
    await expect(page.locator('#visualization')).toBeVisible();
    await expect(page.locator('#steps')).toBeVisible();

    // Input bars should be rendered with the same number of elements as input
    await page.waitForSelector('#inputBars .array-bar');
    const inputBarsCount = await page.$$eval('#inputBars .array-bar', els => els.length);
    const expectedInputLen = inputStr.split(/[\s,]+/).filter(x => x.length).length;
    expect(inputBarsCount).toBe(expectedInputLen);

    // The countBars should have bars for each value from 0..maxVal where maxVal is 8 => 9 bars expected
    // Instead of hard-coding, determine maxVal from the input
    const arrValues = inputStr.split(/[\s,]+/).filter(x => x.length).map(v => Number(v));
    const maxVal = Math.max(...arrValues);
    // Wait for count bars to be present (initially created when count array initialized)
    await page.waitForSelector('#countBars .array-bar');
    const countBarsCount = await page.$$eval('#countBars .array-bar', els => els.length);
    expect(countBarsCount).toBe(maxVal + 1);

    // Wait for the visualization algorithm to finish by waiting for "Sorted output array" line in stepsContent
    await page.waitForFunction(() => {
      const sc = document.getElementById('stepsContent');
      return sc && sc.textContent && sc.textContent.indexOf('Sorted output array') !== -1;
    }, { timeout: 15000 });

    // After completion, outputBars should contain the sorted values equal to input length
    await page.waitForSelector('#outputBars .array-bar');
    const outputBarTexts = await page.$$eval('#outputBars .array-bar', els =>
      els.map(e => e.textContent ? e.textContent.trim() : '')
    );

    // Filter out any labels (since array-bar includes nested label for count)
    // For output bars, their textContent should be the numeric values (no nested label), but trim anyway
    const outputNumbers = outputBarTexts.map(t => {
      // The textContent can include both number and nested label text in count bars, but for output bars it's just the value.
      // Convert to Number if possible
      const n = Number(t);
      return Number.isNaN(n) ? t : n;
    });

    const expectedSorted = [...arrValues].sort((a, b) => a - b);

    // The final outputBars must show the sorted numbers in order. Wait and retry check to be robust.
    expect(outputNumbers.length).toBe(expectedInputLen);
    // Ensure every output position is a number and equals sorted expected
    for (let i = 0; i < expectedInputLen; i++) {
      expect(Number(outputNumbers[i])).toBe(expectedSorted[i]);
    }

    // Steps content should include a line describing the sorted output array
    const stepsText = await page.locator('#stepsContent').innerText();
    expect(stepsText).toContain('Sorted output array');

    // Ensure no JS runtime errors occurred during the whole visualization
    const consoleErrors = (page as any)._consoleErrors || [];
    const pageErrors = (page as any)._pageErrors || [];
    expect(consoleErrors.length + pageErrors.length).toBe(0);
  });

  test('Transition guards and edge cases: numbers out of range and negative numbers produce invalid input error', async ({ page }) => {
    // Out of range > 100
    await page.fill('#inputArray', '101, 2, 3');
    await page.click('#startBtn');
    await expect(page.locator('#errorMsg')).toHaveText('Invalid input! Please enter integers between 0 and 100, separated by commas.');
    await expect(page.locator('#visualization')).toBeHidden();
    await expect(page.locator('#steps')).toBeHidden();

    // Negative number
    await page.fill('#inputArray', '-1, 0, 5');
    await page.click('#startBtn');
    await expect(page.locator('#errorMsg')).toHaveText('Invalid input! Please enter integers between 0 and 100, separated by commas.');
    await expect(page.locator('#visualization')).toBeHidden();
    await expect(page.locator('#steps')).toBeHidden();

    // Non-integer (float) rejection
    await page.fill('#inputArray', '1.2, 3');
    await page.click('#startBtn');
    await expect(page.locator('#errorMsg')).toHaveText('Invalid input! Please enter integers between 0 and 100, separated by commas.');
    await expect(page.locator('#visualization')).toBeHidden();
    await expect(page.locator('#steps')).toBeHidden();

    // Final check: no low-level JS errors occurred while handling these edge cases
    const consoleErrors = (page as any)._consoleErrors || [];
    const pageErrors = (page as any)._pageErrors || [];
    expect(consoleErrors.length + pageErrors.length).toBe(0);
  });

});