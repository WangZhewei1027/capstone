import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6a6e3-d5a1-11f0-80b9-e1f86cea383f.html';

/**
 * Page object for the Weighted Graph app.
 * Encapsulates page interactions and collects page errors & console errors.
 */
class GraphPage {
  constructor(page) {
    this.page = page;
    this.pageErrors = [];
    this.consoleErrors = [];
    // Bind handlers so we can remove them later
    this._onPageError = (err) => {
      // Store the Error object (pageerror event provides a JS Error)
      this.pageErrors.push(err);
    };
    this._onConsole = (msg) => {
      if (msg.type() === 'error') {
        // Store text of console error messages
        this.consoleErrors.push(msg.text());
      }
    };
  }

  // Initialize listeners and navigate to the page
  async init() {
    this.page.on('pageerror', this._onPageError);
    this.page.on('console', this._onConsole);
    await this.page.goto(APP_URL);
    // Give a short moment to allow script runtime errors to surface
    await this.page.waitForTimeout(100);
  }

  // Remove listeners (teardown)
  async dispose() {
    this.page.off('pageerror', this._onPageError);
    this.page.off('console', this._onConsole);
  }

  // Helpers to query the DOM
  async getHeadingText() {
    return this.page.textContent('h1');
  }

  async getCanvasAttributes() {
    return this.page.$eval('#graph', (c) => ({
      id: c.id,
      widthAttr: c.getAttribute('width'),
      heightAttr: c.getAttribute('height'),
      widthProp: c.width,
      heightProp: c.height
    }));
  }

  async getCanvasComputedStyle() {
    return this.page.$eval('#graph', (c) => {
      const s = window.getComputedStyle(c);
      return {
        borderStyle: s.borderStyle,
        borderWidth: s.borderWidth,
        borderColor: s.borderColor
      };
    });
  }

  async countInteractiveControls() {
    return this.page.$$eval('button, input, select, form, textarea, a[role="button"]', (els) => els.length);
  }

  async bodyElementCount() {
    return this.page.$eval('body', (b) => b.querySelectorAll('*').length);
  }
}

test.describe('Weighted Graph (90f6a6e3-d5a1-11f0-80b9-e1f86cea383f) - UI and runtime behavior', () => {
  let graphPage;
  test.beforeEach(async ({ page }) => {
    // Create page object and navigate; listeners are attached before navigation in init()
    graphPage = new GraphPage(page);
    await graphPage.init();
  });

  test.afterEach(async () => {
    // Remove listeners to avoid leaking between tests
    if (graphPage) await graphPage.dispose();
  });

  test('Initial page load: heading and canvas are present with expected attributes', async () => {
    // Purpose: Verify static DOM elements exist and canvas is properly set up.
    const heading = await graphPage.getHeadingText();
    expect(heading).toBeTruthy();
    expect(heading.trim()).toBe('Weighted Graph');

    const canvasInfo = await graphPage.getCanvasAttributes();
    // The HTML sets width and height attributes to "400"
    expect(canvasInfo.id).toBe('graph');
    expect(canvasInfo.widthAttr).toBe('400');
    expect(canvasInfo.heightAttr).toBe('400');
    // The corresponding properties should also be numeric 400
    expect(canvasInfo.widthProp).toBe(400);
    expect(canvasInfo.heightProp).toBe(400);

    // Check computed CSS border style applied by the page stylesheet
    const computed = await graphPage.getCanvasComputedStyle();
    // Border style and width are expected; color representation may vary but borderWidth and style should match
    expect(computed.borderStyle).toBe('solid');
    expect(computed.borderWidth).toBe('1px');
  });

  test('No interactive controls exist (no buttons, inputs, selects, forms)', async () => {
    // Purpose: Confirm the page contains no forms or interactive input controls as per the HTML.
    const interactiveCount = await graphPage.countInteractiveControls();
    expect(interactiveCount).toBe(0);
  });

  test('Clicking the canvas does not add or remove DOM elements', async ({ page }) => {
    // Purpose: Ensure user interaction (click) on the canvas does not unexpectedly mutate the DOM.
    const initialCount = await graphPage.bodyElementCount();
    await page.click('#graph');
    // Allow any potential handlers to run (there are none in the HTML, but be defensive)
    await page.waitForTimeout(50);
    const afterClickCount = await graphPage.bodyElementCount();
    expect(afterClickCount).toBe(initialCount);
  });

  test('Script runtime errors occur during drawing and are reported as page errors and console errors', async () => {
    // Purpose: Observe and assert runtime errors emitted by the in-page script are captured.
    // The implementation uses ctx.arc with invalid arguments (string used for x coordinate), which should cause a TypeError
    // or at least generate a console/page error in modern browsers. We assert that such errors were collected.

    // There should be at least one page error captured
    expect(graphPage.pageErrors.length).toBeGreaterThanOrEqual(1);

    // At least one of the captured page errors should be related to canvas arc invocation or a TypeError
    const pageErrorMessages = graphPage.pageErrors.map((e) => (e && e.message) || String(e));
    const hasArcRelated = pageErrorMessages.some((msg) =>
      /arc|Failed to execute|NaN|TypeError/i.test(msg)
    );
    expect(hasArcRelated).toBeTruthy();

    // Also check console.error messages that might accompany the pageerror
    // Many browsers emit a console message as well; assert that at least one console error was captured or allow if none present.
    // We assert that either the consoleErrors array has entries OR the pageErrors clearly indicate the problem.
    if (graphPage.consoleErrors.length > 0) {
      const consoleHasArc = graphPage.consoleErrors.some((text) =>
        /arc|Failed to execute|NaN|TypeError/i.test(text)
      );
      // If console errors exist, at least one should reference the canvas arc problem
      expect(consoleHasArc).toBeTruthy();
    } else {
      // If no console errors, ensure the pageErrors already satisfied the arc-related expectation above
      expect(hasArcRelated).toBeTruthy();
    }
  });

  test('Internal graph data structure is not exposed as a global variable', async ({ page }) => {
    // Purpose: Ensure the const graph defined in the script is not unintentionally attached to window.
    // Top-level const declarations in module/global script do not create window properties.
    const globalGraphType = await page.evaluate(() => {
      try {
        // Accessing an undeclared variable would throw; check property on window instead
        return typeof window.graph;
      } catch (e) {
        return `error:${String(e)}`;
      }
    });
    // Expect graph is not defined on window (likely 'undefined')
    expect(globalGraphType).toBe('undefined');
  });

  test('Accessibility check: heading is exposed to assistive technologies', async ({ page }) => {
    // Purpose: Basic accessibility check: verify the main heading is discoverable by role query.
    const heading1 = page.getByRole('heading1', { name: 'Weighted Graph' });
    await expect(heading).toBeVisible();
  });
});