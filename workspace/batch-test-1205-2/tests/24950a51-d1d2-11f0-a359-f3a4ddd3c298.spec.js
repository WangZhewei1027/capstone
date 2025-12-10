import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24950a51-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Huffman Coding Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Huffman Coding Demonstration page before each test
        await page.goto(BASE_URL);
    });

    test('should display initial state with empty outputs', async ({ page }) => {
        // Validate that the initial state is Idle
        const huffmanCodesContent = await page.textContent('#huffmanCodes');
        const encodedOutputContent = await page.textContent('#encodedOutput');

        expect(huffmanCodesContent).toBe('');
        expect(encodedOutputContent).toBe('');
    });

    test('should generate Huffman codes and encoded output on button click', async ({ page }) => {
        // Input text into the textarea
        await page.fill('#inputText', 'hello huffman');

        // Click the button to generate Huffman code
        await page.click('button[onclick="generateHuffmanCode()"]');

        // Validate that Huffman codes and encoded output are displayed
        const huffmanCodesContent1 = await page.textContent('#huffmanCodes');
        const encodedOutputContent1 = await page.textContent('#encodedOutput');

        expect(huffmanCodesContent).not.toBe('');
        expect(encodedOutputContent).not.toBe('');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the button without entering any text
        await page.click('button[onclick="generateHuffmanCode()"]');

        // Validate that the outputs remain empty
        const huffmanCodesContent2 = await page.textContent('#huffmanCodes');
        const encodedOutputContent2 = await page.textContent('#encodedOutput');

        expect(huffmanCodesContent).toBe('');
        expect(encodedOutputContent).toBe('');
    });

    test('should handle single character input', async ({ page }) => {
        // Input a single character
        await page.fill('#inputText', 'a');

        // Click the button to generate Huffman code
        await page.click('button[onclick="generateHuffmanCode()"]');

        // Validate that Huffman codes and encoded output are displayed correctly
        const huffmanCodesContent3 = await page.textContent('#huffmanCodes');
        const encodedOutputContent3 = await page.textContent('#encodedOutput');

        expect(huffmanCodesContent).not.toBe('');
        expect(encodedOutputContent).toBe('0'); // Assuming 'a' is encoded as '0'
    });

    test('should handle repeated characters', async ({ page }) => {
        // Input repeated characters
        await page.fill('#inputText', 'aaaaaa');

        // Click the button to generate Huffman code
        await page.click('button[onclick="generateHuffmanCode()"]');

        // Validate that Huffman codes and encoded output are displayed correctly
        const huffmanCodesContent4 = await page.textContent('#huffmanCodes');
        const encodedOutputContent4 = await page.textContent('#encodedOutput');

        expect(huffmanCodesContent).not.toBe('');
        expect(encodedOutputContent).toBe('000000'); // Assuming 'a' is encoded as '0'
    });

    test('should handle multiple different characters', async ({ page }) => {
        // Input multiple different characters
        await page.fill('#inputText', 'abc');

        // Click the button to generate Huffman code
        await page.click('button[onclick="generateHuffmanCode()"]');

        // Validate that Huffman codes and encoded output are displayed correctly
        const huffmanCodesContent5 = await page.textContent('#huffmanCodes');
        const encodedOutputContent5 = await page.textContent('#encodedOutput');

        expect(huffmanCodesContent).not.toBe('');
        expect(encodedOutputContent).not.toBe('');
    });

    test('should log errors for invalid operations', async ({ page }) => {
        // This test is to observe console logs for any errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('Error message:', msg.text());
            }
        });

        // Intentionally trigger a scenario that may cause an error
        await page.fill('#inputText', 'invalid input');
        await page.click('button[onclick="generateHuffmanCode()"]');

        // Check for console errors
        // Note: The actual assertion for console errors would depend on the specific implementation
        // Here we are just logging them for observation
    });
});