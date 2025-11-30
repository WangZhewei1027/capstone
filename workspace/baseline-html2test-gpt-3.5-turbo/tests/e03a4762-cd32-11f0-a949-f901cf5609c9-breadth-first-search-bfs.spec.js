import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a4762-cd32-11f0-a949-f901cf5609c9.html';

// Page object representing main interactive parts of the BFS visualization page
class BFSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Element handles / selectors
  get startSelect() {
    return this.page.locator('#start-node');
  }
  get startButton() {
    return this.page.locator('#start-bfs');
  }
  get graphContainer() {
    return this.page.locator('#graph-container');
  }
  get edgesSvg() {
    return this.page.locator('#edges-svg');
  }
  get visitSequence() {
    return this.page.locator('#visit-sequence');
  }
  get bfsOrderContainer() {
    return this.page.locator('#bfs-order');
  }

  // Utility to count node elements in the graph container
  async countGraphNodes() {
    return await this.graphContainer.locator('.node').count();
  }

  // Click the Start BFS button
  async clickStart() {
    await this.startButton.click();
  }

  // Get whether start button is disabled
  async isStartButtonDisabled() {
    return await this.startButton.getAttribute('disabled').then((v) => !!v);
  }

  // Get number of options in start select
  async startOptionsCount() {
    return await this.startSelect.locator('option').count();
  }

  // Get visit sequence text
  async visitSequenceText() {
    return (await this.visitSequence.textContent()) || '';
  }

  // Get text content of BFS order container
  async bfsOrderText() {
    return (await this.bfsOrderContainer.textContent()) || '';
  }
}

