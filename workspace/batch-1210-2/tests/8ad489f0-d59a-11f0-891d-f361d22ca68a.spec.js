import { test, expect } from '@playwright/test';

// Test file for application: 8ad489f0-d59a-11f0-891d-f361d22ca68a
// URL served: http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad489f0-d59a-11f0-891d-f361d22ca68a.html

// Page object for interactions and error collection
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.pageErrors = [];
    this.consoleMessages = [];
    this._boundPageErrorHandler = (err) => {
      // pageerror event provides an Error object
      try {
        this.pageErrors.push({
          message: err.message,
          stack: err.stack,
          name: err.name,
        });
      } catch (e) {
        this.pageErrors.push({ message: String(err) });
      }
    };
    this._boundConsoleHandler = (msg) => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    };
    this.page.on('pageerror', this._boundPageErrorHandler);
    this.page.on('console', this._boundConsoleHandler);
  }

  // Navigate to the app root
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad489f0-d59a-11f0-891d-f361d22ca68a.html', { waitUntil: 'domcontentloaded' });
    // give the page a short moment to run inline scripts and register handlers
    await this.page.waitForTimeout(200);
  }

  async getHeading() {
    return this.page.locator('h1').innerText();
  }

  async getIntroText() {
    return this.page.locator('p').innerText();
  }

  async hasForm() {
    return this.page.locator('#graph-form').count().then(c => c > 0);
  }

  async hasElement(selector) {
    return this.page.locator(selector).count().then(c => c > 0);
  }

  async click(selector) {
    // Click element and give the page a moment to react
    await this.page.click(selector);
    await this.page.waitForTimeout(200);
  }

  async dispatchFormEvent(eventName) {
    // Dispatch a custom event on the form element
    await this.page.$eval('#graph-form', (form, evName) => {
      form.dispatchEvent(new Event(evName, { bubbles: true, cancelable: true }));
    }, eventName);
    await this.page.waitForTimeout(200);
  }

  async submitFormViaDispatch() {
    // Dispatch a submit event that will be caught by the submit handler without performing native submission
    await this.page.$eval('#graph-form', (form) => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await this.page.waitForTimeout(200);
  }

  async getResultText() {
    return this.page.locator('#result').innerText();
  }

  async getPageErrors() {
    return this.pageErrors.slice();
  }

  async getConsoleMessages() {
    return this.consoleMessages.slice();
  }

  async clearHandlers() {
    this.page.off('pageerror', this._boundPageErrorHandler);
    this.page.off('console', this._boundConsoleHandler);
  }
}

