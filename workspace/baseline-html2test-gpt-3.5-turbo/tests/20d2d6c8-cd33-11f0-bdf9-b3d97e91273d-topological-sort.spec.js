import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6c8-cd33-11f0-bdf9-b3d97e91273d.html';

// Page object for interacting with the Topological Sort demo
class TopoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputGraph');
    this.runBtn = page.locator('#runBtn');
    this.output = page.locator('#output');
    this.graphViz = page.locator('#graphViz');
    this.svgNodeGroups = page.locator('svg g.node-group');
    this.svgDoneCircles = page.locator('svg circle.node.done');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Fill the textarea with provided text
  async setInput(text) {
    await this.input.fill(text);
  }

  // Clear the textarea
  async clearInput() {
    await this.input.fill('');
  }

  // Click the Run Topological Sort button
  async clickRun() {
    await this.runBtn.click();
  }

  // Get the current output text content
  async getOutputText() {
    return (await this.output.textContent()) || '';
  }

  // Count total SVG node groups
  async countSvgNodes() {
    // Wait for svg to exist if possible
    await this.page.waitForTimeout(50); // slight pause to ensure DOM updated
    return await this.svgNodeGroups.count();
  }

  // Count circles with 'done' class after or during run
  async countDoneNodes() {
    await this.page.waitForTimeout(50);
    return await this.svgDoneCircles.count();
  }

  // Helper to wait until output contains a substring
  async waitForOutputContains(substring, options = {}) {
    await expect(this.output).toContainText(substring, { timeout: options.timeout ?? 20000 });
  }
}

test.describe('Topological Sort Demo - End-to-End', () => {
  // Capture console messages and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Make sure we have listeners attached before navigation to observe any errors during load/run
    page._capturedConsole = [];
    page._capturedPageErrors = [];

    page.on('console', msg => {
      try {
        page._capturedConsole.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        // ignore capture errors
      }
    });

    page.on('pageerror', err => {
      try {
        page._capturedPageErrors.push(err);
      } catch (e) {
        // ignore capture errors
      }
    });
  });

  // Test that the page loads and the built-in example runs automatically on load
  test('loads page and automatically runs the example, producing a final topological order', async ({ page }) => {
    const topo = new TopoPage(page);

    // Navigate and let the app auto-click "Run" on load
    await topo.goto();

    // The example run will take ~1s per node. Wait for completion message.
    await topo.waitForOutputContains('Topological sort completed!', { timeout: 20000 });

    // Verify final order is the expected order from the example input
    // Expected order deduced from Kahn's algorithm and the insertion order used in the implementation
    const finalOrderString = '5 → 4 → 2 → 0 → 3 → 1';
    await topo.waitForOutputContains(finalOrderString, { timeout: 2000 });

    // Inspect the DOM for SVG visualization
    const svgNodeCount = await topo.countSvgNodes();
    expect(svgNodeCount).toBe(6); // there are 6 unique nodes in the example

    // After the run, all nodes should have been highlighted (class "node done")
    const doneCount = await topo.countDoneNodes();
    expect(doneCount).toBe(6);

    // Ensure the output container includes a "Visited node" message at least once during the run
    const outputText = await topo.getOutputText();
    expect(outputText).toMatch(/Visited node:/);

    // Assert there were no uncaught page errors during load and run
    expect(page._capturedPageErrors.length).toBe(0);

    // Console may or may not have messages but we at least ensure capturing worked (array exists)
    expect(Array.isArray(page._capturedConsole)).toBe(true);
  });

  // Test malformed input triggers a parsing error displayed to the user
  test('displays parsing error for malformed input (line with wrong number of tokens)', async ({ page }) => {
    const topo1 = new TopoPage(page);

    await topo.goto();

    // Prepare a malformed input with a line that has three tokens
    const badInput = `A B\nC D E\nF G`;
    await topo.setInput(badInput);

    // Click Run and wait for the parsing error to be displayed
    await topo.clickRun();

    // The parseInput throws and the click handler catches and writes "Parsing error: ..."
    await topo.waitForOutputContains('Parsing error:', { timeout: 2000 });
    const out = await topo.getOutputText();
    expect(out).toContain('Each line must contain exactly two nodes separated by space.');

    // Ensure no uncaught page errors happened (the error is handled and shown in the UI)
    expect(page._capturedPageErrors.length).toBe(0);
  });

  // Test clicking Run with empty input triggers an alert dialog with expected message
  test('alerts the user when Run is clicked with empty input', async ({ page }) => {
    const topo2 = new TopoPage(page);

    await topo.goto();

    // Clear the input to simulate empty input
    await topo.clearInput();

    // Listen for the dialog that should occur when input is empty
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click run and expect a dialog to appear
    await topo.clickRun();

    // Small wait to ensure dialog handler executed
    await page.waitForTimeout(200);

    expect(dialogMessage).toBe('Please enter graph edges.');

    // Ensure that no topological sort started (output should not be overwritten with parse/run text)
    // The app returns early on alert, so output should not contain "Parsing graph"
    const out1 = await topo.getOutputText();
    expect(out).not.toContain('Parsing graph');
  });

  // Test a custom small graph to validate runtime visual updates and final order
  test('runs a custom small DAG and updates visualization step-by-step', async ({ page }) => {
    const topo3 = new TopoPage(page);

    await topo.goto();

    // Provide a minimal graph A -> B -> C
    const custom = `A B\nB C`;
    await topo.setInput(custom);

    // Start the run
    await topo.clickRun();

    // During the run we expect intermediate "Visited node" messages; wait for at least one
    await topo.waitForOutputContains('Visited node:', { timeout: 5000 });

    // Wait for final completion message (3 nodes => ~3s)
    await topo.waitForOutputContains('Topological sort completed!', { timeout: 10000 });

    // Verify expected final order
    await topo.waitForOutputContains('A → B → C', { timeout: 2000 });

    // Check SVG nodes count and that all got marked done
    const svgCount = await topo.countSvgNodes();
    expect(svgCount).toBe(3);

    const done = await topo.countDoneNodes();
    expect(done).toBe(3);

    // Ensure no uncaught page errors occurred during this manual run
    expect(page._capturedPageErrors.length).toBe(0);
  });

  // Edge case: single-line invalid format (one token) should also yield parsing error
  test('single-token line produces parsing error', async ({ page }) => {
    const topo4 = new TopoPage(page);
    await topo.goto();

    await topo.setInput('SingleTokenLine');
    await topo.clickRun();

    await topo.waitForOutputContains('Parsing error:', { timeout: 2000 });
    const out2 = await topo.getOutputText();
    expect(out).toContain('Each line must contain exactly two nodes separated by space.');

    // confirm all handled without page errors
    expect(page._capturedPageErrors.length).toBe(0);
  });
});