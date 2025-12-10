import { test, expect } from '@playwright/test';

// Page Object Model for the Bellman-Ford visualization page
class BellmanFordPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.edgesInput = page.locator('#edges');
    this.sourceInput = page.locator('#source');
    this.runButton = page.locator('button', { hasText: 'Run Bellman-Ford' });
    this.outputDiv = page.locator('#output');
  }

  async goto(url) {
    await this.page.goto(url);
  }

  async fillEdges(text) {
    await this.edgesInput.fill(text);
  }

  async setSource(value) {
    // Accept number or string
    await this.sourceInput.fill(String(value));
  }

  async clickRun() {
    await this.runButton.click();
  }

  async getOutputText() {
    return this.outputDiv.innerText();
  }

  async getOutputHTML() {
    return this.outputDiv.innerHTML();
  }
}

// URL to the served HTML for the tests
const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3b1-d59e-11f0-89ab-2f71529652ac.html';

test.describe('Bellman-Ford Algorithm Visualization', () => {
  // Arrays to capture console and page errors for each test
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages and errors from the page
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture unhandled page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Detach listeners by removing the page reference (Playwright will clean up)
    // This is kept intentionally minimal; Playwright handles test isolation.
  });

  // Test: initial page load and default state
  test('Initial load shows heading, inputs, and default values with no runtime errors', async ({
    page,
  }) => {
    const bellmanPage = new BellmanFordPage(page);

    // Verify static UI elements are visible and contain expected default values
    await expect(page.locator('h1')).toHaveText('Bellman-Ford Algorithm Visualization');
    await expect(bellmanPage.edgesInput).toBeVisible();
    await expect(bellmanPage.sourceInput).toBeVisible();
    await expect(bellmanPage.runButton).toBeVisible();

    // Default source input should be "0" as per implementation
    await expect(bellmanPage.sourceInput).toHaveValue('0');

    // Placeholder for edges should exist
    const placeholder = await bellmanPage.edgesInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder).toContain('src dest weight');

    // Ensure no uncaught page errors and no console errors on initial load
    expect(pageErrors.length, `Expected no page errors on load, got: ${pageErrors.map(String)}`).toBe(
      0
    );
    expect(consoleErrors.length, `Expected no console errors on load, got: ${consoleErrors}`).toBe(
      0
    );
  });

  // Test: run the default example graph and assert expected shortest distances
  test('Running Bellman-Ford on sample graph computes correct shortest distances', async ({
    page,
  }) => {
    const bellmanPage1 = new BellmanFordPage(page);

    // Use the example graph provided in the app description
    const sampleEdges =
      '0 1 4, 0 2 1, 1 2 2, 1 3 5, 2 3 8, 3 1 -4';
    await bellmanPage.fillEdges(sampleEdges);
    await bellmanPage.setSource(0);

    // Click Run and wait for output to update
    await bellmanPage.clickRun();

    // Validate output HTML contains the expected result header and per-vertex distances
    const outputText = await bellmanPage.getOutputText();
    expect(outputText).toContain('Shortest distances from source 0:');

    // Expected distances computed manually:
    // Vertex 0: 0
    // Vertex 1: 4
    // Vertex 2: 1
    // Vertex 3: 9
    expect(outputText).toContain('Vertex 0: 0');
    expect(outputText).toContain('Vertex 1: 4');
    expect(outputText).toContain('Vertex 2: 1');
    expect(outputText).toContain('Vertex 3: 9');

    // Also ensure no runtime page errors occurred during calculation
    expect(pageErrors.length, `Expected no page errors, got: ${pageErrors.map(String)}`).toBe(0);
    expect(
      consoleErrors.length,
      `Expected no console errors during computation, got: ${consoleErrors}`
    ).toBe(0);
  });

  // Test: Detect negative weight cycle
  test('Detects negative weight cycle and displays appropriate message', async ({ page }) => {
    const bellmanPage2 = new BellmanFordPage(page);

    // Create a small graph that contains a negative weight cycle: 0->1 (1), 1->2 (-1), 2->0 (-1)
    const negativeCycleEdges = '0 1 1, 1 2 -1, 2 0 -1';
    await bellmanPage.fillEdges(negativeCycleEdges);
    await bellmanPage.setSource(0);

    await bellmanPage.clickRun();

    const outputText1 = await bellmanPage.getOutputText();

    // The app should display the negative cycle message exactly as implemented
    expect(outputText).toContain('Graph contains a negative weight cycle!');

    // Ensure no uncaught runtime errors while detecting negative cycle
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test: malformed input (non-numeric weight) and its handling in output
  test('Handles malformed edge weight input gracefully (shows Infinity or numeric values) without crashing', async ({
    page,
  }) => {
    const bellmanPage3 = new BellmanFordPage(page);

    // Provide a malformed weight "a" for edge 0->1
    const malformedEdges = '0 1 a, 0 2 1';
    await bellmanPage.fillEdges(malformedEdges);
    await bellmanPage.setSource(0);

    await bellmanPage.clickRun();

    // Fetch output and assert that the page did not throw exceptions and produces output
    const outputText2 = await bellmanPage.getOutputText();
    expect(outputText).toContain('Shortest distances from source 0:');

    // Because "a" cannot be parsed to a number, its weight becomes NaN and edges relaxations will not
    // update that destination - we expect to see "Infinity" for unreachable / unchanged vertices.
    // Check that vertex 1 is either "Infinity" or a finite value; we accept Infinity as valid behavior.
    // We require that at least vertex 0 (source) remains 0 and vertex 2 gets a finite distance 1.
    expect(outputText).toContain('Vertex 0: 0');
    expect(outputText).toContain('Vertex 2: 1');

    // Vertex 1 may remain Infinity due to NaN weight; ensure string contains 'Infinity' or a number.
    const hasInfinityOrNumberForV1 =
      outputText.includes('Vertex 1: Infinity') || /Vertex 1: [-+]?\d+(\.\d+)?/.test(outputText);
    expect(hasInfinityOrNumberForV1).toBe(true);

    // Ensure no uncaught page errors occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test: verify UI remains interactive after multiple runs and outputs update accordingly
  test('Multiple runs update output correctly and UI remains responsive', async ({ page }) => {
    const bellmanPage4 = new BellmanFordPage(page);

    // First run: simple two-edge graph
    await bellmanPage.fillEdges('0 1 5, 1 2 3');
    await bellmanPage.setSource(0);
    await bellmanPage.clickRun();

    let output = await bellmanPage.getOutputText();
    expect(output).toContain('Vertex 0: 0');
    // Depending on implementation indexing, Vertex 1 and Vertex 2 should be reported
    expect(output).toContain('Vertex 1: 5');

    // Second run: change graph to sample example to ensure DOM updates
    const sampleEdges1 =
      '0 1 4, 0 2 1, 1 2 2, 1 3 5, 2 3 8, 3 1 -4';
    await bellmanPage.fillEdges(sampleEdges);
    await bellmanPage.setSource(0);
    await bellmanPage.clickRun();

    output = await bellmanPage.getOutputText();
    expect(output).toContain('Shortest distances from source 0:');
    expect(output).toContain('Vertex 1: 4'); // verifies updated computation is shown

    // Final checks for runtime stability
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});