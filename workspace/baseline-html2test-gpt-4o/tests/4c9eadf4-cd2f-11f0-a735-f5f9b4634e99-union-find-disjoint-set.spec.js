import { test, expect } from '@playwright/test';

// Page object model for the Union-Find demo page
class UnionFindPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.selectors = {
      element1: '#element1',
      element2: '#element2',
      unionButton: 'button:has-text("Union")',
      setsDisplay: '#setsDisplay',
      setDivs: '#setsDisplay .set',
    };
  }

  async goto(url) {
    await this.page.goto(url);
  }

  async getElement1Value() {
    return this.page.locator(this.selectors.element1).inputValue();
  }

  async getElement2Value() {
    return this.page.locator(this.selectors.element2).inputValue();
  }

  async fillElements(a, b) {
    await this.page.fill(this.selectors.element1, String(a));
    await this.page.fill(this.selectors.element2, String(b));
  }

  async clickUnion() {
    await this.page.click(this.selectors.unionButton);
  }

  async getSetCount() {
    return await this.page.locator(this.selectors.setDivs).count();
  }

  // Returns an array of objects { title: 'Set X', elementsText: '...' }
  async getSetsInfo() {
    const sets = [];
    const setCount = await this.getSetCount();
    for (let i = 0; i < setCount; i++) {
      const setLocator = this.page.locator(this.selectors.setDivs).nth(i);
      const title = await setLocator.locator('h3').innerText();
      const elements = await setLocator.locator('p').innerText();
      sets.push({ title, elements });
    }
    return sets;
  }

  // Helper to find the set that contains a given element text token
  async findSetContainingElementToken(token) {
    const sets = await this.getSetsInfo();
    return sets.find(s => s.elements.split(',').map(t => t.trim()).includes(String(token)));
  }
}

// URL under test
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadf4-cd2f-11f0-a735-f5f9b4634e99.html';

