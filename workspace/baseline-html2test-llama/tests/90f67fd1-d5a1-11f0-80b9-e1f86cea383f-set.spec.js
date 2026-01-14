import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f67fd1-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object for the Set widget page
class SetPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('#set-container');
    this.input = page.locator('#set-value');
    this.clearButton = page.locator('#clear-set');
    this.spanInContainer = page.locator('#set-container span');
    // arrays to collect errors and console error messages
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async goto() {
    // attach handlers to record console errors and page errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });
    this.page.on('pageerror', err => {
      this.pageErrors.push(err.message);
    });
    await this.page.goto(APP_URL);
  }

  // Returns whether the input element exists in the DOM
  async inputExists() {
    return await this.input.count() > 0;
  }

  // Returns whether the clear button exists in the DOM
  async clearButtonExists() {
    return await this.clearButton.count() > 0;
  }

  // Type text into the input (if present)
  async typeIntoInput(text) {
    await this.input.fill(''); // ensure empty first
    await this.input.type(text);
  }

  // Click the clear button (if present)
  async clickClear() {
    await this.clearButton.click();
  }

  // Retrieve the textual content of the span inside container (if present)
  async getSpanText() {
    if (await this.spanInContainer.count() === 0) return null;
    return (await this.spanInContainer.textContent()) ?? '';
  }

  // Read the page's setValue variable (if accessible)
  async readSetValueVariable() {
    // We attempt to read the variable in a safe way and return both presence and value
    return await this.page.evaluate(() => {
      try {
        const hasBinding = typeof setValue !== 'undefined';
        return {
          hasBinding,
          value: hasBinding ? setValue : undefined,
          windowProp: window.setValue === undefined ? undefined : window.setValue,
        };
      } catch (e) {
        return { error: e.message };
      }
    });
  }
}

