import { test, expect } from '@playwright/test';

//
// Test suite for BFS Visualization application
// File: 6e0a0746-d5a0-11f0-8040-510e90b1f3a7-breadth-first-search-bfs.spec.js
//
// These tests load the page as-is (no runtime patching) and exercise the UI:
// - Verify initial state after DOMContentLoaded initialization
// - Interact with Step, Start, Reset, and Speed controls
// - Assert DOM updates, node classes, queue contents, and info panel text
// - Capture console errors and page errors and assert none occurred
//

// Page object model for the BFS visualization page
class BFSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.startBtn = page.locator('#startBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.speedSelect = page.locator('#speedSelect');
    this.currentStepLabel = page.locator('#currentStep');
    this.visitedNodesLabel = page.locator('#visitedNodes');
    this.queueDisplay = page.locator('#queueDisplay');
    this.graphCanvas = page.locator('#graphCanvas');
  }

  // Returns a locator for a node by id like 'A'
  nodeLocator(nodeId) {
    return this.page.locator(`#node-${nodeId}`);
  }

  // Get class attribute for a node element
  async getNodeClass(nodeId) {
    const locator = this.nodeLocator(nodeId);
    await expect(locator).toBeVisible();
    return locator.getAttribute('class');
  }

  // Get texts of queue items in order
  async getQueueItems() {
    return this.queueDisplay.locator('.queue-item').allTextContents();
  }

  // Click controls
  async clickStart() {
    await this.startBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async selectSpeed(value) {
    await this.speedSelect.selectOption(value);
  }

  // Wait until the currentStep label deviates from the placeholder 'Ready'
  async waitForInitialization() {
    await this.page.waitForFunction(() => {
      const el = document.getElementById('currentStep');
      return el && el.textContent && el.textContent.trim() !== 'Ready';
    }, null, { timeout: 3000 });
  }

  // Wait until the Start button becomes enabled again (used to detect animation end)
  async waitForAnimationToFinish(timeout = 10000) {
    await this.page.waitForFunction(() => {
      const btn = document.getElementById('startBtn');
      return btn && !btn.disabled;
    }, null, { timeout });
  }
}

