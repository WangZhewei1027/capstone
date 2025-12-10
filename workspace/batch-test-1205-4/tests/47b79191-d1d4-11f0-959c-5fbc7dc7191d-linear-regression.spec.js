import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b79191-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Linear Regression Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with the correct title', async ({ page }) => {
        // Verify the page title
        const title = await page.title();
        expect(title).toBe('Linear Regression Demo');
    });

    test('should display instructions on initial load', async ({ page }) => {
        // Check if the instructions are visible
        const instructions = await page.locator('p').innerText();
        expect(instructions).toContain('Click on the chart to add points.');
    });

    test('should add points to the chart on click', async ({ page }) => {
        // Click on the chart to add a point
        const chart = page.locator('#chart');
        await chart.click({ position: { x: 100, y: 200 } });

        // Verify that a point is added
        const points = await page.locator('.point').count();
        expect(points).toBe(1);
    });

    test('should draw a regression line after adding two points', async ({ page }) => {
        const chart = page.locator('#chart');
        await chart.click({ position: { x: 100, y: 200 } });
        await chart.click({ position: { x: 200, y: 300 } });

        // Verify that a regression line is drawn
        const lines = await page.locator('.line').count();
        expect(lines).toBe(1);
    });

    test('should reset points when reset button is clicked', async ({ page }) => {
        const chart = page.locator('#chart');
        await chart.click({ position: { x: 100, y: 200 } });
        await chart.click({ position: { x: 200, y: 300 } });

        // Click the reset button
        await page.locator('#resetButton').click();

        // Verify that points and lines are cleared
        const points = await page.locator('.point').count();
        const lines = await page.locator('.line').count();
        expect(points).toBe(0);
        expect(lines).toBe(0);
    });

    test('should handle clicks outside the chart area', async ({ page }) => {
        // Click outside the chart area
        await page.click('body', { position: { x: 10, y: 10 } });

        // Verify that no points are added
        const points = await page.locator('.point').count();
        expect(points).toBe(0);
    });

    test('should not draw a regression line with less than two points', async ({ page }) => {
        const chart = page.locator('#chart');
        await chart.click({ position: { x: 100, y: 200 } });

        // Verify that no regression line is drawn
        const lines = await page.locator('.line').count();
        expect(lines).toBe(0);
    });
});