import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/2ff59a30-b400-11f0-867a-d33b47976456.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Bubble Sort Visualization Application', () => {
    test('Initial state is idle', async ({ page }) => {
        // Verify that the visualization area is empty
        const visualization = await page.locator('#visualization');
        await expect(visualization).toHaveText('');
    });

    test('Generate Array transitions to array_generated state', async ({ page }) => {
        // Input a valid array and generate it
        await page.fill('#arrayInput', '5, 3, 8, 1, 2');
        await page.click('#generateArray');

        // Verify that the array is drawn in the visualization
        const blocks = await page.locator('.block');
        await expect(blocks).toHaveCount(5);
    });

    test('Start Sorting transitions to sorting state', async ({ page }) => {
        // Generate an array first
        await page.fill('#arrayInput', '5, 3, 8, 1, 2');
        await page.click('#generateArray');

        // Start sorting
        await page.click('#startSorting');

        // Verify that sorting has started (check for visual changes)
        const blocks = await page.locator('.block');
        await expect(blocks).toHaveCount(5);
        // Add additional checks for sorting animation if necessary
    });

    test('Pause Sorting transitions to paused state', async ({ page }) => {
        // Generate an array and start sorting
        await page.fill('#arrayInput', '5, 3, 8, 1, 2');
        await page.click('#generateArray');
        await page.click('#startSorting');

        // Pause sorting
        await page.click('#pauseSorting');

        // Verify that sorting is paused (check for no further visual changes)
        // This may require a timeout or state check depending on implementation
        await page.waitForTimeout(1000); // Wait for a second to simulate pause
        const blocks = await page.locator('.block');
        await expect(blocks).toHaveCount(5);
        // Here we would ideally check for the state of the blocks
    });

    test('Reset Sorting transitions back to idle state', async ({ page }) => {
        // Generate an array, start sorting, and then reset
        await page.fill('#arrayInput', '5, 3, 8, 1, 2');
        await page.click('#generateArray');
        await page.click('#startSorting');
        await page.click('#resetSorting');

        // Verify that the visualization is cleared
        const visualization = await page.locator('#visualization');
        await expect(visualization).toHaveText('');
    });

    test('Generate Array with invalid input', async ({ page }) => {
        // Input invalid array and generate it
        await page.fill('#arrayInput', 'invalid,input');
        await page.click('#generateArray');

        // Verify that the visualization area is empty
        const visualization = await page.locator('#visualization');
        await expect(visualization).toHaveText('');
    });

    test('Start Sorting without generating an array', async ({ page }) => {
        // Attempt to start sorting without generating an array
        await page.click('#startSorting');

        // Verify that no blocks are drawn
        const visualization = await page.locator('#visualization');
        await expect(visualization).toHaveText('');
    });

    test('Pause Sorting without starting', async ({ page }) => {
        // Attempt to pause sorting without starting
        await page.click('#pauseSorting');

        // Verify that no blocks are drawn
        const visualization = await page.locator('#visualization');
        await expect(visualization).toHaveText('');
    });
});