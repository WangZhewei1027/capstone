import { test, expect } from '@playwright/test';

// Page object for the Union-Find visualization page
class UnionFindPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.element1 = page.locator('#element1');
    this.element2 = page.locator('#element2');
    this.unionButton = page.getByRole('button', { name: 'Union' });
    this.visualization = page.locator('#visualization');
    this.sets = page.locator('#visualization .set');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/html2test/html/262784d5-cd2a-11f0-bee4-a3a342d77f94.html');
  }

  // Fill the two element inputs
  async setElements(a, b) {
    await this.element1.fill(String(a));
    await this.element2.fill(String(b));
  }

  // Click the Union button
  async clickUnion() {
    await this.unionButton.click();
  }

  // Return count of .set containers currently displayed
  async countSets() {
    return await this.sets.count();
  }

  // Return all sets as arrays of text contents (each set -> array of element labels)
  async getAllSetsContents() {
    const count = await this.countSets();
    const result = [];
    for (let i = 0; i < count; i++) {
      const elems = this.sets.nth(i).locator('.element');
      const texts = await elems.allTextContents();
      // Normalize whitespace & trim
      result.push(texts.map(t => t.trim()));
    }
    return result;
  }

  // Find and return the set (array of strings) that contains a given element label,
  // or null if not found
  async findSetContaining(label) {
    const sets = await this.getAllSetsContents();
    for (const s of sets) {
      if (s.includes(String(label))) return s;
    }
    return null;
  }

  // Return a sorted list of all element labels present in the visualization
  async allElementsPresent() {
    const sets = await this.getAllSetsContents();
    const all = sets.flat().map(s => s.trim());
    // Remove duplicates, sort numerically where possible
    const unique = Array.from(new Set(all));
    return unique.sort((a, b) => Number(a) - Number(b));
  }
}

