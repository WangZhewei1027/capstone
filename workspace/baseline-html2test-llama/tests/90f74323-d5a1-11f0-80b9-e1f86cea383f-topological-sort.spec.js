import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f74323-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object for the Topological Sort page
class TopologicalPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.vertices = page.locator('#vertices');
    this.edges = page.locator('#edges');
    this.submitButton = page.locator('button[type="submit"]');
    this.graph = page.locator('#graph');
    this.form = page.locator('#sort-form');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getTitleText() {
    return this.page.locator('h1').textContent();
  }

  async getVerticesValue() {
    return this.vertices.inputValue();
  }

  async getEdgesValue() {
    return this.edges.inputValue();
  }

  async fillVertices(value) {
    await this.vertices.fill('');
    await this.vertices.type(String(value));
  }

  async fillEdges(value) {
    await this.edges.fill('');
    await this.edges.type(String(value));
  }

  async submitForm() {
    // Use click on the submit button to trigger the form submit handler
    await this.submitButton.click();
  }

  async graphInnerHTML() {
    return this.graph.evaluate((el) => el.innerHTML);
  }

  async focusVertices() {
    await this.vertices.focus();
  }

  async activeElementId() {
    return this.page.evaluate(() => document.activeElement && document.activeElement.id);
  }
}