test.describe('Set widget - E2E behavior and DOM changes', () => {
  // Each test will create its own page and SetPage instance
  test.beforeEach(async ({ page }) => {
    // nothing global here; individual tests will instantiate SetPage and call goto()
  });

  // Test initial page load and default state of elements
  test('Initial load: container has input and clear button, setValue initial state is null', async ({ page }) => {
    const setPage = new SetPage(page);
    await setPage.goto();

    // The container should be visible
    await expect(setPage.container).toBeVisible();

    // The input should be present and visible with the correct placeholder
    expect(await setPage.inputExists()).toBe(true);
    await expect(setPage.input).toBeVisible();
    await expect(setPage.input).toHaveAttribute('placeholder', 'Enter a set value');

    // The clear button should be present and visible
    expect(await setPage.clearButtonExists()).toBe(true);
    await expect(setPage.clearButton).toBeVisible();
    await expect(setPage.clearButton).toHaveText('Clear Set');

    // The span inside container should not exist initially
    expect(await setPage.spanInContainer.count()).toBe(0);

    // The page-level variable setValue should initially be null
    const setValueInfo = await setPage.readSetValueVariable();
    // Ensure the variable exists and its value is explicitly null initially
    expect(setValueInfo.hasBinding).toBe(true);
    expect(setValueInfo.value).toBeNull();

    // No console errors or page errors happened during load
    expect(setPage.consoleErrors.length).toBe(0);
    expect(setPage.pageErrors.length).toBe(0);
  });

  // Test typing into the input updates state and replaces DOM contents
  test('Typing into input replaces input+button with span and updates internal variable', async ({ page }) => {
    const setPage1 = new SetPage(page);
    await setPage.goto();

    // Type a value into the input
    const testValue = 'HelloSet';
    await setPage.typeIntoInput(testValue);

    // After input event triggers, the container content should be replaced with a span containing the text
    await expect(setPage.spanInContainer).toHaveText(testValue);

    // Input and clear button should no longer exist in the DOM (they were removed by innerHTML replacement)
    expect(await setPage.inputExists()).toBe(false);
    expect(await setPage.clearButtonExists()).toBe(false);

    // The global setValue variable should reflect the value typed
    const setValueInfo1 = await setPage.readSetValueVariable();
    expect(setValueInfo.hasBinding).toBe(true);
    expect(setValueInfo.value).toBe(testValue);

    // Ensure no console errors or page errors occurred during typing and DOM replacement
    expect(setPage.consoleErrors.length).toBe(0);
    expect(setPage.pageErrors.length).toBe(0);
  });

  // Test clearing using the clear button before any input (button is present initially)
  test('Clicking Clear Set button before typing empties container and resets setValue to null', async ({ page }) => {
    const setPage2 = new SetPage(page);
    await setPage.goto();

    // Sanity: input and button are present
    expect(await setPage.inputExists()).toBe(true);
    expect(await setPage.clearButtonExists()).toBe(true);

    // Click the clear button
    await setPage.clickClear();

    // The container should now be empty (no children)
    // Using evaluate to check innerHTML quickly
    const innerHTML = await page.evaluate(() => document.getElementById('set-container').innerHTML);
    expect(innerHTML).toBe('');

    // The setValue variable should be explicitly reset to null by the click handler
    const setValueInfo2 = await setPage.readSetValueVariable();
    expect(setValueInfo.hasBinding).toBe(true);
    expect(setValueInfo.value).toBeNull();

    // No console errors or page errors during the click
    expect(setPage.consoleErrors.length).toBe(0);
    expect(setPage.pageErrors.length).toBe(0);
  });

  // Edge case: after typing (which removes the clear button), ensure clear button is absent and cannot be clicked
  test('After typing, clear button is removed and attempting to locate it yields null', async ({ page }) => {
    const setPage3 = new SetPage(page);
    await setPage.goto();

    // Type to replace container content
    const value = 'XYZ';
    await setPage.typeIntoInput(value);

    // Confirm the span exists with correct value
    await expect(setPage.spanInContainer).toHaveText(value);

    // The clear button should no longer exist
    expect(await setPage.clearButtonExists()).toBe(false);

    // Attempting to get the element by id should be null in the page DOM
    const clearButtonExistsInDOM = await page.evaluate(() => {
      return document.getElementById('clear-set') === null;
    });
    expect(clearButtonExistsInDOM).toBe(true);

    // Attempting to click should not be possible; ensure there are no console/page errors as a result of missing button interactions
    expect(setPage.consoleErrors.length).toBe(0);
    expect(setPage.pageErrors.length).toBe(0);
  });

  // Accessibility and visual checks: container style and visibility remain as expected after interactions
  test('Visual and accessibility checks: container remains visible and has expected styling after interactions', async ({ page }) => {
    const setPage4 = new SetPage(page);
    await setPage.goto();

    // The container should be visible initially
    await expect(setPage.container).toBeVisible();

    // Check that container has a border (computed style)
    const borderStyle = await page.evaluate(() => {
      const el = document.getElementById('set-container');
      const style = window.getComputedStyle(el);
      return { borderWidth: style.borderWidth, borderStyle: style.borderStyle, borderRadius: style.borderRadius };
    });
    expect(borderStyle.borderWidth).toBeTruthy();
    expect(borderStyle.borderStyle).toBeTruthy();

    // Perform an interaction: click clear to remove children
    await setPage.clickClear();

    // After clearing, container itself should still be visible (empty but present)
    await expect(setPage.container).toBeVisible();

    // No console or page errors from styling or interactions
    expect(setPage.consoleErrors.length).toBe(0);
    expect(setPage.pageErrors.length).toBe(0);
  });

  // Test error-observing behavior: ensure we captured any page errors during the entire flow
  test('No unexpected console errors or uncaught exceptions during typical flows', async ({ page }) => {
    const setPage5 = new SetPage(page);
    await setPage.goto();

    // Perform a sequence of actions: type, reload, type again to exercise script
    await setPage.typeIntoInput('A');
    // After typing, container replaced; reload to restore original state and try again
    await page.reload();
    // Reattach error listeners by re-creating SetPage for the reloaded page
    const setPageAfterReload = new SetPage(page);
    // Reattach handlers and ensure collected arrays are local to this object
    await setPageAfterReload.goto();

    // Type another value
    await setPageAfterReload.typeIntoInput('B');

    // Ensure there were no console errors or page exceptions across the interactions
    expect(setPage.consoleErrors.length).toBe(0);
    expect(setPage.pageErrors.length).toBe(0);
    expect(setPageAfterReload.consoleErrors.length).toBe(0);
    expect(setPageAfterReload.pageErrors.length).toBe(0);
  });
});