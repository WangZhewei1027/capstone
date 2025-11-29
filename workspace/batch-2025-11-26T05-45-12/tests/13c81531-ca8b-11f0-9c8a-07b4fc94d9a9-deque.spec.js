import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-45-12/html/13c81531-ca8b-11f0-9c8a-07b4fc94d9a9.html';

test.describe('Deque (Application ID: 13c81531-ca8b-11f0-9c8a-07b4fc94d9a9) - FSM: idle', () => {
  // The FSM has a single state "idle" and a diagnostic event NO_INTERACTIVE_ELEMENTS
  // triggered by the presence of selectors: "#deque, h1, body, html".
  // These tests validate DOM presence, the diagnostic condition, and expected lack of interactive controls.

  test('Page loads and required static elements exist (h1, #deque, body, html)', async ({ page }) => {
    // Collect console messages and page errors while loading the page for diagnostic assertions
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    // Navigate to the provided HTML page
    await page.goto(APP_URL);

    // Basic sanity checks: title and expected static elements
    await expect(page).toHaveTitle('Deque');

    // Validate presence of selectors mentioned in the FSM triggers
    const h1 = page.locator('h1');
    const dequeDiv = page.locator('#deque');
    const body = page.locator('body');
    const html = page.locator('html');

    await expect(h1).toHaveCount(1);
    await expect(dequeDiv).toHaveCount(1);
    await expect(body).toHaveCount(1);
    await expect(html).toHaveCount(1);

    // Validate content of the H1
    await expect(h1).toHaveText('Deque');

    // The FSM's diagnostic event NO_INTERACTIVE_ELEMENTS is based on lack of interactive controls.
    // Assert that there are no interactive form controls or anchor links on the page.
    const interactiveSelectors = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[role="button"]',
      'summary' // include other possible interactive elements
    ];
    for (const sel of interactiveSelectors) {
      const count = await page.locator(sel).count();
      expect(count, `Expected zero elements for selector "${sel}"`).toBe(0);
    }

    // The deque element exists but is initially empty (static page). Ensure it has no children or text.
    const dequeInnerHTML = await dequeDiv.evaluate((el) => el.innerHTML);
    expect(dequeInnerHTML.trim(), 'Expected #deque to be empty').toBe('');

    // Ensure the body contains exactly the expected nodes (h1 and #deque) to guard against unexpected dynamic content
    const bodyChildrenCount = await body.evaluate((b) => b.children.length);
    expect(bodyChildrenCount, 'Expected body to contain exactly 2 children (h1 and #deque)').toBe(2);

    // Assert no runtime exceptions were emitted to the page (ReferenceError/SyntaxError/TypeError/etc.)
    // These would appear as pageerror events or console errors.
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(pageErrors.length, 'No pageerror events should have occurred during load').toBe(0);
    expect(consoleErrors.length, 'No console error messages should have been logged during load').toBe(0);
  });

  test('FSM diagnostic trigger NO_INTERACTIVE_ELEMENTS is satisfied by selectors and is idempotent (idle self-transition)', async ({ page }) => {
    // This test validates the FSM condition: when the specified selectors exist and no interactive elements are present,
    // the diagnostic event NO_INTERACTIVE_ELEMENTS would fire. Because the FSM maps this event back to "idle" (self-loop),
    // repeated checks should produce the same observation and the DOM should remain unchanged (onEnter/onExit are noop).
    await page.goto(APP_URL);

    // Snapshot of important DOM state before "event"
    const snapshot = {
      title: await page.title(),
      h1Text: await page.locator('h1').textContent(),
      dequeHTML: await page.locator('#deque').evaluate((el) => el.innerHTML),
      bodyHTML: await page.locator('body').evaluate((b) => b.innerHTML)
    };

    // Validate presence of the diagnostic trigger selectors (these are the triggers for NO_INTERACTIVE_ELEMENTS)
    for (const sel of ['#deque', 'h1', 'body', 'html']) {
      const count = await page.locator(sel).count();
      expect(count, `Expected selector "${sel}" to be present and count > 0`).toBeGreaterThan(0);
    }

    // Because the page is static and FSM actions are "noop" on enter/exit, reloading the page is a good proxy
    // for re-evaluating the diagnostic event and confirming nothing changes (idle self-transition).
    await page.reload();

    // Re-snapshot and compare to confirm "noop" behavior
    const snapshotAfter = {
      title: await page.title(),
      h1Text: await page.locator('h1').textContent(),
      dequeHTML: await page.locator('#deque').evaluate((el) => el.innerHTML),
      bodyHTML: await page.locator('body').evaluate((b) => b.innerHTML)
    };

    expect(snapshotAfter).toEqual(snapshot);
  });

  test('Attempting to interact with non-existent controls fails naturally (expected Playwright errors)', async ({ page }) => {
    // Edge case test: user code attempting to interact with controls that do not exist should fail.
    // We let Playwright throw its natural errors and assert that they are thrown (we do not patch or suppress them).
    await page.goto(APP_URL);

    // Attempt to click a button that does not exist; this should throw a timeout/waiting-for-selector error
    let clickErrorThrown = false;
    try {
      // Short timeout so the error occurs quickly
      await page.click('button', { timeout: 1000 });
    } catch (e) {
      clickErrorThrown = true;
      // The error message should mention waiting for selector or that it could not be found.
      expect(String(e.message)).toMatch(/waiting for selector|No node found|Locator|Element is not attached|failed to find element/i);
    }
    expect(clickErrorThrown, 'Expected clicking a non-existent button to throw an error').toBe(true);

    // Attempt to fill an input that does not exist; should also throw
    let fillErrorThrown = false;
    try {
      await page.fill('input[type="text"]', 'test', { timeout: 1000 });
    } catch (e) {
      fillErrorThrown = true;
      expect(String(e.message)).toMatch(/waiting for selector|No node found|Locator|failed to find element/i);
    }
    expect(fillErrorThrown, 'Expected filling a non-existent input to throw an error').toBe(true);
  });

  test('Diagnostics: ensure there are no unexpected runtime exceptions or console errors across navigation', async ({ page }) => {
    // This test specifically observes console and pageerror events over navigation and asserts none occur.
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate, reload, and navigate back to ensure stability across typical lifecycle events
    await page.goto(APP_URL);
    await page.reload();
    await page.goto(APP_URL);

    // No page errors or console errors expected for this static page
    expect(pageErrors.length, 'No page errors should have been reported').toBe(0);
    expect(consoleErrors.length, 'No console error messages should have been reported').toBe(0);
  });
});