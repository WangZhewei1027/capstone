import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdbe-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page object encapsulating interactions with the Dijkstra visualization page
class DijkstraPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.startInput = page.locator('#start');
    this.endInput = page.locator('#end');
    this.runButton = page.locator('button:has-text("Run Dijkstra")');
    this.result = page.locator('#result');
    this.graph = page.locator('#graph');
    this.title = page.locator('h1');
  }

  // Set the start node input
  async setStart(value) {
    await this.startInput.fill(String(value));
  }

  // Set the end node input
  async setEnd(value) {
    await this.endInput.fill(String(value));
  }

  // Click the Run Dijkstra button
  async run() {
    await this.runButton.click();
  }

  // Read the result text content
  async getResultText() {
    return (await this.result.innerText()).trim();
  }

  // Convenience to clear both inputs
  async clearInputs() {
    await this.startInput.fill('');
    await this.endInput.fill('');
  }
}

test.describe('Dijkstra\'s Algorithm Visualization - interactive tests', () => {
  let consoleMessages;
  let pageErrors;
  let dijkstra;

  // Setup before each test: navigate to the page and attach listeners for console and page errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for inspection
    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });

    // Capture uncaught page errors
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    await page.goto(APP_URL);

    dijkstra = new DijkstraPage(page);

    // Basic checkpoint: the page should have loaded the expected title and main elements should be visible
    await expect(dijkstra.title).toHaveText(/Dijkstra's Algorithm Visualization/);
    await expect(dijkstra.graph).toBeVisible();
    await expect(dijkstra.startInput).toBeVisible();
    await expect(dijkstra.endInput).toBeVisible();
    await expect(dijkstra.runButton).toBeVisible();
  });

  // Teardown: after each test assert that there were no unexpected page errors or console errors
  test.afterEach(async () => {
    // Ensure no uncaught page errors (ReferenceError, TypeError, SyntaxError, etc.)
    expect(pageErrors.length, `Expected no page errors, but got: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);

    // Ensure no console error-level messages were emitted
    const consoleErrors = consoleMessages.filter(m => typeof m.type === 'function' ? m.type() === 'error' : m.type === 'error');
    expect(consoleErrors.length, `Expected no console.error messages, but got: ${consoleErrors.map(m => (m.text ? m.text() : String(m))).join(' | ')}`).toBe(0);
  });

  test('Initial page load shows title, inputs, button and empty result', async () => {
    // Verify initial state: result should be empty (no computation yet)
    const resultText = await dijkstra.getResultText();
    expect(resultText === '' || resultText === '\n' || resultText === null).toBeTruthy();

    // Verify placeholders and input attributes
    await expect(dijkstra.startInput).toHaveAttribute('placeholder', 'Start Node (0 to 5)');
    await expect(dijkstra.endInput).toHaveAttribute('placeholder', 'End Node (0 to 5)');

    // Ensure the Run button is actionable
    await expect(dijkstra.runButton).toBeEnabled();
  });

  test('Compute shortest path from 0 to 4 - expected path and distance', async () => {
    // This test verifies a correct computation for a known shortest path:
    // For the provided graph, 0 -> 2 (9) -> 5 (2) -> 4 (9) equals distance 20.
    await dijkstra.clearInputs();
    await dijkstra.setStart(0);
    await dijkstra.setEnd(4);
    await dijkstra.run();

    // Wait for the result area to update with expected content
    await expect(dijkstra.result).toContainText('Shortest path:');

    const result = await dijkstra.getResultText();
    expect(result).toContain('0 -> 2 -> 5 -> 4', 'Result should include the expected node sequence');
    expect(result).toContain('(Distance)', 'Result should include the expected total distance');
  });

  test('Compute shortest path from 4 to 0 - symmetric path check', async () => {
    // Verify algorithm can compute paths in reverse direction:
    // Expected shortest path for 4 -> 0 is 4 -> 5 -> 0 (Distance)
    await dijkstra.clearInputs();
    await dijkstra.setStart(4);
    await dijkstra.setEnd(0);
    await dijkstra.run();

    await expect(dijkstra.result).toContainText('Shortest path:');

    const result1 = await dijkstra.getResultText();
    expect(result).toContain('4 -> 5 -> 0', 'Expected path 4 -> 5 -> 0');
    expect(result).toContain('(Distance)', 'Expected total distance 23 for 4 -> 5 -> 0');
  });

  test('Start equals end should return trivial path with distance 0', async () => {
    // When start and end are the same node, the shortest path is the single node with distance 0.
    await dijkstra.clearInputs();
    await dijkstra.setStart(0);
    await dijkstra.setEnd(0);
    await dijkstra.run();

    const result2 = await dijkstra.getResultText();
    expect(result).toContain('Shortest path:', 'Should indicate a shortest path');
    expect(result).toContain('0', 'Path should contain the single node 0');
    expect(result).toContain('(Distance)', 'Distance for same start/end should be 0');
  });

  test('Invalid inputs produce a validation message', async () => {
    // Test edge cases where inputs are invalid (empty or out-of-range)
    await dijkstra.clearInputs();

    // Case 1: Both inputs empty
    await dijkstra.run();
    let result3 = await dijkstra.getResultText();
    expect(result).toBe('Please enter valid node numbers (0 to 5).', 'Empty inputs should trigger validation message');

    // Case 2: Out-of-range start
    await dijkstra.clearInputs();
    await dijkstra.setStart(-1);
    await dijkstra.setEnd(2);
    await dijkstra.run();
    result = await dijkstra.getResultText();
    expect(result).toBe('Please enter valid node numbers (0 to 5).', 'Out-of-range start should be rejected');

    // Case 3: Out-of-range end
    await dijkstra.clearInputs();
    await dijkstra.setStart(2);
    await dijkstra.setEnd(999);
    await dijkstra.run();
    result = await dijkstra.getResultText();
    expect(result).toBe('Please enter valid node numbers (0 to 5).', 'Out-of-range end should be rejected');

    // Case 4: Non-numeric input - fill with non-numeric characters (the input is type=number, but filling still possible)
    await dijkstra.clearInputs();
    await dijkstra.startInput.fill('abc');
    await dijkstra.endInput.fill('def');
    await dijkstra.run();
    result = await dijkstra.getResultText();
    expect(result).toBe('Please enter valid node numbers (0 to 5).', 'Non-numeric input should be rejected');
  });

  test('Result area updates visually and is visible after computation', async () => {
    // Ensure the #result element is visible and contains expected text after a computation
    await dijkstra.clearInputs();
    await dijkstra.setStart(1);
    await dijkstra.setEnd(4);
    await dijkstra.run();

    await expect(dijkstra.result).toBeVisible();
    const text = await dijkstra.getResultText();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/Shortest path:|No path found.|Please enter valid node numbers/);
  });

  test('No unexpected console.error or uncaught exceptions during typical usage', async () => {
    // This test performs several runs to exercise the app and then asserts no console errors or page errors were emitted.
    await dijkstra.clearInputs();
    await dijkstra.setStart(0);
    await dijkstra.setEnd(4);
    await dijkstra.run();

    await dijkstra.setStart(4);
    await dijkstra.setEnd(0);
    await dijkstra.run();

    await dijkstra.setStart(2);
    await dijkstra.setEnd(3);
    await dijkstra.run();

    // Wait briefly to allow any asynchronous errors to surface
    await dijkstra.page.waitForTimeout(100);

    // Re-check the arrays captured by afterEach as well; these expectations are redundant with afterEach but provide clearer failure context here
    const consoleErrors1 = consoleMessages.filter(m => typeof m.type === 'function' ? m.type() === 'error' : m.type === 'error');
    expect(consoleErrors.length, `Expected no console.error messages during usage, found: ${consoleErrors.map(m => m.text ? m.text() : String(m)).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Expected no uncaught page errors during usage, found: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
  });
});