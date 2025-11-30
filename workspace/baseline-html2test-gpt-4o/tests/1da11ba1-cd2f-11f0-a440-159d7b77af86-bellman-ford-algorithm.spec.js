import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11ba1-cd2f-11f0-a440-159d7b77af86.html';

/**
 * Page Object for the Bellman-Ford Visualization page.
 * Encapsulates selectors and common operations to keep tests readable.
 */
class BellmanFordPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.graphContainer = page.locator('#graph-container');
    this.nodes = page.locator('.node');
    this.canvas = page.locator('#edges');
    this.runButton = page.locator('button', { hasText: 'Run Bellman-Ford' });
  }

  // Returns locator for node by index (e.g., 0 -> #node0)
  nodeByIndex(idx) {
    return this.page.locator(`#node${idx}`);
  }

  // Clicks the Run Bellman-Ford button and waits for the alert dialog.
  // Returns the dialog message text.
  async clickRunAndGetDialogMessage() {
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.runButton.click()
    ]);
    const message = dialog.message();
    await dialog.accept();
    return message;
  }

  // Gets the canvas data URL (PNG) to verify something was drawn.
  async getCanvasDataURL() {
    return await this.page.evaluate(() => {
      const canvas = document.getElementById('edges');
      // toDataURL may throw in very old environments; let it throw naturally if so.
      return canvas.toDataURL();
    });
  }

  // Attempts to read the in-page `distances` variable. This may throw a ReferenceError
  // if the script used top-level const/let that doesn't create a window property.
  async readDistancesVariable() {
    return await this.page.evaluate(() => {
      // Intentionally access `distances` as written in the page script.
      return distances;
    });
  }
}

