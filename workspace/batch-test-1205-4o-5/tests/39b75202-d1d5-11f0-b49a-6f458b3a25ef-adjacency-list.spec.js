import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b75202-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page object encapsulating interactions with the adjacency list app
class AdjacencyPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.nodeInput = page.locator('#node');
    this.edgesInput = page.locator('#edges');
    this.addButton = page.locator('input[type="button"][value="Add Node and Edges"]');
    this.output = page.locator('#output');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the node and edges inputs (does not click add)
  async fillInputs(node, edges) {
    await this.nodeInput.fill(node);
    await this.edgesInput.fill(edges);
  }

  // Click the "Add Node and Edges" button
  async clickAdd() {
    await this.addButton.click();
  }

  // Convenience: fill inputs and click add
  async add(node, edges) {
    await this.fillInputs(node, edges);
    await this.clickAdd();
  }

  // Get raw text content of the output pre element
  async getRawOutput() {
    return await this.output.textContent();
  }

  // Parse the JSON content of the output pre into an object (or return null if empty)
  async getOutputObject() {
    const raw = (await this.getRawOutput()) || '';
    if (!raw.trim()) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      // If parsing fails, return null to let tests surface the issue
      return null;
    }
  }

  // Retrieve current values of inputs (useful to verify they are cleared)
  async getInputValues() {
    return {
      node: await this.nodeInput.inputValue(),
      edges: await this.edgesInput.inputValue(),
    };
  }
}

