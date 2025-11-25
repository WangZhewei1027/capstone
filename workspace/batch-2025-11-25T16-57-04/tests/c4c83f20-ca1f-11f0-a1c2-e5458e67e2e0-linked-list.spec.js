import { test, expect } from '@playwright/test';

const PAGE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T16-57-04/html/c4c83f20-ca1f-11f0-a1c2-e5458e67e2e0.html';

/**
 * Page object for the LinkedList example page.
 * Encapsulates common interactions and inspections used in tests.
 */
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} url
   */
  constructor(page, url) {
    this.page = page;
    this.url = url;
    this.consoleMessages = [];
    this._consoleHandler = (msg) => {
      // store type and text for assertions
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    };
    this._pageErrorMessages = [];
    this._pageErrorHandler = (err) => {
      this._pageErrorMessages.push(err);
    };
  }

  async attachConsoleCapture() {
    this.consoleMessages = [];
    this.page.on('console', this._consoleHandler);
    this.page.on('pageerror', this._pageErrorHandler);
  }

  async detachConsoleCapture() {
    this.page.off('console', this._consoleHandler);
    this.page.off('pageerror', this._pageErrorHandler);
  }

  getConsoleLogs() {
    return this.consoleMessages.filter(m => m.type === 'log').map(m => m.text);
  }

  getConsoleErrors() {
    return this.consoleMessages.filter(m => m.type === 'error').map(m => m.text);
  }

  getPageErrors() {
    return this._pageErrorMessages.slice();
  }

  async open() {
    await this.page.goto(this.url, { waitUntil: 'load' });
    // allow any synchronous inline scripts to run
    await this.page.waitForTimeout(20);
  }

  async reload() {
    await this.page.reload({ waitUntil: 'load' });
    await this.page.waitForTimeout(20);
  }

  async headingText() {
    return this.page.locator('h1').textContent();
  }

  async paragraphText() {
    return this.page.locator('p').textContent();
  }

  async getWindowList() {
    // return undefined if not set
    return this.page.evaluate(() => {
      // window.list might be global; return a copy or undefined
      return (typeof window.list !== 'undefined') ? window.list : undefined;
    });
  }
}

