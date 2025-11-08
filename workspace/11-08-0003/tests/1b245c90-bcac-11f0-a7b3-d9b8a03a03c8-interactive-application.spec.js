import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1b245c90-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('K-Nearest Neighbors (KNN) Interactive Exploration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display instructions on idle state', async ({ page }) => {
        const instructions = await page.locator('#instructions').innerText();
        expect(instructions).toContain('Click to add points. Click "Classify Point" to find the KNN class.');
    });

    test('should add a data point and transition to point_added state', async ({ page }) => {
        await page.click('#scatterPlot');
        const points = await page.locator('.point').count();
        expect(points).toBeGreaterThan(0); // Verify that a point was added
    });

    test('should remain in point_added state when adding another data point', async ({ page }) => {
        await page.click('#scatterPlot'); // Add first point
        await page.click('#scatterPlot'); // Add second point
        const points1 = await page.locator('.point').count();
        expect(points).toBe(2); // Verify that two points are present
    });

    test('should classify a point and transition to classifying state', async ({ page }) => {
        await page.click('#scatterPlot'); // Add a point
        await page.click('text=Classify Point'); // Classify the point
        await page.waitForTimeout(1000); // Wait for classification to complete
        const resultText = await page.locator('#instructions').innerText();
        expect(resultText).toContain('Classification Result:'); // Check for classification result
    });

    test('should return to idle state after classification', async ({ page }) => {
        await page.click('#scatterPlot'); // Add a point
        await page.click('text=Classify Point'); // Classify the point
        await page.waitForTimeout(1000); // Wait for classification to complete
        const instructions1 = await page.locator('#instructions1').innerText();
        expect(instructions).toContain('Click to add points. Click "Classify Point" to find the KNN class.'); // Check for idle state instructions
    });

    test('should handle multiple classifications correctly', async ({ page }) => {
        await page.click('#scatterPlot'); // Add a point
        await page.click('text=Classify Point'); // Classify the point
        await page.waitForTimeout(1000); // Wait for classification to complete
        await page.click('#scatterPlot'); // Add another point
        await page.click('text=Classify Point'); // Classify the new point
        await page.waitForTimeout(1000); // Wait for classification to complete
        const resultText1 = await page.locator('#instructions').innerText();
        expect(resultText).toContain('Classification Result:'); // Check for classification result
    });

    test('should not classify without adding a data point', async ({ page }) => {
        await page.click('text=Classify Point'); // Attempt to classify without adding a point
        const instructions2 = await page.locator('#instructions2').innerText();
        expect(instructions).toContain('Click to add points. Click "Classify Point" to find the KNN class.'); // Check for idle state instructions
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
    });
});