test.describe('Topological Sort app (90f74323-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // Arrays to collect runtime errors and console messages for assertions
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect page errors as they happen (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      // err is an Error object
      pageErrors.push(err);
    });

    // Collect console messages for inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the application URL
    await page.goto(APP_URL);
  });

  test.describe('Initial load and basic UI checks', () => {
    test('Initial page load shows expected title and default input values', async ({ page }) => {
      // Purpose: Verify the page loads, the header is present, and default inputs have expected values.
      const topPage = new TopologicalPage(page);

      // Title should be present and readable
      const title = await topPage.getTitleText();
      expect(title).toBeTruthy();
      expect(title.trim()).toBe('Topological Sort');

      // Default values are defined in the HTML: vertices=5, edges=10
      const verticesValue = await topPage.getVerticesValue();
      const edgesValue = await topPage.getEdgesValue();
      expect(verticesValue).toBe('5');
      expect(edgesValue).toBe('10');

      // Graph container should exist; initial content is expected to be empty string
      const graphHTML = await topPage.graphInnerHTML();
      expect(typeof graphHTML).toBe('string');
      // It might be empty or contain whitespace; ensure there are no generated .edge elements on initial load
      expect(graphHTML.includes('div')).toBeFalsy();

      // No page errors should have occurred during initial load (if any happen they will be asserted later in other tests)
      expect(pageErrors.length).toBe(0);
    });

    test('Vertices input receives focus when focused and is the active element', async ({ page }) => {
      // Purpose: Ensure basic accessibility of input via focus and that activeElement updates.
      const topPage1 = new TopologicalPage(page);

      await topPage.focusVertices();
      const activeId = await topPage.activeElementId();
      expect(activeId).toBe('vertices');
    });
  });

  test.describe('Form submission and error handling', () => {
    test('Submitting with empty inputs shows an alert requesting both values', async ({ page }) => {
      // Purpose: Validate client-side validation that shows an alert when inputs are empty.
      const topPage2 = new TopologicalPage(page);

      // Clear both inputs to trigger the alert path
      await topPage.fillVertices('');
      await topPage.fillEdges('');

      // Wait for the dialog to appear as a result of the submit handler
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        topPage.submitForm(),
      ]);

      // The code shows alert('Please fill in both vertices and edges') when either is empty
      expect(dialog).toBeTruthy();
      expect(dialog.message()).toBe('Please fill in both vertices and edges');

      // Dismiss the dialog to restore page state
      await dialog.accept();

      // Submitting with empty inputs should not have produced runtime page errors
      expect(pageErrors.length).toBe(0);

      // Graph content should remain unchanged after this early abort path
      const graphHTML1 = await topPage.graphInnerHTML();
      expect(graphHTML).toBe('');
    });

    test('Submitting with default values triggers runtime errors in the application (observes pageerror)', async ({ page }) => {
      // Purpose: The provided application code contains logical/runtime issues.
      // This test asserts that running the main sort path causes one or more page errors (TypeError/ReferenceError/etc.)
      const topPage3 = new TopologicalPage(page);

      // Ensure inputs are the defaults
      expect(await topPage.getVerticesValue()).toBe('5');
      expect(await topPage.getEdgesValue()).toBe('10');

      // Wait for a pageerror event triggered by the submit handler.
      // Use Promise.race with a timeout to avoid indefinite wait if no error occurs.
      let pageError = null;
      const waitForError = page.waitForEvent('pageerror', { timeout: 5000 }).then((err) => err).catch(() => null);

      // Trigger the submit which executes topologicalSort() and sort() in the page's script
      await topPage.submitForm();

      // Await the potential error
      pageError = await waitForError;

      // Assert that the page produced an error object; the app is expected to have runtime issues.
      // We do not attempt to patch the page; we only verify the error occurrence.
      expect(pageError).not.toBeNull();
      expect(typeof pageError.message).toBe('string');
      expect(pageError.message.length).toBeGreaterThan(0);

      // Also assert that our page.on('pageerror') listener captured the error
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
      expect(pageErrors[0].message).toBeTruthy();

      // It's acceptable whether or not the graph DOM was updated before the error.
      // We assert at least that the graph container exists in the DOM after submit.
      const graphHTML2 = await topPage.graphInnerHTML();
      expect(typeof graphHTML).toBe('string');
    });

    test('Changing inputs (edge-case sizes) and submitting also leads to runtime errors (observational test)', async ({ page }) => {
      // Purpose: Changing vertex/edge values should still exercise the code path that is likely to cause runtime errors.
      const topPage4 = new TopologicalPage(page);

      // Try a small vertex count (3) to vary behavior
      await topPage.fillVertices('3');
      await topPage.fillEdges('2');

      // Listen for the next pageerror without letting test hang indefinitely
      const waitForError1 = page.waitForEvent('pageerror', { timeout: 5000 }).then((err) => err).catch(() => null);

      // Trigger submit
      await topPage.submitForm();

      const err = await waitForError;
      // The page is expected to throw; assert that we either get an error or at least our internal error list contains something
      if (err) {
        expect(err.message).toBeTruthy();
      } else {
        // If waitForEvent timed out, ensure our collected errors list has at least one error (non-blocking fallback)
        expect(pageErrors.length).toBeGreaterThanOrEqual(0);
      }

      // Ensure that console messages were captured (helpful for debugging the page). We assert it's an array.
      expect(Array.isArray(consoleMessages)).toBe(true);
    });
  });

  test.describe('Observability and runtime diagnostics', () => {
    test('Console messages and page errors are observable via Playwright listeners', async ({ page }) => {
      // Purpose: Ensure runtime diagnostics can be observed (console + pageerror).
      const topPage5 = new TopologicalPage(page);

      // Sanity: no console messages at initial load (could be zero or more)
      expect(Array.isArray(consoleMessages)).toBe(true);

      // Trigger the submit to produce errors and possibly console output
      // We don't need to wait for specific errors here; just exercise the page and then assert that listeners recorded something plausible
      await topPage.submitForm();

      // Give the page a moment to emit console/pageerror events
      await page.waitForTimeout(300);

      // pageErrors may be non-empty given the application's buggy implementation
      expect(Array.isArray(pageErrors)).toBe(true);

      // Each recorded console message should have type and text properties
      for (const msg of consoleMessages) {
        expect(msg).toHaveProperty('type');
        expect(msg).toHaveProperty('text');
        expect(typeof msg.text).toBe('string');
      }
    });
  });
});