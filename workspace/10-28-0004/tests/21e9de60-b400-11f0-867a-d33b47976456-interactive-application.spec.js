import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/21e9de60-b400-11f0-867a-d33b47976456.html';

test.describe('Bubble Sort Visualization Application', () => {
    let page;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterEach(async () => {
        await page.close();
    });

    test('should start in idle state', async () => {
        const inputField = await page.locator('#numberInput');
        const sortButton = await page.locator('#sortButton');
        const resetButton = await page.locator('#resetButton');

        // Verify the initial state
        await expect(inputField).toBeVisible();
        await expect(sortButton).toBeVisible();
        await expect(resetButton).toBeVisible();
        await expect(page.locator('#array-container')).toHaveText('');
    });

    test('should transition to sorting state on sort button click', async () => {
        const inputField = await page.locator('#numberInput');
        const sortButton = await page.locator('#sortButton');

        // Input numbers and click sort
        await inputField.fill('3, 1, 4, 2');
        await sortButton.click();

        // Verify that sorting has started
        await expect(page.locator('#array-container')).toHaveText(''); // Initially empty
        await expect(page.locator('.bar')).toHaveCount(4); // 4 bars created
    });

    test('should complete sorting and transition to done state', async () => {
        const inputField = await page.locator('#numberInput');
        const sortButton = await page.locator('#sortButton');

        // Input numbers and click sort
        await inputField.fill('3, 1, 4, 2');
        await sortButton.click();

        // Wait for sorting to complete
        await page.waitForTimeout(5000); // Adjust based on expected sort duration

        // Verify the sorted array is displayed
        const bars = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        expect(heights).toEqual(['20px', '60px', '80px', '120px']); // 1, 2, 3, 4
    });

    test('should reset to idle state on reset button click', async () => {
        const inputField = await page.locator('#numberInput');
        const sortButton = await page.locator('#sortButton');
        const resetButton = await page.locator('#resetButton');

        // Input numbers and click sort
        await inputField.fill('3, 1, 4, 2');
        await sortButton.click();
        await page.waitForTimeout(5000); // Wait for sorting to complete

        // Click reset button
        await resetButton.click();

        // Verify that the application has returned to idle state
        await expect(inputField).toHaveValue('');
        await expect(page.locator('#array-container')).toHaveText('');
        await expect(page.locator('.bar')).toHaveCount(0); // No bars should be present
    });

    test('should handle invalid input gracefully', async () => {
        const inputField = await page.locator('#numberInput');
        const sortButton = await page.locator('#sortButton');

        // Input invalid numbers and click sort
        await inputField.fill('invalid input');
        await sortButton.click();

        // Verify that no sorting occurs
        await expect(page.locator('#array-container')).toHaveText('');
    });

    test('should allow changing animation speed', async () => {
        const speedControl = await page.locator('#speedControl');
        const inputField = await page.locator('#numberInput');
        const sortButton = await page.locator('#sortButton');

        // Input numbers and click sort
        await inputField.fill('3, 1, 4, 2');
        await sortButton.click();

        // Change animation speed
        await speedControl.fill('500'); // Change speed to 500ms

        // Verify that the speed control is updated
        await expect(speedControl).toHaveValue('500');
    });
});