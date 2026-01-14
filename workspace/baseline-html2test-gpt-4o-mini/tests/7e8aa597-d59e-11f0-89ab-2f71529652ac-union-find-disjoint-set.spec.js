import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa597-d59e-11f0-89ab-2f71529652ac.html';

// Page Object Model for the Union-Find page
class UnionFindPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input1 = page.locator('#input1');
    this.input2 = page.locator('#input2');
    this.unionButton = page.locator('#unionButton');
    this.outputDiv = page.locator('#output');
    this.header = page.locator('h1');
  }

  // Navigate to the app url
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the two numeric inputs
  async setInputs(a, b) {
    await this.input1.fill(String(a));
    await this.input2.fill(String(b));
  }

  // Click the union button and optionally handle dialog via waitForEvent externally
  async clickUnion() {
    await this.unionButton.click();
  }

  // Read the displayed set strings from the output area
  async getDisplayedSets() {
    // Return an array of trimmed text contents for each child div
    const children = this.outputDiv.locator('div');
    const count = await children.count();
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push((await children.nth(i).innerText()).trim());
    }
    return results;
  }

  // Convenience: check visibility of main controls
  async controlsVisible() {
    return {
      input1Visible: await this.input1.isVisible(),
      input2Visible: await this.input2.isVisible(),
      buttonVisible: await this.unionButton.isVisible()
    };
  }
}

