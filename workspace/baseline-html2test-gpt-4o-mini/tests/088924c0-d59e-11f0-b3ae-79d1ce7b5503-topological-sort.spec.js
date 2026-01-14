import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924c0-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object for the Topological Sort page
class TopoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.pageErrors = [];
    this.consoleErrors = [];

    // Collect page errors and console error messages for assertions
    this.page.on('pageerror', (err) => {
      this.pageErrors.push(err);
    });
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });
  }

  // Navigate to the application page
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  // Fill the edges textarea with the given string
  async fillEdges(text) {
    await this.page.fill('#edgesInput', text);
  }

  // Click the Sort button
  async clickSort() {
    // Find the button by its text content 'Sort'
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 100 }).catch(() => {}),
      this.page.click('button:has-text("Sort")')
    ]);
  }

  // Retrieve the result text
  async getResultText() {
    const el = await this.page.waitForSelector('#result');
    return (await el.innerText()).trim();
  }

  // Helper to get the page errors collected
  getPageErrors() {
    return this.pageErrors;
  }

  // Helper to get the console error messages collected
  getConsoleErrors() {
    return this.consoleErrors;
  }
}

test.describe('Topological Sort Visualization - Functional tests', () => {
  // Test that the page loads, interactive elements exist, and there are no runtime errors on load.
  test('loads the page and shows initial UI elements without runtime errors', async ({ page }) => {
    const topo = new TopoPage(page);
    await topo.goto();

    // Verify page header and instructions exist
    await expect(page.locator('h1')).toHaveText('Topological Sort Visualization');
    await expect(page.locator('p')).toContainText('Enter the graph as a list of edges');

    // Verify interactive elements: textarea, button, result container
    await expect(page.locator('#edgesInput')).toBeVisible();
    await expect(page.locator('button:has-text("Sort")')).toBeVisible();
    await expect(page.locator('#result')).toBeVisible();

    // On initial load, result should be empty
    const initialResult = await page.locator('#result').innerText();
    expect(initialResult.trim()).toBe('');

    // Assert no page errors or console errors occurred during load
    expect(topo.getPageErrors().length).toBe(0);
    expect(topo.getConsoleErrors().length).toBe(0);
  });

  // Test the main happy path: a simple DAG should produce a correct topological order.
  test('performs topological sort for a simple DAG and displays expected order', async ({ page }) => {
    const topo1 = new TopoPage(page);
    await topo.goto();

    // Input a DAG example and click Sort
    const dagInput = 'A→B, A→C, B→D, C→D';
    await topo.fillEdges(dagInput);
    await topo.clickSort();

    // Verify the displayed topological order matches the algorithm's expected output
    const resultText = await topo.getResultText();
    // The given implementation uses Kahn's algorithm with FIFO queue; expected deterministic order: A → B → C → D
    expect(resultText).toBe('A → B → C → D');

    // Ensure no uncaught errors were logged to console or page errors
    expect(topo.getPageErrors().length).toBe(0);
    expect(topo.getConsoleErrors().length).toBe(0);
  });

  // Test detection of cycles: the app should report when topological sorting is not possible.
  test('detects a cycle and shows an appropriate error message', async ({ page }) => {
    const topo2 = new TopoPage(page);
    await topo.goto();

    // Input a cyclic graph
    const cycleInput = 'A→B, B→C, C→A';
    await topo.fillEdges(cycleInput);
    await topo.clickSort();

    // The app should display the exact cycle error message
    const resultText1 = await topo.getResultText();
    expect(resultText).toBe('The graph has a cycle, topological sorting not possible.');

    // No runtime exceptions (page errors) should be thrown by this code path
    expect(topo.getPageErrors().length).toBe(0);
    // Console errors should be empty too
    expect(topo.getConsoleErrors().length).toBe(0);
  });

  // Test handling of empty input and how the app responds (ensures there is consistent DOM update).
  test('handles empty input gracefully and updates the result DOM', async ({ page }) => {
    const topo3 = new TopoPage(page);
    await topo.goto();

    // Clear the textarea (empty input)
    await topo.fillEdges('');
    await topo.clickSort();

    // Based on the implementation, an empty string input produces a join that results in ' → '
    const resultText2 = await topo.getResultText();
    expect(resultText).toBe('→' || ' → ' || ''); // accept potential small variation, but check trim behavior

    // For clarity, also assert that the result element is visible and non-null
    const resultHandle = await page.$('#result');
    expect(resultHandle).not.toBeNull();

    // No runtime errors expected
    expect(topo.getPageErrors().length).toBe(0);
  });

  // Test that whitespace and extra commas are trimmed and do not break the algorithm.
  test('trims whitespace and handles inputs with extra spaces correctly', async ({ page }) => {
    const topo4 = new TopoPage(page);
    await topo.goto();

    const spacedInput = '  A→B  ,   A→C , B→D ,   C→D   ';
    await topo.fillEdges(spacedInput);
    await topo.clickSort();

    const resultText3 = await topo.getResultText();
    expect(resultText).toBe('A → B → C → D');

    expect(topo.getPageErrors().length).toBe(0);
    expect(topo.getConsoleErrors().length).toBe(0);
  });

  // Test multiple sequential operations to ensure the application updates state correctly between runs.
  test('allows multiple subsequent sorts and updates the result each time', async ({ page }) => {
    const topo5 = new TopoPage(page);
    await topo.goto();

    // First, a DAG
    await topo.fillEdges('A→B, A→C, B→D, C→D');
    await topo.clickSort();
    expect(await topo.getResultText()).toBe('A → B → C → D');

    // Then, a cycle
    await topo.fillEdges('X→Y, Y→Z, Z→X');
    await topo.clickSort();
    expect(await topo.getResultText()).toBe('The graph has a cycle, topological sorting not possible.');

    // Finally, another DAG to ensure state resets properly
    await topo.fillEdges('M→N, N→O');
    await topo.clickSort();
    expect(await topo.getResultText()).toBe('M → N → O');

    // Verify no accumulated page errors across these interactions
    expect(topo.getPageErrors().length).toBe(0);
  });
});