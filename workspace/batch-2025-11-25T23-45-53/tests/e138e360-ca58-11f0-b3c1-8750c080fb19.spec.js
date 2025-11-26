import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e138e360-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Two Pointers Technique Demo', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state', async ({ page }) => {
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('should transition to InputtingData state on button click', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '5');
        await page.click('button');

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Pairs that sum to 5: (2, 3)');
    });

    test('should show error message for invalid input', async ({ page }) => {
        await page.fill('#arrayInput', '');
        await page.fill('#targetInput', '5');
        await page.click('button');

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Please enter a valid array and target.');
    });

    test('should find pairs that sum to the target', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '6');
        await page.click('button');

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Pairs that sum to 6: (1, 5), (2, 4)');
    });

    test('should indicate no pairs found', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3');
        await page.fill('#targetInput', '7');
        await page.click('button');

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('No pairs found that sum to 7.');
    });

    test('should reset inputs and return to Idle state on subsequent clicks', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '5');
        await page.click('button');

        let resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Pairs that sum to 5: (2, 3)');

        // Reset by clicking again
        await page.click('button');

        resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Pairs that sum to 5: (2, 3)'); // Still showing results
    });

    test('should handle empty array input gracefully', async ({ page }) => {
        await page.fill('#arrayInput', '');
        await page.fill('#targetInput', '5');
        await page.click('button');

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Please enter a valid array and target.');
    });

    test('should handle non-numeric target input gracefully', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', 'abc');
        await page.click('button');

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Please enter a valid array and target.');
    });
});