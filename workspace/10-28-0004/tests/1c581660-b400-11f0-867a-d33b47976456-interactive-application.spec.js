import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/1c581660-b400-11f0-867a-d33b47976456.html';

test.describe('Interactive Bubble Sort Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should be in idle state initially', async () => {
        const startSortButton = await page.locator('#startSort');
        await expect(startSortButton).toBeDisabled();
    });

    test('should generate a random array and transition to array_generated state', async () => {
        const generateArrayButton = await page.locator('#generateArray');
        await generateArrayButton.click();

        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Default size is 10
        await expect(page.locator('#startSort')).toBeEnabled(); // Start button should be enabled
    });

    test('should start sorting and transition to sorting state', async () => {
        const startSortButton = await page.locator('#startSort');
        await startSortButton.click();

        // Check if the startSort button is disabled
        await expect(startSortButton).toBeDisabled();

        // Check if the bars are being highlighted during sorting
        const bars = await page.locator('.bar');
        await expect(bars.first()).toHaveCSS('background-color', 'rgb(255, 0, 0)'); // Check if the first bar is highlighted
    });

    test('should complete sorting and return to idle state', async () => {
        // Wait for sorting to complete
        await page.waitForTimeout(6000); // Adjust this timeout based on sorting duration

        const startSortButton = await page.locator('#startSort');
        await expect(startSortButton).toBeEnabled(); // Start button should be enabled again
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Ensure bars are still present
    });

    test('should handle multiple generate and sort actions', async () => {
        const generateArrayButton = await page.locator('#generateArray');
        await generateArrayButton.click();

        const startSortButton = await page.locator('#startSort');
        await startSortButton.click();
        await page.waitForTimeout(6000); // Wait for sorting to complete

        await generateArrayButton.click(); // Generate new array
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Ensure new bars are generated
        await expect(startSortButton).toBeEnabled(); // Start button should be enabled
    });

    test('should not allow sorting without generating an array first', async () => {
        const startSortButton = await page.locator('#startSort');
        await expect(startSortButton).toBeDisabled(); // Ensure button is disabled initially

        // Attempt to click the start sort button without generating an array
        await startSortButton.click();
        await expect(startSortButton).toBeDisabled(); // Ensure button remains disabled
    });
});