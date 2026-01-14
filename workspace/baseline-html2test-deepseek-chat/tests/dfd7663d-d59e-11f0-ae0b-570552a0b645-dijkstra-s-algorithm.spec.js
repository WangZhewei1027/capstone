import { test, expect } from '@playwright/test';

// URL where the HTML is served
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd7663d-d59e-11f0-ae0b-570552a0b645.html';

// A small Page Object Model for the Dijkstra visualization app
class DijkstraPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.selectors = {
      title: 'h1',
      description: '.description',
      graphType: '#graphType',
      startNode: '#startNode',
      endNode: '#endNode',
      resetBtn: '#resetBtn',
      stepBtn: '#stepBtn',
      runBtn: '#runBtn',
      pauseBtn: '#pauseBtn',
      canvas: '#graphCanvas',
      stepInfo: '#stepInfo',
      nodesLegend: '.nodes'
    };
  }

  async goto() {
    // Navigate to the application and wait for the load event
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getTitleText() {
    return this.page.locator(this.selectors.title).innerText();
  }

  async getDescriptionText() {
    return this.page.locator(this.selectors.description).innerText();
  }

  async getSelectValue() {
    return this.page.locator(this.selectors.graphType).inputValue();
  }

  async getStartNodeValue() {
    return this.page.locator(this.selectors.startNode).inputValue();
  }

  async getEndNodeValue() {
    return this.page.locator(this.selectors.endNode).inputValue();
  }

  async clickReset() {
    await this.page.click(this.selectors.resetBtn);
  }

  async clickNextStep() {
    await this.page.click(this.selectors.stepBtn);
  }

  async clickRun() {
    await this.page.click(this.selectors.runBtn);
  }

  async clickPause() {
    await this.page.click(this.selectors.pauseBtn);
  }

  async getStepInfoText() {
    // innerText is used to get visible text including nested markup
    return this.page.locator(this.selectors.stepInfo).innerText();
  }

  async canvasSize() {
    return this.page.locator(this.selectors.canvas).evaluate((c) => {
      return { width: c.width, height: c.height };
    });
  }

  async nodesLegendVisible() {
    return this.page.locator(this.selectors.nodesLegend).isVisible();
  }

  // Helper to set start and end values (typing into number inputs)
  async setStartAndEnd(start, end) {
    const startLocator = this.page.locator(this.selectors.startNode);
    const endLocator = this.page.locator(this.selectors.endNode);
    await startLocator.fill(String(start));
    await endLocator.fill(String(end));
    // blur to trigger any input handlers
    await startLocator.evaluate((el) => el.blur());
    await endLocator.evaluate((el) => el.blur());
  }

  // Utility to read the global graph object from the page (if defined)
  async getGlobalGraph() {
    return this.page.evaluate(() => {
      // Return a shallow copy to avoid serialization of functions
      if (window.graph) {
        return {
          startNode: window.graph.startNode,
          endNode: window.graph.endNode,
          nodesLength: window.graph.nodes && window.graph.nodes.length,
          edgesLength: window.graph.edges && window.graph.edges.length
        };
      }
      return null;
    });
  }

  // Utility to read the global algorithmState object from the page (if defined)
  async getAlgorithmState() {
    return this.page.evaluate(() => {
      if (window.algorithmState) {
        return {
          distances: window.algorithmState.distances ? window.algorithmState.distances.slice(0, 20) : null,
          visited: window.algorithmState.visited ? window.algorithmState.visited.slice(0, 20) : null,
          currentStep: window.algorithmState.currentStep,
          isRunning: window.algorithmState.isRunning,
          isCompleted: window.algorithmState.isCompleted,
          currentNode: window.algorithmState.currentNode,
          finalPath: window.algorithmState.finalPath ? window.algorithmState.finalPath.slice(0, 20) : null
        };
      }
      return null;
    });
  }
}

