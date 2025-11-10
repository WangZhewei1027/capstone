import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/21e5f200-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('K-Means Clustering Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const infoText = await page.locator('#info').innerText();
        expect(infoText).toBe('');
    });

    test('should generate points and transition to points_generated state', async ({ page }) => {
        await page.click('#generatePoints');
        const canvas = await page.locator('#canvas');
        const points = await canvas.evaluate(canvas => {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return imageData.data.some(value => value !== 0); // Check if any point is drawn
        });
        expect(points).toBe(true);
    });

    test('should set clusters and transition to clusters_set state', async ({ page }) => {
        await page.fill('#clusterCount', '5');
        await page.click('#setClusters');
        const canvas1 = await page.locator('#canvas1');
        const centroids = await canvas.evaluate(canvas => {
            const ctx1 = canvas.getContext('2d');
            const imageData1 = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return imageData.data.some(value => value === 255); // Check if any red point (centroid) is drawn
        });
        expect(centroids).toBe(true);
    });

    test('should run K-Means and transition to kmeans_running state', async ({ page }) => {
        await page.click('#generatePoints');
        await page.fill('#clusterCount', '3');
        await page.click('#setClusters');
        await page.click('#runKMeans');
        const infoText1 = await page.locator('#info').innerText();
        expect(infoText).toContain('K-Means algorithm is running'); // Assuming this text is displayed during the run
    });

    test('should handle edge case of generating points without setting clusters', async ({ page }) => {
        await page.click('#generatePoints');
        const points1 = await page.locator('#canvas').evaluate(canvas => {
            const ctx2 = canvas.getContext('2d');
            const imageData2 = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return imageData.data.some(value => value !== 0);
        });
        expect(points).toBe(true);
        await page.click('#runKMeans');
        const infoText2 = await page.locator('#info').innerText();
        expect(infoText).toContain('Please set clusters before running K-Means'); // Assuming this error message is displayed
    });

    test('should handle invalid cluster count input', async ({ page }) => {
        await page.fill('#clusterCount', '-1');
        await page.click('#setClusters');
        const infoText3 = await page.locator('#info').innerText();
        expect(infoText).toContain('Invalid cluster count'); // Assuming this error message is displayed
    });

    test('should clear canvas when generating points again', async ({ page }) => {
        await page.click('#generatePoints');
        await page.click('#generatePoints'); // Generate points again
        const pointsAfterSecondGeneration = await page.locator('#canvas').evaluate(canvas => {
            const ctx3 = canvas.getContext('2d');
            const imageData3 = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return imageData.data.some(value => value !== 0);
        });
        expect(pointsAfterSecondGeneration).toBe(true);
    });
});