import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7673401-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the adjacency list page
class AdjacencyPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.textArea = page.locator('#graphInput');
    this.createButton = page.locator('button[onclick="createAdjacencyList()"]');
    this.outputDiv = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(value) {
    await this.textArea.fill(value);
  }

  async clickCreate() {
    await this.createButton.click();
  }

  async getOutputText() {
    return (await this.outputDiv.innerText()).trim();
  }

  async getOutputJson() {
    const text = await this.getOutputText();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      // Return null when parsing fails so the test can assert parse behavior
      return null;
    }
  }

  async getPlaceholder() {
    return this.textArea.getAttribute('placeholder');
  }

  async getButtonText() {
    return (await this.createButton.innerText()).trim();
  }
}

test.describe('Adjacency List App (f7673401-d5b8-11f0-9ee1-ef07bdc6053d)', () => {
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    // Collect console errors and page errors for assertions
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.afterEach(async () => {
    // After each test ensure that we captured console and page errors arrays for debugging if needed.
    // Tests themselves will assert expected counts.
  });

  test('Initial Idle state renders UI components correctly', async ({ page }) => {
    // Validate that the initial "Idle" state UI elements exist and are correct
    const app = new AdjacencyPage(page);
    await app.goto();

    // Textarea exists and has expected placeholder
    await expect(app.textArea).toBeVisible();
    const placeholder = await app.getPlaceholder();
    expect(placeholder).toBe('e.g., A,B;A,C;B,D;');

    // Button exists and has correct text
    await expect(app.createButton).toBeVisible();
    const btnText = await app.getButtonText();
    expect(btnText).toBe('Create Adjacency List');

    // Output div should be present and initially empty
    await expect(app.outputDiv).toBeVisible();
    const initialOutput = await app.getOutputText();
    expect(initialOutput).toBe('');

    // Ensure no runtime errors were emitted on load (detects unexpected ReferenceError/SyntaxError/TypeError)
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Creates adjacency list from well-formed input and transitions to List Created state', async ({ page }) => {
    // Validate the transition S0_Idle -> S1_ListCreated when clicking the Create button with valid input
    const app = new AdjacencyPage(page);
    await app.goto();

    const input = 'A,B;A,C;B,D;';
    await app.setInput(input);
    await app.clickCreate();

    // The output should contain a pretty-printed JSON adjacency list describing the graph
    const outputJson = await app.getOutputJson();
    expect(outputJson).not.toBeNull();

    // Expected adjacency list object
    const expected = {
      A: ['B', 'C'],
      B: ['D']
    };
    expect(outputJson).toEqual(expected);

    // Check that the output div actually contains JSON text (visual feedback)
    const outputText = await app.getOutputText();
    expect(outputText).toContain('"A": [');
    expect(outputText).toContain('"B"');

    // No page errors or console errors should have occurred during the action
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Handles empty input (edge case) and produces adjacency list with empty source key', async ({ page }) => {
    // This test verifies behavior when the textarea is empty and the user clicks create.
    // The implementation splits by ';' and will produce an entry for an empty source with a null destination in JSON.
    const app = new AdjacencyPage(page);
    await app.goto();

    await app.setInput(''); // empty input
    await app.clickCreate();

    const outputJson = await app.getOutputJson();
    // JSON.stringify converts undefined in arrays to null, thus we expect ["null"] represented as [null] in parsed JSON
    expect(outputJson).toEqual({ "": [null] });

    // Confirm UI shows something (non-empty)
    const outputText = await app.getOutputText();
    expect(outputText.length).toBeGreaterThan(0);

    // Ensure no unhandled runtime errors occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Handles malformed entries with missing destination gracefully', async ({ page }) => {
    // Input contains an edge with only a source and no destination e.g., "C" -> becomes destination undefined -> JSON null
    const app = new AdjacencyPage(page);
    await app.goto();

    const input = 'A,B;C;D,E;';
    await app.setInput(input);
    await app.clickCreate();

    const outputJson = await app.getOutputJson();
    expect(outputJson).not.toBeNull();

    // Expected: A -> [B], C -> [null], D -> [E]
    const expected = {
      A: ['B'],
      C: [null],
      D: ['E']
    };
    expect(outputJson).toEqual(expected);

    // Ensure no runtime errors occurred during processing malformed input
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Multiple clicks recreate adjacency list (no accumulation across runs)', async ({ page }) => {
    // This ensures createAdjacencyList rebuilds adjacencyList each time and does not append to a persistent global object.
    const app = new AdjacencyPage(page);
    await app.goto();

    // First run
    await app.setInput('X,Y;');
    await app.clickCreate();
    let parsed = await app.getOutputJson();
    expect(parsed).toEqual({ X: ['Y'] });

    // Second run with different destination for same source
    await app.setInput('X,Z;');
    await app.clickCreate();
    parsed = await app.getOutputJson();
    expect(parsed).toEqual({ X: ['Z'] });

    // Third run with multiple edges for same source
    await app.setInput('M,N;M,O;');
    await app.clickCreate();
    parsed = await app.getOutputJson();
    expect(parsed).toEqual({ M: ['N', 'O'] });

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Observes console and page errors across interactions (detect unexpected runtime errors)', async ({ page }) => {
    // This test purposefully monitors console and page errors over several interactions.
    // If any ReferenceError/SyntaxError/TypeError occurs at any point, this test will capture it and fail.
    const app = new AdjacencyPage(page);

    // reset collectors
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await app.goto();

    // Perform a sequence of interactions
    await app.setInput('P,Q;');
    await app.clickCreate();

    await app.setInput('R,S;T,;'); // includes a malformed entry T, (missing destination)
    await app.clickCreate();

    await app.setInput(''); // empty again
    await app.clickCreate();

    // After these interactions we expect no uncaught page errors or console errors.
    // If the environment had errors (for example due to a missing function called on entry),
    // they would be present in pageErrors or consoleErrors and cause a test failure here.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.join(' | ')}`).toBe(0);
  });
});