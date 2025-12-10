import { test, expect } from '@playwright/test';

// Test file: 3cca9d74-d5af-11f0-852d-73feb043b9f3-sliding-window.spec.js
// Application URL (served by the test harness)
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca9d74-d5af-11f0-852d-73feb043b9f3.html';

// Page Object encapsulating interactions and queries for the Sliding Window page
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Returns the handle for the #window element
  async windowHandle() {
    return await this.page.$('#window');
  }

  // Returns computed dimensions and background color of #window
  async windowMetrics() {
    return await this.page.evaluate(() => {
      const el = document.querySelector('#window');
      if (!el) return null;
      const style = window.getComputedStyle(el);
      return {
        width: el.offsetWidth,
        height: el.offsetHeight,
        backgroundColor: style.backgroundColor,
        position: style.position,
      };
    });
  }

  // Count slide elements inside the window
  async countSlides() {
    return await this.page.evaluate(() => {
      const el = document.querySelector('#window');
      if (!el) return 0;
      return el.querySelectorAll('.slide').length;
    });
  }

  // Find any interactive controls on the page: buttons, inputs, selects, textareas, forms
  async findInteractiveControls() {
    return await this.page.evaluate(() => {
      const selectors = ['button', 'input', 'select', 'textarea', 'form', 'a[role="button"]'];
      const found = {};
      selectors.forEach(s => {
        found[s] = Array.from(document.querySelectorAll(s)).map(el => {
          // Provide minimal identifying info
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            className: el.className || null,
            text: (el.textContent || '').trim().slice(0, 100),
          };
        });
      });
      return found;
    });
  }
}

test.describe('Sliding Window Application - Basic UI and Error Observability', () => {
  // Arrays to capture console error messages and page errors for each test
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset captured errors
    consoleErrors = [];
    pageErrors = [];

    // Attach listeners BEFORE navigation to capture early errors (script load failures, runtime errors)
    page.on('console', msg => {
      // Only capture console messages with severity 'error'
      try {
        if (msg.type() === 'error') {
          // stringify arguments for clarity
          const text = [msg.text(), ...msg.args().map(a => a.toString())].join(' ');
          consoleErrors.push({ text, location: msg.location ? msg.location() : null });
        }
      } catch (e) {
        // Defensive: ensure listener does not throw
        consoleErrors.push({ text: `Error reading console message: ${String(e)}` });
      }
    });

    page.on('pageerror', exception => {
      // Capture uncaught exceptions on the page (ReferenceError, TypeError, etc.)
      pageErrors.push({
        message: exception.message,
        stack: exception.stack || null,
      });
    });

    // Navigate to the application and wait for load event
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // No special teardown required; listeners are tied to page lifecycle which Playwright cleans up.
  });

  test('Initial load: #window element is present with expected default styles', async ({ page }) => {
    // Purpose: Validate that the primary container (#window) exists and has the intended CSS applied.
    const app = new SlidingWindowPage(page);

    const handle = await app.windowHandle();
    // Ensure the element exists in the DOM
    expect(handle).not.toBeNull();

    // Validate computed metrics (width, height, background color and position)
    const metrics = await app.windowMetrics();
    expect(metrics).not.toBeNull();

    // Assert numeric dimensions (CSS in HTML sets 200px x 200px)
    expect(metrics.width).toBeGreaterThanOrEqual(200 - 2); // allow slight differences due to rendering
    expect(metrics.height).toBeGreaterThanOrEqual(200 - 2);

    // Background color should correspond to 'blue' as defined in the CSS.
    // Different browsers may report RGB; check for either 'blue' or rgb equivalent.
    const bg = (metrics.backgroundColor || '').toLowerCase();
    const bgIsBlue = bg.includes('rgb(0, 0, 255)') || bg.includes('blue') || bg.includes('#0000ff');
    expect(bgIsBlue).toBeTruthy();

    // Position style should be 'relative' per CSS
    expect(metrics.position).toBe('relative');
  });

  test('There are no interactive controls (buttons, inputs, forms, etc.) present by default', async ({ page }) => {
    // Purpose: Assert that the page contains no interactive controls since the provided HTML only has a div and a script.
    const app = new SlidingWindowPage(page);
    const controls = await app.findInteractiveControls();

    // For each selector type assert zero elements found
    for (const selector of Object.keys(controls)) {
      expect(controls[selector].length, `Expected no elements for selector ${selector}`).toBe(0);
    }
  });

  test('No slide elements exist by default inside #window', async ({ page }) => {
    // Purpose: Ensure that '.slide' children are not present unless created by the absent/misbehaving script.
    const app = new SlidingWindowPage(page);
    const count = await app.countSlides();
    expect(count).toBe(0);
  });

  test('Console and page errors are captured during page load (script load/runtime failures)', async ({ page }) => {
    // Purpose: Observe and assert that errors (script load failures, ReferenceError, SyntaxError, etc.) occurred.
    // This test intentionally verifies the presence of console errors or uncaught page errors.
    // Many static setups will produce a console error when the external script sliding_window.js is missing.
    // Wait a short time to allow any late errors to surface
    await page.waitForTimeout(200); // give the page a moment for async errors

    const combinedErrors = [
      ...consoleErrors.map(e => ({ source: 'console', text: e.text, location: e.location })),
      ...pageErrors.map(e => ({ source: 'pageerror', text: e.message, stack: e.stack })),
    ];

    // Provide debugging info in expectation messages if assertion fails
    // The test expects that at least one console error or uncaught page error happened naturally.
    expect(combinedErrors.length, `Expected at least one console 'error' or uncaught page error. Collected: ${JSON.stringify(combinedErrors, null, 2)}`).toBeGreaterThan(0);

    // Additionally, assert that at least one of the captured error messages refers to the sliding_window.js script
    // or is a typical runtime error (ReferenceError/TypeError/SyntaxError).
    const joinedText = combinedErrors.map(e => (e.text || '') + (e.stack || '')).join(' ').toLowerCase();

    const hasScriptMention = joinedText.includes('sliding_window') || joinedText.includes('sliding-window') || joinedText.includes('sliding_window.js');
    const hasRuntimeError = joinedText.includes('referenceerror') || joinedText.includes('typeerror') || joinedText.includes('syntaxerror') || joinedText.includes('uncaught');

    expect(hasScriptMention || hasRuntimeError, `Expected error text mentioning sliding_window.js or a runtime error. Collected texts: ${joinedText}`).toBeTruthy();
  });

  test('Diagnostic: capture raw console and page errors for inspection (does not fail if present)', async ({ page }) => {
    // Purpose: This test collects and asserts types of captured issues, while being descriptive about them.
    // It will still make assertions about the shape of captured data rather than forcing specific messages.
    await page.waitForTimeout(100);

    // Sanity checks on captured arrays
    expect(Array.isArray(consoleErrors)).toBeTruthy();
    expect(Array.isArray(pageErrors)).toBeTruthy();

    // At minimum, captured items (if any) should have expected fields
    for (const e of consoleErrors) {
      expect(e).toHaveProperty('text');
    }
    for (const e of pageErrors) {
      expect(e).toHaveProperty('message');
    }

    // If no errors exist, explicitly fail this diagnostic because the test suite expects to observe natural errors
    const total = consoleErrors.length + pageErrors.length;
    expect(total, 'Expected to observe at least one console/page error during load (diagnostic)').toBeGreaterThan(0);
  });
});