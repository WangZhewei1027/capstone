import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed505-cd2f-11f0-a735-f5f9b4634e99.html';

class BellmanFordPage {
  /**
   * Page object encapsulating interactions with the Bellman-Ford visualization page.
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.output = page.locator('#output');
    // The page's button has no id; select it by accessible name (its visible text)
    this.calculateButton = page.getByRole('button', { name: 'Calculate Shortest Paths' });
    this.nodes = {
      node0: page.locator('#node0'),
      node1: page.locator('#node1'),
      node2: page.locator('#node2'),
      all: page.locator('.node')
    };
    // collectors for console messages and page errors
    this.consoleMessages = [];
    this.pageErrors = [];
  }

  // Navigate to the page and wire up listeners for console/page errors
  async goto() {
    // Clear previous event listeners data
    this.consoleMessages.length = 0;
    this.pageErrors.length = 0;

    // Attach listeners to capture console messages and page errors for assertions
    this.page.on('console', msg => {
      // store text and type for later assertions
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    this.page.on('pageerror', err => {
      this.pageErrors.push(err);
    });

    await this.page.goto(APP_URL);
    // Ensure the main heading exists before proceeding
    await expect(this.page.getByRole('heading', { name: 'Bellman-Ford Algorithm Visualization' })).toBeVisible();
  }

  // Click the calculate button
  async clickCalculate() {
    await expect(this.calculateButton).toBeVisible();
    await this.calculateButton.click();
  }

  // Read raw text content from #output (not normalized)
  async getOutputText() {
    return await this.page.locator('#output').evaluate(el => el.innerText);
  }

  // Convenience to wait until output contains a given substring
  async waitForOutputContains(substring) {
    await this.page.waitForFunction(
      (sel, text) => {
        const el = document.querySelector(sel);
        return el && el.innerText.includes(text);
      },
      '#output',
      substring
    );
  }
}

test.describe('Bellman-Ford Algorithm Visualization - end-to-end', () => {
  // Each test will create fresh page object and navigate to the app URL
  test.beforeEach(async ({ page }) => {
    // Nothing here; page object will handle navigation per-test
  });

  // Test initial page load and default state
  test('Initial page load: should render nodes, button and empty output', async ({ page }) => {
    const app = new BellmanFordPage(page);
    await app.goto();

    // Verify interactive elements are present and visible
    await expect(app.calculateButton).toBeVisible(); // the main action button
    await expect(app.nodes.all).toHaveCount(3); // three nodes A, B, C

    // Verify each node has expected label text
    await expect(app.nodes.node0).toHaveText('A');
    await expect(app.nodes.node1).toHaveText('B');
    await expect(app.nodes.node2).toHaveText('C');

    // Verify inline styles for positions: node1 and node2 have left set
    const left1 = await app.nodes.node1.evaluate(el => el.style.left);
    const left2 = await app.nodes.node2.evaluate(el => el.style.left);
    expect(left1).toBe('150px');
    expect(left2).toBe('300px');

    // Verify nodes have expected visual styling (background-color matches CSS)
    const bg0 = await app.nodes.node0.evaluate(el => getComputedStyle(el).backgroundColor);
    // CSS sets background-color: #3498db -> rgb(52, 152, 219) in most browsers
    expect(bg0).toBeTruthy();
    expect(['rgb(52, 152, 219)', '#3498db', 'rgba(52, 152, 219, 1)']).toContain(bg0);

    // Output should be empty initially
    const out = await app.getOutputText();
    expect(out).toBe('', 'Expected output div to be empty on initial load');

    // Confirm no page errors or console.error messages occurred during load
    // (we capture console/pageerror via listeners attached in goto())
    // pageErrors and consoleMessages arrays are currently empty because listeners started at goto
    expect(app.pageErrors.length).toBe(0);
    const consoleErrors = app.consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test clicking the Calculate button produces the correct shortest paths output
  test('Calculate Shortest Paths: clicking button updates output with expected distances', async ({ page }) => {
    const app = new BellmanFordPage(page);
    await app.goto();

    // Click the calculate button to run the Bellman-Ford algorithm
    await app.clickCalculate();

    // Wait for output to be populated and assert the expected results
    // Expected distances:
    // A: 0
    // B: -2  (A -> B has weight -2)
    // C: 1   (A -> B -> C = -2 + 3 = 1 is better than A -> C = 4)
    const expectedLines = [
      'Shortest distances from node A:',
      'A: 0',
      'B: -2',
      'C: 1'
    ];
    // Wait until output contains the header/one of the expected lines, then fetch all text
    await app.waitForOutputContains('Shortest distances from node A:');
    const outputText = await app.getOutputText();

    // Check that every expected line is present in the output text
    for (const line of expectedLines) {
      expect(outputText).toContain(line);
    }

    // Ensure the output formatting matches (each line separated by newline)
    // The implementation appends a '\n' after each line; check that ordering is preserved
    const normalized = outputText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    expect(normalized).toEqual(expectedLines);

    // Confirm distances include a negative value for node B to validate negative weight handling
    expect(normalized).toContain('B: -2');

    // No runtime errors should have been emitted while running the algorithm
    expect(app.pageErrors.length).toBe(0, 'Expected no page errors during calculation');
    const consoleErrors = app.consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0, 'Expected no console.error messages during calculation');
  });

  // Test idempotence: clicking the button multiple times should overwrite (not append) the output
  test('Repeated clicks: output should be consistent and not append multiple results', async ({ page }) => {
    const app = new BellmanFordPage(page);
    await app.goto();

    // First click
    await app.clickCalculate();
    await app.waitForOutputContains('A: 0');
    const firstOutput = await app.getOutputText();

    // Second click - should overwrite the output (innerText assignment in implementation)
    await app.clickCalculate();
    await app.waitForOutputContains('A: 0'); // still contains
    const secondOutput = await app.getOutputText();

    // Outputs should be identical (not appended)
    expect(secondOutput).toBe(firstOutput);

    // The output should only contain the expected three node lines plus header
    const normalized = secondOutput.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    expect(normalized.length).toBe(4); // header + 3 node lines
  });

  // Test DOM stability after running algorithm: nodes remain visible and styles unchanged
  test('DOM stability: nodes remain visible and retain dimensions after algorithm run', async ({ page }) => {
    const app = new BellmanFordPage(page);
    await app.goto();

    // Ensure nodes are visible before running
    await expect(app.nodes.node0).toBeVisible();
    await expect(app.nodes.node1).toBeVisible();
    await expect(app.nodes.node2).toBeVisible();

    // Run the algorithm
    await app.clickCalculate();
    await app.waitForOutputContains('Shortest distances from node A:');

    // Assert nodes still present and sizes remain 40x40 as defined in CSS
    for (const key of ['node0', 'node1', 'node2']) {
      const locator = app.nodes[key];
      await expect(locator).toBeVisible();

      const { width, height } = await locator.evaluate(el => {
        const cs = getComputedStyle(el);
        return { width: cs.width, height: cs.height };
      });

      // The style declares 40px width/height
      expect(width).toBe('40px');
      expect(height).toBe('40px');
    }
  });

  // Negative / edge-case checks: ensure algorithm result demonstrates negative edges are processed
  test('Edge-case: negative edge weight is handled producing negative distance for B', async ({ page }) => {
    const app = new BellmanFordPage(page);
    await app.goto();

    // Run algorithm
    await app.clickCalculate();
    await app.waitForOutputContains('B:');

    const outputText = await app.getOutputText();
    // Ensure B's distance reported is "-2" and not some incorrect positive value
    expect(outputText).toContain('B: -2');

    // As an additional check ensure C's computed distance is the smaller of direct or via B (1 expected)
    expect(outputText).toContain('C: 1');
  });

  // Final test to assert that there were no uncaught exceptions or console error messages for the whole run
  test('No uncaught page errors or console.error messages during full scenario', async ({ page }) => {
    const app = new BellmanFordPage(page);
    await app.goto();

    // Run the algorithm multiple times to exercise interactions
    await app.clickCalculate();
    await app.clickCalculate();

    // Small wait to ensure any asynchronous errors (if they existed) would surface
    await page.waitForTimeout(100);

    // Assert no page errors were emitted
    expect(app.pageErrors.length).toBe(0, `Expected no page errors, got: ${app.pageErrors.map(e => String(e)).join('; ')}`);

    // Assert no console.error messages were emitted
    const consoleErrorMessages = app.consoleMessages.filter(m => m.type === 'error').map(m => m.text);
    expect(consoleErrorMessages.length).toBe(0, `Expected no console.error messages, got: ${consoleErrorMessages.join('; ')}`);
  });
});