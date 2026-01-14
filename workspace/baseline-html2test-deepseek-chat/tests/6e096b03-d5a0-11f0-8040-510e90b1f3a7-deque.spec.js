import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e096b03-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object Model for the Deque page
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.input = page.locator('#element-value');
    this.insertFrontBtn = page.locator('#insert-front');
    this.insertRearBtn = page.locator('#insert-rear');
    this.deleteFrontBtn = page.locator('#delete-front');
    this.deleteRearBtn = page.locator('#delete-rear');
    this.clearBtn = page.locator('#clear-btn');

    // Visualization area
    this.dequeContainer = page.locator('#deque');
    this.elementItems = page.locator('#deque .element');
    this.emptyMessage = page.locator('#deque >> text=Deque is empty');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Ensure initial visualization script had a chance to run
    await this.page.waitForTimeout(50);
  }

  // Insert value at rear using the input and insert rear button
  async insertRear(value) {
    await this.input.fill(value);
    await this.insertRearBtn.click();
    // wait for animation & DOM update (script uses 300ms timeouts)
    await this.page.waitForTimeout(350);
  }

  // Insert value at front
  async insertFront(value) {
    await this.input.fill(value);
    await this.insertFrontBtn.click();
    await this.page.waitForTimeout(350);
  }

  // Delete from front
  async deleteFront() {
    await this.deleteFrontBtn.click();
    await this.page.waitForTimeout(350);
  }

  // Delete from rear
  async deleteRear() {
    await this.deleteRearBtn.click();
    await this.page.waitForTimeout(350);
  }

  // Clear deque
  async clearDeque() {
    await this.clearBtn.click();
    await this.page.waitForTimeout(350);
  }

  // Press Enter while focused on the input (should trigger insert rear)
  async pressEnterOnInput(value) {
    await this.input.fill(value);
    await this.input.press('Enter');
    await this.page.waitForTimeout(350);
  }

  // Get array of visible element texts (stripped)
  async getElementsText() {
    // If empty message is visible, return []
    const isEmptyVisible = await this.emptyMessage.isVisible().catch(() => false);
    if (isEmptyVisible) return [];
    const count = await this.elementItems.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      const handle = this.elementItems.nth(i);
      // textContent includes element value and indicators; trim to a normalized string
      const txt = (await handle.textContent()) || '';
      texts.push(txt.trim());
    }
    return texts;
  }

  // Helper to get the raw innerText of nth element
  async getElementInnerText(index) {
    const count = await this.elementItems.count();
    if (index < 0 || index >= count) return null;
    return (await this.elementItems.nth(index).innerText()).trim();
  }
}

