import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa2b-cd32-11f0-a96f-2d591ffb35fe.html';

// Page object to encapsulate interactions with the DFS visualization page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#graphCanvas');
    this.startSelect = page.locator('#startNode');
    this.runButton = page.locator('#runDFS');
    this.resetButton = page.locator('#resetGraph');
    this.output = page.locator('#output');
    this.legend = page.locator('#legend');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure initial draw/reset script has run
    await expect(this.canvas).toBeVisible();
    await expect(this.startSelect).toBeVisible();
    await expect(this.runButton).toBeVisible();
    await expect(this.resetButton).toBeVisible();
  }

  async getStartOptions() {
    return this.startSelect.locator('option');
  }

  async selectStart(nodeId) {
    await this.startSelect.selectOption({ value: nodeId });
  }

  async clickRun() {
    await this.runButton.click();
  }

  async clickReset() {
    await this.resetButton.click();
  }

  async outputText() {
    return (await this.output.textContent()) || '';
  }

  // Wait until output contains a specific substring, with timeout guard
  async waitForOutputContains(substring, timeout = 30000) {
    await this.page.waitForFunction(
      (sel, text) => {
        const el = document.querySelector(sel);
        return el && el.textContent && el.textContent.indexOf(text) !== -1;
      },
      this.output.selector,
      substring,
      { timeout }
    );
  }
}

