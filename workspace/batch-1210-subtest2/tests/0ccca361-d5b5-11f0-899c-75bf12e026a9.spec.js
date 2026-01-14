import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccca361-d5b5-11f0-899c-75bf12e026a9.html';

/**
 * Page object for interacting with the Bellman-Ford visualization page.
 * Encapsulates selectors and common actions to keep tests readable.
 */
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.edges = page.locator('#edges');
    this.source = page.locator('#source');
    this.runBtn = page.locator('#runBtn');
    this.output = page.locator('#output');
    this.steps = page.locator('#steps');
    this.svg = page.locator('#svgGraph');
  }

  async goto(url) {
    await this.page.goto(url);
  }

  async fillEdges(text) {
    await this.edges.fill(text);
  }

  async setSource(value) {
    // Use fill so we can input non-numeric strings to trigger validation in some tests
    await this.source.fill(String(value));
  }

  async clickRun() {
    await this.runBtn.click();
  }

  async getOutputText() {
    return (await this.output.textContent()) || '';
  }

  async getStepsText() {
    return (await this.steps.textContent()) || '';
  }

  async svgNodeCount() {
    return await this.svg.locator('g.node').count();
  }

  async svgEdgeCount() {
    // Edges are drawn as <path> elements (and have class 'edge')
    return await this.svg.locator('path').count();
  }

  // Find a node group by its aria-label "Node X"
  async nodeGroupById(nodeId) {
    return this.svg.locator(`g.node[aria-label="Node ${nodeId}"]`);
  }

  // Get circle fill attribute for a node group
  async nodeCircleFill(nodeId) {
    const g = this.nodeGroupById(nodeId);
    const circle = g.locator('circle');
    return circle.getAttribute('fill');
  }
}

test.describe('Bellman-Ford Algorithm Visualization - FSM States and Transitions', () => {
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Collect console errors and page errors so tests can assert none occurred unexpectedly
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    // NOTE: The URL contains a space as provided in the specification; it will be encoded by the browser.
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Basic sanity: no uncaught page errors or console error messages during the test run
    // Individual tests may assert more specific expectations; here we ensure runtime didn't fail silently.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);
  });

  test('Initial state (S0_Idle) - page renders with instructions and initial output text', async ({ page }) => {
    // Validate initial render: output contains the idle hint from FSM evidence and steps show placeholder
    const gp = new GraphPage(page);

    // Check initial output text
    const outputText = await gp.getOutputText();
    expect(outputText).toContain('Enter graph edges and source, then click "Run Bellman-Ford".');

    // Check initial steps text
    const stepsText = await gp.getStepsText();
    expect(stepsText).toContain('Steps will appear here after running the algorithm.');

    // Ensure the SVG exists and is empty (no nodes/edges yet)
    expect(await gp.svgNodeCount()).toBe(0);
    expect(await gp.svgEdgeCount()).toBe(0);
  });

  test('Transition S0 -> S1: clicking Run with empty edges shows validation "Please enter edges."', async ({ page }) => {
    // This test verifies input validation when no edges are provided.
    const gp = new GraphPage(page);

    // Ensure edges textarea is empty
    await gp.fillEdges('');
    await gp.setSource('0'); // default source
    await gp.clickRun();

    // After clicking, the output should show the validation message for empty edges
    const out = await gp.getOutputText();
    expect(out).toContain('Please enter edges.');
  });

  test('Transition S0 -> S1: invalid source input triggers "Invalid source vertex."', async ({ page }) => {
    // This test sends a non-numeric source to trigger the isNaN(sourceNode) branch.
    const gp = new GraphPage(page);

    // Provide a minimal valid edge so edges are present
    await gp.fillEdges('0 1 5');
    // Fill a non-numeric value into the source input
    await gp.setSource('not-a-number');
    await gp.clickRun();

    const out = await gp.getOutputText();
    expect(out).toContain('Invalid source vertex.');
  });

  test('Parsing error for malformed edge line - shows parse error message', async ({ page }) => {
    // Provide an incorrectly formatted edge line (missing weight) and ensure parse error is surfaced.
    const gp = new GraphPage(page);

    await gp.fillEdges('0 1'); // malformed: only two values
    await gp.setSource('0');
    await gp.clickRun();

    const out = await gp.getOutputText();
    expect(out).toContain('Error parsing edges:');
    expect(out).toContain('Expected 3 values per line');
  });

  test('Source vertex not in graph nodes - shows appropriate message', async ({ page }) => {
    // When the user provides a source vertex not present in parsed nodes, verify validation path.
    const gp = new GraphPage(page);

    await gp.fillEdges('0 1 5\n1 2 3');
    await gp.setSource('5'); // 5 is not a node in the provided edges
    await gp.clickRun();

    const out = await gp.getOutputText();
    expect(out).toContain('Source vertex 5 does not exist in the graph nodes.');
  });

  test('Full successful run (S1 -> S2 -> S3) - outputs distances, steps, and draws graph elements', async ({ page }) => {
    // This test validates the main happy path: Bellman-Ford runs and DOM updates (output, steps, visualization).
    const gp = new GraphPage(page);

    const edgesText = [
      '0 1 5',
      '1 2 3',
      '0 2 10',
      '2 1 -2'
    ].join('\n');

    await gp.fillEdges(edgesText);
    await gp.setSource('0');
    await gp.clickRun();

    // Output text should include the "Shortest distances" header and details for each node
    const out = await gp.getOutputText();
    expect(out).toContain('Shortest distances from source vertex 0:');
    expect(out).toContain('Node 0:');
    expect(out).toContain('Node 1:');
    expect(out).toContain('Node 2:');

    // Steps should contain initialization and iteration logs and end with "No negative weight cycles detected."
    const steps = await gp.getStepsText();
    expect(steps).toContain('Initialization: set distance[0] = 0');
    expect(steps).toContain('Iteration');
    expect(steps).toContain('No negative weight cycles detected');

    // Visualization: verify number of nodes and edges in the SVG match parsed graph
    expect(await gp.svgNodeCount()).toBe(3); // nodes 0,1,2
    expect(await gp.svgEdgeCount()).toBe(4); // 4 edges provided

    // Verify the source node (Node 0) is highlighted as the source (circle fill set to '#f39c12')
    const sourceFill = await gp.nodeCircleFill(0);
    expect(sourceFill).toBe('#f39c12');
  });

  test('Negative weight cycle detection (S2 -> S3 negativeCycle) - algorithm reports cycle', async ({ page }) => {
    // This test constructs a graph with a negative-weight cycle and ensures the algorithm flags it.
    const gp = new GraphPage(page);

    // Edges create a negative cycle: 0->1 (1), 1->2 (1), 2->0 (-3) => total -1
    const edgesText = [
      '0 1 1',
      '1 2 1',
      '2 0 -3'
    ].join('\n');

    await gp.fillEdges(edgesText);
    await gp.setSource('0');
    await gp.clickRun();

    // When a negative cycle is detected, formatOutput returns a fixed message.
    const out = await gp.getOutputText();
    expect(out.trim()).toBe('Negative weight cycle detected. Shortest paths not reliable.');

    // Steps should explicitly mention "Negative cycle detected"
    const steps = await gp.getStepsText();
    expect(steps).toContain('Negative cycle detected');

    // Even with a negative cycle, the visualization should still be drawn (nodes and edges present)
    expect(await gp.svgNodeCount()).toBe(3);
    expect(await gp.svgEdgeCount()).toBe(3);
  });
});