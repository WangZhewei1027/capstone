import { test, expect } from '@playwright/test';

// Page object model for the Floyd-Warshall app
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f74320-d5a1-11f0-80b9-e1f86cea383f.html';
    this.selectors = {
      heading: 'h1',
      description: 'p',
      form: '#graph-form',
      nodesInput: '#nodes',
      edgesTextarea: '#edges',
      submitButton: '#submit-btn',
      graphContainer: '#graph-container',
    };
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Fill the nodes input (string)
  async fillNodes(value) {
    await this.page.fill(this.selectors.nodesInput, value);
  }

  // Fill the edges textarea (string)
  async fillEdges(value) {
    await this.page.fill(this.selectors.edgesTextarea, value);
  }

  // Submit the form by clicking the submit button
  async submit() {
    await Promise.all([
      // It's the user interaction; we don't wait for navigation.
      this.page.click(this.selectors.submitButton),
    ]);
  }

  // Read contents of the graph container
  async getGraphContainerText() {
    return this.page.locator(this.selectors.graphContainer).innerText();
  }

  // Check if a button with specific text exists inside graph container
  async graphContainerHasButtonWithText(text) {
    const locator = this.page.locator(`${this.selectors.graphContainer} >> text="${text}"`);
    return await locator.count() > 0;
  }

  // Get raw innerHTML of graph container
  async getGraphContainerHTML() {
    return this.page.locator(this.selectors.graphContainer).evaluate((el) => el.innerHTML);
  }
}

test.describe('Floyd-Warshall Algorithm Application (UI and runtime behavior)', () => {
  // Arrays to collect console and page errors for assertions
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events
    page.on('console', (msg) => {
      // Record all console messages for later assertions
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Capture unhandled exceptions and errors from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // no-op: listeners are tied to the page and cleared between tests by Playwright
  });

  test('Initial page load shows the form, inputs, and empty graph container', async ({ page }) => {
    // Purpose: Verify the initial state of the application before any interaction.
    const app = new FloydWarshallPage(page);
    await app.goto();

    // Check heading and description exist
    await expect(page.locator(app.selectors.heading)).toHaveText('Floyd-Warshall Algorithm');
    await expect(page.locator(app.selectors.description)).toContainText('Find the shortest path');

    // Check form and interactive controls are present
    await expect(page.locator(app.selectors.form)).toBeVisible();
    await expect(page.locator(app.selectors.nodesInput)).toBeVisible();
    await expect(page.locator(app.selectors.edgesTextarea)).toBeVisible();
    await expect(page.locator(app.selectors.submitButton)).toBeVisible();

    // Graph container should be present but empty initially
    const graphHtml = await app.getGraphContainerHTML();
    expect(graphHtml.trim()).toBe('');
  });

  test('Submitting node/edge input triggers runtime TypeError and no graph output is produced', async ({ page }) => {
    // Purpose: Intentionally exercise the broken implementation to assert the observed runtime error
    // and verify that the DOM does not get updated with graph information due to the error.

    const app1 = new FloydWarshallPage(page);

    // Prepare to collect console and page errors (listeners set up in beforeEach)
    await app.goto();

    // Fill inputs with values that look valid to a user but will cause runtime issues in the page script
    // Use node labels that are non-numeric (original code tries to map them to Number)
    await app.fillNodes('A,B,C');
    // Provide edges lines. Note: The page code expects "A -> B" style; we include values that might be processed.
    await app.fillEdges('A -> B,1\nB -> C,2');

    // Submit the form
    await app.submit();

    // Allow a brief moment for the page script to run and for errors to be emitted
    await page.waitForTimeout(200);

    // The implementation contains mistakes that will produce a runtime TypeError (edge.split is not a function).
    // Assert that at least one pageerror was captured.
    expect(pageErrors.length).toBeGreaterThan(0);

    // Assert that at least one of the captured errors is a TypeError and mentions "split" or "is not a function"
    const hasTypeErrorSplit = pageErrors.some((err) => {
      const msg = String(err.message || err);
      return /TypeError/i.test(msg) || /(is not a function)|(split is not a function)/i.test(msg);
    });
    expect(hasTypeErrorSplit).toBeTruthy();

    // Also assert that console errors contain relevant messages (if any were emitted)
    const hasConsoleError = consoleMessages.some((c) => c.type === 'error' || /TypeError|is not a function/i.test(c.text));
    expect(hasConsoleError || hasTypeErrorSplit).toBeTruthy();

    // Because of the error, the graphContainer should remain empty (the code which populates it is after the broken loop)
    const graphHtml1 = await app.getGraphContainerHTML();
    // It may be empty or unchanged; assert it does not contain expected graph output like "A:" or JSON graph strings.
    expect(graphHtml).not.toContain('"A"');
    expect(graphHtml.trim()).toBe('');
  });

  test('Edge case: empty nodes and edges inputs still produce a runtime error and no DOM mutation', async ({ page }) => {
    // Purpose: Test how the application behaves with empty inputs (edge-case). The implementation is buggy;
    // we assert that an error happens and there is no insertion of graph or shortest path UI.

    const app2 = new FloydWarshallPage(page);
    await app.goto();

    // Ensure fields are empty (they should be by default, but explicitly clear them)
    await app.fillNodes('');
    await app.fillEdges('');

    // Submit the form
    await app.submit();

    // Wait briefly to capture errors
    await page.waitForTimeout(200);

    // Expect at least one page error occurred
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // Ensure graph container still contains no content (no paragraphs, no buttons added)
    const graphHtml2 = await app.getGraphContainerHTML();
    expect(graphHtml.trim()).toBe('');

    // Confirm that there is no 'Show Shortest Path' button added due to failure
    const hasShowShortestButton = await app.graphContainerHasButtonWithText('Show Shortest Path');
    expect(hasShowShortestButton).toBeFalsy();
  });

  test('Before submission there is no shortest-path button; after a failing submission none is added', async ({ page }) => {
    // Purpose: Check UI elements related to shortest path controls are not present before submit
    // and also verify they are not present after a runtime error during submit.

    const app3 = new FloydWarshallPage(page);
    await app.goto();

    // Ensure no 'Show Shortest Path' button exists initially
    const beforeExists = await app.graphContainerHasButtonWithText('Show Shortest Path');
    expect(beforeExists).toBeFalsy();

    // Fill with sample input that will trigger the runtime error
    await app.fillNodes('1,2');
    await app.fillEdges('1 -> 2,5');

    // Submit
    await app.submit();
    await page.waitForTimeout(200);

    // After failing submit, still no such button should be present
    const afterExists = await app.graphContainerHasButtonWithText('Show Shortest Path');
    expect(afterExists).toBeFalsy();

    // Additionally, assert that an error was recorded (pageErrors)
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
  });
});