import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6f507-d5a1-11f0-80b9-e1f86cea383f.html';

// Simple page object to encapsulate interactions with the BFS demo page.
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#graph');
    this.button = page.locator('#bfs-button');
    this.container = page.locator('#graph-container');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(value) {
    await this.input.fill(value);
  }

  async clickFindBFS() {
    await this.button.click();
  }

  async getContainerChildCount() {
    return await this.container.locator('div').count();
  }

  async getInputPlaceholder() {
    return await this.input.getAttribute('placeholder');
  }

  async getInputValue() {
    return await this.input.inputValue();
  }
}

test.describe('Breadth-First Search (BFS) Application - UI and runtime checks', () => {
  // Each test gets a fresh page fixture from Playwright, no shared state.
  test.beforeEach(async ({ page }) => {
    // No-op: leaving room for future common setup if needed.
  });

  // Test initial page load and default state
  test('Initial load: elements visible, input placeholder correct, graph container empty', async ({ page }) => {
    const app = new GraphPage(page);
    // Navigate to the app
    await app.goto();

    // Assert that the input, button and container are present and visible
    await expect(app.input).toBeVisible();
    await expect(app.button).toBeVisible();
    await expect(app.container).toBeVisible();

    // Verify placeholder text of the input
    const placeholder = await app.getInputPlaceholder();
    expect(placeholder).toBe('Enter vertices separated by space');

    // Input value should be empty by default
    const value = await app.getInputValue();
    expect(value).toBe('');

    // The graph container should initially be empty (no rows created)
    const childCount = await app.getContainerChildCount();
    expect(childCount).toBe(0);
  });

  // Test clicking BFS button with empty input: should log "Graph does not exist." and produce no page errors
  test('Click BFS with empty input logs "Graph does not exist." and no runtime errors', async ({ page }) => {
    const app1 = new GraphPage(page);
    await app.goto();

    // Prepare to capture console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Click the BFS button; since graph is empty, main() should log "Graph does not exist."
    const [consoleEvent] = await Promise.all([
      page.waitForEvent('console', { predicate: (m) => m.text().includes('Graph does not exist.') }),
      app.clickFindBFS(),
    ]);

    // Confirm the console event text
    expect(consoleEvent.text()).toContain('Graph does not exist.');
    // Our captured consoleMessages should include that message
    expect(consoleMessages.some((t) => t.includes('Graph does not exist.'))).toBeTruthy();

    // There should be no uncaught page errors for this interaction
    expect(pageErrors.length).toBe(0);

    // DOM should remain unchanged (graph container still empty)
    const childCount1 = await app.getContainerChildCount();
    expect(childCount).toBe(0);
  });

  // Test clicking BFS with a non-empty input (tokens): should still log "Graph does not exist."
  test('Click BFS with tokens input still logs "Graph does not exist." when graph is not prepopulated', async ({ page }) => {
    const app2 = new GraphPage(page);
    await app.goto();

    // Capture console output
    const consoleMessages1 = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));

    // Enter a string with multiple tokens; main() uses the last token as start
    await app.setInput('A B C');
    await app.clickFindBFS();

    // Wait for the console message and assert it occurred
    await page.waitForEvent('console', { predicate: (m) => m.text().includes('Graph does not exist.') });
    expect(consoleMessages.some((t) => t.includes('Graph does not exist.'))).toBeTruthy();

    // Still no rows created in graph container
    const count = await app.getContainerChildCount();
    expect(count).toBe(0);
  });

  // Critical runtime test: directly invoking the existing bfs function should produce a TypeError
  // when the internal graph has no entries for the provided start vertex. This validates that
  // uncaught runtime errors can occur naturally and are observable.
  test('Direct invocation of bfs(start) when graph has no neighbors produces a TypeError (observed via page error and evaluate rejection)', async ({ page }) => {
    const app3 = new GraphPage(page);
    await app.goto();

    // Capture page error events emitted by the page
    const pageErrors1 = [];
    page.on('pageerror', (error) => {
      // store the Error object for assertions
      pageErrors.push(error);
    });

    // Attempt to call the bfs function from the page context with a vertex that has no entry in graph.
    // Because graph[vertex] is undefined, iterating for (... of graph[vertex]) will cause a TypeError.
    let evalError = null;
    try {
      // Note: we intentionally do not guard inside the page; let the runtime error occur naturally.
      await page.evaluate(() => {
        // Call the bfs function defined in the page's script (this is not injecting new globals).
        // We pass a vertex name unlikely to exist.
        bfs('nonexistent_vertex_for_test');
      });
    } catch (e) {
      // The evaluation is expected to reject; capture the error thrown by Playwright evaluate.
      evalError = e;
    }

    // The evaluation should have thrown an error
    expect(evalError).not.toBeNull();

    // The evaluation-level error message should indicate a TypeError came from the page evaluation.
    // Different browsers/platforms include slightly different messages; we check for "TypeError".
    expect(String(evalError.message)).toMatch(/TypeError/);

    // The pageerror event(s) should have captured at least one Error object corresponding to the runtime issue.
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // At least one of the captured page errors should be a TypeError (or include "TypeError" in its message)
    const hasTypeError = pageErrors.some((err) => {
      // err.name may be "TypeError" or the message may include it depending on environment
      if (err && err.name === 'TypeError') return true;
      if (err && String(err.message).includes('TypeError')) return true;
      // Some environments encode the type in the toString
      if (String(err).includes('TypeError')) return true;
      return false;
    });
    expect(hasTypeError).toBeTruthy();
  });

  // Additional accessibility and behavior check: verify the button has an accessible name and input is focusable
  test('Accessibility: input is focusable and button has accessible role/name', async ({ page }) => {
    const app4 = new GraphPage(page);
    await app.goto();

    // The input should be focusable (can receive focus)
    await app.input.focus();
    await expect(app.input).toBeFocused();

    // The BFS button should be exposed as a button with accessible name "Find BFS"
    // Playwright's getByRole can be used but to keep direct DOM checks:
    const buttonText = await app.button.textContent();
    expect(buttonText.trim()).toBe('Find BFS');

    // Clicking the button while input is focused should still trigger the same "Graph does not exist." behavior
    const [consoleEvent] = await Promise.all([
      page.waitForEvent('console', { predicate: (m) => m.text().includes('Graph does not exist.') }),
      app.clickFindBFS(),
    ]);
    expect(consoleEvent.text()).toContain('Graph does not exist.');
  });
});