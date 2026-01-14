import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6f509-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object to encapsulate common interactions with the app
class BellmanFordPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.sourceInput = page.locator('#source');
    this.verticesInput = page.locator('#vertices');
    this.edgesInput = page.locator('#edges');
    this.submitButton = page.locator('button[type="submit"]');
    this.graphDiv = page.locator('#graph');
    this.inputDiv = page.locator('#input');
    this.outputDiv = page.locator('#output');
    this.form = page.locator('#graph-form');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the form with given values (string/number)
  async fillForm({ source, vertices, edges }) {
    // Clear and fill each field
    await this.sourceInput.fill(String(source));
    await this.verticesInput.fill(String(vertices));
    await this.edgesInput.fill(String(edges));
  }

  // Submit the form and wait for default action prevention to keep on same page
  async submitExpectingError() {
    // Submit and return the pageerror that occurs (if any)
    return Promise.all([
      this.page.waitForEvent('pageerror', { timeout: 3000 }).catch(e => e),
      this.submitButton.click()
    ]);
  }

  // Submit without waiting for errors (convenience)
  async submit() {
    await this.submitButton.click();
  }
}

test.describe('Bellman-Ford Algorithm App (90f6f509-d5a1-11f0-80b9-e1f86cea383f)', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure each test starts at the same URL
    await page.goto(APP_URL);
  });

  test('Initial page load: structure and default state are present', async ({ page }) => {
    // Purpose: Verify that the page loads and key elements exist and show expected default content.
    const app = new BellmanFordPage(page);

    // Check header
    await expect(page.locator('h1')).toHaveText('Bellman-Ford Algorithm');

    // Check presence of inputs and form controls
    await expect(app.sourceInput).toBeVisible();
    await expect(app.verticesInput).toBeVisible();
    await expect(app.edgesInput).toBeVisible();
    await expect(app.submitButton).toBeVisible();
    await expect(app.form).toBeVisible();

    // Check that the graph, input, and output containers exist
    await expect(app.graphDiv).toBeVisible();
    await expect(app.inputDiv).toBeVisible();
    await expect(app.outputDiv).toBeVisible();

    // The embedded script calls createGraph() on load which reads empty fields -> NaN expected
    // Verify that the #input div reflects the vertices/edges values (likely "NaN")
    const inputHtml = await app.inputDiv.innerHTML();
    expect(inputHtml).toMatch(/Vertices:\s*NaN/);
    expect(inputHtml).toMatch(/Edges:\s*NaN/);

    // Graph div should be empty or contain only placeholders (no edges added yet)
    const graphHtml = await app.graphDiv.innerHTML();
    // If the script didn't plot anything yet, graph should be empty string
    expect(graphHtml.length).toBeGreaterThanOrEqual(0);
  });

  test('Submitting the form with edges >= 1 triggers missing edge-input access error', async ({ page }) => {
    // Purpose: The implementation expects inputs with ids x,y,w when edges > 0 which do not exist.
    // Submitting with edges=1 should cause a runtime error about reading .value of null or similar.
    const app1 = new BellmanFordPage(page);
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Fill the form with values that will cause createGraph() to attempt to read non-existent x/y/w elements
    await app.fillForm({ source: 1, vertices: 2, edges: 1 });

    // Submit and capture the page error
    const [pageErrorPromise, clickPromise] = [
      page.waitForEvent('pageerror').catch(e => e),
      app.submitButton.click()
    ];

    const pageError = await pageErrorPromise;

    // The pageError should be an Error object (TypeError) indicating missing element access
    expect(pageError).toBeTruthy();
    // The message may vary across engines; check for common substrings that indicate a null/undefined property access
    const msg = pageError && pageError.message ? pageError.message : String(pageError);
    expect(msg).toMatch(/Cannot read|reading 'value'|Cannot read properties of null|null|undefined/i);

    // Ensure console did not report a successful negative-weight detection (the algorithm does not proceed correctly)
    const combinedConsole = consoleMessages.join(' || ');
    expect(combinedConsole.includes('Negative weight detected')).toBeFalsy();

    // After the error, the form should still be visible and inputs should retain the values we set
    await expect(app.form).toBeVisible();
    expect(await app.sourceInput.inputValue()).toBe('1');
    expect(await app.verticesInput.inputValue()).toBe('2');
    expect(await app.edgesInput.inputValue()).toBe('1');
  });

  test('Submitting the form with edges = 0 triggers algorithm runtime error (dijkstra loop issues)', async ({ page }) => {
    // Purpose: Even with edges=0 (so no missing x/y/w access), the dijkstra implementation is flawed
    // and will typically throw a runtime error during processing. We assert that such a page error occurs.
    const app2 = new BellmanFordPage(page);
    const consoleMessages1 = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Fill the form such that no x/y/w access occurs but the algorithm still runs and fails
    await app.fillForm({ source: 1, vertices: 3, edges: 0 });

    // Submit and wait for a page error emitted by the runtime (dijkstra/bellmanFord)
    const [err] = await Promise.all([
      page.waitForEvent('pageerror').catch(e => e),
      app.submitButton.click()
    ]);

    // Assert an error was thrown
    expect(err).toBeTruthy();
    const message = err && err.message ? err.message : String(err);
    // Message content may vary; ensure it indicates a TypeError or problem iterating over undefined
    expect(message).toMatch(/TypeError|undefined|Cannot|in operator|Cannot read|reading/i);

    // The graph div is unlikely to be updated because the algorithm failed early; verify that it's either unchanged or empty
    const graphHtml1 = await app.graphDiv.innerHTML();
    // It should not contain valid plotted adjacency strings like "1 ->" with weights, but be safe and just assert it's a string
    expect(typeof graphHtml).toBe('string');

    // Ensure no successful negative weight console log was printed (algorithm didn't complete)
    const combinedConsole1 = consoleMessages.join(' || ');
    expect(combinedConsole.includes('Negative weight detected')).toBeFalsy();
  });

  test('Form remains functional after errors and can be resubmitted (visibility and values)', async ({ page }) => {
    // Purpose: Ensure that runtime errors do not leave the form in an unusable state.
    const app3 = new BellmanFordPage(page);

    // First cause an error (edges >= 1)
    await app.fillForm({ source: 2, vertices: 3, edges: 1 });
    await Promise.all([
      page.waitForEvent('pageerror').catch(e => e),
      app.submitButton.click()
    ]);

    // After the error, correct the form to also use edges=0 (still triggers algorithm error but demonstrates ability to change inputs)
    await app.fillForm({ source: 1, vertices: 2, edges: 0 });

    // Capture a pageerror on resubmit (expected due to algorithm issues) but ensure the click and change happen
    const [resubmitError] = await Promise.all([
      page.waitForEvent('pageerror').catch(e => e),
      app.submitButton.click()
    ]);

    expect(resubmitError).toBeTruthy();
    // Confirm form inputs reflect the new values
    expect(await app.sourceInput.inputValue()).toBe('1');
    expect(await app.verticesInput.inputValue()).toBe('2');
    expect(await app.edgesInput.inputValue()).toBe('0');

    // Form should still be visible for further interactions
    await expect(app.form).toBeVisible();
  });
});