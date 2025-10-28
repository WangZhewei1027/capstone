import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/b4a03a30-b3fe-11f0-91f7-216a4f05ad0f.html';

test.describe('Bubble Sort Interactive Exploration', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await page.reload();
    });

    test('should be in idle state initially', async () => {
        const startButton = await page.locator('#startSort');
        const resetButton = await page.locator('#reset');
        await expect(startButton).toBeEnabled();
        await expect(resetButton).toBeDisabled();
    });

    test('should transition to sorting state on start sort', async () => {
        const startButton = await page.locator('#startSort');
        const inputArray = await page.locator('#inputArray');

        await inputArray.fill('5,3,8,4,2');
        await startButton.click();

        // Verify that the reset button is enabled and start button is disabled
        const resetButton = await page.locator('#reset');
        await expect(startButton).toBeDisabled();
        await expect(resetButton).toBeEnabled();

        // Check if the visualization is being populated
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(5);
    });

    test('should show completion alert and transition to done state', async () => {
        const startButton = await page.locator('#startSort');
        const inputArray = await page.locator('#inputArray';

        await inputArray.fill('5,3,8,4,2');
        await startButton.click();

        // Wait for sorting to complete (this may need adjustment based on actual implementation)
        await page.waitForTimeout(5000); // Adjust timeout as necessary for sorting completion

        // Verify that the reset button is enabled
        const resetButton = await page.locator('#reset');
        await expect(resetButton).toBeEnabled();

        // Check for alert or completion message
        const alertMessage = await page.locator('.info'); // Assuming completion alert is shown here
        await expect(alertMessage).toContainText('Sorting complete');
    });

    test('should reset to idle state when reset button is clicked', async () => {
        const startButton = await page.locator('#startSort');
        const inputArray = await page.locator('#inputArray');

        await inputArray.fill('5,3,8,4,2');
        await startButton.click();

        // Wait for sorting to complete
        await page.waitForTimeout(5000); // Adjust timeout as necessary for sorting completion

        const resetButton = await page.locator('#reset');
        await resetButton.click();

        // Verify that the application is back to idle state
        await expect(startButton).toBeEnabled();
        await expect(resetButton).toBeDisabled();
        await expect(inputArray).toHaveValue('');
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0);
    });

    test('should handle empty input gracefully', async () => {
        const startButton = await page.locator('#startSort');
        const inputArray = await page.locator('#inputArray');

        await inputArray.fill('');
        await startButton.click();

        // Verify that the application does not enter sorting state
        const resetButton = await page.locator('#reset');
        await expect(resetButton).toBeDisabled();
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0);
    });

    test('should handle invalid input gracefully', async () => {
        const startButton = await page.locator('#startSort');
        const inputArray = await page.locator('#inputArray');

        await inputArray.fill('invalid,input');
        await startButton.click();

        // Verify that the application does not enter sorting state
        const resetButton = await page.locator('#reset');
        await expect(resetButton).toBeDisabled();
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0);
    });
});