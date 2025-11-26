import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf9d12-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('K-Means Clustering Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display initial state with input and button', async ({ page }) => {
        // Validate that the initial state is displayed correctly
        const clustersInput = await page.locator('#clusters');
        const runButton = await page.locator('#run');
        const chartDiv = await page.locator('#chart');

        await expect(clustersInput).toBeVisible();
        await expect(runButton).toBeVisible();
        await expect(chartDiv).toBeVisible();
        await expect(await clustersInput.inputValue()).toBe('3'); // Default value
    });

    test('should add data on X input change', async ({ page }) => {
        // Simulate input change for X coordinate
        await page.fill('#x', '1');
        await expect(page.locator('#chart')).toHaveText(/Chart is updated with new data points/);
    });

    test('should add data on Y input change', async ({ page }) => {
        // Simulate input change for Y coordinate
        await page.fill('#y', '2');
        await expect(page.locator('#chart')).toHaveText(/Chart is updated with new data points/);
    });

    test('should add data on Z input change', async ({ page }) => {
        // Simulate input change for Z coordinate
        await page.fill('#z', '3');
        await expect(page.locator('#chart')).toHaveText(/Chart is updated with new data points/);
    });

    test('should run clustering algorithm on button click', async ({ page }) => {
        // Simulate clicking the Run button
        await page.fill('#x', '1');
        await page.fill('#y', '2');
        await page.fill('#z', '3');
        await page.click('#run');

        // Validate that the chart is drawn with new data points
        await expect(page.locator('#chart')).toHaveText(/Chart is drawn with new data points/);
    });

    test('should handle edge case of empty input', async ({ page }) => {
        // Clear inputs and click Run
        await page.fill('#x', '');
        await page.fill('#y', '');
        await page.fill('#z', '');
        await page.click('#run');

        // Validate that no data is added and chart remains empty
        await expect(page.locator('#chart')).toHaveText(/No data points to display/);
    });

    test('should handle invalid number of clusters', async ({ page }) => {
        // Set an invalid number of clusters
        await page.fill('#clusters', '-1');
        await page.click('#run');

        // Validate that an error message is displayed
        await expect(page.locator('#chart')).toHaveText(/Invalid number of clusters/);
    });
});