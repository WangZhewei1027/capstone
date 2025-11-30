import { test, expect } from '@playwright/test';

// Test file for: Prim's Algorithm Visualization
// Application URL:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6c7-cd33-11f0-bdf9-b3d97e91273d.html

// Page object encapsulating common interactions with the app
class PrimPage {
  constructor(page) {
    this.page = page;
    // controls
    this.nodesCount = page.locator('#nodesCount');
    this.density = page.locator('#density');
    this.maxWeight = page.locator('#maxWeight');
    this.generateBtn = page.locator('#generateGraphBtn');
    this.startBtn = page.locator('#startPrimBtn');
    this.stepBtn = page.locator('#stepPrimBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.status = page.locator('#status');
    this.log = page.locator('#log');
    this.canvas = page.locator('#graphCanvas');
    this.container = page.locator('#container');
  }

  async goto(url) {
    await this.page.goto(url);
    // ensure the canvas has been drawn initially
    await expect(this.canvas).toBeVisible();
  }

  // Generate a graph with provided parameters
  async generateGraph(n, density, maxW) {
    await this.nodesCount.fill(''); // clear then type
    await this.nodesCount.type(String(n));
    await this.density.fill('');
    await this.density.type(String(density));
    await this.maxWeight.fill('');
    await this.maxWeight.type(String(maxW));
    await this.generateBtn.click();
  }

  // Start Prim's algorithm
  async startPrim() {
    await this.startBtn.click();
  }

  // Perform a single step
  async step() {
    await this.stepBtn.click();
  }

  // Reset the algorithm/visualization
  async reset() {
    await this.resetBtn.click();
  }
}

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6c7-cd33-11f0-bdf9-b3d97e91273d.html';

test.describe('Prim\'s Algorithm Visualization - End-to-End', () => {
  // Collect console errors and page errors for each test to assert later.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // capture console messages; store errors for later assertions
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // capture unhandled exceptions on the page
    page.on('pageerror', exception => {
      pageErrors.push(String(exception));
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test we assert there were no unexpected console or page errors.
    // This ensures no hidden runtime exceptions occurred during interactions.
    expect(consoleErrors, `Console errors: ${consoleErrors.join(', ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors: ${pageErrors.join(', ')}`).toHaveLength(0);
  });

  test('Initial page load shows expected default UI state', async ({ page }) => {
    const prim = new PrimPage(page);

    // Verify title and main UI elements
    await expect(page).toHaveTitle(/Prim's Algorithm - Minimum Spanning Tree Visualization/);
    await expect(prim.canvas).toBeVisible();
    await expect(prim.container).toBeVisible();

    // Default control states
    await expect(prim.generateBtn).toBeEnabled();
    await expect(prim.startBtn).toBeDisabled();
    await expect(prim.stepBtn).toBeDisabled();
    await expect(prim.resetBtn).toBeDisabled();

    // Default status text
    await expect(prim.status).toContainText('Waiting to generate graph.');
    // Log should be empty initially
    await expect(prim.log).toHaveText('');
  });

  test('Generate graph enables Start button and updates status', async ({ page }) => {
    const prim1 = new PrimPage(page);

    // Generate a small graph for deterministic number of steps
    await prim.generateGraph(5, 0.5, 10);

    // After generation, Start should be enabled and status updated
    await expect(prim.startBtn).toBeEnabled();
    await expect(prim.stepBtn).toBeDisabled();
    await expect(prim.resetBtn).toBeDisabled();
    await expect(prim.status).toContainText('Graph generated. Ready to start Prim');

    // Canvas should still be visible and log cleared
    await expect(prim.canvas).toBeVisible();
    await expect(prim.log).toHaveText('');
  });

  test('Starting Prim initializes algorithm, updates controls and log', async ({ page }) => {
    const prim2 = new PrimPage(page);

    // Create a small graph and start Prim
    await prim.generateGraph(4, 0.6, 8);
    await prim.startPrim();

    // Controls after starting
    await expect(prim.startBtn).toBeDisabled();
    await expect(prim.stepBtn).toBeEnabled();
    await expect(prim.resetBtn).toBeEnabled();
    await expect(prim.status).toContainText("Prim's algorithm started");

    // Log must contain the initial line "Start from node 0"
    await expect(prim.log).toContainText('Start from node 0');
  });

  test('Stepping through Prim eventually finishes and produces an MST log', async ({ page }) => {
    const prim3 = new PrimPage(page);

    // Use a 4-node graph to keep number of steps small and predictable.
    await prim.generateGraph(4, 0.7, 12);
    await prim.startPrim();

    // After the start, there will be up to (n-1) includes to perform.
    // We'll click Step repeatedly until the Step button becomes disabled or we've iterated some safe max times.
    for (let i = 0; i < 10; i++) {
      const isStepEnabled = await prim.stepBtn.isEnabled();
      if (!isStepEnabled) break;
      // click step and wait a short moment for DOM updates
      await prim.step();
      await page.waitForTimeout(50);
    }

    // After completion, Step should be disabled, Reset should be enabled, and status should reflect finished.
    await expect(prim.stepBtn).toBeDisabled();
    await expect(prim.resetBtn).toBeEnabled();
    await expect(prim.status).toContainText('MST complete');

    // Log should include at least one "Include edge" line when MST edges were added
    const logText = await prim.log.textContent();
    expect(logText).toBeTruthy();
    expect(logText.includes('Include edge')).toBe(true);
  });

  test('Reset returns UI to initial state and clears log', async ({ page }) => {
    const prim4 = new PrimPage(page);

    await prim.generateGraph(5, 0.6, 10);
    await prim.startPrim();
    // Ensure some state is present before reset
    await expect(prim.log).not.toHaveText('');
    await expect(prim.resetBtn).toBeEnabled();

    // Click reset and verify UI returns to baseline-ready state
    await prim.reset();
    await expect(prim.startBtn).toBeEnabled();
    await expect(prim.stepBtn).toBeDisabled();
    await expect(prim.resetBtn).toBeDisabled();
    await expect(prim.generateBtn).toBeEnabled();
    await expect(prim.status).toContainText('Reset done');
    await expect(prim.log).toHaveText('');
  });

  test.describe('Input validation and error dialog behavior', () => {
    test('Shows alert when number of nodes is out of bounds (<3)', async ({ page }) => {
      const prim5 = new PrimPage(page);

      // Intercept dialog triggered by invalid input
      const dialogPromise = page.waitForEvent('dialog');

      // Set nodes to invalid value and click generate
      await prim.nodesCount.fill('');
      await prim.nodesCount.type('2');
      await prim.generateBtn.click();

      const dialog = await dialogPromise;
      expect(dialog).toBeTruthy();
      expect(dialog.message()).toContain('Number of nodes must be between 3 and 20');
      await dialog.accept();

      // Ensure generation did not enable Start button
      await expect(prim.startBtn).toBeDisabled();
    });

    test('Shows alert when density is invalid (<0.2)', async ({ page }) => {
      const prim6 = new PrimPage(page);

      // Intercept dialog
      const dialogPromise1 = page.waitForEvent('dialog');

      // Prepare valid nodes but invalid density
      await prim.nodesCount.fill('');
      await prim.nodesCount.type('5');
      await prim.density.fill('');
      await prim.density.type('0.1');
      await prim.generateBtn.click();

      const dialog1 = await dialogPromise;
      expect(dialog).toBeTruthy();
      expect(dialog.message()).toContain('Density must be between 0.2 and 1.0');
      await dialog.accept();

      // Start should remain disabled after invalid generation attempt
      await expect(prim.startBtn).toBeDisabled();
    });

    test('Shows alert when max weight is invalid (>20 or <1)', async ({ page }) => {
      const prim7 = new PrimPage(page);

      // Intercept dialog
      const dialogPromise2 = page.waitForEvent('dialog');

      // Invalid max weight too large
      await prim.nodesCount.fill('');
      await prim.nodesCount.type('5');
      await prim.density.fill('');
      await prim.density.type('0.5');
      await prim.maxWeight.fill('');
      await prim.maxWeight.type('25');
      await prim.generateBtn.click();

      const dialog2 = await dialogPromise;
      expect(dialog).toBeTruthy();
      expect(dialog.message()).toContain('Max weight must be between 1 and 20');
      await dialog.accept();

      // Start should remain disabled after invalid generation attempt
      await expect(prim.startBtn).toBeDisabled();
    });
  });

  test.describe('Accessibility and UI attributes', () => {
    test('Canvas and controls have appropriate ARIA attributes', async ({ page }) => {
      const prim8 = new PrimPage(page);

      // Canvas should have an accessible label
      await expect(page.locator('canvas[aria-label="Graph visualization"]')).toBeVisible();

      // Controls container should have ARIA label
      await expect(page.locator('#controls[aria-label="Controls for Prim\'s algorithm"]')).toBeVisible();

      // Log should have aria-live and be present
      const log = page.locator('#log');
      await expect(log).toHaveAttribute('aria-live', 'polite');
      await expect(log).toHaveAttribute('aria-atomic', 'true');
    });
  });
});