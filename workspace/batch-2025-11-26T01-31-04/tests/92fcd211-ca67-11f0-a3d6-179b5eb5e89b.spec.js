import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fcd211-ca67-11f0-a3d6-179b5eb5e89b.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Stack Data Structure Demonstration', () => {
  
  test('Initial state should display empty stack message', async ({ page }) => {
    const stackDisplay = await page.locator('#stackDisplay');
    const message = await page.locator('#message');

    await expect(stackDisplay).toHaveText('Stack is empty');
    await expect(message).toHaveText('');
  });

  test('Push a valid item onto the stack', async ({ page }) => {
    const input = await page.locator('#itemInput');
    const pushBtn = await page.locator('#pushBtn');
    const message = await page.locator('#message');
    const stackDisplay = await page.locator('#stackDisplay');

    await input.fill('Item 1');
    await pushBtn.click();

    await expect(message).toHaveText('"Item 1" pushed onto stack.');
    await expect(stackDisplay).toContainText('Item 1');
  });

  test('Push an empty item should show error message', async ({ page }) => {
    const pushBtn = await page.locator('#pushBtn');
    const message = await page.locator('#message');

    await pushBtn.click();

    await expect(message).toHaveText('Please enter a valid item to push.');
  });

  test('Pop an item from the stack', async ({ page }) => {
    const input = await page.locator('#itemInput');
    const pushBtn = await page.locator('#pushBtn');
    const popBtn = await page.locator('#popBtn');
    const message = await page.locator('#message');
    const stackDisplay = await page.locator('#stackDisplay');

    await input.fill('Item 2');
    await pushBtn.click();
    await popBtn.click();

    await expect(message).toHaveText('Popped "Item 2" from stack.');
    await expect(stackDisplay).toHaveText('Stack is empty');
  });

  test('Pop from an empty stack should show error message', async ({ page }) => {
    const popBtn = await page.locator('#popBtn');
    const message = await page.locator('#message');

    await popBtn.click();

    await expect(message).toHaveText('Stack is empty, cannot pop.');
  });

  test('Peek at the top item of the stack', async ({ page }) => {
    const input = await page.locator('#itemInput');
    const pushBtn = await page.locator('#pushBtn');
    const peekBtn = await page.locator('#peekBtn');
    const message = await page.locator('#message');

    await input.fill('Item 3');
    await pushBtn.click();
    await peekBtn.click();

    await expect(message).toHaveText('Top item: "Item 3"');
  });

  test('Peek at an empty stack should show error message', async ({ page }) => {
    const peekBtn = await page.locator('#peekBtn');
    const message = await page.locator('#message');

    await peekBtn.click();

    await expect(message).toHaveText('Stack is empty, nothing to peek.');
  });

  test('Clear the stack', async ({ page }) => {
    const input = await page.locator('#itemInput');
    const pushBtn = await page.locator('#pushBtn');
    const clearBtn = await page.locator('#clearBtn');
    const message = await page.locator('#message');
    const stackDisplay = await page.locator('#stackDisplay');

    await input.fill('Item 4');
    await pushBtn.click();
    await clearBtn.click();

    await expect(message).toHaveText('Stack cleared.');
    await expect(stackDisplay).toHaveText('Stack is empty');
  });

  test('Clear an empty stack should not show error', async ({ page }) => {
    const clearBtn = await page.locator('#clearBtn');
    const message = await page.locator('#message');

    await clearBtn.click();

    await expect(message).toHaveText('Stack cleared.');
  });

  test('Buttons should be disabled when stack is empty', async ({ page }) => {
    const popBtn = await page.locator('#popBtn');
    const peekBtn = await page.locator('#peekBtn');
    const clearBtn = await page.locator('#clearBtn');

    await expect(popBtn).toBeDisabled();
    await expect(peekBtn).toBeDisabled();
    await expect(clearBtn).toBeDisabled();
  });

  test('Buttons should be enabled after pushing an item', async ({ page }) => {
    const input = await page.locator('#itemInput');
    const pushBtn = await page.locator('#pushBtn');
    const popBtn = await page.locator('#popBtn');
    const peekBtn = await page.locator('#peekBtn');
    const clearBtn = await page.locator('#clearBtn');

    await input.fill('Item 5');
    await pushBtn.click();

    await expect(popBtn).toBeEnabled();
    await expect(peekBtn).toBeEnabled();
    await expect(clearBtn).toBeEnabled();
  });
});