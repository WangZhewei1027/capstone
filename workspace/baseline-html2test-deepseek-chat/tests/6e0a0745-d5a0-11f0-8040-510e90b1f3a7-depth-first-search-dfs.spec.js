import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0745-d5a0-11f0-8040-510e90b1f3a7.html';

// Page object to encapsulate selectors and common interactions
class DFSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.startBtn = page.locator('button', { hasText: 'Start DFS' });
    this.nextBtn = page.locator('button', { hasText: 'Next Step' });
    this.resetBtn = page.locator('button', { hasText: 'Reset' });
    this.randomBtn = page.locator('button', { hasText: 'Generate Random Graph' });
    this.speedSelect = page.locator('#speed');
    this.startNodeInput = page.locator('#startNode');
    this.statusDiv = page.locator('#status');
    this.stepsList = page.locator('#steps');
    this.stackDiv = page.locator('#stackContents');
    this.visitedDiv = page.locator('#visitedNodes');
    this.canvas = page.locator('#graphCanvas');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
    // Ensure window.onload initialized the visualizer
    await this.page.waitForTimeout(50);
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickNext() {
    await this.nextBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async clickGenerateRandom() {
    await this.randomBtn.click();
  }

  async setSpeed(value) {
    await this.speedSelect.selectOption(String(value));
    // onchange should trigger updateSpeed automatically
  }

  async setStartNode(value) {
    await this.startNodeInput.fill(String(value));
  }

  async getStatusText() {
    return (await this.statusDiv.innerText()).trim();
  }

  async getStackText() {
    return (await this.stackDiv.innerText()).trim();
  }

  async getVisitedText() {
    return (await this.visitedDiv.innerText()).trim();
  }

  async getStepsItems() {
    return this.stepsList.locator('li');
  }

  // Helper to access the in-page visualizer object (read-only)
  async getVisualizerProperty(prop) {
    return this.page.evaluate((p) => {
      // Access global visualizer safely (it may be undefined if page not initialized)
      // We do not modify anything; only read properties.
      // eslint-disable-next-line no-undef
      return (window.visualizer && window.visualizer[p]) || null;
    }, prop);
  }
}

