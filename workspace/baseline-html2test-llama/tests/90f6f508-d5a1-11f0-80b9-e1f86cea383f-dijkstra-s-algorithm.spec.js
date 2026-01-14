import { test, expect } from '@playwright/test';

// Test file: 90f6f508-d5a1-11f0-80b9-e1f86cea383f-dijkstra-s-algorithm.spec.js
// Application URL (served by the test runner environment)
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6f508-d5a1-11f0-80b9-e1f86cea383f.html';

// Page Object representing the form and main elements of the page
class DijkstraPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.startInput = page.locator('#start');
    this.endInput = page.locator('#end');
    this.graphTextarea = page.locator('#graph');
    this.form = page.locator('#graph-form');
    this.submitButton = page.locator('button[type="submit"]');
    this.heading = page.locator('h1');
    this.graphContainer = page.locator('#graph-container');
    this.canvas = page.locator('canvas');
  }

  // Fill the form fields
  async fillForm({ start = '', end = '', graph = '' } = {}) {
    await this.startInput.fill(start);
    await this.endInput.fill(end);
    await this.graphTextarea.fill(graph);
  }

  // Click submit and optionally wait for navigation
  async submitAndWaitForNavigation(wait = true) {
    if (wait) {
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'load' }),
        this.submitButton.click(),
      ]);
    } else {
      await this.submitButton.click();
    }
  }
}

test.describe("Dijkstra's Algorithm - Application (ID: 90f6f508-d5a1-11f0-80b9-e1f86cea383f)", () => {
  // Test: initial page load and presence of key DOM elements.
  test('Initial load should render form elements and static content', async ({ page }) => {
    // Capture console errors and page errors that may happen during page load.
    const pageErrors = [];
    const consoleErrors = [];

    // Attach handlers BEFORE navigation to capture errors thrown during script execution on load.
    page.on('pageerror', (err) => {
      // pageerror provides an Error object
      pageErrors.push(String(err && err.message ? err.message : err));
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the application
    await page.goto(APP_URL, { waitUntil: 'load' });

    const app = new DijkstraPage(page);

    // Static content checks
    await expect(app.heading).toBeVisible();
    await expect(app.heading).toHaveText("Dijkstra's Algorithm");

    // Form and inputs should be present and visible
    await expect(app.form).toBeVisible();
    await expect(app.startInput).toBeVisible();
    await expect(app.endInput).toBeVisible();
    await expect(app.graphTextarea).toBeVisible();
    await expect(app.submitButton).toBeVisible();

    // Inputs should have the 'required' attribute per the HTML markup
    await expect(app.startInput).toHaveAttribute('required', '');
    await expect(app.endInput).toHaveAttribute('required', '');
    await expect(app.graphTextarea).toHaveAttribute('required', '');

    // There should be a graph container element in the DOM
    await expect(app.graphContainer).toBeVisible();

    // Because the implementation is broken (script tries to call getContext on a textarea),
    // we expect errors to have occurred during initial execution. Confirm at least one error was captured.
    const combinedErrors = pageErrors.concat(consoleErrors).join(' || ');
    expect(combinedErrors.length).toBeGreaterThan(0);
    // Ensure the errors mention typical failure points for this page (getContext or missing Graph)
    expect(combinedErrors).toMatch(/getContext|Graph is not defined|is not a function|ReferenceError|TypeError/);
  });

  // Test: verify no canvas elements were created (script attempted to getContext on a non-canvas)
  test('No canvas element should exist because getContext was called on a textarea', async ({ page }) => {
    const pageErrors1 = [];
    page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));
    await page.goto(APP_URL, { waitUntil: 'load' });

    const app1 = new DijkstraPage(page);

    // There is no <canvas> in the static HTML; because the script fails early, no canvas should be created dynamically.
    await expect(app.canvas).toHaveCount(0);

    // Confirm the runtime error occurred and mentions getContext or similar
    const joined = pageErrors.join(' || ');
    expect(joined.length).toBeGreaterThan(0);
    expect(joined).toMatch(/getContext|is not a function|TypeError/);
  });

  // Test: interacting with the form inputs works (filling inputs), but the submission will trigger a full page load
  // since the JS event handler is not attached due to the earlier runtime error.
  test('Filling form inputs should update values; submitting triggers a navigation (no JS handler attached)', async ({ page }) => {
    const pageErrors2 = [];
    page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));

    // Attach console listener as well to capture error-level console messages
    const consoleErrors1 = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(APP_URL, { waitUntil: 'load' });
    const app2 = new DijkstraPage(page);

    // Fill the form fields with sample graph data and nodes
    const sampleGraph = 'A,B,1\nB,C,2\nA,C,4';
    await app.fillForm({ start: 'A', end: 'C', graph: sampleGraph });

    // Ensure inputs contain the typed values
    await expect(app.startInput).toHaveValue('A');
    await expect(app.endInput).toHaveValue('C');
    await expect(app.graphTextarea).toHaveValue(sampleGraph);

    // Submit the form and expect a navigation to occur because the JS submit handler never attached
    // We wrap click in waitForNavigation to assert that a navigation does indeed happen (form default behavior).
    // If no navigation occurs, this will timeout and fail the test.
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      app.submitButton.click(),
    ]);

    // After submission/navigation, the page will reload and the same runtime errors are expected again.
    const allErrors = pageErrors.concat(consoleErrors).join(' || ');
    expect(allErrors.length).toBeGreaterThan(0);
    expect(allErrors).toMatch(/getContext|Graph is not defined|ReferenceError|TypeError|is not a function/);
  });

  // Test: verify that attempting to rely on a runtime Graph object will fail (we only observe that the page throws)
  test('Runtime Graph constructor is not available and causes a ReferenceError', async ({ page }) => {
    const pageErrors3 = [];
    page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));
    await page.goto(APP_URL, { waitUntil: 'load' });

    // The script in the page attempts "new Graph(...)" after failing to get a canvas context.
    // Depending on where the execution stops, we expect either a TypeError from getContext or a ReferenceError for Graph.
    const joined1 = pageErrors.join(' || ');
    expect(joined.length).toBeGreaterThan(0);
    // Accept either TypeError or ReferenceError references in the message
    expect(joined).toMatch(/Graph is not defined|getContext|ReferenceError|TypeError|is not a function/);
  });

  // Accessibility-related checks: ensure inputs are associated with labels and have required attributes
  test('Accessibility: labels exist and inputs are required', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });
    const app3 = new DijkstraPage(page);

    // Check that label elements exist and reference the inputs by for attributes where applicable
    const startLabel = page.locator('label[for="start"]');
    const endLabel = page.locator('label[for="end"]');
    const graphLabel = page.locator('label[for="graph"]');

    await expect(startLabel).toBeVisible();
    await expect(endLabel).toBeVisible();
    await expect(graphLabel).toBeVisible();

    // Confirm 'required' is present on inputs (already covered earlier, but included here for clarity)
    await expect(app.startInput).toHaveAttribute('required', '');
    await expect(app.endInput).toHaveAttribute('required', '');
    await expect(app.graphTextarea).toHaveAttribute('required', '');
  });
});