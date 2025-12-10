import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8a5771-d59e-11f0-89ab-2f71529652ac.html';

// Test file: 7e8a5771-d59e-11f0-89ab-2f71529652ac-stack.spec.js
// This suite verifies the Stack Data Structure demo page. It checks initial state,
// push/pop behavior, DOM updates, alerts for edge cases, and that there are no
// unexpected runtime errors logged to the console or uncaught page errors.

test.describe('Stack App - basic functionality', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Collect console error messages and page errors for assertions.
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      // record uncaught exceptions from the page
      pageErrors.push(err.message || String(err));
    });

    await page.goto(APP_URL);
    // Ensure page loaded (title present)
    await expect(page.locator('h1')).toHaveText('Stack Data Structure');
  });

  test.afterEach(async () => {
    // no-op: listeners are tied to the page instance and cleared between tests
  });

  test('Initial page load: stack is empty and controls are visible', async ({ page }) => {
    // Verify stack container exists and initially contains no items
    const stack = page.locator('#stack');
    await expect(stack).toBeVisible();
    await expect(stack.locator('.stack-item')).toHaveCount(0);

    // Verify input and buttons are present and enabled
    const input = page.locator('#inputValue');
    const pushButton = page.locator('#pushButton');
    const popButton = page.locator('#popButton');

    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Enter a value');
    await expect(pushButton).toBeVisible();
    await expect(pushButton).toBeEnabled();
    await expect(popButton).toBeVisible();
    await expect(popButton).toBeEnabled();

    // Expect no runtime page errors or console error messages on initial load
    expect(pageErrors.length, `Expected no page errors on load, got: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Expected no console errors on load, got: ${consoleErrors.join('; ')}`).toBe(0);
  });

  test('Push adds a single item, displays it, and clears the input', async ({ page }) => {
    // Enter a value and click Push
    const input1 = page.locator('#inputValue');
    const pushButton1 = page.locator('#pushButton1');
    const stackItems = page.locator('#stack .stack-item');

    await input.fill('A');
    await pushButton.click();

    // After pushing, there should be exactly one stack item with text 'A'
    await expect(stackItems).toHaveCount(1);
    await expect(stackItems.nth(0)).toHaveText('A');

    // Input is cleared after successful push
    await expect(input).toHaveValue('');

    // No runtime errors should have occurred
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.join('; ')}`).toBe(0);
  });

  test('Push multiple items and verify DOM order reflects insertion order', async ({ page }) => {
    // Push three items: first, second, third
    const input2 = page.locator('#inputValue');
    const pushButton2 = page.locator('#pushButton2');
    const stackItems1 = page.locator('#stack .stack-item');

    const values = ['first', 'second', 'third'];
    for (const v of values) {
      await input.fill(v);
      await pushButton.click();
    }

    // Expect three items in the DOM in insertion order (display() uses items.forEach and appendChild)
    await expect(stackItems).toHaveCount(3);
    const texts = await stackItems.allTextContents();
    expect(texts).toEqual(values);

    // No runtime errors should have occurred
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.join('; ')}`).toBe(0);
  });

  test('Pop removes the last pushed item (LIFO)', async ({ page }) => {
    // Push items 1,2,3 then pop and verify 3 is removed
    const input3 = page.locator('#inputValue');
    const pushButton3 = page.locator('#pushButton3');
    const popButton1 = page.locator('#popButton1');
    const stackItems2 = page.locator('#stack .stack-item');

    await input.fill('1');
    await pushButton.click();
    await input.fill('2');
    await pushButton.click();
    await input.fill('3');
    await pushButton.click();

    await expect(stackItems).toHaveCount(3);
    let texts1 = await stackItems.allTextContents();
    expect(texts).toEqual(['1', '2', '3']);

    // Click pop: should remove '3'
    await popButton.click();
    await expect(stackItems).toHaveCount(2);
    texts = await stackItems.allTextContents();
    expect(texts).toEqual(['1', '2']);

    // No runtime errors should have occurred
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.join('; ')}`).toBe(0);
  });
});

test.describe('Stack App - edge cases and alerts', () => {
  let consoleErrors1 = [];
  let pageErrors1 = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message || String(err));
    });

    await page.goto(APP_URL);
  });

  test('Popping an empty stack shows "Stack is empty!" alert', async ({ page }) => {
    // Ensure stack is empty
    const stackItems3 = page.locator('#stack .stack-item');
    await expect(stackItems).toHaveCount(0);

    // Listen for dialog and assert the message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.locator('#popButton').click() // trigger the alert
    ]);

    expect(dialog.message()).toBe('Stack is empty!');
    await dialog.accept();

    // No uncaught page errors expected
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.join('; ')}`).toBe(0);
  });

  test('Clicking Push with empty input shows alert "Please enter a value to push."', async ({ page }) => {
    // Ensure input is empty
    const input4 = page.locator('#inputValue');
    await expect(input).toHaveValue('');

    // Click push and capture the alert
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.locator('#pushButton').click()
    ]);

    expect(dialog.message()).toBe('Please enter a value to push.');
    await dialog.accept();

    // Still no stack items added
    await expect(page.locator('#stack .stack-item')).toHaveCount(0);

    // No uncaught page errors expected
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.join('; ')}`).toBe(0);
  });

  test('Behavior under repeated push/pop sequences remains stable (no runtime errors)', async ({ page }) => {
    const input5 = page.locator('#inputValue');
    const pushButton4 = page.locator('#pushButton4');
    const popButton2 = page.locator('#popButton2');
    const stackItems4 = page.locator('#stack .stack-item');

    // Perform repeated operations
    for (let i = 0; i < 5; i++) {
      await input.fill(`val${i}`);
      await pushButton.click();
    }
    await expect(stackItems).toHaveCount(5);

    for (let i = 0; i < 3; i++) {
      await popButton.click();
    }
    await expect(stackItems).toHaveCount(2);

    // Pop remaining items
    await popButton.click();
    await popButton.click();

    // Now stack empty; pop once more to trigger alert
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      popButton.click()
    ]);
    expect(dialog.message()).toBe('Stack is empty!');
    await dialog.accept();

    // Assert that no uncaught page errors or console error messages were produced
    expect(pageErrors.length, `Unexpected page errors during repeated operations: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors during repeated operations: ${consoleErrors.join('; ')}`).toBe(0);
  });
});