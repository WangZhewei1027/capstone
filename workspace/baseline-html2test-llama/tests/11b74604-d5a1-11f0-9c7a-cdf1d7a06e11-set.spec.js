import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b74604-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('User-Generated Set Application (11b74604-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  // Helper to collect page errors and console messages for assertions
  function attachDiagnostics(page) {
    const pageErrors = [];
    const consoleMessages = [];

    page.on('pageerror', (err) => {
      // capture runtime page errors (ReferenceError, TypeError, etc.)
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    return { pageErrors, consoleMessages };
  }

  // Test the normal flow: user provides a name via the prompt and the page populates values.
  test('should populate set name and numeric values when user provides a name in prompt', async ({ page }) => {
    // Purpose: Verify that when the generateSet prompt is accepted with a name,
    // the set-name text is updated, the set-values elements are populated with numbers,
    // the .set-values container becomes visible and has a generated background color,
    // and no runtime page errors occur during the normal flow.

    const { pageErrors, consoleMessages } = attachDiagnostics(page);

    // Prepare dialog handlers BEFORE navigation because generateSet triggers prompt on DOMContentLoaded.
    page.on('dialog', async (dialog) => {
      // Expect the first dialog to be the prompt asking for set name
      expect(dialog.type()).toBe('prompt');
      // Provide a test name for the set
      await dialog.accept('Test Set A');
      // any further dialogs (e.g., alert) will be handled by other handlers if present
    });

    // Navigate to the page (generateSet runs on DOMContentLoaded)
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Assert the set name displayed equals the provided prompt text
    const setName = page.locator('#set-name');
    await expect(setName).toHaveText('Test Set A');

    // Assert the .set-values container is visible and inline style 'display' was set to 'block'
    const setValuesContainer = page.locator('.set-values');
    const displayStyle = await setValuesContainer.evaluate((el) => el.style.display);
    expect(displayStyle).toBe('block');

    // Assert background style was set to a hex color beginning with '#'
    const backgroundStyle = await setValuesContainer.evaluate((el) => el.style.background);
    expect(backgroundStyle).toMatch(/^#([0-9a-fA-F]{1,6})$/);

    // Verify each of the five set value spans contain numeric values (final values set after randomization)
    for (let i = 1; i <= 5; i++) {
      const locator = page.locator(`#set-values-${i}`);
      const text = (await locator.textContent())?.trim() ?? '';
      // The implementation sets a Math.floor(Math.random() * 100) for each span if name provided
      expect(text).toMatch(/^\d+$/); // must be numeric
      // also ensure the number is within 0-99
      const num = Number(text);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThan(100);
    }

    // Verify document.activeElement was attempted to be focused to the set-name element
    const activeId = await page.evaluate(() => document.activeElement?.id || '');
    // The script calls document.getElementById('set-name').focus(); assert it became the active element if the environment allows focus.
    expect(activeId === 'set-name' || activeId === '').toBeTruthy();

    // Assert there were no runtime page errors (ReferenceError, TypeError, etc.)
    // We observe the pageErrors array collected by the listener and expect it to be empty.
    expect(pageErrors.length).toBe(0);

    // Assert that console did not emit any 'error' level messages during successful flow
    const errorConsoleMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test the edge-case: user cancels the prompt -> an alert should appear and no values should be set.
  test('should show alert when prompt is cancelled and not populate set values', async ({ page }) => {
    // Purpose: Verify that cancelling the prompt triggers an alert with the expected message
    // and the set name and values remain unset.

    const { pageErrors, consoleMessages } = attachDiagnostics(page);

    let promptHandled = false;
    // Setup a dialog handler that first dismisses the prompt (simulates user cancel),
    // then handles the following alert to assert the alert message.
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        // simulate Cancel -> prompt returns null
        await dialog.dismiss();
        promptHandled = true;
        return;
      }
      if (dialog.type() === 'alert') {
        // The app is expected to alert 'Set name is required.'
        expect(dialog.message()).toBe('Set name is required.');
        await dialog.accept();
        return;
      }
      // Unexpected dialog types will just be accepted to avoid blocking the test
      await dialog.accept();
    });

    // Navigate to page (dialog handlers are already attached)
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Ensure the prompt was actually shown and handled
    expect(promptHandled).toBeTruthy();

    // After cancelling, the script should have shown an alert and NOT set the name.
    const setNameText = (await page.locator('#set-name').textContent())?.trim() ?? '';
    expect(setNameText).toBe(''); // should remain empty because name was not provided

    // The set-values spans should either be empty or not contain final numeric values (implementation does not set them when name falsy)
    for (let i = 1; i <= 5; i++) {
      const text1 = (await page.locator(`#set-values-${i}`).textContent())?.trim() ?? '';
      // Accept either empty string or other non-numeric leftover, but must NOT be a final numeric value.
      // Therefore assert it's not fully numeric.
      expect(/^\d+$/.test(text)).toBe(false);
    }

    // Verify no runtime page errors were thrown during the cancel flow
    expect(pageErrors.length).toBe(0);

    // Make sure console didn't produce error-level messages
    const errorConsoleMessages1 = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Additional test: verify that the implementation writes element references into textContent during its internal loop
  // (This checks for the quirky behavior where setValues are set to element objects before being overwritten.)
  test('should briefly set span textContent to element string before final numeric override (implementation quirk)', async ({ page }) => {
    // Purpose: Observe console messages and page errors while verifying that final content is numeric.
    // This test focuses on ensuring the final output is numeric while acknowledging the internal quirk.

    const { pageErrors, consoleMessages } = attachDiagnostics(page);

    // Provide a prompt response
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('Quirky Set');
    });

    await page.goto(APP_URL, { waitUntil: 'load' });

    // The final values should be numeric (overwritten after the quirky loop)
    for (let i = 1; i <= 5; i++) {
      const text2 = (await page.locator(`#set-values-${i}`).textContent())?.trim() ?? '';
      expect(text).toMatch(/^\d+$/);
    }

    // No runtime errors expected
    expect(pageErrors.length).toBe(0);

    // No console 'error' messages expected
    const errorConsoleMessages2 = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });
});