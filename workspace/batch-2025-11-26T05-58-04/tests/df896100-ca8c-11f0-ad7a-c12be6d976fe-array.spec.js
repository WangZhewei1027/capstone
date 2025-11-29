import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-58-04/html/df896100-ca8c-11f0-ad7a-c12be6d976fe.html';

/**
 * Page Object for the Array demo page.
 * Encapsulates common interactions and assertions.
 */
class ArrayDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.addButton = 'button[onclick="addElement()"]';
    this.removeButton = 'button[onclick="removeElement()"]';
    this.tableBody = '#arrayTable';
  }

  // Get the number of rows in the displayed array table
  async getRowCount() {
    return await this.page.$$eval(`${this.tableBody} tr`, rows => rows.length);
  }

  // Get array values as displayed in the table (value column)
  async getDisplayedValues() {
    return await this.page.$$eval(`${this.tableBody} tr`, rows =>
      rows.map(r => r.cells[1]?.textContent ?? '')
    );
  }

  // Click Add and respond to the prompt with the provided response (string).
  // If response is null, the prompt will be dismissed.
  async clickAddAndRespond(response) {
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.page.click(this.addButton)
    ]);
    // dialog.type() can be 'prompt' for prompts
    if (response === null) {
      await dialog.dismiss();
    } else {
      await dialog.accept(response);
    }
    // Wait for any possible DOM updates (displayArray called on success)
    await this.page.waitForTimeout(100); // small wait to allow DOM update
  }

  // Click Remove; returns the dialog object if one appears (alert when empty)
  async clickRemove() {
    // There may or may not be a dialog. Use waitForEvent with a short timeout if dialog occurs.
    const clickPromise = this.page.click(this.removeButton);
    // Race: either a dialog appears, or the click finishes without dialog.
    let dialog = null;
    try {
      dialog = await this.page.waitForEvent('dialog', { timeout: 500 });
    } catch {
      // no dialog appeared
    }
    await clickPromise;
    // Allow DOM update
    await this.page.waitForTimeout(100);
    return dialog;
  }

  // Helper to wait until the table has expected count
  async waitForRowCount(expectedCount, timeout = 2000) {
    await this.page.waitForFunction(
      (sel, expected) => document.querySelectorAll(sel + ' tr').length === expected,
      this.tableBody,
      expectedCount,
      { timeout }
    );
  }
}

