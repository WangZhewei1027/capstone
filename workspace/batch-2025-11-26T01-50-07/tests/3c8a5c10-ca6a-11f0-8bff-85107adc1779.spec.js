import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8a5c10-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Huffman Coding Demonstration', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Initial State: Idle', () => {
    test('should display the initial UI elements', async () => {
      const encodeButton = await page.locator('#encodeBtn');
      const inputTextArea = await page.locator('#inputText');
      const resultDiv = await page.locator('#result');

      await expect(encodeButton).toBeVisible();
      await expect(inputTextArea).toBeVisible();
      await expect(resultDiv).toBeEmpty();
    });

    test('should enable the Encode button', async () => {
      const encodeButton = await page.locator('#encodeBtn');
      await expect(encodeButton).toBeEnabled();
    });
  });

  test.describe('Encoding Process', () => {
    test('should transition to Encoding state when Encode button is clicked with valid input', async () => {
      const encodeButton = await page.locator('#encodeBtn');
      const inputTextArea = await page.locator('#inputText');

      await inputTextArea.fill('this is an example for huffman encoding');
      await encodeButton.click();

      const resultDiv = await page.locator('#result');
      await expect(resultDiv).toContainText('Results');
      await expect(resultDiv).toContainText('Original text length:');
      await expect(resultDiv).toContainText('Encoded bit length:');
    });

    test('should show loading indicator during encoding', async () => {
      const resultDiv = await page.locator('#result');
      await expect(resultDiv).toContainText('Loading...');
    });

    test('should transition to Results state after encoding completes', async () => {
      const resultDiv = await page.locator('#result');
      await expect(resultDiv).toContainText('Compression ratio:');
    });
  });

  test.describe('Error Handling', () => {
    test('should display error message for empty input', async () => {
      const encodeButton = await page.locator('#encodeBtn');
      const inputTextArea = await page.locator('#inputText');

      await inputTextArea.fill('');
      await encodeButton.click();

      const resultDiv = await page.locator('#result');
      await expect(resultDiv).toContainText('Please enter some text to encode.');
    });

    test('should handle invalid input gracefully', async () => {
      const encodeButton = await page.locator('#encodeBtn');
      const inputTextArea = await page.locator('#inputText');

      await inputTextArea.fill('!!!'); // Invalid input scenario
      await encodeButton.click();

      const resultDiv = await page.locator('#result');
      await expect(resultDiv).toContainText('Please enter some valid characters.');
    });
  });

  test.describe('Reset Functionality', () => {
    test('should reset the input field and state after error', async () => {
      const encodeButton = await page.locator('#encodeBtn');
      const inputTextArea = await page.locator('#inputText');
      const resultDiv = await page.locator('#result');

      await inputTextArea.fill('!!!'); // Invalid input scenario
      await encodeButton.click();
      await expect(resultDiv).toContainText('Please enter some valid characters.');

      await inputTextArea.fill('this is an example for huffman encoding');
      await encodeButton.click();

      await expect(resultDiv).toContainText('Results');
    });
  });
});