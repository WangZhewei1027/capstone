import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1390a70-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Linear Regression Demo Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the canvas is enabled for clicks
        const canvas = await page.locator('#regressionCanvas');
        await expect(canvas).toBeVisible();
    });

    test('User clicks canvas to add a point', async ({ page }) => {
        const canvas = await page.locator('#regressionCanvas');
        await canvas.click({ position: { x: 100, y: 150 } });

        // Verify that the point is added
        const points = await page.evaluate(() => {
            return window.points.length;
        });
        expect(points).toBe(1);
    });

    test('User clicks canvas to add a second point and draws line', async ({ page }) => {
        const canvas = await page.locator('#regressionCanvas');
        await canvas.click({ position: { x: 100, y: 150 } });
        await canvas.click({ position: { x: 200, y: 250 } });

        // Verify that two points are added
        const points = await page.evaluate(() => {
            return window.points.length;
        });
        expect(points).toBe(2);

        // Verify that the line is drawn
        const lineDrawn = await page.evaluate(() => {
            const ctx = document.getElementById('regressionCanvas').getContext('2d');
            return ctx.__lineDrawn; // Assuming we set a flag when line is drawn
        });
        expect(lineDrawn).toBe(true);
    });

    test('User clicks canvas with less than two points does not draw line', async ({ page }) => {
        const canvas = await page.locator('#regressionCanvas');
        await canvas.click({ position: { x: 100, y: 150 } });

        // Verify that only one point is added
        const points = await page.evaluate(() => {
            return window.points.length;
        });
        expect(points).toBe(1);

        // Verify that no line is drawn
        const lineDrawn = await page.evaluate(() => {
            const ctx = document.getElementById('regressionCanvas').getContext('2d');
            return ctx.__lineDrawn; // Assuming we set a flag when line is drawn
        });
        expect(lineDrawn).toBe(false);
    });

    test('Adding multiple points and drawing line', async ({ page }) => {
        const canvas = await page.locator('#regressionCanvas');
        await canvas.click({ position: { x: 100, y: 150 } });
        await canvas.click({ position: { x: 200, y: 250 } });
        await canvas.click({ position: { x: 300, y: 350 } });

        // Verify that three points are added
        const points = await page.evaluate(() => {
            return window.points.length;
        });
        expect(points).toBe(3);

        // Verify that the line is drawn
        const lineDrawn = await page.evaluate(() => {
            const ctx = document.getElementById('regressionCanvas').getContext('2d');
            return ctx.__lineDrawn; // Assuming we set a flag when line is drawn
        });
        expect(lineDrawn).toBe(true);
    });

    test('Edge case: Click on the canvas without adding points', async ({ page }) => {
        const canvas = await page.locator('#regressionCanvas');
        await canvas.click({ position: { x: 100, y: 150 } });
        await canvas.click({ position: { x: 100, y: 150 } }); // Click again without adding new point

        // Verify that the number of points remains the same
        const points = await page.evaluate(() => {
            return window.points.length;
        });
        expect(points).toBe(1);
    });
});