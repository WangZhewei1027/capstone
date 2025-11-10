import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/082a6bc0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Merge Sort Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state and generate an array', async ({ page }) => {
        // Verify initial state (idle)
        const arrayContainer = await page.locator('#array');
        await expect(arrayContainer).toHaveText('');

        // Click on "Generate Array" button
        await page.click('#generate');

        // Verify state transition to array_generated
        await expect(arrayContainer).toHaveCount(10); // Assuming default size is 10
        await expect(arrayContainer).toHaveText(/^\d+$/); // Check for numbers
    });

    test('should sort the generated array', async ({ page }) => {
        // Generate an array first
        await page.click('#generate');

        // Verify array is generated
        const arrayContainer1 = await page.locator('#array');
        await expect(arrayContainer).toHaveCount(10);

        // Click on "Sort Array" button
        await page.click('#sort');

        // Verify state transition to sorting
        await expect(arrayContainer).toHaveCount(10); // Count remains the same
        await expect(arrayContainer).toHaveText(/^\d+$/); // Check for numbers during sorting

        // Wait for sorting to complete (assuming there's a visual change)
        await page.waitForTimeout(2000); // Adjust timeout based on sorting duration

        // Verify final state (sorted)
        const sortedArray = await arrayContainer.locator('.element').allTextContents();
        const isSorted = sortedArray.every((val, index, arr) => index === 0 || val >= arr[index - 1]);
        expect(isSorted).toBe(true);
    });

    test('should return to array_generated state after sorting', async ({ page }) => {
        // Generate and sort the array
        await page.click('#generate');
        await page.click('#sort');

        // Click on "Generate Array" button again
        await page.click('#generate');

        // Verify state transition back to array_generated
        const arrayContainer2 = await page.locator('#array');
        await expect(arrayContainer).toHaveCount(10);
        await expect(arrayContainer).toHaveText(/^\d+$/); // Check for new numbers
    });

    test('should handle edge case of sorting an empty array', async ({ page }) => {
        // Manually clear the array (simulate edge case)
        const arrayContainer3 = await page.locator('#array');
        await page.evaluate(() => {
            document.getElementById('array').innerHTML = '';
        });

        // Click on "Sort Array" button
        await page.click('#sort');

        // Verify that nothing happens (array remains empty)
        await expect(arrayContainer).toHaveText('');
    });

    test('should handle sorting with a single element', async ({ page }) => {
        // Generate an array with a single element
        await page.evaluate(() => {
            const arrayContainer4 = document.getElementById('array');
            arrayContainer.innerHTML = '<div class="element" style="height: 50px;">50</div>';
        });

        // Click on "Sort Array" button
        await page.click('#sort');

        // Verify that the single element remains unchanged
        const arrayContainer5 = await page.locator('#array');
        await expect(arrayContainer).toHaveCount(1);
        await expect(arrayContainer).toHaveText('50');
    });
});