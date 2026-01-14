import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb3f-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Divide and Conquer - Interactive App (11b7bb3f-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  // Navigate to the application before each test for a clean state
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  // Test initial page load and default state of the DOM
  test('Initial load: page title, header, structural elements and buttons are present', async ({ page }) => {
    // Verify the document title is correct
    await expect(page).toHaveTitle('Divide and Conquer');

    // Verify the main header text
    const header = await page.locator('h1');
    await expect(header).toHaveText('Divide and Conquer');

    // Verify structural elements exist: divider and div1, div2, div3
    const divider = await page.$('#divider');
    expect(divider).not.toBeNull();

    // Check style of divider (height from inline CSS)
    const dividerHeight = await page.evaluate(() => {
      const el = document.getElementById('divider');
      return el ? getComputedStyle(el).height : null;
    });
    expect(dividerHeight).toBeTruthy();
    // Height should be "50px" according to inline styles (tolerance: exact string match)
    expect(dividerHeight).toBe('50px');

    // Ensure div1, div2, div3 exist and are empty by default
    for (const id of ['div1', 'div2', 'div3']) {
      const el1 = await page.$(`#${id}`);
      expect(el).not.toBeNull();
      const text = await page.locator(`#${id}`).textContent();
      expect(text).toBe('');
    }

    // Check Start and Reset buttons exist and are visible/enabled
    const start = page.locator('#start');
    const reset = page.locator('#reset');
    await expect(start).toBeVisible();
    await expect(start).toBeEnabled();
    await expect(reset).toBeVisible();
    await expect(reset).toBeEnabled();

    // Important: The implementation expects an input with id="n" and a result element with id="result"
    // but they are not present in the provided HTML. Assert that they are missing.
    const nInput = await page.$('#n');
    const resultEl = await page.$('#result');
    expect(nInput).toBeNull();
    expect(resultEl).toBeNull();
  });

  // Test the Start button interaction that should cause a runtime error due to missing #n input
  test('Clicking Start without #n input triggers a runtime TypeError (observed via pageerror and console error)', async ({ page }) => {
    // Prepare to capture the first console error and the page error
    const consolePromise = page.waitForEvent('console', {
      predicate: (msg) => msg.type() === 'error'
    });
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Click the Start button which calls code that reads document.getElementById('n').value
    // This will naturally throw a TypeError because #n does not exist. We must not patch or fix it.
    await page.click('#start');

    // Await the captured console error and page error
    const consoleMsg = await consolePromise;
    const pageErr = await pageErrorPromise;

    // Assert that a page error was thrown and is an Error object
    expect(pageErr).toBeInstanceOf(Error);
    const msgText = pageErr.message || '';
    // Message text can vary across engines, so check for common patterns indicating a null property access
    expect(msgText).toMatch(/Cannot read properties of null|Cannot read property 'value'|null is not an object|Cannot set properties of undefined/i);

    // Inspect the console error text; it should reference the TypeError / missing 'value' access
    const consoleText = consoleMsg.text();
    expect(consoleText).toBeTruthy();
    // Console error text should include typical substrings pointing to the runtime error
    expect(consoleText).toMatch(/TypeError|Cannot read properties of null|reading 'value'|Cannot read property 'value'|uncaught/i);

    // Verify that because of the error, no #result was created and no unexpected text was injected into div1/div2/div3
    const resultEl1 = await page.$('#result');
    expect(resultEl).toBeNull();
    for (const id of ['div1', 'div2', 'div3']) {
      const text1 = await page.locator(`#${id}`).textContent();
      expect(text).toBe('');
    }
  });

  // Test the Reset button interaction which will attempt to set innerHTML on non-existent #result and trigger a runtime error
  test('Clicking Reset triggers a runtime error when #result is missing (error observed via pageerror)', async ({ page }) => {
    // Reload page to ensure a clean state for this test
    await page.reload();

    // Prepare to capture page error and console error
    const consolePromise1 = page.waitForEvent('console', {
      predicate: (msg) => msg.type() === 'error'
    });
    const pageErrorPromise1 = page.waitForEvent('pageerror');

    // Click Reset which runs code that references document.getElementById('result').innerHTML
    await page.click('#reset');

    // Await error observations
    const consoleMsg1 = await consolePromise;
    const pageErr1 = await pageErrorPromise;

    // Assert page error occurred
    expect(pageErr).toBeInstanceOf(Error);
    const errMsg = pageErr.message || '';
    // The message could indicate trying to set innerHTML of null or reading properties; accept common variants
    expect(errMsg).toMatch(/Cannot set properties of null|Cannot read properties of null|Cannot set property 'innerHTML'|null is not an object/i);

    // Assert console error includes similar hints
    const consoleText1 = consoleMsg.text();
    expect(consoleText).toBeTruthy();
    expect(consoleText).toMatch(/TypeError|Cannot set properties of null|innerHTML|Cannot read properties of null|uncaught/i);
  });

  // Verify that UI state remains stable after runtime errors: buttons still clickable and content unchanged
  test('After failed interactions, UI remains stable: buttons are enabled and div content unchanged', async ({ page }) => {
    // Trigger the Start error once
    const pageErrorPromise2 = page.waitForEvent('pageerror');
    await page.click('#start');
    await pageErrorPromise;

    // Buttons should still be present and enabled after the error
    await expect(page.locator('#start')).toBeVisible();
    await expect(page.locator('#start')).toBeEnabled();
    await expect(page.locator('#reset')).toBeVisible();
    await expect(page.locator('#reset')).toBeEnabled();

    // The div containers should still be empty (no partial mutation should have occurred)
    for (const id of ['div1', 'div2', 'div3']) {
      const text2 = await page.locator(`#${id}`).textContent();
      expect(text).toBe('');
    }

    // The missing #n and #result should remain missing
    expect(await page.$('#n')).toBeNull();
    expect(await page.$('#result')).toBeNull();
  });

  // Accessibility-related checks for the visible interactive controls
  test('Accessibility and visibility: interactive buttons are focusable and have accessible names', async ({ page }) => {
    // Ensure the Start button can be focused and has accessible name text
    const start1 = page.locator('#start1');
    await start.focus();
    await expect(start).toBeFocused();
    await expect(start).toHaveText('Start');

    // Ensure the Reset button can be focused and has accessible name text
    const reset1 = page.locator('#reset1');
    await reset.focus();
    await expect(reset).toBeFocused();
    await expect(reset).toHaveText('Reset');
  });
});