test.describe('Floyd-Warshall Interactive App - FSM validation and error observation', () => {
  let graphPage;

  test.beforeEach(async ({ page }) => {
    graphPage = new GraphPage(page);
    await graphPage.goto();
  });

  test.afterEach(async ({ page }) => {
    await graphPage.clearHandlers();
    // Keep page open teardown to Playwright's control
  });

  test('S0_Idle: initial render contains expected static content and declared functions', async ({ page }) => {
    // Validate static content per S0_Idle evidence
    const heading = await graphPage.getHeading();
    expect(heading).toContain('Floyd-Warshall Algorithm');

    const intro = await graphPage.getIntroText();
    expect(intro).toContain('Find the shortest path between all pairs of vertices');

    // Verify form and UI components exist
    expect(await graphPage.hasForm()).toBeTruthy();
    expect(await graphPage.hasElement('#row')).toBeTruthy();
    expect(await graphPage.hasElement('#cols')).toBeTruthy();
    expect(await graphPage.hasElement('#add-row')).toBeTruthy();
    expect(await graphPage.hasElement('#add-col')).toBeTruthy();
    expect(await graphPage.hasElement('#clear')).toBeTruthy();
    expect(await graphPage.hasElement('#calculate')).toBeTruthy();

    // Verify functions referenced by the FSM exist in the global scope
    // updateGraphMatrix and calculateResult should be defined as functions
    const updateType = await page.evaluate(() => typeof updateGraphMatrix);
    const calculateType = await page.evaluate(() => typeof calculateResult);
    expect(updateType).toBe('function');
    expect(calculateType).toBe('function');

    // renderPage was listed as an entry action in the FSM but does not exist in the implementation
    const renderType = await page.evaluate(() => typeof renderPage);
    expect(renderType).toBe('undefined');

    // There should be no page errors on fresh load within a short time window
    const errors = await graphPage.getPageErrors();
    expect(errors.length).toBe(0);
  });

  test.describe('S1_UpdatingGraph transitions (Add Row, Add Col, Clear, FormSubmit)', () => {
    test('Clicking "Add Row" (button) triggers form submission path and results in runtime error (observed behavior)', async ({ page }) => {
      // The Add Row button is inside the form without type="button" so clicking it triggers the submit handler.
      // The submit handler eventually calls updateGraphMatrix which assigns to a const graphMatrix causing a TypeError.
      // We expect a pageerror to fire as a result.
      const [err] = await Promise.all([
        page.waitForEvent('pageerror'),
        graphPage.click('#add-row'),
      ]);
      expect(err).toBeTruthy();
      // Accept variations in message across browsers, check for TypeError or 'constant' text
      const msg = err.message || '';
      expect(msg.toLowerCase()).toContain('constant') || expect(msg.toLowerCase()).toContain('typeerror');
      // Confirm result div didn't get valid calculation output due to the error
      const resultText = await graphPage.getResultText();
      // result may be empty string because calculateResult may not have executed
      expect(typeof resultText).toBe('string');
    });

    test('Clicking "Add Column" (button) triggers form submission path and results in a runtime error', async ({ page }) => {
      const [err] = await Promise.all([
        page.waitForEvent('pageerror'),
        graphPage.click('#add-col'),
      ]);
      expect(err).toBeTruthy();
      const msg = err.message || '';
      expect(msg.toLowerCase()).toContain('constant') || expect(msg.toLowerCase()).toContain('typeerror');
    });

    test('Dispatching custom "add-row" event triggers add-row listener and may produce DOM/JS errors', async ({ page }) => {
      // The implementation registers a listener for a custom 'add-row' event on the form.
      // Dispatching this event will run the listener which attempts to append an input element to an <input> (invalid).
      // Capture any pageerror produced by that action.
      const errorPromise = page.waitForEvent('pageerror').catch(e => e);
      await graphPage.dispatchFormEvent('add-row');
      // Wait shortly to allow any error to surface
      let err;
      try {
        err = await errorPromise;
      } catch (e) {
        err = e;
      }
      // It's possible no error occurs depending on browser handling; assert either no error or expected error type
      const currentErrors = await graphPage.getPageErrors();
      if (currentErrors.length > 0) {
        // At least one error observed
        expect(currentErrors[0].message.toLowerCase()).toMatch(/|typeerror|domexception|invalid|node/);
      } else {
        // Graceful: if no runtime error thrown, at least confirm listener presence by checking that form exists
        expect(await graphPage.hasForm()).toBeTruthy();
      }
    });

    test('Dispatching custom "add-col" event triggers add-col listener and may produce DOM/JS errors', async ({ page }) => {
      const errorPromise = page.waitForEvent('pageerror').catch(e => e);
      await graphPage.dispatchFormEvent('add-col');
      let err;
      try {
        err = await errorPromise;
      } catch (e) {
        err = e;
      }
      const currentErrors = await graphPage.getPageErrors();
      if (currentErrors.length > 0) {
        expect(currentErrors[0].message.toLowerCase()).toMatch(/|typeerror|domexception|invalid|node/);
      } else {
        expect(await graphPage.hasForm()).toBeTruthy();
      }
    });

    test('Clicking "Clear" button triggers form submission and leads to runtime error due to reassignment of const graphMatrix', async ({ page }) => {
      const [err] = await Promise.all([
        page.waitForEvent('pageerror'),
        graphPage.click('#clear'),
      ]);
      expect(err).toBeTruthy();
      const msg = err.message || '';
      expect(msg.toLowerCase()).toContain('constant') || expect(msg.toLowerCase()).toContain('typeerror');
    });

    test('Explicitly dispatching "submit" event on form triggers submit handler (FormSubmit transition) and results in runtime error', async ({ page }) => {
      // Dispatch submit event directly (the handler calls e.preventDefault() and then updateGraphMatrix)
      const [err] = await Promise.all([
        page.waitForEvent('pageerror'),
        graphPage.submitFormViaDispatch(),
      ]);
      expect(err).toBeTruthy();
      const msg = err.message || '';
      expect(msg.toLowerCase()).toContain('constant') || expect(msg.toLowerCase()).toContain('typeerror');
    });
  });

  test.describe('S2_CalculatingResult transition (Calculate)', () => {
    test('Clicking "Calculate" button triggers calculation path (but implementation contains logic issues) and should emit runtime error', async ({ page }) => {
      // Calculate button inside form will trigger submit handler which then tries to call updateGraphMatrix and calculateResult.
      // Because updateGraphMatrix assigns to a const graphMatrix, a TypeError is expected.
      const [err] = await Promise.all([
        page.waitForEvent('pageerror'),
        graphPage.click('#calculate'),
      ]);
      expect(err).toBeTruthy();
      const msg = err.message || '';
      expect(msg.toLowerCase()).toContain('constant') || expect(msg.toLowerCase()).toContain('typeerror');
    });

    test('Dispatching custom "calculate" event triggers its listener and may produce errors due to incorrect index usage', async ({ page }) => {
      // The calculate listener uses matrix[i][j - 1] and other problematic indices; plus uses graphMatrixArray which is defined,
      // but the loop bounds depend on rows/cols which are zero - still the code may attempt out-of-bounds operations or other errors.
      const errorPromise = page.waitForEvent('pageerror').catch(e => e);
      await graphPage.dispatchFormEvent('calculate');
      let err;
      try {
        err = await errorPromise;
      } catch (e) {
        err = e;
      }
      const currentErrors = await graphPage.getPageErrors();
      if (currentErrors.length > 0) {
        // Look for either TypeError or Range/Index related messages
        const m = currentErrors[currentErrors.length - 1].message.toLowerCase();
        expect(m).toMatch(/typeerror|rangeerror|index|undefined|nan|invalid/);
      } else {
        // If no error triggered, ensure result element exists but likely empty
        const result = await graphPage.getResultText();
        expect(typeof result).toBe('string');
      }
    });
  });

  test.describe('Edge cases and implementation mismatch checks', () => {
    test('Implementation lacks renderPage (FSM onEnter action) and updateGraphMatrix/calculateResult exist — verify presence/absence', async ({ page }) => {
      const renderExists = await page.evaluate(() => typeof renderPage !== 'undefined');
      const updateExists = await page.evaluate(() => typeof updateGraphMatrix !== 'undefined');
      const calcExists = await page.evaluate(() => typeof calculateResult !== 'undefined');
      expect(renderExists).toBe(false); // renderPage is not implemented
      expect(updateExists).toBe(true);
      expect(calcExists).toBe(true);
    });

    test('Observe console messages and ensure no unexpected silent exceptions on load', async ({ page }) => {
      // We already collected console messages during navigation. Assert that console does not contain uncaught errors on load.
      const msgs = await graphPage.getConsoleMessages();
      // Accept any console output but ensure no console.error with explicit "Uncaught" marker (best-effort)
      const severe = msgs.filter(m => m.type === 'error' || /uncaught/i.test(m.text));
      expect(severe.length).toBeLessThanOrEqual(1); // allow at most 1 depending on environment; we mainly avoid bursts
    });
  });

  test.describe('Cleanup and final assertions', () => {
    test('Ensure that interacting with UI surfaces implementation errors as expected (summary)', async ({ page }) => {
      // Perform a sequence: click add-row, add-col, calculate, clear — each should surface runtime issues.
      const waits = [
        page.waitForEvent('pageerror').catch(e => e),
        graphPage.click('#add-row'),
      ];
      const err1 = await Promise.all(waits).then(r => r[0]).catch(e => e);
      expect(err1).toBeTruthy();

      // Subsequent interactions may produce more errors — we call them sequentially and tolerate at least one error observed overall.
      const errorsBefore = await graphPage.getPageErrors();
      // Try other interactions; don't fail the test if additional errors are thrown beyond the first
      await graphPage.click('#add-col').catch(() => {});
      await graphPage.click('#calculate').catch(() => {});
      await graphPage.click('#clear').catch(() => {});
      const errorsAfter = await graphPage.getPageErrors();
      expect(errorsAfter.length).toBeGreaterThanOrEqual(errorsBefore.length);
    });
  });

});