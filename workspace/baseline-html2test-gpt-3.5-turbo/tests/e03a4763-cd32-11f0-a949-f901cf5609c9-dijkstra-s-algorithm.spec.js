import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a4763-cd32-11f0-a949-f901cf5609c9.html';

// Page Object to encapsulate interactions with the Dijkstra visualization page
class DijkstraPage {
  constructor(page) {
    this.page = page;
    this.logSelector = '#log';
    this.startSelect = '#start-node';
    this.endSelect = '#end-node';
    this.runBtn = '#run-btn';
    this.resetBtn = '#reset-btn';
    this.svg = '#graph-svg';
  }

  // Wait for the app to initialize (window load triggers initialization)
  async waitForInit() {
    await this.page.waitForSelector(this.svg, { state: 'visible' });
    // Wait for the select to be populated - the first real option after placeholder is node A.
    await this.page.waitForSelector(`${this.startSelect} option[value="A"]`);
  }

  // Return the number of options in the start select
  async getStartOptionsCount() {
    return await this.page.$eval(this.startSelect, (el) => el.options.length);
  }

  // Get the content of the log
  async getLogText() {
    return await this.page.$eval(this.logSelector, (el) => el.textContent || '');
  }

  // Click an SVG node group by id (nodeId like 'A' -> selector '#node-A')
  async clickNode(nodeId) {
    const sel = `#node-${nodeId}`;
    await this.page.waitForSelector(sel);
    await this.page.click(sel);
  }

  // Select by using the dropdown selects
  async selectStart(nodeId) {
    await this.page.selectOption(this.startSelect, nodeId);
  }
  async selectEnd(nodeId) {
    await this.page.selectOption(this.endSelect, nodeId);
  }

  // Click run and wait for the button to be disabled then enabled back
  async clickRun() {
    await this.page.click(this.runBtn);
  }

  async clickReset() {
    await this.page.click(this.resetBtn);
  }

  // Get fill color of a node's circle (returns the raw attribute value)
  async getNodeFill(nodeId) {
    const sel1 = `#node-${nodeId} circle`;
    await this.page.waitForSelector(sel);
    return await this.page.$eval(sel, (el) => el.getAttribute('fill'));
  }

  // Get stroke color and width for an edge
  async getEdgeAttributes(nodeA, nodeB) {
    // Edge id uses sorted nodes: e.g., edge-A-D
    const edgeId = ['edge', nodeA, nodeB].sort((a, b) => {
      // Ensure 'edge' stays at front — we'll construct id deterministically below instead
      return 0;
    });
    // Use the same createEdgeId logic as in the app: "edge-" + [from, to].sort().join("-")
    const id = 'edge-' + [nodeA, nodeB].sort().join('-');
    const sel2 = `#${id}`;
    await this.page.waitForSelector(sel);
    return await this.page.$eval(sel, (el) => ({
      stroke: el.getAttribute('stroke'),
      strokeWidth: el.getAttribute('stroke-width'),
    }));
  }

  async getRunButtonDisabled() {
    return await this.page.$eval(this.runBtn, (el) => el.disabled);
  }

  async getResetButtonDisabled() {
    return await this.page.$eval(this.resetBtn, (el) => el.disabled);
  }

  async getStartSelectValue() {
    return await this.page.$eval(this.startSelect, (el) => el.value);
  }

  async getEndSelectValue() {
    return await this.page.$eval(this.endSelect, (el) => el.value);
  }
}

