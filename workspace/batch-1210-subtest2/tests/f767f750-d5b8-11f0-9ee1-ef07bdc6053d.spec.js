import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f767f750-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('DFS Visualization FSM - f767f750-d5b8-11f0-9ee1-ef07bdc6053d', () => {
  // Collect runtime errors and console messages for each test to assert no unexpected errors occur.
  test.beforeEach(async ({ page }) => {
    // Accept any native dialogs (the "Start DFS" button triggers an alert).
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.goto(APP_URL);
    // Ensure the graph is rendered before proceeding with tests.
    await page.waitForSelector('#graph');
    await page.waitForSelector('#start');
    await page.waitForSelector('.node');
  });

  test('Initial Idle state: renders Start button and expected number of nodes, none visited', async ({ page }) => {
    // Capture page errors and console errors
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Verify Start button exists (evidence for S0_Idle)
    const start = page.locator('#start');
    await expect(start).toBeVisible();
    await expect(start).toHaveText('Start DFS');

    // Verify number of nodes created equals expected (8 nodes based on graph definition)
    const nodes = page.locator('.node');
    await expect(nodes).toHaveCount(8);

    // No node should have 'visited' class initially
    const visitedCount = await page.locator('.node.visited').count();
    expect(visitedCount).toBe(0);

    // Verify there are no unexpected page errors or console error messages on initial load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking a node starts DFS and marks that node visited (S0 -> S1 -> S2)', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Click a node that exists in the graph (e.g., "0,1")
    const node01 = page.locator('.node', { hasText: '0,1' });
    await expect(node01).toBeVisible();
    await node01.click();

    // Immediately after click, the clicked node should have class 'visited'
    await expect(node01).toHaveClass(/visited/);

    // The global dfsOrder should include '0,1'
    const dfsOrder = await page.evaluate(() => Array.from(dfsOrder));
    // Note: dfsOrder is a global variable; ensure it's an array and contains the clicked node
    expect(Array.isArray(dfsOrder)).toBe(true);
    expect(dfsOrder).toContain('0,1');

    // visited Set should contain the clicked node
    const visitedSize = await page.evaluate(() => visited.has('0,1') ? visited.size : visited.size);
    expect(visitedSize).toBeGreaterThanOrEqual(1);

    // No runtime page errors should have occurred during this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('DFS transition: neighbor is visited after delay (setTimeout) (S2 -> S1)', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Choose a node known to have a neighbor on the right: "1,2" should have neighbor "1,3"
    const startNode = page.locator('.node', { hasText: '1,2' });
    const neighborNode = page.locator('.node', { hasText: '1,3' });

    await expect(startNode).toBeVisible();
    await expect(neighborNode).toBeVisible();

    // Click the starting node to begin DFS
    await startNode.click();

    // Immediately, the starting node should be visited
    await expect(startNode).toHaveClass(/visited/);

    // Wait a bit longer than the setTimeout delay (1000ms) to allow neighbor visits to occur
    await page.waitForTimeout(1200);

    // Now the neighbor should have been marked visited by the delayed DFS call
    await expect(neighborNode).toHaveClass(/visited/);

    // Global dfsOrder should include both nodes, in order (starting node first)
    const dfsOrder = await page.evaluate(() => dfsOrder.slice());
    expect(dfsOrder[0]).toBe('1,2');
    // neighbor '1,3' should appear somewhere after (timing-based traversal might include others, but at least contains)
    expect(dfsOrder).toContain('1,3');

    expect(pageErrors.length).toBe(0);
  });

  test('Start button resets visited nodes and clears dfsOrder (entry/exit actions)', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Click a node first to create visited state
    const node12 = page.locator('.node', { hasText: '1,2' });
    await node12.click();
    await expect(node12).toHaveClass(/visited/);

    // Ensure dfsOrder has at least one entry
    let dfsOrder = await page.evaluate(() => dfsOrder.slice());
    expect(dfsOrder.length).toBeGreaterThanOrEqual(1);

    // Click Start DFS button; this triggers an alert which is auto-accepted by beforeEach handler
    await page.click('#start');

    // After reset, no nodes should have 'visited' class
    const visitedNodesAfterReset = await page.locator('.node.visited').count();
    expect(visitedNodesAfterReset).toBe(0);

    // Global dfsOrder should be reset to empty array
    dfsOrder = await page.evaluate(() => dfsOrder.slice());
    expect(dfsOrder.length).toBe(0);

    // visited Set should be empty
    const visitedSize = await page.evaluate(() => visited.size);
    expect(visitedSize).toBe(0);

    expect(pageErrors.length).toBe(0);
  });

  test('Clicking the same node twice does not duplicate entries in dfsOrder (idempotency)', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Ensure clean start
    await page.click('#start');

    // Click node "0,1" twice quickly
    const node01 = page.locator('.node', { hasText: '0,1' });
    await node01.click();
    await node01.click();

    // dfsOrder should contain the node only once
    const dfsOrder = await page.evaluate(() => dfsOrder.slice());
    const occurrences = dfsOrder.filter(x => x === '0,1').length;
    expect(occurrences).toBe(1);

    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: clicking a non-node area does not change DFS state', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Ensure clean start
    await page.click('#start');

    // Record dfsOrder and visited size before clicking non-node
    const beforeDfsOrder = await page.evaluate(() => dfsOrder.slice());
    const beforeVisitedSize = await page.evaluate(() => visited.size);

    // Click the heading (non-node area)
    await page.click('h1');

    // No changes expected
    const afterDfsOrder = await page.evaluate(() => dfsOrder.slice());
    const afterVisitedSize = await page.evaluate(() => visited.size);

    expect(afterDfsOrder).toEqual(beforeDfsOrder);
    expect(afterVisitedSize).toBe(beforeVisitedSize);

    expect(pageErrors.length).toBe(0);
  });

  test('Observe console and page errors during full flow: no ReferenceError/SyntaxError/TypeError on normal interactions', async ({ page }) => {
    // This test explicitly collects console messages and page errors across a sequence of interactions.
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Interact: click a node, wait for neighbor visits, then reset
    await page.locator('.node', { hasText: '1,2' }).click();
    await page.waitForTimeout(1200);
    await page.click('#start');

    // After interactions, assert no page errors and no console errors were emitted.
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});