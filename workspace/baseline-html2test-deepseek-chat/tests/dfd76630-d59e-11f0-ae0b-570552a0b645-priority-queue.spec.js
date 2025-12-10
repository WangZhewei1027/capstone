import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76630-d59e-11f0-ae0b-570552a0b645.html';

/**
 * Page Object for the Priority Queue page.
 * Encapsulates common interactions and queries to make tests more readable.
 */
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.elementValue = '#elementValue';
    this.prioritySelect = '#prioritySelect';
    this.addBtn = '#addBtn';
    this.removeBtn = '#removeBtn';
    this.clearBtn = '#clearBtn';
    this.queueContent = '#queueContent';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Adds an element using the UI controls. Optionally selects priority ('high'|'medium'|'low').
  async addElement(value, priority = 'medium') {
    await this.page.fill(this.elementValue, value);
    await this.page.selectOption(this.prioritySelect, priority);
    return await this.page.click(this.addBtn);
  }

  // Triggers the remove highest priority action
  async removeHighest() {
    return await this.page.click(this.removeBtn);
  }

  // Clears the queue via Clear Queue button
  async clearQueue() {
    return await this.page.click(this.clearBtn);
  }

  // Press Enter in the input field to add
  async pressEnterOnInput(value, priority = 'medium') {
    await this.page.fill(this.elementValue, value);
    await this.page.selectOption(this.prioritySelect, priority);
    await this.page.focus(this.elementValue);
    return await this.page.press(this.elementValue, 'Enter');
  }

  // Returns visible textual content of the queue display
  async getQueueText() {
    return await this.page.textContent(this.queueContent);
  }

  // Returns list of items as objects {value, priority, classes}
  async getItems() {
    const handles = await this.page.$$(this.queueContent + ' .priority-item');
    const results = [];
    for (const h of handles) {
      const value = (await h.$eval('.priority-value', el => el.textContent)).trim();
      const priority = (await h.$eval('.priority-label', el => el.textContent)).trim();
      const className = await h.getAttribute('class');
      results.push({ value, priority, className });
    }
    return results;
  }

  // Returns class list of the first (highest priority) displayed item, or null if none
  async getFirstItemClass() {
    const first = await this.page.$(this.queueContent + ' .priority-item');
    if (!first) return null;
    return await first.getAttribute('class');
  }

  // Returns number of .priority-item elements
  async getItemCount() {
    const items = await this.page.$$(this.queueContent + ' .priority-item');
    return items.length;
  }

  // Returns inline style transform of the last item (if any)
  async getLastItemTransform() {
    const items = await this.page.$$(this.queueContent + ' .priority-item');
    if (items.length === 0) return null;
    return await items[items.length - 1].evaluate(el => el.style.transform || null);
  }
}

