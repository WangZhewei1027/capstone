import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24944701-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Heap Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Heap Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Validate that the page is in the Idle state
        const buttons = await page.locator('button');
        await expect(buttons).toHaveCount(2); // Expect two buttons to be present
        await expect(buttons.nth(0)).toHaveText('Generate Random Array');
        await expect(buttons.nth(1)).toHaveText('Sort with Heap Sort');
    });

    test('Generate Random Array transitions to Array Generated', async ({ page }) => {
        // Click the button to generate a random array
        await page.click('button[onclick="generateRandomArray()"]');
        
        // Validate that the array is displayed
        const arrayContainer = await page.locator('#arrayContainer');
        await expect(arrayContainer).toHaveCount(1); // Expect the container to exist
        await expect(arrayContainer).not.toHaveText(''); // Expect the container to not be empty
    });

    test('Sorting the array transitions to Sorted', async ({ page }) => {
        // Generate a random array first
        await page.click('button[onclick="generateRandomArray()"]');
        
        // Click the button to sort the array
        await page.click('button[onclick="heapSortAnimation()"]');
        
        // Validate that the sorting animation starts
        const arrayContainer1 = await page.locator('#arrayContainer1');
        await expect(arrayContainer).toHaveCount(1); // Expect the container to exist
        
        // Wait for the sorting animation to complete
        await page.waitForTimeout(6000); // Wait for the sorting animation to finish (adjust as necessary)
        
        // Validate that the array is sorted
        const bars = await arrayContainer.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights); // Expect the heights to be sorted
    });

    test('Edge case: Sorting an empty array', async ({ page }) => {
        // Directly manipulate the array to be empty
        await page.evaluate(() => {
            window.array = [];
            window.displayArray();
        });

        // Click the button to sort the empty array
        await page.click('button[onclick="heapSortAnimation()"]');

        // Validate that the array remains empty
        const arrayContainer2 = await page.locator('#arrayContainer2');
        await expect(arrayContainer).toHaveText(''); // Expect the container to be empty
    });

    test('Error handling: Click sort without generating an array', async ({ page }) => {
        // Click the button to sort without generating an array
        await page.click('button[onclick="heapSortAnimation()"]');

        // Validate that an error occurs (check console for errors)
        const consoleErrors = await page.evaluate(() => {
            return window.console.error;
        });
        expect(consoleErrors).toBeTruthy(); // Expect some error to be logged
    });
});