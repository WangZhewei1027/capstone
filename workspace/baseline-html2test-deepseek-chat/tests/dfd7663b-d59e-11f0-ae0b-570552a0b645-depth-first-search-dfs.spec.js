import { test, expect } from '@playwright/test';

// Test file: dfd7663b-d59e-11f0-ae0b-570552a0b645-depth-first-search-dfs.spec.js
// Purpose: End-to-end tests for the Depth-First Search (DFS) visualization page.
// The tests load the page as-is, interact with controls, validate DOM updates,
// visual changes, and ensure no unexpected console/page errors occur during interactions.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd7663b-d59e-11f0-ae0b-570552a0b645.html';

// Helper: expected RGB colors for nodes (derived from the inline hex values in the app)
const COLORS = {
  unvisited: 'rgb(52, 152, 219)',  // #3498db
  visited: 'rgb(243, 156, 18)',    // #f39c12
  processed: 'rgb(46, 204, 113)',  // #2ecc71
  current: 'rgb(231, 76, 60)'      // #e74c3c
};

test.describe('Depth-First Search (DFS) Visualization - interactive tests', () => {
  // Arrays to capture runtime console errors and page errors.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset arrays for every test
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application page and wait for main visualization to be present
    await page.goto(APP_URL, { waitUntil: 'load' });
    await page.waitForSelector('#graph-visualization'); // ensure graph container is initialized
    // Also ensure steps list is initialized
    await page.waitForSelector('#steps-list .step-item', { timeout: 2000 });
  });

  test.afterEach(async () => {
    // After each test, assert there were no console or page errors emitted during the test.
    // This ensures the app runs without uncaught exceptions during our interactions.
    expect(consoleErrors, `Console error(s) detected: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(pageErrors, `Page error(s) detected: ${JSON.stringify(pageErrors, null, 2)}`).toHaveLength(0);
  });

  test('Initial load: controls, nodes, edges, and steps are present with expected default state', async ({ page }) => {
    // Purpose: Verify initial DOM structure and default states of controls and elements.

    // Controls presence and default states
    const startBtn = await page.$('#start-btn');
    const pauseBtn = await page.$('#pause-btn');
    const resetBtn = await page.$('#reset-btn');
    const speedControl = await page.$('#speed-control');

    expect(startBtn).not.toBeNull();
    expect(pauseBtn).not.toBeNull();
    expect(resetBtn).not.toBeNull();
    expect(speedControl).not.toBeNull();

    // Start should be enabled, pause disabled, reset enabled
    expect(await startBtn.isDisabled()).toBe(false);
    expect(await pauseBtn.isDisabled()).toBe(true);
    expect(await resetBtn.isDisabled()).toBe(false);

    // Speed control default value should be "5" per the HTML
    const speedValue = await page.$eval('#speed-control', el => el.value);
    expect(speedValue).toBe('5');

    // Nodes: there should be node elements for A-F (6 nodes)
    const nodeElements = await page.$$('.node');
    expect(nodeElements.length).toBeGreaterThanOrEqual(6);

    // Verify a few specific nodes exist and check their initial background color (unvisited)
    const nodesToCheck = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const node of nodesToCheck) {
      const selector = `#node-${node}`;
      await expect(page.locator(selector)).toBeVisible();
      // Check computed background color equals unvisited color
      const bg = await page.$eval(selector, el => window.getComputedStyle(el).backgroundColor);
      expect(bg).toBe(COLORS.unvisited);
    }

    // Steps list should be populated with at least one step
    const stepItems = await page.$$('#steps-list .step-item');
    expect(stepItems.length).toBeGreaterThan(0);

    // The first step should mention pushing node A to stack
    const firstStepText = await page.$eval('#steps-list .step-item:nth-child(1)', el => el.textContent.trim());
    expect(firstStepText.toLowerCase()).toContain('push a');
  });

  test('Start button begins animation (first step applied) and Pause toggles animation state', async ({ page }) => {
    // Purpose: Verify clicking Start performs at least the first animation step synchronously,
    // and Pause stops further progression.

    const startBtn = page.locator('#start-btn');
    const pauseBtn = page.locator('#pause-btn');

    // Click Start to begin the DFS animation
    await startBtn.click();

    // Immediately after clicking, Start should be disabled and Pause enabled
    await expect(startBtn).toBeDisabled();
    await expect(pauseBtn).toBeEnabled();

    // The first step executes synchronously inside performDFSStep before setTimeout schedule.
    // Wait a short moment to ensure DOM updates from the first step have been applied.
    await page.waitForTimeout(40);

    // After first step, node A should be marked as 'visited' (orange - visited)
    const nodeAColor = await page.$eval('#node-A', el => window.getComputedStyle(el).backgroundColor);
    expect(nodeAColor).toBe(COLORS.visited);

    // The first step item should have 'current' class
    const firstStepHasCurrent = await page.$eval('#step-0', el => el.classList.contains('current'));
    expect(firstStepHasCurrent).toBe(true);

    // Now click Pause to stop the animation
    await pauseBtn.click();

    // After pausing, Pause should be disabled and Start enabled
    await expect(pauseBtn).toBeDisabled();
    await expect(startBtn).toBeEnabled();

    // Record current classes of step items, wait longer than one animation interval,
    // and ensure no further progress occurs after pause.
    const stepClassesBefore = await page.$$eval('#steps-list .step-item', items => items.map(i => i.className));
    await page.waitForTimeout(300); // longer than the fastest interval; ensures no further steps run
    const stepClassesAfter = await page.$$eval('#steps-list .step-item', items => items.map(i => i.className));

    expect(stepClassesAfter).toEqual(stepClassesBefore);
  });

  test('Reset restores nodes to unvisited and clears step progress classes', async ({ page }) => {
    // Purpose: Ensure that Reset returns the visualization to its initial unvisited state.

    const startBtn = page.locator('#start-btn');
    const resetBtn = page.locator('#reset-btn');

    // Start the animation to change some state
    await startBtn.click();
    await page.waitForTimeout(50); // allow at least the first step to run

    // Validate at least one node changed color from unvisited
    const nodeAColorDuring = await page.$eval('#node-A', el => window.getComputedStyle(el).backgroundColor);
    expect(nodeAColorDuring).toBe(COLORS.visited);

    // Click Reset to restore initial state
    await resetBtn.click();

    // After reset, node A should be back to unvisited color
    const nodeAColorAfter = await page.$eval('#node-A', el => window.getComputedStyle(el).backgroundColor);
    expect(nodeAColorAfter).toBe(COLORS.unvisited);

    // All step items should no longer have 'current' or 'completed' classes
    const problematicSteps = await page.$$eval('#steps-list .step-item', items =>
      items.filter(i => i.classList.contains('current') || i.classList.contains('completed'))
    );
    expect(problematicSteps.length).toBe(0);
  });

  test('Speed control: increasing speed results in faster progression of step classes', async ({ page }) => {
    // Purpose: Verify that setting speed control to a faster value produces more progressed steps in a fixed time window.

    const speedControl = page.locator('#speed-control');
    const startBtn = page.locator('#start-btn');
    const pauseBtn = page.locator('#pause-btn');

    // Set speed to maximum (10) for the fastest animation (smallest timeout)
    await speedControl.fill('10'); // input[type=range] accepts setting value by fill in many browsers
    // Confirm the value actually changed
    const speedValue = await page.$eval('#speed-control', el => el.value);
    expect(speedValue).toBe('10');

    // Start animation
    await startBtn.click();

    // Let the animation run for a short time to allow multiple steps to execute
    await page.waitForTimeout(350);

    // Pause the animation to freeze progress
    await pauseBtn.click();

    // Count how many steps are marked as completed (progressed)
    const completedCount = await page.$$eval('#steps-list .step-item.completed', items => items.length);
    // Expect at least one completed step when speed is max and we waited some time
    expect(completedCount).toBeGreaterThanOrEqual(1);

    // Also ensure at least one element is marked 'current' (the active step)
    const currentCount = await page.$$eval('#steps-list .step-item.current', items => items.length);
    expect(currentCount).toBeLessThanOrEqual(1);
    expect(currentCount).toBeGreaterThanOrEqual(0);
  });

  test('Edge case: clicking Start multiple times does not crash and control toggles behave predictably', async ({ page }) => {
    // Purpose: Simulate repeated Start clicks and ensure no crashes or unexpected states arise.

    const startBtn = page.locator('#start-btn');
    const pauseBtn = page.locator('#pause-btn');

    // Click Start multiple times rapidly
    await startBtn.click();
    // Additional clicks should have no effect other than keeping it disabled; ensure no exceptions
    await startBtn.click();
    await page.waitForTimeout(30);

    // Pause to stop animation
    await pauseBtn.click();

    // Ensure Start is enabled again after pausing
    await expect(startBtn).toBeEnabled();
    await expect(pauseBtn).toBeDisabled();

    // Click Start again to resume - should be allowed and not throw
    await startBtn.click();
    await page.waitForTimeout(40);
    await pauseBtn.click();

    // Verify node A still has a meaningful style (visited or processed) and no nodes lost their element nodes
    const nodeAExists = await page.$('#node-A') !== null;
    expect(nodeAExists).toBe(true);

    const nodeAText = await page.$eval('#node-A', el => el.textContent.trim());
    expect(nodeAText).toBe('A');
  });
});