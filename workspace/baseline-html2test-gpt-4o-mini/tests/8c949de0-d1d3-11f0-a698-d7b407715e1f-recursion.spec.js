import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c949de0-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Recursion Demo Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify the initial title and input value
        await expect(page).toHaveTitle('Recursion Demo');
        const inputValue = await page.locator('#numberInput').inputValue();
        expect(inputValue).toBe('5');
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('');
    });

    test('should calculate factorial of a positive integer', async ({ page }) => {
        // Input a positive integer and calculate factorial
        await page.fill('#numberInput', '5');
        await page.click('#calculateBtn');
        
        // Verify the output
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('The factorial of 5 is 120.');
    });

    test('should calculate factorial of zero', async ({ page }) => {
        // Input zero and calculate factorial
        await page.fill('#numberInput', '0');
        await page.click('#calculateBtn');
        
        // Verify the output
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('The factorial of 0 is 1.');
    });

    test('should handle negative input gracefully', async ({ page }) => {
        // Input a negative integer and check for error message
        await page.fill('#numberInput', '-3');
        await page.click('#calculateBtn');
        
        // Verify the error message
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('Please enter a non-negative integer.');
    });

    test('should calculate factorial of a large number', async ({ page }) => {
        // Input a large integer and calculate factorial
        await page.fill('#numberInput', '10');
        await page.click('#calculateBtn');
        
        // Verify the output
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('The factorial of 10 is 3628800.');
    });

    test('should not allow non-integer input', async ({ page }) => {
        // Input a non-integer value and check for error message
        await page.fill('#numberInput', '3.5');
        await page.click('#calculateBtn');
        
        // Verify the output remains unchanged
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('');
    });

    test('should clear output on new calculation', async ({ page }) => {
        // Perform a calculation and then a new one
        await page.fill('#numberInput', '4');
        await page.click('#calculateBtn');
        
        // Verify the output
        let outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('The factorial of 4 is 24.');

        // Clear input and perform another calculation
        await page.fill('#numberInput', '3');
        await page.click('#calculateBtn');
        
        // Verify the new output
        outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('The factorial of 3 is 6.');
    });
});