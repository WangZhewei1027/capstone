import { test, expect } from '@playwright/test';

test.describe('Quick Sort Visualization (Application ID: 6e09e038-d5a0-11f0-8040-510e90b1f3a7)', () => {
  // URL to the served HTML for this exercise
  const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e038-d5a0-11f0-8040-510e90b1f3a7.html';

  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors before each test
    consoleMessages = [];
    pageErrors = [];

    // Attach listeners BEFORE navigation so we capture errors during script parsing/execution
    page.on('console', (msg) => {
      // Record all console messages for later inspection
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('pageerror', (err) => {
      // Record runtime/page errors (e.g., ReferenceError, SyntaxError)
      // err may be an Error object
      pageErrors.push({
        message: err && err.message ? err.message : String(err),
        stack: err && err.stack ? err.stack : undefined
      });
    });

    // Navigate to the application page and wait until load event
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Give a short pause to allow any asynchronous script errors or console messages to surface
    await page.waitForTimeout(300);
  });

  test.describe('Initial page load and static DOM checks', () => {
    test('should load the page and display the header, description and controls', async ({ page }) => {
      // Verify page title
      await expect(page).toHaveTitle(/Quick Sort Algorithm Visualization/i);

      // Header and description are present
      const header = page.locator('header h1');
      await expect(header).toHaveText(/Quick Sort Algorithm Visualization/i);

      const description = page.locator('header .description');
      await expect(description).toBeVisible();
      await expect(description).toContainText('Quick Sort is a highly efficient sorting algorithm');

      // Check that all control buttons exist and are visible
      const generateBtn = page.locator('#generateBtn');
      const sortBtn = page.locator('#sortBtn');
      const resetBtn = page.locator('#resetBtn');
      const stepBtn = page.locator('#stepBtn');

      await expect(generateBtn).toBeVisible();
      await expect(sortBtn).toBeVisible();
      await expect(resetBtn).toBeVisible();
      await expect(stepBtn).toBeVisible();

      // Ensure sliders and their value displays exist
      const arraySizeSlider = page.locator('#arraySize');
      const speedSlider = page.locator('#speed');
      const sizeValue = page.locator('#sizeValue');
      const speedValue = page.locator('#speedValue');

      await expect(arraySizeSlider).toBeVisible();
      await expect(speedSlider).toBeVisible();
      // The HTML contains default numeric text nodes; assert those initial visible values
      await expect(sizeValue).toHaveText('20');
      await expect(speedValue).toHaveText('5');

      // The initial explanation paragraph text should match the static markup
      const currentStep = page.locator('#currentStep');
      await expect(currentStep).toBeVisible();
      await expect(currentStep).toContainText("Click \"Start Quick Sort\" to begin the visualization.");
    });

    test('visualization container should exist and initially be empty (no bars rendered by static HTML)', async ({ page }) => {
      // The visualization div exists
      const arrayContainer = page.locator('#arrayContainer');
      await expect(arrayContainer).toBeVisible();

      // Because the application's JavaScript may fail during parsing (script is incomplete),
      // the dynamic renderArray may not have executed. Assert that the container starts empty.
      await expect(arrayContainer).toBeEmpty();
    });
  });

  test.describe('Controls behavior given the page script (observing effects without modifying runtime)', () => {
    // These tests attempt user interactions and verify observed DOM changes (or lack thereof)
    test('clicking Generate New Array should not create bars if the script failed to execute', async ({ page }) => {
      // Click the Generate button
      await page.click('#generateBtn');

      // After clicking, wait briefly to allow any event handlers to run (if present)
      await page.waitForTimeout(200);

      // The visualization container should remain empty if the script did not attach handlers / render
      const arrayContainer = page.locator('#arrayContainer');
      await expect(arrayContainer).toBeEmpty();

      // The currentStep paragraph in static HTML should remain unchanged if no handler ran
      const currentStep = page.locator('#currentStep');
      await expect(currentStep).toContainText("Click \"Start Quick Sort\" to begin the visualization.");
    });

    test('adjusting the array size slider changes the input value but the displayed size span remains static if JS handlers are not attached', async ({ page }) => {
      const arraySizeSlider = page.locator('#arraySize');
      const sizeValue = page.locator('#sizeValue');

      // Programmatically set the slider's value to 10 and dispatch an input event.
      // This simulates a user interaction. We DO NOT patch or redefine in-page functions.
      await arraySizeSlider.evaluate((el) => {
        el.value = '10';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });

      // The input element's value should reflect the change
      const sliderValue = await arraySizeSlider.evaluate((el) => el.value);
      expect(sliderValue).toBe('10');

      // However, if the JS that updates #sizeValue didn't execute (because of a parse error),
      // the visible span text will remain the original '20'
      await expect(sizeValue).toHaveText('20');
    });

    test('Start Quick Sort button is present and clicking it does not start sorting when script failed (no bars created and no "Sorting completed" message)', async ({ page }) => {
      const sortBtn = page.locator('#sortBtn');
      const currentStep = page.locator('#currentStep');
      const arrayContainer = page.locator('#arrayContainer');

      // Ensure button is enabled according to static attribute (should not be disabled by default)
      await expect(sortBtn).toBeEnabled();

      // Click the sort button to attempt to start sorting
      await sortBtn.click();

      // Wait a short time to observe any changes
      await page.waitForTimeout(300);

      // If the script did not run, there should be no bars rendered and no "Sorting completed" update
      await expect(arrayContainer).toBeEmpty();
      await expect(currentStep).toContainText("Click \"Start Quick Sort\" to begin the visualization.");
    });
  });

  test.describe('Error and console observation (the page contains an incomplete script expected to produce errors)', () => {
    test('should have emitted at least one pageerror (likely a SyntaxError due to incomplete JS)', async () => {
      // We expect pageErrors to contain at least one entry because the provided HTML has an incomplete script.
      expect(pageErrors.length).toBeGreaterThan(0);

      // At least one of the errors should mention a SyntaxError or unexpected end of input
      const combinedMessages = pageErrors.map(e => e.message).join(' || ');
      const hasSyntax = /syntaxerror/i.test(combinedMessages);
      const hasUnexpectedEnd = /unexpected end of input/i.test(combinedMessages);
      // Accept either 'SyntaxError' or 'Unexpected end of input' as evidence of the truncated script
      expect(hasSyntax || hasUnexpectedEnd).toBeTruthy();
    });

    test('console should include error-level messages related to the script failure', async () => {
      // Filter console messages for those with type 'error' or containing 'SyntaxError' text
      const errorMsgs = consoleMessages.filter(m => m.type === 'error' || /syntaxerror|unexpected end of input/i.test(m.text));
      expect(errorMsgs.length).toBeGreaterThanOrEqual(1);

      // At least one console error should reference the script or show SyntaxError-like text
      const joined = consoleMessages.map(m => m.text).join(' || ');
      expect(/syntaxerror|unexpected end of input|uncaught/i.test(joined)).toBeTruthy();
    });
  });

  test.describe('Edge-case checks and accessibility of static elements', () => {
    test('all interactive controls have accessible names and are focusable', async ({ page }) => {
      // Buttons should be focusable and have non-empty accessible names (text content)
      for (const id of ['#generateBtn', '#sortBtn', '#resetBtn', '#stepBtn']) {
        const btn = page.locator(id);
        await expect(btn).toBeVisible();
        const text = await btn.innerText();
        expect(text.trim().length).toBeGreaterThan(0);
        // Focus the control to ensure it's tabbable/focusable
        await btn.focus();
        // Briefly check active element matches
        const activeId = await page.evaluate(() => document.activeElement && document.activeElement.id);
        expect(activeId === id.replace('#', '')).toBeTruthy();
      }
    });

    test('complexity table is present and contains expected headings', async ({ page }) => {
      const table = page.locator('.complexity-table');
      await expect(table).toBeVisible();
      await expect(table.locator('th').nth(0)).toHaveText(/Case/i);
      await expect(table.locator('th').nth(1)).toHaveText(/Time Complexity/i);
      await expect(table.locator('th').nth(2)).toHaveText(/Space Complexity/i);
    });
  });
});