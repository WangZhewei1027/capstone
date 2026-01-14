import { test, expect } from '@playwright/test';

// Test file for Application ID: 11b79421-d5a1-11f0-9c7a-cdf1d7a06e11
// Filename requirement: 11b79421-d5a1-11f0-9c7a-cdf1d7a06e11-adjacency-list.spec.js
// This suite exercises the Adjancency List HTML app as served at the specified URL.
// Important: We load the page as-is and observe console output and page errors without modifying the app.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b79421-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Simple page object for the adjacency list app to centralize selectors and common actions.
class AdjacencyListPage {
  constructor(page) {
    this.page = page;
    this.nameInput = page.locator('#name');
    this.addNodeBtn = page.locator('#add-node-btn');
    this.removeNodeBtn = page.locator('#remove-node-btn');
    this.addEdgeBtn = page.locator('#add-edge-btn');
    this.removeEdgeBtn = page.locator('#remove-edge-btn');
    this.printEdgeBtn = page.locator('#print-edge-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.table = page.locator('#adjacency-list');
  }

  // Type a name into the input
  async enterName(name) {
    await this.nameInput.fill(name);
  }

  // Click actions - we return the ConsoleMessage event promises for precise observation
  async clickAddNode() {
    return this.page.waitForEvent('console').then(() => this.addNodeBtn.click()).catch(async () => {
      // fallback - click then wait for console
      await this.addNodeBtn.click();
      return this.page.waitForEvent('console');
    });
  }

  // Instead of the above helper which had complexity, use a simple click and wait pattern in tests
}

test.describe('Adjacency List - UI and behavior', () => {
  // Collect page-level errors and console messages for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages to inspect logs emitted by the app
    page.on('console', msg => {
      // store both type and text for easier assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Ensure no uncaught page errors occurred during tests
    // We assert zero page errors so that unexpected runtime exceptions are flagged.
    expect(pageErrors.length, 'No uncaught page errors should have occurred').toBe(0);
  });

  test('Initial load: UI elements are present and default state is empty', async ({ page }) => {
    // Purpose: Verify initial page structure and default state
    const app = new AdjacencyListPage(page);

    // Check page title and heading are present
    await expect(page).toHaveTitle(/Adjacency List/);
    await expect(page.locator('h1')).toHaveText('Adjacency List');

    // Input and buttons visibility
    await expect(app.nameInput).toBeVisible();
    await expect(app.addNodeBtn).toBeVisible();
    await expect(app.removeNodeBtn).toBeVisible();
    await expect(app.addEdgeBtn).toBeVisible();
    await expect(app.removeEdgeBtn).toBeVisible();
    await expect(app.printEdgeBtn).toBeVisible();
    await expect(app.clearBtn).toBeVisible();

    // Input should be empty by default
    await expect(app.nameInput).toHaveValue('');

    // The adjacency-list table is present but initially empty (no rendered rows)
    const tableHtml = await app.table.innerHTML();
    expect(tableHtml.trim(), 'Adjacency table should be empty on load').toBe('');
  });

  test.describe('Node operations (add/remove) with observed console output', () => {
    test('Add node button uses the event object (not the input value) and logs the addition', async ({ page }) => {
      // Purpose: Ensure clicking Add Node produces a console log and that the implementation uses the event object
      const app1 = new AdjacencyListPage(page);

      // Fill the name input with a value that the implementation is expected to ignore
      await app.enterName('A');

      // The page's implementation attaches the handler directly (addNode) without reading the input value.
      // When clicking the button, the function will receive a MouseEvent object as the `name` parameter.
      // Wait for the console message emitted by clicking the button.
      const [consoleMsg] = await Promise.all([
        page.waitForEvent('console'),
        app.addNodeBtn.click()
      ]);

      // Confirm the console message indicates a node was "added" and includes the MouseEvent string conversion.
      const msgText = consoleMsg.text();
      expect(msgText).toContain('Node');
      expect(msgText).toMatch(/Node .*added\./);

      // Inspect the app's global `nodes` object in the page: the key will be the stringified MouseEvent, not "A".
      const nodes = await page.evaluate(() => {
        // Return the keys of the nodes object to inspect what was actually added
        return Object.keys(window.nodes || {});
      });

      // We expect that the input value "A" was NOT used as the key
      expect(nodes).not.toContain('A');

      // The added key should be something like "[object MouseEvent]"
      const hasMouseEventKey = nodes.some(k => k.includes('MouseEvent') || k === '[object MouseEvent]');
      expect(hasMouseEventKey, 'A node keyed by the MouseEvent object should exist').toBe(true);

      // The adjacency table remains unchanged because the script does not update the DOM table
      const tableContent = await app.table.innerHTML();
      expect(tableContent.trim(), 'Table should remain empty as DOM is not updated by the app').toBe('');
    });

    test('Remove node button removes the event-keyed node and logs removal', async ({ page }) => {
      // Purpose: Add a node via the buggy handler and then remove it, observing console logs and internal state changes.
      const app2 = new AdjacencyListPage(page);

      // Add the node first (click)
      const addConsole = await Promise.all([
        page.waitForEvent('console'),
        app.addNodeBtn.click()
      ]);
      expect(addConsole[0].text()).toMatch(/Node .*added\./);

      // Check nodes contain a MouseEvent-based key prior to removal
      let nodesBefore = await page.evaluate(() => Object.keys(window.nodes || {}));
      const hasMouseEventKeyBefore = nodesBefore.some(k => k.includes('MouseEvent') || k === '[object MouseEvent]');
      expect(hasMouseEventKeyBefore).toBe(true);

      // Now click remove node and capture the console message
      const [remConsoleMsg] = await Promise.all([
        page.waitForEvent('console'),
        app.removeNodeBtn.click()
      ]);
      expect(remConsoleMsg.text()).toMatch(/Node .*removed\./);

      // After removal, the event-keyed node should be gone
      const nodesAfter = await page.evaluate(() => Object.keys(window.nodes || {}));
      const hasMouseEventKeyAfter = nodesAfter.some(k => k.includes('MouseEvent') || k === '[object MouseEvent]');
      expect(hasMouseEventKeyAfter, 'Event-keyed node should be removed').toBe(false);
    });

    test('Removing a non-existent node logs "not found"', async ({ page }) => {
      // Purpose: Validate the "not found" path is taken when trying to remove a node that doesn't exist.
      const app3 = new AdjacencyListPage(page);

      // Ensure nodes is empty (clear via the clear button handler)
      // Use the clear button which resets nodes and edges to empty objects and prints edges
      await Promise.all([
        page.waitForEvent('console'), // this will capture the "Edges:" log
        app.clearBtn.click()
      ]);

      // Now click remove node when there is nothing to remove. Capture the console message.
      const [consoleMsg] = await Promise.all([
        page.waitForEvent('console'),
        app.removeNodeBtn.click()
      ]);

      const text = consoleMsg.text();
      // The implementation logs "Node ${name} not found."
      // When called by a click handler, name is the MouseEvent object so we expect a message that includes "not found."
      expect(text).toMatch(/not found\./);
      // Confirm nodes are still empty
      const nodes1 = await page.evaluate(() => Object.keys(window.nodes1 || {}));
      expect(nodes.length).toBe(0);
    });
  });

  test.describe('Edge operations and printing', () => {
    test('Add edge logs a "not found" message because parameters are not provided by UI', async ({ page }) => {
      // Purpose: Validate clicking Add Edge without parameters logs the expected "Either ... not found" message.
      const app4 = new AdjacencyListPage(page);

      // Click the Add Edge button and capture its console output.
      const [consoleMsg] = await Promise.all([
        page.waitForEvent('console'),
        app.addEdgeBtn.click()
      ]);

      const text1 = consoleMsg.text1();
      // Implementation: console.log(`Either ${from} or ${to} not found.`);
      // Because the handler receives the MouseEvent for `from` and undefined for `to`, we expect 'undefined' in the message.
      expect(text).toContain('Either');
      expect(text).toMatch(/not found\./);
      expect(text).toMatch(/undefined/);
    });

    test('Remove edge logs a "not found" message when called without parameters', async ({ page }) => {
      // Purpose: Validate clicking Remove Edge without parameters emits the appropriate log.
      const app5 = new AdjacencyListPage(page);

      const [consoleMsg] = await Promise.all([
        page.waitForEvent('console'),
        app.removeEdgeBtn.click()
      ]);

      const text2 = consoleMsg.text2();
      expect(text).toContain('Either');
      expect(text).toMatch(/not found\./);
    });

    test('Print edges shows "Edges:" in console and clear resets internal state', async ({ page }) => {
      // Purpose: Test that Print Edges emits the "Edges:" header and that Clear resets nodes/edges then prints edges again.

      const app6 = new AdjacencyListPage(page);

      // Add a node so there is something to print (even though keys may be event objects)
      await Promise.all([
        page.waitForEvent('console'),
        app.addNodeBtn.click()
      ]);

      // Call print edges and capture first console event which should be "Edges:"
      const [firstPrint] = await Promise.all([
        page.waitForEvent('console'),
        app.printEdgeBtn.click()
      ]);
      expect(firstPrint.text()).toBe('Edges:');

      // Now call clear which resets nodes and edges and then calls printEdges() internally.
      // The clear button handler logs "Edges:" via printEdges after resetting, so capture that.
      const [clearPrint] = await Promise.all([
        page.waitForEvent('console'),
        app.clearBtn.click()
      ]);
      expect(clearPrint.text()).toBe('Edges:');

      // After clear, the internal nodes and edges objects should be empty objects.
      const state = await page.evaluate(() => ({ nodes: window.nodes, edges: window.edges }));
      expect(state.nodes).toEqual({});
      expect(state.edges).toEqual({});
    });
  });

  test('DOM table remains unchanged by operations (app only logs to console and updates globals)', async ({ page }) => {
    // Purpose: Confirm the application does not update the #adjacency-list table DOM in response to operations.
    const app7 = new AdjacencyListPage(page);

    // Perform various actions
    await Promise.all([page.waitForEvent('console'), app.addNodeBtn.click()]);
    await Promise.all([page.waitForEvent('console'), app.addEdgeBtn.click()]);
    await Promise.all([page.waitForEvent('console'), app.printEdgeBtn.click()]);
    await Promise.all([page.waitForEvent('console'), app.clearBtn.click()]);

    // The table should still have no content inserted by the script
    const tableHtml1 = await app.table.innerHTML();
    expect(tableHtml.trim()).toBe('');
  });
});