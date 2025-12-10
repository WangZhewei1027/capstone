import { test, expect } from '@playwright/test';

// Tests for Binary Search Tree Visualization application
// Application URL:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa590-d59e-11f0-89ab-2f71529652ac.html

// Page Object for the BST page
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa590-d59e-11f0-89ab-2f71529652ac.html';
    this.input = page.locator('#valueInput');
    this.insertButton = page.locator('button', { hasText: 'Insert into BST' });
    this.bstDiv = page.locator('#bst');
    this.nodeSelector = '.node';
    this.lineSelector = '.line';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  // Type a value into the input and click the insert button
  async insertValue(value) {
    await this.input.fill(String(value));
    await this.insertButton.click();
  }

  async getNodeCount() {
    return await this.page.locator(this.nodeSelector).count();
  }

  async getNodeTexts() {
    const nodes = this.page.locator(this.nodeSelector);
    const count = await nodes.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await nodes.nth(i).innerText());
    }
    return texts;
  }

  async getLineCount() {
    return await this.page.locator(this.lineSelector).count();
  }

  async getInputValue() {
    return await this.input.inputValue();
  }
}

test.describe('Binary Search Tree Visualization - interactive behavior and runtime errors', () => {
  // Capture console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', msg => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        // ignore any unexpected console inspection errors
      }
    });

    // Collect page errors (runtime exceptions)
    page.on('pageerror', error => {
      // error is an Error object; store its message for assertions
      pageErrors.push(error);
    });
  });

  // Test initial page load and default state
  test('Initial load: UI elements are present and BST is empty', async ({ page }) => {
    const bstPage = new BSTPage(page);
    await bstPage.goto();

    // The title should be present
    await expect(page).toHaveTitle(/Binary Search Tree Visualization/);

    // Input and button should be visible
    await expect(bstPage.input).toBeVisible();
    await expect(bstPage.insertButton).toBeVisible();

    // BST container should exist and be empty initially (no .node elements)
    const nodeCount = await bstPage.getNodeCount();
    expect(nodeCount).toBe(0);

    // No lines should be present initially
    const lineCount = await bstPage.getLineCount();
    expect(lineCount).toBe(0);

    // No page errors should have occurred on initial load
    expect(pageErrors.length).toBe(0);

    // No console errors of type 'error' initially (collecting all console messages is OK)
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  // Test inserting a single valid value: should create the root node and clear the input
  test('Inserting a single value creates root node and clears input', async ({ page }) => {
    const bstPage1 = new BSTPage(page);
    await bstPage.goto();

    // Insert a valid number
    await bstPage.insertValue(10);

    // After insertion, there should be one node with the value '10'
    const nodeCount1 = await bstPage.getNodeCount();
    expect(nodeCount).toBe(1);

    const texts1 = await bstPage.getNodeTexts();
    expect(texts).toContain('10');

    // Input should be cleared after successful insertion
    const inputValue = await bstPage.getInputValue();
    expect(inputValue).toBe('');

    // No runtime page errors should have occurred for a single insertion
    expect(pageErrors.length).toBe(0);
  });

  // Test that inserting a second value which creates a child triggers the runtime error in the provided implementation
  test('Inserting a second value that requires a child node triggers a runtime page error (appendChild with undefined)', async ({ page }) => {
    const bstPage2 = new BSTPage(page);
    await bstPage.goto();

    // Insert the root first - should succeed without errors
    await bstPage.insertValue(10);
    expect(await bstPage.getNodeCount()).toBe(1);
    expect(pageErrors.length).toBe(0);

    // Attempt to insert a left child (smaller number).
    // The implementation attempts to append the result of visualizeNode (which returns undefined)
    // to a div, which should cause a TypeError at runtime. We wait for a pageerror event.
    const pageErrorPromise = page.waitForEvent('pageerror');

    await bstPage.insertValue(5);

    // Wait for the pageerror to be thrown by the page (if it occurs)
    let caughtError;
    try {
      caughtError = await pageErrorPromise;
      // push into our pageErrors tracking as well
      pageErrors.push(caughtError);
    } catch (e) {
      // If no pageerror occurs within the timeout, the test should still assert that one was expected.
    }

    // Assert that at least one runtime page error was observed
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // The first observed error should be an Error object with a string message
    const firstError = pageErrors[0];
    expect(typeof firstError.message).toBe('string');
    // The message likely mentions 'appendChild' or 'Node' or 'TypeError' given the broken appendChild call.
    // Assert that the message contains some hint about appendChild or TypeError (if present)
    const msg = firstError.message.toLowerCase();
    expect(
      msg.includes('appendchild') ||
      msg.includes('typeerror') ||
      msg.includes('cannot read') ||
      msg.includes('node')
    ).toBeTruthy();

    // Ensure that the root node still exists in the DOM despite the runtime error
    const nodeCountAfter = await bstPage.getNodeCount();
    expect(nodeCountAfter).toBeGreaterThanOrEqual(1);

    // It's likely that the second node was not successfully appended due to the error,
    // so expect at most 1 node (robust: allow >=1 but assert not increased too much)
    // (We assert it's exactly 1 because the child append failed.)
    expect(nodeCountAfter).toBe(1);
  });

  // Test handling of invalid input: alert should be shown with appropriate message
  test('Invalid input triggers an alert dialog with message "Please enter a valid number"', async ({ page }) => {
    const bstPage3 = new BSTPage(page);
    await bstPage.goto();

    // Prepare to capture the dialog event
    let dialogMessage = null;
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      // Accept/dismiss the dialog to allow the page to continue
      await dialog.accept();
    });

    // Insert invalid value (non-number)
    await bstPage.input.fill('abc');
    await bstPage.insertButton.click();

    // Give the dialog handler a small moment to capture the dialog
    await page.waitForTimeout(100);

    // Assert that the dialog with the expected message appeared
    expect(dialogMessage).toBe('Please enter a valid number');

    // No new nodes should be created
    const nodeCount2 = await bstPage.getNodeCount();
    expect(nodeCount).toBe(0);
  });

  // Test accessibility and visibility: elements should be visible and focusable
  test('Input and button are visible and focusable (basic accessibility checks)', async ({ page }) => {
    const bstPage4 = new BSTPage(page);
    await bstPage.goto();

    // Both input and button should be visible and enabled
    await expect(bstPage.input).toBeVisible();
    await expect(bstPage.input).toBeEnabled();
    await expect(bstPage.insertButton).toBeVisible();
    await expect(bstPage.insertButton).toBeEnabled();

    // Focus the input and type a value, then press Enter to ensure button click is required (no form submit)
    await bstPage.input.focus();
    await bstPage.input.type('7');

    // Press Enter to attempt to submit - since there's no form submit handler, nothing should happen
    await bstPage.input.press('Enter');

    // No nodes should be added by pressing Enter (button click is required)
    expect(await bstPage.getNodeCount()).toBe(0);

    // Now click the button to confirm insertion works
    await bstPage.insertButton.click();
    expect(await bstPage.getNodeCount()).toBe(1);
  });

  test.afterEach(async ({}, testInfo) => {
    // Attach some debug info to the test output if there were page errors
    if (pageErrors.length > 0) {
      // Add small context to the test output logs (Playwright will include this)
      console.log(`Captured ${pageErrors.length} page error(s) during test "${testInfo.title}":`);
      pageErrors.forEach((err, idx) => {
        console.log(`#${idx + 1}: ${err && err.message ? err.message : String(err)}`);
      });
    }
  });
});