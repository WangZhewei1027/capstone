import { test, expect } from '@playwright/test';

// Page object model for the BFS visualization page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.startBtn = page.locator('#startBtn');
    this.nextBtn = page.locator('#nextBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.startSelect = page.locator('#startNode');
    this.stepDescription = page.locator('#stepDescription');
    this.queueContents = page.locator('#queueContents');
    this.graphCanvas = page.locator('#graphCanvas');
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd7663c-d59e-11f0-ae0b-570552a0b645.html', { waitUntil: 'load' });
  }

  // Click the Start BFS button
  async startBFS() {
    await this.startBtn.click();
  }

  // Click the Next Step button
  async nextStep() {
    await this.nextBtn.click();
  }

  // Click the Reset button
  async reset() {
    await this.resetBtn.click();
  }

  // Change the selected start node
  async selectStartNode(value) {
    await this.startSelect.selectOption(value);
  }

  // Get text of the step description
  async getStepDescriptionText() {
    return await this.stepDescription.textContent();
  }

  // Get visible queue items as array of strings
  async getQueueItems() {
    const items = await this.queueContents.locator('.queue-item').allTextContents();
    return items.map(s => s.trim()).filter(Boolean);
  }

  // Return the class list for a named node (e.g., 'A' => '#node-A')
  async getNodeClassList(nodeLabel) {
    const node = this.page.locator(`#node-${nodeLabel}`);
    // If node might not exist, handle gracefully
    const exists = await node.count();
    if (!exists) return [];
    const cls = await node.getAttribute('class');
    if (!cls) return [];
    return cls.split(/\s+/).filter(Boolean);
  }

  // Count number of .node elements rendered
  async countNodes() {
    return await this.page.locator('.node').count();
  }

  // Check whether next button is enabled
  async isNextEnabled() {
    return await this.nextBtn.isEnabled();
  }

  // Check whether start button is enabled
  async isStartEnabled() {
    return await this.startBtn.isEnabled();
  }
}