test.describe('Dijkstra\'s Algorithm Visualization - e03a4763-cd32-11f0-a949-f901cf5609c9', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', (msg) => {
      // Record console.error and other severity logs
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // No teardown required beyond Playwright's default, but we keep hooks for clarity.
  });

  test('Initial page load and default state', async ({ page }) => {
    // Purpose: Verify that the page loads, elements are present, and default state is correct.
    const app = new DijkstraPage(page);
    await app.waitForInit();

    // Check the page title is present in header
    const headerText = await page.textContent('header h1');
    expect(headerText).toContain("Dijkstra's Algorithm Visualization");

    // Start and End selects should be populated with 1 placeholder + 9 nodes = 10 options
    const startOptionsCount = await app.getStartOptionsCount();
    expect(startOptionsCount).toBe(10);

    // Run button should be disabled by default
    const runDisabled = await app.getRunButtonDisabled();
    expect(runDisabled).toBe(true);

    // Reset button should be enabled by default
    const resetDisabled = await app.getResetButtonDisabled();
    expect(resetDisabled).toBe(false);

    // Log should be empty initially
    const logText = await app.getLogText();
    expect(logText.trim()).toBe('');

    // Ensure several SVG nodes exist (A, B, C)
    await expect(page.locator('#node-A')).toBeVisible();
    await expect(page.locator('#node-B')).toBeVisible();
    await expect(page.locator('#node-C')).toBeVisible();

    // No uncaught runtime page errors should have occurred during load
    expect(pageErrors.length).toBe(0);
    // No console.error messages should have been emitted during load
    expect(consoleErrors.length).toBe(0);
  });

  test('Selecting start and end nodes via clicking and verifies UI updates', async ({ page }) => {
    // Purpose: Verify selecting nodes by clicking updates the selects and enables Run button.
    const app1 = new DijkstraPage(page);
    await app.waitForInit();

    // Click node A to set start
    await app.clickNode('A');

    // The start select should reflect the selection
    const startVal = await app.getStartSelectValue();
    expect(startVal).toBe('A');

    // Log should include a message about start selection
    const log1 = await app.getLogText();
    expect(log1).toMatch(/Start node selected: A/);

    // Click node B to set end
    await app.clickNode('B');

    // Confirm end select updated
    const endVal = await app.getEndSelectValue();
    expect(endVal).toBe('B');

    // Log should include end selection
    const log2 = await app.getLogText();
    expect(log2).toMatch(/End node selected: B/);

    // Now Run button should be enabled (application enables it when both start & end are set)
    // Note: the implementation has multiple places that set runBtn.disabled, but the expected behavior is that
    // the button becomes enabled once both endpoints are selected.
    const runDisabled1 = await app.getRunButtonDisabled();
    expect(runDisabled).toBe(false);

    // Ensure node elements still exist and are interactive
    await expect(page.locator('#node-A')).toBeVisible();
    await expect(page.locator('#node-B')).toBeVisible();

    // Check there were no runtime errors from these interactions
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Run Dijkstra algorithm, verify shortest path highlighting and reset behavior', async ({ page }) => {
    // Purpose: Use the dropdowns to select Start=A and End=E, run the algorithm,
    // verify that the shortest path is found and nodes/edges are highlighted, then reset.
    const app2 = new DijkstraPage(page);
    await app.waitForInit();

    // Select start A and end E via the select controls
    await app.selectStart('A');
    // ensure the change event is fully processed
    await page.waitForTimeout(100);
    await app.selectEnd('E');
    await page.waitForTimeout(100);

    // Verify selects updated
    expect(await app.getStartSelectValue()).toBe('A');
    expect(await app.getEndSelectValue()).toBe('E');

    // Click Run
    await app.clickRun();

    // Wait up to 20 seconds for the algorithm to finish and emit a "Shortest path found" message in the log.
    // The implementation uses delays inside the algorithm; allow ample time.
    await page.waitForFunction(() => {
      const log = document.getElementById('log');
      return !!(log && log.textContent && (log.textContent.includes('Shortest path found') || log.textContent.includes('No path found')));
    }, {}, { timeout: 20000 });

    const logText1 = await app.getLogText();
    // The algorithm should either find a shortest path or explicitly report no path.
    expect(
      logText.includes('Shortest path found') || logText.includes('No path found')
    ).toBeTruthy();

    // If a shortest path is found, verify that expected nodes are highlighted as path nodes.
    if (logText.includes('Shortest path found')) {
      // For Start=A to End=E expected shortest path is typically A → D → E in this graph.
      // Check that nodes A, D, E are highlighted with the path color (#f39c12)
      const pathColor = '#f39c12';
      const aFill = await app.getNodeFill('A');
      const dFill = await app.getNodeFill('D');
      const eFill = await app.getNodeFill('E');

      expect(aFill).toBe(pathColor);
      expect(dFill).toBe(pathColor);
      expect(eFill).toBe(pathColor);

      // Verify that the edges between A-D and D-E are highlighted with path stroke color and increased stroke-width
      const edgeAD = await app.getEdgeAttributes('A', 'D');
      const edgeDE = await app.getEdgeAttributes('D', 'E');

      expect(edgeAD.stroke).toBe(pathColor);
      expect(edgeAD.strokeWidth === '4' || edgeAD.strokeWidth === '4.0' || edgeAD.strokeWidth === '4px').toBeTruthy();

      expect(edgeDE.stroke).toBe(pathColor);
      expect(edgeDE.strokeWidth === '4' || edgeDE.strokeWidth === '4.0' || edgeDE.strokeWidth === '4px').toBeTruthy();
    }

    // Now test Reset button restores UI to default state
    await app.clickReset();

    // After reset, selects should be cleared and log should be empty
    const startAfterReset = await app.getStartSelectValue();
    const endAfterReset = await app.getEndSelectValue();
    const logAfterReset = await app.getLogText();

    expect(startAfterReset).toBe('');
    expect(endAfterReset).toBe('');
    expect(logAfterReset.trim()).toBe('');

    // Nodes should revert to unvisited color (#3498db)
    const unvisitedColor = '#3498db';
    const aFillAfterReset = await app.getNodeFill('A');
    expect(aFillAfterReset).toBe(unvisitedColor);

    // No runtime errors should have been thrown during the entire run
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Accessibility and keyboard interaction: activate nodes via keyboard', async ({ page }) => {
    // Purpose: Verify keyboard 'Enter' activates node selection as documented by role=button and tabindex.
    const app3 = new DijkstraPage(page);
    await app.waitForInit();

    // Focus node C and press Enter to select it as start
    const nodeC = page.locator('#node-C');
    await nodeC.focus();
    await page.keyboard.press('Enter');

    // Start select should reflect selection of C
    expect(await app.getStartSelectValue()).toBe('C');

    // Now focus node F and press Space to select end (should not select if same as start)
    const nodeF = page.locator('#node-F');
    await nodeF.focus();
    await page.keyboard.press('Space');

    // End select should reflect selection F
    expect(await app.getEndSelectValue()).toBe('F');

    // Verify Run button enabled now that both endpoints set
    const runDisabled2 = await app.getRunButtonDisabled();
    expect(runDisabled).toBe(false);

    // Check logs recorded both selections
    const logText2 = await app.getLogText();
    expect(logText).toMatch(/Start node selected: C/);
    expect(logText).toMatch(/End node selected: F/);

    // No runtime errors
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});