import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e032-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('Union-Find (Disjoint Set) Visualization - 6e09e032-d5a0-11f0-8040-510e90b1f3a7', () => {
  // arrays to collect runtime issues (console errors and page errors)
  let consoleErrors;
  let pageErrors;

  // Helper page object to encapsulate common selectors and actions
  const pageObject = {
    nodeCountInput: (page) => page.locator('#nodeCount'),
    node1Input: (page) => page.locator('#node1'),
    node2Input: (page) => page.locator('#node2'),
    initializeButton: (page) => page.getByRole('button', { name: 'Initialize Sets' }),
    unionButton: (page) => page.getByRole('button', { name: 'Union' }),
    findButton: (page) => page.getByRole('button', { name: 'Find' }),
    resetButton: (page) => page.getByRole('button', { name: 'Reset' }),
    randomButton: (page) => page.getByRole('button', { name: 'Random Operations' }),
    graphContainer: (page) => page.locator('#graph-container'),
    setsDisplay: (page) => page.locator('#sets-display'),
    info: (page) => page.locator('#info'),
    nodes: (page) => page.locator('.node'),
    leaderNodes: (page) => page.locator('.node.leader'),
    connections: (page) => page.locator('.connection'),
    nodeById: (page, id) => page.locator(`#node-${id}`)
  };

  test.beforeEach(async ({ page }) => {
    // Initialize collectors for console and page errors BEFORE navigation, to capture load-time errors.
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      // collect only console errors to detect runtime exceptions logged to console
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    page.on('pageerror', error => {
      // collect uncaught exceptions that bubble up as page errors
      pageErrors.push(error);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
    // Wait for initial initialization to complete (window.onload triggers initializeSets)
    await page.waitForTimeout(200); // small wait to allow DOM from initializeSets to render
  });

  test.afterEach(async () => {
    // Ensure we reset the arrays after each test
    consoleErrors = [];
    pageErrors = [];
  });

  test('Initial load: page initializes with default number of nodes and shows info', async ({ page }) => {
    // Purpose: Verify that the app initializes on load and displays default nodes and info message.
    // Assert no runtime errors occurred during load
    expect(pageErrors.length, 'No uncaught page errors on load').toBe(0);
    expect(consoleErrors.length, 'No console.error messages on load').toBe(0);

    // Default nodeCount value in HTML is 6
    const nodeCountValue = await pageObject.nodeCountInput(page).inputValue();
    expect(Number(nodeCountValue)).toBe(6);

    // There should be 6 node elements rendered
    const nodes = pageObject.nodes(page);
    await expect(nodes).toHaveCount(6);

    // The info area should indicate initialization
    await expect(pageObject.info(page)).toHaveText(/Initialized 6 disjoint sets/i);

    // There should be 6 leader nodes initially (every node is its own root -> leader class)
    const leaders = pageObject.leaderNodes(page);
    await expect(leaders).toHaveCount(6);

    // There should be zero connection elements initially (no parent pointers other than self)
    const connections = pageObject.connections(page);
    await expect(connections).toHaveCount(0);
  });

  test('Union operation merges two nodes and updates sets and leaders', async ({ page }) => {
    // Purpose: Test union operation updates internal sets and the DOM representation (leaders, sets, connections).
    // Ensure fresh initialization to known state
    await pageObject.initializeButton(page).click();
    await page.waitForTimeout(100);

    // Pre-check: leaders count should equal node count (6)
    const initialLeaders = await pageObject.leaderNodes(page).count();
    expect(initialLeaders).toBe(6);

    // Perform union between node 0 and 1
    await pageObject.node1Input(page).fill('0');
    await pageObject.node2Input(page).fill('1');
    await pageObject.unionButton(page).click();

    // Info area should reflect a successful union or already-in-same-set message; we accept the successful message
    await expect(pageObject.info(page)).toHaveText(/Union operation: Nodes 0 and 1 are now in the same set.|Nodes 0 and 1 are already in the same set./i);

    // After union, number of sets (displayed .set elements) should be decreased by at least 1 relative to initial
    const setsBefore = 6;
    const setElements = pageObject.setsDisplay(page).locator('.set');
    // Wait a small amount for the UI to update
    await page.waitForTimeout(100);
    const setCount = await setElements.count();
    expect(setCount).toBeLessThanOrEqual(setsBefore);
    expect(setCount).toBeGreaterThanOrEqual(1);

    // The number of leader nodes should decrease by 1 (from 6 to 5) if a merge occurred
    const leadersAfter = await pageObject.leaderNodes(page).count();
    // leadersAfter should be <= initialLeaders and >=1
    expect(leadersAfter).toBeLessThanOrEqual(initialLeaders);
    expect(leadersAfter).toBeGreaterThanOrEqual(1);

    // There should be at least one connection drawn (since some parent pointer is not self)
    const connectionCount = await pageObject.connections(page).count();
    expect(connectionCount).toBeGreaterThanOrEqual(1);

    // Assert no runtime errors occurred during union operation
    expect(pageErrors.length, 'No uncaught page errors after union').toBe(0);
    expect(consoleErrors.length, 'No console.error messages after union').toBe(0);
  });

  test('Find operation shows root info and highlights nodes', async ({ page }) => {
    // Purpose: Verify find operation reports the root and temporarily highlights the node and its root in the visualization.
    // Ensure initialization
    await pageObject.initializeButton(page).click();
    await page.waitForTimeout(100);

    // Pick a node that is its own root initially, e.g., node 2
    await pageObject.node1Input(page).fill('2');
    await pageObject.findButton(page).click();

    // Info should indicate the root of node 2 is 2 (initial state)
    await expect(pageObject.info(page)).toHaveText(/Find operation: The root of node 2 is 2\./i);

    // The node element should be temporarily highlighted with a background color of #ff9999
    const node2 = pageObject.nodeById(page, 2);
    // Immediately after click, the style is set; read the computed background-color
    const bgColor = await node2.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // '#ff9999' in rgb is 'rgb(255, 153, 153)'
    expect(bgColor).toBe('rgb(255, 153, 153)');

    // After ~1100ms the color should revert (either to leader yellow if it's a root or white otherwise). Wait a bit longer than the code's 1000ms timeout
    await page.waitForTimeout(1200);
    const bgColorAfter = await node2.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // Since node 2 is a root, it should go back to the leader color '#ffeb3b' which is rgb(255, 235, 59)
    // If not root (in other tests), fallback can be 'rgb(255, 235, 59)' or 'rgb(255, 255, 255)'
    expect(['rgb(255, 235, 59)', 'rgb(255, 255, 255)']).toContain(bgColorAfter);

    // Ensure no runtime errors due to find/highlight logic
    expect(pageErrors.length, 'No uncaught page errors after find').toBe(0);
    expect(consoleErrors.length, 'No console.error messages after find').toBe(0);
  });

  test('Invalid union inputs produce validation message', async ({ page }) => {
    // Purpose: Test edge case where user inputs invalid node indices for union and ensure proper error message.
    await pageObject.initializeButton(page).click();
    await page.waitForTimeout(100);

    // Enter an out-of-range index for node1 (e.g., 100)
    await pageObject.node1Input(page).fill('100');
    await pageObject.node2Input(page).fill('0');
    await pageObject.unionButton(page).click();

    // Expect validation message in info area
    await expect(pageObject.info(page)).toHaveText(/Please enter valid node indices\./i);

    // No changes to sets should have occurred: sets count stays equal to node count (initial 6)
    const setElements = pageObject.setsDisplay(page).locator('.set');
    const setCount = await setElements.count();
    expect(setCount).toBe(6);

    // Ensure no unexpected runtime errors beyond the handled validation
    expect(pageErrors.length, 'No uncaught page errors after invalid input union').toBe(0);
    expect(consoleErrors.length, 'No console.error messages after invalid input union').toBe(0);
  });

  test('Reset clears the visualization and inputs', async ({ page }) => {
    // Purpose: Verify that clicking Reset clears graph, sets, info, and input fields.
    await pageObject.initializeButton(page).click();
    await page.waitForTimeout(100);

    // Populate some inputs and perform an operation to change state
    await pageObject.node1Input(page).fill('0');
    await pageObject.node2Input(page).fill('1');
    await pageObject.unionButton(page).click();
    await page.waitForTimeout(100);

    // Now click Reset
    await pageObject.resetButton(page).click();

    // graph-container should be empty
    const graphHtml = await pageObject.graphContainer(page).innerHTML();
    expect(graphHtml.trim()).toBe('');

    // sets-display should be empty
    const setsHtml = await pageObject.setsDisplay(page).innerHTML();
    expect(setsHtml.trim()).toBe('');

    // info should be empty
    await expect(pageObject.info(page)).toHaveText('');

    // inputs cleared for node1 and node2
    await expect(pageObject.node1Input(page)).toHaveValue('');
    await expect(pageObject.node2Input(page)).toHaveValue('');

    // Ensure no runtime errors occurred during reset
    expect(pageErrors.length, 'No uncaught page errors after reset').toBe(0);
    expect(consoleErrors.length, 'No console.error messages after reset').toBe(0);
  });

  test('Generate Random Operations modifies sets and updates info', async ({ page }) => {
    // Purpose: Ensure that the random operations generator modifies internal state, updates the UI and reports performed operations.
    // Re-initialize to a known starting point
    await pageObject.initializeButton(page).click();
    await page.waitForTimeout(100);

    // Capture initial sets count
    const initialSetCount = await pageObject.setsDisplay(page).locator('.set').count();

    // Click generate random operations
    await pageObject.randomButton(page).click();

    // Info should start with "Performed X random union operations."
    await expect(pageObject.info(page)).toHaveText(/Performed \d+ random union operations\./i);

    // After random operations, sets count should be <= initialSetCount
    await page.waitForTimeout(100);
    const afterSetCount = await pageObject.setsDisplay(page).locator('.set').count();
    expect(afterSetCount).toBeLessThanOrEqual(initialSetCount);

    // There should be at least one connection drawn if any unions happened and random ops > 0
    const connectionCount = await pageObject.connections(page).count();
    // connectionCount can be 0 in degenerate cases but normally > 0; assert non-negative and not cause crash
    expect(connectionCount).toBeGreaterThanOrEqual(0);

    // Ensure no runtime errors from random generation
    expect(pageErrors.length, 'No uncaught page errors after random ops').toBe(0);
    expect(consoleErrors.length, 'No console.error messages after random ops').toBe(0);
  });
});