import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0a672-cd2f-11f0-a440-159d7b77af86.html';

// Page Object for the Deque application
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#item-input');
    this.addFrontButton = page.locator('button', { hasText: 'Add to Front' });
    this.addBackButton = page.locator('button', { hasText: 'Add to Back' });
    this.removeFrontButton = page.locator('button', { hasText: 'Remove from Front' });
    this.removeBackButton = page.locator('button', { hasText: 'Remove from Back' });
    this.itemsList = page.locator('#deque-items');
    this.items = page.locator('#deque-items > li');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL);
    await expect(this.page).toHaveURL(APP_URL);
  }

  // Enter text into the input field
  async enterItem(text) {
    await this.input.fill(text);
  }

  // Click add to front
  async addFront() {
    await this.addFrontButton.click();
  }

  // Click add to back
  async addBack() {
    await this.addBackButton.click();
  }

  // Click remove from front
  async removeFront() {
    await this.removeFrontButton.click();
  }

  // Click remove from back
  async removeBack() {
    await this.removeBackButton.click();
  }

  // Get visible items as array of strings
  async getItemsText() {
    const count = await this.items.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.items.nth(i).innerText());
    }
    return texts;
  }

  // Get number of items
  async getItemsCount() {
    return this.items.count();
  }
}

// Collect console error messages and page errors for assertions
test.describe('Deque Implementation Tests', () => {
  let consoleErrors;
  let pageErrors;

  // Setup a fresh capture arrays before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture uncaught page errors (e.g., ReferenceError, TypeError, SyntaxError)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Initial load: should display UI controls and empty deque', async ({ page }) => {
    // Purpose: Verify that the application loads correctly and initial state is empty.
    const app = new DequePage(page);
    await app.goto();

    // Check page title and header presence
    await expect(page.locator('h2')).toHaveText('Deque Implementation');

    // Input and all buttons should be visible and enabled
    await expect(app.input).toBeVisible();
    await expect(app.input).toBeEnabled();
    await expect(app.addFrontButton).toBeVisible();
    await expect(app.addBackButton).toBeVisible();
    await expect(app.removeFrontButton).toBeVisible();
    await expect(app.removeBackButton).toBeVisible();

    // The deque list should be empty on load
    await expect(app.items).toHaveCount(0);

    // Ensure no uncaught errors occurred during initial load
    expect(pageErrors.length, `Expected no page errors on load but found: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Expected no console.errors on load but found: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);
  });

  // Group tests that exercise adding items
  test.describe('Add operations', () => {
    test('Add to front: should insert item at the front and clear input', async ({ page }) => {
      // Purpose: Verify enqueueFront behavior and input reset after adding.
      const app = new DequePage(page);
      await app.goto();

      await app.enterItem('Front1');
      await app.addFront();

      // After adding, the first list item should be 'Front1'
      await expect(app.items).toHaveCount(1);
      const items = await app.getItemsText();
      expect(items).toEqual(['Front1']);

      // Input should be cleared after adding
      await expect(app.input).toHaveValue('');

      // No JS errors should have appeared during interaction
      expect(pageErrors.length, 'No page errors expected during addFront').toBe(0);
      expect(consoleErrors.length, 'No console errors expected during addFront').toBe(0);
    });

    test('Add to back: should append items to the end preserving order', async ({ page }) => {
      // Purpose: Verify enqueueBack behavior and list ordering.
      const app = new DequePage(page);
      await app.goto();

      // Add three items: two to back, one to front to set a mixed order
      await app.enterItem('A');
      await app.addBack(); // A

      await app.enterItem('B');
      await app.addBack(); // A, B

      await app.enterItem('C');
      await app.addFront(); // C, A, B

      // Validate order
      const items = await app.getItemsText();
      expect(items).toEqual(['C', 'A', 'B']);

      // Validate count and DOM structure
      await expect(app.items).toHaveCount(3);
      await expect(app.items.nth(0)).toHaveText('C');
      await expect(app.items.nth(2)).toHaveText('B');

      // No JS errors should have appeared during these interactions
      expect(pageErrors.length, 'No page errors expected during addBack/addFront sequence').toBe(0);
      expect(consoleErrors.length, 'No console errors expected during addBack/addFront sequence').toBe(0);
    });
  });

  // Group tests that exercise removing items
  test.describe('Remove operations', () => {
    test('Remove from front and back: should remove correct elements and update DOM', async ({ page }) => {
      // Purpose: Test dequeueFront and dequeueBack and resulting ordering.
      const app = new DequePage(page);
      await app.goto();

      // Build deque: [X, Y, Z] using addBack repeatedly
      await app.enterItem('X');
      await app.addBack();
      await app.enterItem('Y');
      await app.addBack();
      await app.enterItem('Z');
      await app.addBack();

      await expect(app.items).toHaveCount(3);
      let items = await app.getItemsText();
      expect(items).toEqual(['X', 'Y', 'Z']);

      // Remove front -> removes 'X'
      await app.removeFront();
      items = await app.getItemsText();
      expect(items).toEqual(['Y', 'Z']);
      await expect(app.items).toHaveCount(2);

      // Remove back -> removes 'Z'
      await app.removeBack();
      items = await app.getItemsText();
      expect(items).toEqual(['Y']);
      await expect(app.items).toHaveCount(1);

      // No JS errors should have appeared during removal interactions
      expect(pageErrors.length, 'No page errors expected during remove operations').toBe(0);
      expect(consoleErrors.length, 'No console errors expected during remove operations').toBe(0);
    });

    test('Removing from empty deque: should not throw and should keep list empty', async ({ page }) => {
      // Purpose: Edge case - ensure removals on empty deque are graceful.
      const app = new DequePage(page);
      await app.goto();

      // Ensure empty initial state
      await expect(app.items).toHaveCount(0);

      // Attempt to remove from front and back when empty
      await app.removeFront();
      await app.removeBack();

      // Still empty and no errors
      await expect(app.items).toHaveCount(0);
      const items = await app.getItemsText();
      expect(items).toEqual([]);

      // Confirm no uncaught page errors or console errors occurred
      expect(pageErrors.length, 'No page errors expected when removing from empty deque').toBe(0);
      expect(consoleErrors.length, 'No console errors expected when removing from empty deque').toBe(0);
    });
  });

  // Test data flow, DOM updates and accessibility basics
  test('Data flow: multiple operations should maintain correct state and DOM reflects changes', async ({ page }) => {
    // Purpose: Combined scenario that simulates a user performing several operations and verifying final state.
    const app = new DequePage(page);
    await app.goto();

    // Sequence: addFront(1), addBack(2), addFront(0), addBack(3) => expected [0,1,2,3]
    await app.enterItem('1');
    await app.addFront(); // 1

    await app.enterItem('2');
    await app.addBack(); // 1,2

    await app.enterItem('0');
    await app.addFront(); // 0,1,2

    await app.enterItem('3');
    await app.addBack(); // 0,1,2,3

    const items = await app.getItemsText();
    expect(items).toEqual(['0', '1', '2', '3']);
    await expect(app.items).toHaveCount(4);

    // Remove a couple and check
    await app.removeFront(); // removes 0 -> 1,2,3
    await app.removeBack();  // removes 3 -> 1,2
    const finalItems = await app.getItemsText();
    expect(finalItems).toEqual(['1', '2']);
    await expect(app.items).toHaveCount(2);

    // Basic accessibility checks: ensure buttons have accessible names (text)
    await expect(app.addFrontButton).toHaveText('Add to Front');
    await expect(app.addBackButton).toHaveText('Add to Back');

    // No runtime errors during the combined scenario
    expect(pageErrors.length, 'No page errors expected during combined scenario').toBe(0);
    expect(consoleErrors.length, 'No console errors expected during combined scenario').toBe(0);
  });

  // Final check: ensure the environment didn't produce uncaught JS errors during test run
  test('No uncaught JavaScript errors were emitted during testing session', async ({ page }) => {
    // Purpose: Make a final page visit and assert that no page errors or console.error occurred while loading and interacting.
    const app = new DequePage(page);
    await app.goto();

    // Perform a few interactions
    await app.enterItem('final');
    await app.addBack();
    await app.removeBack();

    // Assert we captured zero page errors and zero console.error messages
    // If any error types like ReferenceError/TypeError/SyntaxError occur they will be in pageErrors and cause this assertion to fail.
    expect(pageErrors.length, `Expected no uncaught page errors but found ${pageErrors.length}`).toBe(0);
    expect(consoleErrors.length, `Expected no console.error messages but found ${consoleErrors.length}`).toBe(0);
  });
});