test.describe('Depth-First Search (DFS) Visualization - Integration Tests', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Capture page errors and console messages for assertions
    pageErrors = [];
    consoleMessages = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test('Initial page load: controls, canvas and default state are present', async ({ page }) => {
    // Purpose: Verify the page loads correctly and initial elements are in expected state
    const graph = new GraphPage(page);
    await graph.goto();

    // Check title and header are present
    await expect(page.locator('h1')).toHaveText('Depth-First Search (DFS) Visualization');

    // Canvas visible
    await expect(graph.canvas).toBeVisible();

    // Start select should contain 7 options (A-G)
    const options = await graph.getStartOptions();
    await expect(options).toHaveCount(7);
    const optionValues = await Promise.all(
      Array.from({ length: await options.count() }).map(async (_, i) => options.nth(i).getAttribute('value'))
    );
    // Basic assertion for expected node ids presence
    expect(optionValues).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'E', 'F', 'G']));

    // Run and Reset buttons should be enabled initially
    await expect(graph.runButton).toBeEnabled();
    await expect(graph.resetButton).toBeEnabled();

    // Output area should be empty on initial load
    const outText = await graph.outputText();
    expect(outText.trim()).toBe('');

    // Legend items visible
    await expect(graph.legend).toBeVisible();

    // Ensure no uncaught page errors or console errors so far
    expect(pageErrors.length).toBe(0);
  });

  test('Run DFS: logs traversal, disables controls during run, and re-enables after completion', async ({ page }) => {
    // Purpose: Click "Run DFS", verify traversal logs appear in output, controls disabled during run,
    // and re-enabled after 'DFS complete.' appears.
    const graph1 = new GraphPage(page);
    await graph.goto();

    // Choose a start node to make behavior deterministic
    await graph.selectStart('A');

    // Start listening to output before clicking run
    // Click Run and expect controls to be disabled
    await graph.clickRun();

    // Immediately after clicking, controls should be disabled
    await expect(graph.runButton).toBeDisabled();
    await expect(graph.startSelect).toBeDisabled();

    // The output should include the start message
    await graph.waitForOutputContains('Starting DFS from node A', 5000);
    let out = await graph.outputText();
    expect(out).toContain('Starting DFS from node A');

    // During DFS we expect visiting and finished logs for nodes.
    // Wait until the DFS completes (the app logs 'DFS complete.')
    await graph.waitForOutputContains('DFS complete.', 30000);

    out = await graph.outputText();
    // Validate that there are Visiting and Finished messages for nodes
    expect(out).toMatch(/Visiting node [A-G]/);
    expect(out).toMatch(/Finished node [A-G]/);
    expect(out).toContain('DFS complete.');

    // After completion, controls should be enabled again
    await expect(graph.runButton).toBeEnabled();
    await expect(graph.startSelect).toBeEnabled();

    // Ensure no uncaught page errors occurred during the run
    expect(pageErrors.length).toBe(0);

    // Minimal sanity check: at least 7 "Finished node" messages (each node finished)
    const finishedCount = (out.match(/Finished node/g) || []).length;
    expect(finishedCount).toBeGreaterThanOrEqual(7);
  });

  test('Reset button clears output and re-enables controls', async ({ page }) => {
    // Purpose: Verify clicking "Reset" clears the output area and sets controls to enabled
    const graph2 = new GraphPage(page);
    await graph.goto();

    // Run once to populate output
    await graph.selectStart('B');
    await graph.clickRun();

    // Wait for a bit for the run to start
    await graph.waitForOutputContains('Starting DFS from node B', 5000);
    // Wait for DFS to complete
    await graph.waitForOutputContains('DFS complete.', 30000);

    // Click Reset
    await graph.clickReset();

    // Output should be cleared after reset
    await expect(graph.output).toHaveText('');
    // Controls should be enabled
    await expect(graph.runButton).toBeEnabled();
    await expect(graph.startSelect).toBeEnabled();

    // No page errors on reset
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking Run multiple times is prevented while DFS is running', async ({ page }) => {
    // Purpose: Validate that while a DFS run is in progress the UI prevents starting another run.
    const graph3 = new GraphPage(page);
    await graph.goto();

    // Select a start node and click Run
    await graph.selectStart('C');

    // Click run to start DFS
    await graph.clickRun();

    // Try to click the button again immediately (should be disabled and no second start should be logged)
    // We expect the run button to be disabled; attempting to click it should not cause another "Starting DFS" entry.
    await expect(graph.runButton).toBeDisabled();

    // Poll the output to capture the "Starting" messages count
    await graph.waitForOutputContains('Starting DFS from node C', 5000);
    // Give a short moment and attempt to click the run button forcibly (Playwright will fail if disabled).
    // Instead of forcing, verify there is only one "Starting DFS" entry eventually.
    const waitForComplete = graph.waitForOutputContains('DFS complete.', 30000);

    // Wait for DFS to finish
    await waitForComplete;

    const out1 = await graph.outputText();
    // Count number of times "Starting DFS" appears; should be exactly 1
    const startCount = (out.match(/Starting DFS from node/g) || []).length;
    expect(startCount).toBe(1);

    // Controls should be enabled at the end
    await expect(graph.runButton).toBeEnabled();
    await expect(graph.startSelect).toBeEnabled();

    // No page errors should have happened during the attempted double-run
    expect(pageErrors.length).toBe(0);
  });

  test('Console and page error monitoring: ensure no uncaught exceptions or console errors occurred', async ({ page }) => {
    // Purpose: Record and assert that no unexpected page errors or console error-level messages were emitted.
    const graph4 = new GraphPage(page);

    // Attach listeners to capture messages from this test scope as well
    const localPageErrors = [];
    page.on('pageerror', (err) => {
      localPageErrors.push(err);
    });

    const localConsole = [];
    page.on('console', (msg) => {
      localConsole.push({ type: msg.type(), text: msg.text() });
    });

    await graph.goto();

    // Run a complete DFS to surface any runtime errors during normal operation
    await graph.selectStart('D');
    await graph.clickRun();
    await graph.waitForOutputContains('DFS complete.', 30000);

    // Combine captured messages
    const allPageErrors = pageErrors.concat(localPageErrors);
    const allConsole = consoleMessages.concat(localConsole);

    // Assert there are no page errors (uncaught exceptions)
    expect(allPageErrors.length).toBe(0);

    // Assert there are no console messages of type 'error'
    const consoleErrors = allConsole.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // For debugging if needed, keep the entire console messages readable via assertion
    expect(allConsole.length).toBeGreaterThanOrEqual(0);
  });
});