test.describe('Breadth-First Search (BFS) Visualization - dfd7663c-d59e-11f0-ae0b-570552a0b645', () => {
  let pageErrors = [];
  let consoleErrors = [];

  // Install listeners to capture console errors and page errors for each test
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    page.on('console', msg => {
      // Capture only error-level console messages for focused assertions
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
  });

  test.afterEach(async () => {
    // After each test, ensure no unexpected runtime errors were emitted to the console
    // This assertion helps catch silent runtime exceptions introduced in the page code
    expect(pageErrors.length, `Unexpected window errors: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console.error messages: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
  });

  test('Initial page load displays controls, graph nodes and default state', async ({ page }) => {
    // Purpose: Verify the page loads, initial DOM and control states are correct before any interaction
    const gp = new GraphPage(page);
    await gp.goto();

    // Title and basic elements present
    await expect(page).toHaveTitle(/Breadth-First Search/i);
    await expect(gp.startBtn).toBeVisible();
    await expect(gp.nextBtn).toBeVisible();
    await expect(gp.resetBtn).toBeVisible();
    await expect(gp.startSelect).toBeVisible();

    // Buttons default states: start enabled, next disabled, reset enabled
    expect(await gp.isStartEnabled()).toBe(true);
    expect(await gp.isNextEnabled()).toBe(false);

    // The initial step description in the static HTML is "Ready to start BFS"
    const desc = (await gp.getStepDescriptionText())?.trim() ?? '';
    expect(desc).toContain('Ready to start BFS');

    // Graph should render six nodes (A-F)
    const nodeCount = await gp.countNodes();
    expect(nodeCount).toBe(6);

    // Queue should be empty initially
    const queueItems = await gp.getQueueItems();
    expect(queueItems.length).toBe(0);
  });

  test('Clicking Start BFS initializes queue, marks start node, and enables Next', async ({ page }) => {
    // Purpose: Validate start behavior: queue contains selected start node, visualization updates
    const gp = new GraphPage(page);
    await gp.goto();

    // Ensure default start node is A (as in HTML) then start BFS
    const startValue = await gp.startSelect.inputValue();
    expect(startValue).toBe('A');

    await gp.startBFS();

    // Start button should be disabled while BFS is running and Next should be enabled
    expect(await gp.isStartEnabled()).toBe(false);
    expect(await gp.isNextEnabled()).toBe(true);

    // Queue should show the start node (A)
    const queueItems = await gp.getQueueItems();
    expect(queueItems).toContain('A');

    // Node A should have both 'visited' and 'current' classes after initialization step
    const nodeAClasses = await gp.getNodeClassList('A');
    expect(nodeAClasses).toEqual(expect.arrayContaining(['visited', 'current']));

    // Step description should indicate starting from node A
    const desc = (await gp.getStepDescriptionText())?.trim() ?? '';
    expect(desc).toMatch(/Starting BFS from node A/i);
  });

  test('Progressing through Next steps performs BFS traversal and completes', async ({ page }) => {
    // Purpose: Step through the entire BFS using Next button and assert the state transitions and final state
    const gp = new GraphPage(page);
    await gp.goto();

    // Start BFS with default start node (A)
    await gp.startBFS();

    // Step-by-step progress:
    // We'll click Next repeatedly until the Next button becomes disabled (BFS complete).
    // After completion, assert that all nodes are marked visited and final step description is shown.
    let iterations = 0;
    const maxIterations = 50; // safety to avoid infinite loops in test if page malfunctions

    while (await gp.isNextEnabled() && iterations < maxIterations) {
      await gp.nextStep();
      iterations++;
      // Briefly allow UI updates when needed
      await page.waitForTimeout(10);
    }

    // Expect we didn't hit the iteration cap
    expect(iterations).toBeLessThan(maxIterations);

    // After BFS completes: Next should be disabled, Start enabled
    expect(await gp.isNextEnabled()).toBe(false);
    expect(await gp.isStartEnabled()).toBe(true);

    // Step description should indicate completion
    const finalDesc = (await gp.getStepDescriptionText())?.trim() ?? '';
    expect(finalDesc).toMatch(/BFS completed/i);

    // Queue should be empty at completion
    const finalQueue = await gp.getQueueItems();
    expect(finalQueue.length).toBe(0);

    // All nodes A-F should be marked as visited (graph is connected in this example)
    const expectedNodes = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const node of expectedNodes) {
      const cls = await gp.getNodeClassList(node);
      expect(cls, `Node ${node} should be marked visited`).toEqual(expect.arrayContaining(['visited']));
    }
  });

  test('Reset button restores initial UI state and changing start node resets BFS', async ({ page }) => {
    // Purpose: Ensure Reset clears visualization and selecting a different start node triggers a reset
    const gp = new GraphPage(page);
    await gp.goto();

    // Start BFS, then perform a single Next to change state
    await gp.startBFS();
    await gp.nextStep();

    // Confirm some changes occurred (queue or visited)
    const queueBeforeReset = await gp.getQueueItems();
    expect(queueBeforeReset.length).toBeGreaterThanOrEqual(0);

    // Click Reset - should clear visited/current classes and queue, and restore step description
    await gp.reset();
    await page.waitForTimeout(10);

    // Start button should be enabled, Next disabled
    expect(await gp.isStartEnabled()).toBe(true);
    expect(await gp.isNextEnabled()).toBe(false);

    // Step description should revert to default (contains "Ready to start BFS")
    const resetDesc = (await gp.getStepDescriptionText())?.trim() ?? '';
    expect(resetDesc).toMatch(/Ready to start BFS/i);

    // No nodes should have 'current' or 'visited' classes after reset
    const nodes = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const node of nodes) {
      const cls = await gp.getNodeClassList(node);
      expect(cls).not.toEqual(expect.arrayContaining(['current']));
      // It's possible the initial render might have no classes; ensure visited is cleared
      expect(cls).not.toEqual(expect.arrayContaining(['visited']));
    }

    // Change the start node selection to 'D' to ensure change event resets BFS (select triggers resetBFS)
    await gp.selectStartNode('D');
    const afterSelectDesc = (await gp.getStepDescriptionText())?.trim() ?? '';
    expect(afterSelectDesc).toMatch(/Ready to start BFS/i);
    expect(await gp.isNextEnabled()).toBe(false);
    expect(await gp.isStartEnabled()).toBe(true);

    // Start BFS from D and verify queue initially contains D
    await gp.startBFS();
    const queueAfterStart = await gp.getQueueItems();
    expect(queueAfterStart).toEqual(['D']);
  });

  test('Observes console and runtime errors during interactions (should be none)', async ({ page }) => {
    // Purpose: Capture console errors and page errors while performing a few interactions to ensure no runtime exceptions
    const gp = new GraphPage(page);
    await gp.goto();

    // Perform a typical sequence of interactions
    await gp.startBFS();
    await gp.nextStep();
    await gp.reset();
    await gp.selectStartNode('C');
    await gp.startBFS();
    await gp.nextStep();

    // The afterEach hook will assert zero pageErrors and zero consoleErrors.
    // We still include inline checks here to provide clearer failure context if they occur.
    // Allow a short moment for any async errors to propagate to page listeners
    await page.waitForTimeout(20);

    // Local assertions (the definitive assertions are in afterEach)
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});