import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/18110210-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Application - Factorial Calculator', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state and clear visuals', async ({ page }) => {
        const result = await page.locator('#result').innerText();
        const visualize = await page.locator('#visualize').innerHTML();
        expect(result).toBe('');
        expect(visualize).toBe('');
    });

    test('should validate user input and display error for invalid input', async ({ page }) => {
        await page.fill('#numberInput', '-1');
        await page.click('#calculateButton');

        const result1 = await page.locator('#result1').innerText();
        expect(result).toBe('Please enter a valid non-negative number.');
    });

    test('should calculate factorial for valid input', async ({ page }) => {
        await page.fill('#numberInput', '5');
        await page.click('#calculateButton');

        const result2 = await page.locator('#result2').innerText();
        expect(result).toBe('Factorial of 5 is: 120');
    });

    test('should visualize recursion during calculation', async ({ page }) => {
        await page.fill('#numberInput', '3');
        await page.click('#calculateButton');

        const boxes = await page.locator('.box').count();
        expect(boxes).toBe(4); // 3, 2, 1, 0
    });

    test('should clear visuals and result on reset', async ({ page }) => {
        await page.fill('#numberInput', '4');
        await page.click('#calculateButton');
        await page.locator('#result').waitFor();
        
        await page.fill('#numberInput', '');
        await page.click('#calculateButton');

        const result3 = await page.locator('#result3').innerText();
        const visualize1 = await page.locator('#visualize1').innerHTML();
        expect(result).toBe('Please enter a valid non-negative number.');
        expect(visualize).toBe('');
    });

    test('should handle edge case for zero input', async ({ page }) => {
        await page.fill('#numberInput', '0');
        await page.click('#calculateButton');

        const result4 = await page.locator('#result4').innerText();
        expect(result).toBe('Factorial of 0 is: 1');
    });

    test('should handle edge case for large input', async ({ page }) => {
        await page.fill('#numberInput', '10');
        await page.click('#calculateButton');

        const result5 = await page.locator('#result5').innerText();
        expect(result).toBe('Factorial of 10 is: 3628800');
    });
});