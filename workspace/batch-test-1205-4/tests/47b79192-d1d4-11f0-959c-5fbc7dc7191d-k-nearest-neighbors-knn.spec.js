import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b79192-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('K-Nearest Neighbors (KNN) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the KNN application before each test
        await page.goto(url);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the page title is displayed correctly
        const title = await page.title();
        expect(title).toBe('K-Nearest Neighbors Demonstration');
    });

    test('should add a point on click and highlight neighbors', async ({ page }) => {
        // Click on the chart container to add a point
        const chartContainer = page.locator('#chartContainer');
        await chartContainer.click({ position: { x: 50, y: 50 } });

        // Verify that a point is added to the chart
        const points = await chartContainer.locator('.point').count();
        expect(points).toBe(1);

        // Click again to add another point
        await chartContainer.click({ position: { x: 100, y: 100 } });

        // Verify that two points are now added
        const updatedPoints = await chartContainer.locator('.point').count();
        expect(updatedPoints).toBe(2);
    });

    test('should highlight nearest neighbors when a new point is added', async ({ page }) => {
        // Add two points to the chart
        const chartContainer = page.locator('#chartContainer');
        await chartContainer.click({ position: { x: 50, y: 50 } });
        await chartContainer.click({ position: { x: 100, y: 100 } });

        // Add a new point that should have neighbors
        await chartContainer.click({ position: { x: 55, y: 55 } });

        // Verify that the nearest neighbors are highlighted
        const highlightedPoints = await chartContainer.locator('.highlighted').count();
        expect(highlightedPoints).toBe(2); // Expecting 2 nearest neighbors highlighted
    });

    test('should reset the chart when the reset button is clicked', async ({ page }) => {
        // Add points to the chart
        const chartContainer = page.locator('#chartContainer');
        await chartContainer.click({ position: { x: 50, y: 50 } });
        await chartContainer.click({ position: { x: 100, y: 100 } });

        // Click the reset button
        await page.locator('#resetButton').click();

        // Verify that no points are displayed after reset
        const pointsAfterReset = await chartContainer.locator('.point').count();
        expect(pointsAfterReset).toBe(0);
    });

    test('should handle multiple clicks and highlight correctly', async ({ page }) => {
        // Click to add points
        const chartContainer = page.locator('#chartContainer');
        await chartContainer.click({ position: { x: 50, y: 50 } });
        await chartContainer.click({ position: { x: 60, y: 60 } });
        await chartContainer.click({ position: { x: 70, y: 70 } });

        // Add a new point to check neighbor highlighting
        await chartContainer.click({ position: { x: 55, y: 55 } });

        // Verify that the correct number of neighbors are highlighted
        const highlightedPoints = await chartContainer.locator('.highlighted').count();
        expect(highlightedPoints).toBe(3); // Expecting 3 nearest neighbors highlighted
    });

    test('should not crash on consecutive clicks', async ({ page }) => {
        const chartContainer = page.locator('#chartContainer');
        for (let i = 0; i < 10; i++) {
            await chartContainer.click({ position: { x: Math.random() * 400, y: Math.random() * 400 } });
        }

        // Verify that points are added without crashing
        const points = await chartContainer.locator('.point').count();
        expect(points).toBeGreaterThan(0);
    });
});