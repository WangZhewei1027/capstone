import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da07f60-cd2f-11f0-a440-159d7b77af86.html';

/**
 * Page Object for the Linked List demo page.
 * Encapsulates DOM queries and common operations used by tests.
 */
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Returns number of <li> items rendered in the linked list
  async getListCount() {
    return this.page.locator('#linkedList > li').count();
  }

  // Returns array of textContent of list items in order
  async getListTexts() {
    return this.page.$$eval('#linkedList > li', nodes => nodes.map(n => n.textContent));
  }

  // Returns computed ::after content for the li at zero-based index
  async getAfterPseudoContentForIndex(index) {
    return this.page.evaluate((idx) => {
      const list = document.querySelectorAll('#linkedList > li');
      const el = list[idx];
      if (!el) return null;
      // getComputedStyle for pseudo-element ::after
      const style = window.getComputedStyle(el, '::after');
      return style.getPropertyValue('content');
    }, index);
  }

  // Calls the page's linkedList.append and renderLinkedList(list) to mutate and re-render
  // This intentionally uses the page's existing functions/objects without injecting anything.
  async appendNodeAndRender(data) {
    await this.page.evaluate((d) => {
      // Use existing global linkedList and renderLinkedList if present
      if (window.linkedList && typeof window.linkedList.append === 'function') {
        window.linkedList.append(d);
      }
      if (typeof window.renderLinkedList === 'function') {
        window.renderLinkedList(window.linkedList);
      }
    }, data);
  }

  // Retrieve the linkedList.toArray() from the page if available
  async getLinkedListArray() {
    return this.page.evaluate(() => {
      if (window.linkedList && typeof window.linkedList.toArray === 'function') {
        return window.linkedList.toArray();
      }
      return null;
    });
  }
}

test.describe('Linked List Visualization - Basic Rendering and Behavior', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let consoleMessages = [];
  let linkedListPage;

  // Attach listeners before each navigation to capture early console/page errors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      // Collect unhandled exceptions thrown in page context
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    linkedListPage = new LinkedListPage(page);
    await linkedListPage.goto();
  });

  test.afterEach(async () => {
    // Intentionally assert inside tests; afterEach kept minimal for cleanup if needed later.
  });

  test('Initial page load shows heading, description and linked list container', async ({ page }) => {
    // Purpose: Verify page loads and static content is present
    await expect(page.locator('h1')).toHaveText('Linked List Visualization');
    await expect(page.locator('p')).toContainText('A simple visualization of a linked list using JavaScript.');
    await expect(page.locator('#linkedList')).toBeVisible();

    // Ensure no unexpected runtime errors occurred during load
    expect(pageErrors.length, 'No page exceptions should occur on load').toBe(0);
    expect(consoleErrors.length, 'No console.error messages should be logged on load').toBe(0);
  });

  test('Renders four nodes in correct order on initial load', async () => {
    // Purpose: Ensure the initial linked list is rendered with the expected nodes
    const texts = await linkedListPage.getListTexts();
    expect(texts.length, 'Should render 4 list items initially').toBe(4);
    expect(texts).toEqual(['Node A', 'Node B', 'Node C', 'Node D']);

    // Also confirm that the page's linkedList.toArray returns matching data
    const modelArray = await linkedListPage.getLinkedListArray();
    expect(modelArray).toEqual(['Node A', 'Node B', 'Node C', 'Node D']);
  });

  test('There are no interactive controls (inputs, buttons, forms) on the page', async ({ page }) => {
    // Purpose: Validate that the page has no interactive form controls as per the implementation
    const inputs = await page.$$eval('input, button, select, textarea, form', els => els.length);
    expect(inputs, 'No interactive form elements should be present').toBe(0);
  });

  test('CSS arrow pseudo-element appears for each node except the last', async () => {
    // Purpose: Verify visual cue (arrow via ::after) is present for items except last
    const count = await linkedListPage.getListCount();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const content = await linkedListPage.getAfterPseudoContentForIndex(i);
      // CSS content is returned quoted, e.g. '"→"' or '""'
      if (i < count - 1) {
        expect(content.trim(), `Item ${i} should have an arrow in ::after`).toBe('"→"');
      } else {
        expect(content.trim(), 'Last item should not have arrow content in ::after').toBe('""');
      }
    }
  });
});

test.describe('Linked List Mutation and Edge Case Scenarios', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let linkedListPage;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err && err.message ? err.message : String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    linkedListPage = new LinkedListPage(page);
    await linkedListPage.goto();
  });

  test('Appending a new node updates the model and DOM correctly', async () => {
    // Purpose: Simulate adding a node by calling the page's existing API and verify DOM updates
    await linkedListPage.appendNodeAndRender('Node E');

    const textsAfter = await linkedListPage.getListTexts();
    expect(textsAfter).toEqual(['Node A', 'Node B', 'Node C', 'Node D', 'Node E']);
    const count = await linkedListPage.getListCount();
    expect(count).toBe(5);

    // Check pseudo-element content: previous last should now show arrow, new last should not
    const prevLastAfter = await linkedListPage.getAfterPseudoContentForIndex(3); // index 3 was old last
    expect(prevLastAfter.trim()).toBe('"→"');
    const newLastAfter = await linkedListPage.getAfterPseudoContentForIndex(4);
    expect(newLastAfter.trim()).toBe('""');

    // Ensure linkedList.toArray includes the new node
    const modelArray = await linkedListPage.getLinkedListArray();
    expect(modelArray).toEqual(['Node A', 'Node B', 'Node C', 'Node D', 'Node E']);

    // Ensure no runtime errors were generated by calling append/render
    expect(pageErrors.length, 'No page exceptions should be thrown when appending and rendering').toBe(0);
    expect(consoleErrors.length, 'No console.error should appear when appending and rendering').toBe(0);
  });

  test('Appending empty string and null values and verifying DOM representation', async () => {
    // Purpose: Test edge cases for adding falsy values to the list
    await linkedListPage.appendNodeAndRender(''); // empty string
    await linkedListPage.appendNodeAndRender(null); // null value

    const texts = await linkedListPage.getListTexts();
    // Last two appended items should be represented in the DOM; null becomes "null" when coerced to textContent
    const lastIndex = texts.length - 1;
    expect(texts[lastIndex], 'Last item should reflect appended null as string').toBe('null');
    expect(texts[lastIndex - 1], 'Second last should be the empty string appended').toBe('');

    // Validate model includes the actual null value (toArray returns the raw data)
    const model = await linkedListPage.getLinkedListArray();
    expect(model.includes(null)).toBe(true);
    expect(model[model.length - 2]).toBe('');
  });

  test('No unexpected errors emitted to console or page error during mutation tests', async () => {
    // Purpose: A final guard to ensure mutations do not create runtime errors
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});