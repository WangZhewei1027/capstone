import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/108c1ca0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Floyd-Warshall Algorithm Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize input fields on idle state', async ({ page }) => {
        const inputs = await page.$$('#adjacency-matrix input');
        for (const input of inputs) {
            const value = await input.inputValue();
            expect(value).toBe('0'); // Check if all input fields are initialized to 0
        }
    });

    test('should transition to calculating state when running the algorithm', async ({ page }) => {
        await page.fill('#adjacency-matrix input:nth-of-type(1)', '1');
        await page.fill('#adjacency-matrix input:nth-of-type(2)', '2');
        await page.click('button:has-text("Run Algorithm")');

        // Simulate animation completion
        await page.waitForTimeout(1000); // Assuming some delay for the animation
        await page.evaluate(() => {
            document.dispatchEvent(new Event('ANIMATION_COMPLETE'));
        });

        // Check if the state has transitioned to updating
        const resultMatrix = await page.$$('#result-matrix div');
        expect(resultMatrix.length).toBeGreaterThan(0); // Check if result matrix has been populated
    });

    test('should transition to idle state after result is displayed', async ({ page }) => {
        await page.fill('#adjacency-matrix input:nth-of-type(1)', '1');
        await page.fill('#adjacency-matrix input:nth-of-type(2)', '2');
        await page.click('button:has-text("Run Algorithm")');

        // Simulate animation completion
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
            document.dispatchEvent(new Event('ANIMATION_COMPLETE'));
        });

        // Simulate result displayed
        await page.evaluate(() => {
            document.dispatchEvent(new Event('RESULT_DISPLAYED'));
        });

        // Check if we are back to idle state
        const inputs1 = await page.$$('#adjacency-matrix input');
        for (const input of inputs) {
            const value1 = await input.inputValue();
            expect(value).toBe('0'); // Check if input fields are reset
        }
    });

    test('should reset matrix to idle state', async ({ page }) => {
        await page.fill('#adjacency-matrix input:nth-of-type(1)', '1');
        await page.click('button:has-text("Reset")');

        const inputs2 = await page.$$('#adjacency-matrix input');
        for (const input of inputs) {
            const value2 = await input.inputValue();
            expect(value).toBe('0'); // Check if all input fields are reset to 0
        }
    });

    test('should handle edge cases with invalid input', async ({ page }) => {
        await page.fill('#adjacency-matrix input:nth-of-type(1)', '-1'); // Invalid input
        await page.click('button:has-text("Run Algorithm")');

        const errorMessage = await page.locator('.error-message'); // Assuming there's an error message element
        await expect(errorMessage).toBeVisible(); // Check if error message is displayed
    });

    test('should not allow running algorithm with empty inputs', async ({ page }) => {
        await page.click('button:has-text("Run Algorithm")');

        const errorMessage1 = await page.locator('.error-message'); // Assuming there's an error message element
        await expect(errorMessage).toBeVisible(); // Check if error message is displayed
    });
});