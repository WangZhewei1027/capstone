import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b74601-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Deque Implementation (11b74601-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  // Arrays to collect page errors and console messages per test
  let pageErrors = [];
  let consoleMessages = [];

  // Before each test navigate to the page and set up listeners
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect any console messages for diagnostics
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect runtime errors from the page (ReferenceError, TypeError, RangeError, etc.)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Ensure a clean localStorage for predictable test isolation
    await page.goto('about:blank');
    await page.evaluate(() => localStorage.removeItem('deque'));

    // Now navigate to the application under test
    await page.goto(APP_URL);
  });

  // After each test, attach some basic expectations about console and errors when relevant
  test.afterEach(async ({}, testInfo) => {
    // Attach basic diagnostics to test output (non-failing)
    testInfo.attachments = testInfo.attachments || [];
    // Note: We don't fail tests just because there are console messages; specific tests assert on expected errors.
  });

  // Helper to access common locators on the page
  const pageObjects = page => {
    return {
      header: page.locator('h1'),
      inputSize: page.locator('#deque-size'),
      addButton: page.locator('#add-button'),
      removeButton: page.locator('#remove-button'),
      displayButton: page.locator('#display-button'),
      clearButton: page.locator('#clear-button'),
      saveButton: page.locator('#save-button'),
      container: page.locator('#deque-container'),
      items: page.locator('#deque-container .deque-item'),
    };
  };

  test('Initial load: elements present and deque container is empty', async ({ page }) => {
    // Purpose: Verify initial page state and visibility of controls
    const p = pageObjects(page);

    await expect(p.header).toHaveText('Deque Implementation');
    await expect(p.inputSize).toBeVisible();
    await expect(p.addButton).toBeVisible();
    await expect(p.removeButton).toBeVisible();
    await expect(p.displayButton).toBeVisible();
    await expect(p.clearButton).toBeVisible();
    await expect(p.saveButton).toBeVisible();

    // The deque container should initially be empty (no .deque-item children)
    await expect(p.items).toHaveCount(0);

    // There should be no runtime errors on plain load for a clean environment
    expect(pageErrors.length).toBe(0);
  });

  test('Add and Display: adding size=3 results in three displayed items with value 0', async ({ page }) => {
    // Purpose: Validate that adding elements and using "Display" renders the deque contents
    const p1 = pageObjects(page);

    await p.inputSize.fill('3');
    await p.addButton.click();

    // After clicking add, the implementation appends a partial representation,
    // but "Display" renders the actual deque items. Click display to render actual deque.
    await p.displayButton.click();

    // Expect three items rendered with text '0'
    await expect(p.items).toHaveCount(3);
    const texts = await p.items.allTextContents();
    for (const t of texts) {
      expect(t).toBe('0');
    }

    // No unexpected page errors should have happened during valid interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Remove and Display: removing 2 from a deque of 3 leaves 1 item', async ({ page }) => {
    // Purpose: Validate remove operation followed by display shows correct remaining items
    const p2 = pageObjects(page);

    // Setup: add 3
    await p.inputSize.fill('3');
    await p.addButton.click();
    await p.displayButton.click();
    await expect(p.items).toHaveCount(3);

    // Remove 2
    await p.inputSize.fill('2');
    await p.removeButton.click();

    // Display the deque to see remaining items
    await p.displayButton.click();

    // Expect one remaining item with text '0'
    await expect(p.items).toHaveCount(1);
    await expect(p.items.first()).toHaveText('0');

    // No runtime errors expected during these valid interactions
    expect(pageErrors.length).toBe(0);
  });

  test('Clear button empties the deque and clears DOM', async ({ page }) => {
    // Purpose: Ensure Clear resets both internal deque (as reflected in display) and the DOM
    const p3 = pageObjects(page);

    // Setup: add 2 items and display them
    await p.inputSize.fill('2');
    await p.addButton.click();
    await p.displayButton.click();
    await expect(p.items).toHaveCount(2);

    // Click clear and verify container empties
    await p.clearButton.click();
    await expect(p.items).toHaveCount(0);
    await expect(p.container).toBeEmpty();

    // After clear, saving should store an empty deque
    await p.saveButton.click();
    const stored = await page.evaluate(() => localStorage.getItem('deque'));
    // The implementation sets deque to [] when cleared, so saved value should be "[]"
    expect(stored).toBe('[]');

    expect(pageErrors.length).toBe(0);
  });

  test('Save persists the deque to localStorage', async ({ page }) => {
    // Purpose: Validate that Save writes the deque array to localStorage under key "deque"
    const p4 = pageObjects(page);

    // Add two elements and display to ensure deque contains two zeros
    await p.inputSize.fill('2');
    await p.addButton.click();
    await p.displayButton.click();
    await expect(p.items).toHaveCount(2);

    // Click save and verify localStorage content
    await p.saveButton.click();
    const stored1 = await page.evaluate(() => localStorage.getItem('deque'));
    // The deque is expected to be an array of two zeros: [0,0]
    expect(stored).toBe('[0,0]');

    expect(pageErrors.length).toBe(0);
  });

  test('Input event slices deque and updates DOM when changing size', async ({ page }) => {
    // Purpose: When the input value changes, the page slices the deque and rebuilds the container
    const p5 = pageObjects(page);

    // Add three items first
    await p.inputSize.fill('3');
    await p.addButton.click();
    await p.displayButton.click();
    await expect(p.items).toHaveCount(3);

    // Now change the input to 1 which should trigger the input event and slice the deque to length 1
    await p.inputSize.fill('1');
    // Playwright's fill triggers input events automatically; wait a tick for handler to run
    await page.waitForTimeout(50);

    // After slicing, the container should show 1 item (the handler rebuilds container from deque)
    await expect(p.items).toHaveCount(1);
    await expect(p.items.first()).toHaveText('0');

    expect(pageErrors.length).toBe(0);
  });

  test('Clicking Add with empty input triggers a runtime error (invalid array length) and is reported as a page error', async ({ page }) => {
    // Purpose: Intentionally exercise edge-case input (empty) that causes the page script to attempt Array(NaN)
    // which typically throws a RangeError "Invalid array length". We observe and assert that a page error occurs.
    const p6 = pageObjects(page);

    // Ensure input is empty
    await p.inputSize.fill('');
    // Clear previously collected errors to focus on this interaction
    pageErrors = [];

    // Click add which will call parseInt('') -> NaN then Array(NaN) -> RangeError in many engines
    await p.addButton.click();

    // Give the page a moment to surface the error
    await page.waitForTimeout(50);

    // There should be at least one page error captured
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // Inspect the first error message text to ensure it relates to invalid array length or invalid size
    const errorMessages = pageErrors.map(e => String(e && e.message ? e.message : e));
    const matched = errorMessages.some(msg => /invalid array length/i.test(msg) || /array length/i.test(msg) || /invalid array/i.test(msg) || /rangeerror/i.test(msg));
    // We expect the error to indicate an invalid array length or similar; assert that such a message was observed
    expect(matched).toBeTruthy();

    // Also assert that the DOM did not end up with unexpected number of items rendered due to the failure
    // (the implementation appends one div on add regardless; if the script threw before DOM manipulation, count may be 0)
    // We accept either 0 or 1 as plausible outcomes given the implementation's order, but ensure no successful multi-item render happened.
    const count = await p.items.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('Diagnostics: console messages and page error array are available for inspection', async ({ page }) => {
    // Purpose: Sanity check that our diagnostic collectors are working (non-critical)
    // This test does not enforce a specific console message but ensures the arrays exist and types are as expected.
    expect(Array.isArray(consoleMessages)).toBeTruthy();
    expect(Array.isArray(pageErrors)).toBeTruthy();

    // No assertion that they are non-empty; they are available for debugging tests above
  });
});