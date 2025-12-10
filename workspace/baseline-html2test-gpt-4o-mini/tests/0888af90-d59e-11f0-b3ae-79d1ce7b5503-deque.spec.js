import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888af90-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page object encapsulating interactions with the Deque demo
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputValue');
    this.addFrontBtn = page.getByRole('button', { name: 'Add to Front' });
    this.addBackBtn = page.getByRole('button', { name: 'Add to Back' });
    this.removeFrontBtn = page.getByRole('button', { name: 'Remove from Front' });
    this.removeBackBtn = page.getByRole('button', { name: 'Remove from Back' });
    this.clearBtn = page.getByRole('button', { name: 'Clear Deque' });
    this.dequeList = page.locator('#dequeList');
    this.listItems = this.dequeList.locator('li');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Enter a value into the input
  async enterValue(value) {
    await this.input.fill(value);
  }

  // Read the current input value
  async getInputValue() {
    return await this.input.inputValue();
  }

  // Click add to front
  async clickAddFront() {
    await this.addFrontBtn.click();
  }

  // Click add to back
  async clickAddBack() {
    await this.addBackBtn.click();
  }

  // Click remove from front
  async clickRemoveFront() {
    await this.removeFrontBtn.click();
  }

  // Click remove from back
  async clickRemoveBack() {
    await this.removeBackBtn.click();
  }

  // Click clear
  async clickClear() {
    await this.clearBtn.click();
  }

  // Get number of items in the deque list
  async getItemCount() {
    return await this.listItems.count();
  }

  // Get text contents of list items in order
  async getItemsText() {
    const count = await this.listItems.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.listItems.nth(i).innerText());
    }
    return texts;
  }

  // Hover a specific item index and return computed background-color before and after hover
  async getBackgroundColorsForItem(index = 0) {
    const item = this.listItems.nth(index);
    const before = await this.page.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    }, await item.elementHandle());
    await item.hover();
    // small wait to allow CSS hover effect/transition to take effect
    await this.page.waitForTimeout(100);
    const after = await this.page.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    }, await item.elementHandle());
    return { before, after };
  }
}

