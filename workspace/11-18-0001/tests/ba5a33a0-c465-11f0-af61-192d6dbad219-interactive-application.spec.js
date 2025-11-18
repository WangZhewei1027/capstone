import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0001/html/ba5a33a0-c465-11f0-af61-192d6dbad219.html';

test.describe('Interactive Bubble Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should generate a random array and render it', async ({ page }) => {
        // Click the generate button
        await page.click('#generate');

        // Check that the array container is not empty
        const arrayContainer = await page.locator('#array-container');
        await expect(arrayContainer).not.toBeEmpty();

        // Validate that bars are rendered
        const bars = await arrayContainer.locator('.bar');
        await expect(bars).toHaveCount(10); // Default size is 10
    });

    test('should alert user when trying to sort without generating an array', async ({ page }) => {
        // Click the sort button without generating an array
        await page.click('#sort');

        // Expect an alert to be shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Generate an array first!');
            await dialog.dismiss();
        });
    });

    test('should sort the array when sort button is clicked', async ({ page }) => {
        // Generate a random array
        await page.click('#generate');

        // Click the sort button
        await page.click('#sort');

        // Wait for sorting to complete
        await page.waitForTimeout(5000); // Adjust timeout as necessary for sorting animation

        // Check that the array is sorted
        const barHeights = await page.$$eval('.bar', bars => bars.map(bar => parseInt(bar.style.height) / 3));
        const sortedArray = [...barHeights].sort((a, b) => a - b);
        expect(barHeights).toEqual(sortedArray);
    });

    test('should reset the array when reset button is clicked', async ({ page }) => {
        // Generate a random array
        await page.click('#generate');

        // Ensure the array is generated
        const arrayContainer1 = await page.locator('#array-container');
        await expect(arrayContainer).not.toBeEmpty();

        // Click the reset button
        await page.click('#reset');

        // Check that the array container is empty
        await expect(arrayContainer).toBeEmpty();
    });

    test('should generate a new array after sorting', async ({ page }) => {
        // Generate a random array
        await page.click('#generate');

        // Click the sort button
        await page.click('#sort');
        await page.waitForTimeout(5000); // Wait for sorting to complete

        // Click generate again
        await page.click('#generate');

        // Check that a new array is generated
        const arrayContainer2 = await page.locator('#array-container');
        await expect(arrayContainer).not.toBeEmpty();
    });

    test('should handle multiple resets correctly', async ({ page }) => {
        // Generate a random array
        await page.click('#generate');

        // Click the reset button multiple times
        await page.click('#reset');
        await page.click('#reset');
        await page.click('#reset');

        // Check that the array container is empty
        const arrayContainer3 = await page.locator('#array-container');
        await expect(arrayContainer).toBeEmpty();
    });
});