import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c197dd0-ca82-11f0-8193-f13bc409d3cb.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Huffman Coding Application Tests', () => {
    test('should be in Idle state initially', async ({ page }) => {
        const inputText = await page.locator('#input-text').inputValue();
        expect(inputText).toBe('');
        const errorMessage = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe('');
    });

    test('should transition to Encoding state on valid input', async ({ page }) => {
        await page.fill('#input-text', 'hello');
        await page.click('#encode-button');

        // Simulate the encoding process
        await page.waitForTimeout(1000); // Wait for encoding to complete
        const encodedText = await page.locator('#encoded-text').innerText();
        expect(encodedText).not.toBe('');
    });

    test('should transition to Decoding state after encoding', async ({ page }) => {
        await page.fill('#input-text', 'hello');
        await page.click('#encode-button');
        await page.waitForTimeout(1000); // Wait for encoding to complete

        await page.click('#decode-button');
        const decodedText = await page.locator('#decoded-text').innerText();
        expect(decodedText).toBe('hello'); // Assuming the decoding returns the original text
    });

    test('should show error message for empty input', async ({ page }) => {
        await page.click('#encode-button');
        const errorMessage = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe('Input cannot be empty'); // Assuming this is the error message
    });

    test('should handle error during encoding', async ({ page }) => {
        await page.fill('#input-text', ''); // Simulate an error condition
        await page.click('#encode-button');
        const errorMessage = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe('Input cannot be empty'); // Assuming this is the error message
    });

    test('should clear error message on new input', async ({ page }) => {
        await page.fill('#input-text', ''); // Trigger error
        await page.click('#encode-button');
        let errorMessage = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe('Input cannot be empty');

        await page.fill('#input-text', 'new input');
        await page.click('#encode-button');
        errorMessage = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe('');
    });

    test('should transition to Error state on encoding failure', async ({ page }) => {
        await page.fill('#input-text', ''); // Trigger error
        await page.click('#encode-button');
        const errorMessage = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe('Input cannot be empty');
    });

    test('should reset to Idle state after error', async ({ page }) => {
        await page.fill('#input-text', ''); // Trigger error
        await page.click('#encode-button');
        await page.locator('#error-message').innerText(); // Wait for error message

        await page.click('#encode-button'); // Attempt to encode again
        const inputText = await page.locator('#input-text').inputValue();
        expect(inputText).toBe('');
    });
});