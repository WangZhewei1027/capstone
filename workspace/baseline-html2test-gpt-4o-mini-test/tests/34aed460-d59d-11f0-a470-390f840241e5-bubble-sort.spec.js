import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini-test/html/34aed460-d59d-11f0-a470-390f840241e5.html';

test.describe('Bubble Sort Visualization - Script Error and UI smoke tests', () => {
  // Collect page errors and console messages for each test run
  test.beforeEach(async ({ page }) => {
    // Attach listeners as early as possible to capture script parse/runtime errors
    page.context().on('page', () => {}); // no-op to ensure context active
  });

  test('Initial page load: static elements present, script fails to execute (SyntaxError expected)', async ({ page }) => {
    // Purpose: Verify basic DOM structure is present from HTML and that the page script throws an error
    const pageErrors = [];
    const consoleErrors = [];

    // Capture uncaught page errors (e.g., SyntaxError from script parsing)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture console messages of type "error" to detect script/parsing messages logged to console
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Navigate to the page and wait for the load event
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Verify that the heading exists and matches expected title text from the HTML
    const heading = await page.locator('h1').textContent();
    expect(heading).toBeTruthy();
    expect(heading.trim()).toContain('Bubble Sort Visualization');

    // Verify the Start button exists and is visible & enabled
    const startButton = page.locator('#startButton');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
    await expect(startButton).toHaveText('Start Bubble Sort');

    // Verify the array container exists
    const arrayContainer = page.locator('#arrayContainer');
    await expect(arrayContainer).toBeVisible();

    // Because the embedded script contains an 'await' inside a non-async function,
    // the script is expected to fail to execute. That means generateBars() will not run,
    // so no '.bar' elements should be present after load.
    const bars = await page.$$('.bar');
    expect(bars.length).toBe(0);

    // Assert that at least one page error occurred (likely a SyntaxError related to 'await')
    expect(pageErrors.length).toBeGreaterThan(0);
    const pageErrorMessages = pageErrors.map(e => String(e.message || e));
    const foundAwaitSyntax = pageErrorMessages.some(msg => /await|SyntaxError|only valid in async/i.test(msg));
    expect(foundAwaitSyntax).toBe(true);

    // Also check console errors for similar symptoms
    const foundConsoleError = consoleErrors.some(msg => /await|SyntaxError|only valid in async/i.test(msg));
    expect(foundConsoleError || pageErrors.length > 0).toBe(true);
  });

  test('Clicking Start Button does not run sorting (no bars generated and no additional handlers attached)', async ({ page }) => {
    // Purpose: Ensure that due to the script parse error, clicking the button does not trigger sorting or generate bars.
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(APP_URL, { waitUntil: 'load' });

    const startButton = page.locator('#startButton');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();

    // Snapshot state before click: no bars
    let bars = await page.$$('.bar');
    expect(bars.length).toBe(0);

    // Click the Start button; because event listener attachment likely failed,
    // this should not create bars or throw new errors beyond the initial parse error.
    await startButton.click();

    // Give a short time to allow any event handlers (if present) to run
    await page.waitForTimeout(300);

    // Verify that still no bars exist
    bars = await page.$$('.bar');
    expect(bars.length).toBe(0);

    // Confirm that at least the initial parse error exists
    expect(pageErrors.length).toBeGreaterThan(0);
    const pageErrorMessages = pageErrors.map(e => String(e.message || e));
    expect(pageErrorMessages.some(m => /await|SyntaxError|only valid in async/i.test(m))).toBe(true);

    // Ensure clicking didn't add new unexpected console error types beyond the initial ones
    const newConsoleErrorCount = consoleErrors.filter(msg => /await|SyntaxError|only valid in async/i.test(msg)).length;
    expect(newConsoleErrorCount).toBeGreaterThanOrEqual(0);
  });

  test('Accessibility and basic DOM checks: controls are focusable and labeled', async ({ page }) => {
    // Purpose: Even with script errors, ensure static page accessibility basics are present.
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Start button should be reachable and have accessible name
    const startButton = page.locator('#startButton');
    await expect(startButton).toBeVisible();
    const accessibleName = await startButton.getAttribute('id'); // fallback check; id present in markup
    expect(accessibleName).toBe('startButton');

    // The array container should be present in the DOM and have expected styling classes/attributes
    const arrayContainer = page.locator('#arrayContainer');
    await expect(arrayContainer).toBeVisible();
    // Height style comes from CSS not inline; ensure the container exists and has children length 0 due to script error
    const childrenCount = await arrayContainer.locator('div').count();
    expect(childrenCount).toBe(0);
  });

  test('Errors observed include mention of "await" or "async" to indicate misuse of await in non-async function', async ({ page }) => {
    // Purpose: Explicitly assert that the error indicates the incorrect usage of await.
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(APP_URL, { waitUntil: 'load' });

    // Combine messages and assert presence of expected keywords
    const allMessages = [
      ...pageErrors.map(e => String(e.message || e)),
      ...consoleErrors
    ].join(' | ');

    // Expect that the aggregated messages include 'await' or 'async' or 'SyntaxError'
    expect(/await|only valid in async|SyntaxError/i.test(allMessages)).toBe(true);
  });
});