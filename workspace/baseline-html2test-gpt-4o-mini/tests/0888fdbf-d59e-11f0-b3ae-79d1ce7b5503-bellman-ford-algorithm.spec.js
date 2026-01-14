import { test, expect } from '@playwright/test';

// Test file for: Bellman-Ford Algorithm Visualization
// File name required: 0888fdbf-d59e-11f0-b3ae-79d1ce7b5503-bellman-ford-algorithm.spec.js
// The HTML under test is served at:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdbf-d59e-11f0-b3ae-79d1ce7b5503.html

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdbf-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page object for interacting with the Bellman-Ford app
class BellmanFordPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input');
    this.start = page.locator('#start');
    this.runButton = page.locator('button', { hasText: 'Run Bellman-Ford Algorithm' });
    this.output = page.locator('#output');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the edges textarea with the provided text
  async fillEdges(text) {
    await this.input.fill(text);
  }

  // Set the starting vertex input
  async setStart(vertex) {
    await this.start.fill(vertex);
  }

  // Click the run button
  async run() {
    await this.runButton.click();
  }

  // Get output HTML/text
  async getOutputHTML() {
    return await this.output.evaluate((el) => el.innerHTML);
  }

  async getOutputText() {
    return await this.output.textContent();
  }

  // Helper to clear inputs
  async clearAll() {
    await this.input.fill('');
    await this.start.fill('');
  }
}

