import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad26710-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Deque Interactive App - FSM validation and error observation', () => {
  // Page object helpers
  const selectors = {
    input: '#number',
    addButton: '#add',
    removeButton: '#remove',
    viewButton: '#view',
    dequeContainer: '#deque',
    heading: 'h1'
  };

  // Utility to navigate and collect console/page errors
  async function loadPageAndCollectErrors(page) {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        try {
          consoleErrors.push(msg.text());
        } catch {
          // ignore
        }
      }
    });
    page.on('pageerror', err => {
      try {
        pageErrors.push(err);
      } catch {
        // ignore
      }
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Give runtime a short moment to emit any parsing/runtime errors.
    await page.waitForTimeout(300);

    return { consoleErrors, pageErrors };
  }

  test('Page loads and a script SyntaxError / redeclaration error is emitted', async ({ page }) => {
    // This test validates that the broken HTML/JS emits a script error (expected per spec).
    const { consoleErrors, pageErrors } = await loadPageAndCollectErrors(page);

    // Basic DOM sanity checks (even if script failed, DOM should be present)
    await expect(page.locator(selectors.heading)).toHaveText(/Deque Example/);
    await expect(page.locator(selectors.input)).toBeVisible();
    await expect(page.locator(selectors.addButton)).toBeVisible();
    await expect(page.locator(selectors.removeButton)).toBeVisible();
    await expect(page.locator(selectors.viewButton)).toBeVisible();
    await expect(page.locator(selectors.dequeContainer)).toBeVisible();

    // We expect at least one page error OR at least one console error describing the syntax/redeclaration.
    const mergedErrorText = [
      ...consoleErrors,
      ...pageErrors.map(e => (e && e.message) ? e.message : String(e))
    ].join(' | ');

    // Assert we observed an error and that it likely pertains to redeclaration / syntax.
    expect(mergedErrorText.length).toBeGreaterThan(0);

    // The exact message can vary across engines; check for common substrings.
    const expectedPatterns = /(already been declared|Identifier|SyntaxError|redeclar|duplicate|duplicate declaration)/i;
    expect(mergedErrorText).toMatch(expectedPatterns);
  });

  test.describe('FSM transitions (attempted) and graceful failure checks', () => {
    // Each of these tests attempts to exercise events described in the FSM.
    // Because the page script contains a syntax/redeclaration error, the event handlers
    // will not be attached. Tests therefore confirm that:
    // - No unexpected dialogs are shown (handlers not present),
    // - Inputs remain unchanged after clicks,
    // - Console / page errors were emitted on load.

    test('Attempting AddClick: input not cleared and no alert (script failed)', async ({ page }) => {
      const { consoleErrors, pageErrors } = await loadPageAndCollectErrors(page);

      // Put a value into the input to simulate user typing a positive number
      await page.fill(selectors.input, '42');

      // Monitor for dialogs that would indicate the handler ran
      let dialogShown = false;
      page.on('dialog', dialog => {
        dialogShown = true;
        dialog.dismiss().catch(() => {});
      });

      // Click the Add button (this should trigger add handler if script worked)
      await page.click(selectors.addButton);

      // Wait a short time to allow any handler to run if it existed
      await page.waitForTimeout(300);

      // Because of the script error, handler shouldn't run: no dialog and input unchanged
      expect(dialogShown).toBe(false);
      const inputValue = await page.inputValue(selectors.input);
      expect(inputValue).toBe('42');

      // Ensure we did observe the page/script error earlier
      const mergedErrorText = [
        ...consoleErrors,
        ...pageErrors.map(e => (e && e.message) ? e.message : String(e))
      ].join(' | ');
      expect(mergedErrorText).toMatch(/(already been declared|SyntaxError|Identifier)/i);
    });

    test('Attempting AddClick with invalid value would alert but handler absent', async ({ page }) => {
      await loadPageAndCollectErrors(page);

      // Enter a non-positive number (edge case) which should trigger an alert if handler ran
      await page.fill(selectors.input, '0');

      let dialogShown = false;
      page.on('dialog', dialog => {
        dialogShown = true;
        dialog.dismiss().catch(() => {});
      });

      await page.click(selectors.addButton);
      await page.waitForTimeout(300);

      // Since script failed, no alert should appear and input remains '0'
      expect(dialogShown).toBe(false);
      const inputValue = await page.inputValue(selectors.input);
      expect(inputValue).toBe('0');
    });

    test('Attempting RemoveClick: no input population because handler absent', async ({ page }) => {
      await loadPageAndCollectErrors(page);

      // Ensure input is blank initially
      await page.fill(selectors.input, '');

      let dialogShown = false;
      page.on('dialog', dialog => {
        dialogShown = true;
        dialog.dismiss().catch(() => {});
      });

      // Click Remove -- if handler existed and deque empty it would alert; otherwise nothing
      await page.click(selectors.removeButton);
      await page.waitForTimeout(300);

      expect(dialogShown).toBe(false);
      // Still blank because event handler didn't run
      const inputValue = await page.inputValue(selectors.input);
      expect(inputValue).toBe('');
    });

    test('Attempting ViewClick: no alert showing deque contents because handler absent', async ({ page }) => {
      await loadPageAndCollectErrors(page);

      let dialogShown = false;
      page.on('dialog', dialog => {
        dialogShown = true;
        dialog.dismiss().catch(() => {});
      });

      // Click View -- if handler existed and deque empty it would alert "Deque is empty",
      // or show contents if items present. Since script failed, nothing should happen.
      await page.click(selectors.viewButton);
      await page.waitForTimeout(300);

      expect(dialogShown).toBe(false);
    });

    test('Sanity check: event handlers are not attached due to script error (no side-effects on DOM)', async ({ page }) => {
      // This test verifies that clicking buttons does not mutate the DOM values that handlers would have changed.
      await loadPageAndCollectErrors(page);

      // Set value then click add; if handler worked it would clear the input.
      await page.fill(selectors.input, '7');
      await page.click(selectors.addButton);
      await page.waitForTimeout(200);
      expect(await page.inputValue(selectors.input)).toBe('7');

      // Click remove; if handler worked and deque had items it would set the input to popped value.
      await page.fill(selectors.input, '');
      await page.click(selectors.removeButton);
      await page.waitForTimeout(200);
      expect(await page.inputValue(selectors.input)).toBe('');

      // Click view; if handler worked and deque had items it would show an alert.
      let dialogOccured = false;
      page.on('dialog', () => { dialogOccured = true; });
      await page.click(selectors.viewButton);
      await page.waitForTimeout(200);
      expect(dialogOccured).toBe(false);
    });
  });

  test('Final assertion: developer-provided FSM expects handlers but runtime shows they did not initialize', async ({ page }) => {
    // This test ties together the FSM expectations with the observed runtime failure.
    const { consoleErrors, pageErrors } = await loadPageAndCollectErrors(page);

    // The FSM expects Add/Remove/View handlers to exist. Because of the script error,
    // handlers are not functional. Confirm that the page emitted an error consistent with a syntax/redeclaration problem.
    const mergedErrorText = [
      ...consoleErrors,
      ...pageErrors.map(e => (e && e.message) ? e.message : String(e))
    ].join(' | ');

    // Ensure an error exists and mention common keywords.
    expect(mergedErrorText.length).toBeGreaterThan(0);
    expect(mergedErrorText).toMatch(/(already been declared|SyntaxError|Identifier)/i);

    // And confirm the DOM components expected by the FSM are present (extraction succeeded).
    await expect(page.locator(selectors.input)).toBeVisible();
    await expect(page.locator(selectors.addButton)).toBeVisible();
    await expect(page.locator(selectors.removeButton)).toBeVisible();
    await expect(page.locator(selectors.viewButton)).toBeVisible();
  });
});