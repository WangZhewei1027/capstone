import { test, expect } from '@playwright/test';

test.describe('Stack Data Structure Demo', () => {
  const baseUrl = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-59-33/html/c8b45211-c88d-11f0-bba4-b3577ad7fe65.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
  });

  test('Initial state should be empty', async ({ page }) => {
    const stackElements = await page.$$('#stack-container .stack-element');
    expect(stackElements.length).toBe(0);

    const popBtn = await page.$('#popBtn');
    const peekBtn = await page.$('#peekBtn');
    const clearBtn = await page.$('#clearBtn');

    expect(await popBtn.isDisabled()).toBe(true);
    expect(await peekBtn.isDisabled()).toBe(true);
    expect(await clearBtn.isDisabled()).toBe(true);
  });

  test.describe('Push operation', () => {
    test('should add an element to the stack', async ({ page }) => {
      await page.fill('#inputValue', 'Test Value');
      await page.click('#pushBtn');

      const stackElements = await page.$$('#stack-container .stack-element');
      expect(stackElements.length).toBe(1);
      expect(await stackElements[0].textContent()).toBe('Test Value');

      const message = await page.$('#message');
      expect(await message.textContent()).toBe('Pushed "Test Value" onto the stack.');
    });

    test('should show error message for empty input', async ({ page }) => {
      await page.click('#pushBtn');

      const message = await page.$('#message');
      expect(await message.textContent()).toBe('Please enter a value to push.');
      expect(await message.evaluate(node => node.style.color)).toBe('rgb(217, 83, 79)');
    });

    test('should trigger push on Enter key', async ({ page }) => {
      await page.fill('#inputValue', 'Enter Value');
      await page.press('#inputValue', 'Enter');

      const stackElements = await page.$$('#stack-container .stack-element');
      expect(stackElements.length).toBe(1);
      expect(await stackElements[0].textContent()).toBe('Enter Value');

      const message = await page.$('#message');
      expect(await message.textContent()).toBe('Pushed "Enter Value" onto the stack.');
    });
  });

  test.describe('Pop operation', () => {
    test('should remove the top element from the stack', async ({ page }) => {
      await page.fill('#inputValue', 'Value 1');
      await page.click('#pushBtn');
      await page.fill('#inputValue', 'Value 2');
      await page.click('#pushBtn');

      await page.click('#popBtn');

      const stackElements = await page.$$('#stack-container .stack-element');
      expect(stackElements.length).toBe(1);
      expect(await stackElements[0].textContent()).toBe('Value 1');

      const message = await page.$('#message');
      expect(await message.textContent()).toBe('Popped "Value 2" from the stack.');
    });

    test('should show error message when stack is empty', async ({ page }) => {
      await page.click('#popBtn');

      const message = await page.$('#message');
      expect(await message.textContent()).toBe('Stack is empty. Cannot pop.');
      expect(await message.evaluate(node => node.style.color)).toBe('rgb(217, 83, 79)');
    });
  });

  test.describe('Peek operation', () => {
    test('should display the top element without removing it', async ({ page }) => {
      await page.fill('#inputValue', 'Peek Value');
      await page.click('#pushBtn');

      await page.click('#peekBtn');

      const stackElements = await page.$$('#stack-container .stack-element');
      expect(stackElements.length).toBe(1);
      expect(await stackElements[0].textContent()).toBe('Peek Value');

      const message = await page.$('#message');
      expect(await message.textContent()).toBe('Top element is "Peek Value".');
    });

    test('should show error message when stack is empty', async ({ page }) => {
      await page.click('#peekBtn');

      const message = await page.$('#message');
      expect(await message.textContent()).toBe('Stack is empty. Nothing to peek.');
      expect(await message.evaluate(node => node.style.color)).toBe('rgb(217, 83, 79)');
    });
  });

  test.describe('Clear operation', () => {
    test('should remove all elements from the stack', async ({ page }) => {
      await page.fill('#inputValue', 'Clear Value');
      await page.click('#pushBtn');
      await page.click('#clearBtn');

      const stackElements = await page.$$('#stack-container .stack-element');
      expect(stackElements.length).toBe(0);

      const message = await page.$('#message');
      expect(await message.textContent()).toBe('Cleared all elements from the stack.');
    });

    test('should show error message when stack is already empty', async ({ page }) => {
      await page.click('#clearBtn');

      const message = await page.$('#message');
      expect(await message.textContent()).toBe('Stack is already empty.');
      expect(await message.evaluate(node => node.style.color)).toBe('rgb(217, 83, 79)');
    });
  });
});