import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba6b382-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Knapsack Problem Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should render input fields and submit button', async ({ page }) => {
        // Validate that the initial state (Idle) is rendered properly
        const weightInput = await page.locator('#weight');
        const valueInput = await page.locator('#value');
        const submitButton = await page.locator('#submit');
        
        await expect(weightInput).toBeVisible();
        await expect(valueInput).toBeVisible();
        await expect(submitButton).toBeVisible();
    });

    test('User can input weight and value and submit', async ({ page }) => {
        // Test user input and submission
        await page.fill('#weight', '50'); // Input weight
        await page.fill('#value', '100'); // Input value
        await page.click('#submit'); // Click submit button

        // Validate that the result is displayed after submission
        const resultText = await page.locator('#result').textContent();
        await expect(resultText).toMatch(/^\$\d+kg$/); // Check if result is in the expected format
    });

    test('Result should be calculated correctly for valid inputs', async ({ page }) => {
        // Test with specific inputs and validate the result
        await page.fill('#weight', '10'); // Input weight
        await page.fill('#value', '20'); // Input value
        await page.click('#submit'); // Click submit button

        // Validate that the result is displayed correctly
        const resultText = await page.locator('#result').textContent();
        await expect(resultText).toBe('$10kg'); // Expected result based on knapsack calculation
    });

    test('Result should not display for invalid inputs', async ({ page }) => {
        // Test with invalid inputs (e.g., negative weight)
        await page.fill('#weight', '-5'); // Input negative weight
        await page.fill('#value', '100'); // Input value
        await page.click('#submit'); // Click submit button

        // Validate that the result is not displayed or shows an error
        const resultText = await page.locator('#result').textContent();
        await expect(resultText).toBe(''); // Expect no result for invalid input
    });

    test('Result should not display for empty inputs', async ({ page }) => {
        // Test with empty inputs
        await page.fill('#weight', ''); // Clear weight input
        await page.fill('#value', ''); // Clear value input
        await page.click('#submit'); // Click submit button

        // Validate that the result is not displayed
        const resultText = await page.locator('#result').textContent();
        await expect(resultText).toBe(''); // Expect no result for empty input
    });

    test('Result should update correctly on multiple submissions', async ({ page }) => {
        // Test multiple submissions with different inputs
        await page.fill('#weight', '20'); // First input weight
        await page.fill('#value', '40'); // First input value
        await page.click('#submit'); // First submission

        let resultText = await page.locator('#result').textContent();
        await expect(resultText).toBe('$20kg'); // Expected result for first submission

        await page.fill('#weight', '30'); // Second input weight
        await page.fill('#value', '60'); // Second input value
        await page.click('#submit'); // Second submission

        resultText = await page.locator('#result').textContent();
        await expect(resultText).toBe('$30kg'); // Expected result for second submission
    });
});