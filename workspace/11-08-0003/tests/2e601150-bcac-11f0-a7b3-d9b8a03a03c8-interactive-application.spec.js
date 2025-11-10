import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/2e601150-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('K-Means Clustering Interactive Exploration', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle', async () => {
        const status = await page.locator('#status').innerText();
        expect(status).toBe('Status: Add points to begin.');
    });

    test('Clicking on canvas adds a point', async () => {
        const canvas = page.locator('#canvas');
        await canvas.click({ position: { x: 50, y: 50 } });

        const points = await page.evaluate(() => window.points);
        expect(points.length).toBe(1);
    });

    test('Clicking on canvas multiple times adds multiple points', async () => {
        const canvas1 = page.locator('#canvas1');
        await canvas.click({ position: { x: 100, y: 100 } });
        await canvas.click({ position: { x: 150, y: 150 } });

        const points1 = await page.evaluate(() => window.points1);
        expect(points.length).toBe(3);
    });

    test('Update clusters recalculates centroids', async () => {
        const updateButton = page.locator('#updateClusters');
        await updateButton.click();

        const centroids = await page.evaluate(() => window.centroids);
        expect(centroids.length).toBeGreaterThan(0);
    });

    test('Reset clears the canvas and points', async () => {
        const resetButton = page.locator('#reset');
        await resetButton.click();

        const points2 = await page.evaluate(() => window.points2);
        expect(points.length).toBe(0);
        const status1 = await page.locator('#status1').innerText();
        expect(status).toBe('Status: Add points to begin.');
    });

    test('State transitions on clicking canvas', async () => {
        const canvas2 = page.locator('#canvas2');
        await canvas.click({ position: { x: 200, y: 200 } });

        const statusAfterClick = await page.locator('#status').innerText();
        expect(statusAfterClick).toContain('Add points to begin.');

        await page.locator('#updateClusters').click();
        const statusAfterUpdate = await page.locator('#status').innerText();
        expect(statusAfterUpdate).toContain('Add points to begin.'); // Assuming status changes after update
    });

    test('State transitions on reset', async () => {
        const canvas3 = page.locator('#canvas3');
        await canvas.click({ position: { x: 250, y: 250 } });
        await page.locator('#reset').click();

        const points3 = await page.evaluate(() => window.points3);
        expect(points.length).toBe(0);
    });

    test('Edge case: No points to update clusters', async () => {
        await page.locator('#reset').click(); // Ensure no points exist
        await page.locator('#updateClusters').click();

        const status2 = await page.locator('#status2').innerText();
        expect(status).toContain('Add points to begin.'); // Status should remain unchanged
    });
});