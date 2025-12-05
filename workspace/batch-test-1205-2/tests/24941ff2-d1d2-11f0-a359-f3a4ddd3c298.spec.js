import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24941ff2-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Merge Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(url);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the input field and sort button are present
        const inputField = await page.locator('#arrayInput');
        const sortButton = await page.locator('#sortButton');
        await expect(inputField).toBeVisible();
        await expect(sortButton).toBeVisible();
    });

    test('Input numbers and click sort button', async ({ page }) => {
        // Input numbers into the text field
        await page.fill('#arrayInput', '3, 1, 2');
        await page.click('#sortButton');

        // Verify that input is processed and displayed
        const arrayDiv = await page.locator('#array');
        await expect(arrayDiv).toHaveCount(3); // Expecting 3 bars for the input numbers
    });

    test('Sorting process is initiated', async ({ page }) => {
        // Input numbers and click sort button
        await page.fill('#arrayInput', '5, 3, 8, 1');
        await page.click('#sortButton');

        // Wait for the sorting to complete
        await page.waitForTimeout(1000); // Wait for the timeout in the sorting function

        // Verify that the sorted array is displayed
        const arrayDiv1 = await page.locator('#array');
        const bars = await arrayDiv.locator('.bar');
        await expect(bars).toHaveCount(4); // Expecting 4 bars for the sorted numbers
    });

    test('Check sorted output', async ({ page }) => {
        // Input numbers and click sort button
        await page.fill('#arrayInput', '4, 2, 5, 1, 3');
        await page.click('#sortButton');

        // Wait for the sorting to complete
        await page.waitForTimeout(1000);

        // Verify the sorted output
        const arrayDiv2 = await page.locator('#array');
        const bars1 = await arrayDiv.locator('.bar');
        const widths = await bars.evaluateAll(bars => bars.map(bar => bar.offsetWidth));

        // Check if the widths correspond to the sorted values
        const expectedWidths = [10, 20, 30, 40, 50]; // Assuming the sorted values are 1, 2, 3, 4, 5
        await expect(widths).toEqual(expectedWidths);
    });

    test('Handle empty input', async ({ page }) => {
        // Click sort button without input
        await page.click('#sortButton');

        // Verify that no bars are displayed
        const arrayDiv3 = await page.locator('#array');
        await expect(arrayDiv).toHaveCount(0);
    });

    test('Handle invalid input', async ({ page }) => {
        // Input invalid numbers and click sort button
        await page.fill('#arrayInput', 'a, b, c');
        await page.click('#sortButton');

        // Verify that no bars are displayed
        const arrayDiv4 = await page.locator('#array');
        await expect(arrayDiv).toHaveCount(0);
    });

    test('Check console errors for invalid input', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Input invalid numbers and click sort button
        await page.fill('#arrayInput', 'a, b, c');
        await page.click('#sortButton');

        // Wait for a short duration to allow any errors to be logged
        await page.waitForTimeout(1000);

        // Verify that console errors occurred
        await expect(consoleErrors.length).toBeGreaterThan(0);
    });
});