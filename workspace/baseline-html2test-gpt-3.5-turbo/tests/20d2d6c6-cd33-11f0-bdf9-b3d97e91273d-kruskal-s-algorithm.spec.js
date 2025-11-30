import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6c6-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object Model for the Kruskal app
class KruskalPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#graph-canvas');
    this.edgesList = page.locator('#edges-list');
    this.startBtn = page.locator('#start-btn');
    this.stepBtn = page.locator('#step-btn');
    this.autoBtn = page.locator('#auto-btn');
    this.resetBtn = page.locator('#reset-btn');
    this.graphSelect = page.locator('#graph-select');
    this.customControls = page.locator('#custom-graph-controls');
    this.customFrom = page.locator('#custom-from');
    this.customTo = page.locator('#custom-to');
    this.customWeight = page.locator('#custom-weight');
    this.customAddEdgeBtn = page.locator('#custom-add-edge');
    this.customClearBtn = page.locator('#custom-clear');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Select a predefined graph by value (e.g., 'default', 'triangle', 'square', 'custom')
  async selectGraph(value) {
    await this.graphSelect.selectOption(value);
    // wait for UI to reflect the change
    await this.page.waitForTimeout(50);
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickAuto() {
    await this.autoBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async addCustomEdge(from, to, weight) {
    await this.customFrom.selectOption(from);
    await this.customTo.selectOption(to);
    await this.customWeight.fill(String(weight));
    await this.customAddEdgeBtn.click();
  }

  async clearCustomGraph(confirm = true) {
    // confirm: whether to accept the confirm dialog
    this.page.once('dialog', async dialog => {
      if (confirm) await dialog.accept();
      else await dialog.dismiss();
    });
    await this.customClearBtn.click();
    // give a moment for UI to update after clearing
    await this.page.waitForTimeout(50);
  }

  async getEdgesListText() {
    return await this.edgesList.innerText();
  }

  async getCustomGraphEdgesLength() {
    return await this.page.evaluate(() => {
      if (window.customGraph && Array.isArray(window.customGraph.edges)) {
        return window.customGraph.edges.length;
      }
      return 0;
    });
  }

  async isCustomControlsVisible() {
    return await this.customControls.evaluate(node => {
      return window.getComputedStyle(node).display !== 'none';
    });
  }

  async getAutoButtonText() {
    return await this.autoBtn.textContent();
  }

  async getButtonStates() {
    return {
      startDisabled: await this.startBtn.isDisabled(),
      stepDisabled: await this.stepBtn.isDisabled(),
      autoDisabled: await this.autoBtn.isDisabled(),
      resetDisabled: await this.resetBtn.isDisabled(),
      graphSelectDisabled: await this.graphSelect.isDisabled()
    };
  }
}

test.describe('Kruskal\'s Algorithm Visualization - End-to-End', () => {
  // Arrays to capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize arrays to capture runtime errors and console errors
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages and capture those that indicate JS errors
    page.on('console', msg => {
      // Capture only error-level console messages for scrutiny
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location ? msg.location() : null });
        } else {
          // Also capture messages that explicitly include common JS error names
          const text = msg.text();
          if (/ReferenceError|TypeError|SyntaxError/.test(text)) {
            consoleErrors.push({ text, location: msg.location ? msg.location() : null });
          }
        }
      } catch (e) {
        // If any unexpected issue while inspecting console message, store a simple record
        consoleErrors.push({ text: `console-inspect-failed: ${String(e)}` });
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application
    const kp = new KruskalPage(page);
    await kp.goto();
  });

  // After each test, assert that there were no uncaught JS errors (console error or pageerror)
  test.afterEach(async () => {
    // It's important to assert there were no severe runtime errors during the test
    expect(consoleErrors.length, `Console errors were logged: ${JSON.stringify(consoleErrors, null, 2)}`).toBe(0);
    expect(pageErrors.length, `Uncaught page errors: ${JSON.stringify(pageErrors, null, 2)}`).toBe(0);
  });

  test.describe('Initial load and controls', () => {
    test('Initial page load shows default state and controls are appropriately enabled/disabled', async ({ page }) => {
      const kp1 = new KruskalPage(page);

      // Verify the title and header are present
      await expect(page.locator('h1')).toHaveText(/Kruskal's Algorithm Visualization/);

      // Canvas should be present and visible
      await expect(kp.canvas).toBeVisible();

      // Edges list should indicate no edges selected yet
      await expect(kp.edgesList).toHaveText('No edges selected yet.');

      // Check button states correspond to initial 'init' state from the implementation
      const states = await kp.getButtonStates();
      expect(states.startDisabled).toBe(false);
      expect(states.stepDisabled).toBe(true);
      expect(states.autoDisabled).toBe(true);
      expect(states.resetDisabled).toBe(true);
      expect(states.graphSelectDisabled).toBe(false);

      // Custom controls hidden for default graph
      expect(await kp.isCustomControlsVisible()).toBe(false);
    });

    test('Selecting "custom" graph reveals custom graph controls', async ({ page }) => {
      const kp2 = new KruskalPage(page);

      // Select custom graph and verify the controls show
      await kp.selectGraph('custom');
      expect(await kp.isCustomControlsVisible()).toBe(true);

      // Check that the custom-from and custom-to have options populated (A-K)
      const fromOptions = await page.locator('#custom-from option').allTextContents();
      const toOptions = await page.locator('#custom-to option').allTextContents();
      expect(fromOptions.length).toBeGreaterThan(0);
      expect(toOptions.length).toBeGreaterThan(0);
      expect(fromOptions[0]).toMatch(/[A-K]/);
    });
  });

  test.describe('Algorithm controls and state transitions', () => {
    test('Start and step through MST on triangle graph produces expected MST edges', async ({ page }) => {
      const kp3 = new KruskalPage(page);

      // Load triangle graph
      await kp.selectGraph('triangle');

      // Start algorithm
      await kp.clickStart();

      // Step once -> should add smallest edge (weight 1)
      await kp.clickStep();

      // After one step, edges-list should contain one selected edge (weight 1)
      let edgesText = await kp.getEdgesListText();
      expect(edgesText).toMatch(/weight: 1/);

      // Step again -> should add next edge and complete MST (total 2 edges for triangle)
      await kp.clickStep();

      edgesText = await kp.getEdgesListText();
      // Two edges should be listed and include both weights 1 and 2
      expect(edgesText).toMatch(/weight: 1/);
      expect(edgesText).toMatch(/weight: 2/);

      // After completion, step and auto should be disabled, reset enabled
      const states1 = await kp.getButtonStates();
      expect(states.startDisabled).toBe(true);
      expect(states.stepDisabled).toBe(true);
      expect(states.autoDisabled).toBe(true);
      expect(states.resetDisabled).toBe(false);
      // Graph select should be disabled when finished
      expect(states.graphSelectDisabled).toBe(true);
    });

    test('Auto Run toggles and disables Step while running', async ({ page }) => {
      const kp4 = new KruskalPage(page);

      // Load square graph
      await kp.selectGraph('square');

      // Start algorithm
      await kp.clickStart();

      // Clicking Auto Run should change its text to "Pause" and disable Step
      await kp.clickAuto();
      let autoText = await kp.getAutoButtonText();
      expect(autoText.trim()).toMatch(/Pause/i);
      let states2 = await kp.getButtonStates();
      expect(states.stepDisabled).toBe(true);

      // Clicking Auto Run again should pause (text returns to 'Auto Run') and leave Step disabled (per implementation stepBtn toggled)
      await kp.clickAuto();
      autoText = await kp.getAutoButtonText();
      expect(autoText.trim()).toMatch(/Auto Run/i);
    });

    test('Reset returns UI to initial state and clears MST progress', async ({ page }) => {
      const kp5 = new KruskalPage(page);

      // Use default graph
      await kp.selectGraph('default');
      await kp.clickStart();
      // take one step
      await kp.clickStep();

      // Reset
      await kp.clickReset();

      // Edges list should be reset to 'No edges selected yet.'
      await expect(kp.edgesList).toHaveText('No edges selected yet.');

      // Controls returned to initial state
      const states3 = await kp.getButtonStates();
      expect(states.startDisabled).toBe(false);
      expect(states.stepDisabled).toBe(true);
      expect(states.autoDisabled).toBe(true);
      expect(states.resetDisabled).toBe(true);
      expect(states.graphSelectDisabled).toBe(false);
    });
  });

  test.describe('Custom graph interactions and edge cases', () => {
    test('Adding edges to custom graph and preventing invalid/duplicate edges', async ({ page }) => {
      const kp6 = new KruskalPage(page);

      // Switch to custom graph
      await kp.selectGraph('custom');
      expect(await kp.isCustomControlsVisible()).toBe(true);

      // Initially custom graph should have zero edges
      let len = await kp.getCustomGraphEdgesLength();
      expect(len).toBe(0);

      // Try to add self-edge A -> A and verify alert appears and no edge added
      const selfEdgePromise = page.waitForEvent('dialog');
      // Trigger adding an edge from A to A with weight 5 (invalid)
      await kp.customFrom.selectOption('A');
      await kp.customTo.selectOption('A');
      await kp.customWeight.fill('5');
      await kp.customAddEdgeBtn.click();
      const selfEdgeDialog = await selfEdgePromise;
      expect(selfEdgeDialog.type()).toBe('alert');
      expect(selfEdgeDialog.message()).toMatch(/Cannot add edge from a vertex to itself/i);
      await selfEdgeDialog.accept();

      // Ensure still zero edges after invalid add
      len = await kp.getCustomGraphEdgesLength();
      expect(len).toBe(0);

      // Try adding with invalid weight (0)
      const invalidWeightPromise = page.waitForEvent('dialog');
      await kp.customFrom.selectOption('A');
      await kp.customTo.selectOption('B');
      await kp.customWeight.fill('0');
      await kp.customAddEdgeBtn.click();
      const invalidWeightDialog = await invalidWeightPromise;
      expect(invalidWeightDialog.type()).toBe('alert');
      expect(invalidWeightDialog.message()).toMatch(/Weight should be a positive number/i);
      await invalidWeightDialog.accept();

      // Ensure still zero edges
      len = await kp.getCustomGraphEdgesLength();
      expect(len).toBe(0);

      // Add a valid edge A -> B weight 5
      await kp.addCustomEdge('A', 'B', 5);
      len = await kp.getCustomGraphEdgesLength();
      expect(len).toBe(1);

      // Attempt to add duplicate edge B -> A (either direction) should alert "Edge already exists."
      const dupEdgePromise = page.waitForEvent('dialog');
      await kp.addCustomEdge('B', 'A', 5);
      const dupDialog = await dupEdgePromise;
      expect(dupDialog.type()).toBe('alert');
      expect(dupDialog.message()).toMatch(/Edge already exists/i);
      await dupDialog.accept();

      // Ensure still one edge after duplicate attempt
      len = await kp.getCustomGraphEdgesLength();
      expect(len).toBe(1);

      // Clear custom graph: confirm shows; accept to clear
      const clearConfirmPromise = page.waitForEvent('dialog');
      await kp.clearCustomGraph(true); // passing true to accept confirm
      const clearDialog = await clearConfirmPromise;
      expect(clearDialog.type()).toBe('confirm');
      expect(clearDialog.message()).toMatch(/Clear all edges in the custom graph\?/i);
      // The clearCustomGraph method already accepted; ensure edges cleared
      len = await kp.getCustomGraphEdgesLength();
      expect(len).toBe(0);
    });
  });

  test.describe('Accessibility and content checks', () => {
    test('Edges list region has accessible attributes and updates when MST changes', async ({ page }) => {
      const kp7 = new KruskalPage(page);

      // edges-list should have aria-label and tabindex
      const ariaLabel = await page.locator('#edges-list').getAttribute('aria-label');
      expect(ariaLabel).toMatch(/List of edges selected in the minimum spanning tree/i);
      const tabIndex = await page.locator('#edges-list').getAttribute('tabindex');
      expect(tabIndex).toBe('0');

      // Run small example to cause edges-list to update
      await kp.selectGraph('triangle');
      await kp.clickStart();
      await kp.clickStep();
      const textAfterStep = await kp.getEdgesListText();
      expect(textAfterStep).toContain('weight: 1');
    });
  });

  test.describe('Runtime error observation', () => {
    test('No uncaught JavaScript errors or console errors during normal interactions', async ({ page }) => {
      // This test performs a set of typical interactions and relies on the afterEach assertions
      // to validate that no page errors or console-level errors were emitted.
      const kp8 = new KruskalPage(page);

      // Perform a sequence of interactions
      await kp.selectGraph('default');
      await kp.clickStart();
      await kp.clickStep();
      await kp.clickStep();
      await kp.clickReset();

      // Now perform custom interactions
      await kp.selectGraph('custom');
      // Add a valid edge
      await kp.addCustomEdge('A', 'C', 2);

      // Reset to default and ensure app remains stable
      await kp.selectGraph('default');

      // No explicit assertion here - the afterEach will assert consoleErrors and pageErrors are empty
      // But for explicitness, check that the edges-list contains the expected default text
      await expect(kp.edgesList).toHaveText('No edges selected yet.');
    });
  });
});