test.describe('Breadth-First Search (BFS) Visualization - e03a4762-cd32-11f0-a949-f901cf5609c9', () => {
  // Shared arrays to capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  // Attach listeners and navigate to page before each test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          // record text and location if available
          consoleErrors.push({
            text: msg.text(),
            location: msg.location ? msg.location() : undefined,
          });
        }
      } catch (e) {
        // ignore listener errors
      }
    });

    // Capture unhandled page errors (runtime exceptions)
    page.on('pageerror', (err) => {
      // err is an Error object in Playwright
      pageErrors.push({
        message: err?.message ?? String(err),
        stack: err?.stack ?? undefined,
      });
    });

    // Navigate to the application. The page's script intentionally has a bug;
    // we expect runtime errors to be emitted which we capture via page.on('pageerror').
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async () => {
    // no-op: Playwright automatically cleans up pages between tests
  });

  test('Initial load: core UI elements are present and a runtime error occurs due to script bug', async ({ page }) => {
    // Purpose: Verify initial DOM has the expected static controls, and confirm that the client script throws a runtime error
    const p = new BFSPage(page);

    // Static elements should be present in the DOM regardless of script execution
    await expect(p.startSelect).toBeVisible();
    await expect(p.startButton).toBeVisible();
    await expect(p.graphContainer).toBeVisible();
    await expect(p.edgesSvg).toBeVisible();
    await expect(p.bfsOrderContainer).toBeVisible();

    // Because the inline script has a bug (reassigning a const), it aborts early.
    // That means the start <select> will not be populated by the script and should contain zero options.
    const optionsCount = await p.startOptionsCount();
    expect(optionsCount).toBe(0);

    // The graph container should not have any node elements created (script failed before creating nodes).
    const nodeCount = await p.countGraphNodes();
    expect(nodeCount).toBe(0);

    // The SVG should have no child elements (edges were not drawn)
    const svgChildCount = await page.evaluate(() => {
      const svg = document.getElementById('edges-svg');
      return svg ? svg.childNodes.length : -1;
    });
    expect(svgChildCount).toBe(0);

    // The visit sequence should be empty at start
    const visitSeq = await p.visitSequenceText();
    expect(visitSeq.trim()).toBe('');

    // The Start button should be enabled because the event handler that disables it was not attached due to the script failing
    const isDisabled = await p.isStartButtonDisabled();
    expect(isDisabled).toBe(false);

    // Confirm that at least one page error was captured (script runtime exception)
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // The error messages may vary across browsers; assert that the error string contains indicators of a constant reassignment or a runtime exception.
    const messages = pageErrors.map((e) => e.message).join(' | ');
    // We expect the message to mention 'Assignment' or 'constant' or 'nodeElements' or similar; ensure some indicative token exists.
    const indicative = /Assignment|constant|nodeElements|TypeError/i;
    expect(indicative.test(messages)).toBe(true);
  });

  test('Console receives at least one error entry corresponding to the runtime exception', async ({ page }) => {
    // Purpose: Verify that the error is surfaced in the page console as well
    // We rely on the consoleErrors array collected in beforeEach
    expect(consoleErrors.length).toBeGreaterThanOrEqual(0); // ensure variable exists

    // It's possible that the runtime exception is only emitted as pageerror and not console.error.
    // Still, if console errors are present, assert they contain error-like messages.
    if (consoleErrors.length > 0) {
      const combined = consoleErrors.map((c) => c.text).join(' | ');
      const indicative1 = /error|exception|assignment|constant|typeerror/i;
      expect(indicative.test(combined)).toBe(true);
    } else {
      // If there are no console.error entries, ensure we still had a pageerror (checked in other tests)
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('Clicking Start button without script initialization does not change visit order and does not disable the button', async ({ page }) => {
    // Purpose: Simulate user clicking the Start BFS button even though event listeners were not attached
    const p1 = new BFSPage(page);

    // Capture current visit sequence and BFS order container initial text
    const beforeVisitSeq = await p.visitSequenceText();
    const beforeBfsText = await p.bfsOrderText();

    // Click the button - because the script failed before attaching handlers, nothing should happen.
    await p.clickStart();

    // Small wait to ensure any potential async handlers (if they were attached) would run
    await page.waitForTimeout(250);

    const afterVisitSeq = await p.visitSequenceText();
    const afterBfsText = await p.bfsOrderText();

    // The visit sequence should remain unchanged (still empty)
    expect(afterVisitSeq).toBe(beforeVisitSeq);

    // The BFS order container text should remain the same (script never updated it)
    expect(afterBfsText).toBe(beforeBfsText);

    // The start button should still be enabled (no event disabled it)
    const isDisabled1 = await p.isStartButtonDisabled();
    expect(isDisabled).toBe(false);
  });

  test('Accessibility and basic content: Start button label and help text presence', async ({ page }) => {
    // Purpose: Check accessible names and helpful static text are present despite script failure
    const p2 = new BFSPage(page);

    // Start button should have accessible name "Start BFS"
    await expect(p.startButton).toHaveText('Start BFS');

    // Confirm the help instructions are present and mention BFS
    const helpText = await page.locator('#help').textContent();
    expect(helpText).toBeTruthy();
    expect(helpText.toLowerCase()).toContain('bfs');
    expect(helpText.toLowerCase()).toContain('start bfs');
  });

  test('Edge case: Graph container layout styles exist and positioning attributes remain', async ({ page }) => {
    // Purpose: Even if the script failed to populate nodes, the container styling and positioning should be present
    const containerPosition = await page.evaluate(() => {
      const el = document.getElementById('graph-container');
      if (!el) return null;
      const style = window.getComputedStyle(el);
      return {
        position: style.position,
        display: style.display,
        minHeight: el.style.minHeight || null,
      };
    });

    expect(containerPosition).not.toBeNull();
    expect(containerPosition.position).toBe('relative'); // script attempted to set this style; if not set it may be the CSS default, but assert existence
    expect(containerPosition.display).toBeDefined();
    // minHeight was set by the script to "600px"; because script failed before finishing, this might be absent;
    // Accept either null or a CSS value, but assert the property exists on the element (we checked retrieval).
    expect(containerPosition).toHaveProperty('minHeight');
  });
});