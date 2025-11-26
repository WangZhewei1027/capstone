import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1390a71-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('K-Nearest Neighbors (KNN) Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the KNN demo application
        await page.goto(BASE_URL);
    });

    test('should start in Idle state', async ({ page }) => {
        // Verify that the chart is present and no points are added
        const chart = await page.locator('#chart');
        expect(await chart.evaluate(el => el.children.length)).toBe(0);
    });

    test('should transition to PointAdding state on chart click', async ({ page }) => {
        // Click on the chart to add a point
        await page.click('#chart');
        
        // Verify that a point is added
        const points = await page.locator('.point');
        expect(await points.count()).toBe(1);
    });

    test('should remain in PointAdding state on subsequent chart clicks', async ({ page }) => {
        // Click on the chart to add a point
        await page.click('#chart');
        await page.click('#chart');

        // Verify that two points are added
        const points = await page.locator('.point');
        expect(await points.count()).toBe(2);
    });

    test('should transition back to Idle state on second chart click', async ({ page }) => {
        // Click on the chart to add a point
        await page.click('#chart');
        // Click again to update the point list
        await page.click('#chart');

        // Verify that the point count remains the same
        const points = await page.locator('.point');
        expect(await points.count()).toBe(1);
    });

    test('should generate and classify a new point when Classify New Point is clicked', async ({ page }) => {
        // Click on the chart to add a point
        await page.click('#chart');

        // Click the Classify New Point button
        await page.click('button');

        // Verify that a new point is rendered
        const newPoint = await page.locator('.point.newPoint');
        expect(await newPoint.count()).toBe(1);
    });

    test('should classify the new point correctly', async ({ page }) => {
        // Click on the chart to add a point
        await page.click('#chart');

        // Click the Classify New Point button
        await page.click('button');

        // Expect an alert with the classification result
        page.on('dialog', async dialog => {
            expect(dialog.message()).toMatch(/The new point is classified as:/);
            await dialog.dismiss();
        });
    });

    test('should reset the new point state after classification', async ({ page }) => {
        // Click on the chart to add a point
        await page.click('#chart');

        // Click the Classify New Point button
        await page.click('button');

        // Click the Classify New Point button again to reset
        await page.click('button');

        // Verify that the new point is cleared
        const newPoint = await page.locator('.point.newPoint');
        expect(await newPoint.count()).toBe(0);
    });

    test('should handle multiple classifications correctly', async ({ page }) => {
        // Click on the chart to add a point
        await page.click('#chart');

        // Classify the new point
        await page.click('button');
        await page.click('button'); // Classify again to reset

        // Click on the chart to add another point
        await page.click('#chart');

        // Classify the new point
        await page.click('button');

        // Expect an alert with the classification result
        page.on('dialog', async dialog => {
            expect(dialog.message()).toMatch(/The new point is classified as:/);
            await dialog.dismiss();
        });
    });

    test('should not classify if no new point is generated', async ({ page }) => {
        // Click the Classify New Point button without adding a point
        await page.click('button');

        // Expect an alert indicating no new point to classify
        page.on('dialog', async dialog => {
            expect(dialog.message()).toMatch(/No new point to classify/);
            await dialog.dismiss();
        });
    });
});