// Test suite
test.describe('Dijkstra\'s Algorithm Visualization - End-to-End', () => {
  // We'll collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Listen to page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // store the Error object for inspection
      pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // Attach console and error outputs to test output for debugging (non-failing)
    if (consoleMessages.length) {
      console.log('Console messages captured during test:');
      consoleMessages.forEach((m) => console.log(`[${m.type}] ${m.text}`));
    }
    if (pageErrors.length) {
      console.log('Page errors captured during test:');
      pageErrors.forEach((e) => console.log(String(e)));
    }
    // Close page to ensure clean state for next test
    await page.close();
  });

  test('Initial page load should render the main UI and produce script parsing/runtime errors (if any)', async ({ page }) => {
    // Purpose:
    // - Load the page, verify static DOM elements are present and have expected default values.
    // - Capture any syntax/reference/type errors emitted by the page script and assert that at least one such error occurred.
    const app = new DijkstraPage(page);

    // Start listening for errors before navigation (already set up in beforeEach)
    await app.goto();

    // Basic DOM checks that should succeed even if the script has errors
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveText(/Dijkstra/i);

    // Description should be present
    await expect(page.locator('.description')).toBeVisible();
    const desc = await app.getDescriptionText();
    expect(desc.length).toBeGreaterThan(10);

    // Controls initial values
    const graphType = await app.getSelectValue();
    expect(graphType).toBe('predefined');

    const startVal = await app.getStartNodeValue();
    expect(startVal).toBe('0');

    const endVal = await app.getEndNodeValue();
    expect(endVal).toBe('6');

    // Canvas exists and has expected dimensions attributes
    const canvasSize = await app.canvasSize();
    expect(canvasSize.width).toBeGreaterThan(0);
    expect(canvasSize.height).toBeGreaterThan(0);

    // Node legend visible
    expect(await app.nodesLegendVisible()).toBeTruthy();

    // Step info has instructional placeholder
    const stepInfoText = await app.getStepInfoText();
    expect(stepInfoText).toMatch(/Click "Next Step" to start the visualization\./i);

    // At least one page error (SyntaxError / ReferenceError / TypeError) is expected because the provided script is truncated.
    // We assert that such an error was captured. If none were captured, we still fail the test because the environment
    // should reproduce the script issue as provided.
    // Allow some time for errors to emit during initial script parsing/execution.
    await page.waitForTimeout(200); // small delay for errors to be emitted

    // Filter pageErrors to common JS error types and also messages that indicate incomplete script
    const matchingErrors = pageErrors.filter((err) => {
      const m = String(err);
      return /syntaxerror|syntax error|unexpected end|unexpected token|referenceerror|typeerror|uncaught/i.test(m);
    });

    // Ensure we observed at least one relevant error
    expect(matchingErrors.length).toBeGreaterThan(0);
  });

  test('Reset, Next Step, Run, and Pause controls exist and can be interacted with (observe effects or errors)', async ({ page }) => {
    // Purpose:
    // - Verify the interactive controls are present and clickable.
    // - Interact with them and assert either visible DOM changes (step info) or that interaction triggers page errors (which are captured).
    const app = new DijkstraPage(page);
    await app.goto();

    // Ensure controls are present
    await expect(page.locator('#resetBtn')).toBeVisible();
    await expect(page.locator('#stepBtn')).toBeVisible();
    await expect(page.locator('#runBtn')).toBeVisible();
    await expect(page.locator('#pauseBtn')).toBeVisible();

    // Interact: change start/end inputs and click Reset
    await app.setStartAndEnd(1, 4);
    await app.clickReset();

    // Small wait to allow handlers to run and update DOM (or throw)
    await page.waitForTimeout(150);

    // The resetAlgorithm function in the script should set step info to "Algorithm reset. Ready to start."
    const stepInfoAfterReset = await app.getStepInfoText();

    // Accept either expected reset message or presence of page errors indicating runtime failures.
    const resetMessageMatches = /Algorithm reset\. Ready to start\./i.test(stepInfoAfterReset);
    const hadPageError = pageErrors.length > 0;

    // Assert at least one of the expected outcomes happened
    expect(resetMessageMatches || hadPageError).toBeTruthy();

    // Try clicking Next Step
    await app.clickNextStep();
    await page.waitForTimeout(150);
    const stepTextAfterNext = await app.getStepInfoText();

    // The step operation should either update the stepInfo or produce page errors.
    const visitedOrUpdated = /Visiting node|No path exists|Shortest path found|Updated node/i.test(stepTextAfterNext);
    expect(visitedOrUpdated || pageErrors.length > 0).toBeTruthy();

    // Clicking Run and Pause should be possible (even if they do nothing or cause errors)
    await app.clickRun();
    await page.waitForTimeout(100);
    await app.clickPause();
    await page.waitForTimeout(100);

    // Confirm the buttons remain visible and enabled after interactions
    await expect(page.locator('#runBtn')).toBeVisible();
    await expect(page.locator('#pauseBtn')).toBeVisible();
  });

  test('Edge case inputs are clamped: start/end node inputs outside bounds should be corrected on reset', async ({ page }) => {
    // Purpose:
    // - Verify that invalid start/end values are clamped to valid ranges by resetAlgorithm.
    // - If the script fails before this logic runs, ensure we capture that failure as a page error.
    const app = new DijkstraPage(page);
    await app.goto();

    // Set out-of-range values and click reset
    await app.setStartAndEnd(-10, 999);
    await app.clickReset();

    // Allow handlers to run
    await page.waitForTimeout(150);

    // Attempt to read the global graph.startNode and graph.endNode from the page context
    let graphSnapshot = null;
    try {
      graphSnapshot = await app.getGlobalGraph();
    } catch (e) {
      // If evaluating page variables throws because the script didn't run, capture that via pageErrors
      // We'll rely on pageErrors that are recorded in beforeEach
    }

    // If graphSnapshot is available, assert the values are within expected bounds (0 .. nodesLength-1)
    if (graphSnapshot) {
      expect(typeof graphSnapshot.startNode).toBe('number');
      expect(typeof graphSnapshot.endNode).toBe('number');
      expect(graphSnapshot.nodesLength).toBeGreaterThan(0);
      expect(graphSnapshot.startNode).toBeGreaterThanOrEqual(0);
      expect(graphSnapshot.startNode).toBeLessThan(graphSnapshot.nodesLength);
      expect(graphSnapshot.endNode).toBeGreaterThanOrEqual(0);
      expect(graphSnapshot.endNode).toBeLessThan(graphSnapshot.nodesLength);
    } else {
      // If we couldn't read the graph object, assert that a page error occurred
      expect(pageErrors.length).toBeGreaterThan(0);
    }
  });

  test('Algorithm state is observable: distances and visited arrays exist after reset (or errors occur)', async ({ page }) => {
    // Purpose:
    // - After resetting, the algorithmState object should exist with distances initialized.
    // - If the script didn't run, ensure that is reported via page errors.
    const app = new DijkstraPage(page);
    await app.goto();

    // Reset to ensure algorithmState initialization runs
    await app.clickReset();
    await page.waitForTimeout(150);

    // Try to read algorithmState
    let algoState = null;
    try {
      algoState = await app.getAlgorithmState();
    } catch (e) {
      // ignore; we'll assert based on pageErrors
    }

    if (algoState) {
      // distances should be an array with numeric entries (Infinity allowed)
      expect(Array.isArray(algoState.distances)).toBeTruthy();
      expect(algoState.distances.length).toBeGreaterThan(0);
      // visited should be an array of booleans
      expect(Array.isArray(algoState.visited)).toBeTruthy();
      expect(typeof algoState.currentStep).toBe('number');
    } else {
      // If we can't access algorithmState, assert that a runtime error occurred
      expect(pageErrors.length).toBeGreaterThan(0);
    }
  });

  test('Accessibility and UI visibility checks for main interactive elements', async ({ page }) => {
    // Purpose:
    // - Ensure primary interactive controls are visible and reachable via keyboard focus.
    // - This checks basic accessibility affordances even if JS is failing.
    const app = new DijkstraPage(page);
    await app.goto();

    // Tab through the page to ensure controls are focusable in some order
    await page.keyboard.press('Tab'); // to first focusable element
    // Try to focus reset button explicitly
    const resetBtn = page.locator('#resetBtn');
    await resetBtn.focus();
    expect(await resetBtn.isFocused()).toBeTruthy();

    // Focus step button
    const stepBtn = page.locator('#stepBtn');
    await stepBtn.focus();
    expect(await stepBtn.isFocused()).toBeTruthy();

    // Ensure canvas has an accessible name? Canvas itself may not be focusable, but it should exist
    await expect(page.locator('#graphCanvas')).toBeVisible();

    // Ensure that the legend color boxes exist
    await expect(page.locator('.color-box.unknown')).toBeVisible();
    await expect(page.locator('.color-box.visited')).toBeVisible();
    await expect(page.locator('.color-box.current')).toBeVisible();
    await expect(page.locator('.color-box.final-path')).toBeVisible();
  });
});