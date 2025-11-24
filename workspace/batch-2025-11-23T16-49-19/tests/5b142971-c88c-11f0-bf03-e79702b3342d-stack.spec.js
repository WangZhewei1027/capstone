import { test, expect } from '@playwright/test';

test.describe('Stack Demonstration Application', () => {
  const baseUrl = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-49-19/html/5b142971-c88c-11f0-bf03-e79702b3342d.html';
  
  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
  });

  test('Initial state should be empty', async ({ page }) => {
    const stackContainer = await page.locator('#stack-container');
    await expect(stackContainer).toHaveText('(Stack is empty)');
  });

  test.describe('PUSH_CLICKED event', () => {
    test('should transition from empty to non_empty state', async ({ page }) => {
      await page.fill('#push-input', 'Element 1');
      await page.click('#push-btn');
      const stackContainer = await page.locator('#stack-container');
      await expect(stackContainer).toHaveText('Element 1');
      const message = await page.locator('#message');
      await expect(message).toHaveText('Pushed "Element 1" onto the stack.');
    });

    test('should allow multiple pushes in non_empty state', async ({ page }) => {
      await page.fill('#push-input', 'Element 1');
      await page.click('#push-btn');
      await page.fill('#push-input', 'Element 2');
      await page.click('#push-btn');
      const stackContainer = await page.locator('#stack-container');
      await expect(stackContainer).toHaveText(/Element 2.*Element 1/);
    });

    test('should show error message if push input is empty', async ({ page }) => {
      await page.click('#push-btn');
      const message = await page.locator('#message');
      await expect(message).toHaveText('Please enter a value to push.');
    });
  });

  test.describe('POP_CLICKED event', () => {
    test('should transition from non_empty to empty state', async ({ page }) => {
      await page.fill('#push-input', 'Element 1');
      await page.click('#push-btn');
      await page.click('#pop-btn');
      const stackContainer = await page.locator('#stack-container');
      await expect(stackContainer).toHaveText('(Stack is empty)');
      const message = await page.locator('#message');
      await expect(message).toHaveText('Popped "Element 1" from the stack.');
    });

    test('should show error message if pop is clicked on empty stack', async ({ page }) => {
      await page.click('#pop-btn');
      const message = await page.locator('#message');
      await expect(message).toHaveText('Stack is empty. Cannot pop.');
    });
  });

  test.describe('PEEK_CLICKED event', () => {
    test('should show top element without removing it', async ({ page }) => {
      await page.fill('#push-input', 'Element 1');
      await page.click('#push-btn');
      await page.click('#peek-btn');
      const message = await page.locator('#message');
      await expect(message).toHaveText('Top element is "Element 1".');
      const stackContainer = await page.locator('#stack-container');
      await expect(stackContainer).toHaveText('Element 1');
    });

    test('should show error message if peek is clicked on empty stack', async ({ page }) => {
      await page.click('#peek-btn');
      const message = await page.locator('#message');
      await expect(message).toHaveText('Stack is empty. Nothing to peek.');
    });
  });

  test.describe('CLEAR_CLICKED event', () => {
    test('should clear the stack and transition to empty state', async ({ page }) => {
      await page.fill('#push-input', 'Element 1');
      await page.click('#push-btn');
      await page.click('#clear-btn');
      const stackContainer = await page.locator('#stack-container');
      await expect(stackContainer).toHaveText('(Stack is empty)');
      const message = await page.locator('#message');
      await expect(message).toHaveText('Stack cleared.');
    });

    test('should show error message if clear is clicked on already empty stack', async ({ page }) => {
      await page.click('#clear-btn');
      const message = await page.locator('#message');
      await expect(message).toHaveText('Stack is already empty.');
    });
  });
});