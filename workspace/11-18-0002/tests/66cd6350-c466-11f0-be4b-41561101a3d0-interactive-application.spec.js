import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0002/html/66cd6350-c466-11f0-be4b-41561101a3d0.html';

test.describe('Bubble Sort Interactive Exploration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const startButton = await page.locator('#startSort');
        const generateButton = await page.locator('#generateArray');

        // Verify that the start button is disabled initially
        await expect(startButton).toBeDisabled();
        // Verify that the generate array button is enabled
        await expect(generateButton).toBeEnabled();
    });

    test('should generate an array and transition to array_generated state', async ({ page }) => {
        const generateButton = await page.locator('#generateArray');
        await generateButton.click();

        // Verify that the start button is enabled after generating the array
        const startButton = await page.locator('#startSort');
        await expect(startButton).toBeEnabled();

        // Verify that the array is rendered
        const arrayContainer = await page.locator('#array');
        await expect(arrayContainer).toHaveCount(10); // Assuming array size is 10
    });

    test('should start sorting and transition to sorting state', async ({ page }) => {
        const generateButton = await page.locator('#generateArray');
        await generateButton.click();

        const startButton = await page.locator('#startSort');
        await startButton.click();

        // Verify that the start button is disabled during sorting
        await expect(startButton).toBeDisabled();

        // Verify that the array is being sorted (check for visual changes)
        const arrayContainer = await page.locator('#array');
        const initialArray = await arrayContainer.evaluate(element => Array.from(element.children).map(bar => bar.offsetHeight));

        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Adjust this timeout based on the sorting delay

        const sortedArray = await arrayContainer.evaluate(element => Array.from(element.children).map(bar => bar.offsetHeight));
        expect(sortedArray).toEqual([...initialArray].sort((a, b) => a - b)); // Check if the array is sorted
    });

    test('should transition to done state after sorting is complete', async ({ page }) => {
        const generateButton = await page.locator('#generateArray');
        await generateButton.click();

        const startButton = await page.locator('#startSort');
        await startButton.click();

        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Adjust this timeout based on the sorting delay

        // Verify that the start button is still disabled after sorting
        await expect(startButton).toBeDisabled();

        // Verify that clicking generate array again resets the state
        await generateButton.click();
        await expect(startButton).toBeEnabled();
    });

    test('should handle edge case of generating array with zero size', async ({ page }) => {
        // Simulate generating an empty array
        await page.evaluate(() => {
            const arrayContainer = document.getElementById('array');
            arrayContainer.innerHTML = ''; // Clear the array
        });

        const generateButton = await page.locator('#generateArray');
        await generateButton.click();

        // Verify that the array is rendered
        const arrayContainer = await page.locator('#array');
        await expect(arrayContainer).toHaveCount(10); // Assuming array size is 10
    });

    test('should handle multiple sorting attempts', async ({ page }) => {
        const generateButton = await page.locator('#generateArray');
        await generateButton.click();

        const startButton = await page.locator('#startSort');
        await startButton.click();

        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Adjust this timeout based on the sorting delay

        // Generate a new array and start sorting again
        await generateButton.click();
        await startButton.click();

        // Wait for sorting to complete again
        await page.waitForTimeout(3000); // Adjust this timeout based on the sorting delay

        // Verify that the start button is still disabled after the second sorting
        await expect(startButton).toBeDisabled();
    });
});