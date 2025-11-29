import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-45-12/html/13c81530-ca8b-11f0-9c8a-07b4fc94d9a9.html';

class QueuePage {
  /**
   * Simple page object for the Queue example.
   * Encapsulates common interactions and queries against the DOM.
   */
  constructor(page) {
    this.page = page;
    this.pageErrors = [];
    this.consoleMessages = [];

    // Capture page errors and console output for assertions
    this.page.on('pageerror', (err) => {
      // Collect the Error object so tests can assert message/stack
      this.pageErrors.push(err);
    });
    this.page.on('console', (msg) => {
      this.consoleMessages.push(msg.text());
    });
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickAdd() {
    // Click the exact trigger defined in the FSM: button[onclick="addItem()"]
    await this.page.click('button[onclick="addItem()"]');
  }

  async clickAddAndWaitForError() {
    // Click and wait for the runtime page error that we expect from the broken addItem implementation.
    const [err] = await Promise.all([
      this.page.waitForEvent('pageerror'),
      this.page.click('button[onclick="addItem()"]'),
    ]);
    // Track it as well in our local array for consistency
    this.pageErrors.push(err);
    return err;
  }

  async queueChildrenCount() {
    return await this.page.$eval('#queue', (el) => el.children.length);
  }

  async queueInnerHTML() {
    return await this.page.$eval('#queue', (el) => el.innerHTML);
  }

  async queueValue() {
    // The script reads document.getElementById("queue").value
    // Confirm what that returns in the DOM environment
    return await this.page.$eval('#queue', (el) => el.value);
  }

  async hasItemElement() {
    return (await this.page.$('#item')) !== null;
  }

  getPageErrors() {
    return this.pageErrors;
  }

  getConsoleMessages() {
    return this.consoleMessages;
  }
}

test.describe('Queue FSM (Application ID: 13c81530-ca8b-11f0-9c8a-07b4fc94d9a9) - End-to-end', () => {
  let queuePage;

  test.beforeEach(async ({ page }) => {
    queuePage = new QueuePage(page);
    await queuePage.goto();
  });

  test('idle state: initial page load has expected DOM and no errors', async ({ page }) => {
    // Validate initial idle state: #queue exists, it's empty, and the Add Item button exists.
    const queueLocator = page.locator('#queue');
    await expect(queueLocator).toBeVisible();

    const childrenCount = await queuePage.queueChildrenCount();
    expect(childrenCount).toBe(0);

    // The script attempts to read .value on #queue — check what that yields (expected undefined)
    const value = await queuePage.queueValue();
    expect(value).toBeUndefined();

    // The interactive trigger should be present
    await expect(page.locator('button[onclick="addItem()"]')).toBeVisible();

    // No page errors should have occurred yet
    expect(queuePage.getPageErrors().length).toBe(0);

    // No #item element is present in the DOM initially (this absence drives the failure path)
    const hasItem = await queuePage.hasItemElement();
    expect(hasItem).toBe(false);
  });

  test('ADD_CLICKED -> adding: clicking Add Item invokes addItem and causes runtime error (ADD_FAILURE -> error)', async () => {
    // Clicking the Add Item button should execute the faulty addItem() function.
    // That function references document.getElementById('item') which does not exist,
    // so we expect a runtime TypeError. We assert that the page emits a pageerror event
    // and that #queue remains unchanged (no appended child).
    const err = await queuePage.clickAddAndWaitForError();

    // The error message should indicate a problem related to appendChild / null deref
    // Accept a few possible message styles across environments.
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/appendChild|Cannot read property|Cannot read properties|null/);

    // The stacktrace should include the addItem function name indicating the failure happened there
    expect(String(err.stack)).toMatch(/addItem/);

    // The DOM queue should still have zero children (no successful append)
    const childrenCount = await queuePage.queueChildrenCount();
    expect(childrenCount).toBe(0);

    // Confirm #item is still absent
    expect(await queuePage.hasItemElement()).toBe(false);
  });

  test('repeated ADD_CLICKED events consistently cause ADD_FAILURE (error) - multiple clicks produce errors', async () => {
    // Validate that subsequent clicks continue to produce errors and do not alter the queue.
    const firstErr = await queuePage.clickAddAndWaitForError();
    expect(firstErr).toBeTruthy();
    expect(firstErr.message).toMatch(/appendChild|Cannot read property|Cannot read properties|null/);

    const secondErr = await queuePage.clickAddAndWaitForError();
    expect(secondErr).toBeTruthy();
    expect(secondErr.message).toMatch(/appendChild|Cannot read property|Cannot read properties|null/);

    // Two errors should have been recorded
    const recordedErrors = queuePage.getPageErrors();
    expect(recordedErrors.length).toBeGreaterThanOrEqual(2);

    // Queue still unchanged
    expect(await queuePage.queueChildrenCount()).toBe(0);
  });

  test('added state (ADD_SUCCESS) is not reachable due to missing DOM target; assert no success side-effects', async () => {
    // The FSM describes an "added" state that would append an element.
    // Given the current implementation and missing #item, this path should not be taken.
    // We verify that there is no appended child and no #item element even after clicking.
    await queuePage.clickAddAndWaitForError();

    // No children added to #queue
    expect(await queuePage.queueChildrenCount()).toBe(0);
    expect(await queuePage.queueInnerHTML()).toBe('');

    // There is no #item element that would have been targeted for append
    expect(await queuePage.hasItemElement()).toBe(false);

    // Also ensure console didn't contain an affirmative "success" message (defensive check)
    // While the app doesn't print messages, we ensure nothing indicates a successful add.
    const consoles = queuePage.getConsoleMessages().join('\n');
    expect(consoles).not.toMatch(/success|added|append/i);
  });

  test('error state behavior: errors are reported to the page and do not block further interaction', async ({ page }) => {
    // Trigger an error and then verify the page remains interactive (button clickable again).
    const err = await queuePage.clickAddAndWaitForError();
    expect(err).toBeTruthy();

    // After the error, the Add Item button should still be visible and usable
    const addButton = page.locator('button[onclick="addItem()"]');
    await expect(addButton).toBeVisible();

    // Click again and confirm another error occurs (ensures UI not frozen)
    const err2 = await queuePage.clickAddAndWaitForError();
    expect(err2).toBeTruthy();

    // Confirm errors were reported (pageerror events captured)
    expect(queuePage.getPageErrors().length).toBeGreaterThanOrEqual(2);
  });

  test('edge case inspection: verify the cause of failure (queue.value is undefined -> appendChild receives non-node if element existed)', async () => {
    // Inspect the underlying values that contribute to the failure:
    // - #queue.value is undefined (the code reads this into item)
    // - #item is missing (null), so element.appendChild will throw when element is null
    const queueValue = await queuePage.queueValue();
    expect(queueValue).toBeUndefined();

    const hasItem = await queuePage.hasItemElement();
    expect(hasItem).toBe(false);

    // Trigger the failure to ensure stack shows addItem as the origin
    const err = await queuePage.clickAddAndWaitForError();
    expect(String(err.stack)).toMatch(/addItem/);
  });
});