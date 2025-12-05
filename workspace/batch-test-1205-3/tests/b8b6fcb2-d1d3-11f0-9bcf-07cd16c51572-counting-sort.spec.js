import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b6fcb2-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Counting Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify that the page loads correctly and displays the title
        await expect(page.locator('h1')).toHaveText('Counting Sort Visualization');
        await expect(page.locator('input#inputArray')).toBeVisible();
        await expect(page.locator('button')).toHaveText('Sort');
        await expect(page.locator('#arrayContainer')).toBeVisible();
    });

    test('should display original and sorted arrays for valid input', async ({ page }) => {
        // Input a valid array and trigger the sort function
        await page.fill('input#inputArray', '3,6,4,5,3');
        await page.click('button');

        // Verify that the original array is displayed
        await expect(page.locator('#arrayContainer h2')).toHaveText('Original Array:');
        const originalBars = page.locator('#arrayContainer .bar');
        await expect(originalBars).toHaveCount(5); // 5 elements in the original array

        // Verify that the sorted array is displayed
        await expect(page.locator('#arrayContainer h2:nth-of-type(2)')).toHaveText('Sorted Array:');
        const sortedBars = page.locator('#arrayContainer .bar:nth-of-type(n+6)'); // Sorted bars start from 6th element
        await expect(sortedBars).toHaveCount(5); // 5 elements in the sorted array
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Input an empty array and trigger the sort function
        await page.fill('input#inputArray', '');
        await page.click('button');

        // Verify that no arrays are displayed
        const container = page.locator('#arrayContainer');
        await expect(container).toHaveText('Original Array:');
        await expect(container).toHaveText('Sorted Array:');
        await expect(container.locator('.bar')).toHaveCount(0); // No bars should be displayed
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Input invalid characters and trigger the sort function
        await page.fill('input#inputArray', 'a,b,c');
        await page.click('button');

        // Verify that no arrays are displayed
        const container = page.locator('#arrayContainer');
        await expect(container).toHaveText('Original Array:');
        await expect(container).toHaveText('Sorted Array:');
        await expect(container.locator('.bar')).toHaveCount(0); // No bars should be displayed
    });

    test('should display correct bar heights for sorted array', async ({ page }) => {
        // Input a specific array and trigger the sort function
        await page.fill('input#inputArray', '1,0,2,1,0');
        await page.click('button');

        // Verify that the sorted array bars have correct heights
        const sortedBars = page.locator('#arrayContainer .bar:nth-of-type(n+6)');
        await expect(sortedBars).toHaveCount(5); // 5 elements in the sorted array

        const heights = await sortedBars.evaluateAll(bars => bars.map(bar => bar.style.height));
        expect(heights).toEqual(['0px', '0px', '10px', '10px', '20px']); // Heights correspond to sorted values
    });

    test('should handle numbers outside the range gracefully', async ({ page }) => {
        // Input numbers outside the valid range and trigger the sort function
        await page.fill('input#inputArray', '10,11,12');
        await page.click('button');

        // Verify that no arrays are displayed
        const container = page.locator('#arrayContainer');
        await expect(container).toHaveText('Original Array:');
        await expect(container).toHaveText('Sorted Array:');
        await expect(container.locator('.bar')).toHaveCount(0); // No bars should be displayed
    });
});