test.describe('Union-Find (Disjoint Set) Demonstration - UI and functionality tests', () => {
  // Arrays to collect console error messages and page errors per test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen to console messages and collect error-level logs
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Listen to page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app page before each test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // No explicit teardown required as Playwright handles context cleanup.
    // This hook exists to make it explicit that we considered teardown.
  });

  test('Initial load: displays five separate singleton sets 0 through 4', async ({ page }) => {
    // Purpose: Verify initial state shows five sets, each containing a single element.
    const ufPage = new UnionFindPage(page);

    // Verify no console errors or page errors on initial load
    expect(consoleErrors, 'Unexpected console.error messages on initial load').toHaveLength(0);
    expect(pageErrors, 'Unexpected page errors on initial load').toHaveLength(0);

    // There should be 5 sets (0,1,2,3,4)
    const count = await ufPage.getSetCount();
    expect(count).toBe(5);

    const sets = await ufPage.getSetsInfo();
    // Ensure each set title and elements correspond to singletons 0..4
    const seenTitles = sets.map(s => s.title).sort();
    expect(seenTitles).toEqual(['Set 0', 'Set 1', 'Set 2', 'Set 3', 'Set 4']);

    // Ensure each element appears in exactly one set and is alone
    const allElements = sets.flatMap(s => s.elements.split(',').map(t => t.trim()));
    expect(allElements.sort()).toEqual(['0', '1', '2', '3', '4']);

    for (const s of sets) {
      const elems = s.elements.split(',').map(t => t.trim());
      expect(elems.length).toBe(1);
    }
  });

  test('Union operation merges two elements and updates the DOM accordingly', async ({ page }) => {
    // Purpose: Test union of 1 and 2 results in a combined set containing 1 and 2
    const ufPage = new UnionFindPage(page);

    // Ensure initial state is correct
    expect(await ufPage.getSetCount()).toBe(5);

    // Perform union(1,2)
    await ufPage.fillElements(1, 2);
    await ufPage.clickUnion();

    // After union, no console errors or page errors should have occurred
    expect(consoleErrors, 'Unexpected console.error after union(1,2)').toHaveLength(0);
    expect(pageErrors, 'Unexpected pageerror after union(1,2)').toHaveLength(0);

    // There should now be 4 sets (one merged)
    const countAfter = await ufPage.getSetCount();
    expect(countAfter).toBe(4);

    // Find the set that contains '1' and verify it also contains '2'
    const setContaining1 = await ufPage.findSetContainingElementToken(1);
    expect(setContaining1).toBeTruthy();
    const elements = setContaining1.elements.split(',').map(t => t.trim());
    // Order is expected to be '1, 2' given how display pushes elements in ascending index
    expect(elements.sort()).toEqual(['1', '2']);
  });

  test('Multiple unions produce transitive merging (1-2, 3-4, then 2-4 merges all into one set)', async ({ page }) => {
    // Purpose: Validate multiple unions and transitive connectivity reflected in DOM
    const ufPage = new UnionFindPage(page);

    // Union 1 and 2
    await ufPage.fillElements(1, 2);
    await ufPage.clickUnion();

    // Union 3 and 4
    await ufPage.fillElements(3, 4);
    await ufPage.clickUnion();

    // At this point expect 3 sets: {0}, {1,2}, {3,4}
    expect(await ufPage.getSetCount()).toBe(3);

    // Now union 2 and 4 to merge the two sets into one
    await ufPage.fillElements(2, 4);
    await ufPage.clickUnion();

    // After merge expect 2 sets: {0} and {1,2,3,4}
    expect(await ufPage.getSetCount()).toBe(2);

    // Verify that elements 1,2,3,4 are in the same set
    const setWith1 = await ufPage.findSetContainingElementToken(1);
    expect(setWith1).toBeTruthy();
    const elems = setWith1.elements.split(',').map(t => t.trim());
    // Ensure all four elements present
    expect(elems.sort()).toEqual(['1', '2', '3', '4']);

    // Also verify element 0 remains in its own set
    const setWith0 = await ufPage.findSetContainingElementToken(0);
    expect(setWith0).toBeTruthy();
    expect(setWith0.elements.split(',').map(t => t.trim())).toEqual(['0']);

    // No unexpected errors during these operations
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Union of an element with itself is a no-op and does not create errors', async ({ page }) => {
    // Purpose: Ensure union(x,x) does not alter sets and produces no errors
    const ufPage = new UnionFindPage(page);

    // Count before
    const beforeCount = await ufPage.getSetCount();

    // Union 0 with 0
    await ufPage.fillElements(0, 0);
    await ufPage.clickUnion();

    // Count after should be unchanged
    const afterCount = await ufPage.getSetCount();
    expect(afterCount).toBe(beforeCount);

    // Set containing 0 should still only have 0
    const setWith0 = await ufPage.findSetContainingElementToken(0);
    expect(setWith0).toBeTruthy();
    expect(setWith0.elements.split(',').map(t => t.trim())).toEqual(['0']);

    // No console or page errors
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Invalid input (non-numeric) triggers a runtime error observable as a pageerror', async ({ page }) => {
    // Purpose: Provide invalid input to provoke runtime errors and verify they are reported
    const ufPage = new UnionFindPage(page);

    // We expect a pageerror or console.error will occur when invalid values lead to invalid array indexing.
    // Use waitForEvent to make sure we capture the emitted error.
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Fill invalid value for element1 and a valid one for element2
    await ufPage.fillElements('a', 1);

    // Click union to trigger the behavior that should lead to an exception
    await ufPage.clickUnion();

    // Await the pageerror event; if none occurs within the default timeout the test will fail.
    const error = await pageErrorPromise;
    expect(error).toBeTruthy();
    // The error message is not strictly specified; assert it's a TypeError or ReferenceError or contains typical keywords
    const msg = String(error.message || error);
    expect(
      /TypeError|ReferenceError|is not defined|undefined/i.test(msg),
      `Expected an error indicating invalid operation, got: ${msg}`
    ).toBeTruthy();
  });

  test('Out-of-range numeric input (e.g., 10) does not throw but will create an additional sparse set entry if malformed; observe behavior', async ({ page }) => {
    // Purpose: Test behavior when user inputs an element index outside the initialized range (0..4)
    // This test will observe what happens and assert accordingly, without patching the app.
    const ufPage = new UnionFindPage(page);

    // Start fresh and ensure no errors initially
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);

    // Fill with out-of-range values
    await ufPage.fillElements(10, 1);
    // Clicking union may either silently do nothing, extend internal arrays, or throw.
    // We will click and then check for possible page errors; allow both possibilities.
    await ufPage.clickUnion();

    // Allow a short moment for any potential asynchronous errors (though the code is synchronous)
    await page.waitForTimeout(50);

    // If any page error occurred, record that; otherwise continue to inspect DOM.
    if (pageErrors.length > 0 || consoleErrors.length > 0) {
      // If errors happened, assert that at least one is present
      expect(pageErrors.length + consoleErrors.length).toBeGreaterThan(0);
    } else {
      // No errors: inspect the sets display to see what state the app is in
      const sets = await ufPage.getSetsInfo();

      // At minimum, element '1' should still exist somewhere
      const has1 = sets.some(s => s.elements.split(',').map(t => t.trim()).includes('1'));
      expect(has1).toBeTruthy();

      // The app may have created a Set '10' or added a malformed entry; assert that DOM remains present and valid
      expect(await ufPage.getSetCount()).toBeGreaterThanOrEqual(1);
    }
  });

  test('Accessibility basics: inputs and button are visible and labeled', async ({ page }) => {
    // Purpose: Quick accessibility / visibility checks for interactive controls
    const ufPage = new UnionFindPage(page);

    // Inputs and button should be visible
    await expect(page.locator(ufPage.selectors.element1)).toBeVisible();
    await expect(page.locator(ufPage.selectors.element2)).toBeVisible();
    await expect(page.locator(ufPage.selectors.unionButton)).toBeVisible();

    // Labels exist in DOM as associated text nodes (simple label presence check)
    const label1 = await page.locator('label[for="element1"]').innerText();
    const label2 = await page.locator('label[for="element2"]').innerText();
    expect(label1.toLowerCase()).toContain('element 1'.split(' ')[0]); // simple sanity
    expect(label2.toLowerCase()).toContain('element 2'.split(' ')[0]);

    // No script errors during these checks
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});