import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c874ed0-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Stack Data Structure Demo', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.reload();
  });

  test('should initialize with an empty stack', async () => {
    const stackContainer = await page.locator('#stackContainer');
    const message = await page.locator('#message');

    await expect(stackContainer).toHaveCount(0);
    await expect(message).toHaveText('');
  });

  test.describe('Push Operations', () => {
    test('should push a value onto the stack', async () => {
      const inputValue = await page.locator('#inputValue');
      const pushBtn = await page.locator('#pushBtn');
      const message = await page.locator('#message');

      await inputValue.fill('First');
      await pushBtn.click();

      await expect(message).toHaveText('Pushed "First" onto the stack.');
      await expect(message).toHaveClass(/success/);
      await expect(page.locator('#stackContainer')).toContainText('First');
    });

    test('should show error when pushing an empty value', async () => {
      const pushBtn = await page.locator('#pushBtn');
      const message = await page.locator('#message');

      await pushBtn.click();

      await expect(message).toHaveText('Please enter a value to push.');
      await expect(message).not.toHaveClass(/success/);
    });
  });

  test.describe('Pop Operations', () => {
    test.beforeEach(async () => {
      const inputValue = await page.locator('#inputValue');
      const pushBtn = await page.locator('#pushBtn');

      await inputValue.fill('First');
      await pushBtn.click();
    });

    test('should pop a value from the stack', async () => {
      const popBtn = await page.locator('#popBtn');
      const message = await page.locator('#message');

      await popBtn.click();

      await expect(message).toHaveText('Popped "First" from the stack.');
      await expect(message).toHaveClass(/success/);
      await expect(page.locator('#stackContainer')).toHaveCount(0);
    });

    test('should show error when popping from an empty stack', async () => {
      const popBtn = await page.locator('#popBtn');
      const message = await page.locator('#message');

      await popBtn.click(); // Pop when stack is empty

      await expect(message).toHaveText('Stack is empty. Cannot pop.');
      await expect(message).not.toHaveClass(/success/);
    });
  });

  test.describe('Peek Operations', () => {
    test.beforeEach(async () => {
      const inputValue = await page.locator('#inputValue');
      const pushBtn = await page.locator('#pushBtn');

      await inputValue.fill('First');
      await pushBtn.click();
    });

    test('should peek the top value of the stack', async () => {
      const peekBtn = await page.locator('#peekBtn');
      const message = await page.locator('#message');

      await peekBtn.click();

      await expect(message).toHaveText('Top of the stack is "First".');
      await expect(message).toHaveClass(/success/);
    });

    test('should show error when peeking an empty stack', async () => {
      const peekBtn = await page.locator('#peekBtn');
      const message = await page.locator('#message');

      await page.locator('#popBtn').click(); // Empty the stack
      await peekBtn.click();

      await expect(message).toHaveText('Stack is empty.');
      await expect(message).not.toHaveClass(/success/);
    });
  });

  test.describe('Clear Operations', () => {
    test.beforeEach(async () => {
      const inputValue = await page.locator('#inputValue');
      const pushBtn = await page.locator('#pushBtn');

      await inputValue.fill('First');
      await pushBtn.click();
    });

    test('should clear the stack', async () => {
      const clearBtn = await page.locator('#clearBtn');
      const message = await page.locator('#message');

      await clearBtn.click();

      await expect(message).toHaveText('Stack cleared.');
      await expect(message).toHaveClass(/success/);
      await expect(page.locator('#stackContainer')).toHaveCount(0);
    });
  });
});