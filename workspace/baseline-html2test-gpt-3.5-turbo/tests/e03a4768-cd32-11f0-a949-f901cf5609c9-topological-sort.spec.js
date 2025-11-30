import { test, expect } from '@playwright/test';

// Test file: e03a4768-cd32-11f0-a949-f901cf5609c9-topological-sort.spec.js
// URL under test:
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a4768-cd32-11f0-a949-f901cf5609c9.html';

// Page Object for the Topological Sort app
class TopoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.textarea = page.locator('#graph-input');
    this.runBtn = page.locator('#run-btn');
    this.output = page.locator('#output');

    // Arrays to capture console errors and page errors for assertions
    this.consoleErrors = [];
    this.pageErrors = [];

    // Attach listeners to collect console and page errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });
    this.page.on('pageerror', (err) => {
      // capture uncaught exceptions
      this.pageErrors.push(err.message);
    });
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for key interactive elements to be present
    await expect(this.textarea).toBeVisible();
    await expect(this.runBtn).toBeVisible();
  }

  // Fill the textarea with the provided text
  async fillEdges(text) {
    await this.textarea.fill(text);
  }

  // Click the Run Topological Sort button
  async clickRun() {
    await this.runBtn.click();
  }

  // Get output textContent
  async getOutputText() {
    return this.output.textContent();
  }

  // Get computed style color of output element (as set in showResult)
  async getOutputColor() {
    return this.page.$eval('#output', (el) => el.style.color || '');
  }

  // Expose captured console and page errors
  getConsoleErrors() {
    return this.consoleErrors;
  }
  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Topological Sort Visualizer - e03a4768...', () => {
  // Each test will create its own page and TopoPage object
  test.beforeEach(async ({ page }) => {
    // noop here; per-test construction is below
  });

  // Test initial page load and default state
  test('Initial load: UI elements present and default state is correct', async ({ page }) => {
    // Purpose: verify that the page loads, interactive elements exist, and default output is empty.
    const topo = new TopoPage(page);
    await topo.goto();

    // Check title contains expected text
    await expect(page).toHaveTitle(/Topological Sort/i);

    // Textarea should be visible and empty (or contain only placeholder)
    await expect(topo.textarea).toBeVisible();
    const textareaValue = await topo.textarea.inputValue();
    // The implementation sets a placeholder but not an initial value, so expect empty string
    expect(textareaValue).toBe('');

    // Run button visible and enabled
    await expect(topo.runBtn).toBeVisible();
    await expect(topo.runBtn).toBeEnabled();

    // Output area should be visible and initially empty
    await expect(topo.output).toBeVisible();
    const outputText = await topo.getOutputText();
    expect(outputText).toBe('');

    // Ensure there are no page errors or console.error messages on initial load
    expect(topo.getPageErrors().length).toBe(0);
    expect(topo.getConsoleErrors().length).toBe(0);
  });

  // Test a known DAG produces the expected topological order from the example
  test('Valid DAG: computes topological order and displays success styling', async ({ page }) => {
    // Purpose: verify correct ordering for the provided example DAG and check visual feedback (green color)
    const topo1 = new TopoPage(page);
    await topo.goto();

    const exampleInput = `5 -> 2
5 -> 0
4 -> 0
4 -> 1
2 -> 3
3 -> 1`;

    await topo.fillEdges(exampleInput);
    await topo.clickRun();

    // The implementation constructs nodes in a predictable order based on insertion into a Set.
    // For the example input the Kahn's algorithm in this code yields: 5 → 4 → 2 → 0 → 3 → 1
    const expectedOutput = 'Topological Order:\n5 → 4 → 2 → 0 → 3 → 1';

    // Wait for the output area to contain the expected text
    await expect(topo.output).toHaveText(expectedOutput);

    // Check the color set for success: '#060'
    const color = await topo.getOutputColor();
    expect(color).toBe('#060');

    // Ensure no console errors or uncaught page errors happened during the interaction
    expect(topo.getConsoleErrors().length).toBe(0);
    expect(topo.getPageErrors().length).toBe(0);
  });

  // Test cycle detection produces the appropriate error message and red styling
  test('Cycle detection: shows error message and red styling when graph has a cycle', async ({ page }) => {
    // Purpose: verify that a cycle is detected and a clear error is shown with error styling.
    const topo2 = new TopoPage(page);
    await topo.goto();

    const cycleInput = `A -> B
B -> C
C -> A`;

    await topo.fillEdges(cycleInput);
    await topo.clickRun();

    // Expect an error message indicating a cycle
    await expect(topo.output).toHaveText(/Error: The graph contains a cycle/i);

    // Color for errors should be '#d00'
    const color1 = await topo.getOutputColor();
    expect(color).toBe('#d00');

    // Ensure no console.error or uncaught exceptions occurred while detecting the cycle
    expect(topo.getConsoleErrors().length).toBe(0);
    expect(topo.getPageErrors().length).toBe(0);
  });

  // Test invalid input format handling: should show parse error with descriptive message
  test('Invalid input format: shows parse error and red styling for malformed lines', async ({ page }) => {
    // Purpose: verify parsing errors are caught and user sees a descriptive error message.
    const topo3 = new TopoPage(page);
    await topo.goto();

    const invalidInput = `this is not an edge line`;

    await topo.fillEdges(invalidInput);
    await topo.clickRun();

    // Expect an error message mentioning invalid edge format
    await expect(topo.output).toHaveText(/Error: Invalid edge format:/i);

    // Error styling color must be '#d00'
    const color2 = await topo.getOutputColor();
    expect(color).toBe('#d00');

    // No console errors or page errors should have been emitted by the runtime (parse error was handled)
    expect(topo.getConsoleErrors().length).toBe(0);
    expect(topo.getPageErrors().length).toBe(0);
  });

  // Test that output is cleared and updated on successive runs
  test('Consecutive runs: output is cleared and refreshed appropriately', async ({ page }) => {
    // Purpose: ensure repeated runs replace prior output and styling updates accordingly.
    const topo4 = new TopoPage(page);
    await topo.goto();

    // First run: valid DAG
    const validInput = `1 -> 2`;
    await topo.fillEdges(validInput);
    await topo.clickRun();

    await expect(topo.output).toHaveText(/Topological Order:/i);
    expect(await topo.getOutputColor()).toBe('#060');

    // Second run: invalid format should overwrite with error
    const invalidInput1 = `broken line`;
    await topo.fillEdges(invalidInput);
    await topo.clickRun();

    await expect(topo.output).toHaveText(/Error: Invalid edge format:/i);
    expect(await topo.getOutputColor()).toBe('#d00');

    // Third run: cycle should overwrite the error
    const cycleInput1 = `X -> Y
Y -> X`;
    await topo.fillEdges(cycleInput);
    await topo.clickRun();

    await expect(topo.output).toHaveText(/Error: The graph contains a cycle/i);
    expect(await topo.getOutputColor()).toBe('#d00');

    // Ensure no uncaught errors or console.error messages across these interactions
    expect(topo.getConsoleErrors().length).toBe(0);
    expect(topo.getPageErrors().length).toBe(0);
  });

  // Test accessibility-related expectations: labels and instructions present and linked
  test('Accessibility: label exists and is associated with textarea placeholder', async ({ page }) => {
    // Purpose: check that the UI has a label for the textarea and instructions are visible
    const topo5 = new TopoPage(page);
    await topo.goto();

    // The label element with for="graph-input" should exist and be visible
    const label = page.locator('label[for="graph-input"]');
    await expect(label).toBeVisible();
    await expect(label).toHaveText(/Enter DAG edges:/i);

    // Instructions area should be visible and contain the arrow example text
    const instructions = page.locator('#instructions');
    await expect(instructions).toBeVisible();
    await expect(instructions).toContainText(/Input format:/i);

    // No runtime errors or console.error messages should have occurred
    expect(topo.getConsoleErrors().length).toBe(0);
    expect(topo.getPageErrors().length).toBe(0);
  });
});