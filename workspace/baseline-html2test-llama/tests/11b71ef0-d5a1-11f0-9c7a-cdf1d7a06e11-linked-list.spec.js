import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b71ef0-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page Object for the Linked List app to encapsulate interactions and selectors
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input');
    this.addBtn = page.locator('#add-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.listDiv = page.locator('#list');
  }

  // navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // type a value into the input
  async typeValue(value) {
    await this.input.fill(value);
  }

  // click the Add button
  async clickAdd() {
    await this.addBtn.click();
  }

  // click the Clear button
  async clickClear() {
    await this.clearBtn.click();
  }

  // helper to get the input's current value
  async getInputValue() {
    return await this.input.inputValue();
  }

  // helper to get the innerHTML of the list container
  async getListInnerHTML() {
    return await this.page.evaluate(el => el.innerHTML, await this.listDiv.elementHandle());
  }

  // helper to check if list container has any child nodes
  async listHasChildren() {
    return await this.page.evaluate(el => el.hasChildNodes(), await this.listDiv.elementHandle());
  }

  // returns whether the add and clear buttons are enabled
  async buttonsEnabled() {
    const addEnabled = await this.addBtn.isEnabled();
    const clearEnabled = await this.clearBtn.isEnabled();
    return { addEnabled, clearEnabled };
  }
}

test.describe('Linked List Application (11b71ef0-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  // arrays to collect console messages and page errors per test
  let consoleMessages;
  let pageErrors;

  // Attach listeners and navigate before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // capture console messages for inspection
    page.on('console', msg => {
      // store the text and type for assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // capture unhandled page errors (runtime exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Clean up listeners after each test (best-effort)
  test.afterEach(async ({ page }) => {
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  test.describe('Initial load and basic UI checks', () => {
    test('Initial page load shows input and control buttons and empty list container', async ({ page }) => {
      // Purpose: Verify the default state immediately after loading the page
      const app = new LinkedListPage(page);
      await app.goto();

      // Check the input is visible and empty
      await expect(app.input).toBeVisible();
      const inputValue = await app.getInputValue();
      expect(inputValue).toBe('', 'Input should be empty on initial load');

      // Check Add and Clear buttons are visible and enabled
      await expect(app.addBtn).toBeVisible();
      await expect(app.clearBtn).toBeVisible();
      const { addEnabled, clearEnabled } = await app.buttonsEnabled();
      expect(addEnabled).toBe(true);
      expect(clearEnabled).toBe(true);

      // The list container exists and should be empty (no child nodes) by default
      await expect(app.listDiv).toBeVisible();
      const hasChildren = await app.listHasChildren();
      expect(hasChildren).toBe(false);

      // Verify that no runtime page errors occurred during load
      expect(pageErrors.length).toBe(0);

      // Verify there are no console.error messages on load
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Add and Clear interactions', () => {
    test('Clicking Add with non-empty input clears the input and does not inject DOM nodes (implementation detail)', async ({ page }) => {
      // Purpose: Ensure user input is consumed by Add button and input resets.
      // Note: The app's implementation updates the internal LinkedList but does not update the DOM.
      const app1 = new LinkedListPage(page);
      await app.goto();

      // Type a value and click Add
      await app.typeValue('First');
      await app.clickAdd();

      // Input should be cleared after adding per the JS implementation
      const afterAddValue = await app.getInputValue();
      expect(afterAddValue).toBe('', 'Input should be cleared after clicking Add');

      // The DOM list container remains unchanged because add() does not update the DOM in this implementation
      const hasChildrenAfterAdd = await app.listHasChildren();
      expect(hasChildrenAfterAdd).toBe(false);

      // No runtime page errors should have occurred during the interaction
      expect(pageErrors.length).toBe(0);

      // There should be no console.error messages emitted as part of the interaction
      const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Clicking Add with empty input does nothing and causes no errors', async ({ page }) => {
      // Purpose: Edge case - pressing Add with empty or whitespace-only input should not change state or error.
      const app2 = new LinkedListPage(page);
      await app.goto();

      // Ensure input is empty, then click Add
      await app.input.fill('');
      await app.clickAdd();

      // Input remains empty
      expect(await app.getInputValue()).toBe('');

      // List container remains empty
      expect(await app.listHasChildren()).toBe(false);

      // No runtime errors
      expect(pageErrors.length).toBe(0);
      const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Clicking Clear clears the list container and does not throw errors even after adds', async ({ page }) => {
      // Purpose: Verify Clear button behavior. The implementation removes the head of the LinkedList and clears the DOM container.
      const app3 = new LinkedListPage(page);
      await app.goto();

      // Add two items; per implementation add() does not modify DOM, but input should clear after each add.
      await app.typeValue('A');
      await app.clickAdd();
      await app.typeValue('B');
      await app.clickAdd();

      // Sanity checks: input cleared after adds
      expect(await app.getInputValue()).toBe('');

      // Now click Clear. The implementation sets listDiv.innerHTML = '' and calls list.clear()
      await app.clickClear();

      // The list container should be empty (DOM cleared)
      expect(await app.listHasChildren()).toBe(false);

      // No runtime exceptions should have been thrown
      expect(pageErrors.length).toBe(0);

      // No console errors
      const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('DOM and console inspection for implementation quirks', () => {
    test('printList is invoked only on load and no list item console logs occur when adding (due to missing DOM update)', async ({ page }) => {
      // Purpose: Inspect console output to detect invocation of printList or other logs.
      const app4 = new LinkedListPage(page);
      await app.goto();

      // At load, script calls list.printList(); since the list is empty, no console.log entries should be present.
      const logsAtLoad = consoleMessages.filter(m => m.type === 'log');
      expect(logsAtLoad.length).toBe(0);

      // Add an item and verify no additional console.log messages were emitted (add() does not call printList)
      await app.typeValue('X');
      await app.clickAdd();

      // Collect current logs
      const logsAfterAdd = consoleMessages.filter(m => m.type === 'log');
      expect(logsAfterAdd.length).toBe(0);

      // There should be no console.error or runtime page errors throughout
      const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Accessibility and visibility checks', () => {
    test('Controls are accessible via ARIA roles and visible to users', async ({ page }) => {
      // Purpose: Basic accessibility checks: buttons have accessible names and are visible
      const app5 = new LinkedListPage(page);
      await app.goto();

      // Locate by role to ensure accessibility name exists
      const addByRole = page.getByRole('button', { name: /Add/i });
      const clearByRole = page.getByRole('button', { name: /Clear/i });

      await expect(addByRole).toBeVisible();
      await expect(clearByRole).toBeVisible();

      // Ensure clicking via accessible role works
      await addByRole.click();
      await clearByRole.click();

      // No runtime errors from using accessible controls
      expect(pageErrors.length).toBe(0);
      const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });
});