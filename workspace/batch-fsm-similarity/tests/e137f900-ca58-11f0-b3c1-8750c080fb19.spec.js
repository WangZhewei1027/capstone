import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e137f900-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Binary Search Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in Idle state', async ({ page }) => {
        // Verify that the initial state is Idle
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('should transition to InputtingData state on search button click', async ({ page }) => {
        // Simulate user input and click the search button
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '3');
        await page.click('button');

        // Verify that the input fields are highlighted (simulated)
        const arrayInput = await page.locator('#arrayInput').evaluate(el => el.style.border);
        expect(arrayInput).toContain('highlight'); // Assuming highlight adds a border style
    });

    test('should transition to Searching state with valid inputs', async ({ page }) => {
        // Input valid data and click search
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '3');
        await page.click('button');

        // Check for loading indicator (simulated)
        const loadingIndicator = await page.locator('#loadingIndicator'); // Assuming there's a loading indicator
        await expect(loadingIndicator).toBeVisible();

        // Wait for result to be displayed
        await page.waitForTimeout(1000); // Simulating the search processing time
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toContain('Target 3 found at index: 2');
    });

    test('should display error message for invalid input', async ({ page }) => {
        // Input invalid data and click search
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '10');
        await page.click('button');

        // Check for result indicating not found
        await page.waitForTimeout(1000); // Simulating the search processing time
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toContain('Target 10 not found in the array.');
    });

    test('should clear error state and reset inputs', async ({ page }) => {
        // Input invalid data first
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '10');
        await page.click('button');
        await page.waitForTimeout(1000); // Wait for error display

        // Now click search again to clear error
        await page.fill('#targetInput', '3');
        await page.click('button');

        // Check that the result is now valid
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toContain('Target 3 found at index: 2');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click search without any input
        await page.click('button');

        // Check for error message
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toContain('Target not found in the array.'); // Assuming this is the error message
    });

    test.afterEach(async ({ page }) => {
        // Optionally, reset the state after each test
        await page.fill('#arrayInput', '');
        await page.fill('#targetInput', '');
        await page.locator('#result').fill('');
    });
});