test.describe('LinkedList example (FSM: idle -> executing_script -> completed)', () => {
  // Attach console capture for each test
  test.beforeEach(async ({ page }) => {
    // noop here; tests create page object and attach capture individually
  });

  test.afterEach(async ({ page }) => {
    // ensure the page is left clean between tests
    try {
      await page.close();
    } catch (e) {
      // ignore if already closed
    }
  });

  test('Initial PAGE_LOADED triggers inline script execution and SCRIPT_FINISHED (normal run)', async ({ page }) => {
    // This test validates:
    // - PAGE_LOADED leads to inline script execution (runInlineScript onEnter)
    // - The script prints expected values to console (visual/DOM side-effects)
    // - After script completes, window.list contains the expected final array (SCRIPT_FINISHED -> completed)
    const linked = new LinkedListPage(page, PAGE_URL);
    await linked.attachConsoleCapture();

    // Navigate to page (triggers PAGE_LOADED)
    await linked.open();

    // Assert static DOM content is present (page reached idle -> executing_script)
    const h1 = await linked.headingText();
    expect(h1).toBe('LinkedList Example');
    const p = await linked.paragraphText();
    expect(p.trim()).toBe('This is an example of a linked list.');

    // The inline script runs synchronously on load; wait a little to ensure all console logs are captured.
    await page.waitForTimeout(20);

    // Capture and assert console messages from the two printList calls:
    // First printList (after insertAtEnd): outputs 2,2,3,4,5
    // After removeElement and appendNode and second printList: 2,3,4,5,6
    const logs = linked.getConsoleLogs();
    // There should be 10 numeric log entries in the exact order described in the implementation.
    expect(logs.length).toBeGreaterThanOrEqual(10);
    // Take the first 10 log entries and assert sequence
    const firstTen = logs.slice(0, 10);
    expect(firstTen).toEqual(['2', '2', '3', '4', '5', '2', '3', '4', '5', '6']);

    // Verify the global list variable was updated to the expected final state
    const finalList = await linked.getWindowList();
    expect(finalList).toEqual([2, 3, 4, 5, 6]);

    // No page-level errors should have been raised
    const pageErrors = linked.getPageErrors();
    expect(pageErrors.length).toBe(0);

    await linked.detachConsoleCapture();
  });

  test('Reload from completed state triggers RELOAD -> idle and re-executes the inline script', async ({ page }) => {
    // This test validates:
    // - After the page reaches completed, calling reload triggers the RELOAD event and returns to idle
    // - The inline script runs again on reload producing the same DOM and console effects
    const linked = new LinkedListPage(page, PAGE_URL);
    await linked.attachConsoleCapture();

    // Initial load
    await linked.open();
    await page.waitForTimeout(10);
    // Clear captured logs to focus on the reload run
    linked.consoleMessages = [];

    // Reload the page (this triggers RELOAD)
    await linked.reload();

    // Wait a tiny bit for scripts to run
    await page.waitForTimeout(20);

    // After reload, the inline script should have run again and produced same sequence of console logs
    const logsAfterReload = linked.getConsoleLogs();
    expect(logsAfterReload.length).toBeGreaterThanOrEqual(10);
    const firstTenAfterReload = logsAfterReload.slice(0, 10);
    expect(firstTenAfterReload).toEqual(['2', '2', '3', '4', '5', '2', '3', '4', '5', '6']);

    // The global list should have been recreated and be the expected final array
    const finalList = await linked.getWindowList();
    expect(finalList).toEqual([2, 3, 4, 5, 6]);

    await linked.detachConsoleCapture();
  });

  test('SCRIPT_ERROR event is fired when inline script throws (simulate by routing modified HTML)', async ({ page, context }) => {
    // This test validates:
    // - SCRIPT_ERROR transition: when the inline script throws an unhandled error, the page emits a pageerror
    // - The page still loads DOM content but the script's side-effects (window.list) are not present
    // We'll intercept the network request for the target HTML and return a version where the script throws.
    const errorHtml = `
      <html>
      <head><title>LinkedList - Error</title></head>
      <body>
        <h1>LinkedList Example</h1>
        <p>This is an example of a linked list.</p>
        <script>
          // Intentional runtime error to simulate SCRIPT_ERROR
          throw new Error('Intentional script error for testing');
        </script>
      </body>
      </html>
    `;

    // Route the single request matching the PAGE_URL
    await context.route(PAGE_URL, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: errorHtml
      });
    });

    const linked = new LinkedListPage(page, PAGE_URL);
    await linked.attachConsoleCapture();

    // Navigate - this will load our error-injecting HTML
    const [pageError] = await Promise.all([
      // wait for the pageerror event to ensure we capture the SCRIPT_ERROR
      page.waitForEvent('pageerror').catch(e => e),
      page.goto(PAGE_URL, { waitUntil: 'load' })
    ]);

    // pageError should be an Error object (or event)
    expect(pageError).toBeTruthy();
    // The page should have a DOM (the heading) even if the script threw
    const heading = await linked.headingText();
    expect(heading).toBe('LinkedList Example');

    // The inline script threw, so window.list should be undefined (no successful run)
    const list = await linked.getWindowList();
    expect(list).toBeUndefined();

    // The pageerror should contain our intentional message
    const pageErrors = linked.getPageErrors();
    // At least one pageerror should be recorded
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    // Validate one of the errors contains the expected message substring
    const hasIntentional = pageErrors.some(err => (err && String(err.message || err)).includes('Intentional script error'));
    expect(hasIntentional).toBe(true);

    await linked.detachConsoleCapture();

    // Remove route handler by un-routing the URL to avoid affecting other tests
    await context.unroute(PAGE_URL);
  });

  test('Reload during executing_script cancels previous run and starts a fresh run (edge case)', async ({ page, context }) => {
    // This test validates:
    // - When inline script is long-running (delayed), issuing a reload during execution aborts the previous script run
    // - Only the second run (post-reload) finishes; the first delayed completion does not fire (simulates RELOAD interrupting executing_script)
    // We'll route the page to serve a modified HTML with delayed console logs so we can reliably reload during execution.
    const delayedHtml = `
      <html>
      <head><title>LinkedList - Delayed</title></head>
      <body>
        <h1>LinkedList Example</h1>
        <p>This is an example of a linked list.</p>
        <script>
          // Mark the start of a run
          console.log('delayed-start');
          // A delayed finish; this would normally complete the "script run"
          setTimeout(() => {
            console.log('delayed-finished');
            // also set a global to indicate completion
            window.list = [999];
          }, 300);
        </script>
      </body>
      </html>
    `;

    // Ensure the route returns the delayed content for both initial navigation and reload
    await context.route(PAGE_URL, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: delayedHtml
      });
    });

    const linked = new LinkedListPage(page, PAGE_URL);
    await linked.attachConsoleCapture();

    // Start navigation to begin the delayed script execution
    await page.goto(PAGE_URL, { waitUntil: 'load' });

    // Wait briefly to allow the script to start (it logs 'delayed-start')
    await page.waitForTimeout(50);

    // Trigger reload while the first delayed setTimeout has not fired yet
    const reloadPromise = page.reload({ waitUntil: 'load' });

    // Wait for reload to complete
    await reloadPromise;

    // Now wait for a 'delayed-finished' console entry from the second run.
    // If reload correctly cancelled the first run, we should see exactly one 'delayed-finished' message.
    // Give enough time for the second delayed finish (each run waits ~300ms)
    await page.waitForTimeout(400);

    const logs = linked.getConsoleLogs();

    // Count occurrences of delayed-start and delayed-finished
    const starts = logs.filter(text => text === 'delayed-start');
    const finishes = logs.filter(text => text === 'delayed-finished');

    // We expect two 'delayed-start' messages (one for initial load, one for reload)
    expect(starts.length).toBeGreaterThanOrEqual(2);

    // The critical assertion: only one 'delayed-finished' should be observed (the first was cancelled by reload).
    // In an environment where reload cancels timers, this will be true.
    expect(finishes.length).toBe(1);

    // Also confirm that the global list corresponds to the second run's assignment
    const finalList = await linked.getWindowList();
    expect(finalList).toEqual([999]);

    await linked.detachConsoleCapture();

    // Clean up route for other tests
    await context.unroute(PAGE_URL);
  });

  test('Assertions and coverage: verifying idle onEnter/onExit conceptual actions (noop/startScript) via observable effects', async ({ page }) => {
    // This test provides additional assertions that map FSM onEnter/onExit conceptual actions
    // - idle.onEnter is noop: when the page is first reachable, no DOM change must have happened until script runs
    // - idle.onExit triggers startScript: navigating (PAGE_LOADED) should lead immediately to script side-effects
    const linked = new LinkedListPage(page, PAGE_URL);
    await linked.attachConsoleCapture();

    // Before navigation: we can't examine the remote DOM. This assertion is conceptual: we assert that
    // immediately after navigation the inline script has executed (startScript/runInlineScript occurred).
    await linked.open();

    // Immediately after load, console logs from the script must be present (evidence that startScript happened on idle.onExit)
    const logs = linked.getConsoleLogs();
    expect(logs.length).toBeGreaterThanOrEqual(1);

    // OnExit for executing_script is noop; we assert no unexpected modifications to page structure occurred:
    const h1 = await linked.headingText();
    expect(h1).toBe('LinkedList Example');

    await linked.detachConsoleCapture();
  });
});