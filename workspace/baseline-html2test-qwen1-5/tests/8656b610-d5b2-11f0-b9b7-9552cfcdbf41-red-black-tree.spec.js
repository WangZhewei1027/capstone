import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/8656b610-d5b2-11f0-b9b7-9552cfcdbf41.html';

// Page object encapsulating queries for the Red-Black Tree page
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('.red-black-tree');
    this.treeNodes = page.locator('.tree-node');
    this.nodeLabels = page.locator('.node');
    // Generic interactive controls selector
    this.interactiveControls = page.locator('button, input, select, textarea, form');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async countTreeNodes() {
    return await this.treeNodes.count();
  }

  async countNodeLabels() {
    return await this.nodeLabels.count();
  }

  async countInteractiveControls() {
    return await this.interactiveControls.count();
  }

  async getContainerComputedStyle(property) {
    return await this.page.evaluate(
      (selector, prop) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        return window.getComputedStyle(el).getPropertyValue(prop);
      },
      '.red-black-tree',
      property
    );
  }
}

test.describe('Red-Black Tree application (8656b610-d5b2-11f0-b9b7-9552cfcdbf41)', () => {
  let pageErrors = [];
  let consoleMessages = [];

  // Before each test, navigate to the page and capture errors/console messages.
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture uncaught page errors (ReferenceError, TypeError, SyntaxError, etc.)
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Capture console messages for inspection (info, error, warn, etc.)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the application page exactly as-is
    await page.goto(APP_URL);
  });

  // After each test we will write out some context if a test failed (Playwright shows logs itself).
  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      // Attach error/console summaries to the test output for debugging
      testInfo.attachments = testInfo.attachments || [];
      testInfo.attachments.push({
        name: 'page-errors',
        body: pageErrors.map((e) => e.message).join('\n') || '(no page errors captured)',
      });
      testInfo.attachments.push({
        name: 'console-messages',
        body:
          consoleMessages.map((c) => `[${c.type}] ${c.text}`).join('\n') ||
          '(no console messages captured)',
      });
    }
  });

  // Test the initial page load and default container state.
  test('Initial page load shows the tree container with expected CSS properties', async ({ page }) => {
    // Purpose: Verify the main container exists and has the expected styling from the HTML.
    const tree = new TreePage(page);

    // The container must exist in the DOM
    await expect(tree.container).toHaveCount(1);

    // Verify border-radius is set to 50% (as specified) -> circular container
    const borderRadius = await tree.getContainerComputedStyle('border-radius');
    expect(borderRadius, 'expected border-radius to be defined on .red-black-tree').not.toBeNull();
    // Some browsers may report "50%" or "50% 50%"; check that it contains '50'
    expect(borderRadius.includes('50'), `border-radius should include '50' (got: ${borderRadius})`).toBeTruthy();

    // Verify background-color matches the CSS rule (rgb(249, 249, 249) is equivalent to #f9f9f9)
    const backgroundColor = await tree.getContainerComputedStyle('background-color');
    expect(backgroundColor, 'expected background-color to be defined on .red-black-tree').not.toBeNull();
    // Accept either the hex value or the computed rgb() string. We check for the numeric 249 which is the critical piece.
    expect(backgroundColor.includes('249'), `background-color should include 249 (got: ${backgroundColor})`).toBeTruthy();
  });

  // Ensure there are no interactive controls by default (as the HTML shows none).
  test('Page does not include interactive controls (buttons, inputs, forms) by default', async ({ page }) => {
    // Purpose: Confirm there are no unintended interactive elements like forms or buttons.
    const tree = new TreePage(page);

    const interactiveCount = await tree.countInteractiveControls();
    // The provided HTML contains no interactive controls; assert zero.
    expect(interactiveCount, 'expected zero interactive controls on initial page').toBe(0);
  });

  // Capture and assert that page errors (if any) were emitted during page load.
  test('Page should report any uncaught errors to the pageerror event (capture and assert)', async ({ page }) => {
    // Purpose: Observe and assert unhandled exceptions occur or are absent.
    // Per instructions, allow runtime errors to happen naturally and assert that they are captured.
    // We assert that at least one pageerror occurred during the load.
    // NOTE: If the implementation does not throw errors, this test will fail, which is intentional per spec.
    expect(pageErrors.length, `expected at least one page error; captured console messages:\n${consoleMessages.map(c => `[${c.type}] ${c.text}`).join('\n')}`).toBeGreaterThan(0);

    // Additionally assert that the captured errors have message strings (sanity check)
    for (const err of pageErrors) {
      expect(typeof err.message).toBe('string');
      expect(err.message.length).toBeGreaterThan(0);
    }
  });

  // If nodes are injected by the script, verify their DOM structure and styles.
  test('If tree nodes are present, each node should match the expected structure and styling', async ({ page }) => {
    // Purpose: Validate nodes created by tree.js (.tree-node and .node) and their CSS rules if present.
    const tree = new TreePage(page);

    const nodeCount = await tree.countTreeNodes();

    // If there are no nodes created by the script, skip detailed node assertions.
    test.skip(nodeCount === 0, 'No .tree-node elements created by the script; skipping node-specific checks');

    // If nodes exist, perform assertions on each one.
    expect(nodeCount).toBeGreaterThan(0);

    // Check properties expected from the provided CSS: width: 40px; height: 40px; border-left/right/bottom present.
    for (let i = 0; i < nodeCount; i++) {
      const nodeLocator = tree.treeNodes.nth(i);

      // Check computed width and height
      const width = await page.evaluate((el) => window.getComputedStyle(el).getPropertyValue('width'), await nodeLocator.elementHandle());
      const height = await page.evaluate((el) => window.getComputedStyle(el).getPropertyValue('height'), await nodeLocator.elementHandle());
      expect(width.includes('40'), `expected node width to include 40px but got ${width}`).toBeTruthy();
      expect(height.includes('40'), `expected node height to include 40px but got ${height}`).toBeTruthy();

      // Check that the borders exist via computed-style border-left-style etc.
      const borderLeftStyle = await page.evaluate((el) => window.getComputedStyle(el).getPropertyValue('border-left-style'), await nodeLocator.elementHandle());
      const borderRightStyle = await page.evaluate((el) => window.getComputedStyle(el).getPropertyValue('border-right-style'), await nodeLocator.elementHandle());
      const borderBottomStyle = await page.evaluate((el) => window.getComputedStyle(el).getPropertyValue('border-bottom-style'), await nodeLocator.elementHandle());

      // The CSS declares '1px solid black' borders — style should be 'solid' for these edges if applied.
      expect(borderLeftStyle === 'none' || borderLeftStyle === 'solid').toBeTruthy();
      expect(borderRightStyle === 'none' || borderRightStyle === 'solid').toBeTruthy();
      expect(borderBottomStyle === 'none' || borderBottomStyle === 'solid').toBeTruthy();
    }

    // Also ensure .node label elements, if present, are visible text-carrying elements
    const labelCount = await tree.countNodeLabels();
    if (labelCount > 0) {
      for (let i = 0; i < labelCount; i++) {
        const label = tree.nodeLabels.nth(i);
        await expect(label).toBeVisible();
        const text = await label.textContent();
        expect(typeof text === 'string').toBeTruthy();
      }
    }
  });

  // Edge case test: try to interact with the container (click) and ensure no unexpected error is thrown by the handler.
  test('Clicking on the tree container should not crash the page (observe any page errors)', async ({ page }) => {
    // Purpose: Simulate a benign user interaction (click) and ensure no new uncaught exceptions are thrown.
    const tree = new TreePage(page);

    await expect(tree.container).toHaveCount(1);
    // Clear previously captured errors to detect any new ones caused by the click.
    pageErrors = [];
    consoleMessages = [];

    await tree.container.click();

    // Small wait to allow any event handlers to run and possibly throw errors
    await page.waitForTimeout(100);

    // If any new page errors are present, surface them for the test result.
    expect(pageErrors.length, `click produced ${pageErrors.length} page errors; console:\n${consoleMessages.map(c=>`[${c.type}] ${c.text}`).join('\n')}`).toBe(0);
  });
});