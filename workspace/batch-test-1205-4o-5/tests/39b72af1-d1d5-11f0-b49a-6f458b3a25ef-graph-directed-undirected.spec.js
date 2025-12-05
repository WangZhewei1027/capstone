import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b72af1-d1d5-11f0-b49a-6f458b3a25ef.html';

test.describe('Graph Visualization - Directed/Undirected (Application ID: 39b72af1-d1d5-11f0-b49a-6f458b3a25ef)', () => {
  // Reusable page object helpers
  const selectors = {
    graphContainer: '#graph-container',
    addNodeButton: '#addNode',
    addEdgeButton: '#addEdge',
    clearGraphButton: '#clearGraph',
    node: (id) => `#${id}`,
    nodeClass: '.node',
    edgeClass: '.edge',
  };

  // Navigate to the page before each test and ensure it's loaded
  test.beforeEach(async ({ page }) => {
    // Capture console messages for debugging (kept but not used assertively here)
    page.on('console', (msg) => {
      // This listener lets us observe console logs while tests run.
      // We intentionally do not suppress or modify them.
      // console messages can be inspected in test runner output if needed.
    });

    await page.goto(APP_URL);
    await expect(page).toHaveURL(APP_URL);
  });

  test('Initial page load shows correct controls and empty graph container', async ({ page }) => {
    // Purpose: Verify initial DOM structure and default state
    await expect(page.locator('h1')).toHaveText('Graph Visualization');
    await expect(page.locator(selectors.graphContainer)).toBeVisible();
    await expect(page.locator(selectors.addNodeButton)).toBeVisible();
    await expect(page.locator(selectors.addEdgeButton)).toBeVisible();
    await expect(page.locator(selectors.clearGraphButton)).toBeVisible();

    // Graph container should be empty on load (no nodes or edges)
    await expect(page.locator(selectors.nodeClass)).toHaveCount(0);
    await expect(page.locator(selectors.edgeClass)).toHaveCount(0);
  });

  test.describe('Node operations', () => {
    test('Clicking "Add Node" creates nodes with incremental labels and positions', async ({ page }) => {
      // Purpose: Validate that nodes are created with increasing labels and are placed inside the container
      const container = page.locator(selectors.graphContainer);

      // Add three nodes
      await page.click(selectors.addNodeButton);
      await page.click(selectors.addNodeButton);
      await page.click(selectors.addNodeButton);

      // Expect three DOM node elements
      const nodes = page.locator(selectors.nodeClass);
      await expect(nodes).toHaveCount(3);

      // Verify each node text content is "1", "2", "3" by id and innerText
      for (let i = 1; i <= 3; i++) {
        const id = `node${i}`;
        const node = page.locator(selectors.node(id));
        await expect(node).toBeVisible();
        await expect(node).toHaveText(String(i));

        // Verify the node's position lies inside the container bounds
        const boundingBox = await node.boundingBox();
        const containerBox = await container.boundingBox();
        expect(boundingBox).not.toBeNull();
        expect(containerBox).not.toBeNull();
        // Basic bounds checks: node should be within container rectangle
        if (boundingBox && containerBox) {
          expect(boundingBox.x).toBeGreaterThanOrEqual(containerBox.x - 1); // small tolerance
          expect(boundingBox.y).toBeGreaterThanOrEqual(containerBox.y - 1);
          expect(boundingBox.x + boundingBox.width).toBeLessThanOrEqual(containerBox.x + containerBox.width + 1);
          expect(boundingBox.y + boundingBox.height).toBeLessThanOrEqual(containerBox.y + containerBox.height + 1);
        }
      }
    });

    test('Selecting a node adds "selected" class and toggles properly', async ({ page }) => {
      // Purpose: Validate selection behavior and class toggling between nodes
      await page.click(selectors.addNodeButton);
      await page.click(selectors.addNodeButton);

      const node1 = page.locator(selectors.node('node1'));
      const node2 = page.locator(selectors.node('node2'));

      // Select node1
      await node1.click();
      // Verify it has 'selected' among its classes
      const classAttr1 = await node1.getAttribute('class');
      expect(classAttr1).toEqual(expect.stringContaining('selected'));

      // Select node2 and verify node1 loses selection and node2 gains it
      await node2.click();
      const classAttr1After = await node1.getAttribute('class');
      const classAttr2 = await node2.getAttribute('class');
      expect(classAttr1After).not.toEqual(expect.stringContaining('selected'));
      expect(classAttr2).toEqual(expect.stringContaining('selected'));
    });
  });

  test.describe('Edge operations and dialogs', () => {
    test('Clicking "Add Edge" without selecting a node triggers an alert', async ({ page }) => {
      // Purpose: Validate alert when trying to add an edge without selecting a source node
      // Ensure no selection present initially
      await expect(page.locator(selectors.nodeClass)).toHaveCount(0);

      // Listen for the alert dialog triggered by the addEdge button
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        page.click(selectors.addEdgeButton)
      ]);

      // The application calls alert('Please select a node first.');
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Please select a node first');
      await dialog.accept();

      // No edges should have been created
      await expect(page.locator(selectors.edgeClass)).toHaveCount(0);
    });

    test('Attempt to add edge with invalid target node id triggers prompt then invalid alert', async ({ page }) => {
      // Purpose: Validate prompt flow and invalid target handling
      // Create two nodes
      await page.click(selectors.addNodeButton);
      await page.click(selectors.addNodeButton);

      // Select the first node as source
      await page.click(selectors.node('node1'));

      // Click add edge; expect a prompt first. We'll respond with an invalid id.
      // Use sequential waits for the prompt and the following alert.
      const clickPromise = page.click(selectors.addEdgeButton);

      const promptDialog = await page.waitForEvent('dialog');
      expect(promptDialog.type()).toBe('prompt');
      expect(promptDialog.message()).toContain('Enter the id of target node');

      // Respond with an invalid node id
      await promptDialog.accept('node999');

      // After invalid input, an alert should show 'Invalid target node id.'
      const alertDialog = await page.waitForEvent('dialog');
      expect(alertDialog.type()).toBe('alert');
      expect(alertDialog.message()).toContain('Invalid target node id');
      await alertDialog.accept();

      // Ensure no edges were created
      await expect(page.locator(selectors.edgeClass)).toHaveCount(0);

      // Ensure the click promise has completed without throwing in the test harness
      await clickPromise;
    });

    test('Successfully adding an edge between two existing nodes creates a visible edge element', async ({ page }) => {
      // Purpose: Validate that adding a valid edge appends an .edge element with computed style
      // Create two nodes
      await page.click(selectors.addNodeButton); // node1
      await page.click(selectors.addNodeButton); // node2

      // Select source node (node1)
      await page.click(selectors.node('node1'));

      // Trigger add edge and handle prompt by providing 'node2'
      const clickPromise1 = page.click(selectors.addEdgeButton);

      const promptDialog1 = await page.waitForEvent('dialog');
      expect(promptDialog.type()).toBe('prompt');
      await promptDialog.accept('node2');

      // There should be no subsequent alert for valid target.
      // Wait a brief moment for the edge to be added to the DOM.
      await clickPromise;

      // Expect one edge element present
      const edges = page.locator(selectors.edgeClass);
      await expect(edges).toHaveCount(1);

      // Verify the edge has a computed width style (length > 0) and transform applied
      const edgeElement = edges.first();
      const widthStyle = await edgeElement.evaluate((el) => el.style.width);
      const transformStyle = await edgeElement.evaluate((el) => el.style.transform);
      expect(widthStyle).toBeTruthy();
      // width should be a px value like "123.45px"
      expect(widthStyle).toMatch(/px$/);
      expect(parseFloat(widthStyle)).toBeGreaterThan(0);
      expect(transformStyle).toMatch(/rotate\(/);
    });
  });

  test.describe('Clear graph and runtime error observation', () => {
    test('Clicking "Clear Graph" triggers a runtime error due to constant reassignment and does not clear DOM', async ({ page }) => {
      // Purpose:
      // The implementation has const nodes = {} and const edges = [] and clearGraph attempts to reassign them.
      // That should throw a runtime TypeError (Assignment to constant variable). We must observe and assert that error occurs.
      // Also because the reassignment throws before clearing DOM, the container should remain unchanged.

      // Prepare: Create two nodes and one edge so we can check that DOM remains after failed clear
      await page.click(selectors.addNodeButton); // node1
      await page.click(selectors.addNodeButton); // node2
      await page.click(selectors.node('node1'));
      // Add an edge from node1 to node2
      const clickEdge = page.click(selectors.addEdgeButton);
      const prompt = await page.waitForEvent('dialog');
      await prompt.accept('node2');
      await clickEdge;

      // Verify initial expectations before clear
      await expect(page.locator(selectors.nodeClass)).toHaveCount(2);
      await expect(page.locator(selectors.edgeClass)).toHaveCount(1);

      // Now click clearGraph and capture the pageerror event produced by the runtime TypeError
      const [pageError] = await Promise.all([
        page.waitForEvent('pageerror'),
        page.click(selectors.clearGraphButton)
      ]);

      // The error message text can vary slightly by engine, but it should indicate assignment to a constant.
      // Assert that the message contains 'Assignment' or 'constant' to be tolerant across environments.
      const errMsg = pageError.message || String(pageError);
      const lowered = errMsg.toLowerCase();
      const matches = lowered.includes('assignment to constant') || lowered.includes('cannot assign to') || lowered.includes('assignment to const') || lowered.includes('reassign') || lowered.includes('read-only');
      expect(matches).toBeTruthy();

      // Because the clearGraph threw early, the nodes and edges should still be present in the DOM
      await expect(page.locator(selectors.nodeClass)).toHaveCount(2);
      await expect(page.locator(selectors.edgeClass)).toHaveCount(1);
    });
  });
});