test.describe('Depth-First Search Visualization - DFS (6e0a0745...)', () => {
  // Test the initial page load and default state
  test('Initial load shows expected UI elements and default state', async ({ page }) => {
    // Capture console errors and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const dfs = new DFSPage(page);
    await dfs.goto();

    // Verify presence and visibility of primary UI controls
    await expect(dfs.startBtn).toBeVisible();
    await expect(dfs.nextBtn).toBeVisible();
    await expect(dfs.resetBtn).toBeVisible();
    await expect(dfs.randomBtn).toBeVisible();
    await expect(dfs.speedSelect).toBeVisible();
    await expect(dfs.startNodeInput).toBeVisible();

    // Canvas is present
    await expect(dfs.canvas).toBeVisible();

    // Check default status and displays
    const status = await dfs.getStatusText();
    expect(status).toMatch(/Ready to start DFS/i);

    const stackText = await dfs.getStackText();
    expect(stackText).toBe('Empty');

    const visitedText = await dfs.getVisitedText();
    expect(visitedText).toBe('None');

    // Steps list should be empty
    await expect(dfs.getStepsItems()).toHaveCount(0);

    // No console or page errors occurred on initial load
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });

  test('Next Step initializes DFS and processes a single node when starting from default startNode', async ({ page }) => {
    // Capture console errors and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const dfs = new DFSPage(page);
    await dfs.goto();

    // Use Next Step to start and process one step synchronously
    await dfs.clickNext();

    // After one step, status should indicate a current node
    const status = await dfs.getStatusText();
    expect(status).toMatch(/Current Node:/i);

    // Visited nodes should include the start node (default 0)
    const visited = await dfs.getVisitedText();
    // It may be just '0' or contain several nodes depending on implementation order; ensure '0' present
    expect(visited).toContain('0');

    // Stack should contain neighbors of the start node (example '1 → 3')
    const stack = await dfs.getStackText();
    // Expect stack not to be 'Empty' after first step
    expect(stack).not.toBe('Empty');

    // Steps list should have at least the starting + processing/visited messages
    const stepsCount = await dfs.getStepsItems().count();
    expect(stepsCount).toBeGreaterThanOrEqual(2);

    // No console or page errors occurred
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });

  test('Multiple Next Step clicks process until DFS completes and updates DOM accordingly', async ({ page }) => {
    // Capture console errors and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const dfs = new DFSPage(page);
    await dfs.goto();

    // Repeatedly click Next Step until the status shows completion or until a safety iteration limit
    const maxSteps = 30;
    let completed = false;
    for (let i = 0; i < maxSteps; i++) {
      await dfs.clickNext();
      const statusText = await dfs.getStatusText();
      if (/DFS completed!/i.test(statusText) || /completed/i.test(statusText)) {
        completed = true;
        break;
      }
      // small pause to let synchronous DOM updates settle (dfsStep is sync, but be tolerant)
      await page.waitForTimeout(20);
    }

    // We expect the DFS to complete within the iteration limit
    expect(completed).toBeTruthy();

    // After completion, stack should be 'Empty' and visited should list many nodes (likely 8)
    const stackText = await dfs.getStackText();
    expect(stackText).toBe('Empty');

    const visitedText = await dfs.getVisitedText();
    // Expect at least one visited node and not 'None'
    expect(visitedText).not.toBe('None');
    // Steps list should contain entries
    const stepsCount = await dfs.getStepsItems().count();
    expect(stepsCount).toBeGreaterThan(0);

    // No console or page errors occurred
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });

  test('Reset returns UI to initial ready state and clears visited/stack/steps', async ({ page }) => {
    // Capture console errors and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const dfs = new DFSPage(page);
    await dfs.goto();

    // Start a couple of steps to change state
    await dfs.clickNext();
    await dfs.clickNext();

    // Ensure state changed
    const visitedBefore = await dfs.getVisitedText();
    expect(visitedBefore).not.toBe('None');

    // Now reset
    await dfs.clickReset();

    // Status should reflect reset message
    const status = await dfs.getStatusText();
    expect(status).toMatch(/DFS reset - ready to start/i);

    // Stack should be empty and visited should be 'None'
    const stack = await dfs.getStackText();
    expect(stack).toBe('Empty');

    const visited = await dfs.getVisitedText();
    expect(visited).toBe('None');

    // Steps list should be empty after reset
    await expect(dfs.getStepsItems()).toHaveCount(0);

    // No console or page errors occurred
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });

  test('Generate Random Graph updates the status and redraws graph (no errors)', async ({ page }) => {
    // Capture console errors and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const dfs = new DFSPage(page);
    await dfs.goto();

    // Click to generate a new random graph
    await dfs.clickGenerateRandom();

    // Status should indicate a new random graph was generated
    const status = await dfs.getStatusText();
    expect(status).toMatch(/New random graph generated!/i);

    // Canvas should still be present and visible
    await expect(dfs.canvas).toBeVisible();

    // No console or page errors occurred during graph generation
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });

  test('Changing speed select updates the visualizer animation speed', async ({ page }) => {
    // Capture console errors and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const dfs = new DFSPage(page);
    await dfs.goto();

    // Select a different speed value and verify the in-page visualizer reflects it
    await dfs.setSpeed(200);

    // The page's onchange handler should call visualizer.setSpeed; read the property via evaluate
    const animationSpeed = await page.evaluate(() => {
      // Access global visualizer safely; return animationSpeed if present
      // eslint-disable-next-line no-undef
      return window.visualizer ? window.visualizer.animationSpeed : null;
    });

    expect(animationSpeed).toBe(200);

    // No console or page errors occurred
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });

  test('Changing start node input affects where DFS begins when Next Step is used', async ({ page }) => {
    // Capture console errors and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const dfs = new DFSPage(page);
    await dfs.goto();

    // Set start node to 3 and invoke Next Step to start
    await dfs.setStartNode(3);
    await dfs.clickNext();

    // Status should indicate current node or starting from node 3
    const status = await dfs.getStatusText();
    // Either current node shown as 3 or starting message may be in steps; accept both
    const visited = await dfs.getVisitedText();
    expect(visited).toContain('3');

    // No console or page errors occurred
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });

  test('No unexpected console errors or uncaught exceptions during a typical interaction flow', async ({ page }) => {
    // This test runs a typical flow (start -> several steps -> reset) and asserts there are no runtime errors.
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const dfs = new DFSPage(page);
    await dfs.goto();

    // Typical user flow
    await dfs.setStartNode(0);
    await dfs.clickNext();
    await dfs.clickNext();
    await dfs.clickNext();
    await dfs.clickReset();

    // Expect no page errors or console errors during the flow
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });
});