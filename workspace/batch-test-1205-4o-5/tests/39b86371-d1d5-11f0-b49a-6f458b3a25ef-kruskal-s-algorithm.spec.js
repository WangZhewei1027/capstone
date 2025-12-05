import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b86371-d1d5-11f0-b49a-6f458b3a25ef.html';

/**
 * Page Object representing the Kruskal visualization page.
 * Encapsulates common actions and queries to keep tests readable.
 */
class KruskalPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.edgeLocator = page.locator('#graph .edge');
    this.runButton = page.getByRole('button', { name: "Run Kruskal's Algorithm" });
    this.output = page.locator('#output');
  }

  // Click the "Run Kruskal's Algorithm" button
  async clickRun() {
    await this.runButton.click();
  }

  // Number of edge elements rendered in the graph
  async edgeCount() {
    return await this.edgeLocator.count();
  }

  // Return an array of objects describing each .edge element's dataset and inline styles
  async edgesData() {
    const count = await this.edgeCount();
    const results = [];
    for (let i = 0; i < count; i++) {
      const locator = this.edgeLocator.nth(i);
      const data = await locator.evaluate((el) => {
        return {
          weight: el.dataset.weight,
          index: el.dataset.index,
          styleHeight: el.style.height,
          styleLeft: el.style.left,
          styleTop: el.style.top,
          transform: el.style.transform,
          classList: Array.from(el.classList),
        };
      });
      results.push(data);
    }
    return results;
  }

  // Return indices of edges that currently have the 'highlight' class
  async highlightedEdgeIndices() {
    const data1 = await this.edgesData();
    const highlighted = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i].classList.includes('highlight')) highlighted.push(i);
    }
    return highlighted;
  }

  // Get text content of the #output pre element
  async outputText() {
    return await this.output.innerText();
  }

  // Check if Run button is visible and enabled
  async isRunButtonVisibleAndEnabled() {
    return {
      visible: await this.runButton.isVisible(),
      enabled: await this.runButton.isEnabled(),
    };
  }
}

