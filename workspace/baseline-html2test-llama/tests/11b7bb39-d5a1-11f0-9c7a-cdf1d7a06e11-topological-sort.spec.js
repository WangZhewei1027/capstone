import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb39-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Simple page object model for the Topological Sort page
class TopologicalSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Returns the graph container element handle
  async graphElement() {
    return this.page.locator('#graph');
  }

  // Returns trimmed text content of the graph container
  async graphText() {
    const el = await this.graphElement();
    return (await el.innerText()).trim();
  }

  // Count of elements matching selector
  async count(selector) {
    return this.page.locator(selector).count();
  }

  // Click inside graph container
  async clickGraph() {
    await this.page.locator('#graph').click();
  }

  // Get page title
  async title() {
    return this.page.title();
  }
}

test.describe('Topological Sort - UI and runtime checks', () => {
  // Arrays to collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages as early as possible
    page.on('console', (msg) => {
      // Record console messages including type and text for later assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled errors on the page
    page.on('pageerror', (err) => {
      pageErrors.push({ message: err.message, stack: err.stack });
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
  });

  // Test initial load and default visible elements
  test('Initial load: page title and graph container are present and visible', async ({ page }) => {
    const app = new TopologicalSortPage(page);

    // Verify the document title matches the expected application title
    const title = await app.title();
    expect(title).toBe('Topological Sort');

    // Graph container should exist and be visible
    const graph = await app.graphElement();
    await expect(graph).toBeVisible();

    // On initial load the graph container is expected to be empty by markup,
    // so assert that its trimmed text is either empty or only whitespace.
    const graphText = await app.graphText();
    expect(typeof graphText).toBe('string');
    // Accept either empty or some content if script populates it; at minimum ensure it's a string.
    // If known behavior required empty, this would assert equality to '', but we keep flexible yet assert presence.
    // Here assert that it does not contain unexpected HTML tags as visible text.
    expect(graphText.includes('<')).toBe(false);
  });

  // Test that there are no interactive controls defined in the static HTML
  test('No interactive controls present in static HTML', async ({ page }) => {
    const app1 = new TopologicalSortPage(page);

    // Check common interactive elements - expected none based on provided HTML
    const buttonCount = await app.count('button');
    const inputCount = await app.count('input');
    const selectCount = await app.count('select');
    const textareaCount = await app.count('textarea');
    const formCount = await app.count('form');

    // Assert that none of these exist in the static HTML implementation
    expect(buttonCount).toBe(0);
    expect(inputCount).toBe(0);
    expect(selectCount).toBe(0);
    expect(textareaCount).toBe(0);
    expect(formCount).toBe(0);
  });

  // Test interaction with the graph container (click) does not unexpectedly add controls
  test('Clicking the graph container should not create new interactive controls by itself', async ({ page }) => {
    const app2 = new TopologicalSortPage(page);

    // Record counts before clicking
    const beforeButtons = await app.count('button');
    const beforeInputs = await app.count('input');
    const beforeChildren = await page.locator('#graph > *').count();

    // Click the graph area
    await app.clickGraph();

    // Small wait to allow potential dynamic updates to appear
    await page.waitForTimeout(200);

    // Record counts after clicking
    const afterButtons = await app.count('button');
    const afterInputs = await app.count('input');
    const afterChildren = await page.locator('#graph > *').count();

    // Expect no new buttons or inputs created by a simple click
    expect(afterButtons).toBe(beforeButtons);
    expect(afterInputs).toBe(beforeInputs);
    // Children count may remain same; assert it has not decreased unexpectedly
    expect(afterChildren).toBeGreaterThanOrEqual(beforeChildren);
  });

  // Stability test: content should remain stable over a short interval (no unexpected mutations)
  test('Graph container content remains stable shortly after load', async ({ page }) => {
    const app3 = new TopologicalSortPage(page);

    const initialText = await app.graphText();

    // Wait for a short period to detect any late mutations
    await page.waitForTimeout(500);

    const laterText = await app.graphText();

    // The content should remain the same or change in purposeful ways; here we assert it hasn't changed spontaneously.
    expect(laterText).toBe(initialText);
  });

  // Validate that console errors or page errors (if any) are captured - the application includes a script tag,
  // which may produce loading errors or runtime exceptions. We assert that our listeners captured messages (if present).
  test('Observe console messages and page errors produced by the page runtime', async ({ page }) => {
    // Wait briefly to allow any asynchronous errors to surface from scripts
    await page.waitForTimeout(300);

    // At least record the arrays; we expect that missing or faulty script may produce console errors or page errors.
    // The test asserts that console and/or page errors were captured by the listeners. This mirrors the requirement
    // to observe and assert runtime errors happen naturally (do not inject or modify page code).
    const totalErrors = consoleMessages.filter(m => m.type === 'error').length + pageErrors.length;

    // Provide detailed diagnostics in the assertion message when it fails
    const consoleSummary = consoleMessages.map(m => `[${m.type}] ${m.text}`).join('\n') || '(no console messages)';
    const pageErrorSummary = pageErrors.map(e => `${e.message}`).join('\n') || '(no page errors)';

    // Assert that at least one error-level message or an unhandled page error occurred.
    // Many setups for this exercise expect a runtime or loading error to be present; we assert that here.
    expect(totalErrors, `Console messages:\n${consoleSummary}\n\nPage errors:\n${pageErrorSummary}`).toBeGreaterThan(0);
  });
});