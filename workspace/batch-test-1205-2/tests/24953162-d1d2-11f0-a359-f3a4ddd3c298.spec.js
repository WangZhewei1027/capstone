import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24953162-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Two Pointers Demo Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Validate that the initial state is Idle
        const arrayInput = await page.locator('#arrayInput');
        const targetInput = await page.locator('#targetInput');
        const findPairButton = await page.locator('#findPairButton');
        const resultDiv = await page.locator('#result');

        // Check if input fields and button are visible
        await expect(arrayInput).toBeVisible();
        await expect(targetInput).toBeVisible();
        await expect(findPairButton).toBeVisible();
        await expect(resultDiv).toHaveText('');
    });

    test('Find Pair button click with valid input', async ({ page }) => {
        // Test the transition from Idle to ResultDisplayed with valid input
        await page.fill('#arrayInput', '2,7,11,15');
        await page.fill('#targetInput', '9');
        await page.click('#findPairButton');

        // Validate the result displayed
        const resultDiv1 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Numbers found: 2 and 7');
    });

    test('Find Pair button click with no valid pair', async ({ page }) => {
        // Test the transition with input that has no valid pair
        await page.fill('#arrayInput', '1,2,3,4');
        await page.fill('#targetInput', '10');
        await page.click('#findPairButton');

        // Validate the result displayed
        const resultDiv2 = await page.locator('#result');
        await expect(resultDiv).toHaveText('No suitable pair found.');
    });

    test('Find Pair button click with empty inputs', async ({ page }) => {
        // Test the transition with empty inputs
        await page.fill('#arrayInput', '');
        await page.fill('#targetInput', '');
        await page.click('#findPairButton');

        // Validate that the result is empty or shows an error
        const resultDiv3 = await page.locator('#result');
        await expect(resultDiv).toHaveText('No suitable pair found.');
    });

    test('Find Pair button click with invalid number format', async ({ page }) => {
        // Test the transition with invalid number format
        await page.fill('#arrayInput', 'a,b,c');
        await page.fill('#targetInput', '5');
        await page.click('#findPairButton');

        // Validate that the result is empty or shows an error
        const resultDiv4 = await page.locator('#result');
        await expect(resultDiv).toHaveText('No suitable pair found.');
    });

    test('Console errors are logged for invalid input', async ({ page }) => {
        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(msg.text());
            }
        });

        // Trigger an error by providing invalid input
        await page.fill('#arrayInput', 'invalid,input');
        await page.fill('#targetInput', '5');
        await page.click('#findPairButton');

        // Expect console to have logged an error
        await expect(page).toHaveConsoleError(/invalid input/i);
    });
});