test.describe('Deque Visualization (6e096b03-d5a0-11f0-8040-510e90b1f3a7)', () => {
  // Collect console errors and page errors to assert none occurred unexpectedly.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages and page errors
    page.on('console', (msg) => {
      // capture only error-level console messages
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test('Initial load: page shows title, controls and empty deque message with no console/page errors', async ({ page }) => {
    // Purpose: verify initial state and that no JavaScript runtime errors are thrown during load.
    const dequePage = new DequePage(page);
    await dequePage.goto();

    // Verify title and header text exist
    await expect(page.locator('h1')).toHaveText('Deque (Double-Ended Queue) Visualization');

    // Verify input is empty and has maxlength=5
    await expect(dequePage.input).toBeVisible();
    await expect(dequePage.input).toHaveValue('');
    const maxLength = await dequePage.input.getAttribute('maxlength');
    expect(maxLength).toBe('5');

    // Verify buttons are visible
    await expect(dequePage.insertFrontBtn).toBeVisible();
    await expect(dequePage.insertRearBtn).toBeVisible();
    await expect(dequePage.deleteFrontBtn).toBeVisible();
    await expect(dequePage.deleteRearBtn).toBeVisible();
    await expect(dequePage.clearBtn).toBeVisible();

    // Verify initial visualization indicates empty deque
    await expect(dequePage.emptyMessage).toBeVisible();

    // Assert no console errors or page errors occurred during load
    expect(consoleErrors, `Console error events occurred: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `Page error events occurred: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
  });

  test('Insert at rear and front: elements appear in correct order with Front/Rear indicators', async ({ page }) => {
    // Purpose: validate insertRear and insertFront operations and indicators
    const dequePage = new DequePage(page);
    await dequePage.goto();

    // Insert 'A' at rear
    await dequePage.insertRear('A');

    // After insertion, there should be one element with both Front and Rear indicators
    const elemsAfterA = await dequePage.getElementsText();
    expect(elemsAfterA.length).toBe(1);
    // The inner text should contain 'A' and both 'Front' and 'Rear'
    const singleText = elemsAfterA[0];
    expect(singleText).toContain('A');
    expect(singleText).toContain('Front');
    expect(singleText).toContain('Rear');

    // Insert 'B' at front
    await dequePage.insertFront('B');

    // Now there should be two elements, first B then A
    const elems = await dequePage.getElementsText();
    expect(elems.length).toBe(2);

    // First element should contain 'B' and 'Front' indicator only
    const firstText = await dequePage.getElementInnerText(0);
    expect(firstText).toContain('B');
    expect(firstText).toContain('Front');
    // It should not contain 'Rear' because it's the front
    expect(firstText).not.toContain('Rear');

    // Second element should contain 'A' and 'Rear' indicator only
    const secondText = await dequePage.getElementInnerText(1);
    expect(secondText).toContain('A');
    expect(secondText).toContain('Rear');
    expect(secondText).not.toContain('Front');

    // Input should have been cleared after each insert
    await expect(dequePage.input).toHaveValue('');

    // Assert no console/page errors occurred during these interactions
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Delete operations: delete from front and rear update visualization and handle empty state', async ({ page }) => {
    // Purpose: validate deletion animations and final states, including alerts when deleting from empty deque
    const dequePage = new DequePage(page);
    await dequePage.goto();

    // Prepare deque with two elements: X (front), Y (rear)
    await dequePage.insertRear('Y');
    await dequePage.insertFront('X'); // X, Y

    // Delete from front: should remove X and leave Y as sole element with both indicators
    await dequePage.deleteFront();
    const afterDeleteFront = await dequePage.getElementsText();
    expect(afterDeleteFront.length).toBe(1);
    expect(afterDeleteFront[0]).toContain('Y');
    expect(afterDeleteFront[0]).toContain('Front');
    expect(afterDeleteFront[0]).toContain('Rear');

    // Delete from rear: should remove the last element and show empty message
    await dequePage.deleteRear();
    const afterDeleteRear = await dequePage.getElementsText();
    expect(afterDeleteRear.length).toBe(0);
    await expect(dequePage.emptyMessage).toBeVisible();

    // Now attempt deleting from empty deque should trigger an alert with message 'Deque is empty'
    // Set up dialog handler before clicking
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      dequePage.deleteFrontBtn.click(), // triggers alert path since deque is empty
    ]);
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Deque is empty');
    await dialog.accept();

    // Also test delete-rear triggers similar alert when empty
    const [dialog2] = await Promise.all([
      page.waitForEvent('dialog'),
      dequePage.deleteRearBtn.click(),
    ]);
    expect(dialog2.type()).toBe('alert');
    expect(dialog2.message()).toBe('Deque is empty');
    await dialog2.accept();

    // Assert no console/page errors occurred
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Clear button removes all elements with animation and results in empty visualization', async ({ page }) => {
    // Purpose: verify clear operation empties the deque after the animation timeout
    const dequePage = new DequePage(page);
    await dequePage.goto();

    // Insert three elements
    await dequePage.insertRear('1');
    await dequePage.insertRear('2');
    await dequePage.insertRear('3');

    // Verify three elements present
    let texts = await dequePage.getElementsText();
    expect(texts.length).toBe(3);

    // Click clear and wait for animation to complete
    await dequePage.clearBtn.click();
    await page.waitForTimeout(350);

    // After clearing, deque should show empty message
    texts = await dequePage.getElementsText();
    expect(texts.length).toBe(0);
    await expect(dequePage.emptyMessage).toBeVisible();

    // Assert no console/page errors occurred
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Input Enter key inserts at rear; maxlength attribute limits value to 5 characters', async ({ page }) => {
    // Purpose: ensure pressing Enter triggers insert at rear and maxlength behaves as expected
    const dequePage = new DequePage(page);
    await dequePage.goto();

    // Use Enter key to insert 'ENTER'
    await dequePage.pressEnterOnInput('ENT');
    // Because input was 'ENT' we expect one element with 'ENT'
    let texts = await dequePage.getElementsText();
    expect(texts.length).toBe(1);
    expect(texts[0]).toContain('ENT');

    // Clear and test maxlength
    await dequePage.clearDeque();
    await dequePage.insertRear('1234567'); // attempt to insert longer string, input maxlength=5 should limit it
    // The DOM element should contain only the first 5 characters '12345'
    texts = await dequePage.getElementsText();
    expect(texts.length).toBe(1);
    expect(texts[0]).toContain('12345');
    expect(texts[0]).not.toContain('1234567');

    // Assert no console/page errors occurred
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Alerts on empty-insert attempts show correct message and are handled', async ({ page }) => {
    // Purpose: test edge case of clicking insert buttons with empty input triggers alert
    const dequePage = new DequePage(page);
    await dequePage.goto();

    // Ensure input empty
    await dequePage.input.fill('');

    // Click insert-front with empty input -> alert 'Please enter a value'
    const alertPromise1 = page.waitForEvent('dialog');
    await dequePage.insertFrontBtn.click();
    const alert1 = await alertPromise1;
    expect(alert1.type()).toBe('alert');
    expect(alert1.message()).toBe('Please enter a value');
    await alert1.accept();

    // Click insert-rear with empty input -> alert 'Please enter a value'
    const alertPromise2 = page.waitForEvent('dialog');
    await dequePage.insertRearBtn.click();
    const alert2 = await alertPromise2;
    expect(alert2.type()).toBe('alert');
    expect(alert2.message()).toBe('Please enter a value');
    await alert2.accept();

    // Assert still empty
    const texts = await dequePage.getElementsText();
    expect(texts.length).toBe(0);

    // Assert no console/page errors occurred
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});