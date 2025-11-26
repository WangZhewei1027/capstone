import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcce0f0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('K-Means Clustering Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the K-Means Clustering application
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Verify the application title is displayed
        const title = await page.locator('h1');
        await expect(title).toHaveText('K-Means Clustering');

        // Verify the container is present in the DOM
        const container = await page.locator('#container');
        await expect(container).toBeVisible();
    });

    test('should initialize the clustering algorithm', async ({ page }) => {
        // Check console logs for cluster initialization
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Wait for a short duration to allow clustering to process
        await page.waitForTimeout(1000);

        // Validate that clustering has been initialized and data is processed
        expect(consoleMessages).toContain('Cluster 1:');
        expect(consoleMessages).toContain('Cluster 2:');
        expect(consoleMessages).toContain('Cluster 3:');
        expect(consoleMessages).toContain('Cluster 4:');
        expect(consoleMessages).toContain('Cluster 5:');
    });

    test('should remove data from the cluster', async ({ page }) => {
        // Check console logs for data removal
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Wait for clustering to process
        await page.waitForTimeout(1000);

        // Validate that data removal has been logged
        expect(consoleMessages).toContain('Data removed from clusters: [1, 2, 3, 4, 5]');
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Simulate an edge case by adding invalid data
        await page.evaluate(() => {
            const cluster = new Cluster(5);
            try {
                cluster.add(null); // Attempt to add null data
            } catch (e) {
                console.error('Error adding data:', e);
            }
        });

        // Check console logs for error handling
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Wait for a short duration to allow error handling to process
        await page.waitForTimeout(1000);

        // Validate that the error message is logged
        expect(consoleMessages).toContain('Error adding data:');
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions can be performed here if needed
        // For this test, there is nothing specific to clean up
    });
});