test.describe('Deque (Double-ended Queue) Demonstration - UI & Behavior', () => {
  let consoleErrors;
  let pageErrors;

  // Setup: navigate to the app and attach listeners to capture console errors and uncaught page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), args: msg.args() });
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Go to the application URL
    await page.goto(APP_URL);
  });

  // Teardown: ensure there were no console errors or page errors unless the test explicitly asserts them
  test.afterEach(async () => {
    // By default the application should not produce console.error or uncaught exceptions.
    // Tests that expect dialogs or other behaviors should assert as needed. Here we assert none occurred.
    expect(consoleErrors, `Expected no console.error messages, but found: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Expected no uncaught page errors, but found: ${JSON.stringify(pageErrors)}`).toEqual([]);
  });

  test('Initial page load shows correct structure and empty deque', async ({ page }) => {
    // Purpose: Verify the initial page state - heading, controls, and an empty deque list
    const dp = new DequePage(page);

    // Verify title and heading exist
    await expect(page).toHaveTitle(/Deque/i);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Deque/i);

    // Input should be visible and empty
    await expect(dp.input).toBeVisible();
    expect(await dp.getInputValue()).toBe('');

    // All control buttons should be visible
    await expect(dp.addFrontBtn).toBeVisible();
    await expect(dp.addBackBtn).toBeVisible();
    await expect(dp.removeFrontBtn).toBeVisible();
    await expect(dp.removeBackBtn).toBeVisible();
    await expect(dp.clearBtn).toBeVisible();

    // The deque list should initially be empty
    expect(await dp.getItemCount()).toBe(0);
    expect(await dp.getItemsText()).toEqual([]);
  });

  test('Add to back and front updates DOM and clears input', async ({ page }) => {
    // Purpose: Ensure addBack pushes to the end, addFront unshifts to the start, and input is cleared after add
    const dp1 = new DequePage(page);

    // Add 'A' to back
    await dp.enterValue('A');
    await dp.clickAddBack();
    expect(await dp.getItemCount()).toBe(1);
    expect(await dp.getItemsText()).toEqual(['A']);
    expect(await dp.getInputValue()).toBe(''); // input should be cleared

    // Add 'B' to back -> order A, B
    await dp.enterValue('B');
    await dp.clickAddBack();
    expect(await dp.getItemCount()).toBe(2);
    expect(await dp.getItemsText()).toEqual(['A', 'B']);
    expect(await dp.getInputValue()).toBe('');

    // Add 'X' to front -> order X, A, B
    await dp.enterValue('X');
    await dp.clickAddFront();
    expect(await dp.getItemCount()).toBe(3);
    expect(await dp.getItemsText()).toEqual(['X', 'A', 'B']);
    expect(await dp.getInputValue()).toBe('');
  });

  test('Remove from front and back updates DOM and respects order', async ({ page }) => {
    // Purpose: Validate that removeFront removes the first element and removeBack removes the last element
    const dp2 = new DequePage(page);

    // Populate deque: 1,2,3
    await dp.enterValue('1');
    await dp.clickAddBack();
    await dp.enterValue('2');
    await dp.clickAddBack();
    await dp.enterValue('3');
    await dp.clickAddBack();
    expect(await dp.getItemsText()).toEqual(['1', '2', '3']);

    // removeFront -> removes '1', remaining 2,3
    await dp.clickRemoveFront();
    expect(await dp.getItemsText()).toEqual(['2', '3']);

    // removeBack -> removes '3', remaining 2
    await dp.clickRemoveBack();
    expect(await dp.getItemsText()).toEqual(['2']);

    // removeFront -> removes '2', remaining empty
    await dp.clickRemoveFront();
    expect(await dp.getItemCount()).toBe(0);
    expect(await dp.getItemsText()).toEqual([]);
  });

  test('Clear deque empties the list regardless of contents', async ({ page }) => {
    // Purpose: Confirm clearDeque empties the deque display
    const dp3 = new DequePage(page);

    // Add items
    await dp.enterValue('alpha');
    await dp.clickAddBack();
    await dp.enterValue('beta');
    await dp.clickAddBack();
    expect(await dp.getItemCount()).toBe(2);

    // Clear
    await dp.clickClear();
    expect(await dp.getItemCount()).toBe(0);
    expect(await dp.getItemsText()).toEqual([]);
  });

  test('Alerts on invalid operations: adding empty value and removing from empty deque', async ({ page }) => {
    // Purpose: Validate alert dialogs appear with correct messages for edge cases
    const dp4 = new DequePage(page);

    // When input is empty and addFront is clicked -> alert "Please enter a value!"
    // Use page.once to handle the dialog and assert message
    const promiseDialogAddFront = page.waitForEvent('dialog');
    await dp.clickAddFront();
    const dialogAddFront = await promiseDialogAddFront;
    expect(dialogAddFront.message()).toBe('Please enter a value!');
    await dialogAddFront.accept();

    // When input is empty and addBack is clicked -> same alert
    const promiseDialogAddBack = page.waitForEvent('dialog');
    await dp.clickAddBack();
    const dialogAddBack = await promiseDialogAddBack;
    expect(dialogAddBack.message()).toBe('Please enter a value!');
    await dialogAddBack.accept();

    // When deque is empty and removeFront is clicked -> alert "Deque is empty!"
    const promiseDialogRemoveFront = page.waitForEvent('dialog');
    await dp.clickRemoveFront();
    const dialogRemoveFront = await promiseDialogRemoveFront;
    expect(dialogRemoveFront.message()).toBe('Deque is empty!');
    await dialogRemoveFront.accept();

    // When deque is empty and removeBack is clicked -> alert "Deque is empty!"
    const promiseDialogRemoveBack = page.waitForEvent('dialog');
    await dp.clickRemoveBack();
    const dialogRemoveBack = await promiseDialogRemoveBack;
    expect(dialogRemoveBack.message()).toBe('Deque is empty!');
    await dialogRemoveBack.accept();
  });

  test('Hovering over list items changes background color according to CSS :hover rule', async ({ page }) => {
    // Purpose: Verify the visual hover effect on list items (background-color changes)
    const dp5 = new DequePage(page);

    // Add an item to test hover
    await dp.enterValue('hover-test');
    await dp.clickAddBack();
    expect(await dp.getItemCount()).toBe(1);

    // Get before and after hover background colors
    const { before, after } = await dp.getBackgroundColorsForItem(0);

    // Default li background is white (#fff -> rgb(255, 255, 255))
    expect(before).toMatch(/rgb\(255,\s*255,\s*255\)/);

    // Hover background as defined in CSS is #e8e8e8 -> rgb(232, 232, 232)
    expect(after).toMatch(/rgb\(232,\s*232,\s*232\)/);
  });

  test('Sequence of operations maintains correct deque semantics', async ({ page }) => {
    // Purpose: Run a combined flow of operations to ensure data flow and state updates are correct
    const dp6 = new DequePage(page);

    // Start with empty deque
    expect(await dp.getItemCount()).toBe(0);

    // addBack A, B ; addFront Z ; expected Z, A, B
    await dp.enterValue('A');
    await dp.clickAddBack();
    await dp.enterValue('B');
    await dp.clickAddBack();
    await dp.enterValue('Z');
    await dp.clickAddFront();
    expect(await dp.getItemsText()).toEqual(['Z', 'A', 'B']);

    // removeBack -> removes B -> Z, A
    await dp.clickRemoveBack();
    expect(await dp.getItemsText()).toEqual(['Z', 'A']);

    // clear -> empty
    await dp.clickClear();
    expect(await dp.getItemsText()).toEqual([]);

    // Attempt to removeFront on empty -> alert
    const dlg = await page.waitForEvent('dialog');
    await dp.clickRemoveFront();
    // The dialog event was awaited; confirm message and accept
    expect(dlg.message()).toBe('Deque is empty!');
    await dlg.accept();
  });
});