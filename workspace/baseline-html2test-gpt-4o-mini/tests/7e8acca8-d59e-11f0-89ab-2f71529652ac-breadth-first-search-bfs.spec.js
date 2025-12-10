import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8acca8-d59e-11f0-89ab-2f71529652ac.html';

/*
 Test suite for Breadth-First Search (BFS) Visualization
 - Verifies initial page state
 - Validates BFS progression over time (queue updates and node visual changes)
 - Tests edge case: clicking "Start BFS" multiple times (duplicate nodes)
 - Observes console logs and page errors and asserts none occurred during normal operation

 Note:
 - The tests intentionally load the page "as-is" and observe any console/page errors without modifying the page.
 - Timing assertions account for the application's 1s interval between BFS steps.
*/

test.describe('BFS Visualization - initial page load and controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  test('loads page and shows Start BFS button with empty graph and queue', async ({ page }) => {
    // Capture console errors and page errors
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Ensure the Start BFS button is visible
    const startButton = page.locator('#startBFS');
    await expect(startButton).toBeVisible();

    // Graph container should be present but initially empty (no .node elements)
    const graphNodes = page.locator('#graph .node');
    await expect(graphNodes).toHaveCount(0);

    // Queue display should be present and empty
    const queueDisplay = page.locator('#queueDisplay');
    await expect(queueDisplay).toBeVisible();
    await expect(queueDisplay).toHaveText('', { timeout: 1000 });

    // No console or page errors should have occurred on initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});

test.describe('BFS progression and visual updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  test('clicking Start BFS creates nodes and progresses BFS step-by-step', async ({ page }) => {
    // Arrays to collect console and page errors during the test
    const consoleErrors1 = [];
    const pageErrors1 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Click Start BFS to create the graph and begin traversal
    await page.click('#startBFS');

    // After clicking, the graph should contain 6 node elements (A-F)
    const nodes = page.locator('#graph .node');
    await expect(nodes).toHaveCount(6);

    // Verify each node's text content matches expected labels A-F
    const expectedLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const label of expectedLabels) {
      // Use hasText to find a node with the given label
      const nodeLocator = page.locator('#graph .node', { hasText: label });
      await expect(nodeLocator).toHaveCount(1);
      await expect(nodeLocator.first()).toHaveText(label);
      // Initially nodes should not have the 'visited' class
      await expect(nodeLocator.first()).not.toHaveClass(/visited/);
    }

    // Immediately after starting BFS, queueDisplay should show 'A'
    const queueDisplay1 = page.locator('#queueDisplay1');
    await expect(queueDisplay).toHaveText('A', { timeout: 500 });

    // After ~1 second, node A should be marked visited and queue should show 'B, C'
    await expect(page.locator('#graph .node', { hasText: 'A' }).first()).toHaveClass(/visited/, { timeout: 1500 });
    await expect(queueDisplay).toHaveText('B, C', { timeout: 1500 });

    // After ~2 seconds total, node B should be visited and queue should show 'C, D, E'
    await expect(page.locator('#graph .node', { hasText: 'B' }).first()).toHaveClass(/visited/, { timeout: 2500 });
    await expect(queueDisplay).toHaveText('C, D, E', { timeout: 2500 });

    // After ~3 seconds total, node C should be visited and queue should show 'D, E, F'
    await expect(page.locator('#graph .node', { hasText: 'C' }).first()).toHaveClass(/visited/, { timeout: 3500 });
    await expect(queueDisplay).toHaveText('D, E, F', { timeout: 3500 });

    // After ~4 seconds total, node D should be visited and queue should show 'E, F'
    await expect(page.locator('#graph .node', { hasText: 'D' }).first()).toHaveClass(/visited/, { timeout: 4500 });
    await expect(queueDisplay).toHaveText('E, F', { timeout: 4500 });

    // After ~5 seconds total, node E should be visited and queue should show 'F'
    await expect(page.locator('#graph .node', { hasText: 'E' }).first()).toHaveClass(/visited/, { timeout: 5500 });
    await expect(queueDisplay).toHaveText('F', { timeout: 5500 });

    // After ~6 seconds total, node F should be visited and queue should become empty
    await expect(page.locator('#graph .node', { hasText: 'F' }).first()).toHaveClass(/visited/, { timeout: 6500 });
    await expect(queueDisplay).toHaveText('', { timeout: 7000 });

    // All nodes should now have the visited class
    for (const label of expectedLabels) {
      await expect(page.locator('#graph .node', { hasText: label }).first()).toHaveClass(/visited/, { timeout: 2000 });
    }

    // Assert that no console or page errors were recorded during BFS progression
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  }, 20000); // Extended timeout because this test waits for the BFS to complete over several seconds
});

test.describe('Edge cases and user interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  test('clicking Start BFS multiple times appends duplicate nodes and starts multiple traversals', async ({ page }) => {
    // Collect console and page errors to assert none occur
    const consoleErrors2 = [];
    const pageErrors2 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Click start twice quickly to simulate repeated user interaction
    await page.click('#startBFS');
    // Slight pause before clicking again to better reflect real user behavior
    await page.waitForTimeout(100);
    await page.click('#startBFS');

    // Because createGraph appends nodes on each click, we expect duplicates.
    // There should now be 12 .node elements (6 original + 6 duplicated)
    const nodes1 = page.locator('#graph .node');
    await expect(nodes).toHaveCount(12);

    // There should be two nodes with label 'A' (duplicates)
    const aNodes = page.locator('#graph .node', { hasText: 'A' });
    await expect(aNodes).toHaveCount(2);

    // The queue display might be influenced by two BFS runs; at minimum it should not be empty immediately
    const queueDisplay2 = page.locator('#queueDisplay2');
    await expect(queueDisplay).not.toHaveText('', { timeout: 1000 });

    // Wait a short while to allow both BFS runs to progress; ensure at least some nodes become visited
    await page.waitForTimeout(1600);
    // At least one 'A' node should be marked visited after ~1 second
    const visitedA = page.locator('#graph .node', { hasText: 'A' }).filter({ has: page.locator('.visited') });
    // It's acceptable that one or both 'A' nodes could be visited depending on timing; assert at least one visited
    const visitedACount = await visitedA.count();
    expect(visitedACount).toBeGreaterThanOrEqual(1);

    // Ensure that duplicate node creation did not cause runtime errors (no console/page errors)
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});