test.describe('Breadth-First Search (BFS) Visualization - Functional tests', () => {
  // Track console and page errors to assert none occurred
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console errors (Runtime exceptions or console.error)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Navigate to the provided HTML file
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0746-d5a0-11f0-8040-510e90b1f3a7.html', { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async () => {
    // Assert there were no console errors or page errors during the test
    expect(consoleErrors, `Console errors were logged: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors were thrown: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Initial load: controls are visible and initial BFS state is rendered', async ({ page }) => {
    const bfs = new BFSPage(page);

    // Ensure the visualization has initialized and replaced the 'Ready' label
    await bfs.waitForInitialization();

    // Buttons and select are visible and enabled by default
    await expect(bfs.startBtn).toBeVisible();
    await expect(bfs.resetBtn).toBeVisible();
    await expect(bfs.stepBtn).toBeVisible();
    await expect(bfs.speedSelect).toBeVisible();

    // Default selected speed should be the option '300' (Medium)
    const selectedSpeed = await bfs.speedSelect.inputValue();
    expect(selectedSpeed).toBe('300');

    // The current step label should show the starting BFS description
    const currentStepText = await bfs.currentStepLabel.textContent();
    expect(currentStepText).toMatch(/Starting BFS from node A/);

    // Visited nodes initially should include only 'A' (the start node)
    const visitedText = (await bfs.visitedNodesLabel.textContent()).trim();
    expect(visitedText).toBe('A');

    // Queue should display the start node 'A' as the current item
    const queueItems = await bfs.getQueueItems();
    expect(queueItems[0]).toBe('A');

    // Basic node elements exist for A..G
    for (const id of ['A','B','C','D','E','F','G']) {
      await expect(bfs.nodeLocator(id)).toBeVisible();
    }

    // Node A should initially have both 'visited' and 'current' classes applied
    const nodeAClass = await bfs.getNodeClass('A');
    expect(nodeAClass.includes('visited')).toBeTruthy();
    expect(nodeAClass.includes('current')).toBeTruthy();
  });

  test('Step Forward advances visualization and updates visited nodes and queue', async ({ page }) => {
    const bfs = new BFSPage(page);

    // Wait for initialization
    await bfs.waitForInitialization();

    // Reset to ensure deterministic starting state (should set currentStep to 0)
    await bfs.clickReset();

    // After reset, still initialized to start - verify starting description
    await expect(bfs.currentStepLabel).toHaveText(/Starting BFS from node A/);

    // Click Step to move to the "Processing node A" step
    await bfs.clickStep();

    // After one step forward, the description should update to "Processing node A"
    await expect(bfs.currentStepLabel).toHaveText(/Processing node A/);

    // Visited nodes should still be only A at this stage
    const visitedAfterOne = (await bfs.visitedNodesLabel.textContent()).trim();
    expect(visitedAfterOne).toBe('A');

    // The queue display at this specific processing step should be empty (A was shifted)
    const queueItemsAfterOne = await bfs.getQueueItems();
    expect(queueItemsAfterOne.length).toBe(0);

    // Click Step again to reach the discovery of the first neighbor (likely B)
    await bfs.clickStep();

    // The visited nodes should now include the discovered neighbor(s) (A and B expected)
    const visitedAfterTwo = (await bfs.visitedNodesLabel.textContent()).trim();
    // Visited nodes might be a comma-separated list; ensure 'A' and 'B' are included
    expect(visitedAfterTwo.includes('A')).toBeTruthy();
    expect(visitedAfterTwo.includes('B')).toBeTruthy();

    // The queue should now have at least one item 'B' as the current queue head
    const queueItemsAfterTwo = await bfs.getQueueItems();
    expect(queueItemsAfterTwo.length).toBeGreaterThanOrEqual(1);
    expect(queueItemsAfterTwo[0]).toBe('B');

    // Node B should have the 'visited' class applied
    const nodeBClass = await bfs.getNodeClass('B');
    expect(nodeBClass.includes('visited')).toBeTruthy();
  });

  test('Start animation runs to completion, disables/enables controls, and completes BFS', async ({ page }) => {
    const bfs = new BFSPage(page);

    // Wait for initialization
    await bfs.waitForInitialization();

    // Switch to fastest speed to complete quicker
    await bfs.selectSpeed('100');
    const newSpeed = await bfs.speedSelect.inputValue();
    expect(newSpeed).toBe('100');

    // Click Start to begin animation
    await bfs.clickStart();

    // Immediately after starting, Start and Step should be disabled
    await expect(bfs.startBtn).toBeDisabled();
    await expect(bfs.stepBtn).toBeDisabled();

    // Wait for animation to finish (Start button becomes enabled again)
    await bfs.waitForAnimationToFinish(15000);

    // After animation completes, Start and Step should be enabled again
    await expect(bfs.startBtn).toBeEnabled();
    await expect(bfs.stepBtn).toBeEnabled();

    // The current step description should end with BFS completed
    const finalText = (await bfs.currentStepLabel.textContent()).trim();
    expect(finalText).toBe('BFS completed!');

    // Queue should be empty at completion
    const finalQueue = await bfs.getQueueItems();
    expect(finalQueue.length).toBe(0);

    // Visited nodes should include all nodes (A..G); check at least presence of G
    const visitedFinal = (await bfs.visitedNodesLabel.textContent()).trim();
    expect(visitedFinal.includes('G')).toBeTruthy();
  });

  test('Reset returns visualization to initial step 0 state', async ({ page }) => {
    const bfs = new BFSPage(page);

    // Wait for initialization and then run a few steps manually
    await bfs.waitForInitialization();

    // Move forward a few steps
    await bfs.clickStep();
    await bfs.clickStep();
    await bfs.clickStep();

    // Ensure we've advanced from the starting description
    const preResetText = await bfs.currentStepLabel.textContent();
    expect(preResetText).not.toMatch(/Starting BFS from node A/);

    // Now reset
    await bfs.clickReset();

    // After reset, current step should be back to starting description
    await expect(bfs.currentStepLabel).toHaveText(/Starting BFS from node A/);

    // After reset, node A should be the visited and current node (per implementation)
    const nodeAClassAfterReset = await bfs.getNodeClass('A');
    expect(nodeAClassAfterReset.includes('visited')).toBeTruthy();
    expect(nodeAClassAfterReset.includes('current')).toBeTruthy();

    // Other nodes should not have 'visited' class
    for (const id of ['B','C','D','E','F','G']) {
      const cls = await bfs.getNodeClass(id);
      expect(cls.includes('visited')).toBeFalsy();
    }

    // Queue should show only the start node 'A'
    const queueAfterReset = await bfs.getQueueItems();
    expect(queueAfterReset.length).toBeGreaterThanOrEqual(1);
    expect(queueAfterReset[0]).toBe('A');
  });

  test('Speed select control changes the selected value', async ({ page }) => {
    const bfs = new BFSPage(page);

    // Wait for initialization
    await bfs.waitForInitialization();

    // Change to Slow (500)
    await bfs.selectSpeed('500');
    expect(await bfs.speedSelect.inputValue()).toBe('500');

    // Change to Fast (100)
    await bfs.selectSpeed('100');
    expect(await bfs.speedSelect.inputValue()).toBe('100');

    // The select element should remain visible and enabled
    await expect(bfs.speedSelect).toBeVisible();
    await expect(bfs.speedSelect).toBeEnabled();
  });
});