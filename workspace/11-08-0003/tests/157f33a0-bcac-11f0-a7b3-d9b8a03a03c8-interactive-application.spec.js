import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/157f33a0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Application - Factorial Calculator', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const outputMessage = await page.locator('#outputMessage').innerText();
        expect(outputMessage).toBe('');
        const loadingMessageVisible = await page.locator('.loading').isVisible();
        expect(loadingMessageVisible).toBe(false);
    });

    test('should transition to loading state on calculate button click', async ({ page }) => {
        await page.fill('#inputNumber', '5');
        await page.click('#calculateButton');

        const loadingMessageVisible1 = await page.locator('.loading').isVisible();
        expect(loadingMessageVisible).toBe(true);
        const outputMessage1 = await page.locator('#outputMessage1').innerText();
        expect(outputMessage).toBe('');
    });

    test('should handle invalid input and return to idle state', async ({ page }) => {
        await page.fill('#inputNumber', '-1');
        await page.click('#calculateButton');

        const outputMessage2 = await page.locator('#outputMessage2').innerText();
        expect(outputMessage).toBe('Please enter a non-negative integer.');
        const loadingMessageVisible2 = await page.locator('.loading').isVisible();
        expect(loadingMessageVisible).toBe(false);
    });

    test('should transition to done state after processing completes', async ({ page }) => {
        await page.fill('#inputNumber', '5');
        await page.click('#calculateButton');

        // Simulate processing complete
        await page.waitForTimeout(1000); // Assuming processing takes some time
        const outputMessage3 = await page.locator('#outputMessage3').innerText();
        expect(outputMessage).toBe('Factorial of 5 is 120'); // Assuming this is the expected output
        const loadingMessageVisible3 = await page.locator('.loading').isVisible();
        expect(loadingMessageVisible).toBe(false);
    });

    test('should reset output on re-calculation', async ({ page }) => {
        await page.fill('#inputNumber', '5');
        await page.click('#calculateButton');
        await page.waitForTimeout(1000); // Wait for processing

        await page.fill('#inputNumber', '3');
        await page.click('#calculateButton');

        const outputMessage4 = await page.locator('#outputMessage4').innerText();
        expect(outputMessage).toBe('Factorial of 3 is 6'); // Assuming this is the expected output
    });

    test('should display error message for non-integer input', async ({ page }) => {
        await page.fill('#inputNumber', 'abc');
        await page.click('#calculateButton');

        const outputMessage5 = await page.locator('#outputMessage5').innerText();
        expect(outputMessage).toBe('Please enter a non-negative integer.');
        const loadingMessageVisible4 = await page.locator('.loading').isVisible();
        expect(loadingMessageVisible).toBe(false);
    });

    test('should handle zero input correctly', async ({ page }) => {
        await page.fill('#inputNumber', '0');
        await page.click('#calculateButton');

        await page.waitForTimeout(1000); // Wait for processing
        const outputMessage6 = await page.locator('#outputMessage6').innerText();
        expect(outputMessage).toBe('Factorial of 0 is 1'); // Assuming this is the expected output
    });
});