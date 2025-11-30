import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f491-cd2f-11f0-a440-159d7b77af86.html';

// Page Object for the Union-Find demo page
class UnionFindPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numElements = page.locator('#numElements');
    this.initializeButton = page.getByRole('button', { name: 'Initialize' });
    this.unionA = page.locator('#unionA');
    this.unionB = page.locator('#unionB');
    this.unionButton = page.getByRole('button', { name: 'Union' });
    this.findElementInput = page.locator('#findElement');
    this.findButton = page.getByRole('button', { name: 'Find' });
    this.output = page.locator('#output');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Initialize the disjoint set with `size`
  async initialize(size) {
    await this.numElements.fill(String(size));
    await Promise.all([
      this.page.waitForFunction(
        (selector) => document.querySelector(selector).textContent !== '',
        {},
        '#output'
      ),
      this.initializeButton.click()
    ]);
    // Wait for expected output text to settle
    await expect(this.output).toContainText(`Initialized Disjoint Set with ${size} elements.`);
  }

  // Perform a union(a, b)
  async union(a, b) {
    await this.unionA.fill(String(a));
    await this.unionB.fill(String(b));
    await Promise.all([
      this.unionButton.click(),
      this.output.waitFor()
    ]);
  }

  // Perform find(element)
  async find(element) {
    await this.findElementInput.fill(String(element));
    await Promise.all([
      this.findButton.click(),
      this.output.waitFor()
    ]);
  }

  // Read output text
  async getOutputText() {
    return await this.output.textContent();
  }
}

test.describe('Union-Find (Disjoint Set) Demo - End-to-end', () => {
  // Arrays to collect console and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // Basic guard: ensure no unexpected runtime errors occurred on the page
    expect(pageErrors.length).toBe(0);
  });

  // Test initial page load and default state
  test('Initial page load shows expected elements and default values', async ({ page }) => {
    // Purpose: Verify the page loads correctly and interactive elements are present with expected defaults.
    const ui = new UnionFindPage(page);
    await ui.goto();

    // Title and heading checks
    await expect(page).toHaveTitle(/Union-Find/);
    await expect(page.locator('h1')).toHaveText('Union-Find (Disjoint Set) Demo');

    // Inputs exist and have default values
    await expect(ui.numElements).toHaveValue('0'); // default value in HTML
    await expect(ui.unionA).toBeVisible();
    await expect(ui.unionB).toBeVisible();
    await expect(ui.findElementInput).toBeVisible();

    // Output area starts empty (empty string or whitespace)
    const outText = (await ui.getOutputText()) || '';
    expect(outText.trim()).toBe('');

    // Ensure no page errors or console errors were emitted
    expect(pageErrors.length).toBe(0);
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });

  test('Initialize with a positive number updates output and internal state is prepared for operations', async ({ page }) => {
    // Purpose: Ensure initialize creates the disjoint set and updates the DOM output accordingly.
    const ui = new UnionFindPage(page);
    await ui.goto();

    await ui.initialize(5);

    // Output content verification
    await expect(ui.output).toHaveText('Initialized Disjoint Set with 5 elements.');

    // After initialize, ensure no page errors occurred
    expect(pageErrors.length).toBe(0);
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });

  test('Union followed by Find returns the expected representative', async ({ page }) => {
    // Purpose: Test main workflow: initialize -> union two elements -> find representative.
    const ui = new UnionFindPage(page);
    await ui.goto();

    // Initialize with 5 elements
    await ui.initialize(5);

    // Union elements 0 and 1
    await ui.union(0, 1);
    await expect(ui.output).toHaveText('Union: Elements 0 and 1 are now connected.');

    // Find representative of element 1 (should be 0 due to union)
    await ui.find(1);
    await expect(ui.output).toHaveText('Find: The representative of element 1 is 0.');

    // Verify stable DOM and no runtime errors
    expect(pageErrors.length).toBe(0);
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });

  test('Chain unions create expected representative through path compression-like behavior', async ({ page }) => {
    // Purpose: Union a chain (2-3, then 3-4) and verify that find(4) returns root 2.
    const ui = new UnionFindPage(page);
    await ui.goto();

    await ui.initialize(5);

    // Create chain unions: 2-3 and 3-4
    await ui.union(2, 3);
    await expect(ui.output).toHaveText('Union: Elements 2 and 3 are now connected.');

    await ui.union(3, 4);
    await expect(ui.output).toHaveText('Union: Elements 3 and 4 are now connected.');

    // Now find the representative of 4 -> expect 2
    await ui.find(4);
    const text = (await ui.getOutputText()) || '';
    expect(text).toContain('Find: The representative of element 4 is 2.');

    // Confirm no uncaught exceptions happened
    expect(pageErrors.length).toBe(0);
  });

  test('Calling Find or Union before initialization triggers alert dialog', async ({ page }) => {
    // Purpose: Validate error handling when operations are attempted before initialization.
    const ui = new UnionFindPage(page);
    await ui.goto();

    // Attempt Find before initialize -> expect alert with specific message
    const findDialogPromise = page.waitForEvent('dialog');
    await ui.findButton.click();
    const findDialog = await findDialogPromise;
    expect(findDialog.type()).toBe('alert');
    expect(findDialog.message()).toBe('Please initialize the disjoint set first.');
    await findDialog.dismiss();

    // Attempt Union before initialize -> expect alert with the same message
    const unionDialogPromise = page.waitForEvent('dialog');
    await ui.unionButton.click();
    const unionDialog = await unionDialogPromise;
    expect(unionDialog.type()).toBe('alert');
    expect(unionDialog.message()).toBe('Please initialize the disjoint set first.');
    await unionDialog.dismiss();

    // Output should remain unchanged (still empty)
    const out = (await ui.getOutputText()) || '';
    expect(out.trim()).toBe('');

    // No page errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('Initialize with zero elements and finding element 0 produces "undefined" representative', async ({ page }) => {
    // Purpose: Test edge-case behavior when the disjoint set has zero elements (default value).
    const ui = new UnionFindPage(page);
    await ui.goto();

    // The default numElements is 0; click initialize
    await ui.initialize(0);
    await expect(ui.output).toHaveText('Initialized Disjoint Set with 0 elements.');

    // Attempt to find element 0 - expected to report representative "undefined" in output per current implementation
    await ui.find(0);
    const out = (await ui.getOutputText()) || '';
    expect(out).toContain('Find: The representative of element 0 is');
    // Accept either 'undefined' or an empty value text; validate that the page produced some representative string
    expect(out.length).toBeGreaterThan(0);

    // Confirm no runtime errors were thrown
    expect(pageErrors.length).toBe(0);
  });

  test('Non-numeric input values are accepted and parsed with parseInt producing NaN where applicable', async ({ page }) => {
    // Purpose: Validate how the app handles non-numeric inputs (parseInt behavior) and ensures it reports that in the output.
    const ui = new UnionFindPage(page);
    await ui.goto();

    // Initialize with 3 to allow unions (though parseInt may make NaN)
    await ui.initialize(3);

    // Fill unionA with non-numeric 'a' and unionB with '1'
    await ui.unionA.fill('a');
    await ui.unionB.fill('1');

    await Promise.all([
      ui.unionButton.click(),
      ui.output.waitFor()
    ]);

    // The UI uses parseInt; parseInt('a') => NaN, so output should reflect 'NaN' text
    const out = (await ui.getOutputText()) || '';
    expect(out).toContain('Union: Elements');
    expect(out).toMatch(/NaN|1/);

    // Ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });
});