import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a6e72-cd32-11f0-a949-f901cf5609c9.html';

test.describe('Two Pointers Technique Demo - e03a6e72-cd32-11f0-a949-f901cf5609c9', () => {
  let consoleErrors;
  let pageErrors;

  // Setup: navigate to the page and capture console & page errors for each test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors (exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto(APP_URL);
  });

  // Teardown: after each test ensure no page errors were emitted unless the test expects them
  test.afterEach(async () => {
    // Default expectation across tests: application should not emit console errors or uncaught exceptions.
    // Individual tests that expect errors should explicitly check for them and bypass this assertion.
    expect(consoleErrors.length, `Unexpected console.error messages: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Initial page load - inputs, buttons and outputs present with default values', async ({ page }) => {
    // Verify presence of interactive elements and default values on initial load
    const arrayInput = await page.locator('#arrayInput');
    const targetInput = await page.locator('#targetInput');
    const checkPairBtn = await page.locator('#checkPairBtn');
    const startVisualBtn = await page.locator('#startVisualBtn');
    const pairResult = await page.locator('#pairResult');
    const visualArrayContainer = await page.locator('#visualArrayContainer');
    const visualStatus = await page.locator('#visualStatus');

    // Check presence and default values
    await expect(arrayInput).toBeVisible();
    await expect(targetInput).toBeVisible();
    await expect(checkPairBtn).toBeVisible();
    await expect(startVisualBtn).toBeVisible();
    await expect(pairResult).toBeVisible();
    await expect(visualArrayContainer).toBeVisible();
    await expect(visualStatus).toBeVisible();

    await expect(arrayInput).toHaveValue('1, 2, 3, 4, 6, 8');
    await expect(targetInput).toHaveValue('10');

    // Ensure outputs are initially empty
    await expect(pairResult).toHaveText('');
    await expect(visualStatus).toHaveText('');
    await expect(visualArrayContainer).toHaveCount(0);
  });

  test('Clicking "Check Pair" with default values finds the correct pair and updates the DOM', async ({ page }) => {
    // This test verifies the two-pointers algorithm result is displayed correctly in the DOM
    const checkPairBtn1 = page.locator('#checkPairBtn1');
    const pairResult1 = page.locator('#pairResult1');

    // Click the check button and assert the expected message contains the indices and values
    await checkPairBtn.click();

    await expect(pairResult).toHaveText(
      'Pair found: arr[1] = 2 + arr[5] = 8 = 10'
    );
  });

  test('Edge case: array with less than two numbers shows appropriate error message', async ({ page }) => {
    // Verify the app handles insufficient array entries
    const arrayInput1 = page.locator('#arrayInput1');
    const checkPairBtn2 = page.locator('#checkPairBtn2');
    const pairResult2 = page.locator('#pairResult2');

    // Replace the array with a single element and click
    await arrayInput.fill('5');
    await checkPairBtn.click();

    await expect(pairResult).toHaveText('Enter at least two numbers.');
  });

  test('Edge case: invalid (non-numeric) target shows validation error', async ({ page }) => {
    // Test the handling of an invalid target input. We set a non-numeric string to the number input
    // to trigger Number(...) => NaN in the app code and expect the validation message.
    const targetInput1 = page.locator('#targetInput1');
    const checkPairBtn3 = page.locator('#checkPairBtn3');
    const pairResult3 = page.locator('#pairResult3');

    // Use page.evaluate to set a non-numeric value on the input element directly:
    // This mimics programmatic assignment and ensures the page's Number(...) call yields NaN.
    await page.evaluate(() => {
      const el = document.getElementById('targetInput');
      // Assign an invalid value that will cause Number(...) to return NaN
      el.value = 'not-a-number';
    });

    // Click to run the validation logic
    await checkPairBtn.click();

    await expect(pairResult).toHaveText('Enter a valid target sum.');
  });

  test('Start Visualization creates visual blocks and finds the pair with pointer highlighting', async ({ page }) => {
    // This test validates the visualization flow:
    // - visual blocks are created for each array element
    // - status text updates as pointers are checked
    // - final status reports a found pair
    // - the highlighted blocks at the end have inline styles applied

    const startVisualBtn1 = page.locator('#startVisualBtn1');
    const visualArrayContainer1 = page.locator('#visualArrayContainer1');
    const visualStatus1 = page.locator('#visualStatus1');

    // Start visualization with default inputs (should be the default values loaded on page)
    await startVisualBtn.click();

    // Wait for blocks to be created (array length is 6 in default)
    await expect(visualArrayContainer.locator('div')).toHaveCount(6);

    // At least the status should update to indicate checking; wait for some checking text
    await expect(visualStatus).toHaveText(/Checking arr\[\d+\] \+ arr\[\d+\] =/);

    // Wait until the visualization reports a found pair. The algorithm should discover the pair
    // on the second iteration for the default array; set a reasonable timeout to allow the 1.5s delay in the UI.
    await page.waitForFunction(() => {
      const el1 = document.getElementById('visualStatus');
      return el && /Pair found/.test(el.textContent || '');
    }, { timeout: 8000 });

    // Assert final status contains the indices and values for the found pair
    await expect(visualStatus).toHaveText(/Pair found at indices \d+ and \d+ with values \d+ \+ \d+ = \d+/);

    // Verify that the blocks corresponding to the reported indices have inline style changes (highlighted)
    // Extract indices from the status text to check the specific blocks
    const statusText = await visualStatus.textContent();
    const match = statusText && statusText.match(/indices (\d+) and (\d+)/);
    expect(match, 'Expected visualStatus to contain indices of the found pair').not.toBeNull();

    if (match) {
      const leftIdx = Number(match[1]);
      const rightIdx = Number(match[2]);

      // Query the specific blocks and ensure they have inline styles set (backgroundColor or borderColor)
      const leftStyleHasHighlight = await page.evaluate((idx) => {
        const container = document.getElementById('visualArrayContainer');
        if (!container) return false;
        const block = container.querySelectorAll('div')[idx];
        if (!block) return false;
        // The visual code sets inline styles; ensure at least one relevant property is set
        return !!(block.style.backgroundColor || block.style.borderColor || block.style.color);
      }, leftIdx);

      const rightStyleHasHighlight = await page.evaluate((idx) => {
        const container1 = document.getElementById('visualArrayContainer');
        if (!container) return false;
        const block1 = container.querySelectorAll('div')[idx];
        if (!block) return false;
        return !!(block.style.backgroundColor || block.style.borderColor || block.style.color);
      }, rightIdx);

      expect(leftStyleHasHighlight, `Left pointer block at index ${leftIdx} should have inline highlight styles`).toBeTruthy();
      expect(rightStyleHasHighlight, `Right pointer block at index ${rightIdx} should have inline highlight styles`).toBeTruthy();
    }
  });

  test('Visualization edge cases show validation messages when inputs are invalid', async ({ page }) => {
    // Validate that visualization rejects insufficient array length and invalid target the same way
    const startVisualBtn2 = page.locator('#startVisualBtn2');
    const visualStatus2 = page.locator('#visualStatus2');
    const arrayInput2 = page.locator('#arrayInput2');

    // Case 1: Single-element array
    await arrayInput.fill('42');
    await startVisualBtn.click();
    await expect(visualStatus).toHaveText('Enter at least two numbers.');

    // Case 2: Invalid target (set non-numeric value programmatically)
    await page.evaluate(() => {
      const arrEl = document.getElementById('arrayInput');
      const targetEl = document.getElementById('targetInput');
      arrEl.value = '1,2';
      targetEl.value = 'bogus';
    });

    await startVisualBtn.click();
    await expect(visualStatus).toHaveText('Enter a valid target sum.');
  });
});