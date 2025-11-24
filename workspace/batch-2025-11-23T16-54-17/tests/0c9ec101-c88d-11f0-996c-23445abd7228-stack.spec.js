import { test, expect } from '@playwright/test';

test.describe('Stack Interactive Demo Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-23T16-54-17/html/0c9ec101-c88d-11f0-996c-23445abd7228.html');
  });

  test('Initial state should be empty', async ({ page }) => {
    const stackContainer = await page.$('#stack-container');
    const message = await page.$('#message');
    const peekDisplay = await page.$('#peek');

    await expect(stackContainer).toContainText('Stack is empty.');
    await expect(message).toBeEmpty();
    await expect(peekDisplay).toBeEmpty();
  });

  test.describe('State transitions', () => {
    test('Push operation should transition from empty to not_empty', async ({ page }) => {
      await page.fill('#input-value', 'TestValue');
      await page.click('#push-btn');

      const stackContainer = await page.$('#stack-container');
      const message = await page.$('#message');

      await expect(stackContainer).not.toContainText('Stack is empty.');
      await expect(stackContainer).toContainText('TestValue');
      await expect(message).toContainText('Pushed "TestValue" onto the stack.');
    });

    test('Pop operation should transition from not_empty to check_empty', async ({ page }) => {
      await page.fill('#input-value', 'TestValue');
      await page.click('#push-btn');
      await page.click('#pop-btn');

      const stackContainer = await page.$('#stack-container');
      const message = await page.$('#message');

      await expect(stackContainer).toContainText('Stack is empty.');
      await expect(message).toContainText('Popped "TestValue" from the stack.');
    });

    test('Peek operation should not change state', async ({ page }) => {
      await page.fill('#input-value', 'TestValue');
      await page.click('#push-btn');
      await page.click('#peek-btn');

      const peekDisplay = await page.$('#peek');
      const message = await page.$('#message');

      await expect(peekDisplay).toContainText('Top of Stack: "TestValue"');
      await expect(message).toBeEmpty();
    });

    test('Clear operation should transition from not_empty to empty', async ({ page }) => {
      await page.fill('#input-value', 'TestValue');
      await page.click('#push-btn');
      await page.click('#clear-btn');

      const stackContainer = await page.$('#stack-container');
      const message = await page.$('#message');

      await expect(stackContainer).toContainText('Stack is empty.');
      await expect(message).toContainText('Stack cleared.');
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Pop operation on empty stack should show error message', async ({ page }) => {
      await page.click('#pop-btn');

      const message = await page.$('#message');

      await expect(message).toContainText('Stack is empty. Cannot pop.');
    });

    test('Peek operation on empty stack should show error message', async ({ page }) => {
      await page.click('#peek-btn');

      const message = await page.$('#message');
      const peekDisplay = await page.$('#peek');

      await expect(message).toContainText('Stack is empty. Nothing to peek.');
      await expect(peekDisplay).toBeEmpty();
    });

    test('Push operation with empty input should show error message', async ({ page }) => {
      await page.click('#push-btn');

      const message = await page.$('#message');

      await expect(message).toContainText('Please enter a value to push.');
    });
  });
});