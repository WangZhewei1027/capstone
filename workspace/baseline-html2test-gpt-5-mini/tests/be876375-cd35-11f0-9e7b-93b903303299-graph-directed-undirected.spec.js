import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be876375-cd35-11f0-9e7b-93b903303299.html';

test.describe('Interactive Graph (Directed / Undirected) - be876375-cd35-11f0-9e7b-93b903303299', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages and page errors
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      // pageerror captures uncaught exceptions like ReferenceError/TypeError
      pageErrors.push(err);
    });

    // Navigate to the application
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Wait for canvas and top UI to be ready
    await expect(page.locator('#canvas')).toBeVisible();
    await expect(page.locator('#status')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // keep a screenshot on failure for debugging (Playwright will attach on failure)
    // Ensure there were no fatal page errors unless test expects them
  });

  test.describe('Initial load and default state', () => {
    test('should load page, show default mode and seeded graph counts', async ({ page }) => {
      // Verify default mode status and active button
      const status = await page.locator('#status').innerText();
      expect(status).toContain('Mode: Add Node');

      const addNodeBtn = page.locator('#mode-add-node');
      await expect(addNodeBtn).toHaveClass(/active/);

      // Seed example created 5 nodes and 5 edges in the implementation
      const nodeCount = await page.locator('#node-count').innerText();
      const edgeCount = await page.locator('#edge-count').innerText();
      expect(nodeCount).toBe('5');
      expect(edgeCount).toBe('5');

      // The adjacency list and matrix should reflect presence of nodes (not the "No nodes" placeholders)
      await expect(page.locator('#adj-list')).not.toHaveText(/No nodes/);
      await expect(page.locator('#adj-matrix')).not.toHaveText(/No nodes/);

      // Verify there are no uncaught page errors on initial load (common fatal errors)
      expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);

      // Ensure console does not contain severe errors (console.error)
      const errorConsoles = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoles.length, `Console errors: ${JSON.stringify(errorConsoles)}`).toBe(0);
    });
  });

  test.describe('Mode controls and adding content', () => {
    test('switching modes updates active class and status text', async ({ page }) => {
      // Click move mode and assert UI updates
      await page.locator('#mode-move').click();
      await expect(page.locator('#mode-move')).toHaveClass(/active/);
      await expect(page.locator('#status')).toHaveText(/Mode: Move/);

      // Click add-edge mode and assert UI updates
      await page.locator('#mode-add-edge').click();
      await expect(page.locator('#mode-add-edge')).toHaveClass(/active/);
      await expect(page.locator('#status')).toHaveText(/Mode: Add Edge/);

      // Return to add-node
      await page.locator('#mode-add-node').click();
      await expect(page.locator('#mode-add-node')).toHaveClass(/active/);
      await expect(page.locator('#status')).toHaveText(/Mode: Add Node/);
    });

    test('adding a node by clicking canvas increments node count and updates select', async ({ page }) => {
      // Get initial counts
      const beforeNodes = parseInt(await page.locator('#node-count').innerText(), 10);
      // Click somewhere on the canvas to add a new node
      const canvas = page.locator('#canvas');
      // Use coordinates inside the canvas. Position is relative to the element.
      await canvas.click({ position: { x: 100, y: 100 } });

      // New node count should increment by 1
      await expect(page.locator('#node-count')).toHaveText(String(beforeNodes + 1));

      // The node select should have one default + number of nodes options
      const selectOptions = await page.locator('#node-select option').count();
      expect(selectOptions).toBe(beforeNodes + 1 + 1); // +1 new node, +1 default placeholder

      // The adjacency list should now contain the new node label (the implementation uses incremental numeric labels)
      const newId = String(beforeNodes + 1); // seed was 5 so next is 6, etc.
      const adjListText = await page.locator('#adj-list').innerText();
      expect(adjListText).toContain(newId);
    });
  });

  test.describe('Edges, directionality, adjacency views', () => {
    test('create a self-loop by selecting same node in add-edge mode increases edge count', async ({ page }) => {
      // Add a node at known position so we can target it reliably
      const canvas1 = page.locator('#canvas1');
      // Add new node at (120,120)
      await page.locator('#mode-add-node').click();
      await canvas.click({ position: { x: 120, y: 120 } });

      // Capture node count and edge count before creating loop
      const beforeNodes1 = parseInt(await page.locator('#node-count').innerText(), 10);
      const beforeEdges = parseInt(await page.locator('#edge-count').innerText(), 10);

      // Switch to add-edge mode and click the same spot twice to create a self-loop
      await page.locator('#mode-add-edge').click();
      await canvas.click({ position: { x: 120, y: 120 } }); // select source
      await canvas.click({ position: { x: 120, y: 120 } }); // click same node -> self-loop

      // Edge count should have increased by at least 1
      await expect(page.locator('#edge-count')).toHaveText(String(beforeEdges + 1));

      // The adjacency list should contain the node id we just added; it's a self-loop so its own id should appear as neighbor
      const newId1 = String(beforeNodes); // the newly added node id equals beforeNodes (1-based indexing used by app)
      const adjListText1 = await page.locator('#adj-list').innerText();
      expect(adjListText).toContain(newId);
    });

    test('toggling global directed and adding a directed edge reflected in adjacency matrix', async ({ page }) => {
      const canvas2 = page.locator('#canvas2');

      // Add two new nodes at distinct positions to connect them
      await page.locator('#mode-add-node').click();
      await canvas.click({ position: { x: 160, y: 160 } }); // node A
      await canvas.click({ position: { x: 260, y: 160 } }); // node B

      // Enable directed graph checkbox
      const directedCheckbox = page.locator('#global-directed');
      await directedCheckbox.check();
      await expect(directedCheckbox).toBeChecked();

      // Switch to add-edge and create a directed edge from A -> B
      await page.locator('#mode-add-edge').click();
      await canvas.click({ position: { x: 160, y: 160 } }); // select A
      await canvas.click({ position: { x: 260, y: 160 } }); // select B -> creates directed edge

      // The adjacency matrix should now contain an indicator for a directed edge "1(→)" somewhere
      const adjMatrixText = await page.locator('#adj-matrix').innerText();
      expect(adjMatrixText).toMatch(/1\(→\)/);

      // Clean up: uncheck directed (not required, but keeps state consistent for other tests)
      await directedCheckbox.uncheck();
      await expect(directedCheckbox).not.toBeChecked();
    });
  });

  test.describe('Traversal controls and dialogs', () => {
    test('clicking BFS or DFS without selecting a node triggers a dialog alert', async ({ page }) => {
      // Ensure no node is selected in dropdown (default)
      await page.selectOption('#node-select', '');

      // Listen for dialog event produced by alert in code and verify its message
      page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('Pick a start node first.');
        await dialog.accept();
      });

      // Click BFS button to trigger the alert
      await page.locator('#bfs-btn').click();

      // Repeat for DFS
      page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('Pick a start node first.');
        await dialog.accept();
      });
      await page.locator('#dfs-btn').click();
    });

    test('stop traversal button can be clicked safely', async ({ page }) => {
      // For safety, select an actual node from the select if available
      const optionsCount = await page.locator('#node-select option').count();
      if (optionsCount > 1) {
        // pick the first actual node
        const firstNodeValue = await page.locator('#node-select option').nth(1).getAttribute('value');
        await page.selectOption('#node-select', firstNodeValue);

        // Start BFS; this starts an animation interval in the page
        await page.locator('#bfs-btn').click();

        // Wait a bit to let animation (setInterval) start
        await page.waitForTimeout(200);

        // Click Stop traversal; this calls stopTraversal which should clear interval
        await page.locator('#stop-traversal').click();

        // Wait briefly and ensure no page errors occurred during traversal
        expect(pageErrors.length, `Traversal caused errors: ${pageErrors.map(e=>e.message).join('; ')}`).toBe(0);
      } else {
        test.skip('No nodes available to run traversal test');
      }
    });
  });

  test.describe('Clear and Delete behaviors with confirmation dialogs', () => {
    test('clear button confirm can be cancelled and then accepted to remove all nodes and edges', async ({ page }) => {
      // Record counts before attempting clear
      const beforeNodes2 = parseInt(await page.locator('#node-count').innerText(), 10);
      const beforeEdges1 = parseInt(await page.locator('#edge-count').innerText(), 10);
      expect(beforeNodes).toBeGreaterThan(0);

      // First, click Clear and dismiss the confirm -> should cancel the clear
      const clearBtn = page.locator('#clear');
      page.once('dialog', async dialog => {
        // The dialog is a confirm() in the app; dismiss to cancel clear
        expect(dialog.message()).toContain('Clear all nodes and edges?');
        await dialog.dismiss();
      });
      await clearBtn.click();

      // Counts should remain unchanged
      await expect(page.locator('#node-count')).toHaveText(String(beforeNodes));
      await expect(page.locator('#edge-count')).toHaveText(String(beforeEdges));

      // Now accept the confirmation to clear everything
      page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('Clear all nodes and edges?');
        await dialog.accept();
      });
      await clearBtn.click();

      // After acceptance, nodes and edges should be zero and adjacency displays show "No nodes"
      await expect(page.locator('#node-count')).toHaveText('0');
      await expect(page.locator('#edge-count')).toHaveText('0');
      await expect(page.locator('#adj-list')).toHaveText(/No nodes/);
      await expect(page.locator('#adj-matrix')).toHaveText(/No nodes/);
    });

    test('delete mode removes nodes or edges when clicked', async ({ page }) => {
      // Re-seed by adding a couple of nodes and one edge between them for deletion test
      const canvas3 = page.locator('#canvas3');
      await page.locator('#mode-add-node').click();
      await canvas.click({ position: { x: 120, y: 120 } }); // node A
      await canvas.click({ position: { x: 220, y: 120 } }); // node B

      // Create an edge between them
      await page.locator('#mode-add-edge').click();
      await canvas.click({ position: { x: 120, y: 120 } }); // select A
      await canvas.click({ position: { x: 220, y: 120 } }); // select B

      // Confirm there's at least one edge
      const edgesBefore = parseInt(await page.locator('#edge-count').innerText(), 10);
      expect(edgesBefore).toBeGreaterThanOrEqual(1);

      // Switch to delete mode and click near the edge midpoint to delete the edge
      await page.locator('#mode-delete').click();

      // Click approximately midway between the two nodes -> should hit the edge and delete it
      await canvas.click({ position: { x: 170, y: 120 } });

      // Edge count should have decreased (or remain but not increase)
      const edgesAfter = parseInt(await page.locator('#edge-count').innerText(), 10);
      expect(edgesAfter).toBeLessThanOrEqual(edgesBefore);

      // Now try deleting a node by clicking its position
      const nodesBefore = parseInt(await page.locator('#node-count').innerText(), 10);
      await canvas.click({ position: { x: 120, y: 120 } }); // delete node A
      const nodesAfter = parseInt(await page.locator('#node-count').innerText(), 10);
      expect(nodesAfter).toBeLessThan(nodesBefore);
    });
  });

  test.describe('Console and page error observations', () => {
    test('should not emit ReferenceError/SyntaxError/TypeError during normal interactions', async ({ page }) => {
      // Perform a few safe interactions
      await page.locator('#mode-add-node').click();
      await page.locator('#canvas').click({ position: { x: 80, y: 80 } });
      await page.locator('#mode-add-edge').click();
      await page.locator('#canvas').click({ position: { x: 80, y: 80 } });
      await page.locator('#mode-delete').click();
      await page.locator('#canvas').click({ position: { x: 80, y: 80 } });

      // Wait a little to allow any async errors to surface
      await page.waitForTimeout(200);

      // Collect any page errors that are instances of common JS error types
      const typesSeen = pageErrors.map(e => e.name);
      // Expect no fatal uncaught errors like ReferenceError/TypeError/SyntaxError
      const problematic = typesSeen.filter(t => ['ReferenceError', 'TypeError', 'SyntaxError'].includes(t));
      expect(problematic.length, `Unexpected JS errors: ${JSON.stringify(typesSeen)}`).toBe(0);

      // Also ensure console.error was not emitted
      const consoleErrorEntries = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrorEntries.length, `Console errors found: ${JSON.stringify(consoleErrorEntries)}`).toBe(0);
    });
  });
});