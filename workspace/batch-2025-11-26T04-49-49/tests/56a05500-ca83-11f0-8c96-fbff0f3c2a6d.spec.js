import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/56a05500-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('K-Means Clustering Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state', async ({ page }) => {
        const clusterDiv = await page.locator('#cluster');
        await expect(clusterDiv).toHaveCount(1);
        await expect(clusterDiv).toBeHidden();
    });

    test('should transition to AddingCluster state when Add New Cluster is clicked', async ({ page }) => {
        await page.click('text=Add New Cluster');
        await expect(page.locator('#cluster')).toBeVisible();
    });

    test('should successfully add a new cluster and transition to ClusterAdded state', async ({ page }) => {
        await page.click('text=Add New Cluster');
        await page.click('text=Cluster 1:'); // Simulate adding a new cluster
        await page.locator('#cluster').locator('li').last().click();
        await expect(page.locator('#labels li')).toHaveCount(4); // Check if new cluster is added
        await expect(page.locator('#labels li').last()).toHaveText('New Label');
    });

    test('should transition to UpdatingMap state when Update Map is clicked', async ({ page }) => {
        await page.click('text=Add New Cluster');
        await page.click('text=Cluster 1:'); // Simulate adding a new cluster
        await page.click('#updateMap');
        await expect(page.locator('#map')).toBeVisible();
    });

    test('should remove a cluster and transition to RemovingCluster state', async ({ page }) => {
        await page.click('text=Add New Cluster');
        await page.click('text=Cluster 1:'); // Simulate adding a new cluster
        await page.click('#labels li'); // Click to remove the cluster
        await expect(page.locator('#labels li')).toHaveCount(3); // Check if cluster is removed
    });

    test('should clear the cluster from the map after removal', async ({ page }) => {
        await page.click('text=Add New Cluster');
        await page.click('text=Cluster 1:'); // Simulate adding a new cluster
        await page.click('#labels li'); // Click to remove the cluster
        await expect(page.locator('#labels li')).toHaveCount(3); // Check if cluster is removed
        await expect(page.locator('#cluster')).toHaveText('Cluster 2:'); // Ensure remaining clusters are intact
    });

    test('should handle edge case of removing non-existent cluster', async ({ page }) => {
        await page.click('text=Add New Cluster');
        await page.click('text=Cluster 1:'); // Simulate adding a new cluster
        await page.click('#labels li'); // Click to remove the cluster
        await page.click('#labels li'); // Attempt to remove again
        await expect(page.locator('#labels li')).toHaveCount(2); // Ensure count remains the same
    });

    test('should validate the map update process', async ({ page }) => {
        await page.click('text=Add New Cluster');
        await page.click('text=Cluster 1:'); // Simulate adding a new cluster
        await page.click('#updateMap');
        await expect(page.locator('#map')).toHaveText('Updated'); // Assuming 'Updated' is the expected outcome
    });

    test.afterEach(async ({ page }) => {
        // Any necessary cleanup can be done here
    });
});