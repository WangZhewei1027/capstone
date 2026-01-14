import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad59b60-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Linear Regression Interactive App - FSM validation (Application ID: 8ad59b60-d59a-11f0-891d-f361d22ca68a)', () => {
  // Navigate to the page before each test to ensure a fresh state.
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  test('S0_Idle: initial render shows header, inputs, button and graph container', async ({ page }) => {
    // Validate entry evidence for Idle state: header exists
    const header = await page.locator('h1').textContent();
    expect(header).toBe('Linear Regression');

    // Validate that the expected form controls are present
    await expect(page.locator('input#x')).toBeVisible();
    await expect(page.locator('input#y')).toBeVisible();
    await expect(page.locator('input#range')).toBeVisible();
    await expect(page.locator('button#calculate')).toBeVisible();
    await expect(page.locator('#graph')).toBeVisible();

    // There should be no uncaught page errors on initial load (scripts attach listeners but don't throw at load time)
    const initialErrors: string[] = [];
    page.on('pageerror', (err) => initialErrors.push(String(err.message || err)));
    // Give a small grace period to ensure no late synchronous errors occur on load
    await page.waitForTimeout(200);
    expect(initialErrors.length).toBe(0);
  });

  test('SubmitForm transition: submitting the form attempts to draw graph and results in a runtime error due to canvas API misuse', async ({ page }) => {
    // Collect console messages and page errors generated during the interaction
    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(String(err.message || err));
    });

    // Fill inputs with valid numeric strings
    await page.fill('#x', '10');
    await page.fill('#y', '20');
    await page.fill('#range', '30');

    // When the form is submitted, the script attempts to call getContext on a DIV,
    // which should produce a TypeError in the page. Wait for that pageerror event.
    const pageErrorPromise = page.waitForEvent('pageerror', { timeout: 3000 }).catch(() => null);

    // Trigger the submit by clicking the button (button inside form defaults to submit)
    await page.click('#calculate');

    const pageError = await pageErrorPromise;

    // Assert that an uncaught page error occurred (expected because graphDiv is a div and has no getContext)
    expect(pageError).not.toBeNull();

    // The error message should reference getContext or similar; check that it includes 'getContext' or 'is not a function'
    const errMsg = String(pageError?.message ?? pageError ?? '');
    expect(
      errMsg.toLowerCase().includes('getcontext') ||
      errMsg.toLowerCase().includes('is not a function') ||
      errMsg.toLowerCase().includes('not a function')
    ).toBeTruthy();

    // Because execution threw before the console.log of stats, we should not see a console.log with "M:".
    const hasStatsLog = consoleMessages.some((c) => c.type === 'log' && c.text.includes('M:'));
    expect(hasStatsLog).toBeFalsy();

    // For completeness, ensure that the submit actually reached the event handler: the inputs were read into the script.
    // We can verify that the click happened and the page reacted (we observed an error), so the transition was attempted.
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
  });

  test('Line class: existence and default stats values (validate internal class behavior without fixing implementation)', async ({ page }) => {
    // Create a Line instance inside the page and inspect its stats property.
    // We do this in the page context: this does not modify application code, only inspects runtime objects.
    const stats = await page.evaluate(() => {
      // Ensure the class exists
      const hasLine = typeof (window as any).Line === 'function';
      if (!hasLine) return { hasLine: false };

      // Construct with simple numeric array (the original app maps inputs incorrectly,
      // but constructing should not throw synchronously)
      const instance = new (window as any).Line([1, 2, 3]);
      // Return the stats object as-is
      return {
        hasLine: true,
        stats: instance.stats,
        points: instance.points
      };
    });

    expect(stats.hasLine).toBeTruthy();
    // The default defined stats in the class should be present and be numeric zeros per the implementation
    expect(stats.stats).toBeDefined();
    expect(stats.stats.m).toBe(0);
    expect(stats.stats.b).toBe(0);
    expect(stats.stats.y_intercept).toBe(0);

    // Because the constructor maps items like item[0], item[1], and our items were numbers,
    // points may contain undefined x/y. Validate that points array exists but may have undefined coords.
    expect(Array.isArray(stats.points)).toBeTruthy();
    // points length should match input length
    expect(stats.points.length).toBe(3);
    // It's acceptable (and expected) that x/y may be undefined given the implementation bugs.
    // Assert that at least the points array contains objects
    expect(typeof stats.points[0]).toBe('object');
  });

  test('Edge case: submitting with empty inputs still triggers the same canvas API runtime error', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err.message || err)));

    // Ensure inputs are empty
    await page.fill('#x', '');
    await page.fill('#y', '');
    await page.fill('#range', '');

    // Trigger submit and wait for error
    const pageErrorPromise = page.waitForEvent('pageerror', { timeout: 3000 }).catch(() => null);
    await page.click('#calculate');
    const pageError = await pageErrorPromise;

    // Expect a page error similar to the earlier test
    expect(pageError).not.toBeNull();
    const errMsg = String(pageError?.message ?? pageError ?? '');
    expect(errMsg.toLowerCase().includes('getcontext') || errMsg.toLowerCase().includes('is not a function')).toBeTruthy();

    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
  });

  test('FSM coverage: confirm that the app lacks explicit renderPage/drawGraph functions but behaves according to observed evidence', async ({ page }) => {
    // FSM lists renderPage() on entry to Idle and drawGraph() on entry to Calculated.
    // The implementation does not define these functions; instead, we verify the observable evidence:
    // - Idle: header exists (checked previously)
    // - On submit (transition), an attempt to draw occurs and a canvas API error is thrown (checked previously)
    // Here we do lightweight checks to assert the absence of named functions and presence of evidence strings.
    const result = await page.evaluate(() => {
      return {
        hasRenderPage: typeof (window as any).renderPage === 'function',
        hasDrawGraph: typeof (window as any).drawGraph === 'function',
        headerText: document.querySelector('h1')?.textContent || null,
        hasFormListener: !!document.getElementById('form') && !!(document.getElementById('form') as HTMLFormElement).onsubmit === false
      };
    });

    // The functions are not present; this is expected for this implementation
    expect(result.hasRenderPage).toBeFalsy();
    expect(result.hasDrawGraph).toBeFalsy();

    // Validate Idle evidence
    expect(result.headerText).toBe('Linear Regression');
  });
});