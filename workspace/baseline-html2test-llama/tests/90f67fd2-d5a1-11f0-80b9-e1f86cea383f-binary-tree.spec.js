import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f67fd2-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object for the Binary Tree app
class BinaryTreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input');
    this.addButton = page.locator('#add');
    this.treePre = page.locator('#tree');
    this.title = page.locator('h1');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the input and click add. Returns the console message containing the addedValue if produced.
  async addNode(value, options = {}) {
    const { waitForLog = true, timeout = 2000 } = options;
    await this.input.fill(value);
    if (waitForLog) {
      // Wait for at least one console log that contains the value (stringified)
      const predicate = (msg) => msg.type() === 'log' && msg.text().includes(String(value));
      const consolePromise = this.page.waitForEvent('console', { predicate, timeout });
      await this.addButton.click();
      const msg = await consolePromise;
      return msg;
    } else {
      await this.addButton.click();
      return null;
    }
  }

  // Click add without filling input
  async clickAddWithoutInput(options = {}) {
    const { waitForAnyLog = false, timeout = 2000 } = options;
    if (waitForAnyLog) {
      const consolePromise1 = this.page.waitForEvent('console', { timeout });
      await this.addButton.click();
      return await consolePromise;
    } else {
      await this.addButton.click();
      return null;
    }
  }

  async getTreePreText() {
    return await this.treePre.textContent();
  }

  async getTitleText() {
    return await this.title.textContent();
  }

  async getInputPlaceholder() {
    return await this.input.getAttribute('placeholder');
  }

  async getAddButtonText() {
    return await this.addButton.textContent();
  }
}

test.describe('Binary Tree Application - 90f67fd2-d5a1-11f0-80b9-e1f86cea383f', () => {
  // Collect uncaught page errors and console messages for assertions
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture uncaught exceptions (pageerror) and console messages
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // store minimal info: type and text
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the page for each test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Basic sanity: no unexpected uncaught exceptions on the page by default
    // This assertion documents the observed runtime errors (if any). If errors are present,
    // the test developer will see them in the test output.
    expect(pageErrors).toEqual([]);
  });

  test('Initial page load: title, input, add button and empty tree pre are present', async ({ page }) => {
    const app = new BinaryTreePage(page);

    // Verify the title text
    await expect(app.title).toBeVisible();
    expect(await app.getTitleText()).toContain('Binary Tree');

    // Verify the tree pre element exists and is empty initially (the implementation never writes into it)
    await expect(app.treePre).toBeVisible();
    expect(await app.getTreePreText()).toBeFalsy(); // should be empty string or null

    // Verify the input placeholder and add button text
    expect(await app.getInputPlaceholder()).toBe('Enter node value');
    expect((await app.getAddButtonText()).trim()).toBe('Add');

    // Ensure no console logs were produced on load (other than possibly browser infos)
    // We check that there are no 'error' console messages on load
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('Adding a node via the input and Add button logs the value (observes console output)', async ({ page }) => {
    const app1 = new BinaryTreePage(page);

    // Add a node with value '10' and wait for a console.log that contains '10'
    const consoleMsg = await app.addNode('10', { waitForLog: true });
    expect(consoleMsg).toBeTruthy();
    expect(consoleMsg.type()).toBe('log');
    // The printed text should include the string "10" (in-order traversal logs node values)
    expect(consoleMsg.text()).toContain('10');

    // The pre#tree element is not updated by the app (bug/implementation detail),
    // ensure it remains empty to reflect the current behavior.
    expect(await app.getTreePreText()).toBeFalsy();

    // Verify that consoleMessages captured at least one log with '10'
    const found = consoleMessages.some(m => m.type === 'log' && m.text.includes('10'));
    expect(found).toBe(true);
  });

  test('Adding multiple nodes logs all inserted values (in-order traversal behavior)', async ({ page }) => {
    const app2 = new BinaryTreePage(page);

    // Add three distinct values; for each add, wait for at least one console log containing that value
    const values = ['M', 'A', 'Z'];
    for (const v of values) {
      const msg1 = await app.addNode(v, { waitForLog: true });
      expect(msg).toBeTruthy();
      expect(msg.type()).toBe('log');
      expect(msg.text()).toContain(v);
    }

    // After all inserts, ensure the consoleMessages array contains logs for all inserted values
    for (const v of values) {
      const has = consoleMessages.some(m => m.type === 'log' && m.text.includes(v));
      expect(has, `Expected console logs to contain ${v}`).toBe(true);
    }

    // The displayed tree pre still remains unchanged by the current implementation
    expect(await app.getTreePreText()).toBeFalsy();
  });

  test('Clicking Add when input is empty still triggers behavior and logs an entry (edge case)', async ({ page }) => {
    const app3 = new BinaryTreePage(page);

    // Ensure input is empty
    await expect(app.input).toHaveValue('');

    // Click Add and wait for any console.log (the implementation's second listener logs current tree inorder)
    const msg2 = await app.clickAddWithoutInput({ waitForAnyLog: true });
    expect(msg).toBeTruthy();
    // It might log an empty string or other node values; we assert that a console log occurred (no error)
    expect(msg.type()).toBe('log');

    // Confirm that there were no uncaught page errors as a result of clicking with empty input
    const errors = pageErrors.filter(e => e instanceof Error);
    expect(errors.length).toBe(0);
  });

  test('Multiple clicks produce multiple console logs and do not crash the page', async ({ page }) => {
    const app4 = new BinaryTreePage(page);

    // Clear and add several nodes quickly
    await app.input.fill('node1');
    const p1 = app.page.waitForEvent('console', { predicate: m => m.type() === 'log' && m.text().includes('node1'), timeout: 2000 });
    await app.addButton.click();
    await p1;

    await app.input.fill('node2');
    const p2 = app.page.waitForEvent('console', { predicate: m => m.type() === 'log' && m.text().includes('node2'), timeout: 2000 });
    await app.addButton.click();
    await p2;

    await app.input.fill('node3');
    const p3 = app.page.waitForEvent('console', { predicate: m => m.type() === 'log' && m.text().includes('node3'), timeout: 2000 });
    await app.addButton.click();
    await p3;

    // Expect console messages to include all three node values
    for (const v of ['node1', 'node2', 'node3']) {
      const has1 = consoleMessages.some(m => m.type === 'log' && m.text.includes(v));
      expect(has, `Console should contain ${v}`).toBe(true);
    }

    // Final safety check: no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility and basic interactive element checks', async ({ page }) => {
    const app5 = new BinaryTreePage(page);

    // Input should be focusable and reachable
    await app.input.click();
    await expect(app.input).toBeFocused();

    // Tab to the button and ensure it is focusable
    await page.keyboard.press('Tab');
    await expect(app.addButton).toBeFocused();

    // Button should be enabled
    expect(await app.addButton.isEnabled()).toBe(true);
  });
});