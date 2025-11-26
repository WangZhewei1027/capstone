import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcc6bc0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Two Pointers Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should render the application with two points', async ({ page }) => {
        // Validate that both points are rendered on the page
        const point1 = await page.locator('#point1');
        const point2 = await page.locator('#point2');

        await expect(point1).toBeVisible();
        await expect(point2).toBeVisible();

        // Validate the initial styles of the points
        await expect(point1).toHaveCSS('background-color', 'rgb(255, 0, 0)'); // Red
        await expect(point2).toHaveCSS('background-color', 'rgb(0, 0, 255)'); // Blue
    });

    test('should call drawPoint on load', async ({ page }) => {
        // Validate that drawPoint function is called and points are positioned correctly
        const point1 = await page.locator('#point1');
        const point2 = await page.locator('#point2');

        // Check the initial position of point1
        const point1Position = await point1.evaluate(el => ({
            left: el.getBoundingClientRect().left,
            top: el.getBoundingClientRect().top
        }));

        // Validate that point1 is at the top-left corner
        expect(point1Position.left).toBeCloseTo(0, 1);
        expect(point1Position.top).toBeCloseTo(0, 1);

        // Validate that point2 is off-screen initially
        const point2Position = await point2.evaluate(el => ({
            left: el.getBoundingClientRect().left,
            top: el.getBoundingClientRect().top
        }));

        expect(point2Position.left).toBeLessThan(0);
        expect(point2Position.top).toBeLessThan(0);
    });

    test('should have correct styles for points', async ({ page }) => {
        // Validate the styles of the points after drawPoint is called
        const point1 = await page.locator('#point1');
        const point2 = await page.locator('#point2');

        // Validate the background color
        await expect(point1).toHaveCSS('background-color', 'rgb(255, 0, 0)'); // Red
        await expect(point2).toHaveCSS('background-color', 'rgb(0, 0, 255)'); // Blue

        // Validate the dimensions of the points
        await expect(point1).toHaveCSS('width', '20px');
        await expect(point1).toHaveCSS('height', '20px');
        await expect(point2).toHaveCSS('width', '20px');
        await expect(point2).toHaveCSS('height', '20px');
    });
});