test.describe('Bellman-Ford Algorithm Visualization', () => {
  // Collect console messages and page errors for assertions.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console logs for analysis.
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', err => {
      // err is an Error object from the page context.
      pageErrors.push(err);
    });

    // Navigate to the application page.
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Nothing to teardown beyond Playwright fixtures; listeners are per-page and will be disposed.
  });

  test('Initial page load: title, graph container, nodes and canvas are present', async ({ page }) => {
    // Purpose: Verify the page loaded and the main elements are present and visible.
    const bellmanPage = new BellmanFordPage(page);

    // Title should be correct
    await expect(page).toHaveTitle(/Bellman-Ford Algorithm Visualization/);

    // Graph container visible
    await expect(bellmanPage.graphContainer).toBeVisible();

    // There should be 4 nodes (A, B, C, D) visible with correct labels
    await expect(bellmanPage.nodes).toHaveCount(4);
    const expectedLabels = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < expectedLabels.length; i++) {
      const node = bellmanPage.nodeByIndex(i);
      await expect(node).toBeVisible();
      await expect(node).toHaveText(expectedLabels[i]);
      // Each node should have data-x and data-y attributes present
      const dataX = await node.getAttribute('data-x');
      const dataY = await node.getAttribute('data-y');
      expect(dataX).toBeTruthy();
      expect(dataY).toBeTruthy();
    }

    // Canvas exists and has the expected attributes
    await expect(bellmanPage.canvas).toBeVisible();
    const width = await bellmanPage.canvas.getAttribute('width');
    const height = await bellmanPage.canvas.getAttribute('height');
    expect(width).toBe('600');
    expect(height).toBe('400');

    // Assert that no uncaught runtime errors were emitted during initial load.
    // This ensures the page didn't throw ReferenceError/SyntaxError/TypeError on load.
    expect(pageErrors.length).toBe(0);
  });

  test('Canvas drawing check: canvas has image data (toDataURL non-empty)', async ({ page }) => {
    // Purpose: Validate that the drawGraph function executed and something is rendered to the canvas.
    const bellmanPage = new BellmanFordPage(page);

    // toDataURL should return a data URI starting with "data:image"
    const dataURL = await bellmanPage.getCanvasDataURL();
    expect(typeof dataURL).toBe('string');
    expect(dataURL.length).toBeGreaterThan(20); // must be more than trivial
    expect(dataURL.startsWith('data:image/')).toBe(true);

    // No page errors emitted during this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Run Bellman-Ford button: shows alert with expected distances and updates internal distances', async ({ page }) => {
    // Purpose: Click the Run Bellman-Ford button, assert the alert contents,
    // and attempt to verify the in-page distances array was updated as expected.
    const bellmanPage = new BellmanFordPage(page);

    // Prepare to capture console/page errors that may occur during button click and algorithm run.
    // Click the button and capture the dialog's message
    const dialogMessage = await bellmanPage.clickRunAndGetDialogMessage();

    // Expected alert message (the page uses '<br>' join)
    const expectedAlert = [
      'Distance from A to A: 0',
      'Distance from A to B: 1',
      'Distance from A to C: -1',
      'Distance from A to D: 3'
    ].join('<br>');
    expect(dialogMessage).toBe(expectedAlert);

    // After the algorithm runs, attempt to read the `distances` variable from page context.
    // Note: In some browser script scoping rules, top-level const/let may not be properties of window;
    // accessing the identifier here may either succeed or throw a ReferenceError.
    let distancesValue;
    let distancesReadError = null;
    try {
      distancesValue = await bellmanPage.readDistancesVariable();
    } catch (err) {
      // Record the error for assertions below but allow the test to continue.
      distancesReadError = err;
    }

    // If we successfully read distances, assert they match the expected numeric values
    if (distancesReadError === null) {
      expect(Array.isArray(distancesValue)).toBe(true);
      // Values should be [0,1,-1,3]
      expect(distancesValue.length).toBe(4);
      expect(distancesValue.map(v => (Number.isFinite(v) ? v : v))).toEqual([0, 1, -1, 3]);
    } else {
      // If reading distances threw, assert it's a ReferenceError or similar, and that such an error was captured.
      // This asserts that we observed runtime scoping behavior rather than patching or hiding the error.
      expect(distancesReadError).toBeTruthy();
      // The thrown error name should be ReferenceError in the expected scenario where the identifier isn't accessible.
      // But accept other error names as well; assert that a page error or evaluation error occurred.
      const acceptedErrorNames = ['ReferenceError', 'Error', 'TypeError'];
      expect(acceptedErrorNames.includes(distancesReadError.name)).toBe(true);
    }

    // Ensure that no uncaught page errors (that we didn't explicitly catch) occurred during this flow.
    // pageErrors may include errors captured by the page; assert that there are zero unexpected errors.
    // Note: If reading distances caused a ReferenceError thrown inside evaluate, it will surface as an exception here,
    // not necessarily as a pageerror event. We already handled that above.
    expect(pageErrors.length).toBe(0);
  });

  test('DOM and styling checks: nodes have circular style and proper positions', async ({ page }) => {
    // Purpose: Validate some of the visual styling and inline positions for nodes to ensure UI fidelity.
    const bellmanPage = new BellmanFordPage(page);

    // Check that each node has a border-radius that makes it circular (computed style).
    for (let i = 0; i < 4; i++) {
      const node = bellmanPage.nodeByIndex(i);
      const computed = await node.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          width: style.width,
          height: style.height,
          borderRadius: style.borderRadius,
          backgroundColor: style.backgroundColor,
          position: style.position
        };
      });
      // Node dimensions should be present and borderRadius should indicate circular appearance
      expect(computed.width).toBeTruthy();
      expect(computed.height).toBeTruthy();
      // The CSS sets border-radius: 50% which should likely be returned as '50%' or '50% 50%' depending on browser.
      expect(/50%/.test(computed.borderRadius)).toBe(true);
      // Background color should be non-empty
      expect(computed.backgroundColor).toBeTruthy();
      // Position should be 'absolute' as per the CSS
      expect(computed.position).toBe('absolute');
    }

    // Check inline style left/top correspond to data-x/data-y attributes for at least one node
    const node0 = bellmanPage.nodeByIndex(0);
    const leftStyle = await node0.getAttribute('style'); // e.g., "left: 50px; top: 100px;"
    const dataX = await node0.getAttribute('data-x'); // "50"
    const dataY = await node0.getAttribute('data-y'); // "100"
    expect(leftStyle).toContain(`left: ${dataX}px`);
    expect(leftStyle).toContain(`top: ${dataY}px`);
  });

  test('Accessibility and semantics: run button is reachable and labelled', async ({ page }) => {
    // Purpose: Basic accessibility check that the main interactive control is focusable and has an accessible name.
    const bellmanPage = new BellmanFordPage(page);

    // The run button should have accessible name visible to screen readers (uses text content).
    const name = await bellmanPage.runButton.innerText();
    expect(name).toMatch(/Run Bellman-Ford/);

    // The button should be focusable via keyboard - simulate tabbing to it.
    await page.keyboard.press('Tab'); // Focus moves; depending on browser, this may focus first element
    // Ensure the button can be focused programmatically
    await bellmanPage.runButton.focus();
    const isFocused = await bellmanPage.runButton.evaluate(el => document.activeElement === el);
    expect(isFocused).toBe(true);
  });
});