test.describe('Bellman-Ford Algorithm Visualization - UI and behavior', () => {
  // Capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages and page errors so tests can assert on them
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Initial load: should render inputs, button and empty output', async ({ page }) => {
    const bellman = new BellmanFordPage(page);
    await bellman.goto();

    // Verify interactive controls are visible
    await expect(bellman.input).toBeVisible();
    await expect(bellman.start).toBeVisible();
    await expect(bellman.runButton).toBeVisible();
    await expect(bellman.output).toBeVisible();

    // Verify default values are empty
    await expect(bellman.input).toHaveValue('');
    await expect(bellman.start).toHaveValue('');
    const outText = await bellman.getOutputText();
    // On initial load the output container should be empty
    expect(outText ? outText.trim() : '').toBe('');

    // Ensure no unexpected console errors or page errors occurred during load
    expect(consoleMessages.filter(m => m.type === 'error').length, 'no console.error on load').toBe(0);
    expect(pageErrors.length, 'no page errors on load').toBe(0);
  });

  // Test algorithm with a simple graph (no negative cycles)
  test('Run algorithm: computes shortest paths for a simple graph', async ({ page }) => {
    const bellman1 = new BellmanFordPage(page);
    await bellman.goto();

    // Prepare a simple graph:
    // A -> B (4)
    // B -> C (3)
    // A -> C (10)
    // Expected shortest paths from A:
    // A: 0
    // B: 4
    // C: 7  (A->B->C)
    const edges = [
      'A B 4',
      'B C 3',
      'A C 10'
    ].join('\n');

    // Fill inputs and run
    await bellman.fillEdges(edges);
    await bellman.setStart('A');
    await bellman.run();

    // Verify output contains expected distances and in the expected order (A, B, C)
    const outHtml = await bellman.getOutputHTML();
    // The implementation writes lines like: Distance from A to A is 0<br>
    expect(outHtml).toContain('Distance from A to A is 0');
    expect(outHtml).toContain('Distance from A to B is 4');
    expect(outHtml).toContain('Distance from A to C is 7');

    // Output should include exactly three distance lines for A,B,C
    const lines = (outHtml.match(/Distance from A to/g) || []).length;
    expect(lines).toBeGreaterThanOrEqual(3);

    // Ensure no console errors or page errors occurred during interaction
    expect(consoleMessages.filter(m => m.type === 'error').length, 'no console.error during run').toBe(0);
    expect(pageErrors.length, 'no page errors during run').toBe(0);
  });

  // Test negative weight cycle detection
  test('Detect negative-weight cycle and show appropriate message', async ({ page }) => {
    const bellman2 = new BellmanFordPage(page);
    await bellman.goto();

    // Create a graph with a negative cycle:
    // A -> B 1
    // B -> C -2
    // C -> A -2  => cycle sum = -3 (negative)
    const edges1 = [
      'A B 1',
      'B C -2',
      'C A -2'
    ].join('\n');

    await bellman.fillEdges(edges);
    await bellman.setStart('A');
    await bellman.run();

    // The app should detect the negative cycle and display the corresponding message
    const outText1 = await bellman.getOutputText();
    expect(outText).toContain('Graph contains a negative-weight cycle.');

    // Ensure no uncaught page errors were thrown (errors would be captured in pageErrors)
    expect(consoleMessages.filter(m => m.type === 'error').length, 'no console.error while detecting negative cycle').toBe(0);
    expect(pageErrors.length, 'no page errors while detecting negative cycle').toBe(0);
  });

  // Test behavior when start vertex is not part of the parsed vertices
  test('Start vertex not in graph: start is added and distances remain Infinity for others', async ({ page }) => {
    const bellman3 = new BellmanFordPage(page);
    await bellman.goto();

    // Graph contains A -> B only, but start vertex will be 'Z' which is not in the vertices set
    const edges2 = [
      'A B 5'
    ].join('\n');

    await bellman.fillEdges(edges);
    await bellman.setStart('Z'); // Z is not in the parsed vertices
    await bellman.run();

    const outHtml1 = await bellman.getOutputHTML();
    // The code will add distances['Z'] = 0 even if Z did not exist initially.
    // Expect output to include:
    // Distance from Z to A is Infinity
    // Distance from Z to B is Infinity
    // Distance from Z to Z is 0
    expect(outHtml).toContain('Distance from Z to A is Infinity');
    expect(outHtml).toContain('Distance from Z to B is Infinity');
    expect(outHtml).toContain('Distance from Z to Z is 0');

    // No console/page errors expected
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test handling of malformed input lines (lines not having exactly three parts are ignored)
  test('Malformed input lines are ignored; only valid edges are parsed', async ({ page }) => {
    const bellman4 = new BellmanFordPage(page);
    await bellman.goto();

    // Provide malformed lines and one valid line
    const edges3 = [
      'This is malformed',
      'A B',        // missing weight - malformed
      'C D 2.5',    // valid
      'E F notanumber' // parts length 3 but weight will parse as NaN (should be accepted as edge with NaN weight)
    ].join('\n');

    await bellman.fillEdges(edges);
    await bellman.setStart('C');
    await bellman.run();

    const outHtml2 = await bellman.getOutputHTML();

    // Expect that C and D are present and distance from C to C is 0
    expect(outHtml).toContain('Distance from C to C is 0');
    // Distance from C to D should be 2.5 (C->D edge exists)
    expect(outHtml).toContain('Distance from C to D is 2.5');

    // The malformed 'A B' line (2 parts) is ignored; 'This is malformed' also ignored.
    // The 'E F notanumber' will create an edge with weight NaN which will not relax distances
    // so distances to E and F (if present) will remain Infinity (unless start is one of them)
    // Ensure no page errors
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test that output element visibility and content update after running algorithm multiple times
  test('Running algorithm multiple times updates output accordingly', async ({ page }) => {
    const bellman5 = new BellmanFordPage(page);
    await bellman.goto();

    // First run: simple A->B
    await bellman.fillEdges('A B 2');
    await bellman.setStart('A');
    await bellman.run();

    let out1 = await bellman.getOutputText();
    expect(out1).toContain('Distance from A to A is 0');
    expect(out1).toContain('Distance from A to B is 2');

    // Second run: different graph
    await bellman.fillEdges(['X Y 7', 'Y Z 3'].join('\n'));
    await bellman.setStart('X');
    await bellman.run();

    let out2 = await bellman.getOutputText();
    expect(out2).toContain('Distance from X to X is 0');
    expect(out2).toContain('Distance from X to Y is 7');
    expect(out2).toContain('Distance from X to Z is 10');

    // Confirm output changed between runs
    expect(out1).not.toBe(out2);

    // No console errors or page errors
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});