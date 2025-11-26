import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba6da91-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Huffman Coding Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify the initial state of the application
        const form = await page.locator('#huffman-form');
        const generateButton = await page.locator('#generate-huffman-code');
        await expect(form).toBeVisible();
        await expect(generateButton).toBeVisible();
    });

    test('User inputs a symbol and transitions to Symbol Entered state', async ({ page }) => {
        // Simulate user input
        await page.fill('#symbol', 'A');
        
        // Verify that the symbol is added and the state transitions
        const inputValue = await page.inputValue('#symbol');
        expect(inputValue).toBe('A');
    });

    test('Generate Huffman Code button generates code and transitions to Code Generated state', async ({ page }) => {
        await page.fill('#symbol', 'A');
        await page.click('#generate-huffman-code');
        
        // Verify that the code generation process occurs
        const codeDisplay = await page.locator('#display-huffman-code');
        await expect(codeDisplay).toBeVisible();
    });

    test('Display Huffman Code button displays the generated code and transitions to Code Displayed state', async ({ page }) => {
        await page.fill('#symbol', 'A');
        await page.click('#generate-huffman-code');
        await page.click('#display-huffman-code');

        // Verify that the Huffman code is displayed
        const displayedCode = await page.locator('#display-huffman-code').innerText();
        expect(displayedCode).toContain('Huffman Code:');
    });

    test('Inputting an empty symbol should not generate a code', async ({ page }) => {
        await page.fill('#symbol', '');
        
        // Verify that the generate button is not clickable or does not generate a code
        await page.click('#generate-huffman-code');
        const displayedCode = await page.locator('#display-huffman-code').innerText();
        expect(displayedCode).not.toContain('Huffman Code:');
    });

    test('Multiple symbols input should generate correct Huffman Code', async ({ page }) => {
        await page.fill('#symbol', 'A');
        await page.click('#generate-huffman-code');
        await page.fill('#symbol', 'B');
        await page.click('#generate-huffman-code');
        
        // Verify that the code is generated for multiple symbols
        await page.click('#display-huffman-code');
        const displayedCode = await page.locator('#display-huffman-code').innerText();
        expect(displayedCode).toContain('Huffman Code:');
    });

    test('Check visual feedback on button hover', async ({ page }) => {
        const generateButton = await page.locator('#generate-huffman-code');
        await generateButton.hover();
        
        // Verify that the button changes appearance on hover
        const bgColor = await generateButton.evaluate(el => getComputedStyle(el).backgroundColor);
        expect(bgColor).toBe('rgb(62, 142, 65)'); // Check for hover color
    });

    test.afterEach(async ({ page }) => {
        // Optionally reset the state or clean up after tests
        await page.fill('#symbol', '');
    });
});