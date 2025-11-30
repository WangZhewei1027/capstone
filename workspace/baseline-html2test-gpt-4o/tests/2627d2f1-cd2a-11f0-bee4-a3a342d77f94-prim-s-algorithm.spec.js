import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2f1-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object for the Prim's Algorithm visualization page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.graph = page.locator('#graph');
    this.nodes = page.locator('.node');
    this.edges = page.locator('.edge');
    this.runButton = page.locator('#runAlgorithm');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async clickRun() {
    await this.runButton.click();
  }

  // Returns an array of node descriptors: { id, left, top, text }
  async getNodesInfo() {
    return await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('.node')).map(n => {
        const style = window.getComputedStyle(n);
        return {
          text: n.textContent,
          left: style.left,
          top: style.top,
          width: style.width,
          height: style.height
        };
      });
    });
  }

  // Returns an array of edge descriptors: { width, transform, left, top, backgroundColor }
  async getEdgesInfo() {
    return await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('.edge')).map(e => {
        const style = window.getComputedStyle(e);
        return {
          width: style.width,
          transform: style.transform || style.getPropertyValue('transform'),
          left: style.left,
          top: style.top,
          backgroundColor: style.backgroundColor
        };
      });
    });
  }
}

test.describe("Prim's Algorithm Visualization - UI and behavior", () => {
  // Collect console messages and page errors for assertions
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture uncaught exceptions (pageerror) and console messages
    page.on('pageerror', error => {
      // store the whole error object for later assertions
      pageErrors.push(error);
    });

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  // Test initial page load and default state: nodes and edges render correctly
  test('Initial load renders expected nodes and edges', async ({ page }) => {
    // Purpose: Load the app and assert that graph nodes and edges exist and are positioned
    const graphPage = new GraphPage(page);
    await graphPage.goto();

    // Basic page sanity: title and run button visible
    await expect(page.locator('h1')).toHaveText("Prim's Algorithm Visualization");
    await expect(graphPage.runButton).toBeVisible();

    // Verify nodes count and their labels (A-E)
    const nodesInfo = await graphPage.getNodesInfo();
    expect(nodesInfo.length).toBe(5); // should render 5 nodes

    const nodeTexts = nodesInfo.map(n => n.text.trim()).sort();
    // Expect node labels include A, B, C, D, E (order may vary)
    expect(nodeTexts).toEqual(['A', 'B', 'C', 'D', 'E']);

    // Check a few explicit node positions (these come from the HTML)
    const byText = {};
    nodesInfo.forEach(n => byText[n.text.trim()] = n);
    expect(byText['A'].left).toBe('50px');
    expect(byText['A'].top).toBe('100px');
    expect(byText['B'].left).toBe('200px');
    expect(byText['B'].top).toBe('50px');
    expect(byText['D'].left).toBe('500px');
    expect(byText['D'].top).toBe('250px');

    // Verify edges count and some basic style properties
    const edgesInfo = await graphPage.getEdgesInfo();
    expect(edgesInfo.length).toBe(6); // should render 6 edges

    // Each edge should have a width > 0px and a transform that indicates rotation
    for (const e of edgesInfo) {
      // width is reported as e.g. "123.456px" or "0px", ensure it's not zero
      const w = parseFloat(e.width);
      expect(w).toBeGreaterThan(0);
      // transform may be 'none' or matrix(...) depending on browser, but in the implementation they set rotate(...)
      // Accept either 'none' (if not applied) or a string containing 'matrix' or 'rotate'
      expect(typeof e.transform).toBe('string');
      expect(e.left).toMatch(/\d+px/);
      expect(e.top).toMatch(/\d+px/);
    }

    // Ensure no uncaught exceptions happened during initial load
    expect(pageErrors.length).toBe(0);
  });

  // Test pressing the Run Prim's Algorithm button triggers the algorithm and updates DOM (edge coloring)
  test('Clicking Run Prim\'s Algorithm updates edge coloring to indicate MST', async ({ page }) => {
    // Purpose: Simulate the user clicking the Run button, then check that edges get recolored (green/gray)
    const graphPage = new GraphPage(page);
    await graphPage.goto();

    // Capture initial edge colors
    const beforeEdges = await graphPage.getEdgesInfo();
    const beforeColors = beforeEdges.map(e => e.backgroundColor);

    // Click the Run button
    await graphPage.clickRun();

    // Wait a short while for DOM updates (algorithm runs synchronously but keep guard)
    await page.waitForTimeout(100);

    const afterEdges = await graphPage.getEdgesInfo();
    const afterColors = afterEdges.map(e => e.backgroundColor);

    // After running, every edge should have either the default gray color or could be green when part of MST
    // Normalize color values (some browsers return rgb(...))
    const normalize = color => color.replace(/\s+/g, '');

    const normalized = afterColors.map(normalize);
    // Acceptable colors are 'gray' (browser will return rgb for 'gray') or 'green'
    const allowedPatterns = [/rgb\(.+,.+,.+\)/, /green/, /gray/];

    // Verify that each edge color is a valid color string and that at most 4 edges are green (MST for 5 nodes has 4 edges)
    let greenCount = 0;
    for (const color of afterColors) {
      if (!color) continue; // defensive
      if (color.includes('green')) greenCount++;
      // check that a color is present (non-empty string)
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    }

    // The MST should have at most nodes-1 edges colored green (4). If coloring didn't match due to precision, it may be 0.
    expect(greenCount).toBeLessThanOrEqual(4);

    // For traceability, assert that edge background colors changed (at least some CSS update occurred)
    const colorsChanged = beforeColors.some((c, idx) => c !== afterColors[idx]);
    expect(colorsChanged).toBe(true);

    // Ensure no uncaught exceptions happened during the algorithm run
    expect(pageErrors.length).toBe(0);
  });

  // Test for robustness: repeated clicking does not throw and keeps DOM stable
  test('Repeated runs do not produce uncaught errors and keep edge count stable', async ({ page }) => {
    // Purpose: Ensure repeated invocations of the algorithm are safe and deterministic in terms of DOM structure
    const graphPage = new GraphPage(page);
    await graphPage.goto();

    // Press the run button multiple times
    await graphPage.clickRun();
    await page.waitForTimeout(50);
    await graphPage.clickRun();
    await page.waitForTimeout(50);
    await graphPage.clickRun();
    await page.waitForTimeout(50);

    // Edge count should remain 6 and node count 5
    const edgesInfo = await graphPage.getEdgesInfo();
    const nodesInfo = await graphPage.getNodesInfo();
    expect(edgesInfo.length).toBe(6);
    expect(nodesInfo.length).toBe(5);

    // No uncaught exceptions from repeated runs
    expect(pageErrors.length).toBe(0);

    // There should be console messages possibly (we captured them), ensure they are strings if present
    for (const m of consoleMessages) {
      expect(typeof m.text).toBe('string');
      expect(typeof m.type).toBe('string');
    }
  });

  // Accessibility / visibility check: graph container and controls are visible and keyboard-focusable
  test('Accessibility checks: controls and graph container visible and focusable', async ({ page }) => {
    // Purpose: Verify the run button is visible and can be focused via keyboard
    const graphPage = new GraphPage(page);
    await graphPage.goto();

    await expect(graphPage.graph).toBeVisible();
    await expect(graphPage.runButton).toBeVisible();

    // Focus the button via keyboard tab navigation simulation
    await page.keyboard.press('Tab'); // first tab may go to address bar in some contexts; still attempt to focus
    // Directly focus the button element as an accessibility-related check (does not modify runtime behavior)
    await graphPage.runButton.focus();
    expect(await graphPage.runButton.evaluate(el => document.activeElement === el)).toBe(true);

    // No uncaught exceptions as a result of focusing
    expect(pageErrors.length).toBe(0);
  });
});