test.describe('Union-Find (Disjoint Set) Visualization - E2E', () => {
  // Track console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // store the text for later assertions
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the page before each test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test assert there were no unexpected runtime errors
    // This validates that loading and interactions did not produce console/page errors.
    // If the application intentionally throws, these assertions will report them.
    expect(consoleErrors, `No console.error messages should have been emitted`).toHaveLength(0);
    expect(pageErrors, `No uncaught page errors should have occurred`).toHaveLength(0);
  });

  test('Initial load: page elements are present and output is empty by default', async ({ page }) => {
    // Purpose: Verify the page loads, main controls are visible, and there's no initial output
    const ufPage = new UnionFindPage(page);
    await ufPage.goto();

    // Check header/title text
    await expect(ufPage.header).toHaveText('Union-Find (Disjoint Set) Visualization');

    // Controls visibility
    const controls = await ufPage.controlsVisible();
    expect(controls.input1Visible).toBe(true);
    expect(controls.input2Visible).toBe(true);
    expect(controls.buttonVisible).toBe(true);

    // Output should be empty before any unions (displaySets is only invoked after clicking union)
    const displayed = await ufPage.getDisplayedSets();
    expect(Array.isArray(displayed)).toBe(true);
    expect(displayed.length).toBe(0);
  });

  test('Perform a union on two distinct elements and verify displayed sets update', async ({ page }) => {
    // Purpose: Test a successful union of 1 and 2 and verify the output shows { 1, 2 } plus singletons
    const ufPage1 = new UnionFindPage(page);
    await ufPage.goto();

    // Enter 1 and 2, click union
    await ufPage.setInputs(1, 2);
    await ufPage.clickUnion();

    // After the click, displaySets() is called and output should be populated
    const displayed1 = await ufPage.getDisplayedSets();
    // There should be 9 sets now (10 elements, one union collapsed two elements into one set)
    expect(displayed.length).toBe(9);

    // One of the displayed strings must be "{ 1, 2 }"
    expect(displayed).toContain('{ 1, 2 }');

    // Also check that single-element sets like "{ 0 }" and "{ 3 }" exist
    expect(displayed).toContain('{ 0 }');
    expect(displayed).toContain('{ 3 }');
  });

  test('Chain unions: union(2,3) after union(1,2) yields a set { 1, 2, 3 }', async ({ page }) => {
    // Purpose: Verify union operations are transitive / maintain structure correctly
    const ufPage2 = new UnionFindPage(page);
    await ufPage.goto();

    // First union 1 and 2
    await ufPage.setInputs(1, 2);
    await ufPage.clickUnion();

    // Then union 2 and 3
    await ufPage.setInputs(2, 3);
    await ufPage.clickUnion();

    // Now we expect a combined set with 1,2,3
    const displayed2 = await ufPage.getDisplayedSets();
    // There should be 8 sets (10 elements -> merged two then third => 10 - 2 merges = 8)
    expect(displayed.length).toBe(8);
    expect(displayed).toContain('{ 1, 2, 3 }');
  });

  test('Union of elements already in the same set does not change displayed sets', async ({ page }) => {
    // Purpose: Ensure redundant union calls do not create duplicate entries or change content
    const ufPage3 = new UnionFindPage(page);
    await ufPage.goto();

    // Create a small set: 4 with 5, then 5 with 6 -> set {4,5,6}
    await ufPage.setInputs(4, 5);
    await ufPage.clickUnion();
    await ufPage.setInputs(5, 6);
    await ufPage.clickUnion();

    // Capture displayed sets now
    const before = await ufPage.getDisplayedSets();

    // Now call union with two members already in the same set (4 and 6)
    await ufPage.setInputs(4, 6);
    await ufPage.clickUnion();

    // Capture displayed sets after the redundant union
    const after = await ufPage.getDisplayedSets();

    // They should be identical
    expect(after.length).toBe(before.length);
    expect(after).toEqual(before);
    expect(after).toContain('{ 4, 5, 6 }');
  });

  test('Invalid inputs produce an alert dialog with the expected message (negative index)', async ({ page }) => {
    // Purpose: Validate error-handling for out-of-range input using the native alert dialog
    const ufPage4 = new UnionFindPage(page);
    await ufPage.goto();

    // Fill with invalid index -1 and 0
    await ufPage.setInputs(-1, 0);

    // Wait for dialog event upon clicking union and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      ufPage.clickUnion()
    ]);

    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter valid indices between 0 and 9.');
    await dialog.dismiss();
  });

  test('Invalid inputs produce an alert dialog with the expected message (out-of-range index)', async ({ page }) => {
    // Purpose: Validate error-handling for indices >= 10
    const ufPage5 = new UnionFindPage(page);
    await ufPage.goto();

    await ufPage.setInputs(10, 0);

    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      ufPage.clickUnion()
    ]);

    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter valid indices between 0 and 9.');
    await dialog.dismiss();
  });

  test('Invalid inputs produce an alert dialog with the expected message (non-numeric / empty)', async ({ page }) => {
    // Purpose: Validate error-handling when inputs are empty or not parseable to numbers
    const ufPage6 = new UnionFindPage(page);
    await ufPage.goto();

    // Empty fields -> parseInt yields NaN
    await ufPage.input1.fill('');
    await ufPage.input2.fill('');

    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      ufPage.clickUnion()
    ]);

    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter valid indices between 0 and 9.');
    await dialog.dismiss();
  });

  test('Visual check: output area updates text nodes and is visible after unions', async ({ page }) => {
    // Purpose: Validate the output container is present and updated text nodes are visible to the user
    const ufPage7 = new UnionFindPage(page);
    await ufPage.goto();

    // Initially empty
    let displayed3 = await ufPage.getDisplayedSets();
    expect(displayed.length).toBe(0);

    // Perform a union and check visibility/content
    await ufPage.setInputs(7, 8);
    await ufPage.clickUnion();

    // The output should now contain a div with the set text and be visible
    displayed = await ufPage.getDisplayedSets();
    expect(displayed.length).toBeGreaterThan(0);
    expect(displayed).toContain('{ 7, 8 }');

    // Additionally assert the output container itself is visible
    expect(await ufPage.outputDiv.isVisible()).toBe(true);
  });

  test('Accessibility: inputs have correct types and are focusable', async ({ page }) => {
    // Purpose: Basic accessibility checks - input types and focusability
    const ufPage8 = new UnionFindPage(page);
    await ufPage.goto();

    // Ensure inputs are of type "number"
    expect(await ufPage.input1.getAttribute('type')).toBe('number');
    expect(await ufPage.input2.getAttribute('type')).toBe('number');

    // Focus and type values via keyboard for one input to ensure keyboard accessibility
    await ufPage.input1.focus();
    await page.keyboard.type('3');
    expect(await ufPage.input1.inputValue()).toBe('3');

    await ufPage.input2.focus();
    await page.keyboard.type('4');
    expect(await ufPage.input2.inputValue()).toBe('4');
  });
});