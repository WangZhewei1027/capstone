import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b88a80-d1d5-11f0-b49a-6f458b3a25ef.html';

// Simple page object encapsulating selectors and common actions for the Topological Sort app
class TopologicalSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#edgesInput';
    this.buttonSelector = 'button';
    this.outputSelector = '#output';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillEdges(value) {
    await this.page.fill(this.inputSelector, value);
  }

  async clickSort() {
    await this.page.click(this.buttonSelector);
  }

  async getOutputItems() {
    return await this.page.$$(`${this.outputSelector} li`);
  }

  async getOutputTexts() {
    const items = await this.getOutputItems();
    return Promise.all(items.map(item => item.textContent()));
  }

  async isButtonVisibleAndEnabled() {
    const button = await this.page.$(this.buttonSelector);
    if (!button) return false;
    return (await button.isVisible()) && !(await button.isDisabled());
  }
}

test.describe('Topological Sort Visualization - E2E', () => {
  // Arrays to collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console 'error' messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture unhandled exceptions on the page
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Navigate to the application
    const topo = new TopologicalSortPage(page);
    await topo.goto();
  });

  test.afterEach(async ({}, testInfo) => {
    // If there were console or page errors, print them as test attachments to help debugging
    if (consoleErrors.length > 0) {
      testInfo.attach('console-errors', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
    }
    if (pageErrors.length > 0) {
      testInfo.attach('page-errors', { body: pageErrors.join('\n'), contentType: 'text/plain' });
    }
  });

  test('Initial page load shows expected elements and default empty state', async ({ page }) => {
    // Purpose: Verify the page loads correctly with the input, button and empty output area
    const topo1 = new TopologicalSortPage(page);

    // Verify title is present and readable
    const title = await page.textContent('h1');
    expect(title).toBeTruthy();
    expect(title.trim()).toBe('Topological Sort Visualization');

    // Input should be visible and empty by default
    const inputValue = await page.inputValue(topo.inputSelector);
    expect(inputValue).toBe('');

    // Sort button should be visible and enabled
    const buttonOk = await topo.isButtonVisibleAndEnabled();
    expect(buttonOk).toBe(true);

    // Output UL should exist and be empty (no li children)
    const outputItems = await topo.getOutputItems();
    expect(outputItems.length).toBe(0);

    // There should be no console error messages nor page errors on initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Performs topological sort for a simple DAG (A> B, B> C, A> C)', async ({ page }) => {
    // Purpose: Validate correct ordering for a straightforward DAG input and DOM update
    const topo2 = new TopologicalSortPage(page);

    // Provide input with varied spacing to ensure trimming works
    await topo.fillEdges('A> B, B> C, A> C');
    await topo.clickSort();

    // Wait for DOM to update - expect three list items
    await page.waitForSelector('#output li');

    const texts = (await topo.getOutputTexts()).map(t => (t || '').trim());
    // Expect three items: A, B, C in a valid topological order.
    // The implemented algorithm will push nodes with inDegree 0 first; A should appear before B and C.
    expect(texts.length).toBe(3);
    expect(texts[0]).toBe('A');
    // After A, B must come before C due to B->C, but A->C also exists; so B then C is expected.
    expect(texts[1]).toBe('B');
    expect(texts[2]).toBe('C');

    // No runtime console or page errors should have occurred during this interaction
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Detects cyclic graph and displays error message', async ({ page }) => {
    // Purpose: Ensure cycle detection path is triggered and user-friendly message is shown
    const topo3 = new TopologicalSortPage(page);

    // Create a simple cycle A>B, B>A
    await topo.fillEdges('A> B, B> A');
    await topo.clickSort();

    // Wait for output update
    await page.waitForSelector('#output li');

    const texts1 = (await topo.getOutputTexts()).map(t => (t || '').trim());
    // The implementation places a single li with a message when cycle detected
    expect(texts.length).toBe(1);
    expect(texts[0]).toBe('Graph is cyclic, topological sort not possible.');

    // No unexpected console or page errors should have occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Handles simple single-edge graph and produces two nodes in correct order', async ({ page }) => {
    // Purpose: Validate simple edge X> Y is processed and displayed as X then Y
    const topo4 = new TopologicalSortPage(page);

    await topo.fillEdges('X> Y');
    await topo.clickSort();

    await page.waitForSelector('#output li');

    const texts2 = (await topo.getOutputTexts()).map(t => (t || '').trim());
    expect(texts.length).toBe(2);
    expect(texts[0]).toBe('X');
    expect(texts[1]).toBe('Y');

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Trims whitespace around nodes and tolerates varied spacing', async ({ page }) => {
    // Purpose: Ensure node names are trimmed and processed correctly regardless of spaces
    const topo5 = new TopologicalSortPage(page);

    // Intentionally mixed spacing
    await topo.fillEdges('  M > N ,  P>Q , M > Q  ');
    await topo.clickSort();

    await page.waitForSelector('#output li');

    const texts3 = (await topo.getOutputTexts()).map(t => (t || '').trim());

    // Expect all nodes M, P, N, Q in an order that respects edges.
    // M must come before N and Q; P before Q. One valid order: M, P, N, Q or M, N, P, Q depending on insertion.
    // Validate constraints rather than exact full ordering:
    expect(texts).toContain('M');
    expect(texts).toContain('N');
    expect(texts).toContain('P');
    expect(texts).toContain('Q');

    // Check ordering constraints: index(M) < index(N) and index(M) < index(Q) and index(P) < index(Q)
    const idx = (node) => texts.indexOf(node);
    expect(idx('M')).toBeGreaterThanOrEqual(0);
    expect(idx('N')).toBeGreaterThanOrEqual(0);
    expect(idx('P')).toBeGreaterThanOrEqual(0);
    expect(idx('Q')).toBeGreaterThanOrEqual(0);

    expect(idx('M')).toBeLessThan(idx('N'));
    expect(idx('M')).toBeLessThan(idx('Q'));
    expect(idx('P')).toBeLessThan(idx('Q'));

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Handles empty input gracefully (no unexpected crashes) and produces deterministic output items', async ({ page }) => {
    // Purpose: Exercise edge case of empty input. The implementation may create nodes like "" or "undefined" but must not throw.
    const topo6 = new TopologicalSortPage(page);

    // Provide an empty string input
    await topo.fillEdges('');
    await topo.clickSort();

    // Wait briefly for any DOM update (if any)
    // The implementation may still add list items for empty nodes; assert that no uncaught exceptions occurred
    // and that the output is a set of <li> items (possibly empty or with placeholder text).
    // We will not enforce exact content here, only that the app remained responsive and no page errors occurred.
    await page.waitForTimeout(100); // give small time for DOM operations to complete

    // Capture whatever items are present
    const items1 = await topo.getOutputItems();
    // The application should not throw; even if items are present they will be rendered.
    expect(items).not.toBeNull();

    // Assert no runtime console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});