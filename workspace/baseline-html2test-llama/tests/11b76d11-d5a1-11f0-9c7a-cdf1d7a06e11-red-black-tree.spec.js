import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b76d11-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page object for the Red-Black Tree page
class RedBlackTreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('#tree');
    this.image = page.locator('#tree img');
    this.caption = page.locator('#tree p');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async altText() {
    return this.image.getAttribute('alt');
  }

  async src() {
    return this.image.getAttribute('src');
  }

  async captionText() {
    return this.caption.innerText();
  }

  // returns count of interactive controls found on the page
  async interactiveControlsCount() {
    const controls = await this.page.$$('input, button, form, select, textarea');
    return controls.length;
  }
}

test.describe('Red-Black Tree page - UI and runtime behavior', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Register listeners before navigating so we capture messages and errors during load
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture all console messages emitted by the page
    page.on('console', (msg) => {
      // store type and text for richer assertions
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch {
        // if message can't be read for some reason, push an empty record
        consoleMessages.push({ type: 'unknown', text: '' });
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test: initial load and DOM expectations
  test('loads the page and displays the tree image and caption; no interactive controls present', async ({ page }) => {
    // Purpose: Verify static DOM elements are present and that there are no interactive controls
    const treePage = new RedBlackTreePage(page);

    // Navigate to the page (listeners already registered in beforeEach)
    await treePage.goto();

    // Verify the container, image and caption are visible and correct
    await expect(treePage.container).toBeVisible();
    await expect(treePage.image).toBeVisible();

    // Validate alt text and src contain expected content
    const alt = await treePage.altText();
    expect(alt).toBe('Red-Black Tree');

    const src = await treePage.src();
    expect(src).toContain('Black_tree.svg');

    // Validate caption content
    const caption = await treePage.captionText();
    expect(caption).toBe('Red-Black Tree');

    // Ensure there are no interactive controls (the page is static in this implementation)
    const interactiveCount = await treePage.interactiveControlsCount();
    expect(interactiveCount).toBe(0);

    // The page script prints the tree to console during load; ensure at least some console output was captured
    // We expect messages like '-> 10' and the single value '10' being logged by the script.
    const texts = consoleMessages.map(m => m.text);
    const hasArrow10 = texts.some(t => t.includes('-> 10'));
    const hasValue10 = texts.some(t => t === '10' || t.includes('\n10') || t.includes(' 10'));
    expect(hasArrow10).toBeTruthy();
    expect(hasValue10).toBeTruthy();
  });

  // Test: verify console logs include tree structure and repeated prints
  test('console logs show tree structure before and after deletion and logs node values', async ({ page }) => {
    // Purpose: Assert that the script emitted tree structure prints and value logs to console.
    const treePage1 = new RedBlackTreePage(page);
    await treePage.goto();

    // Collect only textual console messages
    const texts1 = consoleMessages.map(m => m.text);

    // Expect multiple entries that show the tree nodes with '-> ' prefix
    const arrowMessages = texts.filter(t => t.includes('-> '));
    expect(arrowMessages.length).toBeGreaterThanOrEqual(1);

    // The script prints the tree twice (before and after deletion). So at least one node (like '-> 10')
    // should appear multiple times. Check that '-> 10' appears at least twice.
    const arrow10Count = texts.filter(t => t.includes('-> 10')).length;
    expect(arrow10Count).toBeGreaterThanOrEqual(2);

    // Verify that the search for an existing key logs the key value '10'
    const value10Messages = texts.filter(t => t.trim() === '10');
    expect(value10Messages.length).toBeGreaterThanOrEqual(1);

    // Check presence of other expected node keys printed when building the tree
    const expectedKeys = ['-> 5', '-> 15', '-> 3', '-> 7', '-> 12', '-> 20'];
    for (const key of expectedKeys) {
      // It's acceptable that some nodes only appear in the first or second print; we assert existence at least once.
      const exists = texts.some(t => t.includes(key));
      expect(exists).toBeTruthy();
    }
  });

  // Test: the page script attempts to access .key of a null search result after deletion -> should produce a page error (TypeError)
  test('throws a runtime error when trying to access .key on a null search result after deletion', async ({ page }) => {
    // Purpose: Validate that the application emits an uncaught runtime error when the script accesses .key on null.
    const treePage2 = new RedBlackTreePage(page);
    await treePage.goto();

    // There should be at least one page error captured due to console.log(tree.search(5).key) where search(5) is null
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // At least one of the errors should mention 'key' and indicate a problem accessing a property of null/undefined
    const messages = pageErrors.map(err => String(err && err.message ? err.message : err));
    const matching = messages.filter(msg => /key/.test(msg) && /(null|undefined|Cannot|reading)/i.test(msg));
    expect(matching.length).toBeGreaterThanOrEqual(1);

    // As an additional check, ensure the console did not successfully log a value for the nonexistent key (no '5' value log)
    // Note: the script prints node keys via '-> X' and prints values like '10' for search; it attempts to log tree.search(5).key,
    // which should not produce a successful console message of '5'. Ensure there is no plain '5' in console messages.
    const plainFive = consoleMessages.some(m => m.text.trim() === '5');
    expect(plainFive).toBeFalsy();
  });
});