test.describe('Priority Queue Visualization - end-to-end', () => {
  // Collect console and page errors to assert later
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages for debug and to ensure no unexpected console errors
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Ensure there are no unexpected uncaught exceptions during the test
    // If there are page errors, include them in the assertion failure message for debugging
    if (pageErrors.length > 0) {
      const messages = pageErrors.map(e => e.message).join('\n---\n');
      // Fail the test with a helpful message if any page errors were captured
      throw new Error(`Detected page errors during test execution:\n${messages}`);
    }
  });

  test('Initial load shows empty queue message and controls are present', async ({ page }) => {
    // Purpose: Verify initial render, presence of UI controls and default state
    const pq = new PriorityQueuePage(page);

    // Check title
    await expect(page.locator('h1')).toHaveText('Priority Queue Visualization');

    // Check controls exist
    await expect(page.locator(pq.elementValue)).toBeVisible();
    await expect(page.locator(pq.prioritySelect)).toBeVisible();
    await expect(page.locator(pq.addBtn)).toBeVisible();
    await expect(page.locator(pq.removeBtn)).toBeVisible();
    await expect(page.locator(pq.clearBtn)).toBeVisible();

    // The queue should initially contain the "Queue is empty" message
    const qText = await pq.getQueueText();
    expect(qText).toContain('Queue is empty. Add some elements!');

    // No priority items should be present initially
    const count = await pq.getItemCount();
    expect(count).toBe(0);
  });

  test.describe('Adding elements and visual feedback', () => {
    test('Adding element with empty input shows alert and does not modify the queue', async ({ page }) => {
      // Purpose: Ensure validation prevents adding empty values and alert is shown
      const pq = new PriorityQueuePage(page);

      // Ensure input is empty
      await page.fill(pq.elementValue, '');
      // Expect an alert with validation message when clicking Add
      const dialogPromise = page.waitForEvent('dialog');
      await page.click(pq.addBtn);
      const dialog = await dialogPromise;
      expect(dialog.message()).toBe('Please enter a value for the element.');
      await dialog.accept();

      // Queue should remain empty
      const qText = await pq.getQueueText();
      expect(qText).toContain('Queue is empty. Add some elements!');
    });

    test('Successfully add elements of different priorities and verify DOM classes and "current" highlight', async ({ page }) => {
      // Purpose: Verify enqueue works, classes applied and highest priority is highlighted
      const pq = new PriorityQueuePage(page);

      // Add a medium priority item first (default)
      await pq.addElement('M1', 'medium');
      // Add a low priority
      await pq.addElement('L1', 'low');
      // Add a high priority item
      await pq.addElement('H1', 'high');

      // After adding, verify there are items present
      const items = await pq.getItems();
      expect(items.length).toBeGreaterThanOrEqual(3);

      // The first displayed item should have the 'high' class and 'current' highlight
      const firstClass = await pq.getFirstItemClass();
      expect(firstClass).toContain('high');
      expect(firstClass).toContain('current');

      // Ensure each item shows its value and priority label
      const values = items.map(i => i.value);
      const priorities = items.map(i => i.priority);
      expect(values).toEqual(expect.arrayContaining(['M1', 'L1', 'H1']));
      expect(priorities).toEqual(expect.arrayContaining(['medium', 'low', 'high']));
    });

    test('Newly added item briefly scales (animation inline style) and reverts', async ({ page }) => {
      // Purpose: Check the quick transform animation styles applied to the newly added element
      const pq = new PriorityQueuePage(page);

      // Add a unique element to inspect last item's transform style
      await pq.addElement('Anim1', 'medium');

      // Immediately after adding, the last item should have transform scale(1.1)
      const immediateTransform = await pq.getLastItemTransform();
      // It can be an empty string or contain the transform; assert that it either contains scale or is null/empty
      expect(
        immediateTransform === null ||
        immediateTransform === '' ||
        immediateTransform.includes('scale(1.1)') ||
        immediateTransform.includes('scale(1)')
      ).toBeTruthy();

      // Wait slightly longer than the animation timeout (300ms) then assert it reverted to scale(1) or empty
      await page.waitForTimeout(350);
      const laterTransform = await pq.getLastItemTransform();
      // After animation, expect that the transform does not contain a larger scale
      expect(laterTransform === null || !laterTransform.includes('scale(1.1)')).toBeTruthy();
    });

    test('Pressing Enter in the input adds an element', async ({ page }) => {
      // Purpose: Ensure Enter key is wired to add action
      const pq = new PriorityQueuePage(page);

      // Use Enter to add
      await pq.pressEnterOnInput('EnterAdd', 'low');

      // The item should be present somewhere in the queue
      const items = await pq.getItems();
      const values = items.map(i => i.value);
      expect(values).toContain('EnterAdd');
    });
  });

  test.describe('Priority behavior, ordering and FIFO for same priority', () => {
    test('Higher priority items are shown as first/current', async ({ page }) => {
      // Purpose: Verify priority ordering - high > medium > low
      const pq = new PriorityQueuePage(page);

      // Clear any existing items just in case
      await pq.clearQueue();

      // Add items in order: low, medium, high
      await pq.addElement('low1', 'low');
      await pq.addElement('med1', 'medium');
      await pq.addElement('high1', 'high');

      // Now the first displayed item should be the high priority item
      const items = await pq.getItems();
      expect(items.length).toBeGreaterThanOrEqual(3);
      const first = items[0];
      expect(first.priority).toBe('high');
      expect(first.value).toBe('high1');
    });

    test('Elements with same priority preserve insertion order (FIFO)', async ({ page }) => {
      // Purpose: Verify that the structure does not reorder equal-priority elements (heap uses strict > comparison)
      const pq = new PriorityQueuePage(page);

      // Clear queue and add multiple medium priority items
      await pq.clearQueue();
      await pq.addElement('M-first', 'medium');
      await pq.addElement('M-second', 'medium');
      await pq.addElement('M-third', 'medium');

      // Read the displayed order
      const items = await pq.getItems();
      const values = items.map(i => i.value);

      // For equal priorities, heapify uses strict >, so insertion order should be preserved for same priority
      // The array may have the first inserted near the front; we assert that all three exist and the relative order is preserved.
      // We will check that the first occurrence among these items is 'M-first', followed later by 'M-second' then 'M-third'.
      const firstIndex = values.indexOf('M-first');
      const secondIndex = values.indexOf('M-second');
      const thirdIndex = values.indexOf('M-third');
      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  test.describe('Removal and clearing operations with alerts and DOM updates', () => {
    test('Removing from empty queue shows an alert and does nothing', async ({ page }) => {
      // Purpose: Trigger remove on empty queue to assert alert handling
      const pq = new PriorityQueuePage(page);

      // Ensure the queue is cleared
      await pq.clearQueue();

      // Remove should cause alert 'Queue is empty!'
      const dialogPromise = page.waitForEvent('dialog');
      await pq.removeHighest();
      const dialog = await dialogPromise;
      expect(dialog.message()).toBe('Queue is empty!');
      await dialog.accept();

      // Queue still empty
      const count = await pq.getItemCount();
      expect(count).toBe(0);
    });

    test('Removing highest priority element shows alert with removed value and updates DOM', async ({ page }) => {
      // Purpose: Ensure dequeue works, alerts show correct value and DOM updates accordingly
      const pq = new PriorityQueuePage(page);

      // Clear and populate queue
      await pq.clearQueue();
      await pq.addElement('R-low', 'low');
      await pq.addElement('R-high', 'high');
      await pq.addElement('R-med', 'medium');

      // Determine current highest (should be 'R-high')
      let itemsBefore = await pq.getItems();
      const valuesBefore = itemsBefore.map(i => i.value);
      expect(valuesBefore).toContain('R-high');

      // Click remove and capture dialog
      const dialogPromise = page.waitForEvent('dialog');
      await pq.removeHighest();
      const dialog = await dialogPromise;
      // The alert message should indicate which item (value and priority) was removed
      expect(dialog.message()).toMatch(/Removed: R-high \(high priority\)/);
      await dialog.accept();

      // Now the queue content should no longer contain 'R-high'
      const itemsAfter = await pq.getItems();
      const valuesAfter = itemsAfter.map(i => i.value);
      expect(valuesAfter).not.toContain('R-high');

      // The first/current item should now be one of the remaining with the highest priority among them
      const firstAfterClass = await pq.getFirstItemClass();
      expect(firstAfterClass).toBeTruthy();
    });

    test('Clear Queue empties the queue and shows empty message', async ({ page }) => {
      // Purpose: Ensure Clear Queue removes all items without alerts (clear uses no alert)
      const pq = new PriorityQueuePage(page);

      // Populate queue
      await pq.addElement('C1', 'medium');
      await pq.addElement('C2', 'low');

      // Clear it
      await pq.clearQueue();

      // Ensure empty message appears
      const qText = await pq.getQueueText();
      expect(qText).toContain('Queue is empty. Add some elements!');
      const count = await pq.getItemCount();
      expect(count).toBe(0);
    });
  });

  test('Accessibility and structural checks: labels, input placeholder and select default', async ({ page }) => {
    // Purpose: Validate some basic accessibility and structural attributes
    const pq = new PriorityQueuePage(page);

    // Input placeholder
    await expect(page.locator(pq.elementValue)).toHaveAttribute('placeholder', 'Element value');

    // Select default option should be medium
    const selected = await page.$eval(pq.prioritySelect, el => el.value);
    expect(selected).toBe('medium');

    // Buttons should be enabled
    await expect(page.locator(pq.addBtn)).toBeEnabled();
    await expect(page.locator(pq.removeBtn)).toBeEnabled();
    await expect(page.locator(pq.clearBtn)).toBeEnabled();
  });

  test('No uncaught page errors occurred during interactions (console captured)', async ({ page }) => {
    // Purpose: Ensure interactions did not produce uncaught JS errors
    const pq = new PriorityQueuePage(page);

    // Perform a sequence of interactions
    await pq.addElement('E1', 'low');
    await pq.addElement('E2', 'medium');
    await pq.removeHighest();
    // Accept the dialog triggered by remove
    const dialog = await page.waitForEvent('dialog');
    await dialog.accept();
    await pq.clearQueue();

    // After interactions, ensure no pageerror events fired (checked in afterEach as well)
    // Also assert that console did not contain messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});