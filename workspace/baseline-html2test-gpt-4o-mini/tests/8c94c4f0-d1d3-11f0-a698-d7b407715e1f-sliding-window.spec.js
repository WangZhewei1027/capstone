import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c94c4f0-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Sliding Window Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Check if the title is correct
        const title = await page.title();
        expect(title).toBe('Sliding Window Algorithm Visualization');

        // Check if the array container is visible
        const arrayContainer = await page.locator('#array');
        await expect(arrayContainer).toBeVisible();

        // Check if the input field and button are visible
        const windowSizeInput = await page.locator('#windowSize');
        const startBtn = await page.locator('#startBtn');
        await expect(windowSizeInput).toBeVisible();
        await expect(startBtn).toBeVisible();
    });

    test('should display an error message for invalid window size', async ({ page }) => {
        // Enter an invalid window size and click the start button
        await page.fill('#windowSize', '0');
        await page.click('#startBtn');

        // Check for error message
        const output = await page.locator('#output');
        await expect(output).toHaveText('Please enter a valid window size.');
    });

    test('should display an error message for non-numeric window size', async ({ page }) => {
        // Enter a non-numeric window size and click the start button
        await page.fill('#windowSize', 'abc');
        await page.click('#startBtn');

        // Check for error message
        const output = await page.locator('#output');
        await expect(output).toHaveText('Please enter a valid window size.');
    });

    test('should start sliding window visualization with valid input', async ({ page }) => {
        // Enter a valid window size and click the start button
        await page.fill('#windowSize', '3');
        await page.click('#startBtn');

        // Check if the output displays the correct initial window sum
        const output = await page.locator('#output');
        await expect(output).toHaveText('Current window sum (1, 2, 3): 6');

        // Wait for the first slide to complete
        await page.waitForTimeout(1000);

        // Check if the next window sum is displayed correctly
        await expect(output).toHaveText('Current window sum (2, 3, 4): 9');
    });

    test('should highlight the correct elements during sliding window', async ({ page }) => {
        // Enter a valid window size and click the start button
        await page.fill('#windowSize', '2');
        await page.click('#startBtn');

        // Wait for the first slide to complete
        await page.waitForTimeout(1000);

        // Check if the first two elements are highlighted
        const firstElement = await page.locator('.element[data-index="0"]');
        const secondElement = await page.locator('.element[data-index="1"]');
        await expect(firstElement).toHaveClass(/active/);
        await expect(secondElement).toHaveClass(/active/);

        // Wait for the next slide
        await page.waitForTimeout(1000);

        // Check if the next two elements are highlighted
        const thirdElement = await page.locator('.element[data-index="2"]');
        await expect(secondElement).not.toHaveClass(/active/);
        await expect(thirdElement).toHaveClass(/active/);
    });

    test('should indicate end of array reached', async ({ page }) => {
        // Enter a window size that will reach the end of the array
        await page.fill('#windowSize', '10');
        await page.click('#startBtn');

        // Wait for the sliding to complete
        await page.waitForTimeout(10000); // Wait long enough for the end message to appear

        // Check if the output indicates the end of the array
        const output = await page.locator('#output');
        await expect(output).toHaveText(' - End of array reached!');
    });
});