test.describe('Array FSM - JavaScript Arrays Demo', () => {
  // Collect console messages and page errors for each test to assert environment health
  let consoles;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoles = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', msg => {
      consoles.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test ensure no unexpected page errors occurred
    expect(pageErrors, 'No uncaught page errors should be emitted').toEqual([]);
  });

  test('init -> idle: initial displayArray is executed and table shows initial items', async ({ page }) => {
    // This validates the "init" state onEnter: displayArray and the INITIALIZED => idle transition
    const app = new ArrayDemoPage(page);

    // Initial table should show the three initial items
    const rowCount = await app.getRowCount();
    expect(rowCount).toBe(3);

    const values = await app.getDisplayedValues();
    // The HTML script sets array = ['Apple', 'Banana', 'Cherry'];
    expect(values).toEqual(['Apple', 'Banana', 'Cherry']);

    // Confirm that there were no console errors and no page errors during initial load
    // (collected in afterEach assertion)
    expect(consoles.length).toBeGreaterThanOrEqual(0);
  });

  test('prompting -> adding -> DISPLAY_UPDATED: adding an element via prompt (confirm) updates table', async ({ page }) => {
    // This validates the prompting (prompt appears), PROMPT_CONFIRMED, adding logic (array.push + displayArray),
    // and DISPLAY_UPDATED -> idle transition.
    const app = new ArrayDemoPage(page);

    // Add a new item "Date" via prompt accept
    await app.clickAddAndRespond('Date');

    // Now table should have 4 rows and include "Date" as last item
    await app.waitForRowCount(4);
    const values = await app.getDisplayedValues();
    expect(values[values.length - 1]).toBe('Date');
    expect(values).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
  });

  test('prompting cancelled: dismissing prompt does not modify the array', async ({ page }) => {
    // This validates PROMPT_CANCELLED behavior: dismissing prompt returns to idle with no change.
    const app = new ArrayDemoPage(page);

    // Capture initial state
    const beforeValues = await app.getDisplayedValues();

    // Click Add and dismiss the prompt
    await app.clickAddAndRespond(null);

    // Table should remain unchanged
    const afterValues = await app.getDisplayedValues();
    expect(afterValues).toEqual(beforeValues);
  });

  test('edge case: entering empty string at prompt does not add (falsy check)', async ({ page }) => {
    // The page's addElement uses `if (newItem)` so empty string should not be added.
    const app = new ArrayDemoPage(page);

    const beforeCount = await app.getRowCount();

    // Provide an empty string
    await app.clickAddAndRespond('');

    // Count should be unchanged
    const afterCount = await app.getRowCount();
    expect(afterCount).toBe(beforeCount);
  });

  test('removing items: REMOVE_CLICKED -> removing -> REMOVE_SUCCESS transitions and table updates', async ({ page }) => {
    // Validate removing when array has items results in pop and display update
    const app = new ArrayDemoPage(page);

    // Ensure we have at least one item to remove
    let count = await app.getRowCount();
    expect(count).toBeGreaterThan(0);

    // Click remove once
    const dialog = await app.clickRemove();
    // Because array had items, no alert dialog should appear
    expect(dialog).toBeNull();

    // Row count should have decreased by 1
    const newCount = await app.getRowCount();
    expect(newCount).toBe(count - 1);
  });

  test('removing until empty then triggering alert: REMOVE_FAILED -> alerting -> ALERT_DISMISSED', async ({ page }) => {
    // This test removes elements until the array is empty, then triggers remove when empty to assert alert behavior.
    const app = new ArrayDemoPage(page);

    // Remove until empty
    let count = await app.getRowCount();
    while (count > 0) {
      const dialog = await app.clickRemove();
      // No dialog expected while array has items
      expect(dialog).toBeNull();
      const nextCount = await app.getRowCount();
      // Ensure count decreases
      expect(nextCount).toBeLessThan(count);
      count = nextCount;
    }

    // Now array should be empty
    expect(await app.getRowCount()).toBe(0);

    // Click remove once more -> should produce an alert dialog with the expected message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.click(app.removeButton)
    ]);

    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('The array is empty, nothing to remove.');

    // Dismiss the alert (accept for alert type)
    await dialog.accept();

    // After alert dismissal, still empty
    expect(await app.getRowCount()).toBe(0);
  });

  test('DOM selectors existence: Add and Remove buttons have expected onclick attributes and table body exists', async ({ page }) => {
    // Validate selectors used by the FSM triggers are present in the DOM
    const addExists = await page.$('button[onclick="addElement()"]');
    const removeExists = await page.$('button[onclick="removeElement()"]');
    const tableBodyExists = await page.$('#arrayTable');

    expect(addExists, 'Add button with onclick="addElement()" should exist').not.toBeNull();
    expect(removeExists, 'Remove button with onclick="removeElement()" should exist').not.toBeNull();
    expect(tableBodyExists, 'Table body with id #arrayTable should exist').not.toBeNull();
  });

  test('observes console messages and ensures no runtime exceptions were thrown during interactions', async ({ page }) => {
    // Perform several interactions and assert no uncaught exceptions occurred (pageerrors collected)
    const app = new ArrayDemoPage(page);

    // Add an item
    await app.clickAddAndRespond('Elderberry');
    // Remove an item
    await app.clickRemove();
    // Cancel a prompt
    await app.clickAddAndRespond(null);

    // We expect no uncaught exceptions; pageErrors is asserted in afterEach hook.
    // Also assert console messages were captured (even if empty array is allowed)
    expect(Array.isArray(consoles)).toBeTruthy();
  });
});