test.describe('Adjacency List App - End-to-end', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Attach listeners before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
  });

  // Test initial page load and default state
  test('Initial page load: inputs present, output empty, no runtime errors', async ({ page }) => {
    const app = new AdjacencyPage(page);
    // Navigate to the application
    await app.goto();

    // Verify interactive elements are visible
    await expect(app.nodeInput).toBeVisible();
    await expect(app.edgesInput).toBeVisible();
    await expect(app.addButton).toBeVisible();
    await expect(app.output).toBeVisible();

    // Inputs should be empty by default
    const inputs = await app.getInputValues();
    expect(inputs.node).toBe('');
    expect(inputs.edges).toBe('');

    // Output should be empty initially (no adjacency list)
    const rawOutput = await app.getRawOutput();
    expect(rawOutput === '' || rawOutput.trim() === '').toBeTruthy();

    // Ensure there are no console errors and no page errors on initial load
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test adding a single node with multiple edges and verifying the adjacency list
  test('Add node A with edges B,C and verify adjacency list and input clearing', async ({ page }) => {
    const app1 = new AdjacencyPage(page);
    await app.goto();

    // Add node A with edges "B,C"
    await app.add('A', 'B,C');

    // After adding, inputs should be cleared
    const inputsAfter = await app.getInputValues();
    expect(inputsAfter.node).toBe('');
    expect(inputsAfter.edges).toBe('');

    // The output should contain a JSON adjacency list with both directions
    const obj = await app.getOutputObject();
    expect(obj).not.toBeNull();

    // Expected structure:
    // {
    //   "A": ["B", "C"],
    //   "B": ["A"],
    //   "C": ["A"]
    // }
    expect(obj).toHaveProperty('A');
    expect(Array.isArray(obj['A'])).toBeTruthy();
    // A should include B and C (order not guaranteed)
    expect(obj['A'].sort()).toEqual(['B', 'C'].sort());

    // B and C should exist as nodes and have A as neighbor
    expect(obj).toHaveProperty('B');
    expect(obj['B']).toEqual(['A']);
    expect(obj).toHaveProperty('C');
    expect(obj['C']).toEqual(['A']);

    // No runtime console errors or page errors triggered by this interaction
    const errorConsoleMessages1 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test adding duplicate edges and ensure duplicates are not created
  test('Adding duplicate connections does not create duplicates in adjacency list', async ({ page }) => {
    const app2 = new AdjacencyPage(page);
    await app.goto();

    // First add A -> B,C
    await app.add('A', 'B,C');

    // Then add A -> C,D (C is duplicate)
    await app.add('A', 'C,D');

    const obj1 = await app.getOutputObject();
    expect(obj).not.toBeNull();

    // A should have B, C, D (C only once)
    expect(obj['A'].sort()).toEqual(['B', 'C', 'D'].sort());

    // C should have A as neighbor (only once)
    expect(Array.isArray(obj['C'])).toBeTruthy();
    expect(obj['C']).toEqual(['A']);

    // D should have A as neighbor
    expect(obj['D']).toEqual(['A']);

    // B should still have A
    expect(obj['B']).toEqual(['A']);

    // No runtime console errors or page errors
    const errorConsoleMessages2 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test adding multiple nodes and verifying transitive updates
  test('Add multiple nodes sequentially and verify full adjacency structure', async ({ page }) => {
    const app3 = new AdjacencyPage(page);
    await app.goto();

    // Add several nodes
    await app.add('X', 'Y,Z');
    await app.add('Y', 'W'); // Y connects to W (and W back to Y)
    await app.add('Z', 'W'); // Z connects to W (and W back to Z)

    const obj2 = await app.getOutputObject();
    expect(obj).not.toBeNull();

    // Check expected neighbors
    expect(obj['X'].sort()).toEqual(['Y', 'Z'].sort());
    expect(obj['Y'].includes('X')).toBeTruthy();
    expect(obj['Y'].includes('W')).toBeTruthy();
    expect(obj['Z'].includes('X')).toBeTruthy();
    expect(obj['Z'].includes('W')).toBeTruthy();

    // W should have Y and Z
    expect(obj['W'].sort()).toEqual(['Y', 'Z'].sort());

    // No runtime console errors or page errors
    const errorConsoleMessages3 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Edge case: clicking add with empty inputs should not modify adjacency list
  test('Clicking Add with empty inputs does not change adjacency list', async ({ page }) => {
    const app4 = new AdjacencyPage(page);
    await app.goto();

    // Ensure starting empty
    let before = await app.getOutputObject();
    expect(before).toBeNull();

    // Click the add button with empty inputs
    await app.clickAdd();

    // Output should remain empty / unchanged
    let after = await app.getOutputObject();
    expect(after).toBeNull();

    // No inputs should be present
    const inputs1 = await app.getInputValues();
    expect(inputs.node).toBe('');
    expect(inputs.edges).toBe('');

    // No runtime errors
    const errorConsoleMessages4 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Edge case: malformed edges (e.g., an empty connected node) - observe behavior (the app will add an empty string node)
  test('Malformed edges (empty connected node) produces an adjacency entry for empty string as per implementation', async ({ page }) => {
    const app5 = new AdjacencyPage(page);
    await app.goto();

    // Add node 'M' with edges that include an empty connected node (e.g., ',')
    // According to the implementation, connectedNodes will include an empty string and that will be added as a node key.
    await app.add('M', ',');

    const obj3 = await app.getOutputObject();
    expect(obj).not.toBeNull();

    // Implementation detail: connected node "" should be created and have connection back to 'M'
    // So obj should have a key '' (empty string)
    expect(Object.prototype.hasOwnProperty.call(obj, '')).toBeTruthy();
    // The adjacency for M should include empty string
    expect(obj['M']).toContain('');
    // The adjacency for '' should include 'M'
    expect(obj['']).toContain('M');

    // No runtime console errors or page errors triggered by this malformed input
    const errorConsoleMessages5 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Accessibility / Visibility assertions: ensure the output pre contains readable JSON text after operations
  test('Output pre contains JSON string and is visible after updates', async ({ page }) => {
    const app6 = new AdjacencyPage(page);
    await app.goto();

    // Add a node to populate output
    await app.add('P', 'Q');

    // The output should be visible and contain a JSON string that can be parsed
    await expect(app.output).toBeVisible();
    const raw1 = await app.getRawOutput();
    expect(typeof raw).toBe('string');
    expect(raw.trim().startsWith('{')).toBeTruthy();

    // Parse to object to ensure valid JSON representation
    const parsed = await app.getOutputObject();
    expect(parsed).not.toBeNull();
    expect(parsed['P']).toEqual(['Q']);

    // No runtime console errors or page errors
    const errorConsoleMessages6 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});