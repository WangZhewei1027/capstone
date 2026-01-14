import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7684571-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('Prim\'s Algorithm Visualization - FSM validation', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', msg => {
      // Record text and type for debugging/assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page (load it exactly as-is)
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // For debugging, if a test fails it's often useful to see console and errors.
    // But we avoid modifying the page or patching any functions per instructions.
    // Playwright closes pages automatically; nothing to teardown explicitly here.
  });

  test.describe('State S0_Idle (Initial state)', () => {
    test('drawGraph() should run on load and render nodes and edges', async ({ page }) => {
      // Validate that the graph container exists
      const graph = page.locator('#graph');
      await expect(graph).toBeVisible();

      // Expect the nodes to be rendered (nodePositions has 9 nodes)
      const nodes = graph.locator('.node');
      await expect(nodes).toHaveCount(9); // Ensure drawGraph created 9 node elements

      // The implementation appends SVG lines as 'line' elements with class 'edge' inside #graph.
      // Verify that some edges were drawn (should be > 0)
      const edges = graph.locator('line.edge');
      await expect(edges.count()).then(count => {
        expect(count).toBeGreaterThan(0);
      });

      // Ensure no uncaught page errors occurred during initial rendering
      expect(pageErrors.length).toBe(0);

      // Ensure there are no console errors/warnings (we allow logs, but no errors)
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Run button is present and has correct label', async ({ page }) => {
      const runButton = page.locator('button[onclick="runPrims()"]');
      await expect(runButton).toBeVisible();
      await expect(runButton).toHaveText("Run Prim's Algorithm");

      // Confirm initial output area exists and is empty
      const output = page.locator('#output');
      await expect(output).toBeVisible();
      await expect(output).toHaveText('', { timeout: 100 }); // initial output empty
    });
  });

  test.describe('State S1_Nodes_Selected (Selecting nodes)', () => {
    test('Clicking a node toggles .selected class (NodeClick event)', async ({ page }) => {
      // Target node A specifically by data attribute
      const nodeA = page.locator('.node[data-node="A"]');
      await expect(nodeA).toBeVisible();

      // Click to select
      await nodeA.click();

      // Verify it gained the selected class
      await expect(nodeA).toHaveClass(/selected/);

      // Verify selectedNodes derived from DOM includes 'A'
      const selectedNodes = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.node.selected')).map(n => n.dataset.node)
      );
      expect(selectedNodes).toContain('A');

      // Click again to toggle off and ensure class removed
      await nodeA.click();
      await expect(nodeA).not.toHaveClass(/selected/);

      // Ensure no uncaught errors after interactions
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Selecting multiple nodes updates selectedNodes array', async ({ page }) => {
      const nodeA = page.locator('.node[data-node="A"]');
      const nodeB = page.locator('.node[data-node="B"]');

      await nodeA.click();
      await nodeB.click();

      const selectedNodes = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.node.selected')).map(n => n.dataset.node).sort()
      );
      expect(selectedNodes).toEqual(['A', 'B']);

      // Clean up: deselect
      await nodeA.click();
      await nodeB.click();

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Transitions and final state S2_MST_Calculated (Running Prim\'s)', () => {
    test('Clicking Run without selection shows alert (edge case)', async ({ page }) => {
      // Ensure no nodes are selected
      const selectedBefore = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.node.selected')).map(n => n.dataset.node)
      );
      expect(selectedBefore.length).toBe(0);

      // Listen for dialog and capture message
      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      // Click run
      await page.click('button[onclick="runPrims()"]');

      // Wait briefly to ensure dialog handler executed
      await page.waitForTimeout(50);

      expect(dialogMessage).toBe("Please select at least one node to start Prim's Algorithm.");

      // Ensure still no uncaught page errors
      expect(pageErrors.length).toBe(0);
    });

    test('Running Prim\'s after selecting one node computes MST and displays output', async ({ page }) => {
      // Select node A as the starting point
      const nodeA = page.locator('.node[data-node="A"]');
      await nodeA.click();
      await expect(nodeA).toHaveClass(/selected/);

      // Click the run button
      await page.click('button[onclick="runPrims()"]');

      // The displayResult puts an <h2> header and several <p> lines
      const output = page.locator('#output');
      await expect(output.locator('h2')).toHaveText('Minimum Spanning Tree (MST)');

      // Wait for paragraphs to be rendered
      // MST for 9 nodes should produce 8 edges
      const paragraphs = output.locator('p');
      await expect(paragraphs).toHaveCount(8);

      // Validate that each paragraph matches the expected text pattern "X - Y (Weight: Z)"
      const texts = await paragraphs.allTextContents();
      texts.forEach(txt => {
        expect(txt).toMatch(/^[A-Z] - [A-Z] \(Weight: \d+\)$/);
      });

      // Ensure no page errors or console.error occurred during algorithm run
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Running Prim\'s after selecting multiple nodes computes MST with fewer edges', async ({ page }) => {
      // Select nodes A and B
      const nodeA = page.locator('.node[data-node="A"]');
      const nodeB = page.locator('.node[data-node="B"]');

      await nodeA.click();
      await nodeB.click();

      // Click run
      await page.click('button[onclick="runPrims()"]');

      // MST output should have header
      const output = page.locator('#output');
      await expect(output.locator('h2')).toHaveText('Minimum Spanning Tree (MST)');

      // When two nodes are initially visited, the MST edges appended should be totalNodes - visitedCount
      // nodePositions has 9 nodes, visitedCount = 2 => expected edges = 7
      const paragraphs = output.locator('p');
      await expect(paragraphs).toHaveCount(7);

      // Check that output paragraphs contain plausible edges
      const texts = await paragraphs.allTextContents();
      texts.forEach(txt => {
        expect(txt).toMatch(/^[A-Z] - [A-Z] \(Weight: \d+\)$/);
      });

      // Ensure no uncaught page errors
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Additional behaviors and robustness', () => {
    test('Toggling nodes rapidly does not produce runtime errors', async ({ page }) => {
      const nodeA = page.locator('.node[data-node="A"]');

      // Rapid toggling
      for (let i = 0; i < 5; i++) {
        await nodeA.click();
      }

      // Check that the element exists and we can read dataset
      const dataNode = await nodeA.getAttribute('data-node');
      expect(dataNode).toBe('A');

      // No page errors observed during rapid interaction
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('drawGraph() initial call evidence: nodes have position styles set', async ({ page }) => {
      // Check that at least one node has left/top style attributes (implying positions applied)
      const nodeWithStyle = await page.locator('.node').first();
      const left = await nodeWithStyle.evaluate(node => node.style.left);
      const top = await nodeWithStyle.evaluate(node => node.style.top);

      expect(left).toBeTruthy();
      expect(top).toBeTruthy();

      // No page errors
      expect(pageErrors.length).toBe(0);
    });
  });
});