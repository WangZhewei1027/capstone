import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba5c920-ca89-11f0-800e-fdebe921fc5f.html';

test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
});

test.describe('Insertion Sort Application Tests', () => {
    
    test('Initial state - Idle', async ({ page }) => {
        // Verify that the application is in the initial "Idle" state
        const arraySizeInput = await page.locator('#array-size');
        const generateArrayBtn = await page.locator('#generate-array-btn');
        const sortBtn = await page.locator('#sort-btn');

        await expect(arraySizeInput).toBeEnabled();
        await expect(generateArrayBtn).toBeEnabled();
        await expect(sortBtn).toBeDisabled();
    });

    test('Generate Array - Transition from Idle to Array Generated', async ({ page }) => {
        // Test the Generate Array functionality
        await page.fill('#array-size', '5'); // Fill the array size
        await page.click('#generate-array-btn'); // Click to generate the array

        // Verify the state transition
        const arraySizeInput = await page.locator('#array-size');
        const generateArrayBtn = await page.locator('#generate-array-btn');
        const sortBtn = await page.locator('#sort-btn');

        await expect(arraySizeInput).toBeDisabled(); // Input should be disabled
        await expect(generateArrayBtn).toBeDisabled(); // Button should be disabled
        await expect(sortBtn).toBeEnabled(); // Sort button should be enabled
    });

    test('Sort Array - Transition from Array Generated to Array Sorted', async ({ page }) => {
        // First, generate the array
        await page.fill('#array-size', '5');
        await page.click('#generate-array-btn');

        // Now, sort the array
        await page.click('#sort-btn');

        // Verify the state transition
        const sortedArrayTbody = await page.locator('#sorted-array-tbody');
        await expect(sortedArrayTbody).toHaveCount(5); // Expect 5 sorted elements to be displayed
    });

    test('Edge case - Invalid array size', async ({ page }) => {
        // Attempt to generate an array with an invalid size (e.g., empty)
        await page.fill('#array-size', ''); // Clear the input
        await page.click('#generate-array-btn'); // Click to generate the array

        // Verify that the array is not generated and buttons remain in the correct state
        const arraySizeInput = await page.locator('#array-size');
        const generateArrayBtn = await page.locator('#generate-array-btn');
        const sortBtn = await page.locator('#sort-btn');

        await expect(arraySizeInput).toBeEnabled(); // Input should still be enabled
        await expect(generateArrayBtn).toBeEnabled(); // Button should still be enabled
        await expect(sortBtn).toBeDisabled(); // Sort button should still be disabled
    });

    test('Sort Array with no generated array', async ({ page }) => {
        // Click sort without generating an array
        await page.click('#sort-btn');

        // Verify that nothing happens (no rows should be displayed)
        const sortedArrayTbody = await page.locator('#sorted-array-tbody');
        await expect(sortedArrayTbody).toHaveCount(0); // Expect no elements to be displayed
    });
});