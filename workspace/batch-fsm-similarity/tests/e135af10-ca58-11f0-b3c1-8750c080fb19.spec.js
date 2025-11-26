import { test, expect } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e135af10-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Array Demo Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(baseUrl);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Verify that the initial state is Idle
        const button = await page.locator('#generateArrayButton');
        const output = await page.locator('#arrayOutput');

        await expect(button).toBeVisible();
        await expect(button).toHaveText('Generate Random Array');
        await expect(output).toHaveText('Array will be displayed here.');
    });

    test('Clicking Generate Random Array transitions to GeneratingArray', async ({ page }) => {
        // Click the button and check the transition to GeneratingArray
        const button = await page.locator('#generateArrayButton');
        await button.click();

        // Verify that the button is disabled during array generation
        await expect(button).toBeDisabled();
    });

    test('Array should be generated and displayed after clicking the button', async ({ page }) => {
        // Click the button to generate the array
        const button = await page.locator('#generateArrayButton');
        await button.click();

        // Wait for the array to be generated and displayed
        const output = await page.locator('#arrayOutput');
        await expect(output).toContainText('Generated Array:');
    });

    test('Clicking Generate Random Array again returns to Idle state', async ({ page }) => {
        // Generate the array first
        const button = await page.locator('#generateArrayButton');
        await button.click();
        await expect(button).toBeDisabled();
        
        // Wait for the array to be displayed
        const output = await page.locator('#arrayOutput');
        await expect(output).toContainText('Generated Array:');

        // Click the button again to return to Idle state
        await button.click();

        // Verify that the output is reset to initial state
        await expect(output).toHaveText('Array will be displayed here.');
        await expect(button).toBeEnabled();
    });

    test('Edge case: Verify array length is 10', async ({ page }) => {
        // Generate the array and check its length
        const button = await page.locator('#generateArrayButton');
        await button.click();

        const output = await page.locator('#arrayOutput');
        const arrayText = await output.innerText();
        const array = JSON.parse(arrayText.replace('Generated Array: ', ''));

        // Verify that the generated array length is 10
        expect(array.length).toBe(10);
    });

    test('Error scenario: Check button state after multiple clicks', async ({ page }) => {
        const button = await page.locator('#generateArrayButton');

        // Click the button multiple times
        await button.click();
        await button.click();

        // Ensure the button is still disabled after the first click
        await expect(button).toBeDisabled();

        // Wait for the array to be displayed
        const output = await page.locator('#arrayOutput');
        await expect(output).toContainText('Generated Array:');
    });
});