test.describe("Kruskal's Algorithm Visualization (Application ID: 39b86371-d1d5-11f0-b49a-6f458b3a25ef)", () => {
  let consoleMessages;
  let pageErrors;

  // Attach listeners for console and page errors before each test, then navigate to the page.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for inspection by tests
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Collect unhandled page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
  });

  // Basic teardown hook to keep things tidy (no special teardown needed here)
  test.afterEach(async ({ page }) => {
    // Optionally record state for debugging; in tests we assert on consoleMessages and pageErrors
    // No modifications of the page or global state are made.
  });

  test('Initial page load: page structure and controls are present and accessible', async ({ page }) => {
    // Purpose: Verify initial DOM structure, header, graph container, controls and accessibility of the run button.
    const kruskal = new KruskalPage(page);

    // Verify document title and header text are present
    await expect(page).toHaveTitle(/Kruskal's Algorithm Visualization/);
    const header = page.locator('h1');
    await expect(header).toBeVisible();
    await expect(header).toHaveText(/Kruskal's Algorithm Visualization/);

    // Graph container exists and visible
    const graph = page.locator('#graph');
    await expect(graph).toBeVisible();

    // Run button is visible and enabled (accessible)
    const btnState = await kruskal.isRunButtonVisibleAndEnabled();
    expect(btnState.visible, 'Run button should be visible').toBeTruthy();
    expect(btnState.enabled, 'Run button should be enabled').toBeTruthy();

    // No runtime page errors should have occurred during load
    expect(pageErrors.length, 'No page errors should occur on initial load').toBe(0);

    // No console.error messages on load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages expected on initial load').toBe(0);
  });

  test('Initial graph rendering: six edges created with correct dataset attributes and styles', async ({ page }) => {
    // Purpose: Validate setupGraph created edge elements with expected data-weight, data-index and computed heights
    const kruskal1 = new KruskalPage(page);

    const count1 = await kruskal.edgeCount();
    expect(count, 'Expected six .edge elements created by setupGraph').toBe(6);

    const edges = await kruskal.edgesData();

    // Expected weights in the original edges array order
    const expectedWeights = ['10', '15', '5', '20', '25', '30'];
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];

      // dataset.weight should match expected
      expect(e.weight, `Edge ${i} dataset.weight should match`).toBe(expectedWeights[i]);

      // dataset.index should equal string of i
      expect(e.index, `Edge ${i} dataset.index should equal ${i}`).toBe(String(i));

      // inline height style is set to weight * 2 px
      const expectedHeight = `${Number(expectedWeights[i]) * 2}px`;
      expect(e.styleHeight, `Edge ${i} style.height should be ${expectedHeight}`).toBe(expectedHeight);

      // left/top should be present and be px values
      expect(e.styleLeft.endsWith('px'), `Edge ${i} style.left should be in px`).toBeTruthy();
      expect(e.styleTop.endsWith('px'), `Edge ${i} style.top should be in px`).toBeTruthy();

      // transform should contain a rotation value (string)
      expect(typeof e.transform, `Edge ${i} should have a transform string`).toBe('string');
      expect(e.transform.length, `Edge ${i} transform should not be empty`).toBeGreaterThan(0);
    }

    // Confirm no highlights at initial render
    const highlighted1 = await kruskal.highlightedEdgeIndices();
    expect(highlighted.length, 'No edges should be highlighted initially').toBe(0);

    // No console errors and no page errors on initial render
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages expected after initial render').toBe(0);
    expect(pageErrors.length, 'No page errors expected after initial render').toBe(0);
  });

  test('Clicking Run Kruskal button: due to implementation bug no edges become highlighted and output remains empty', async ({ page }) => {
    // Purpose: Validate the visible behavior when the Run button is clicked.
    // The implementation uses edges.indexOf(edge) for both start and end, causing startIndex === endIndex.
    // Because the union-find check uses identical indices, no edges should be selected/highlighted.
    const kruskal2 = new KruskalPage(page);

    // Ensure initial state: output empty
    const preBefore = await kruskal.outputText();
    expect(preBefore, 'Output should be empty before running algorithm').toBe('');

    // Click the run button once
    await kruskal.clickRun();

    // After click: there should still be no highlighted edges due to the bug in the implementation
    const highlightedAfter = await kruskal.highlightedEdgeIndices();
    expect(highlightedAfter.length, 'No edges should be highlighted after running because startIndex === endIndex in the implementation').toBe(0);

    // Output should remain empty because no edges were selected
    const outputText = await kruskal.outputText();
    expect(outputText, 'Output pre should be empty when no edges are selected').toBe('');

    // Confirm no page errors were thrown during the click handler execution
    expect(pageErrors.length, 'No uncaught exceptions should be thrown during runKruskal execution').toBe(0);

    // Confirm there are no console.error messages related to the click (but capture all console logs)
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages expected when clicking Run').toBe(0);
  });

  test('Clicking Run Kruskal multiple times produces consistent behavior (idempotent no-op given current bug)', async ({ page }) => {
    // Purpose: Ensure repeated interactions do not produce unexpected changes or accumulate highlights/output.
    const kruskal3 = new KruskalPage(page);

    // Click several times
    await kruskal.clickRun();
    await kruskal.clickRun();
    await kruskal.clickRun();

    // Still no highlights
    const highlighted2 = await kruskal.highlightedEdgeIndices();
    expect(highlighted.length, 'Repeated runs should not highlight edges given the current implementation bug').toBe(0);

    // Output should remain empty (no selected edges printed)
    const output = await kruskal.outputText();
    expect(output, 'Output should remain empty after multiple runs').toBe('');

    // No page errors expected
    expect(pageErrors.length, 'No page errors should be produced by multiple runs').toBe(0);

    // Ensure console didn't emit errors during multiple clicks
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages expected after multiple runs').toBe(0);
  });

  test('Verify accessibility and visible labels for interactive controls', async ({ page }) => {
    // Purpose: Basic accessibility checks - button has readable name and is focusable
    const kruskal4 = new KruskalPage(page);

    // Button accessible name should match label text
    const runButton = kruskal.runButton;
    await expect(runButton).toHaveAttribute('type', null); // No explicit type is okay; ensure attribute query doesn't throw
    await expect(runButton).toBeVisible();
    await runButton.focus();
    // After focus, the button should still be the active element
    const activeTag = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
    expect(activeTag === 'BUTTON', 'Run button should be focusable and active after focus').toBeTruthy();

    // No page errors or console errors introduced by focusing
    expect(pageErrors.length, 'No page errors should occur when focusing controls').toBe(0);
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should occur when focusing controls').toBe(0);
  });
});