test.describe('Union-Find (Disjoint Set) Visualization - Integration Tests', () => {
  let pageErrors;
  let consoleErrors;

  // Setup console and page error listeners before each test
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Capture page 'uncaught' errors
    page.on('pageerror', (err) => {
      // store the error message for assertions
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Capture console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  // Test initial load and default state
  test('Initial load shows 10 singleton sets (elements 0-9)', async ({ page }) => {
    const ufPage = new UnionFindPage(page);
    // Navigate to the page
    await ufPage.goto();

    // Basic page validations
    await expect(page).toHaveTitle(/Union-Find/i);
    await expect(page.locator('h1')).toHaveText(/Union-Find/i);
    await expect(page.locator('label[for="element1"]')).toHaveText(/Element 1/i);
    await expect(page.locator('label[for="element2"]')).toHaveText(/Element 2/i);
    await expect(ufPage.unionButton).toBeVisible();

    // The visualization should contain 10 set containers initially
    const initialSetCount = await ufPage.countSets();
    expect(initialSetCount).toBe(10);

    // Each set should contain exactly one element: 0..9
    const allElements = await ufPage.allElementsPresent();
    expect(allElements.length).toBe(10);
    // Expect labels 0 through 9 present
    for (let i = 0; i <= 9; i++) {
      expect(allElements).toContain(String(i));
      // Ensure each of these is contained in a singleton set
      const set = await ufPage.findSetContaining(i);
      expect(set).not.toBeNull();
      expect(set.length).toBe(1);
      expect(set[0]).toBe(String(i));
    }

    // Ensure no JS errors or console errors occurred during load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test performing a simple union operation
  test('Union of 0 and 1 merges their sets', async ({ page }) => {
    const ufPage = new UnionFindPage(page);
    await ufPage.goto();

    // Initial sets count
    const beforeCount = await ufPage.countSets();
    expect(beforeCount).toBe(10);

    // Set inputs to 0 and 1 and perform union
    await ufPage.setElements(0, 1);
    await ufPage.clickUnion();

    // After union, number of sets should decrease by 1
    const afterCount = await ufPage.countSets();
    expect(afterCount).toBe(beforeCount - 1);

    // Both elements 0 and 1 should now be in the same set
    const setContaining0 = await ufPage.findSetContaining(0);
    expect(setContaining0).not.toBeNull();
    expect(setContaining0).toContain('0');
    expect(setContaining0).toContain('1');

    // Ensure no other unexpected duplicates or missing elements
    const allElements = await ufPage.allElementsPresent();
    expect(allElements.length).toBe(10);
    for (let i = 0; i <= 9; i++) {
      expect(allElements).toContain(String(i));
    }

    // Check there were no console or page errors during this interaction
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test multiple unions to form a larger connected component
  test('Multiple unions merge into a larger set (0-3)', async ({ page }) => {
    const ufPage = new UnionFindPage(page);
    await ufPage.goto();

    // Perform union: 0 & 1
    await ufPage.setElements(0, 1);
    await ufPage.clickUnion();

    // Perform union: 2 & 3
    await ufPage.setElements(2, 3);
    await ufPage.clickUnion();

    // Now union: 1 & 2 to connect the two sets into one set {0,1,2,3}
    const before = await ufPage.countSets();
    await ufPage.setElements(1, 2);
    await ufPage.clickUnion();

    // After the three operations, we expect 10 -> 9 -> 8 -> 7 sets
    const after = await ufPage.countSets();
    expect(after).toBe(7);

    // Confirm a set contains 0,1,2,3
    const setContaining0 = await ufPage.findSetContaining(0);
    expect(setContaining0).not.toBeNull();
    const members = setContaining0.sort((a, b) => Number(a) - Number(b));
    expect(members).toEqual(expect.arrayContaining(['0', '1', '2', '3']));
    expect(members.length).toBeGreaterThanOrEqual(4);

    // Remaining elements 4..9 should still be present (not lost)
    const allElements = await ufPage.allElementsPresent();
    expect(allElements.length).toBe(10);
    for (let i = 4; i <= 9; i++) {
      expect(allElements).toContain(String(i));
    }

    // Ensure no runtime errors occurred during these operations
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test idempotent union (union same pair twice)
  test('Idempotent union: repeating the same union does not change set count', async ({ page }) => {
    const ufPage = new UnionFindPage(page);
    await ufPage.goto();

    // Union 4 & 5
    await ufPage.setElements(4, 5);
    await ufPage.clickUnion();
    const countAfterFirst = await ufPage.countSets();
    expect(countAfterFirst).toBe(9);

    // Repeat union 4 & 5 again - should not change the count
    await ufPage.setElements(4, 5);
    await ufPage.clickUnion();
    const countAfterSecond = await ufPage.countSets();
    expect(countAfterSecond).toBe(countAfterFirst);

    // The set containing 4 should include 5 as well
    const set45 = await ufPage.findSetContaining(4);
    expect(set45).not.toBeNull();
    expect(set45).toContain('4');
    expect(set45).toContain('5');

    // Ensure still all elements 0..9 are present
    const allElements = await ufPage.allElementsPresent();
    expect(allElements.length).toBe(10);
    for (let i = 0; i <= 9; i++) {
      expect(allElements).toContain(String(i));
    }

    // No console or page errors should have occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test edge case: provide an out-of-range element and ensure the page does not throw uncaught errors
  test('Out-of-range input does not produce uncaught JS errors and DOM remains consistent', async ({ page }) => {
    const ufPage = new UnionFindPage(page);
    await ufPage.goto();

    // Intentionally use an out-of-range index (10) to exercise edge behavior
    // We will not attempt to "fix" the application; we will simply observe behavior
    await ufPage.setElements(10, 0);
    await ufPage.clickUnion();

    // The app may choose to handle this silently; ensure no uncaught page errors were emitted
    expect(pageErrors.length).toBe(0);

    // Even if visualization semantics are unexpected, ensure that all visual DOM elements
    // for labels 0..9 remain present in the UI (no elements were lost)
    const allElements = await ufPage.allElementsPresent();
    // The visualization should still contain text nodes for 0..9, but if implementation merged incorrectly,
    // ensure at least that all original labels are present somewhere in the DOM
    for (let i = 0; i <= 9; i++) {
      expect(allElements).toContain(String(i));
    }

    // Also ensure there were no console errors captured
    expect(consoleErrors.length).toBe(0);
  });

  // Final test to explicitly verify there are no console or page errors during normal use
  test('No console errors or uncaught page errors during typical interactions', async ({ page }) => {
    const ufPage = new UnionFindPage(page);
    await ufPage.goto();

    // Perform a few unions to simulate typical user interactions
    await ufPage.setElements(0, 1);
    await ufPage.clickUnion();
    await ufPage.setElements(1, 2);
    await ufPage.clickUnion();
    await ufPage.setElements(3, 4);
    await ufPage.clickUnion();

    // Allow locators to settle and ensure UI updated
    const setCount = await ufPage.countSets();
    expect(setCount).toBeGreaterThanOrEqual(6); // general expectation after a few unions

    // Assert zero page errors and zero console error messages
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});